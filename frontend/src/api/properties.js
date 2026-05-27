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
  // Properties
  listProperties: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
    return request(`/properties/${qs.toString() ? `?${qs}` : ''}`)
  },
  getProperty: (id) => request(`/properties/${id}`),
  createProperty: (data) => request('/properties/', { method: 'POST', body: JSON.stringify(data) }),
  updateProperty: (id, data) => request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProperty: (id) => request(`/properties/${id}`, { method: 'DELETE' }),

  // Transactions
  listTransactions: (propertyId) => request(`/properties/${propertyId}/transactions`),
  createTransaction: (propertyId, data) =>
    request(`/properties/${propertyId}/transactions`, { method: 'POST', body: JSON.stringify(data) }),

  // Analysis
  analyzeProperty: (id) => request(`/analysis/${id}`),
  compareProperties: (ids) => request(`/analysis/compare/?ids=${ids.join(',')}`),
}
