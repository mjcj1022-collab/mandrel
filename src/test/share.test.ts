import { describe, it, expect } from 'vitest'
import { encodeSpec, decodeSpec, reviewUrl } from '../lib/share'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'

describe('share links', () => {
  it('round-trips a spec through encode/decode', () => {
    const spec: DesignSpec = { ...DEFAULT_SPEC, category: 'pendant', engraving: { text: 'Amor ∞', placement: 'inside', font: 'Script', position: 0.5 } }
    const token = encodeSpec(spec)
    expect(token).not.toContain('+')
    expect(token).not.toContain('/')
    expect(decodeSpec(token)).toEqual(spec)
  })
  it('rejects a malformed token', () => {
    expect(decodeSpec('not-a-real-token!!')).toBeNull()
    expect(decodeSpec('')).toBeNull()
  })
  it('builds a review link carrying the spec and the shop name', () => {
    const url = reviewUrl(DEFAULT_SPEC, 'Aurora & Co')
    const params = new URLSearchParams(url.split('?')[1])
    expect(decodeSpec(params.get('review')!)).toEqual(DEFAULT_SPEC)
    expect(params.get('shop')).toBe('Aurora & Co')
  })
})
