from fastapi import APIRouter, HTTPException
from database import supabase
from models import AnalysisResult

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _calculate(prop: dict) -> AnalysisResult:
    price = prop.get("price") or 0
    down = prop.get("down_payment") or 0
    rent = prop.get("monthly_rent")
    expenses = prop.get("monthly_expenses") or 0
    mortgage = prop.get("mortgage_payment") or 0

    monthly_cf = None
    annual_cf = None
    noi = None
    cap_rate = None
    cocr = None
    grm = None

    if rent is not None:
        monthly_cf = rent - expenses - mortgage
        annual_cf = monthly_cf * 12
        noi = (rent - expenses) * 12
        if price > 0:
            cap_rate = round((noi / price) * 100, 2)
            grm = round(price / (rent * 12), 2)
        total_investment = down + (expenses * 0)  # closing costs not tracked yet
        if total_investment > 0:
            cocr = round((annual_cf / total_investment) * 100, 2)

    return AnalysisResult(
        property_id=prop["id"],
        purchase_price=price,
        down_payment=down,
        monthly_rent=rent,
        monthly_expenses=expenses if rent is not None else None,
        mortgage_payment=mortgage if rent is not None else None,
        monthly_cash_flow=round(monthly_cf, 2) if monthly_cf is not None else None,
        annual_cash_flow=round(annual_cf, 2) if annual_cf is not None else None,
        noi=round(noi, 2) if noi is not None else None,
        cap_rate=cap_rate,
        cash_on_cash_return=cocr,
        gross_rent_multiplier=grm,
        total_investment=down,
    )


@router.get("/{property_id}", response_model=AnalysisResult)
def analyze_property(property_id: str):
    result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Property not found")
    return _calculate(result.data[0])


@router.get("/compare/", response_model=list[AnalysisResult])
def compare_properties(ids: str):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 property IDs")
    result = supabase.table("properties").select("*").in_("id", id_list).execute()
    return [_calculate(p) for p in result.data]
