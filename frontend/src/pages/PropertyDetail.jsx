import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/properties'
import RecommendationBanner from '../components/RecommendationBanner'
import RiskScore             from '../components/RiskScore'
import ScenarioTable         from '../components/ScenarioTable'
import ThresholdChecks       from '../components/ThresholdChecks'
import SensitivityTable      from '../components/SensitivityTable'
import AIMemo                from '../components/AIMemo'

const $ = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [property,  setProperty]  = useState(null)
  const [analysis,  setAnalysis]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [deleting,  setDeleting]  = useState(false)

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

  async function handleDelete() {
    if (!confirm('Delete this saved analysis? This cannot be undone.')) return
    setDeleting(true)
    await api.deleteProperty(id)
    navigate('/')
  }

  if (loading) return <p className="text-gray-400 p-6">Loading…</p>
  if (error)   return <p className="text-red-500 p-6">{error}</p>
  if (!property) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button className="text-sm text-brand-600 hover:underline mb-1" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">{property.address}</h1>
          <p className="text-gray-500">{property.city}, {property.state} {property.zip_code} · {property.num_units} units · {property.property_type?.replace(/_/g,' ')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary" onClick={() => navigate('/analyze')}>New Analysis</button>
          <button className="btn-danger"    onClick={handleDelete} disabled={deleting}>Delete</button>
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
