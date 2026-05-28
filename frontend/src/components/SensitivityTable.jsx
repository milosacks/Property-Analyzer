const $ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pct = (n) => `${(n * 100).toFixed(2)}%`

export default function SensitivityTable({ sensitivity }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Interest Rate Sensitivity</h2>
        <p className="text-xs text-gray-500 mt-0.5">How key metrics change as rates move — all other assumptions held constant</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Rate', 'Mo. Payment', 'NOI', 'Cap Rate', 'CoC Return', 'DSCR', 'Mo. Cash Flow'].map((h) => (
                <th key={h} className="px-4 py-2 text-right first:text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sensitivity.map((row, i) => {
              const isBase = Math.abs(row.interest_rate - 0.065) < 0.001
              const cfColor = row.monthly_cash_flow >= 0 ? 'text-green-700' : 'text-red-600'
              const dscr_ok = row.dscr >= 1.20
              const cap_ok  = row.cap_rate >= 0.065
              return (
                <tr key={i} className={isBase ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-2 font-mono">
                    {pct(row.interest_rate)}
                    {isBase && <span className="ml-2 text-xs text-blue-600 font-normal">(base)</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{$(row.monthly_debt_service)}</td>
                  <td className="px-4 py-2 text-right font-mono">{$(row.noi)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${cap_ok ? 'text-green-700' : 'text-red-600'}`}>{pct(row.cap_rate)}</td>
                  <td className="px-4 py-2 text-right font-mono">{pct(row.cash_on_cash_return)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${dscr_ok ? 'text-green-700' : 'text-red-600'}`}>{row.dscr.toFixed(2)}x</td>
                  <td className={`px-4 py-2 text-right font-mono ${cfColor}`}>{$(row.monthly_cash_flow)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
