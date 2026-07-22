/**
 * Optional backend client. Set VITE_API_URL at build time to point the app at a
 * running Blue Flame server (see server/README.md). When unset, the app runs
 * fully standalone on localStorage — nothing here is called.
 */
const BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL

export const apiConfigured = (): boolean => !!BASE
export const apiBase = (): string | undefined => BASE

/** Ping the backend's health endpoint. Never throws — returns false if the API
 *  is unset, unreachable, or unhealthy. Used by the connection indicator. */
export async function apiHealth(signal?: AbortSignal): Promise<boolean> {
  if (!BASE) return false
  try {
    const res = await fetch(BASE + '/api/health', { signal })
    if (!res.ok) return false
    const body = await res.json().catch(() => null) as { ok?: boolean } | null
    return body?.ok === true
  } catch { return false }
}

let token: string | null = null
export const setToken = (t: string | null): void => { token = t }

/** Statuses worth retrying — a gateway/timeout usually means the host is still
 *  coming up, not that the request was wrong. 4xx (e.g. bad password) is final. */
const TRANSIENT = new Set([408, 429, 502, 503, 504])
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * fetch with a few retries for transient failures. A free host sleeps when idle
 * and takes ~30 s to cold-start, so the first request after a nap can fail or
 * 503 — without this, that surfaces as a bogus "login failed". Network errors
 * and TRANSIENT statuses are retried with a linear backoff; everything else
 * returns immediately so real errors stay fast.
 */
export async function fetchWithRetry(
  url: string, opts: RequestInit = {}, attempts = 3, baseDelay = 700,
): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    const last = i === attempts - 1
    try {
      const res = await fetch(url, opts)
      if (last || !TRANSIENT.has(res.status)) return res
    } catch (err) {
      lastErr = err
      if (last) throw err
    }
    await sleep(baseDelay * (i + 1))
  }
  throw lastErr ?? new Error('request failed')
}

async function req(path: string, opts: RequestInit = {}): Promise<unknown> {
  if (!BASE) throw new Error('Backend not configured — set VITE_API_URL')
  const res = await fetchWithRetry(BASE + path, {
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
