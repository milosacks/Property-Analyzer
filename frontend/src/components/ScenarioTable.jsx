import { useState } from 'react'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pct = (n) => n == null ? '—' : `${(n * 100).toFixed(2)}%`
const x   = (n) => n == null ? '—' : `${n.toFixed(2)}x`

const ROWS = [
  { label: 'Monthly Rent',          key: null, render: (s, p) => $(p?.monthly_rent) },
  { label: 'Gross Annual Rent',     key: 'gross_annual_rent',     render: (s) => $(s.gross_annual_rent) },
  { label: 'Vacancy Loss',          key: 'vacancy_loss',          render: (s) => `(${$(s.vacancy_loss)})` },
  { label: 'Effective Income',      key: 'effective_income',      render: (s) => $(s.effective_income) },
  { label: 'Operating Expenses',    key: 'operating_expenses',    render: (s) => `(${$(s.operating_expenses)})` },
  { label: 'NOI',                   key: 'noi',                   render: (s) => $(s.noi), bold: true },
  { divider: true },
  { label: 'Down Payment',          key: 'down_payment',          render: (s) => $(s.down_payment) },
  { label: 'Monthly Debt Service',  key: 'monthly_debt_service',  render: (s) => $(s.monthly_debt_service) },
  { label: 'Annual Debt Service',   key: 'annual_debt_service',   render: (s) => $(s.annual_debt_service) },
  { label: 'Total Cash Invested',   key: 'total_cash_invested',   render: (s) => $(s.total_cash_invested) },
  { divider: true },
  { label: 'Annual Cash Flow',      key: 'annual_cash_flow',      render: (s) => $(s.annual_cash_flow), bold: true, highlight: true },
  { label: 'Monthly Cash Flow',     key: 'monthly_cash_flow',     render: (s) => $(s.monthly_cash_flow), highlight: true },
  { label: 'Monthly CF / Unit',     key: 'monthly_cf_per_unit',   render: (s) => $(s.monthly_cf_per_unit) },
  { divider: true },
  { label: 'Cap Rate',              key: 'cap_rate',              render: (s) => pct(s.cap_rate), bold: true, threshold: 0.065 },
  { label: 'Cash-on-Cash Return',   key: 'cash_on_cash_return',   render: (s) => pct(s.cash_on_cash_return), bold: true, threshold: 0.07 },
  { label: 'DSCR',                  key: 'dscr',                  render: (s) => x(s.dscr), bold: true, threshold: 1.20 },
  { label: 'Break-Even Occupancy',  key: 'break_even_occupancy',  render: (s) => pct(s.break_even_occupancy) },
  { label: 'Gross Rent / Price',    key: 'rent_to_price_ratio',   render: (s) => pct(s.rent_to_price_ratio) },
  { label: 'Interest Rate',         key: 'interest_rate',         render: (s) => pct(s.interest_rate) },
  { label: 'Vacancy Rate',          key: 'vacancy_rate',          render: (s) => pct(s.vacancy_rate) },
]

const SCENARIOS = [
  { key: 'base',     label: 'Base',     color: 'text-blue-700 bg-blue-50' },
  { key: 'downside', label: 'Downside', color: 'text-red-700 bg-red-50' },
  { key: 'upside',   label: 'Upside',   color: 'text-green-700 bg-green-50' },
]

function cfColor(row, s) {
  if (!row.highlight) return ''
  return s < 0 ? 'text-red-600' : 'text-green-700'
}

function metricColor(row, s) {
  if (!row.threshold) return ''
  const val = s[row.key]
  if (val == null) return ''
  return val >= row.threshold ? 'text-green-700' : 'text-red-600'
}

export default function ScenarioTable({ scenarios, propertyData }) {
  const [active, setActive] = useState('base')

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex border-b border-gray-200">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.key}
            onClick={() => setActive(sc.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              active === sc.key ? `${sc.color} border-b-2 border-current` : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Metric</th>
              {SCENARIOS.map((sc) => (
                <th key={sc.key} className={`px-4 py-2 text-right text-xs font-semibold uppercase ${sc.color}`}>
                  {sc.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              if (row.divider) return <tr key={i}><td colSpan={4} className="border-t border-gray-100 py-0" /></tr>
              return (
                <tr key={i} className="hover:bg-gray-50 border-t border-gray-50">
                  <td className={`px-4 py-2 text-gray-600 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
                  {SCENARIOS.map((sc) => {
                    const s = scenarios[sc.key]
                    const val = s ? row.render(s, propertyData) : '—'
                    const cf  = s && row.highlight ? cfColor(row, s[row.key]) : ''
                    const mt  = s ? metricColor(row, s) : ''
                    return (
                      <td key={sc.key} className={`px-4 py-2 text-right ${row.bold ? 'font-semibold' : ''} ${cf || mt}`}>
                        {val}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: single scenario */}
      <div className="md:hidden">
        {(() => {
          const s = scenarios[active]
          if (!s) return null
          return (
            <table className="min-w-full text-sm">
              <tbody>
                {ROWS.map((row, i) => {
                  if (row.divider) return <tr key={i}><td colSpan={2} className="border-t border-gray-100 py-0" /></tr>
                  const val = row.render(s, propertyData)
                  const cf  = row.highlight ? cfColor(row, s[row.key]) : ''
                  const mt  = metricColor(row, s)
                  return (
                    <tr key={i} className="border-t border-gray-50">
                      <td className={`px-4 py-2 text-gray-600 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
                      <td className={`px-4 py-2 text-right ${row.bold ? 'font-semibold' : ''} ${cf || mt}`}>{val}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        })()}
      </div>
    </div>
  )
}
