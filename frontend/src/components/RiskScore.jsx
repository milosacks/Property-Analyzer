function Bar({ pct, color }) {
  return (
    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function scoreColor(score) {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-400'
  return 'bg-red-500'
}

export default function RiskScore({ score }) {
  const { total_score, recommendation, components } = score
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Risk Score Breakdown</h2>
        <span className="text-2xl font-black text-gray-800">{total_score}<span className="text-sm font-normal text-gray-500">/100</span></span>
      </div>
      <Bar pct={total_score} color={scoreColor(total_score)} />
      <div className="space-y-2 pt-1">
        {Object.entries(components).map(([key, c]) => {
          const weighted = (c.score * c.weight).toFixed(1)
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-36 text-xs text-gray-600 shrink-0">{c.label}</div>
              <div className="flex-1">
                <Bar pct={c.score} color={scoreColor(c.score)} />
              </div>
              <div className="w-20 text-right text-xs text-gray-500">
                {c.score.toFixed(0)}/100 × {(c.weight * 100).toFixed(0)}% = <strong>{weighted}</strong>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 pt-1">
        80–100 = Proceed · 60–79 = Needs More Research · 0–59 = Do Not Proceed
      </p>
    </div>
  )
}
