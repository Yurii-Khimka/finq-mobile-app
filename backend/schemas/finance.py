from pydantic import BaseModel


class IncomeRequest(BaseModel):
    amount: float
    currency: str = "UAH"
    original_amount: float | None = None


class ExpenseRequest(BaseModel):
    category: str
    amount: float
    currency: str = "UAH"


class SyncRequest(BaseModel):
    target_total: float


class BalancesResponse(BaseModel):
    mandatory: float
    non_mandatory: float
    investments: float
    dreams: float


class ExpenseResponse(BaseModel):
    balances: BalancesResponse
    breach_note: str | None


class FlushResponse(BaseModel):
    flushed_total: float
    balances: BalancesResponse


class RateResponse(BaseModel):
    currency: str
    rate: float


# --- TASK-005 schemas ---


class TransactionResponse(BaseModel):
    id: str
    date: str
    type: str
    category: str
    amount_uah: float
    original_amount: float | None
    original_currency: str | None
    envelope: str
    details: str


class StatsEnvelope(BaseModel):
    total: float
    categories: dict[str, float]


class StatsResponse(BaseModel):
    mandatory: StatsEnvelope
    non_mandatory: StatsEnvelope
    investments: StatsEnvelope
    dreams: StatsEnvelope


class AuditResponse(BaseModel):
    breach_count: int
    breach_total_uah: float
    breach_by_envelope: dict[str, float]
    top_breaches: list[dict]
    total_spent_uah: float
    burn_rate_daily: float
    days_remaining: int
    days_to_zero: float | None
    safe_daily_limit: float
    spendable_balance: float
    health_signal: str


class SustainabilityResponse(BaseModel):
    mandatory_burn: float
    non_mandatory_burn: float
    combined_burn: float
    days_to_zero_mandatory: float | None
    days_to_zero_non_mandatory: float | None
    days_to_zero_combined: float | None
    safe_daily_mandatory: float
    safe_daily_non_mandatory: float
    safe_daily_combined: float
    days_remaining: int
    mandatory_spent: float
    non_mandatory_spent: float


class AnomalyItem(BaseModel):
    category: str
    last_7d: float
    avg_7d: float
    ratio: float


class AdvisorResponse(BaseModel):
    text: str


class ImpactRequest(BaseModel):
    amount: float
    category: str | None = None


class ImpactResponse(BaseModel):
    amount: float
    category: str | None
    spendable_before: float
    spendable_after: float
    daily_limit_before: float
    daily_limit_after: float
    days_remaining: int
    waterfall_triggered: bool
    risk_score: str
    category_valid: bool


class CategoryRequest(BaseModel):
    name: str
    envelope_name: str


class CategoryResponse(BaseModel):
    name: str
    envelope_name: str


class ConfigRequest(BaseModel):
    base_currency: str


class ConfigResponse(BaseModel):
    base_currency: str
