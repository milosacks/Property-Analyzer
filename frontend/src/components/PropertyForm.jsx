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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="col-span-full border-b border-gray-200 pb-2 mt-2">
      <h3 className="text-sm font-semibold text-brand-700 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function AsmpField({ label, field, suffix, form, onChange, step = 'any', min }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          min={min}
          className="input w-20 text-right tabular-nums"
          value={form[field] ?? ''}
          onChange={(e) => onChange(field, e.target.value)}
        />
        <span className="text-xs text-gray-400 shrink-0">{suffix}</span>
      </div>
    </div>
  )
}

export default function PropertyForm({
  form, onChange, onSubmit, onCancel,
  loading = false, submitLabel = 'Analyze Property', error,
}) {
  return (
    <form onSubmit={onSubmit} className="card space-y-0">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <SectionHeader title="Property Information" />

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
            <Input form={form} field="zip_code" placeholder="27701" onChange={onChange} />
          </Field>
        </div>
        <Field label="Neighborhood">
          <Input form={form} field="neighborhood" placeholder="Lakewood Park" onChange={onChange} />
        </Field>
        <Field label="Broker" hint="optional">
          <Input form={form} field="broker" placeholder="Blue Chariot" onChange={onChange} />
        </Field>
        <Field label="Asking Price ($)">
          <Input form={form} field="asking_price" type="number" required min={0} placeholder="349900" onChange={onChange} />
        </Field>
        <Field label="Property Type">
          <Select form={form} field="property_type" onChange={onChange} options={[
            ['duplex',            'Duplex (2 units)'],
            ['fourplex',          'Fourplex (4 units)'],
            ['small_multifamily', 'Small Multifamily (5–10)'],
            ['single_family',     'Single Family'],
            ['other',             'Other'],
          ]} />
        </Field>
        <Field label="Units" hint="count">
          <Input form={form} field="num_units" type="number" min={1} required onChange={onChange} />
        </Field>
        <Field label="Beds / unit">
          <Select form={form} field="beds_per_unit" onChange={onChange} options={[
            ['studio', 'Studio'],
            ['1', '1 Bedroom'],
            ['2', '2 Bedrooms'],
            ['3', '3 Bedrooms'],
            ['4', '4 Bedrooms'],
            ['5', '5+ Bedrooms'],
          ]} />
        </Field>
        <Field label="Baths / unit">
          <Select form={form} field="baths_per_unit" onChange={onChange} options={[
            ['1',   '1 Bath'],
            ['1.5', '1.5 Baths'],
            ['2',   '2 Baths'],
            ['2.5', '2.5 Baths'],
            ['3',   '3 Baths'],
          ]} />
        </Field>
        <Field label="Square Feet" hint="optional">
          <Input form={form} field="sqft" type="number" min={0} placeholder="3360" onChange={onChange} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Zillow URL" hint="optional">
            <Input form={form} field="zillow_url" type="url" placeholder="https://www.zillow.com/homes/…" onChange={onChange} />
          </Field>
        </div>

        <SectionHeader title="Financials" />

        <Field label="Monthly Rent ($)" hint="total across all units">
          <Input form={form} field="monthly_rent" type="number" required min={0} placeholder="6800" onChange={onChange} />
        </Field>
        {form.monthly_rent && Number(form.num_units) > 0 && (
          <div className="flex items-center text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            ${(Number(form.monthly_rent) / Number(form.num_units)).toFixed(0)}/unit/month
          </div>
        )}

        <SectionHeader title="Assumptions" subtitle="Defaults based on Durham, NC B-class multifamily market data — adjust to model different scenarios" />

        <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <AsmpField label="Purchase Price"    field="purchase_price_pct" suffix="% of asking"          form={form} onChange={onChange} min={50} />
          <AsmpField label="Down Payment"      field="down_pct"           suffix="%"                     form={form} onChange={onChange} min={0} />
          <AsmpField label="Interest Rate"     field="interest_rate"      suffix="%"                     form={form} onChange={onChange} min={0} step={0.125} />
          <AsmpField label="Loan Term"         field="loan_term_years"    suffix="years"                 form={form} onChange={onChange} min={1} step={1} />
          <AsmpField label="Closing Costs"     field="closing_pct"        suffix="% of purchase price"   form={form} onChange={onChange} min={0} />
          <AsmpField label="Reserves"          field="reserve_months"     suffix="months of op. costs"   form={form} onChange={onChange} min={0} step={1} />
          <AsmpField label="Insurance Rate"    field="insurance_rate"     suffix="% of purchase price"   form={form} onChange={onChange} min={0} step={0.1} />
          <AsmpField label="Property Tax Rate" field="tax_rate"           suffix="% of purchase price"   form={form} onChange={onChange} min={0} step={0.1} />
          <AsmpField label="Mgmt Fee"          field="mgmt_rate"          suffix="% of rent"             form={form} onChange={onChange} min={0} />
        </div>

        <SectionHeader title="Status & Notes" />

        <Field label="Status">
          <Select form={form} field="status" onChange={onChange} options={[
            ['analyzing',   'Analyzing'],
            ['watching',    'Watching'],
            ['researching', 'Researching'],
            ['passed',      'Passed'],
            ['rejected',    'Rejected'],
          ]} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-2">
          <Field label="Notes" hint="optional">
            <textarea
              className="input"
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Renovation scope, tenant situation, market observations…"
            />
          </Field>
        </div>

      </div>

      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Analyzing…' : `⚡ ${submitLabel}`}
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
