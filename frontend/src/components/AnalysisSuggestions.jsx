const $ = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const T_ROI = 10      // % (a.roi units)
const T_CAP = 0.065   // decimal (a.cap_rate units)
const T_CF  = 200     // $/mo

function quickMetrics(monthly_rent, purchase_price, a) {
  const G          = monthly_rent * 12
  const annual_exp = purchase_price * a.insurance_rate
                   + purchase_price * a.tax_rate
                   + G * a.mgmt_rate
  const mk         = a.monthly_mortgage / a.purchase_price
  const annual_mtg = purchase_price * mk * 12
  const noi        = G - annual_exp
  const annual_cf  = noi - annual_mtg
  const reserves   = (annual_exp / 12) * a.reserve_months
  const cac        = purchase_price * (a.down_pct + a.closing_pct) + reserves
  return {
    roi:      cac > 0 ? annual_cf / cac * 100 : 0,
    cap_rate: purchase_price > 0 ? noi / purchase_price : 0,
    cf:       annual_cf / 12,
  }
}

// Minimum price to hit all failing metrics, given a fixed gross income G_mid
function minPriceAt(G_mid, a, failing) {
  const m     = a.mgmt_rate
  const R     = a.reserve_months
  const d     = a.down_pct
  const c     = a.closing_pct
  const ir    = a.insurance_rate + a.tax_rate
  const mk    = a.monthly_mortgage / a.purchase_price
  const roi_d = T_ROI / 100
  const E     = ir + mk * 12
  const L     = d + c + R * ir / 12

  const candidates = []
  if (failing.includes('roi')) {
    const denom = roi_d * L + E
    if (denom > 0) candidates.push(G_mid * ((1 - m) - roi_d * R * m / 12) / denom)
  }
  if (failing.includes('cap')) {
    candidates.push(G_mid * (1 - m) / (T_CAP + ir))
  }
  if (failing.includes('cf')) {
    const rate = ir / 12 + mk
    if (rate > 0) candidates.push((G_mid * (1 - m) / 12 - T_CF) / rate)
  }

  const valid = candidates.filter(v => Number.isFinite(v) && v > 0)
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
  const mk  = a.monthly_mortgage / p
  const roi_d = T_ROI / 100
  const E   = ir + mk * 12
  const L   = d + c + R * ir / 12

  const failing = [
    a.roi < T_ROI && 'roi',
    a.cap_rate < T_CAP && 'cap',
    a.monthly_cash_flow < T_CF && 'cf',
  ].filter(Boolean)

  if (failing.length === 0) return null

  // Labels for display
  const labelMap = { roi: 'ROI', cap: 'Cap Rate', cf: 'Cash Flow' }
  const failingLabels = failing.map(k => labelMap[k])

  // Rent targets (price fixed at current)
  const rentCandidates = []
  if (failing.includes('roi')) {
    const denom = (1 - m) - roi_d * R * m / 12
    if (denom > 0) rentCandidates.push(p * (E + roi_d * L) / denom / 12)
  }
  if (failing.includes('cap')) {
    rentCandidates.push(p * (T_CAP + ir) / (1 - m) / 12)
  }
  if (failing.includes('cf')) {
    rentCandidates.push((T_CF + p * (ir / 12 + mk)) / (1 - m))
  }

  const validRents = rentCandidates.filter(v => Number.isFinite(v) && v > 0)
  const current_rent = G / 12

  if (!validRents.length) return null

  const rawTargetRent = Math.max(...validRents)
  if (rawTargetRent <= current_rent) return null

  // Price target (rent fixed at current)
  const rawTargetPurchase = minPriceAt(G, a, failing)
  const canFixByPrice = rawTargetPurchase != null && rawTargetPurchase > 0 && rawTargetPurchase < p

  // ── Rent-only scenario ────────────────────────────────────────────────────
  const tRent = Math.ceil(rawTargetRent / 25) * 25
  const rentOption = {
    monthly_rent: tRent,
    rent_delta:   tRent - current_rent,
    metrics:      quickMetrics(tRent, p, a),
  }

  // ── Price-only scenario ───────────────────────────────────────────────────
  const priceOption = canFixByPrice ? (() => {
    const tPurchase = Math.floor(rawTargetPurchase / 5000) * 5000
    return {
      purchase_price: tPurchase,
      asking_price:   Math.round(tPurchase / ppp / 5000) * 5000,
      price_delta:    p / ppp - Math.round(tPurchase / ppp / 5000) * 5000,
      metrics:        quickMetrics(current_rent, tPurchase, a),
    }
  })() : null

  // ── Balanced scenario — half the rent delta, solve for price ─────────────
  const balancedOption = canFixByPrice ? (() => {
    const r_mid   = current_rent + 0.5 * (rawTargetRent - current_rent)
    const G_mid   = r_mid * 12
    const rawP    = minPriceAt(G_mid, a, failing)
    if (!rawP || rawP <= 0 || rawP >= p) return null

    const tRentMid    = Math.ceil(r_mid / 25) * 25
    const tPurchaseMid = Math.floor(rawP / 5000) * 5000
    return {
      monthly_rent:   tRentMid,
      rent_delta:     tRentMid - current_rent,
      purchase_price: tPurchaseMid,
      asking_price:   Math.round(tPurchaseMid / ppp / 5000) * 5000,
      price_delta:    p / ppp - Math.round(tPurchaseMid / ppp / 5000) * 5000,
      metrics:        quickMetrics(tRentMid, tPurchaseMid, a),
    }
  })() : null

  return {
    failingLabels,
    rentOption,
    priceOption,
    balancedOption,
    current_asking: p / ppp,
  }
}

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
    <div className="space-y-1.5 border-t border-gray-200 pt-2.5 mt-2">
      <MetricRow label="ROI"       value={m.roi}      target={T_ROI} format={v => `${v.toFixed(1)}%`} />
      <MetricRow label="Cap Rate"  value={m.cap_rate} target={T_CAP} format={v => `${(v*100).toFixed(2)}%`} />
      <MetricRow label="Cash Flow" value={m.cf}       target={T_CF}  format={v => `${$(v)}/mo`} />
    </div>
  )
}

function RentCard({ opt }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wide">Lean on rent</p>
      <p className="text-2xl font-bold text-gray-900">{$(opt.monthly_rent)}<span className="text-base font-normal">/mo</span></p>
      <p className="text-xs text-gray-400">+{$(opt.rent_delta)}/mo · price unchanged</p>
      <Metrics m={opt.metrics} />
    </div>
  )
}

function PriceCard({ opt, current_asking }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wide">Lean on price</p>
      <p className="text-2xl font-bold text-gray-900">{$(opt.asking_price)}</p>
      <p className="text-xs text-gray-400">−{$(opt.price_delta)} off asking · rent unchanged</p>
      <Metrics m={opt.metrics} />
    </div>
  )
}

function BalancedCard({ opt }) {
  return (
    <div className="rounded-lg border-2 border-brand-300 bg-brand-50/40 p-4 space-y-1">
      <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">Balanced</p>
      <p className="text-xl font-bold text-gray-900">{$(opt.monthly_rent)}<span className="text-sm font-normal">/mo</span></p>
      <p className="text-xs text-gray-500 font-medium">+ asking price {$(opt.asking_price)}</p>
      <p className="text-xs text-gray-400">+{$(opt.rent_delta)}/mo · −{$(opt.price_delta)} off asking</p>
      <Metrics m={opt.metrics} />
    </div>
  )
}

export default function AnalysisSuggestions({ analysis: a }) {
  const result = solve(a)
  if (!result) return null

  const { failingLabels, rentOption, priceOption, balancedOption, current_asking } = result
  const hasBalanced = !!balancedOption
  const cols = hasBalanced ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="card">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
        Path to Your Targets
      </p>
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-medium text-gray-700">{failingLabels.join(', ')}</span>{' '}
        {failingLabels.length === 1 ? 'is' : 'are'} below target.
        Each option below independently gets you there.
      </p>
      <div className={`grid ${cols} gap-3`}>
        <RentCard  opt={rentOption} />
        {hasBalanced && <BalancedCard opt={balancedOption} />}
        {priceOption && <PriceCard opt={priceOption} current_asking={current_asking} />}
      </div>
    </div>
  )
}
