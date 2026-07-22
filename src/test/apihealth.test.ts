import { describe, it, expect, afterEach } from 'vitest'
import { apiConfigured, apiBase, apiHealth, fetchWithRetry } from '../lib/api'

/**
 * The backend indicator must never break the app. With no VITE_API_URL (the
 * default for the standalone build) the client reports "not configured" and
 * the health ping resolves false instead of throwing.
 */
describe('backend health probe (standalone build)', () => {
  it('reports no backend configured when VITE_API_URL is unset', () => {
    expect(apiBase()).toBeUndefined()
    expect(apiConfigured()).toBe(false)
  })

  it('apiHealth resolves false instead of throwing', async () => {
    await expect(apiHealth()).resolves.toBe(false)
  })

  it('is safe to call repeatedly (indicator polls on a timer)', async () => {
    const results = await Promise.all([apiHealth(), apiHealth(), apiHealth()])
    expect(results).toEqual([false, false, false])
  })
})

/**
 * A free host sleeps when idle and cold-starts in ~30 s, so the first request
 * after a nap can 503 or fail outright. Those must be retried, while genuine
 * errors (bad password) must fail immediately.
 */
describe('fetchWithRetry (cold-start resilience)', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  const stub = (fn: () => Promise<Response>) => {
    let calls = 0
    globalThis.fetch = (async () => { calls++; return fn() }) as typeof fetch
    return () => calls
  }

  it('retries a transient 503 and returns the eventual success', async () => {
    let n = 0
    const calls = stub(async () => { n++; return new Response('{}', { status: n < 3 ? 503 : 200 }) })
    const res = await fetchWithRetry('http://x', {}, 3, 0)
    expect(res.status).toBe(200)
    expect(calls()).toBe(3)
  })

  it('retries a dropped connection (network error) then succeeds', async () => {
    let n = 0
    const calls = stub(async () => { n++; if (n < 2) throw new TypeError('fetch failed'); return new Response('{}', { status: 200 }) })
    const res = await fetchWithRetry('http://x', {}, 3, 0)
    expect(res.status).toBe(200)
    expect(calls()).toBe(2)
  })

  it('does NOT retry a real error like 401 — fails fast', async () => {
    const calls = stub(async () => new Response('{}', { status: 401 }))
    const res = await fetchWithRetry('http://x', {}, 3, 0)
    expect(res.status).toBe(401)
    expect(calls()).toBe(1)
  })

  it('gives up after the attempt budget and surfaces the last response', async () => {
    const calls = stub(async () => new Response('{}', { status: 503 }))
    const res = await fetchWithRetry('http://x', {}, 3, 0)
    expect(res.status).toBe(503)
    expect(calls()).toBe(3)
  })

  it('propagates the network error when every attempt fails', async () => {
    stub(async () => { throw new TypeError('fetch failed') })
    await expect(fetchWithRetry('http://x', {}, 2, 0)).rejects.toThrow('fetch failed')
  })
})
