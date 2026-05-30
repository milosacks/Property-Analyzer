import { useState } from 'react'
import { api } from '../api/properties'
import PropertyForm           from '../components/PropertyForm'
import RecommendationBanner   from '../components/RecommendationBanner'
import RiskScore              from '../components/RiskScore'
import ScenarioTable          from '../components/ScenarioTable'
import ThresholdChecks        from '../components/ThresholdChecks'
import SensitivityTable       from '../components/SensitivityTable'
import AIMemo                 from '../components/AIMemo'

// ── Blank starting state (selects and loan term keep sensible defaults) ────────
export const EMPTY_FORM = {
  address: '', city: '', state: '', zip_code: '',
  property_type: 'duplex', num_units: '', vintage_year: '',
  asset_class: 'B', status: 'analyzing', notes: '',
  // percentage fields stored as display % (e.g. 6.5, 75, 5)
  purchase_price: '', loan_to_value: '', interest_rate: '',
  loan_term_years: 30, renovation_cost: '', closing_costs: '',
  monthly_rent: '', vacancy_rate: '',
  annual_taxes: '', annual_insurance: '', annual_repairs: '',
  annual_property_management: '', annual_capex_reserve: '',
  rent_confidence: 'medium', expense_confidence: 'medium',
  location_risk: 'medium', property_condition_risk: 'medium',
  hold_period_years: 7,
}

function num(v) { return v === '' || v == null ? null : Number(v) }

// Convert display form (% as numbers) → API payload (decimals)
export function toPayload(form) {
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

export default function Analyzer() {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [results, setResults] = useState(null)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setResults(null)
    setSaved(false)
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)
    setSaved(false)
    try {
      const p = toPayload(form)
      setPayload(p)
      const r = await api.analyze(p)
      setResults(r)
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!payload) return
    setSaving(true)
    try {
      await api.createProperty(payload)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Analyzer</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter property details to run Base / Downside / Upside scenarios and generate an investment recommendation.
        </p>
      </div>

      <PropertyForm
        form={form}
        onChange={set}
        onSubmit={handleAnalyze}
        loading={loading}
        submitLabel="Analyze Property"
        error={error}
      />

      {results && (
        <div id="results" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Analysis Results</h2>
            <div className="flex gap-2">
              {!saved ? (
                <button className="btn-secondary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Analysis'}
                </button>
              ) : (
                <span className="text-green-600 text-sm font-medium self-center">Saved</span>
              )}
            </div>
          </div>

          <RecommendationBanner
            recommendation={results.recommendation}
            reason={results.recommendation_reason}
            score={results.score.total_score}
          />
          <RiskScore score={results.score} />
          <div>
            <h2 className="text-lg font-semibold mb-3">Three-Scenario Analysis</h2>
            <ScenarioTable scenarios={results.scenarios} propertyData={payload} />
          </div>
          <ThresholdChecks checks={results.threshold_checks} />
          <SensitivityTable sensitivity={results.sensitivity} />
          <AIMemo propertyData={payload} analysis={results} />
        </div>
      )}
    </div>
  )
}
