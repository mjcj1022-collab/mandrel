import { describe, it, expect } from 'vitest'
import { TOUR_STEPS } from '../ui/Tour'

describe('onboarding tour', () => {
  it('has several well-formed steps', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(4)
    for (const s of TOUR_STEPS) {
      expect(s.title.trim().length).toBeGreaterThan(0)
      expect(s.body.trim().length).toBeGreaterThan(20)
    }
  })

  it('covers the core surfaces by name', () => {
    const all = TOUR_STEPS.map(s => `${s.title} ${s.body}`).join(' ').toLowerCase()
    for (const kw of ['design', 'sculpt', 'free draw', 'vert', 'undo']) {
      expect(all, kw).toContain(kw)
    }
  })
})
