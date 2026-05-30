// ── Shared form used by Analyzer (new) and PropertyDetail (edit mode) ─────────

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {hint && <span className="text-gray-400 font-normal"> — {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ form, field, type = 'text', onChange, ...rest }) {
  return (
    <input
      className="input"
      type={type}
      value={form[field] ?? ''}
      onChange={(e) => onChange(field, e.target.value)}
      {...rest}
    />
  )
}

function Select({ form, field, options, onChange }) {
  return (
    <select className="input" value={form[field]} onChange={(e) => onChange(field, e.target.value)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function RiskSelect({ form, field, onChange }) {
  return (
    <select className="input" value={form[field]} onChange={(e) => onChange(field, e.target.value)}>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="col-span-full border-b border-gray-200 pb-2 mt-2">
      <h3 className="text-sm font-semibold text-brand-700 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
// form        — current form state object (percentage fields stored as %, e.g. 6.5)
// onChange    — fn(field, value) called on every change
// onSubmit    — form submit handler (e) => void
// onCancel    — optional; renders a Cancel button when provided
// loading     — disables submit while request is in flight
// submitLabel — button text (default "Analyze Property")
// error       — inline error string shown next to buttons
export default function PropertyForm({
  form, onChange, onSubmit, onCancel,
  loading = false, submitLabel = 'Analyze Property', error,
}) {
  return (
    <form onSubmit={onSubmit} className="card space-y-0">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <SectionHeader title="Property Information" subtitle="Basic identification and classification" />

        <div className="sm:col-span-2">
          <Field label="Address">
            <Input form={form} field="address" required placeholder="1919 Morehead Ave" onChange={onChange} />
          </Field>
        </div>
        <Field label="City">
          <Input form={form} field="city" required placeholder="Durham" onChange={onChange} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="State">
            <Input form={form} field="state" maxLength={2} onChange={onChange} />
          </Field>
          <Field label="ZIP">
            <Input form={form} field="zip_code" required placeholder="27701" onChange={onChange} />
          </Field>
        </div>
        <Field label="Property Type">
          <Select form={form} field="property_type" onChange={onChange} options={[
            ['duplex',            'Duplex (2 units)'],
            ['fourplex',          'Fourplex (4 units)'],
            ['small_multifamily', 'Small Multifamily (5–10)'],
            ['single_family',     'Single Family'],
            ['other',             'Other'],
          ]} />
        </Field>
        <Field label="Number of Units">
          <Input form={form} field="num_units" type="number" min={1} required onChange={onChange} />
        </Field>
        <Field label="Vintage Year" hint="prefer 1980s–2000s">
          <Input form={form} field="vintage_year" type="number" placeholder="1995" min={1900} max={2024} onChange={onChange} />
        </Field>
        <Field label="Asset Class">
          <Select form={form} field="asset_class" onChange={onChange}
            options={[['A','A-Class'],['B','B-Class (target)'],['C','C-Class']]} />
        </Field>
        <Field label="Status">
          <Select form={form} field="status" onChange={onChange} options={[
            ['analyzing','Analyzing'],['watching','Watching'],
            ['passed','Passed'],['researching','Researching'],['rejected','Rejected'],
          ]} />
        </Field>

        <SectionHeader title="Purchase & Financing" subtitle="Percentages entered as numbers (e.g. 6.5, not 0.065)" />

        <Field label="Purchase Price ($)" hint="target $200k–$300k/unit">
          <Input form={form} field="purchase_price" type="number" required min={0} placeholder="300000" onChange={onChange} />
        </Field>
        <Field label="Loan-to-Value (%)" hint="e.g. 75 = 75% down">
          <Input form={form} field="loan_to_value" type="number" min={0} max={97} step={0.5} placeholder="75" onChange={onChange} />
        </Field>
        <Field label="Interest Rate (%)" hint="6.5% base / 7.5% stress">
          <Input form={form} field="interest_rate" type="number" min={0} max={20} step={0.1} placeholder="6.5" onChange={onChange} />
        </Field>
        <Field label="Loan Term (years)">
          <Input form={form} field="loan_term_years" type="number" min={1} max={40} onChange={onChange} />
        </Field>
        <Field label="Renovation Budget ($)" hint="ideally ≤ 10–15% of price">
          <Input form={form} field="renovation_cost" type="number" min={0} placeholder="20000" onChange={onChange} />
        </Field>
        <Field label="Closing Costs ($)">
          <Input form={form} field="closing_costs" type="number" min={0} placeholder="6000" onChange={onChange} />
        </Field>

        <SectionHeader title="Income" subtitle="Enter total rent across all units" />

        <Field label="Total Monthly Rent ($)">
          <Input form={form} field="monthly_rent" type="number" required min={0} placeholder="2800" onChange={onChange} />
        </Field>
        <Field label="Vacancy Rate (%)" hint="5% base / 10% stress">
          <Input form={form} field="vacancy_rate" type="number" min={0} max={100} step={0.5} placeholder="5" onChange={onChange} />
        </Field>
        {form.monthly_rent && Number(form.num_units) > 0 && (
          <div className="flex items-center text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            ${(Number(form.monthly_rent) / Number(form.num_units)).toFixed(0)}/unit/month
          </div>
        )}

        <SectionHeader title="Annual Operating Expenses" subtitle="Enter actual or estimated annual amounts" />

        <Field label="Property Taxes ($)">
          <Input form={form} field="annual_taxes" type="number" min={0} placeholder="3500" onChange={onChange} />
        </Field>
        <Field label="Insurance ($)">
          <Input form={form} field="annual_insurance" type="number" min={0} placeholder="2000" onChange={onChange} />
        </Field>
        <Field label="Repairs & Maintenance ($)">
          <Input form={form} field="annual_repairs" type="number" min={0} placeholder="3000" onChange={onChange} />
        </Field>
        <Field label="Property Management ($)" hint="typically 8–10% of rent">
          <Input form={form} field="annual_property_management" type="number" min={0} placeholder="2688" onChange={onChange} />
        </Field>
        <Field label="CapEx Reserve ($)" hint="roof, HVAC, appliances">
          <Input form={form} field="annual_capex_reserve" type="number" min={0} placeholder="2400" onChange={onChange} />
        </Field>

        <SectionHeader title="Data Quality & Risk Assessment" subtitle="Your confidence in the assumptions — affects the risk score" />

        <Field label="Rent Confidence" hint="how well-verified are rent comps?">
          <RiskSelect form={form} field="rent_confidence" onChange={onChange} />
        </Field>
        <Field label="Expense Confidence" hint="how accurate are cost estimates?">
          <RiskSelect form={form} field="expense_confidence" onChange={onChange} />
        </Field>
        <Field label="Location / Market Risk" hint="supply pipeline, submarket strength">
          <RiskSelect form={form} field="location_risk" onChange={onChange} />
        </Field>
        <Field label="Property Condition Risk" hint="age, deferred maintenance, inspection">
          <RiskSelect form={form} field="property_condition_risk" onChange={onChange} />
        </Field>

        <SectionHeader title="Strategy & Notes" />

        <Field label="Hold Period (years)">
          <Input form={form} field="hold_period_years" type="number" min={1} max={30} onChange={onChange} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Notes" hint="renovation scope, tenant situation, market observations">
            <textarea
              className="input"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="e.g. Turn-key fourplex, current tenants in place, light cosmetic renovation needed..."
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : `⚡ ${submitLabel}`}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
        {error && <p className="text-red-500 text-sm self-center">{error}</p>}
      </div>
    </form>
  )
}
