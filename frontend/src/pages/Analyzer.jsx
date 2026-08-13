import { useState } from 'react'
import { api } from '../api/properties'
import PropertyForm    from '../components/PropertyForm'
import AnalysisOutput  from '../components/AnalysisOutput'

export const EMPTY_FORM = {
  address: '', city: '', state: '', zip_code: '',
  neighborhood: '', broker: '', zillow_url: '', notes: '',
  status: 'analyzing',
  property_type: 'duplex', num_units: '', unit_config: '', sqft: '',
  asking_price: '', monthly_rent: '',
}

function num(v) { return v === '' || v == null ? null : Number(v) }

export function toPayload(form) {
  return {
    ...form,
    num_units:    Number(form.num_units) || 1,
    sqft:         num(form.sqft),
    asking_price: Number(form.asking_price),
    monthly_rent: Number(form.monthly_rent),
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
