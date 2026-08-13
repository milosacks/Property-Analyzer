import { useEffect, useState } from 'react'
import { api } from '../api/properties'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pct = (n) => n == null ? '—' : `${n.toFixed(1)}%`

const METRICS = [
  { label: 'Asking Price',       alt: (p) => $(p.asking_price) },
  { label: 'Purchase Price (est.)', render: (a) => $(a.purchase_price) },
  { label: 'Monthly Rent',       alt: (p) => $(p.monthly_rent) },
  { label: 'Units',              alt: (p) => p.unit_config ? `${p.num_units} (${p.unit_config})` : p.num_units },
  { label: 'Sq Ft',              alt: (p) => p.sqft ? p.sqft.toLocaleString() : '—' },
  { divider: true },
  { label: 'Gross Income',       render: (a) => $(a.gross_income) },
  { label: 'Annual Expenses',    render: (a) => $(a.annual_expenses) },
  { label: 'NOI',                render: (a) => $(a.noi) },
  { label: 'GRM',                render: (a) => a.grm.toFixed(2),               grm: true },
  { label: 'Cap Rate',           render: (a) => pct(a.cap_rate * 100),          cap: true },
  { divider: true },
  { label: 'Cash at Closing',    render: (a) => $(a.cash_at_closing) },
  { label: 'Monthly Mortgage',   render: (a) => $(a.monthly_mortgage) },
  { label: 'Monthly Cash Flow',  render: (a) => $(a.monthly_cash_flow),         cf: true },
  { divider: true },
  { label: 'Debt Coverage Ratio', render: (a) => pct(a.dcr),                   dcr: true },
  { label: 'Debt-to-Income',     render: (a) => pct(a.dti) },
  { label: 'Return on Investment', render: (a) => pct(a.roi),                  roi: true },
]

function cellColor(m, a) {
  if (m.grm)  return a.grm <= 12 ? 'text-green-700' : a.grm <= 15 ? 'text-amber-600' : 'text-red-600'
  if (m.cap)  return a.cap_rate >= 0.065 ? 'text-green-700' : a.cap_rate >= 0.05 ? 'text-amber-600' : 'text-red-600'
  if (m.dcr)  return a.dcr >= 130 ? 'text-green-700' : a.dcr >= 100 ? 'text-amber-600' : 'text-red-600'
  if (m.roi)  return a.roi >= 10 ? 'text-green-700' : a.roi >= 0 ? 'text-amber-600' : 'text-red-600'
  if (m.cf)   return a.monthly_cash_flow >= 200 ? 'text-green-700' : a.monthly_cash_flow >= 0 ? 'text-amber-600' : 'text-red-600'
  return ''
}

export default function Compare() {
  const [all,      setAll]      = useState([])
  const [selected, setSelected] = useState([])
  const [analyses, setAnalyses] = useState({})
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    api.listProperties().then(setAll)
  }, [])

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  async function runCompare() {
    setLoading(true)
    const results = {}
    for (const id of selected) {
      const prop = all.find((p) => p.id === id)
      if (prop) results[id] = await api.analyze(prop)
    }
    setAnalyses(results)
    setLoading(false)
  }

  const compared = selected.filter((id) => analyses[id])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compare Properties</h1>

      <div className="card">
        <p className="text-sm text-gray-500 mb-3">Select 2–4 saved properties to compare side-by-side</p>
        {all.length === 0 ? (
          <p className="text-gray-400 text-sm">No saved analyses yet. Analyze and save properties first.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {all.map((p) => (
              <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(p.id) ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="accent-brand-600" />
                <div>
                  <p className="font-medium text-sm">{p.address}</p>
                  <p className="text-xs text-gray-500">
                    {p.city} · {p.num_units} units · {p.asking_price ? `$${p.asking_price.toLocaleString()}` : '—'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button className="btn-primary" disabled={selected.length < 2 || loading} onClick={runCompare}>
            {loading ? 'Running…' : `Compare ${selected.length} Properties`}
          </button>
          {selected.length > 0 && (
            <button className="btn-secondary" onClick={() => { setSelected([]); setAnalyses({}) }}>Clear</button>
          )}
        </div>
      </div>

      {compared.length >= 2 && (
        <div className="card p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-44">Metric</th>
                {compared.map((id) => {
                  const p = all.find((x) => x.id === id)
                  return (
                    <th key={id} className="px-4 py-3 text-left text-xs font-semibold text-brand-700 uppercase">
                      {p?.address}
                      <span className="block font-normal text-gray-400">{p?.city} · {p?.num_units}u</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m, i) => {
                if (m.divider) {
                  return <tr key={i}><td colSpan={compared.length + 1} className="border-t border-gray-200 py-0" /></tr>
                }
                return (
                  <tr key={i} className="hover:bg-gray-50 border-t border-gray-50">
                    <td className="px-4 py-2 text-gray-600 font-medium text-xs">{m.label}</td>
                    {compared.map((id) => {
                      const p = all.find((x) => x.id === id)
                      const a = analyses[id]
                      const val = m.render ? m.render(a) : m.alt ? m.alt(p) : '—'
                      const color = m.render ? cellColor(m, a) : ''
                      return <td key={id} className={`px-4 py-2 font-mono ${color}`}>{val}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
