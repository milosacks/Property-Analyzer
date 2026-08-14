import { useState } from 'react'
import { api } from '../api/properties'
import PropertyForm    from '../components/PropertyForm'
import AnalysisOutput  from '../components/AnalysisOutput'

export const EMPTY_FORM = {
  address: '', city: '', state: '', zip_code: '',
  neighborhood: '', broker: '', zillow_url: '', notes: '',
  status: 'analyzing',
  property_type: 'duplex', num_units: '', sqft: '',
  beds_per_unit: '2', baths_per_unit: '1',
  asking_price: '', monthly_rent: '',
  // Financing assumptions (UI shows %, backend uses decimals)
  purchase_price_pct: '95', down_pct: '25', interest_rate: '7',
  loan_term_years: '30', closing_pct: '4', reserve_months: '6',
  // Expense assumptions (Durham, NC defaults)
  insurance_rate: '1.0', tax_rate: '1.3', mgmt_rate: '10',
}

function num(v) { return v === '' || v == null ? null : Number(v) }
function pct(v) { return v === '' || v == null ? null : Number(v) / 100 }

function buildUnitConfig(numUnits, beds, baths) {
  if (!beds) return null
  const bedsStr = beds === 'studio' ? 'Studio' : `${beds}br`
  return `${numUnits} x ${bedsStr}/${baths}ba`
}

export function toPayload(form) {
  const numUnits = Number(form.num_units) || 1
  return {
    ...form,
    num_units:    numUnits,
    sqft:         num(form.sqft),
    asking_price: Number(form.asking_price),
    monthly_rent: Number(form.monthly_rent),
    unit_config:  buildUnitConfig(numUnits, form.beds_per_unit, form.baths_per_unit),
    // Convert UI percentages to decimals for the backend
    purchase_price_pct: pct(form.purchase_price_pct) ?? 0.95,
    down_pct:           pct(form.down_pct)           ?? 0.25,
    interest_rate:      pct(form.interest_rate)      ?? 0.07,
    loan_term_years:    num(form.loan_term_years)    ?? 30,
    closing_pct:        pct(form.closing_pct)        ?? 0.04,
    reserve_months:     num(form.reserve_months)     ?? 6,
    insurance_rate:     pct(form.insurance_rate)     ?? 0.008,
    tax_rate:           pct(form.tax_rate)           ?? 0.012,
    mgmt_rate:          pct(form.mgmt_rate)          ?? 0.10,
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
          Enter property details to calculate returns. All financing assumptions are fixed.
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
        <div id="results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{form.address || 'Analysis Results'}</h2>
            <div className="flex gap-2">
              {!saved ? (
                <button className="btn-secondary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Analysis'}
                </button>
              ) : (
                <span className="text-green-600 text-sm font-medium self-center">Saved ✓</span>
              )}
            </div>
          </div>

          <AnalysisOutput analysis={results} />
        </div>
      )}
    </div>
  )
}
