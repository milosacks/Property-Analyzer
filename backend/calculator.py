"""
Real estate underwriting calculator.
Handles mortgage math, scenario analysis, risk scoring, and interest-rate sensitivity.
Based on investment criteria: Raleigh-Durham B-class, $200k-$300k/unit, buy-and-hold 5-10 yrs.
"""

from typing import Dict, Any, List, Tuple

# ── Thresholds ────────────────────────────────────────────────────────────────
THRESHOLDS = {
    "min_cap_rate":          0.065,   # 6.5%
    "min_coc_return":        0.07,    # 7%
    "min_dscr":              1.20,
    "target_rent_to_price":  (0.10, 0.15),  # 10-15% gross annual rent / price
    "max_renovation_pct":    0.15,    # 15% of purchase price
    "base_vacancy":          0.05,
    "stress_vacancy":        0.10,
    "base_interest":         0.065,
    "stress_interest":       0.075,
    # Downside passing thresholds
    "min_cap_rate_downside": 0.060,
    "min_coc_downside":      0.03,
    "min_dscr_downside":     1.10,
}

SCORE_WEIGHTS = {
    "cash_flow":          0.25,
    "coc_return":         0.20,
    "dscr":               0.15,
    "cap_rate":           0.10,
    "rent_confidence":    0.10,
    "expense_confidence": 0.10,
    "location_risk":      0.05,
    "property_condition": 0.05,
}


# ── Core math ─────────────────────────────────────────────────────────────────

def mortgage_payment(loan_amount: float, annual_rate: float, years: int) -> float:
    monthly_rate = annual_rate / 12
    n = years * 12
    if monthly_rate == 0:
        return loan_amount / n
    return loan_amount * (monthly_rate * (1 + monthly_rate) ** n) / ((1 + monthly_rate) ** n - 1)


def analyze_property(
    purchase_price: float,
    monthly_rent: float,
    loan_to_value: float,
    interest_rate: float,
    loan_term_years: int,
    vacancy_rate: float,
    annual_taxes: float,
    annual_insurance: float,
    annual_repairs: float,
    annual_property_management: float,
    annual_capex_reserve: float,
    renovation_cost: float,
    closing_costs: float,
    num_units: int = 1,
) -> Dict[str, Any]:

    gross_annual_rent  = monthly_rent * 12
    vacancy_loss       = gross_annual_rent * vacancy_rate
    effective_income   = gross_annual_rent - vacancy_loss

    operating_expenses = (
        annual_taxes + annual_insurance + annual_repairs
        + annual_property_management + annual_capex_reserve
    )

    noi          = effective_income - operating_expenses
    loan_amount  = purchase_price * loan_to_value
    down_payment = purchase_price - loan_amount

    monthly_ds = mortgage_payment(loan_amount, interest_rate, loan_term_years)
    annual_ds  = monthly_ds * 12
    annual_cf  = noi - annual_ds

    total_cash_invested = down_payment + renovation_cost + closing_costs

    cap_rate   = noi / purchase_price          if purchase_price       > 0 else 0.0
    coc_return = annual_cf / total_cash_invested if total_cash_invested > 0 else 0.0
    dscr       = noi / annual_ds               if annual_ds            > 0 else 0.0
    break_even = (operating_expenses + annual_ds) / gross_annual_rent if gross_annual_rent > 0 else 0.0
    grm        = purchase_price / gross_annual_rent if gross_annual_rent > 0 else 0.0
    rent_to_price = gross_annual_rent / purchase_price if purchase_price > 0 else 0.0

    units = max(num_units, 1)

    return {
        "gross_annual_rent":     round(gross_annual_rent, 2),
        "vacancy_loss":          round(vacancy_loss, 2),
        "effective_income":      round(effective_income, 2),
        "operating_expenses":    round(operating_expenses, 2),
        "noi":                   round(noi, 2),
        "loan_amount":           round(loan_amount, 2),
        "down_payment":          round(down_payment, 2),
        "monthly_debt_service":  round(monthly_ds, 2),
        "annual_debt_service":   round(annual_ds, 2),
        "annual_cash_flow":      round(annual_cf, 2),
        "monthly_cash_flow":     round(annual_cf / 12, 2),
        "monthly_cf_per_unit":   round((annual_cf / 12) / units, 2),
        "total_cash_invested":   round(total_cash_invested, 2),
        "cap_rate":              round(cap_rate, 6),
        "cash_on_cash_return":   round(coc_return, 6),
        "dscr":                  round(dscr, 4),
        "break_even_occupancy":  round(break_even, 4),
        "gross_rent_multiplier": round(grm, 4),
        "rent_to_price_ratio":   round(rent_to_price, 6),
        "interest_rate":         interest_rate,
        "vacancy_rate":          vacancy_rate,
    }


# ── Scenario engine ───────────────────────────────────────────────────────────

def run_scenarios(inputs: dict) -> Dict[str, Dict]:
    """Run Base, Downside, and Upside cases."""

    base = {**inputs}

    downside = {
        **inputs,
        "monthly_rent":               inputs["monthly_rent"] * 0.90,
        "interest_rate":              inputs["interest_rate"] + 0.01,
        "vacancy_rate":               0.10,
        "annual_taxes":               inputs["annual_taxes"]               * 1.10,
        "annual_insurance":           inputs["annual_insurance"]           * 1.10,
        "annual_repairs":             inputs["annual_repairs"]             * 1.15,
        "annual_property_management": inputs["annual_property_management"] * 0.90,
        "annual_capex_reserve":       inputs["annual_capex_reserve"]       * 1.15,
        "renovation_cost":            inputs["renovation_cost"]            * 1.20,
    }

    upside = {
        **inputs,
        "monthly_rent":               inputs["monthly_rent"] * 1.05,
        "interest_rate":              max(inputs["interest_rate"] - 0.0025, 0.0),
        "vacancy_rate":               0.03,
        "annual_repairs":             inputs["annual_repairs"]             * 0.95,
        "annual_property_management": inputs["annual_property_management"] * 1.05,
        "annual_capex_reserve":       inputs["annual_capex_reserve"]       * 0.95,
        "renovation_cost":            inputs["renovation_cost"]            * 0.90,
    }

    return {
        "base":     analyze_property(**base),
        "downside": analyze_property(**downside),
        "upside":   analyze_property(**upside),
    }


# ── Interest-rate sensitivity ─────────────────────────────────────────────────

def interest_rate_sensitivity(
    inputs: dict,
    rates: List[float] = None,
) -> List[Dict]:
    if rates is None:
        rates = [0.060, 0.065, 0.070, 0.075, 0.080]
    rows = []
    for rate in rates:
        r = analyze_property(**{**inputs, "interest_rate": rate})
        rows.append({
            "interest_rate":      rate,
            "monthly_debt_service": r["monthly_debt_service"],
            "noi":                r["noi"],
            "cap_rate":           r["cap_rate"],
            "cash_on_cash_return": r["cash_on_cash_return"],
            "dscr":               r["dscr"],
            "annual_cash_flow":   r["annual_cash_flow"],
            "monthly_cash_flow":  r["monthly_cash_flow"],
        })
    return rows


# ── Threshold checks ──────────────────────────────────────────────────────────

def threshold_checks(
    purchase_price: float,
    renovation_cost: float,
    scenarios: Dict[str, Dict],
) -> List[Dict]:
    base     = scenarios["base"]
    downside = scenarios["downside"]

    renovation_pct = renovation_cost / purchase_price if purchase_price > 0 else 0
    rent_to_price  = base["rent_to_price_ratio"]

    def chk(label: str, value, threshold, fmt: str, pass_op="gte", notes: str = "") -> dict:
        if pass_op == "gte":
            status = "pass" if value >= threshold else "fail"
        elif pass_op == "lte":
            status = "pass" if value <= threshold else "fail"
        else:
            lo, hi = threshold
            status = "pass" if lo <= value <= hi else ("warn" if value >= lo * 0.85 else "fail")
        return {
            "label":     label,
            "value":     value,
            "threshold": threshold,
            "status":    status,
            "formatted": fmt,
            "notes":     notes,
        }

    return [
        chk("Cap Rate (Base)",
            base["cap_rate"], THRESHOLDS["min_cap_rate"],
            f"{base['cap_rate']:.2%} ≥ 6.5%",
            notes="Minimum 6.5% required"),

        chk("Cash-on-Cash Return (Base)",
            base["cash_on_cash_return"], THRESHOLDS["min_coc_return"],
            f"{base['cash_on_cash_return']:.2%} ≥ 7.0%",
            notes="Minimum 7% required"),

        chk("DSCR (Base)",
            base["dscr"], THRESHOLDS["min_dscr"],
            f"{base['dscr']:.2f}x ≥ 1.20x",
            notes="Minimum 1.20x required"),

        chk("DSCR (Downside)",
            downside["dscr"], THRESHOLDS["min_dscr_downside"],
            f"{downside['dscr']:.2f}x ≥ 1.10x",
            notes="Must survive stress scenario"),

        chk("Positive Cash Flow (Downside)",
            downside["annual_cash_flow"], 0,
            f"${downside['annual_cash_flow']:,.0f} > $0",
            notes="Must cash flow even in stress"),

        chk("Gross Rent / Price Ratio",
            rent_to_price, THRESHOLDS["target_rent_to_price"],
            f"{rent_to_price:.1%} target 10-15%",
            pass_op="range",
            notes="Annual gross rent as % of purchase price"),

        chk("Renovation Budget",
            renovation_pct, THRESHOLDS["max_renovation_pct"],
            f"{renovation_pct:.1%} ≤ 15% of price",
            pass_op="lte",
            notes="Ideally below 10-15% of purchase price"),
    ]


# ── Risk scoring ──────────────────────────────────────────────────────────────

def calculate_score(
    base_results: dict,
    rent_confidence: str,
    expense_confidence: str,
    location_risk: str,
    property_condition_risk: str,
) -> Dict[str, Any]:

    def conf(level: str) -> float:
        return {"high": 100, "medium": 70, "low": 30}.get(level.lower(), 70)

    def risk(level: str) -> float:
        return {"low": 100, "medium": 70, "high": 30}.get(level.lower(), 70)

    # Cash flow (25%)
    mcf = base_results.get("monthly_cash_flow", 0)
    if   mcf >= 500: cf_score = 100
    elif mcf >= 200: cf_score = 80
    elif mcf >= 0:   cf_score = 50
    else:            cf_score = 0

    # CoC return (20%)
    coc = base_results.get("cash_on_cash_return", 0)
    if   coc >= 0.09: coc_score = 100
    elif coc >= 0.07: coc_score = 80
    elif coc >= 0.04: coc_score = 50
    elif coc >= 0:    coc_score = 20
    else:             coc_score = 0

    # DSCR (15%)
    dscr = base_results.get("dscr", 0)
    if   dscr >= 1.35: dscr_score = 100
    elif dscr >= 1.20: dscr_score = 80
    elif dscr >= 1.10: dscr_score = 60
    elif dscr >= 1.00: dscr_score = 40
    else:              dscr_score = 0

    # Cap rate (10%)
    cap = base_results.get("cap_rate", 0)
    if   cap >= 0.075: cap_score = 100
    elif cap >= 0.065: cap_score = 80
    elif cap >= 0.055: cap_score = 50
    elif cap >= 0.045: cap_score = 20
    else:              cap_score = 0

    rent_conf_score    = conf(rent_confidence)
    expense_conf_score = conf(expense_confidence)
    location_score     = risk(location_risk)
    condition_score    = risk(property_condition_risk)

    components = {
        "cash_flow":          {"label": "Cash Flow",            "score": cf_score,            "weight": 0.25},
        "coc_return":         {"label": "Cash-on-Cash Return",  "score": coc_score,           "weight": 0.20},
        "dscr":               {"label": "DSCR",                 "score": dscr_score,          "weight": 0.15},
        "cap_rate":           {"label": "Cap Rate",             "score": cap_score,           "weight": 0.10},
        "rent_confidence":    {"label": "Rent Confidence",      "score": rent_conf_score,     "weight": 0.10},
        "expense_confidence": {"label": "Expense Confidence",   "score": expense_conf_score,  "weight": 0.10},
        "location_risk":      {"label": "Location/Market Risk", "score": location_score,      "weight": 0.05},
        "property_condition": {"label": "Property Condition",   "score": condition_score,     "weight": 0.05},
    }

    total = sum(v["score"] * v["weight"] for v in components.values())

    if   total >= 80: recommendation = "Proceed"
    elif total >= 60: recommendation = "Needs More Research"
    else:             recommendation = "Do Not Proceed"

    return {
        "total_score":    round(total, 1),
        "recommendation": recommendation,
        "components":     components,
    }


# ── Final recommendation ──────────────────────────────────────────────────────

def make_recommendation(scenarios: Dict[str, Dict]) -> Tuple[str, str]:
    base     = scenarios["base"]
    downside = scenarios["downside"]

    base_passes = (
        base["cap_rate"]          >= THRESHOLDS["min_cap_rate"]  and
        base["cash_on_cash_return"] >= THRESHOLDS["min_coc_return"] and
        base["dscr"]              >= THRESHOLDS["min_dscr"]      and
        base["annual_cash_flow"]  > 0
    )
    downside_passes = (
        downside["cap_rate"]          >= THRESHOLDS["min_cap_rate_downside"] and
        downside["cash_on_cash_return"] >= THRESHOLDS["min_coc_downside"]      and
        downside["dscr"]              >= THRESHOLDS["min_dscr_downside"]     and
        downside["annual_cash_flow"]  > 0
    )
    downside_survives = (
        downside["annual_cash_flow"] > 0 and
        downside["dscr"]             >= 1.00
    )

    if base_passes and downside_passes:
        return "Proceed",              "Performs well in base case and remains acceptable under stress."
    if base_passes and downside_survives:
        return "Needs More Research",  "Works in base case but becomes thin under downside assumptions."
    if base["annual_cash_flow"] < 0 or base["dscr"] < 1.00:
        return "Do Not Proceed",       "Fails base case — cash flow or debt coverage is too weak."
    return     "Needs More Research",  "Mixed results — more diligence needed before a decision."
