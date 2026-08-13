from fastapi import APIRouter
from models import AnalyzeRequest, AnalysisResult
from calculator import analyze

router = APIRouter(prefix="/api/analyze", tags=["analysis"])


@router.post("/", response_model=AnalysisResult)
def analyze_property(payload: AnalyzeRequest):
    asking = payload.asking_price or payload.purchase_price or 0.0
    return analyze(
        asking_price=asking,
        monthly_rent=payload.monthly_rent,
        annual_expenses=payload.annual_expenses,
        sqft=payload.sqft,
    )
