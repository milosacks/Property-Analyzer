import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/properties'
import PropertyForm   from '../components/PropertyForm'
import AnalysisOutput from '../components/AnalysisOutput'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function parseUnitConfig(unitConfig) {
  if (!unitConfig) return { beds_per_unit: '2', baths_per_unit: '1' }
  if (unitConfig.toLowerCase().includes('studio')) return { beds_per_unit: 'studio', baths_per_unit: '1' }
  const m = unitConfig.match(/(\d+)br(?:\/([\d.]+)ba)?/)
  return { beds_per_unit: m ? m[1] : '2', baths_per_unit: m ? (m[2] || '1') : '1' }
}

function buildUnitConfig(numUnits, beds, baths) {
  if (!beds) return null
  const bedsStr = beds === 'studio' ? 'Studio' : `${beds}br`
  return `${numUnits} x ${bedsStr}/${baths}ba`
}

function propertyToForm(prop) {
  return {
    ...prop,
    neighborhood: prop.neighborhood ?? '',
    broker:       prop.broker       ?? '',
    sqft:         prop.sqft         ?? '',
    notes:        prop.notes        ?? '',
    zillow_url:   prop.zillow_url   ?? '',
    // Parse stored unit_config back to dropdown values
    ...parseUnitConfig(prop.unit_config),
    // Default assumptions for the edit form
    purchase_price_pct: '95', down_pct: '25', interest_rate: '7',
    loan_term_years: '30', closing_pct: '4', reserve_months: '6',
    insurance_rate: '0.8', tax_rate: '1.2', mgmt_rate: '10',
  }
}

function toPayload(form) {
  const n   = (v) => (v === '' || v == null ? null : Number(v))
  const pct = (v) => (v === '' || v == null ? null : Number(v) / 100)
  const numUnits = Number(form.num_units) || 1
  return {
    ...form,
    num_units:    numUnits,
    sqft:         n(form.sqft),
    asking_price: Number(form.asking_price),
    monthly_rent: Number(form.monthly_rent),
    unit_config:  buildUnitConfig(numUnits, form.beds_per_unit, form.baths_per_unit),
    purchase_price_pct: pct(form.purchase_price_pct) ?? 0.95,
    down_pct:           pct(form.down_pct)           ?? 0.25,
    interest_rate:      pct(form.interest_rate)      ?? 0.07,
    loan_term_years:    n(form.loan_term_years)      ?? 30,
    closing_pct:        pct(form.closing_pct)        ?? 0.04,
    reserve_months:     n(form.reserve_months)       ?? 6,
    insurance_rate:     pct(form.insurance_rate)     ?? 0.008,
    tax_rate:           pct(form.tax_rate)           ?? 0.012,
    mgmt_rate:          pct(form.mgmt_rate)          ?? 0.10,
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
