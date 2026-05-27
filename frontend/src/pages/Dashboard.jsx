import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/properties'
import StatusBadge from '../components/StatusBadge'

const STATUS_FILTERS = ['all', 'watching', 'active', 'under_contract', 'closed', 'rejected']

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function Dashboard() {
  const [properties, setProperties] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.listProperties(filter !== 'all' ? { status: filter } : {})
      .then(setProperties)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filter])

  const stats = {
    total: properties.length,
    active: properties.filter((p) => p.status === 'active').length,
    avgPrice: properties.length
      ? properties.reduce((s, p) => s + p.price, 0) / properties.length
      : null,
    totalRent: properties.reduce((s, p) => s + (p.monthly_rent ?? 0), 0) || null,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <button className="btn-primary" onClick={() => navigate('/properties/new')}>
          + Add Property
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Properties', value: stats.total },
          { label: 'Active Listings', value: stats.active },
          { label: 'Avg Price', value: fmt(stats.avgPrice) },
          { label: 'Total Monthly Rent', value: fmt(stats.totalRent) },
        ].map((s) => (
          <div key={s.label} className="card py-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Property table */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : properties.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No properties yet. Click <strong>+ Add Property</strong> to get started.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Address', 'Type', 'Price', 'Beds/Bath', 'Rent/mo', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/properties/${p.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.address}</p>
                    <p className="text-xs text-gray-500">{p.city}, {p.state} {p.zip_code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {p.property_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{fmt(p.price)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.bedrooms ?? '—'} / {p.bathrooms ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmt(p.monthly_rent)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      onClick={(e) => { e.stopPropagation(); navigate(`/properties/${p.id}`) }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
