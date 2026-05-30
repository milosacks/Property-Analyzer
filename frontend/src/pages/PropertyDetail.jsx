import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/properties'
import PropertyForm           from '../components/PropertyForm'
import RecommendationBanner   from '../components/RecommendationBanner'
import RiskScore              from '../components/RiskScore'
import ScenarioTable          from '../components/ScenarioTable'
import ThresholdChecks        from '../components/ThresholdChecks'
import SensitivityTable       from '../components/SensitivityTable'
import AIMemo                 from '../components/AIMemo'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// DB stores decimals (0.065); the form displays percentages (6.5).
function propertyToForm(prop) {
  return {
    ...prop,
    loan_to_value: +(prop.loan_to_value * 100).toPrecision(6),   // 0.75  → 75
    interest_rate: +(prop.interest_rate  * 100).toPrecision(6),  // 0.065 → 6.5
    vacancy_rate:  +(prop.vacancy_rate   * 100).toPrecision(6),  // 0.05  → 5
    vintage_year:  prop.vintage_year ?? '',
    notes:         prop.notes ?? '',
  }
}

// Convert display form (% as numbers) → API/DB payload (decimals)
function toPayload(form) {
  const num = (v) => (v === '' || v == null ? null : Number(v))
  return {
    ...form,
    num_units:                  Number(form.num_units),
    vintage_year:               num(form.vintage_year),
    purchase_price:             Number(form.purchase_price),
    loan_to_value:              Number(form.loan_to_value)   / 100,
    interest_rate:              Number(form.interest_rate)   / 100,
    loan_term_years:            Number(form.loan_term_years),
    renovation_cost:            Number(form.renovation_cost) || 0,
    closing_costs:              Number(form.closing_costs)   || 0,
    monthly_rent:               Number(form.monthly_rent),
    vacancy_rate:               Number(form.vacancy_rate)    / 100,
    annual_taxes:               Number(form.annual_taxes)               || 0,
    annual_insurance:           Number(form.annual_insurance)           || 0,
    annual_repairs:             Number(form.annual_repairs)             || 0,
    annual_property_management: Number(form.annual_property_management) || 0,
    annual_capex_reserve:       Number(form.annual_capex_reserve)       || 0,
    hold_period_years:          Number(form.hold_period_years),
  }
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [property,     setProperty]     = useState(null)
  const [analysis,     setAnalysis]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // Edit mode
  const [editing,      setEditing]      = useState(false)
  const [editForm,     setEditForm]     = useState(null)
  const [editLoading,  setEditLoading]  = useState(false)
  const [editError,    setEditError]    = useState(null)

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
    // Scroll to top so the form is visible
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
      const payload = toPayload(editForm)
      await api.updateProperty(id, payload)
      // Reload property and re-run analysis with updated data
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

  if (loading)    return <p className="text-gray-400 p-6">Loading…</p>
  if (error)      return <p className="text-red-500 p-6">{error}</p>
  if (!property)  return null

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <button className="text-sm text-brand-600 hover:underline mb-1" onClick={cancelEdit}>
              ← Back to analysis
            </button>
            <h1 className="text-2xl font-bold">Edit — {property.address}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Changes are saved to the database and the analysis is re-run immediately.
            </p>
          </div>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <button className="text-sm text-brand-600 hover:underline mb-1" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">{property.address}</h1>
          <p className="text-gray-500">
            {property.city}, {property.state} {property.zip_code}
            {' · '}{property.num_units} units
            {' · '}{property.property_type?.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary" onClick={startEdit}>Edit</button>
          <button className="btn-secondary" onClick={() => navigate('/analyze')}>New Analysis</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>Delete</button>
        </div>
      </div>

      {/* Key details strip */}
      <div className="card flex flex-wrap gap-6 text-sm">
        <div><p className="text-xs text-gray-400">Purchase Price</p><p className="font-bold">{$(property.purchase_price)}</p></div>
        <div><p className="text-xs text-gray-400">Monthly Rent</p><p className="font-bold">{$(property.monthly_rent)}</p></div>
        <div><p className="text-xs text-gray-400">Down Payment</p><p className="font-bold">{$(property.purchase_price * (1 - property.loan_to_value))}</p></div>
        <div><p className="text-xs text-gray-400">Renovation</p><p className="font-bold">{$(property.renovation_cost)}</p></div>
        <div><p className="text-xs text-gray-400">Interest Rate</p><p className="font-bold">{(property.interest_rate * 100).toFixed(2)}%</p></div>
        <div><p className="text-xs text-gray-400">Hold Period</p><p className="font-bold">{property.hold_period_years} yrs</p></div>
      </div>

      {analysis && (
        <>
          <RecommendationBanner
            recommendation={analysis.recommendation}
            reason={analysis.recommendation_reason}
            score={analysis.score.total_score}
          />
          <RiskScore score={analysis.score} />
          <div>
            <h2 className="text-lg font-semibold mb-3">Three-Scenario Analysis</h2>
            <ScenarioTable scenarios={analysis.scenarios} propertyData={property} />
          </div>
          <ThresholdChecks checks={analysis.threshold_checks} />
          <SensitivityTable sensitivity={analysis.sensitivity} />
          {property.notes && (
            <div className="card">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{property.notes}</p>
            </div>
          )}
          <AIMemo propertyData={property} analysis={analysis} />
        </>
      )}
    </div>
  )
}
