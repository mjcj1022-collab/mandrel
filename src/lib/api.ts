/**
 * Optional backend client. Set VITE_API_URL at build time to point the app at a
 * running Blue Flame server (see server/README.md). When unset, the app runs
 * fully standalone on localStorage — nothing here is called.
 */
const BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL

export const apiConfigured = (): boolean => !!BASE

let token: string | null = null
export const setToken = (t: string | null): void => { token = t }

async function req(path: string, opts: RequestInit = {}): Promise<unknown> {
  if (!BASE) throw new Error('Backend not configured — set VITE_API_URL')
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {})
    }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error || res.statusText)
  }
  return res.json()
}

export const api = {
  login: (email: string, password: string) => req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (shop: string, email: string, password: string) => req('/api/auth/register', { method: 'POST', body: JSON.stringify({ shop, email, password }) }),
  me: () => req('/api/me'),
  listDesigns: () => req('/api/designs'),
  saveDesign: (name: string, spec: unknown) => req('/api/designs', { method: 'POST', body: JSON.stringify({ name, spec }) }),
  loadDesign: (id: string) => req(`/api/designs/${id}`),
  deleteDesign: (id: string) => req(`/api/designs/${id}`, { method: 'DELETE' }),
  createOrder: (design_id: string) => req('/api/orders', { method: 'POST', body: JSON.stringify({ design_id }) }),
  advanceOrder: (id: string, stage: string) => req(`/api/orders/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  checkout: (amount_cents: number, order_id: string, design_id?: string) => req('/api/checkout', { method: 'POST', body: JSON.stringify({ amount_cents, order_id, design_id }) }) as Promise<{ clientSecret: string; order_id: string | null }>
}
