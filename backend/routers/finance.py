import calendar
import json
import ssl
import urllib.request
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models.category import Category
from backend.models.envelope import Envelope
from backend.models.transaction import Transaction
from backend.models.user import User
from backend.models.config import UserConfig
from backend.schemas.finance import (
    AdvisorResponse,
    AnomalyItem,
    AuditResponse,
    BalancesResponse,
    CategoryRequest,
    CategoryResponse,
    ConfigRequest,
    ConfigResponse,
    ExpenseRequest,
    ExpenseResponse,
    FlushResponse,
    ImpactRequest,
    ImpactResponse,
    IncomeRequest,
    RateResponse,
    StatsEnvelope,
    StatsResponse,
    SustainabilityResponse,
    SyncRequest,
    TransactionResponse,
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


# ==========================================================
# TASK-005 — Read-only endpoints + transaction mgmt + config
# ==========================================================


def _inf_to_none(val: float) -> float | None:
    """Convert infinity to None for JSON serialization."""
    if val == float("inf"):
        return None
    return val


# ---------- 7. GET /finance/history ----------

@router.get("/history", response_model=list[TransactionResponse])
def get_history(
    filter: str = Query("all"),
    limit: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
    )

    if filter == "current":
        current_month_start = datetime(datetime.utcnow().year, datetime.utcnow().month, 1)
        query = query.filter(Transaction.date >= current_month_start)
    elif filter != "all":
        month_str = filter.zfill(2)
        if month_str != "00":
            from sqlalchemy import extract
            query = query.filter(extract("month", Transaction.date) == int(month_str))

    query = query.order_by(Transaction.date.desc())

    if limit is not None:
        query = query.limit(limit)

    txns = query.all()
    return [
        TransactionResponse(
            id=t.id,
            date=t.date.strftime("%Y-%m-%d %H:%M"),
            type=t.type,
            category=t.category,
            amount_uah=float(t.amount_uah),
            original_amount=float(t.original_amount) if t.original_amount else None,
            original_currency=t.original_currency,
            envelope=t.envelope,
            details=t.details,
        )
        for t in txns
    ]


# ---------- 8. GET /finance/stats ----------

@router.get("/stats", response_model=StatsResponse)
def get_stats(
    filter: str = Query("current"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats = {
        env: {"total": 0.0, "cats": {}}
        for env in ENVELOPE_ORDER
    }

    query = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.type == "EXPENSE")
    )

    if filter == "current":
        current_month_start = datetime(datetime.utcnow().year, datetime.utcnow().month, 1)
        query = query.filter(Transaction.date >= current_month_start)
    elif filter != "all":
        month_str = filter.zfill(2)
        if month_str == "00":
            return StatsResponse(
                mandatory=StatsEnvelope(**stats["mandatory"]),
                non_mandatory=StatsEnvelope(**stats["non_mandatory"]),
                investments=StatsEnvelope(**stats["investments"]),
                dreams=StatsEnvelope(**stats["dreams"]),
            )
        from sqlalchemy import extract
        query = query.filter(extract("month", Transaction.date) == int(month_str))

    expenses = query.all()

    for txn in expenses:
        amount = float(txn.amount_uah)
        env_key = txn.envelope
        details = txn.details

        if details == "OK":
            stats[env_key]["cats"][txn.category] = stats[env_key]["cats"].get(txn.category, 0) + amount
            stats[env_key]["total"] += amount
        else:
            try:
                breach_data = json.loads(details)
                valid_envelopes = set(ENVELOPE_ORDER)
                borrowed_total = sum(v for k, v in breach_data.items() if k in valid_envelopes)
                home_contribution = max(amount - borrowed_total, 0.0)

                stats[env_key]["cats"][txn.category] = stats[env_key]["cats"].get(txn.category, 0) + home_contribution
                stats[env_key]["total"] += home_contribution

                for breach_env, breach_amt in breach_data.items():
                    if breach_env in valid_envelopes and breach_env in stats:
                        stats[breach_env]["cats"]["Budget Breach"] = stats[breach_env]["cats"].get("Budget Breach", 0) + breach_amt
                        stats[breach_env]["total"] += breach_amt
            except (ValueError, json.JSONDecodeError):
                stats[env_key]["cats"][txn.category] = stats[env_key]["cats"].get(txn.category, 0) + amount
                stats[env_key]["total"] += amount

    return StatsResponse(
        mandatory=StatsEnvelope(total=stats["mandatory"]["total"], categories=stats["mandatory"]["cats"]),
        non_mandatory=StatsEnvelope(total=stats["non_mandatory"]["total"], categories=stats["non_mandatory"]["cats"]),
        investments=StatsEnvelope(total=stats["investments"]["total"], categories=stats["investments"]["cats"]),
        dreams=StatsEnvelope(total=stats["dreams"]["total"], categories=stats["dreams"]["cats"]),
    )


# ---------- 9. GET /finance/audit ----------

@router.get("/audit", response_model=AuditResponse)
def get_audit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)

    balances = _get_balances(db, current_user.id)

    expenses = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "EXPENSE",
            Transaction.date >= current_month_start,
        )
        .all()
    )

    breach_count = 0
    breach_total_uah = 0.0
    breach_by_envelope = {env: 0.0 for env in ENVELOPE_ORDER}
    top_breaches_raw = []
    total_spent_uah = 0.0

    for txn in expenses:
        amount = float(txn.amount_uah)
        total_spent_uah += amount

        if txn.details != "OK":
            try:
                breach_data = json.loads(txn.details)
                valid_envelopes = set(ENVELOPE_ORDER)
                row_breach_total = 0.0
                for env_key, breach_amt in breach_data.items():
                    if env_key in valid_envelopes:
                        amt = max(breach_amt, 0.0)
                        breach_by_envelope[env_key] += amt
                        breach_total_uah += amt
                        row_breach_total += amt
                if row_breach_total > 0:
                    breach_count += 1
                    top_breaches_raw.append({
                        "date": txn.date.strftime("%Y-%m-%d %H:%M"),
                        "category": txn.category,
                        "amount": amount,
                        "breach": row_breach_total,
                        "from": breach_data,
                    })
            except (ValueError, json.JSONDecodeError):
                pass

    days_elapsed = max(now.day, 1)
    burn_rate_daily = total_spent_uah / days_elapsed

    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_remaining = max(days_in_month - now.day, 0)

    spendable_balance = float(balances.get("mandatory", Decimal("0"))) + float(balances.get("non_mandatory", Decimal("0")))

    if burn_rate_daily == 0:
        days_to_zero = float("inf")
    else:
        days_to_zero = spendable_balance / burn_rate_daily

    safe_daily_limit = spendable_balance / days_remaining if days_remaining > 0 else 0.0

    if burn_rate_daily == 0 or days_to_zero >= days_remaining:
        health_signal = "healthy"
    elif days_to_zero >= days_remaining * 0.5:
        health_signal = "warning"
    else:
        health_signal = "critical"

    top_breaches = sorted(top_breaches_raw, key=lambda x: x["breach"], reverse=True)[:5]

    return AuditResponse(
        breach_count=breach_count,
        breach_total_uah=breach_total_uah,
        breach_by_envelope=breach_by_envelope,
        top_breaches=top_breaches,
        total_spent_uah=total_spent_uah,
        burn_rate_daily=burn_rate_daily,
        days_remaining=days_remaining,
        days_to_zero=_inf_to_none(days_to_zero),
        safe_daily_limit=safe_daily_limit,
        spendable_balance=spendable_balance,
        health_signal=health_signal,
    )


# ---------- 10. GET /finance/sustainability ----------

@router.get("/sustainability", response_model=SustainabilityResponse)
def get_sustainability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)

    balances = _get_balances(db, current_user.id)

    expenses = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "EXPENSE",
            Transaction.date >= current_month_start,
        )
        .all()
    )

    mandatory_spent = 0.0
    non_mandatory_spent = 0.0

    for txn in expenses:
        amount = float(txn.amount_uah)
        env = txn.envelope
        details = txn.details

        if details == "OK":
            if env == "mandatory":
                mandatory_spent += amount
            elif env == "non_mandatory":
                non_mandatory_spent += amount
        else:
            try:
                breach_data = json.loads(details)
            except json.JSONDecodeError:
                if env == "mandatory":
                    mandatory_spent += amount
                elif env == "non_mandatory":
                    non_mandatory_spent += amount
                continue

            breach_total = sum(v for v in breach_data.values() if isinstance(v, (int, float)))
            home_portion = max(amount - breach_total, 0.0)

            if env == "mandatory":
                mandatory_spent += home_portion
            elif env == "non_mandatory":
                non_mandatory_spent += home_portion

            for env_key, breach_amt in breach_data.items():
                if not isinstance(breach_amt, (int, float)):
                    continue
                if env_key == "mandatory":
                    mandatory_spent += breach_amt
                elif env_key == "non_mandatory":
                    non_mandatory_spent += breach_amt

    days_elapsed = max(now.day, 1)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_remaining = max(days_in_month - now.day, 0)

    mandatory_burn = mandatory_spent / days_elapsed
    non_mandatory_burn = non_mandatory_spent / days_elapsed
    combined_burn = mandatory_burn + non_mandatory_burn

    mandatory_balance = float(balances.get("mandatory", Decimal("0")))
    non_mandatory_balance = float(balances.get("non_mandatory", Decimal("0")))
    combined_balance = mandatory_balance + non_mandatory_balance

    days_to_zero_mandatory = mandatory_balance / mandatory_burn if mandatory_burn != 0 else float("inf")
    days_to_zero_non_mandatory = non_mandatory_balance / non_mandatory_burn if non_mandatory_burn != 0 else float("inf")
    days_to_zero_combined = combined_balance / combined_burn if combined_burn != 0 else float("inf")

    safe_daily_mandatory = mandatory_balance / days_remaining if days_remaining > 0 else 0.0
    safe_daily_non_mandatory = non_mandatory_balance / days_remaining if days_remaining > 0 else 0.0
    safe_daily_combined = combined_balance / days_remaining if days_remaining > 0 else 0.0

    return SustainabilityResponse(
        mandatory_burn=mandatory_burn,
        non_mandatory_burn=non_mandatory_burn,
        combined_burn=combined_burn,
        days_to_zero_mandatory=_inf_to_none(days_to_zero_mandatory),
        days_to_zero_non_mandatory=_inf_to_none(days_to_zero_non_mandatory),
        days_to_zero_combined=_inf_to_none(days_to_zero_combined),
        safe_daily_mandatory=safe_daily_mandatory,
        safe_daily_non_mandatory=safe_daily_non_mandatory,
        safe_daily_combined=safe_daily_combined,
        days_remaining=days_remaining,
        mandatory_spent=mandatory_spent,
        non_mandatory_spent=non_mandatory_spent,
    )


# ---------- 11. GET /finance/anomalies ----------

@router.get("/anomalies", response_model=list[AnomalyItem])
def get_anomalies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    start_7d = now - timedelta(days=7)
    start_90d = now - timedelta(days=90)

    expenses = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "EXPENSE",
            Transaction.date >= start_90d,
        )
        .all()
    )

    last_7d: dict[str, float] = {}
    last_90d: dict[str, float] = {}

    for txn in expenses:
        amount = float(txn.amount_uah)
        cat = txn.category

        last_90d[cat] = last_90d.get(cat, 0.0) + amount
        if txn.date >= start_7d:
            last_7d[cat] = last_7d.get(cat, 0.0) + amount

    if not last_90d:
        return []

    windows = 90 / 7
    anomalies = []
    for cat, last7d_spend in last_7d.items():
        if last7d_spend <= 50.0:
            continue
        avg_7d = last_90d.get(cat, 0.0) / windows
        if avg_7d == 0.0:
            continue
        ratio = last7d_spend / avg_7d
        if ratio > 1.5:
            anomalies.append(AnomalyItem(
                category=cat,
                last_7d=round(last7d_spend, 2),
                avg_7d=round(avg_7d, 2),
                ratio=round(ratio, 2),
            ))

    anomalies.sort(key=lambda x: x.ratio, reverse=True)
    return anomalies[:5]


# ---------- 12. GET /finance/advisor ----------

@router.get("/advisor", response_model=AdvisorResponse)
def get_advisor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    audit = get_audit(current_user=current_user, db=db)
    anomalies = get_anomalies(current_user=current_user, db=db)

    sentences = []

    if audit.health_signal == "healthy":
        sentences.append("Your finances are on track this month.")
    elif audit.health_signal == "warning":
        sentences.append("Your spending pace is elevated — monitor closely.")
    else:
        if audit.days_to_zero is None:
            sentences.append("ALERT: At current burn rate, your spendable balance is critically low.")
        else:
            sentences.append(
                f"ALERT: At current burn rate, your spendable balance runs out in "
                f"{audit.days_to_zero:.0f} days."
            )

    if anomalies:
        top = anomalies[0]
        sentences.append(
            f"Unusual spike detected in {top.category} "
            f"({top.ratio:.1f}x your 7-day average) — review this category."
        )

    if audit.breach_count > 0:
        sentences.append(
            f"You have {audit.breach_count} waterfall breach(es) totalling "
            f"{audit.breach_total_uah:,.0f} UAH — tighten discretionary spend."
        )

    if audit.health_signal != "healthy" and audit.safe_daily_limit > 0:
        sentences.append(
            f"Keep daily spend under {audit.safe_daily_limit:,.0f} UAH to protect "
            f"your investment and dreams goals."
        )

    return AdvisorResponse(text=" ".join(sentences))


# ---------- 13. POST /finance/impact ----------

@router.post("/impact", response_model=ImpactResponse)
def calculate_impact(
    body: ImpactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    balances = _get_balances(db, current_user.id)

    spendable_before = float(balances.get("mandatory", Decimal("0"))) + float(balances.get("non_mandatory", Decimal("0")))

    last_income = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.type == "INCOME")
        .order_by(Transaction.date.desc())
        .first()
    )

    if (
        last_income is not None
        and last_income.date.year == now.year
        and last_income.date.month == now.month
    ):
        days_in_month = calendar.monthrange(now.year, now.month)[1]
        days_remaining = max(days_in_month - now.day, 0)
    else:
        days_remaining = 0

    daily_limit_before = spendable_before / days_remaining if days_remaining > 0 else 0.0

    amount = body.amount
    if amount <= 0:
        return ImpactResponse(
            amount=amount,
            category=body.category,
            spendable_before=spendable_before,
            spendable_after=spendable_before,
            daily_limit_before=daily_limit_before,
            daily_limit_after=daily_limit_before,
            days_remaining=days_remaining,
            waterfall_triggered=False,
            risk_score="GREEN",
            category_valid=False,
        )

    category_valid = False
    home_env = "non_mandatory"
    if body.category is not None:
        cat = (
            db.query(Category)
            .filter(Category.user_id == current_user.id, Category.name == body.category)
            .first()
        )
        if cat:
            home_env = cat.envelope_name
            category_valid = True

    hierarchy = [home_env] + [e for e in ENVELOPE_ORDER if e != home_env]

    sim_balances = {k: float(v) for k, v in balances.items()}
    remaining = amount
    waterfall_triggered = False

    for env_name in hierarchy:
        if remaining <= 0:
            break
        current_bal = sim_balances.get(env_name, 0.0)

        if env_name == "dreams":
            take = remaining
        else:
            take = min(current_bal, remaining)
            if take <= 0:
                continue

        sim_balances[env_name] = sim_balances.get(env_name, 0.0) - take
        remaining -= take

        if env_name != home_env:
            waterfall_triggered = True

    spendable_after = sim_balances.get("mandatory", 0.0) + sim_balances.get("non_mandatory", 0.0)
    daily_limit_after = spendable_after / days_remaining if days_remaining > 0 else 0.0

    if waterfall_triggered:
        risk_score = "RED"
    elif daily_limit_before > 0:
        ratio = daily_limit_after / daily_limit_before
        if ratio >= 0.80:
            risk_score = "GREEN"
        elif ratio >= 0.50:
            risk_score = "YELLOW"
        else:
            risk_score = "RED"
    else:
        risk_score = "RED"

    return ImpactResponse(
        amount=amount,
        category=body.category,
        spendable_before=spendable_before,
        spendable_after=spendable_after,
        daily_limit_before=daily_limit_before,
        daily_limit_after=daily_limit_after,
        days_remaining=days_remaining,
        waterfall_triggered=waterfall_triggered,
        risk_score=risk_score,
        category_valid=category_valid,
    )


# ---------- 14. DELETE /finance/transactions/{transaction_id} ----------

@router.delete("/transactions/{transaction_id}", response_model=BalancesResponse)
def remove_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction '{transaction_id}' not found",
        )

    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    env_map = {e.name: e for e in envelopes}

    amount = txn.amount_uah

    if txn.type == "EXPENSE":
        home_env = txn.envelope
        if txn.details == "OK":
            if home_env in env_map:
                env_map[home_env].balance += amount
        else:
            try:
                breach_data = json.loads(txn.details)
                valid_envelopes = set(ENVELOPE_ORDER)
                borrowed_total = Decimal("0")
                for env_key, borrowed_amt in breach_data.items():
                    if env_key in valid_envelopes and env_key in env_map:
                        env_map[env_key].balance += Decimal(str(borrowed_amt))
                        borrowed_total += Decimal(str(borrowed_amt))
                if home_env in env_map:
                    env_map[home_env].balance += amount - borrowed_total
            except (ValueError, json.JSONDecodeError):
                if home_env in env_map:
                    env_map[home_env].balance += amount

    elif txn.type == "INCOME":
        for env in envelopes:
            env.balance -= amount * env.percentage / Decimal("100")

    db.delete(txn)
    db.commit()

    balances_dict = {e.name: e.balance for e in envelopes}
    return _balances_response(balances_dict)


# ---------- 15. GET /finance/categories ----------

ENVELOPE_PRIORITY = {"mandatory": 1, "non_mandatory": 2, "investments": 3, "dreams": 4}


@router.get("/categories", response_model=list[CategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cats = db.query(Category).filter(Category.user_id == current_user.id).all()
    sorted_cats = sorted(
        cats,
        key=lambda c: (ENVELOPE_PRIORITY.get(c.envelope_name, 99), c.name),
    )
    return [CategoryResponse(name=c.name, envelope_name=c.envelope_name) for c in sorted_cats]


# ---------- 16. POST /finance/categories ----------

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.envelope_name not in ENVELOPE_ORDER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid envelope_name. Must be one of: {', '.join(ENVELOPE_ORDER)}",
        )

    existing = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.name == body.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    cat = Category(user_id=current_user.id, name=body.name, envelope_name=body.envelope_name)
    db.add(cat)
    db.commit()
    return CategoryResponse(name=cat.name, envelope_name=cat.envelope_name)


# ---------- 17. DELETE /finance/categories/{category_name} ----------

@router.delete("/categories/{category_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.name == category_name)
        .first()
    )
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    db.delete(cat)
    db.commit()


# ---------- 18. GET /finance/config ----------

@router.get("/config", response_model=ConfigResponse)
def get_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        return ConfigResponse(base_currency="UAH")
    return ConfigResponse(base_currency=config.base_currency)


# ---------- 19. PUT /finance/config ----------

VALID_CURRENCIES = {"UAH", "USD", "EUR"}


@router.put("/config", response_model=ConfigResponse)
def update_config(
    body: ConfigRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upper = body.base_currency.upper()
    if upper not in VALID_CURRENCIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid currency '{body.base_currency}'. Choose from: {', '.join(sorted(VALID_CURRENCIES))}",
        )

    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        config = UserConfig(user_id=current_user.id, base_currency=upper)
        db.add(config)
    else:
        config.base_currency = upper
    db.commit()
    return ConfigResponse(base_currency=config.base_currency)
