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
