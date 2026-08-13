import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/properties'
import PropertyForm   from '../components/PropertyForm'
import AnalysisOutput from '../components/AnalysisOutput'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function propertyToForm(prop) {
  return {
    ...prop,
    neighborhood: prop.neighborhood ?? '',
    broker:       prop.broker       ?? '',
    unit_config:  prop.unit_config  ?? '',
    sqft:         prop.sqft         ?? '',
    notes:        prop.notes        ?? '',
    zillow_url:   prop.zillow_url   ?? '',
  }
}

function toPayload(form) {
  const num = (v) => (v === '' || v == null ? null : Number(v))
  return {
    ...form,
    num_units:    Number(form.num_units) || 1,
    sqft:         num(form.sqft),
    asking_price: Number(form.asking_price),
    monthly_rent: Number(form.monthly_rent),
  }
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [property,    setProperty]    = useState(null)
  const [analysis,    setAnalysis]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const [editing,     setEditing]     = useState(false)
  const [editForm,    setEditForm]    = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError,   setEditError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getProperty(id)
      .then(async (prop) => {
        setProperty(prop)
        const an = await api.analyze(prop)
        setAnalysis(an)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function startEdit() {
    setEditForm(propertyToForm(property))
    setEditError(null)
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditing(false)
    setEditForm(null)
    setEditError(null)
  }

  function setField(field, value) {
    setEditForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    try {
      const p = toPayload(editForm)
      await api.updateProperty(id, p)
      const updated = await api.getProperty(id)
      setProperty(updated)
      const an = await api.analyze(updated)
      setAnalysis(an)
      setEditing(false)
      setEditForm(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this saved analysis? This cannot be undone.')) return
    setDeleting(true)
    await api.deleteProperty(id)
    navigate('/')
  }

  if (loading)   return <p className="text-gray-400 p-6">Loading…</p>
  if (error)     return <p className="text-red-500 p-6">{error}</p>
  if (!property) return null

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <button className="text-sm text-brand-600 hover:underline mb-1" onClick={cancelEdit}>
            ← Back to analysis
          </button>
          <h1 className="text-2xl font-bold">Edit — {property.address}</h1>
        </div>
        <PropertyForm
          form={editForm}
          onChange={setField}
          onSubmit={handleSaveEdit}
          onCancel={cancelEdit}
          loading={editLoading}
          submitLabel="Save Changes"
          error={editError}
        />
      </div>
    )
  }

  // ── View mode ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button className="text-sm text-brand-600 hover:underline mb-1" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">{property.address}</h1>
          <p className="text-gray-500 text-sm">
            {[property.city, property.state].filter(Boolean).join(', ')}
            {property.neighborhood && ` · ${property.neighborhood}`}
            {' · '}{property.num_units} unit{property.num_units !== 1 ? 's' : ''}
            {property.unit_config && ` (${property.unit_config})`}
            {property.property_type && ` · ${property.property_type.replace(/_/g, ' ')}`}
          </p>
          {property.broker && (
            <p className="text-xs text-gray-400 mt-0.5">Broker: {property.broker}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {property.zillow_url && (
            <a href={property.zillow_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Zillow ↗
            </a>
          )}
          <button className="btn-secondary" onClick={startEdit}>Edit</button>
          <button className="btn-secondary" onClick={() => navigate('/analyze')}>New Analysis</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>Delete</button>
        </div>
      </div>

      {/* Key inputs strip */}
      <div className="card flex flex-wrap gap-6 text-sm">
        <div><p className="text-xs text-gray-400">Asking Price</p><p className="font-bold">{$(property.asking_price)}</p></div>
        <div><p className="text-xs text-gray-400">Monthly Rent</p><p className="font-bold">{$(property.monthly_rent)}</p></div>
        {property.sqft && (
          <div><p className="text-xs text-gray-400">Sq Ft</p><p className="font-bold">{property.sqft.toLocaleString()}</p></div>
        )}
      </div>

      {/* Analysis output */}
      {analysis && <AnalysisOutput analysis={analysis} />}

      {/* Notes */}
      {property.notes && (
        <div className="card">
          <h3 className="font-semibold mb-2 text-sm">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap text-sm">{property.notes}</p>
        </div>
      )}
    </div>
  )
}
