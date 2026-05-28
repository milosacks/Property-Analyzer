import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/properties'

const REC_CONFIG = {
  'passed':      { label: 'Passed',        color: 'bg-green-100 text-green-800' },
  'researching': { label: 'Researching',   color: 'bg-yellow-100 text-yellow-800' },
  'rejected':    { label: 'Rejected',      color: 'bg-red-100 text-red-800' },
  'analyzing':   { label: 'Analyzing',     color: 'bg-blue-100 text-blue-800' },
  'watching':    { label: 'Watching',      color: 'bg-gray-100 text-gray-800' },
}

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function Home() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.listProperties().then(setProperties).finally(() => setLoading(false))
  }, [])

  const stats = {
    total:       properties.length,
    passed:      properties.filter((p) => p.status === 'passed').length,
    researching: properties.filter((p) => p.status === 'researching').length,
    totalValue:  properties.reduce((s, p) => s + (p.purchase_price || 0), 0),
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-500 rounded-2xl p-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">Raleigh-Durham · B-Class · Buy &amp; Hold</p>
        <h1 className="text-3xl font-bold">Property Underwriting Assistant</h1>
        <p className="mt-2 opacity-80 max-w-xl">
          AI-assisted deal analysis for small multifamily and SFR investments. Enter any property
          to calculate NOI, cap rate, CoC return, DSCR, and get a three-scenario recommendation.
        </p>
        <div className="mt-6 flex gap-3 flex-wrap">
          <button className="bg-white text-brand-700 font-semibold px-5 py-2 rounded-lg hover:bg-brand-50 transition-colors" onClick={() => navigate('/analyze')}>
            ⚡ Analyze a Property
          </button>
          <button className="border border-white/40 text-white font-semibold px-5 py-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => navigate('/compare')}>
            Compare Properties
          </button>
        </div>
      </div>

      {/* Investment thesis */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Capital Budget',   value: '$800,000' },
          { label: 'Target / Unit',    value: '$200k–$300k' },
          { label: 'Min Cap Rate',     value: '6.5%' },
          { label: 'Min CoC Return',   value: '7%–9%' },
        ].map((s) => (
          <div key={s.label} className="card py-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Saved analyses stats */}
      {properties.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Saved Analyses', value: stats.total },
            { label: 'Passed',         value: stats.passed },
            { label: 'Researching',    value: stats.researching },
            { label: 'Total Value',    value: $(stats.totalValue) },
          ].map((s) => (
            <div key={s.label} className="card py-4 bg-gray-50 border-gray-100">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Saved analyses table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Saved Analyses</h2>
          <button className="btn-primary" onClick={() => navigate('/analyze')}>+ New Analysis</button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : properties.length === 0 ? (
          <div className="card text-center py-14 text-gray-400">
            <p className="text-4xl mb-3">🏠</p>
            <p className="font-medium">No saved analyses yet.</p>
            <p className="text-sm mt-1">Analyze a property and click "Save Analysis" to track it here.</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Property','Type','Units','Price','Rent/mo','Status',''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((p) => {
                  const rc = REC_CONFIG[p.status] ?? REC_CONFIG.analyzing
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/properties/${p.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.address}</p>
                        <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{p.property_type?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3 text-gray-600">{p.num_units}</td>
                      <td className="px-4 py-3 font-medium">{$(p.purchase_price)}</td>
                      <td className="px-4 py-3 text-gray-600">{$(p.monthly_rent)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${rc.color}`}>{rc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-brand-600 hover:underline text-xs font-medium"
                          onClick={(e) => { e.stopPropagation(); navigate(`/properties/${p.id}`) }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Investment criteria reference */}
      <div className="card bg-gray-50 border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-3">Investment Criteria Quick Reference</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
          {[
            ['Strategy',          'Buy-and-hold · 5–10 years'],
            ['Market',            'Raleigh-Durham, NC'],
            ['Types',             'Duplex, fourplex, small MF, select SFR'],
            ['Vintage',           '1980s–2000s preferred'],
            ['Asset Class',       'B-class only'],
            ['Min Cap Rate',      '6.5%'],
            ['Min CoC Return',    '7%–9%'],
            ['Min DSCR',          '1.20x'],
            ['Rent / Price',      '10%–15% annually'],
            ['Max Renovation',    '≤ 10–15% of price'],
            ['Base Rate',         '6.5%'],
            ['Stress Rate',       '7.5%'],
            ['Base Vacancy',      '5%'],
            ['Stress Vacancy',    '10%'],
            ['Expense Stress',    'Base + 15%'],
            ['Rent Stress',       'Base − 10%'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-400 shrink-0">{k}:</span>
              <span className="font-medium text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
