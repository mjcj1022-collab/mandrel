import { describe, it, expect } from 'vitest'
import { encodeSpec, decodeSpec } from '../lib/share'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'

describe('share links', () => {
  it('round-trips a spec through encode/decode', () => {
    const spec: DesignSpec = { ...DEFAULT_SPEC, category: 'pendant', engraving: { text: 'Amor ∞', placement: 'inside', font: 'Script' } }
    const token = encodeSpec(spec)
    expect(token).not.toContain('+')
    expect(token).not.toContain('/')
    expect(decodeSpec(token)).toEqual(spec)
  })
  it('rejects a malformed token', () => {
    expect(decodeSpec('not-a-real-token!!')).toBeNull()
    expect(decodeSpec('')).toBeNull()
  })
})
