"""
CLI script: migrate terminal finQ data files into PostgreSQL.

Usage:
    python -m backend.scripts.migrate_data --email user@example.com --data-dir /path/to/data
    python -m backend.scripts.migrate_data --email user@example.com --data-dir /path/to/data --force
"""

import argparse
import csv
import json
import os
import sys
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select, delete

from backend.database import SessionLocal
from backend.models import User, Envelope, Category, Transaction, UserConfig

VALID_ENVELOPES = {"mandatory", "non_mandatory", "investments", "dreams"}


def parse_amount(amt_str: str) -> tuple[Decimal, Decimal | None, str | None]:
    """Parse terminal amount string.

    "250.00 UAH"                    → (250.00, None, None)
    "50.00 USD (1850.00 UAH)"      → (1850.00, 50.00, "USD")
    """
    amt_str = amt_str.strip()
    if "(" in amt_str:
        # FX format: "50.00 USD (1850.00 UAH)"
        orig_part, uah_part = amt_str.split("(")
        original_amount = Decimal(orig_part.strip().split()[0])
        original_currency = orig_part.strip().split()[1]
        amount_uah = Decimal(uah_part.replace(")", "").strip().split()[0])
        return amount_uah, original_amount, original_currency
    else:
        amount_uah = Decimal(amt_str.split()[0])
        return amount_uah, None, None


def main():
    parser = argparse.ArgumentParser(description="Migrate terminal finQ data to PostgreSQL")
    parser.add_argument("--email", required=True, help="Existing user email")
    parser.add_argument("--data-dir", required=True, help="Path to terminal data directory")
    parser.add_argument("--force", action="store_true", help="Clear existing data before import")
    args = parser.parse_args()

    if not SessionLocal:
        print("ERROR: DATABASE_URL not configured.")
        sys.exit(1)

    db = SessionLocal()

    try:
        # 1. Validate user exists
        user = db.execute(select(User).where(User.email == args.email)).scalar_one_or_none()
        if not user:
            print(f"ERROR: No user found with email '{args.email}'.")
            sys.exit(1)

        user_id = user.id
        print(f"User found: {user.email} ({user_id})")

        # 2. Force clear if requested
        if args.force:
            db.execute(delete(Transaction).where(Transaction.user_id == user_id))
            db.execute(delete(Category).where(Category.user_id == user_id))
            db.execute(delete(UserConfig).where(UserConfig.user_id == user_id))
            # Reset envelope balances to 0 (don't delete — they're created at registration)
            envelopes = db.execute(select(Envelope).where(Envelope.user_id == user_id)).scalars().all()
            for env in envelopes:
                env.balance = Decimal("0.00")
            db.flush()
            print("Cleared existing data (--force).")

        # 3. Parse categories.json
        cat_count = 0
        categories_path = os.path.join(args.data_dir, "categories.json")
        if os.path.exists(categories_path):
            with open(categories_path, "r", encoding="utf-8") as f:
                categories_data = json.load(f)
            for name, envelope_name in categories_data.items():
                if envelope_name not in VALID_ENVELOPES:
                    print(f"  SKIP category '{name}': invalid envelope '{envelope_name}'")
                    continue
                existing = db.execute(
                    select(Category).where(Category.user_id == user_id, Category.name == name)
                ).scalar_one_or_none()
                if not existing:
                    db.add(Category(id=uuid.uuid4(), user_id=user_id, name=name, envelope_name=envelope_name))
                    cat_count += 1
            db.flush()
            print(f"Categories: {cat_count} imported.")
        else:
            print("Categories: skipped (file not found).")

        # 4. Parse balances.json → update envelopes
        balances_path = os.path.join(args.data_dir, "balances.json")
        if os.path.exists(balances_path):
            with open(balances_path, "r", encoding="utf-8") as f:
                balances_data = json.load(f)
            envelopes = db.execute(select(Envelope).where(Envelope.user_id == user_id)).scalars().all()
            env_map = {env.name: env for env in envelopes}
            bal_count = 0
            for name, balance in balances_data.items():
                if name in env_map:
                    env_map[name].balance = Decimal(str(balance))
                    bal_count += 1
                else:
                    print(f"  SKIP balance '{name}': no matching envelope")
            db.flush()
            print(f"Balances: {bal_count} envelopes updated.")
        else:
            print("Balances: skipped (file not found).")

        # 5. Parse history.csv → insert transactions
        tx_count = 0
        history_path = os.path.join(args.data_dir, "history.csv")
        if os.path.exists(history_path):
            with open(history_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    if not row or len(row) < 6:
                        continue
                    t_id = row[0]
                    date_str = row[1]
                    t_type = row[2]
                    category = row[3]
                    amt_str = row[4]
                    envelope = row[5]
                    details = row[6] if len(row) > 6 else "OK"

                    try:
                        date = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
                    except ValueError:
                        print(f"  SKIP tx '{t_id}': bad date '{date_str}'")
                        continue

                    try:
                        amount_uah, original_amount, original_currency = parse_amount(amt_str)
                    except (ValueError, IndexError):
                        print(f"  SKIP tx '{t_id}': bad amount '{amt_str}'")
                        continue

                    db.add(Transaction(
                        id=t_id,
                        user_id=user_id,
                        date=date,
                        type=t_type,
                        category=category,
                        amount_uah=amount_uah,
                        original_amount=original_amount,
                        original_currency=original_currency,
                        envelope=envelope,
                        details=details,
                    ))
                    tx_count += 1
            db.flush()
            print(f"Transactions: {tx_count} imported.")
        else:
            print("Transactions: skipped (history.csv not found).")

        # 6. Parse config.json → insert/update user_config
        config_path = os.path.join(args.data_dir, "config.json")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            base_currency = config_data.get("base_currency", "UAH")
            existing_config = db.execute(
                select(UserConfig).where(UserConfig.user_id == user_id)
            ).scalar_one_or_none()
            if existing_config:
                existing_config.base_currency = base_currency
            else:
                db.add(UserConfig(id=uuid.uuid4(), user_id=user_id, base_currency=base_currency))
            db.flush()
            print(f"Config: base_currency={base_currency}.")
        else:
            print("Config: skipped (file not found).")

        db.commit()
        print(f"\nDone. Imported {cat_count} categories, {tx_count} transactions.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
