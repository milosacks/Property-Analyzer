from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, datetime


PropertyStatus = Literal["watching", "active", "under_contract", "closed", "rejected"]
PropertyType = Literal["single_family", "multi_family", "condo", "commercial", "land"]
TransactionType = Literal["purchase", "sale"]


class PropertyBase(BaseModel):
    address: str
    city: str
    state: str
    zip_code: str
    property_type: PropertyType = "single_family"
    price: float
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    status: PropertyStatus = "watching"
    notes: Optional[str] = None
    # Financial fields
    monthly_rent: Optional[float] = None
    monthly_expenses: Optional[float] = None
    mortgage_payment: Optional[float] = None
    down_payment: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    property_type: Optional[PropertyType] = None
    price: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    status: Optional[PropertyStatus] = None
    notes: Optional[str] = None
    monthly_rent: Optional[float] = None
    monthly_expenses: Optional[float] = None
    mortgage_payment: Optional[float] = None
    down_payment: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None


class Property(PropertyBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    property_id: str
    transaction_type: TransactionType
    price: float
    transaction_date: date
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class Transaction(TransactionBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisResult(BaseModel):
    property_id: str
    purchase_price: float
    down_payment: float
    monthly_rent: Optional[float]
    monthly_expenses: Optional[float]
    mortgage_payment: Optional[float]
    monthly_cash_flow: Optional[float]
    annual_cash_flow: Optional[float]
    noi: Optional[float]
    cap_rate: Optional[float]
    cash_on_cash_return: Optional[float]
    gross_rent_multiplier: Optional[float]
    total_investment: Optional[float]
