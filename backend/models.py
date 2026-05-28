from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any
from datetime import date, datetime

# ── Enums ─────────────────────────────────────────────────────────────────────
PropertyType    = Literal["duplex", "fourplex", "small_multifamily", "single_family", "other"]
PropertyStatus  = Literal["analyzing", "watching", "passed", "researching", "rejected"]
AssetClass      = Literal["A", "B", "C"]
ConfidenceLevel = Literal["low", "medium", "high"]
RiskLevel       = Literal["low", "medium", "high"]
TransactionType = Literal["purchase", "sale"]


# ── Property input (used for both API analysis and DB save) ───────────────────
class PropertyBase(BaseModel):
    # Basic info
    address:        str
    city:           str
    state:          str = "NC"
    zip_code:       str
    property_type:  PropertyType    = "duplex"
    num_units:      int             = 2
    vintage_year:   Optional[int]   = None
    asset_class:    AssetClass      = "B"
    status:         PropertyStatus  = "analyzing"
    notes:          Optional[str]   = None

    # Purchase & financing
    purchase_price:   float
    loan_to_value:    float = 0.75      # e.g. 0.75 = 75% LTV
    interest_rate:    float = 0.065
    loan_term_years:  int   = 30
    renovation_cost:  float = 0.0
    closing_costs:    float = 0.0

    # Income
    monthly_rent:   float            # Total across all units
    vacancy_rate:   float = 0.05

    # Annual expenses
    annual_taxes:               float = 0.0
    annual_insurance:           float = 0.0
    annual_repairs:             float = 0.0
    annual_property_management: float = 0.0
    annual_capex_reserve:       float = 0.0

    # User risk assessment
    rent_confidence:        ConfidenceLevel = "medium"
    expense_confidence:     ConfidenceLevel = "medium"
    location_risk:          RiskLevel       = "medium"
    property_condition_risk: RiskLevel      = "medium"

    # Strategy
    hold_period_years: int = 7


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    address:        Optional[str]           = None
    city:           Optional[str]           = None
    state:          Optional[str]           = None
    zip_code:       Optional[str]           = None
    property_type:  Optional[PropertyType]  = None
    num_units:      Optional[int]           = None
    vintage_year:   Optional[int]           = None
    asset_class:    Optional[AssetClass]    = None
    status:         Optional[PropertyStatus] = None
    notes:          Optional[str]           = None
    purchase_price: Optional[float]         = None
    loan_to_value:  Optional[float]         = None
    interest_rate:  Optional[float]         = None
    loan_term_years: Optional[int]          = None
    renovation_cost: Optional[float]        = None
    closing_costs:  Optional[float]         = None
    monthly_rent:   Optional[float]         = None
    vacancy_rate:   Optional[float]         = None
    annual_taxes:               Optional[float] = None
    annual_insurance:           Optional[float] = None
    annual_repairs:             Optional[float] = None
    annual_property_management: Optional[float] = None
    annual_capex_reserve:       Optional[float] = None
    rent_confidence:        Optional[ConfidenceLevel] = None
    expense_confidence:     Optional[ConfidenceLevel] = None
    location_risk:          Optional[RiskLevel]       = None
    property_condition_risk: Optional[RiskLevel]      = None
    hold_period_years: Optional[int] = None


class Property(PropertyBase):
    id:         str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Analysis request / response ───────────────────────────────────────────────
class AnalyzeRequest(PropertyBase):
    """Inline analysis — no DB required."""
    pass


class ScenarioResult(BaseModel):
    gross_annual_rent:     float
    vacancy_loss:          float
    effective_income:      float
    operating_expenses:    float
    noi:                   float
    loan_amount:           float
    down_payment:          float
    monthly_debt_service:  float
    annual_debt_service:   float
    annual_cash_flow:      float
    monthly_cash_flow:     float
    monthly_cf_per_unit:   float
    total_cash_invested:   float
    cap_rate:              float
    cash_on_cash_return:   float
    dscr:                  float
    break_even_occupancy:  float
    gross_rent_multiplier: float
    rent_to_price_ratio:   float
    interest_rate:         float
    vacancy_rate:          float


class ThresholdCheck(BaseModel):
    label:     str
    value:     float
    threshold: Any
    status:    str     # pass | fail | warn
    formatted: str
    notes:     str


class ScoreComponent(BaseModel):
    label:  str
    score:  float
    weight: float


class ScoreResult(BaseModel):
    total_score:    float
    recommendation: str
    components:     Dict[str, ScoreComponent]


class SensitivityRow(BaseModel):
    interest_rate:        float
    monthly_debt_service: float
    noi:                  float
    cap_rate:             float
    cash_on_cash_return:  float
    dscr:                 float
    annual_cash_flow:     float
    monthly_cash_flow:    float


class AnalysisResponse(BaseModel):
    scenarios:         Dict[str, ScenarioResult]
    sensitivity:       List[SensitivityRow]
    score:             ScoreResult
    threshold_checks:  List[ThresholdCheck]
    recommendation:    str
    recommendation_reason: str


# ── AI memo ───────────────────────────────────────────────────────────────────
class AIMemoRequest(BaseModel):
    property_data: AnalyzeRequest
    analysis:      AnalysisResponse


class AIMemoResponse(BaseModel):
    recommendation:    str
    confidence:        str
    confidence_reason: str
    financial_snapshot: List[str]
    stress_test:        List[str]
    key_risks:          List[str]
    missing_data:       List[str]
    next_steps:         List[str]
    memo:               str
    raw_text:           str


# ── Transactions ──────────────────────────────────────────────────────────────
class TransactionBase(BaseModel):
    property_id:      str
    transaction_type: TransactionType
    price:            float
    transaction_date: date
    notes:            Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class Transaction(TransactionBase):
    id:         str
    created_at: datetime

    class Config:
        from_attributes = True
