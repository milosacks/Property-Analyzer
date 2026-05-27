import { useState } from 'react'

const STATUSES = ['watching', 'active', 'under_contract', 'closed', 'rejected']
const TYPES = ['single_family', 'multi_family', 'condo', 'commercial', 'land']

const empty = {
  address: '', city: '', state: '', zip_code: '', property_type: 'single_family',
  price: '', bedrooms: '', bathrooms: '', sqft: '', status: 'watching', notes: '',
  monthly_rent: '', monthly_expenses: '', mortgage_payment: '',
  down_payment: '', interest_rate: '', loan_term_years: '',
}

function toNum(v) { return v === '' ? null : Number(v) }

export default function PropertyForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...empty, ...initial })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      price: toNum(form.price),
      bedrooms: toNum(form.bedrooms),
      bathrooms: toNum(form.bathrooms),
      sqft: toNum(form.sqft),
      monthly_rent: toNum(form.monthly_rent),
      monthly_expenses: toNum(form.monthly_expenses),
      mortgage_payment: toNum(form.mortgage_payment),
      down_payment: toNum(form.down_payment),
      interest_rate: toNum(form.interest_rate),
      loan_term_years: toNum(form.loan_term_years),
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Property Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input className="input" required value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" required value={form.city} onChange={set('city')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">State</label>
              <input className="input" required maxLength={2} value={form.state} onChange={set('state')} />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input" required value={form.zip_code} onChange={set('zip_code')} />
            </div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.property_type} onChange={set('property_type')}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">List / Purchase Price ($)</label>
            <input className="input" type="number" required min={0} value={form.price} onChange={set('price')} />
          </div>
          <div>
            <label className="label">Sq Ft</label>
            <input className="input" type="number" min={0} value={form.sqft} onChange={set('sqft')} />
          </div>
          <div>
            <label className="label">Bedrooms</label>
            <input className="input" type="number" min={0} value={form.bedrooms} onChange={set('bedrooms')} />
          </div>
          <div>
            <label className="label">Bathrooms</label>
            <input className="input" type="number" min={0} step={0.5} value={form.bathrooms} onChange={set('bathrooms')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Financials</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Monthly Rent ($)</label>
            <input className="input" type="number" min={0} value={form.monthly_rent} onChange={set('monthly_rent')} />
          </div>
          <div>
            <label className="label">Monthly Expenses ($)</label>
            <input className="input" type="number" min={0} value={form.monthly_expenses} onChange={set('monthly_expenses')} />
          </div>
          <div>
            <label className="label">Mortgage Payment ($/mo)</label>
            <input className="input" type="number" min={0} value={form.mortgage_payment} onChange={set('mortgage_payment')} />
          </div>
          <div>
            <label className="label">Down Payment ($)</label>
            <input className="input" type="number" min={0} value={form.down_payment} onChange={set('down_payment')} />
          </div>
          <div>
            <label className="label">Interest Rate (%)</label>
            <input className="input" type="number" min={0} step={0.01} value={form.interest_rate} onChange={set('interest_rate')} />
          </div>
          <div>
            <label className="label">Loan Term (years)</label>
            <input className="input" type="number" min={0} value={form.loan_term_years} onChange={set('loan_term_years')} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save Property'}
        </button>
      </div>
    </form>
  )
}
