import { useRef, useCallback, useEffect } from 'react'

/**
 * A Photoshop-style HSV colour picker: a saturation/value square, a vertical
 * hue rail, live hex + RGB fields and a strip of preset swatches. Fully
 * controlled — it owns no colour state, only reports the chosen hex upward so
 * the Color studio can drive whatever surface is selected (metal / stone / bg).
 */

export interface RGB { r: number; g: number; b: number }
export interface HSV { h: number; s: number; v: number }

export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return { r: 0, g: 0, b: 0 }
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
  return '#' + to(r) + to(g) + to(b)
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let rp = 0, gp = 0, bp = 0
  if (h < 60) [rp, gp, bp] = [c, x, 0]
  else if (h < 120) [rp, gp, bp] = [x, c, 0]
  else if (h < 180) [rp, gp, bp] = [0, c, x]
  else if (h < 240) [rp, gp, bp] = [0, x, c]
  else if (h < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 }
}

export function hexToHsv(hex: string): HSV { return rgbToHsv(hexToRgb(hex)) }
export function hsvToHex(hsv: HSV): string { return rgbToHex(hsvToRgb(hsv)) }

/** Track a pointer drag across an element, reporting normalised 0..1 coords. */
function useDrag(onMove: (x: number, y: number) => void) {
  const elRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(false)
  const cb = useRef(onMove)
  cb.current = onMove

  const report = useCallback((clientX: number, clientY: number) => {
    const el = elRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    cb.current(clamp((clientX - r.left) / r.width, 0, 1), clamp((clientY - r.top) / r.height, 0, 1))
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => { if (activeRef.current) { e.preventDefault(); report(e.clientX, e.clientY) } }
    const up = () => { activeRef.current = false }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [report])

  const down = useCallback((e: React.PointerEvent) => { activeRef.current = true; report(e.clientX, e.clientY) }, [report])
  return { elRef, down }
}

interface Props {
  value: string                       // current hex (#rrggbb)
  onChange: (hex: string) => void
  swatches?: string[]                 // quick presets shown under the picker
}

export function ColorPicker({ value, onChange, swatches = [] }: Props) {
  const hsv = hexToHsv(value)
  const rgb = hexToRgb(value)

  const sv = useDrag((x, y) => onChange(hsvToHex({ h: hsv.h, s: x, v: 1 - y })))
  const hue = useDrag((_x, y) => onChange(hsvToHex({ h: clamp(y * 360, 0, 359.9), s: hsv.s || 1, v: hsv.v || 1 })))

  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 })

  const setChannel = (k: keyof RGB, raw: string) => {
    const n = clamp(parseInt(raw || '0', 10) || 0, 0, 255)
    onChange(rgbToHex({ ...rgb, [k]: n }))
  }
  const setHex = (raw: string) => {
    let h = raw.trim()
    if (!h.startsWith('#')) h = '#' + h
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) onChange(rgbToHex(hexToRgb(h)))
  }

  return (
    <div className="cpick">
      <div className="cpick-body">
        <div
          ref={sv.elRef}
          className="cpick-sv"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
          onPointerDown={sv.down}
        >
          <span className="cpick-knob" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }} />
        </div>
        <div ref={hue.elRef} className="cpick-hue" onPointerDown={hue.down}>
          <span className="cpick-hueknob" style={{ top: `${(hsv.h / 360) * 100}%` }} />
        </div>
      </div>

      <div className="cpick-fields">
        <span className="cpick-prev" style={{ background: value }} />
        <label className="cpick-hex">
          <span>Hex</span>
          <input value={value.toUpperCase()} onChange={e => setHex(e.target.value)} spellCheck={false} maxLength={7} />
        </label>
        <label><span>R</span><input type="number" min={0} max={255} value={Math.round(rgb.r)} onChange={e => setChannel('r', e.target.value)} /></label>
        <label><span>G</span><input type="number" min={0} max={255} value={Math.round(rgb.g)} onChange={e => setChannel('g', e.target.value)} /></label>
        <label><span>B</span><input type="number" min={0} max={255} value={Math.round(rgb.b)} onChange={e => setChannel('b', e.target.value)} /></label>
      </div>

      {swatches.length > 0 && (
        <div className="cpick-swatches">
          {swatches.map(c => (
            <button
              key={c}
              className={`cpick-sw ${value.toLowerCase() === c.toLowerCase() ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => onChange(c)}
              aria-label={c}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  )
}
