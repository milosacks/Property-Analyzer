const STATUS = {
  pass: { icon: '✓', cls: 'text-green-700 bg-green-50 border-green-200' },
  warn: { icon: '⚠', cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  fail: { icon: '✗', cls: 'text-red-700 bg-red-50 border-red-200' },
}

export default function ThresholdChecks({ checks }) {
  const counts = checks.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Threshold Checks</h2>
        <div className="flex gap-2 text-xs">
          {counts.pass  && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{counts.pass} pass</span>}
          {counts.warn  && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">{counts.warn} warn</span>}
          {counts.fail  && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{counts.fail} fail</span>}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((c, i) => {
          const s = STATUS[c.status] ?? STATUS.warn
          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${s.cls}`}>
              <span className="font-bold text-lg leading-none mt-0.5">{s.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{c.label}</p>
                <p className="text-xs opacity-80 font-mono">{c.formatted}</p>
                {c.notes && <p className="text-xs opacity-60 mt-0.5">{c.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
