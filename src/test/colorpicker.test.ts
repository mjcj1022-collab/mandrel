import { describe, it, expect } from 'vitest'
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, hexToHsv, hsvToHex, clamp } from '../ui/ColorPicker'

describe('color conversions', () => {
  it('parses hex to rgb, tolerating shorthand and missing hash', () => {
    expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 })
    expect(hexToRgb('f80')).toEqual({ r: 255, g: 136, b: 0 })
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('falls back to black on malformed hex', () => {
    expect(hexToRgb('#zzz')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('nope')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('serialises rgb to a padded 6-digit hex', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
    expect(rgbToHex({ r: 255, g: 136, b: 0 })).toBe('#ff8800')
    // clamps and rounds out-of-range channels
    expect(rgbToHex({ r: 300, g: -5, b: 127.6 })).toBe('#ff0080')
  })

  it('round-trips hex → hsv → hex for saturated colours', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#d8b36a', '#1e4fa8', '#b01430']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex)
    }
  })

  it('round-trips rgb → hsv → rgb', () => {
    const rgb = { r: 216, g: 179, b: 106 }
    const back = hsvToRgb(rgbToHsv(rgb))
    expect(Math.round(back.r)).toBe(216)
    expect(Math.round(back.g)).toBe(179)
    expect(Math.round(back.b)).toBe(106)
  })

  it('reports greyscale with zero saturation and pure white at full value', () => {
    expect(rgbToHsv({ r: 128, g: 128, b: 128 }).s).toBe(0)
    const white = rgbToHsv({ r: 255, g: 255, b: 255 })
    expect(white.s).toBe(0)
    expect(white.v).toBe(1)
  })

  it('keeps hue within 0..360 across all sextants', () => {
    for (const hex of ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff']) {
      const { h } = hexToHsv(hex)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(360)
    }
  })

  it('clamps to the given range', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-2, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
})
