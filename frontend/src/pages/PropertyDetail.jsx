import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/properties'
import StatusBadge from '../components/StatusBadge'
import PropertyForm from '../components/PropertyForm'
import AnalysisCard from '../components/AnalysisCard'

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [property, setProperty] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [txForm, setTxForm] = useState(null)

  useEffect(() => {
    if (isNew) return
    Promise.all([
      api.getProperty(id),
      api.analyzeProperty(id),
      api.listTransactions(id),
    ]).then(([prop, anal, txs]) => {
      setProperty(prop)
      setAnalysis(anal)
      setTransactions(txs)
    }).catch((e) => setError(e.message))
  }, [id, isNew])

  async function handleSave(data) {
    setSaving(true)
    try {
      if (isNew) {
        const created = await api.createProperty(data)
        navigate(`/properties/${created.id}`, { replace: true })
      } else {
        const updated = await api.updateProperty(id, data)
        setProperty(updated)
        const anal = await api.analyzeProperty(id)
        setAnalysis(anal)
        setEditing(false)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this property? This cannot be undone.')) return
    await api.deleteProperty(id)
    navigate('/')
  }

  async function handleAddTransaction(e) {
    e.preventDefault()
    const data = {
      property_id: id,
      transaction_type: txForm.type,
      price: Number(txForm.price),
      transaction_date: txForm.date,
      notes: txForm.notes || null,
    }
    const tx = await api.createTransaction(id, data)
    setTransactions((prev) => [tx, ...prev])
    setTxForm(null)
  }

  if (error) return <p className="text-red-500 p-6">{error}</p>
  if (!isNew && !property) return <p className="text-gray-500 p-6">Loading…</p>

  if (editing || isNew) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button className="btn-secondary" onClick={() => isNew ? navigate('/') : setEditing(false)}>← Back</button>
          <h1 className="text-xl font-bold">{isNew ? 'Add Property' : 'Edit Property'}</h1>
        </div>
        <div className="card">
          <PropertyForm
            initial={property ?? {}}
            onSubmit={handleSave}
            onCancel={isNew ? () => navigate('/') : () => setEditing(false)}
            loading={saving}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button className="text-sm text-brand-600 hover:underline mb-1" onClick={() => navigate('/')}>← All Properties</button>
          <h1 className="text-2xl font-bold">{property.address}</h1>
          <p className="text-gray-500">{property.city}, {property.state} {property.zip_code}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Info + Status */}
      <div className="card flex flex-wrap gap-6 items-center">
        <StatusBadge status={property.status} />
        <span className="text-gray-500 text-sm capitalize">{property.property_type.replace(/_/g, ' ')}</span>
        <span className="font-semibold text-lg">{fmt(property.price)}</span>
        {property.bedrooms && <span className="text-sm text-gray-600">{property.bedrooms} bed</span>}
        {property.bathrooms && <span className="text-sm text-gray-600">{property.bathrooms} bath</span>}
        {property.sqft && <span className="text-sm text-gray-600">{property.sqft.toLocaleString()} sqft</span>}
      </div>

      {/* Analysis */}
      {analysis && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Deal Analysis</h2>
          <AnalysisCard analysis={analysis} />
        </div>
      )}

      {/* Notes */}
      {property.notes && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{property.notes}</p>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          {!txForm && (
            <button className="btn-secondary text-sm" onClick={() => setTxForm({ type: 'purchase', price: '', date: '', notes: '' })}>
              + Add Transaction
            </button>
          )}
        </div>

        {txForm && (
          <form onSubmit={handleAddTransaction} className="mb-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={txForm.type} onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
              </select>
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input className="input" type="number" required value={txForm.price} onChange={(e) => setTxForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" required value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={txForm.notes} onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setTxForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}

        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm">No transactions recorded.</p>
        ) : (
          <table className="min-w-full">
            <thead><tr className="text-xs text-gray-500 uppercase">
              <th className="text-left pb-2">Date</th>
              <th className="text-left pb-2">Type</th>
              <th className="text-left pb-2">Price</th>
              <th className="text-left pb-2">Notes</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-2 text-sm">{tx.transaction_date}</td>
                  <td className="py-2 text-sm capitalize">{tx.transaction_type}</td>
                  <td className="py-2 text-sm font-medium">{fmt(tx.price)}</td>
                  <td className="py-2 text-sm text-gray-500">{tx.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
