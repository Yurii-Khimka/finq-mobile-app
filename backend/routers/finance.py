import json
import ssl
import urllib.request
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models.category import Category
from backend.models.envelope import Envelope
from backend.models.transaction import Transaction
from backend.models.user import User
from backend.schemas.finance import (
    BalancesResponse,
    ExpenseRequest,
    ExpenseResponse,
    FlushResponse,
    IncomeRequest,
    RateResponse,
    SyncRequest,
)

router = APIRouter()

ENVELOPE_ORDER = ["mandatory", "non_mandatory", "investments", "dreams"]


def _get_rate(currency: str) -> float | None:
    """Fetch live NBU exchange rate — matches core.py get_rate()."""
    try:
        context = ssl._create_unverified_context()
        url = f"https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode={currency.upper()}&json"
        with urllib.request.urlopen(url, context=context) as response:
            data = json.loads(response.read().decode())
            return data[0]["rate"]
    except Exception:
        return None


def _get_balances(db: Session, user_id) -> dict[str, Decimal]:
    """Return envelope balances as {name: balance} dict."""
    envelopes = db.query(Envelope).filter(Envelope.user_id == user_id).all()
    return {e.name: e.balance for e in envelopes}


def _balances_response(balances: dict[str, Decimal]) -> BalancesResponse:
    return BalancesResponse(
        mandatory=float(balances.get("mandatory", 0)),
        non_mandatory=float(balances.get("non_mandatory", 0)),
        investments=float(balances.get("investments", 0)),
        dreams=float(balances.get("dreams", 0)),
    )


def _log_transaction(
    db: Session,
    user_id,
    t_type: str,
    category: str,
    amount_uah: Decimal,
    envelope: str,
    details: str = "OK",
    original_amount: Decimal | None = None,
    original_currency: str | None = None,
):
    txn = Transaction(
        id=str(uuid.uuid4())[:8],
        user_id=user_id,
        date=datetime.utcnow(),
        type=t_type,
        category=category,
        amount_uah=amount_uah,
        original_amount=original_amount,
        original_currency=original_currency,
        envelope=envelope,
        details=details,
    )
    db.add(txn)


# ---------- 1. GET /finance/rate ----------

@router.get("/rate", response_model=RateResponse)
def get_rate(currency: str = Query(...)):
    rate = _get_rate(currency)
    if rate is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not fetch rate for {currency}",
        )
    return RateResponse(currency=currency.upper(), rate=rate)


# ---------- 2. GET /finance/balances ----------

@router.get("/balances", response_model=BalancesResponse)
def get_balances(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    balances = _get_balances(db, current_user.id)
    return _balances_response(balances)


# ---------- 3. POST /finance/income ----------

@router.post("/income", response_model=BalancesResponse)
def add_income(
    body: IncomeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    amount_uah = Decimal(str(body.amount))
    original_amount = None
    original_currency = None

    if body.currency.upper() != "UAH":
        rate = _get_rate(body.currency)
        if rate is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not fetch rate for {body.currency}",
            )
        original_amount = amount_uah
        original_currency = body.currency.upper()
        amount_uah = Decimal(str(float(amount_uah) * rate))

    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    for env in envelopes:
        env.balance += amount_uah * env.percentage / Decimal("100")

    _log_transaction(
        db,
        current_user.id,
        "INCOME",
        "Total",
        amount_uah,
        "Distributed",
        "OK",
        original_amount,
        original_currency,
    )
    db.commit()

    balances = {e.name: e.balance for e in envelopes}
    return _balances_response(balances)


# ---------- 4. POST /finance/expense ----------

@router.post("/expense", response_model=ExpenseResponse)
def add_expense(
    body: ExpenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Look up category
    cat = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.name == body.category)
        .first()
    )
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    home_env = cat.envelope_name

    # FX conversion
    amount_uah = Decimal(str(body.amount))
    if body.currency.upper() != "UAH":
        rate = _get_rate(body.currency)
        if rate is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not fetch rate for {body.currency}",
            )
        amount_uah = Decimal(str(float(amount_uah) * rate))

    # Load envelopes into dict
    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    env_map = {e.name: e for e in envelopes}

    # Build hierarchy: home first, then base order (skip home)
    hierarchy = [home_env]
    for env_name in ENVELOPE_ORDER:
        if env_name not in hierarchy:
            hierarchy.append(env_name)

    remaining = amount_uah
    breach_data = {}

    for env_name in hierarchy:
        if remaining <= 0:
            break
        env = env_map.get(env_name)
        if env is None:
            continue

        if env_name == "dreams":
            take = remaining
        else:
            take = min(env.balance, remaining)
            if take <= 0:
                continue

        env.balance -= take
        remaining -= take

        if env_name != home_env:
            breach_data[env_name] = float(round(take, 2))

    details = json.dumps(breach_data) if breach_data else "OK"

    breach_note = None
    if breach_data:
        breach_list = [f"{v} UAH from {k.upper()}" for k, v in breach_data.items()]
        breach_note = f"\u26a0\ufe0f Budget Breach: {', '.join(breach_list)}"

    _log_transaction(db, current_user.id, "EXPENSE", body.category, amount_uah, home_env, details)
    db.commit()

    balances = {e.name: e.balance for e in envelopes}
    return ExpenseResponse(balances=_balances_response(balances), breach_note=breach_note)


# ---------- 5. POST /finance/flush ----------

@router.post("/flush", response_model=FlushResponse)
def flush_leftovers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    env_map = {e.name: e for e in envelopes}

    mandatory = env_map.get("mandatory")
    non_mandatory = env_map.get("non_mandatory")
    dreams = env_map.get("dreams")

    flushed = Decimal("0")
    if mandatory:
        flushed += mandatory.balance
        mandatory.balance = Decimal("0")
    if non_mandatory:
        flushed += non_mandatory.balance
        non_mandatory.balance = Decimal("0")
    if dreams and flushed > 0:
        dreams.balance += flushed

    db.commit()

    balances = {e.name: e.balance for e in envelopes}
    return FlushResponse(flushed_total=float(flushed), balances=_balances_response(balances))


# ---------- 6. POST /finance/sync ----------

@router.post("/sync", response_model=BalancesResponse)
def sync_balance(
    body: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    current_total = sum(e.balance for e in envelopes)

    if current_total <= 0:
        balances = {e.name: e.balance for e in envelopes}
        return _balances_response(balances)

    target = Decimal(str(body.target_total))
    ratio = target / current_total

    for env in envelopes:
        env.balance = env.balance * ratio

    _log_transaction(
        db,
        current_user.id,
        "SYNC",
        "Adjustment",
        target - current_total,
        "Balance Sync",
        "OK",
    )
    db.commit()

    balances = {e.name: e.balance for e in envelopes}
    return _balances_response(balances)
