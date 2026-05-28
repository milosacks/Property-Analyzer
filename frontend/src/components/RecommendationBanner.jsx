const CONFIG = {
  'Proceed': {
    bg: 'bg-green-50 border-green-400',
    text: 'text-green-800',
    badge: 'bg-green-600 text-white',
    icon: '✓',
  },
  'Needs More Research': {
    bg: 'bg-yellow-50 border-yellow-400',
    text: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
    icon: '⚠',
  },
  'Do Not Proceed': {
    bg: 'bg-red-50 border-red-400',
    text: 'text-red-800',
    badge: 'bg-red-600 text-white',
    icon: '✗',
  },
}

export default function RecommendationBanner({ recommendation, reason, score }) {
  const c = CONFIG[recommendation] ?? CONFIG['Needs More Research']
  return (
    <div className={`rounded-xl border-2 p-6 ${c.bg}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold w-10 h-10 rounded-full flex items-center justify-center ${c.badge}`}>
            {c.icon}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommendation</p>
            <p className={`text-2xl font-bold ${c.text}`}>{recommendation}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk Score</p>
          <p className={`text-4xl font-black ${c.text}`}>{score}<span className="text-lg font-normal">/100</span></p>
        </div>
      </div>
      {reason && <p className={`mt-3 text-sm ${c.text}`}>{reason}</p>}
    </div>
  )
}
