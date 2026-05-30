import { useState } from 'react'

// ── Scale anchor tables (descending: best at top) ─────────────────────────────
// Each entry: { label, score, note? }
const SCALE = {
  cash_flow: [
    { label: '$1,000+/mo', score: 100 },
    { label: '$500/mo',    score:  80 },
    { label: '$200/mo',    score:  55, note: 'target min' },
    { label: '$0/mo',      score:  15 },
    { label: '−$500/mo',  score:   0 },
  ],
  coc_return: [
    { label: '12%+',  score: 100 },
    { label: '9%',    score:  85 },
    { label: '7%',    score:  70, note: 'minimum' },
    { label: '4%',    score:  40 },
    { label: '0%',    score:  10 },
    { label: '−5%',   score:   0 },
  ],
  dscr: [
    { label: '1.60x+', score: 100 },
    { label: '1.35x',  score:  82 },
    { label: '1.20x',  score:  65, note: 'minimum' },
    { label: '1.10x',  score:  40 },
    { label: '1.00x',  score:  15 },
    { label: '0.50x',  score:   0 },
  ],
  cap_rate: [
    { label: '9%+',  score: 100 },
    { label: '7.5%', score:  82 },
    { label: '6.5%', score:  60, note: 'minimum' },
    { label: '5.5%', score:  35 },
    { label: '4.5%', score:  15 },
    { label: '0%',   score:   0 },
  ],
  rent_confidence:    [{ label: 'High',     score: 100 }, { label: 'Medium', score: 70 }, { label: 'Low',       score: 30 }],
  expense_confidence: [{ label: 'High',     score: 100 }, { label: 'Medium', score: 70 }, { label: 'Low',       score: 30 }],
  location_risk:      [{ label: 'Low risk', score: 100 }, { label: 'Medium', score: 70 }, { label: 'High risk', score: 30 }],
  property_condition: [{ label: 'Low risk', score: 100 }, { label: 'Medium', score: 70 }, { label: 'High risk', score: 30 }],
}

// Find which two anchors bracket the current score (anchors are descending)
function findSegment(score, anchors) {
  for (let i = 0; i < anchors.length - 1; i++) {
    if (score <= anchors[i].score && score >= anchors[i + 1].score) return i
  }
  return -1
}

function ScaleTooltip({ componentKey, currentScore, formattedValue }) {
  const anchors = SCALE[componentKey]
  if (!anchors) return null
  const seg = findSegment(currentScore, anchors)

  return (
    <div className="absolute bottom-full right-0 mb-2 z-50 w-52 pointer-events-none">
      {/* Arrow */}
      <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Score scale</p>
        </div>
        <div className="px-3 py-2 space-y-1">
          {anchors.map(({ label, score, note }, i) => {
            const isAbove   = i === seg       // anchor just above current value
            const isBelow   = i === seg + 1   // anchor just below current value
            const highlight = isAbove || isBelow
            return (
              <div key={label} className={`flex items-center justify-between gap-2 text-xs rounded px-1 py-0.5
                ${highlight ? 'bg-brand-50' : ''}`}>
                <span className={highlight ? 'text-brand-700 font-medium' : 'text-gray-500'}>
                  {label}
                  {note && <span className="ml-1 text-gray-400 font-normal">({note})</span>}
                </span>
                <span className={`font-mono tabular-nums ${highlight ? 'text-brand-700 font-semibold' : 'text-gray-400'}`}>
                  {score}
                </span>
              </div>
            )
          })}
        </div>
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-1.5 flex justify-between items-center">
          <span className="text-xs text-gray-500 font-mono">{formattedValue}</span>
          <span className="text-xs font-bold text-gray-700">{currentScore.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

function Bar({ pct, color }) {
  const width = pct === 0 ? 2 : pct
  return (
    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function scoreColor(score) {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-400'
  return 'bg-red-500'
}

export default function RiskScore({ score }) {
  const [hovered, setHovered] = useState(null)
  const { total_score, components } = score

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Risk Score Breakdown</h2>
        <span className="text-2xl font-black text-gray-800">
          {total_score}<span className="text-sm font-normal text-gray-500">/100</span>
        </span>
      </div>
      <Bar pct={total_score} color={scoreColor(total_score)} />

      <div className="space-y-2 pt-1">
        {Object.entries(components).map(([key, c]) => {
          const weighted = (c.score * c.weight).toFixed(1)
          const isZero   = c.score === 0

          return (
            <div
              key={key}
              className="relative flex items-center gap-3 cursor-default"
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="w-36 text-xs text-gray-600 shrink-0">{c.label}</div>
              <div className="flex-1">
                <Bar pct={c.score} color={scoreColor(c.score)} />
              </div>
              <div className="w-28 text-right text-xs shrink-0">
                {c.formatted_value && (
                  <span className={`mr-1 font-mono ${isZero ? 'text-red-500' : 'text-gray-400'}`}>
                    {c.formatted_value}
                  </span>
                )}
                <span className={isZero ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                  {c.score.toFixed(0)}/100
                </span>
                {' '}
                <strong className="text-gray-700">= {weighted}</strong>
              </div>

              {hovered === key && (
                <ScaleTooltip
                  componentKey={key}
                  currentScore={c.score}
                  formattedValue={c.formatted_value}
                />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 pt-1">
        80–100 = Proceed · 60–79 = Needs More Research · 0–59 = Do Not Proceed
        <span className="ml-2 italic">Hover any row to see its scale.</span>
      </p>
    </div>
  )
}
