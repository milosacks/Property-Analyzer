from fastapi import APIRouter, HTTPException
from models import AnalyzeRequest, AnalysisResponse
from calculator import (
    run_scenarios, interest_rate_sensitivity,
    threshold_checks, calculate_score, make_recommendation,
)

router = APIRouter(prefix="/api/analyze", tags=["analysis"])


def _calc_inputs(p: AnalyzeRequest) -> dict:
    return dict(
        purchase_price=p.purchase_price,
        monthly_rent=p.monthly_rent,
        loan_to_value=p.loan_to_value,
        interest_rate=p.interest_rate,
        loan_term_years=p.loan_term_years,
        vacancy_rate=p.vacancy_rate,
        annual_taxes=p.annual_taxes,
        annual_insurance=p.annual_insurance,
        annual_repairs=p.annual_repairs,
        annual_property_management=p.annual_property_management,
        annual_capex_reserve=p.annual_capex_reserve,
        renovation_cost=p.renovation_cost,
        closing_costs=p.closing_costs,
        num_units=p.num_units,
    )


@router.post("/", response_model=AnalysisResponse)
def analyze(payload: AnalyzeRequest):
    inputs    = _calc_inputs(payload)
    scenarios = run_scenarios(inputs)
    sensitivity = interest_rate_sensitivity(inputs)
    checks    = threshold_checks(payload.purchase_price, payload.renovation_cost, scenarios)
    score     = calculate_score(
        scenarios["base"],
        payload.rent_confidence,
        payload.expense_confidence,
        payload.location_risk,
        payload.property_condition_risk,
    )
    rec, reason = make_recommendation(scenarios)

    return AnalysisResponse(
        scenarios=scenarios,
        sensitivity=sensitivity,
        score=score,
        threshold_checks=checks,
        recommendation=rec,
        recommendation_reason=reason,
    )
