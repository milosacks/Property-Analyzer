import { useEffect, useState } from 'react'
import { api } from '../api/properties'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pct = (n) => n == null ? '—' : `${(n * 100).toFixed(2)}%`

const REC_COLOR = {
  'Proceed':             'bg-green-100 text-green-800',
  'Needs More Research': 'bg-yellow-100 text-yellow-800',
  'Do Not Proceed':      'bg-red-100 text-red-800',
}

const METRICS = [
  { label: 'Purchase Price',      render: (a) => $(a.scenarios.base.total_cash_invested ? null : null), alt: (p) => $(p.purchase_price) },
  { label: 'Monthly Rent',        alt: (p) => $(p.monthly_rent) },
  { label: 'Units',               alt: (p) => p.num_units },
  { label: 'Rent / Unit',         alt: (p) => $(p.monthly_rent / p.num_units) },
  { divider: true },
  { label: 'NOI',                 render: (a) => $(a.scenarios.base.noi) },
  { label: 'Monthly Cash Flow',   render: (a) => $(a.scenarios.base.monthly_cash_flow), cf: true },
  { label: 'Annual Cash Flow',    render: (a) => $(a.scenarios.base.annual_cash_flow),  cf: true },
  { label: 'Total Cash Invested', render: (a) => $(a.scenarios.base.total_cash_invested) },
  { divider: true },
  { label: 'Cap Rate',            render: (a) => pct(a.scenarios.base.cap_rate),          threshold: 0.065 },
  { label: 'Cash-on-Cash Return', render: (a) => pct(a.scenarios.base.cash_on_cash_return), threshold: 0.07 },
  { label: 'DSCR',                render: (a) => `${a.scenarios.base.dscr.toFixed(2)}x`, threshold: 1.20, dscr: true },
  { label: 'Break-Even Occ.',     render: (a) => pct(a.scenarios.base.break_even_occupancy) },
  { divider: true },
  { label: 'Risk Score',          render: (a) => `${a.score.total_score}/100` },
  { label: 'Recommendation',      render: (a) => a.recommendation, rec: true },
  { divider: true },
  { label: 'Downside CoC',        render: (a) => pct(a.scenarios.downside.cash_on_cash_return) },
  { label: 'Downside DSCR',       render: (a) => `${a.scenarios.downside.dscr.toFixed(2)}x`, threshold: 1.10, dscr: true },
  { label: 'Downside CF',         render: (a) => $(a.scenarios.downside.monthly_cash_flow), cf: true },
]

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
                  <p className="text-xs text-gray-500">{p.city} · {p.num_units} units · ${p.purchase_price?.toLocaleString()}</p>
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
                if (m.divider) return <tr key={i}><td colSpan={compared.length + 1} className="border-t border-gray-200 py-0" /></tr>
                return (
                  <tr key={i} className="hover:bg-gray-50 border-t border-gray-50">
                    <td className="px-4 py-2 text-gray-600 font-medium text-xs">{m.label}</td>
                    {compared.map((id) => {
                      const p = all.find((x) => x.id === id)
                      const a = analyses[id]
                      const val = m.render ? m.render(a) : m.alt ? m.alt(p) : '—'

                      let color = ''
                      if (m.rec) {
                        return (
                          <td key={id} className="px-4 py-2">
                            <span className={`badge ${REC_COLOR[val] ?? ''}`}>{val}</span>
                          </td>
                        )
                      }
                      if (m.cf) {
                        const raw = m.render ? a.scenarios?.base?.monthly_cash_flow : null
                        if (m.label.includes('Annual')) {
                          const v = a.scenarios?.base?.annual_cash_flow
                          color = v >= 0 ? 'text-green-700' : 'text-red-600'
                        } else {
                          color = raw >= 0 ? 'text-green-700' : 'text-red-600'
                        }
                      }
                      if (m.threshold) {
                        const raw = m.dscr ? a.scenarios?.base?.dscr : m.label.includes('Cap') ? a.scenarios?.base?.cap_rate : a.scenarios?.base?.cash_on_cash_return
                        const downRaw = m.dscr ? a.scenarios?.downside?.dscr : a.scenarios?.downside?.cash_on_cash_return
                        const target = m.label.includes('Downside') ? downRaw : raw
                        color = target >= m.threshold ? 'text-green-700' : 'text-red-600'
                      }

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
