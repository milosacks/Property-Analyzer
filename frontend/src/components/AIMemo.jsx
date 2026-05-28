import { useState } from 'react'
import { api } from '../api/properties'

const REC_COLOR = {
  'Proceed':             'text-green-700 bg-green-50 border-green-300',
  'Needs More Research': 'text-yellow-700 bg-yellow-50 border-yellow-300',
  'Do Not Proceed':      'text-red-700 bg-red-50 border-red-300',
}

const CONF_COLOR = {
  'High':   'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'Low':    'bg-red-100 text-red-800',
}

function Section({ title, items }) {
  if (!items?.length) return null
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-gray-400 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AIMemo({ propertyData, analysis }) {
  const [memo, setMemo]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const result = await api.generateMemo(propertyData, analysis)
      setMemo(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!memo) {
    return (
      <div className="card text-center py-10 space-y-4">
        <div className="text-4xl">🤖</div>
        <div>
          <h2 className="text-lg font-semibold">AI Investment Memo</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Claude will analyze this deal against your investment criteria and generate a structured memo — only using the numbers you've entered.
          </p>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary mx-auto"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating Memo…
            </span>
          ) : 'Generate AI Memo'}
        </button>
        <p className="text-xs text-gray-400">Powered by Claude · Only uses data you've entered · No guesses</p>
      </div>
    )
  }

  const recColor  = REC_COLOR[memo.recommendation]  ?? REC_COLOR['Needs More Research']
  const confColor = CONF_COLOR[memo.confidence] ?? CONF_COLOR['Medium']

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🤖 AI Investment Memo
        </h2>
        <button onClick={() => { setMemo(null); setError(null) }} className="btn-secondary text-xs">
          Regenerate
        </button>
      </div>

      {/* Recommendation + Confidence */}
      <div className={`rounded-lg border p-4 ${recColor}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">AI Recommendation</p>
            <p className="text-xl font-bold">{memo.recommendation}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Confidence</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${confColor}`}>
              {memo.confidence}
            </span>
          </div>
        </div>
        {memo.confidence_reason && (
          <p className="mt-2 text-sm opacity-80">{memo.confidence_reason}</p>
        )}
      </div>

      {/* Memo narrative */}
      {memo.memo && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Investment Memo</h4>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
            {memo.memo.split('\n').filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Financial Snapshot"    items={memo.financial_snapshot} />
        <Section title="Stress Test"           items={memo.stress_test} />
        <Section title="Key Risks"             items={memo.key_risks} />
        <Section title="Missing Data"          items={memo.missing_data} />
      </div>

      <Section title="Suggested Next Steps" items={memo.next_steps} />

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        ⚠ This memo is based solely on the numbers you entered. It is not legal, tax, or financial advice.
        Always verify rent comps, expenses, zoning, and property condition with qualified professionals.
      </p>
    </div>
  )
}
