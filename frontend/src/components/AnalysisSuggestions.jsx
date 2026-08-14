const $ = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const T_ROI = 10      // % (matches a.roi units)
const T_CAP = 0.065   // decimal (matches a.cap_rate units)
const T_CF  = 200     // $/mo

// Monthly mortgage per $1 of purchase price scales with down_pct.
// Derive the amortization factor (per dollar of loan) from the existing output,
// then recompute for any down_pct without needing the full formula.
function mkFor(a, down_pct) {
  const amort = (a.monthly_mortgage / a.purchase_price) / (1 - a.down_pct)
  return (1 - down_pct) * amort
}

function quickMetrics(monthly_rent, purchase_price, a, down_pct) {
  const d   = down_pct ?? a.down_pct
  const G   = monthly_rent * 12
  const exp = purchase_price * a.insurance_rate
            + purchase_price * a.tax_rate
            + G * a.mgmt_rate
  const mtg = purchase_price * mkFor(a, d) * 12
  const noi = G - exp
  const cf  = noi - mtg
  const res = (exp / 12) * a.reserve_months
  const cac = purchase_price * (d + a.closing_pct) + res
  return {
    roi:      cac > 0 ? cf / cac * 100 : 0,
    cap_rate: purchase_price > 0 ? noi / purchase_price : 0,
    cf:       cf / 12,
  }
}

// Maximum purchase price that satisfies all failing metrics at a given (G, down_pct).
function maxPriceAt(G, a, failing, down_pct) {
  const d     = down_pct ?? a.down_pct
  const mk    = mkFor(a, d)
  const m     = a.mgmt_rate
  const R     = a.reserve_months
  const c     = a.closing_pct
  const ir    = a.insurance_rate + a.tax_rate
  const roi_d = T_ROI / 100
  const E     = ir + mk * 12
  const L     = d + c + R * ir / 12

  const caps = []
  if (failing.includes('roi')) {
    const denom = roi_d * L + E
    if (denom > 0) caps.push(G * ((1 - m) - roi_d * R * m / 12) / denom)
  }
  if (failing.includes('cap')) {
    caps.push(G * (1 - m) / (T_CAP + ir))
  }
  if (failing.includes('cf')) {
    const rate = ir / 12 + mk
    if (rate > 0) caps.push((G * (1 - m) / 12 - T_CF) / rate)
  }

  const valid = caps.filter(v => Number.isFinite(v) && v > 0)
  return valid.length ? Math.min(...valid) : null
}

function solve(a) {
  const G   = a.gross_income
  const p   = a.purchase_price
  const m   = a.mgmt_rate
  const R   = a.reserve_months
  const d   = a.down_pct
  const c   = a.closing_pct
  const ppp = a.purchase_price_pct
  const ir  = a.insurance_rate + a.tax_rate
  const mk  = mkFor(a, d)
  const roi_d = T_ROI / 100
  const E   = ir + mk * 12
  const L   = d + c + R * ir / 12

  const failing = [
    a.roi < T_ROI && 'roi',
    a.cap_rate < T_CAP && 'cap',
    a.monthly_cash_flow < T_CF && 'cf',
  ].filter(Boolean)

  if (failing.length === 0) return null

  const labelMap = { roi: 'ROI', cap: 'Cap Rate', cf: 'Cash Flow' }
  const failingLabels = failing.map(k => labelMap[k])

  // ── Rent needed (price + down fixed at current) ────────────────────────────
  const rentCaps = []
  if (failing.includes('roi')) {
    const denom = (1 - m) - roi_d * R * m / 12
    if (denom > 0) rentCaps.push(p * (E + roi_d * L) / denom / 12)
  }
  if (failing.includes('cap')) {
    rentCaps.push(p * (T_CAP + ir) / (1 - m) / 12)
  }
  if (failing.includes('cf')) {
    rentCaps.push((T_CF + p * (ir / 12 + mk)) / (1 - m))
  }

  const validRents = rentCaps.filter(v => Number.isFinite(v) && v > 0)
  const current_rent = G / 12
  if (!validRents.length) return null

  const rawTargetRent = Math.max(...validRents)
  if (rawTargetRent <= current_rent) return null

  // ── Rent-only scenario ─────────────────────────────────────────────────────
  const tRent = Math.ceil(rawTargetRent / 25) * 25
  const rentOption = {
    monthly_rent: tRent,
    rent_delta:   tRent - current_rent,
    metrics:      quickMetrics(tRent, p, a, d),
  }

  // ── Price-only scenario (rent + down fixed) ────────────────────────────────
  const rawTargetPrice = maxPriceAt(G, a, failing, d)
  const canFixByPrice = rawTargetPrice != null && rawTargetPrice > 0 && rawTargetPrice < p

  const priceOption = canFixByPrice ? (() => {
    const tPurchase  = Math.floor(rawTargetPrice / 5000) * 5000
    const tAsking    = Math.round(tPurchase / ppp / 5000) * 5000
    return {
      purchase_price: tPurchase,
      asking_price:   tAsking,
      price_delta:    Math.round(p / ppp / 5000) * 5000 - tAsking,
      metrics:        quickMetrics(current_rent, tPurchase, a, d),
    }
  })() : null

  // ── Balanced scenario: ⅓ rent delta + 5 pp more down + remaining price ─────
  const balancedOption = canFixByPrice ? (() => {
    const r3  = current_rent + (rawTargetRent - current_rent) / 3
    // Round down payment up to next 5% increment, cap at 50%
    const d3  = Math.min(Math.ceil((d * 100 + 5) / 5) * 5 / 100, 0.50)
    const G3  = r3 * 12
    const rawP3 = maxPriceAt(G3, a, failing, d3)
    if (!rawP3 || rawP3 >= p) return null   // no price reduction needed — skip

    const tRent3    = Math.ceil(r3 / 25) * 25
    const tPurchase3 = Math.floor(rawP3 / 5000) * 5000
    const tAsking3  = Math.round(tPurchase3 / ppp / 5000) * 5000
    return {
      monthly_rent:   tRent3,
      rent_delta:     tRent3 - current_rent,
      down_pct:       d3,
      down_delta:     d3 - d,
      purchase_price: tPurchase3,
      asking_price:   tAsking3,
      price_delta:    Math.round(p / ppp / 5000) * 5000 - tAsking3,
      metrics:        quickMetrics(tRent3, tPurchase3, a, d3),
    }
  })() : null

  return {
    failingLabels,
    rentOption,
    balancedOption,
    priceOption,
    current_asking: Math.round(p / ppp / 5000) * 5000,
  }
}

// ── UI components ─────────────────────────────────────────────────────────────

function MetricRow({ label, value, target, format }) {
  const met = value >= target
  return (
    <div className={`flex justify-between text-xs ${met ? 'text-green-600' : 'text-amber-600'}`}>
      <span>{label}</span>
      <span className="font-mono font-medium">{format(value)}</span>
    </div>
  )
}

function Metrics({ m }) {
  return (
    <div className="space-y-1.5 border-t border-gray-200 pt-2.5 mt-3">
      <MetricRow label="ROI"       value={m.roi}      target={T_ROI} format={v => `${v.toFixed(1)}%`} />
      <MetricRow label="Cap Rate"  value={m.cap_rate} target={T_CAP} format={v => `${(v * 100).toFixed(2)}%`} />
      <MetricRow label="Cash Flow" value={m.cf}       target={T_CF}  format={v => `${$(v)}/mo`} />
    </div>
  )
}

function Card({ accent, label, children, metrics }) {
  const border = accent
    ? 'border-2 border-brand-300 bg-brand-50/40'
    : 'border border-gray-200 bg-gray-50/60'
  const tag = accent
    ? 'text-xs text-brand-600 font-semibold uppercase tracking-wide'
    : 'text-xs text-gray-400 uppercase tracking-wide'
  return (
    <div className={`rounded-lg ${border} p-4`}>
      <p className={tag}>{label}</p>
      <div className="mt-1 space-y-0.5">{children}</div>
      <Metrics m={metrics} />
    </div>
  )
}

function Line({ value, sub }) {
  return (
    <div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function AnalysisSuggestions({ analysis: a }) {
  const result = solve(a)
  if (!result) return null

  const { failingLabels, rentOption: ro, balancedOption: bo, priceOption: po } = result
  const cols = bo ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="card">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
        Path to Your Targets
      </p>
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-medium text-gray-700">{failingLabels.join(', ')}</span>{' '}
        {failingLabels.length === 1 ? 'is' : 'are'} below target.
        Each scenario below independently gets you there.
      </p>

      <div className={`grid ${cols} gap-3`}>

        <Card label="Lean on rent" metrics={ro.metrics}>
          <Line
            value={`${$(ro.monthly_rent)}/mo`}
            sub={`+${$(ro.rent_delta)}/mo · price & down unchanged`}
          />
        </Card>

        {bo && (
          <Card label="Balanced" accent metrics={bo.metrics}>
            <Line
              value={`${$(bo.monthly_rent)}/mo`}
              sub={`+${$(bo.rent_delta)}/mo rent`}
            />
            <Line
              value={`${Math.round(bo.down_pct * 100)}% down`}
              sub={`+${Math.round(bo.down_delta * 100)} pp more down`}
            />
            <Line
              value={$(bo.asking_price)}
              sub={`−${$(bo.price_delta)} off asking`}
            />
          </Card>
        )}

        {po && (
          <Card label="Lean on price" metrics={po.metrics}>
            <Line
              value={$(po.asking_price)}
              sub={`−${$(po.price_delta)} off asking · rent & down unchanged`}
            />
          </Card>
        )}

      </div>
    </div>
  )
}
