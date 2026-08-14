from fastapi import APIRouter
from models import AnalyzeRequest, AnalysisResult
from calculator import analyze

router = APIRouter(prefix="/api/analyze", tags=["analysis"])


@router.post("/", response_model=AnalysisResult)
def analyze_property(payload: AnalyzeRequest):
    asking = payload.asking_price or payload.purchase_price or 0.0
    overrides = {k: v for k, v in {
        "purchase_price_pct": payload.purchase_price_pct,
        "down_pct":           payload.down_pct,
        "interest_rate":      payload.interest_rate,
        "loan_term_years":    payload.loan_term_years,
        "closing_pct":        payload.closing_pct,
        "reserve_months":     payload.reserve_months,
        "insurance_rate":     payload.insurance_rate,
        "tax_rate":           payload.tax_rate,
        "mgmt_rate":          payload.mgmt_rate,
    }.items() if v is not None}
    return analyze(asking_price=asking, monthly_rent=payload.monthly_rent, sqft=payload.sqft, **overrides)
