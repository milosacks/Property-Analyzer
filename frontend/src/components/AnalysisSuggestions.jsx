const $ = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// Targets match the grade thresholds in AnalysisOutput
const T_ROI = 10      // % (a.roi units)
const T_CAP = 0.065   // decimal (a.cap_rate units)
const T_CF  = 200     // $/mo (a.monthly_cash_flow units)

// Recompute key metrics for a hypothetical (monthly_rent, purchase_price)
// using the same assumptions as the original analysis.
function quickMetrics(monthly_rent, purchase_price, a) {
  const G              = monthly_rent * 12
  const annual_exp     = purchase_price * a.insurance_rate
                       + purchase_price * a.tax_rate
                       + G * a.mgmt_rate
  // mortgage scales linearly with purchase_price (same rates / term)
  const mk             = a.monthly_mortgage / a.purchase_price
  const annual_mtg     = purchase_price * mk * 12
  const noi            = G - annual_exp
  const annual_cf      = noi - annual_mtg
  const reserves       = (annual_exp / 12) * a.reserve_months
  const cac            = purchase_price * (a.down_pct + a.closing_pct) + reserves
  return {
    roi:      cac > 0 ? annual_cf / cac * 100 : 0,
    cap_rate: purchase_price > 0 ? noi / purchase_price : 0,
    cf:       annual_cf / 12,
  }
}

// For each failing metric, compute the minimum rent (or maximum purchase price)
// that reaches the target. Returns { rentOption, priceOption } or null.
function solve(a) {
  const G   = a.gross_income
  const p   = a.purchase_price
  const m   = a.mgmt_rate
  const R   = a.reserve_months
  const d   = a.down_pct
  const c   = a.closing_pct
  const ppp = a.purchase_price_pct
  const ir  = a.insurance_rate + a.tax_rate   // combined annual expense rate (price-based)
  const mk  = a.monthly_mortgage / p          // monthly mortgage per $1 purchase price

  const failing = [
    a.roi < T_ROI && 'ROI',
    a.cap_rate < T_CAP && 'Cap Rate',
    a.monthly_cash_flow < T_CF && 'Cash Flow',
  ].filter(Boolean)

  if (failing.length === 0) return null

  // ── Solve for monthly rent (purchase price fixed) ─────────────────────────
  // Cap rate: G_new*(1-m)/p = target + ir  →  G_new = p*(target+ir)/(1-m)
  const rentForCap = () => p * (T_CAP + ir) / (1 - m) / 12

  // Cash flow: r_new*(1-m) = target_cf + p*(ir/12+mk)
  const rentForCF = () => (T_CF + p * (ir / 12 + mk)) / (1 - m)

  // ROI: roi_target (decimal) → solve for G_new
  const rentForROI = () => {
    const roi_d = T_ROI / 100
    const E     = ir + mk * 12
    const L     = d + c + R * ir / 12
    const denom = (1 - m) - roi_d * R * m / 12
    if (denom <= 0) return Infinity
    return p * (E + roi_d * L) / denom / 12
  }

  // ── Solve for purchase price (monthly rent fixed) ─────────────────────────
  // Cap rate: G*(1-m)/p_new = target + ir  →  p_new = G*(1-m)/(target+ir)
  const priceForCap = () => G * (1 - m) / (T_CAP + ir)

  // Cash flow: p_new*(ir/12+mk) = G*(1-m)/12 - target_cf
  const priceForCF = () => {
    const rate = ir / 12 + mk
    return rate > 0 ? (G * (1 - m) / 12 - T_CF) / rate : 0
  }

  // ROI: p_new*(roi_d*L+E) = G*((1-m) - roi_d*R*m/12)
  const priceForROI = () => {
    const roi_d = T_ROI / 100
    const E     = ir + mk * 12
    const L     = d + c + R * ir / 12
    const denom = roi_d * L + E
    return denom > 0 ? G * ((1 - m) - roi_d * R * m / 12) / denom : 0
  }

  // Collect the binding (most demanding) requirement for each lever
  const rentNeeds  = []
  const priceNeeds = []

  if (a.roi < T_ROI) {
    rentNeeds.push(rentForROI())
    priceNeeds.push(priceForROI())
  }
  if (a.cap_rate < T_CAP) {
    rentNeeds.push(rentForCap())
    priceNeeds.push(priceForCap())
  }
  if (a.monthly_cash_flow < T_CF) {
    rentNeeds.push(rentForCF())
    priceNeeds.push(priceForCF())
  }

  const validRents  = rentNeeds.filter(v => Number.isFinite(v) && v > 0)
  const validPrices = priceNeeds.filter(v => Number.isFinite(v) && v > 0)

  // Rent: take the maximum requirement (most binding), rounded up to $25
  const tRent = validRents.length
    ? Math.ceil(Math.max(...validRents) / 25) * 25
    : null

  // Price: take the minimum requirement (most binding), rounded down to $5k
  const tPurchase = validPrices.length
    ? Math.floor(Math.min(...validPrices) / 5000) * 5000
    : null

  const monthly_rent = G / 12

  const rentOption = tRent && tRent > monthly_rent
    ? { monthly_rent: tRent, delta: tRent - monthly_rent, metrics: quickMetrics(tRent, p, a) }
    : null

  const priceOption = tPurchase && tPurchase > 0 && tPurchase < p
    ? {
        purchase_price: tPurchase,
        asking_price:   Math.round(tPurchase / ppp / 5000) * 5000,
        delta:          (p / ppp) - (tPurchase / ppp),
        metrics:        quickMetrics(monthly_rent, tPurchase, a),
      }
    : null

  if (!rentOption && !priceOption) return null

  return { failing, rentOption, priceOption }
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

function ScenarioCard({ title, subtitle, delta, metrics }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{subtitle}</p>
        <p className="text-xs text-gray-400 mt-0.5">{delta}</p>
      </div>
      <div className="space-y-1.5 border-t border-gray-200 pt-2.5">
        <MetricRow
          label="ROI"
          value={metrics.roi}
          target={T_ROI}
          format={v => `${v.toFixed(1)}%`}
        />
        <MetricRow
          label="Cap Rate"
          value={metrics.cap_rate}
          target={T_CAP}
          format={v => `${(v * 100).toFixed(2)}%`}
        />
        <MetricRow
          label="Cash Flow"
          value={metrics.cf}
          target={T_CF}
          format={v => `${$(v)}/mo`}
        />
      </div>
    </div>
  )
}

export default function AnalysisSuggestions({ analysis: a }) {
  const result = solve(a)
  if (!result) return null

  const { failing, rentOption, priceOption } = result
  const current_asking = a.purchase_price / a.purchase_price_pct

  return (
    <div className="card">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
        Path to Your Targets
      </p>
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-medium text-gray-700">{failing.join(', ')}</span>{' '}
        {failing.length === 1 ? 'is' : 'are'} below target. Here's what it would take:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rentOption && (
          <ScenarioCard
            title="Raise monthly rent to"
            subtitle={`${$(rentOption.monthly_rent)}/mo`}
            delta={`+${$(rentOption.delta)}/mo above current`}
            metrics={rentOption.metrics}
          />
        )}
        {priceOption && (
          <ScenarioCard
            title="Negotiate asking price to"
            subtitle={$(priceOption.asking_price)}
            delta={`−${$(priceOption.delta)} off current list price of ${$(current_asking)}`}
            metrics={priceOption.metrics}
          />
        )}
      </div>
      {rentOption && priceOption && (
        <p className="text-xs text-gray-400 mt-3">
          Any blend works too — a partial rent increase paired with a partial price reduction will also hit the targets.
        </p>
      )}
    </div>
  )
}
