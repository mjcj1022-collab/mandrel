import { describe, it, expect } from 'vitest'
import { apiConfigured, apiBase, apiHealth } from '../lib/api'

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
