function Bar({ pct, color }) {
  // Never render completely invisible — a 0-score bar shows as a thin red sliver
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

// Thresholds shown in the tooltip so users understand what caused a 0
const THRESHOLDS = {
  cash_flow:          'Score: <$0/mo → 0, $0–200 → 50, $200–500 → 80, $500+ → 100',
  coc_return:         'Score: <0% → 0, 0–4% → 20, 4–7% → 50, 7–9% → 80, 9%+ → 100',
  dscr:               'Score: <1.00x → 0, 1.00–1.10x → 40, 1.10–1.20x → 60, 1.20–1.35x → 80, 1.35x+ → 100',
  cap_rate:           'Score: <4.5% → 0, 4.5–5.5% → 20, 5.5–6.5% → 50, 6.5–7.5% → 80, 7.5%+ → 100',
  rent_confidence:    'High → 100, Medium → 70, Low → 30',
  expense_confidence: 'High → 100, Medium → 70, Low → 30',
  location_risk:      'Low risk → 100, Medium → 70, High risk → 30',
  property_condition: 'Low risk → 100, Medium → 70, High risk → 30',
}

export default function RiskScore({ score }) {
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
            <div key={key} className="flex items-center gap-3" title={THRESHOLDS[key] ?? ''}>
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
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 pt-1">
        80–100 = Proceed · 60–79 = Needs More Research · 0–59 = Do Not Proceed
        <span className="ml-2 italic">Hover a row to see score thresholds.</span>
      </p>
    </div>
  )
}
