import AnalysisSuggestions from './AnalysisSuggestions'

const $ = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fp = (v) => `${parseFloat((v * 100).toFixed(3))}%`

function grade(type, v) {
  switch (type) {
    case 'grm': return v <= 12 ? 'text-green-600' : v <= 15 ? 'text-amber-600' : 'text-red-500'
    case 'cap': return v >= 0.065 ? 'text-green-600' : v >= 0.05 ? 'text-amber-600' : 'text-red-500'
    case 'dti': return v <= 100 ? 'text-green-600' : v <= 130 ? 'text-amber-600' : 'text-red-500'
    case 'dcr': return v >= 130 ? 'text-green-600' : v >= 100 ? 'text-amber-600' : 'text-red-500'
    case 'roi': return v >= 10 ? 'text-green-600' : v >= 0 ? 'text-amber-600' : 'text-red-500'
    case 'cf':  return v >= 200 ? 'text-green-600' : v >= 0 ? 'text-amber-600' : 'text-red-500'
    default:    return 'text-gray-900'
  }
}

function Row({ label, value, hint, color = 'text-gray-900', bold = false, indent = false }) {
  return (
    <div className={`flex items-baseline justify-between py-1.5 text-sm
      ${bold ? 'bg-gray-50 rounded px-2 -mx-2 my-0.5' : ''}
      ${indent ? 'pl-4' : ''}`}>
      <span className={`${bold ? 'font-semibold text-gray-700' : indent ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
        {hint && <span className="ml-1.5 text-xs text-gray-400 font-normal">{hint}</span>}
      </span>
      <span className={`font-mono tabular-nums ${bold ? 'font-bold text-gray-900 text-base' : color}`}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-100 my-1.5" />
}

function Section({ title, children }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  )
}

export default function AnalysisOutput({ analysis: a }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 leading-relaxed">
        <span className="font-medium text-gray-500">Financing:</span>{' '}
        {fp(a.purchase_price_pct)} of asking · {fp(a.down_pct)} down · {fp(a.interest_rate)} / {a.loan_term_years}yr · {fp(a.closing_pct)} closing · {a.reserve_months}-month reserves
        {' · '}
        <span className="font-medium text-gray-500">Expenses:</span>{' '}
        {fp(a.insurance_rate)} insurance · {fp(a.tax_rate)} property tax · {fp(a.mgmt_rate)} mgmt
      </p>

      <Section title="Basic Info">
        <Row label="Purchase Price (est.)" value={$(a.purchase_price)} />
        {a.price_per_sqft != null && (
          <Row label="Price / Sq Ft" value={`$${a.price_per_sqft.toFixed(0)}/sqft`} />
        )}
        <Divider />
        <Row label="Gross Annual Income" value={$(a.gross_income)} />
        <Row
          label="Gross Rent Multiplier"
          hint="target < 12"
          value={a.grm.toFixed(2)}
          color={grade('grm', a.grm)}
        />
        <Divider />
        <Row label="Operating Expenses" value="" />
        <Row label="Insurance"           hint={`${fp(a.insurance_rate)} of purchase price`}  value={$(a.insurance)}     indent />
        <Row label="Property Tax"        hint={`${fp(a.tax_rate)} of purchase price`}        value={$(a.property_tax)}  indent />
        <Row label="Property Management" hint={`${fp(a.mgmt_rate)} of gross income`}         value={$(a.property_mgmt)} indent />
        <Row label="Total Expenses" value={$(a.annual_expenses)} bold />
        <Divider />
        <Row
          label="Cap Rate"
          hint="target ≥ 6.5%"
          value={`${(a.cap_rate * 100).toFixed(2)}%`}
          color={grade('cap', a.cap_rate)}
        />
      </Section>

      <Section title="Purchase">
        <Row label="Down Payment"   hint={fp(a.down_pct)}    value={$(a.down_payment)} />
        <Row label="Closing Costs"  hint={fp(a.closing_pct)} value={$(a.closing_cost)} />
        <Row label="Reserves"       hint={`${a.reserve_months} months of operating costs`} value={$(a.reserves)} />
        <Divider />
        <Row label="Cash at Closing" value={$(a.cash_at_closing)} bold />
        <Divider />
        <Row label="Amount Financed" hint={fp(1 - a.down_pct)} value={$(a.amount_financed)} />
        <Row label="Monthly Mortgage" hint={`${fp(a.interest_rate)} / ${a.loan_term_years}yr`} value={$(a.monthly_mortgage)} bold />
      </Section>

      <Section title="Returns">
        <Row
          label="Debt-to-Income Ratio"
          hint="(mortgage + expenses) / 75% of rent — target < 100%"
          value={`${a.dti.toFixed(1)}%`}
          color={grade('dti', a.dti)}
        />
        <Row
          label="Debt Coverage Ratio"
          hint="NOI / annual mortgage — target > 130%"
          value={`${a.dcr.toFixed(1)}%`}
          color={grade('dcr', a.dcr)}
        />
        <Row
          label="Return on Investment"
          hint="cash flow / cash at closing — target > 10%"
          value={`${a.roi.toFixed(1)}%`}
          color={grade('roi', a.roi)}
        />
        <Divider />
        <Row
          label="Monthly Cash Flow"
          hint="NOI − mortgage"
          value={$(a.monthly_cash_flow)}
          color={grade('cf', a.monthly_cash_flow)}
        />
      </Section>

      <AnalysisSuggestions analysis={a} />
    </div>
  )
}
