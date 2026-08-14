"""
Simplified real estate underwriting calculator.
Core inputs: asking price, monthly rent, sqft.
Expenses are estimated from Durham-area market data (insurance, property tax,
utilities, property management) and can be overridden per-analysis.
"""

# ── Default assumptions ───────────────────────────────────────────────────────
PURCHASE_PRICE_FACTOR = 0.95   # purchase price = 95% of asking price
DOWN_PCT              = 0.25   # down payment as % of purchase price
INTEREST_RATE         = 0.07   # 7% annual fixed rate
LOAN_TERM_YEARS       = 30
CLOSING_PCT           = 0.04   # closing costs as % of purchase price
RESERVE_MONTHS        = 6      # months of operating cost held as reserves

# Operating expense defaults (Durham, NC B-class multifamily estimates)
INSURANCE_RATE = 0.008   # landlord insurance ≈ 0.8% of purchase price
TAX_RATE       = 0.012   # Durham County + City combined ≈ 1.2% of assessed value
MGMT_RATE      = 0.10    # property management fee ≈ 10% of gross rent


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
    # Financing assumptions
    purchase_price_pct: float = PURCHASE_PRICE_FACTOR,
    down_pct:           float = DOWN_PCT,
    interest_rate:      float = INTEREST_RATE,
    loan_term_years:    int   = LOAN_TERM_YEARS,
    closing_pct:        float = CLOSING_PCT,
    reserve_months:     int   = RESERVE_MONTHS,
    # Expense assumptions
    insurance_rate:     float = INSURANCE_RATE,
    tax_rate:           float = TAX_RATE,
    mgmt_rate:          float = MGMT_RATE,
) -> dict:
    purchase_price = asking_price * purchase_price_pct
    gross_income   = monthly_rent * 12
    price_per_sqft = purchase_price / sqft if sqft and sqft > 0 else None

    # ── Operating expenses (no mortgage) ─────────────────────────────────────
    insurance     = purchase_price * insurance_rate
    property_tax  = purchase_price * tax_rate
    utilities     = 0.0                          # tenant-paid in B-class leases
    property_mgmt = gross_income * mgmt_rate
    annual_expenses = insurance + property_tax + utilities + property_mgmt
    monthly_operating = annual_expenses / 12

    noi      = gross_income - annual_expenses
    cap_rate = noi / purchase_price         if purchase_price > 0 else 0.0
    grm      = purchase_price / gross_income if gross_income > 0 else 0.0

    # ── Financing ─────────────────────────────────────────────────────────────
    down_payment    = purchase_price * down_pct
    closing_cost    = purchase_price * closing_pct
    amount_financed = purchase_price * (1 - down_pct)
    monthly_mtg     = mortgage_payment(amount_financed, interest_rate, loan_term_years)
    annual_mtg      = monthly_mtg * 12
    # Reserves = N months of operating cost (not mortgage)
    reserves        = monthly_operating * reserve_months
    cash_at_closing = down_payment + closing_cost + reserves

    # ── Returns ───────────────────────────────────────────────────────────────
    annual_cf  = noi - annual_mtg
    monthly_cf = annual_cf / 12

    # DTI: (monthly mortgage + monthly operating expenses) / (75% of monthly rent)
    dti = (monthly_mtg + monthly_operating) / (monthly_rent * 0.75) * 100 \
          if monthly_rent > 0 else 0.0

    # DCR: annual NOI / annual mortgage, expressed as %
    dcr = noi / annual_mtg * 100 if annual_mtg > 0 else 0.0

    # ROI: annual cash flow / cash at closing, expressed as %
    roi = annual_cf / cash_at_closing * 100 if cash_at_closing > 0 else 0.0

    return {
        # Echo assumptions
        "insurance_rate":     insurance_rate,
        "tax_rate":           tax_rate,
        "mgmt_rate":          mgmt_rate,
        "purchase_price_pct": purchase_price_pct,
        "down_pct":           down_pct,
        "interest_rate":      interest_rate,
        "loan_term_years":    loan_term_years,
        "closing_pct":        closing_pct,
        "reserve_months":     reserve_months,
        # Expense breakdown
        "insurance":        round(insurance, 2),
        "property_tax":     round(property_tax, 2),
        "utilities":        0.0,
        "property_mgmt":    round(property_mgmt, 2),
        "annual_expenses":  round(annual_expenses, 2),
        # Outputs
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
