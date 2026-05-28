import os
from fastapi import APIRouter, HTTPException
from models import AIMemoRequest, AIMemoResponse

router = APIRouter(prefix="/api/ai-memo", tags=["ai-memo"])


def _build_prompt(req: AIMemoRequest) -> str:
    p  = req.property_data
    an = req.analysis
    b  = an.scenarios["base"]
    d  = an.scenarios["downside"]
    u  = an.scenarios["upside"]

    renovation_pct = (p.renovation_cost / p.purchase_price * 100) if p.purchase_price else 0

    checks_text = "\n".join(
        f"  {'✓' if c.status == 'pass' else ('⚠' if c.status == 'warn' else '✗')} {c.label}: {c.formatted}"
        for c in an.threshold_checks
    )

    components_text = "\n".join(
        f"  {v.label}: {v.score:.0f}/100 (weight {v.weight:.0%})"
        for v in an.score.components.values()
    )

    return f"""You are an expert real estate investment analyst specializing in small multifamily and single-family rental properties in the Raleigh-Durham, NC market.

IMPORTANT RULES:
1. Only analyze the data provided below. Do NOT invent market data, comparable rents, crime statistics, or any other facts not given to you.
2. If data is missing or uncertain, explicitly state what is missing and how it affects the analysis.
3. Do NOT provide legal, tax, or zoning advice — flag these as items requiring professional review.
4. Base your recommendation ONLY on the financial metrics and provided assumptions.
5. Be direct, concise, and specific. Do not guess or estimate values not given.

INVESTMENT CRITERIA (Raleigh-Durham Buy-and-Hold):
- Property types: Duplex, fourplex, small multifamily, select SFR
- Target vintage: 1980s–2000s | Asset class: B-class
- Min cap rate: 6.5% | Min cash-on-cash: 7% | Min DSCR: 1.20x
- Target gross rent-to-price: 10–15% annually
- Max renovation budget: 10–15% of purchase price
- Capital limit: $800,000 total | Strategy: Buy-and-hold 5–10 years
- Main thesis: Durable rental demand from employment, universities, healthcare, tech
- Main risk: Supply pressure, submarket oversaturation, interest rates

PROPERTY: {p.address}, {p.city}, {p.state} {p.zip_code}
Type: {p.property_type.replace('_', ' ').title()} | Units: {p.num_units} | Vintage: {p.vintage_year or 'Unknown'} | Asset Class: {p.asset_class}
Purchase Price: ${p.purchase_price:,.0f} | LTV: {p.loan_to_value:.0%} | Loan Term: {p.loan_term_years}yr
Renovation Budget: ${p.renovation_cost:,.0f} ({renovation_pct:.1f}% of price)
Closing Costs: ${p.closing_costs:,.0f}
Total Cash Invested: ${b.total_cash_invested:,.0f}
Hold Period: {p.hold_period_years} years

DATA QUALITY:
  Rent Confidence: {p.rent_confidence.title()}
  Expense Confidence: {p.expense_confidence.title()}
  Location/Market Risk: {p.location_risk.title()}
  Property Condition Risk: {p.property_condition_risk.title()}

SCENARIO RESULTS:
--- BASE (Rate: {b.interest_rate:.2%}, Vacancy: {b.vacancy_rate:.0%}) ---
  Monthly Rent: ${p.monthly_rent:,.0f} (${p.monthly_rent/p.num_units:,.0f}/unit)
  NOI: ${b.noi:,.0f} | Op Expenses: ${b.operating_expenses:,.0f}
  Cap Rate: {b.cap_rate:.2%} | Cash-on-Cash: {b.cash_on_cash_return:.2%} | DSCR: {b.dscr:.2f}x
  Monthly Cash Flow: ${b.monthly_cash_flow:,.0f} (${b.monthly_cf_per_unit:,.0f}/unit)
  Annual Cash Flow: ${b.annual_cash_flow:,.0f}
  Break-Even Occupancy: {b.break_even_occupancy:.1%}
  Gross Rent / Price: {b.rent_to_price_ratio:.1%}

--- DOWNSIDE (Rent -10%, Rate +1%, Vacancy 10%, Expenses +15%) ---
  Cap Rate: {d.cap_rate:.2%} | Cash-on-Cash: {d.cash_on_cash_return:.2%} | DSCR: {d.dscr:.2f}x
  Monthly Cash Flow: ${d.monthly_cash_flow:,.0f} | Annual: ${d.annual_cash_flow:,.0f}
  Break-Even Occupancy: {d.break_even_occupancy:.1%}

--- UPSIDE (Rent +5%, Rate -0.25%, Vacancy 3%) ---
  Cap Rate: {u.cap_rate:.2%} | Cash-on-Cash: {u.cash_on_cash_return:.2%} | DSCR: {u.dscr:.2f}x
  Monthly Cash Flow: ${u.monthly_cash_flow:,.0f} | Annual: ${u.annual_cash_flow:,.0f}

RISK SCORE: {an.score.total_score:.0f}/100 → {an.score.recommendation}
{components_text}

THRESHOLD CHECKS:
{checks_text}

INVESTOR NOTES: {p.notes or 'None provided'}

---

Provide your analysis in EXACTLY this format. Use plain text only, no markdown. Start each section on a new line with the exact label shown:

RECOMMENDATION: [Proceed / Needs More Research / Do Not Proceed]

CONFIDENCE: [Low / Medium / High] — [one sentence explaining your confidence level based on data quality]

FINANCIAL SNAPSHOT:
• [observation about key metric]
• [observation about key metric]
• [observation about key metric]
• [observation about key metric]

STRESS TEST:
• [how the deal holds up in the downside scenario]
• [the critical breaking point or margin of safety]
• [what would tip this from survivable to failing]

KEY RISKS:
• [specific risk 1 — be concrete, not generic]
• [specific risk 2]
• [specific risk 3]
• [specific risk 4]

MISSING DATA:
• [what data is absent and why it matters — if nothing critical is missing, state: No critical data gaps identified]

SUGGESTED NEXT STEPS:
• [specific diligence action 1]
• [specific diligence action 2]
• [specific diligence action 3]
• [specific diligence action 4]

INVESTMENT MEMO:
[Write 2-3 paragraphs summarizing the investment decision. Be direct about whether this clears or misses the investment criteria. Reference specific numbers. End with a single bottom-line sentence.]"""


def _parse_memo(raw: str) -> AIMemoResponse:
    """Parse structured sections from Claude's response."""
    import re

    def extract(label: str) -> str:
        pattern = rf"{re.escape(label)}[:\s]*(.*?)(?=\n[A-Z][A-Z ]+:|$)"
        m = re.search(pattern, raw, re.DOTALL)
        return m.group(1).strip() if m else ""

    def extract_bullets(label: str):
        block = extract(label)
        lines = [l.lstrip("•·-– ").strip() for l in block.split("\n") if l.strip()]
        return [l for l in lines if l]

    rec_raw  = extract("RECOMMENDATION").split("\n")[0].strip()
    conf_raw = extract("CONFIDENCE").split("\n")[0].strip()

    if "—" in conf_raw:
        conf_parts = conf_raw.split("—", 1)
        conf_level  = conf_parts[0].strip()
        conf_reason = conf_parts[1].strip()
    elif "-" in conf_raw:
        conf_parts = conf_raw.split("-", 1)
        conf_level  = conf_parts[0].strip()
        conf_reason = conf_parts[1].strip()
    else:
        conf_level  = conf_raw
        conf_reason = ""

    # Normalize recommendation
    rec = "Needs More Research"
    if "do not" in rec_raw.lower() or "don't" in rec_raw.lower():
        rec = "Do Not Proceed"
    elif "proceed" in rec_raw.lower():
        rec = "Proceed"

    return AIMemoResponse(
        recommendation=rec,
        confidence=conf_level,
        confidence_reason=conf_reason,
        financial_snapshot=extract_bullets("FINANCIAL SNAPSHOT"),
        stress_test=extract_bullets("STRESS TEST"),
        key_risks=extract_bullets("KEY RISKS"),
        missing_data=extract_bullets("MISSING DATA"),
        next_steps=extract_bullets("SUGGESTED NEXT STEPS"),
        memo=extract("INVESTMENT MEMO"),
        raw_text=raw,
    )


@router.post("/", response_model=AIMemoResponse)
def generate_memo(req: AIMemoRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY not configured. Add it as an environment variable."
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        prompt = _build_prompt(req)

        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
        return _parse_memo(raw)

    except ImportError:
        raise HTTPException(status_code=500, detail="anthropic package not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI memo generation failed: {str(e)}")
