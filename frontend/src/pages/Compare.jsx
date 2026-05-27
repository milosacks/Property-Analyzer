import { useEffect, useState } from 'react'
import { api } from '../api/properties'

function fmt(n, suffix = '') {
  if (n == null) return '—'
  return `$${n.toLocaleString()}${suffix}`
}
function pct(n) { return n == null ? '—' : `${n}%` }

const METRICS = [
  { key: 'purchase_price',       label: 'Purchase Price',        render: (v) => fmt(v) },
  { key: 'down_payment',         label: 'Down Payment',          render: (v) => fmt(v) },
  { key: 'monthly_rent',         label: 'Monthly Rent',          render: (v) => fmt(v) },
  { key: 'monthly_expenses',     label: 'Monthly Expenses',      render: (v) => fmt(v) },
  { key: 'mortgage_payment',     label: 'Mortgage Payment',      render: (v) => fmt(v) },
  { key: 'monthly_cash_flow',    label: 'Monthly Cash Flow',     render: (v) => v == null ? '—' : <span className={v >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{fmt(v)}</span> },
  { key: 'annual_cash_flow',     label: 'Annual Cash Flow',      render: (v) => fmt(v) },
  { key: 'noi',                  label: 'NOI',                   render: (v) => fmt(v) },
  { key: 'cap_rate',             label: 'Cap Rate',              render: pct },
  { key: 'cash_on_cash_return',  label: 'Cash-on-Cash Return',   render: pct },
  { key: 'gross_rent_multiplier',label: 'GRM',                   render: (v) => v == null ? '—' : v.toFixed(2) },
]

export default function Compare() {
  const [all, setAll] = useState([])
  const [selected, setSelected] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listProperties().then(setAll).catch((e) => setError(e.message))
  }, [])

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  async function runCompare() {
    if (selected.length < 2) return
    setLoading(true)
    try {
      const data = await api.compareProperties(selected)
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const propMap = Object.fromEntries(all.map((p) => [p.id, p]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compare Properties</h1>

      <div className="card">
        <p className="text-sm text-gray-500 mb-3">Select 2–4 properties to compare</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {all.map((p) => (
            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected.includes(p.id) ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="accent-brand-600"
              />
              <div>
                <p className="font-medium text-sm">{p.address}</p>
                <p className="text-xs text-gray-500">{p.city}, {p.state} · ${p.price.toLocaleString()}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            className="btn-primary"
            disabled={selected.length < 2 || loading}
            onClick={runCompare}
          >
            {loading ? 'Comparing…' : `Compare ${selected.length} Properties`}
          </button>
          {selected.length > 0 && (
            <button className="btn-secondary" onClick={() => { setSelected([]); setResults([]) }}>Clear</button>
          )}
        </div>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                {results.map((r) => (
                  <th key={r.property_id} className="px-4 py-3 text-left text-xs font-medium text-brand-700 uppercase">
                    {propMap[r.property_id]?.address ?? r.property_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {METRICS.map((m) => (
                <tr key={m.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{m.label}</td>
                  {results.map((r) => (
                    <td key={r.property_id} className="px-4 py-3 text-sm">{m.render(r[m.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
