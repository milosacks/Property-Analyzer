"""
Simplified real estate underwriting calculator.
Core inputs: asking price, monthly rent, sqft.
All financing assumptions have defaults but can be overridden per-analysis.
"""

# ── Default assumptions ───────────────────────────────────────────────────────
EXPENSE_RATIO         = 0.40   # operating expenses as % of gross income
PURCHASE_PRICE_FACTOR = 0.95   # purchase price = 95% of asking price
DOWN_PCT              = 0.25   # down payment as % of purchase price
INTEREST_RATE         = 0.07   # 7% annual fixed rate
LOAN_TERM_YEARS       = 30
CLOSING_PCT           = 0.04   # closing costs as % of purchase price
RESERVE_MONTHS        = 6      # months of mortgage payment held as reserves


def mortgage_payment(loan_amount: float, annual_rate: float, years: int) -> float:
    r = annual_rate / 12
    n = years * 12
    if r == 0:
        return loan_amount / n
    return loan_amount * r * (1 + r) ** n / ((1 + r) ** n - 1)


def analyze(
    asking_price:       float,
    monthly_rent:       float,
    sqft:               int   = None,
    expense_ratio:      float = EXPENSE_RATIO,
    purchase_price_pct: float = PURCHASE_PRICE_FACTOR,
    down_pct:           float = DOWN_PCT,
    interest_rate:      float = INTEREST_RATE,
    loan_term_years:    int   = LOAN_TERM_YEARS,
    closing_pct:        float = CLOSING_PCT,
    reserve_months:     int   = RESERVE_MONTHS,
) -> dict:
    purchase_price  = asking_price * purchase_price_pct
    gross_income    = monthly_rent * 12
    annual_expenses = gross_income * expense_ratio
    noi             = gross_income - annual_expenses
    cap_rate        = noi / purchase_price         if purchase_price > 0 else 0.0
    grm             = purchase_price / gross_income if gross_income > 0 else 0.0
    price_per_sqft  = purchase_price / sqft        if sqft and sqft > 0 else None

    down_payment    = purchase_price * down_pct
    closing_cost    = purchase_price * closing_pct
    amount_financed = purchase_price * (1 - down_pct)
    monthly_mtg     = mortgage_payment(amount_financed, interest_rate, loan_term_years)
    annual_mtg      = monthly_mtg * 12
    reserves        = monthly_mtg * reserve_months
    cash_at_closing = down_payment + closing_cost + reserves

    annual_cf  = noi - annual_mtg
    monthly_cf = annual_cf / 12

    # DTI: (monthly mortgage + monthly operating expenses) / (75% of monthly rent)
    dti = (monthly_mtg + annual_expenses / 12) / (monthly_rent * 0.75) * 100 \
          if monthly_rent > 0 else 0.0

    # DCR: annual NOI / annual mortgage, expressed as %
    dcr = noi / annual_mtg * 100 if annual_mtg > 0 else 0.0

    # ROI: annual cash flow / cash at closing, expressed as %
    roi = annual_cf / cash_at_closing * 100 if cash_at_closing > 0 else 0.0

    return {
        # Echo assumptions so the UI can display what was actually used
        "expense_ratio":      expense_ratio,
        "purchase_price_pct": purchase_price_pct,
        "down_pct":           down_pct,
        "interest_rate":      interest_rate,
        "loan_term_years":    loan_term_years,
        "closing_pct":        closing_pct,
        "reserve_months":     reserve_months,
        # Calculated outputs
        "annual_expenses":   round(annual_expenses, 2),
        "purchase_price":    round(purchase_price, 2),
        "price_per_sqft":    round(price_per_sqft, 2) if price_per_sqft is not None else None,
        "gross_income":      round(gross_income, 2),
        "grm":               round(grm, 2),
        "noi":               round(noi, 2),
        "cap_rate":          round(cap_rate, 6),
        "down_payment":      round(down_payment, 2),
        "closing_cost":      round(closing_cost, 2),
        "amount_financed":   round(amount_financed, 2),
        "reserves":          round(reserves, 2),
        "cash_at_closing":   round(cash_at_closing, 2),
        "monthly_mortgage":  round(monthly_mtg, 2),
        "annual_mortgage":   round(annual_mtg, 2),
        "annual_cash_flow":  round(annual_cf, 2),
        "monthly_cash_flow": round(monthly_cf, 2),
        "dti":               round(dti, 1),
        "dcr":               round(dcr, 1),
        "roi":               round(roi, 1),
    }
