from pydantic import BaseModel
from typing import Optional, Literal, List
from datetime import date, datetime

PropertyType   = Literal["duplex", "fourplex", "small_multifamily", "single_family", "other"]
PropertyStatus = Literal["analyzing", "watching", "passed", "researching", "rejected"]
TransactionType = Literal["purchase", "sale"]


# ── Property CRUD models ───────────────────────────────────────────────────────

class PropertyBase(BaseModel):
    # Location
    address:      str
    city:         str
    state:        str            = "NC"
    zip_code:     Optional[str]  = None
    neighborhood: Optional[str]  = None
    broker:       Optional[str]  = None
    zillow_url:   Optional[str]  = None
    notes:        Optional[str]  = None
    status:       PropertyStatus = "analyzing"

    # Property details
    property_type: PropertyType  = "duplex"
    num_units:     int           = 1
    unit_config:   Optional[str] = None   # e.g. "4 x 2br/1ba"
    sqft:          Optional[int] = None

    # Financials (inputs — everything else is calculated)
    asking_price:    float
    monthly_rent:    float
    annual_expenses: float = 0.0


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    address:         Optional[str]           = None
    city:            Optional[str]           = None
    state:           Optional[str]           = None
    zip_code:        Optional[str]           = None
    neighborhood:    Optional[str]           = None
    broker:          Optional[str]           = None
    zillow_url:      Optional[str]           = None
    notes:           Optional[str]           = None
    status:          Optional[PropertyStatus] = None
    property_type:   Optional[PropertyType]  = None
    num_units:       Optional[int]           = None
    unit_config:     Optional[str]           = None
    sqft:            Optional[int]           = None
    asking_price:    Optional[float]         = None
    monthly_rent:    Optional[float]         = None
    annual_expenses: Optional[float]         = None


class Property(PropertyBase):
    id:         str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "extra": "ignore"}


# ── Analysis models ────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """Accepts both new (asking_price) and legacy (purchase_price) formats."""
    asking_price:    Optional[float] = None
    purchase_price:  Optional[float] = None   # legacy fallback
    monthly_rent:    float
    annual_expenses: float           = 0.0
    sqft:            Optional[int]   = None

    model_config = {"extra": "ignore"}


class AnalysisResult(BaseModel):
    # Echoed inputs
    annual_expenses:  float
    # Basic info
    purchase_price:   float
    price_per_sqft:   Optional[float] = None
    gross_income:     float
    grm:              float
    noi:              float
    cap_rate:         float
    # Purchase
    down_payment:     float
    closing_cost:     float
    amount_financed:  float
    reserves:         float
    cash_at_closing:  float
    # Financing
    monthly_mortgage: float
    annual_mortgage:  float
    # Returns
    annual_cash_flow:  float
    monthly_cash_flow: float
    dti:               float   # (mortgage + expenses/12) / (rent × 75%), as %
    dcr:               float   # NOI / annual mortgage, as %
    roi:               float   # annual cash flow / cash at closing, as %


# ── Transaction models ─────────────────────────────────────────────────────────

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

    model_config = {"from_attributes": True}
