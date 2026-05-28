const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Underwriting analysis (no DB — pure calculation)
  analyze: (data) =>
    request('/analyze/', { method: 'POST', body: JSON.stringify(data) }),

  // AI investment memo
  generateMemo: (propertyData, analysis) =>
    request('/ai-memo/', {
      method: 'POST',
      body: JSON.stringify({ property_data: propertyData, analysis }),
    }),

  // Saved properties (DB)
  listProperties: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
    return request(`/properties/${qs.toString() ? `?${qs}` : ''}`)
  },
  getProperty:    (id)       => request(`/properties/${id}`),
  createProperty: (data)     => request('/properties/', { method: 'POST', body: JSON.stringify(data) }),
  updateProperty: (id, data) => request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProperty: (id)       => request(`/properties/${id}`, { method: 'DELETE' }),

  // Transactions
  listTransactions:  (pid)       => request(`/properties/${pid}/transactions`),
  createTransaction: (pid, data) =>
    request(`/properties/${pid}/transactions`, { method: 'POST', body: JSON.stringify(data) }),
}
