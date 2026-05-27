function Metric({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-brand-700' : 'text-gray-900'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function fmt(n, prefix = '$') {
  if (n == null) return null
  const abs = Math.abs(n)
  const str = abs >= 1000 ? `${prefix}${(abs / 1000).toFixed(1)}k` : `${prefix}${abs.toFixed(0)}`
  return n < 0 ? `-${str}` : str
}

function pct(n) {
  if (n == null) return null
  return `${n.toFixed(2)}%`
}

export default function AnalysisCard({ analysis }) {
  const cf = analysis.monthly_cash_flow
  const cfColor = cf == null ? '' : cf >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className={`rounded-lg p-4 bg-gray-50 col-span-2 sm:col-span-1`}>
        <p className="text-xs text-gray-500 font-medium">Monthly Cash Flow</p>
        <p className={`text-2xl font-bold mt-1 ${cfColor}`}>
          {cf != null ? fmt(cf) : '—'}
        </p>
      </div>
      <Metric label="Annual Cash Flow"       value={fmt(analysis.annual_cash_flow)} />
      <Metric label="NOI"                    value={fmt(analysis.noi)} />
      <Metric label="Cap Rate"               value={pct(analysis.cap_rate)} highlight />
      <Metric label="Cash-on-Cash Return"    value={pct(analysis.cash_on_cash_return)} highlight />
      <Metric label="Gross Rent Multiplier"  value={analysis.gross_rent_multiplier?.toFixed(2) ?? null} />
      <Metric label="Purchase Price"         value={fmt(analysis.purchase_price)} />
      <Metric label="Down Payment"           value={fmt(analysis.down_payment)} />
      <Metric label="Total Investment"       value={fmt(analysis.total_investment)} />
    </div>
  )
}
