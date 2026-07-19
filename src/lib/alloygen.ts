import { ELEMENTS, type MetalElement } from '../catalog/elements'
import type { Alloy } from '../catalog'

/** A recipe: grams of each element by id. */
export type AlloyMix = Record<string, number>

export type AlloyFamily = 'gold' | 'silver' | 'platinum' | 'palladium' | 'base'

export interface Part {
  element: MetalElement
  grams: number
  fraction: number   // 0..1 by mass
}

export interface AlloyComposition {
  parts: Part[]
  totalMass: number
  density: number       // g/cm³, from inverse rule of mixtures (volumes add)
  family: AlloyFamily
  fineness: number      // mass fraction of the naming precious metal
  perThousand: number   // fineness × 1000
  karat: number | null  // gold only
  color: number         // hex
  meltApproxC: number   // approximate liquidus
  hallmark: string
  notes: string[]
}

const frac = (g: number, total: number) => (total > 0 ? g / total : 0)

/** Linear interpolate two hex colors. */
function mix2(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

const ROSE = 0xE0A183, YELLOW = 0xE6C24F, GREEN = 0xD9D68C
const WHITE_WARM = 0xE4DFC9, WHITE_COOL = 0xDCDEE0

/** Colour of a gold alloy from its copper/silver balance and whitener load. */
function goldColor(fAu: number, fCu: number, fAg: number, fWhite: number): number {
  // Whiteners (Ni/Pd/Pt/Co) bleach the gold once they pass ~8% of the alloy.
  if (fWhite > 0.08) {
    const warmth = Math.max(0, Math.min(1, (0.75 - fAu) / 0.4))  // less gold = cooler white
    return mix2(WHITE_WARM, WHITE_COOL, warmth)
  }
  const cuRatio = frac(fCu, fCu + fAg)   // 0 = all silver (green), 1 = all copper (rose)
  const hue = cuRatio < 0.5
    ? mix2(GREEN, YELLOW, cuRatio / 0.5)
    : mix2(YELLOW, ROSE, (cuRatio - 0.5) / 0.5)
  // Fade toward pale as gold content drops (low-karat reads washed out).
  return mix2(0xCFC9B0, hue, Math.max(0.35, Math.min(1, fAu / 0.75)))
}

/** Weighted-mass blend of element colors, for base-metal mixes. */
function blendColor(parts: Part[]): number {
  let r = 0, g = 0, b = 0
  for (const p of parts) {
    r += ((p.element.color >> 16) & 255) * p.fraction
    g += ((p.element.color >> 8) & 255) * p.fraction
    b += (p.element.color & 255) * p.fraction
  }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}

export function composeAlloy(mix: AlloyMix): AlloyComposition {
  const parts: Part[] = ELEMENTS
    .map(e => ({ element: e, grams: Math.max(0, mix[e.id] || 0) }))
    .filter(p => p.grams > 0)
    .map(p => ({ ...p, fraction: 0 }))

  const totalMass = parts.reduce((s, p) => s + p.grams, 0)
  for (const p of parts) p.fraction = frac(p.grams, totalMass)

  // Density: volumes add, so 1/ρ = Σ w_i/ρ_i
  const invRho = parts.reduce((s, p) => s + p.fraction / p.element.density, 0)
  const density = invRho > 0 ? 1 / invRho : 0

  const gramsOf = (id: string) => parts.find(p => p.element.id === id)?.grams ?? 0
  const fAu = frac(gramsOf('au'), totalMass)
  const fAg = frac(gramsOf('ag'), totalMass)
  const fCu = frac(gramsOf('cu'), totalMass)
  const fPt = frac(gramsOf('pt'), totalMass)
  const fPd = frac(gramsOf('pd'), totalMass)
  const fWhite = frac(gramsOf('ni') + gramsOf('pd') + gramsOf('pt') + gramsOf('co'), totalMass)

  // Family = dominant precious metal by mass (or base if none meaningful)
  const preciousShares: [AlloyFamily, number][] = [['gold', fAu], ['platinum', fPt], ['palladium', fPd], ['silver', fAg]]
  preciousShares.sort((a, b) => b[1] - a[1])
  const [topFamily, topShare] = preciousShares[0]
  const family: AlloyFamily = topShare >= 0.30 ? topFamily : 'base'

  const finenessBy: Record<AlloyFamily, number> = { gold: fAu, silver: fAg, platinum: fPt, palladium: fPd, base: 0 }
  const fineness = finenessBy[family]
  const karat = family === 'gold' ? fAu * 24 : null

  const color = family === 'gold'
    ? goldColor(fAu, fCu, fAg, fWhite)
    : family === 'silver'
      ? mix2(0xEDEDED, 0xD8C9B8, Math.min(1, fCu / 0.1))   // sterling warms slightly with copper
      : family === 'base'
        ? blendColor(parts)
        : 0xD6D9DC   // platinum / palladium grey-white

  // Approximate liquidus: mass-weighted melt, depressed for eutectic mixing.
  const weightedMelt = parts.reduce((s, p) => s + p.fraction * p.element.melt, 0)
  const depression = parts.length >= 2 ? 0.88 : 1
  const meltApproxC = Math.round(weightedMelt * depression)

  return {
    parts, totalMass, density, family, fineness, perThousand: Math.round(fineness * 1000),
    karat, color, meltApproxC, hallmark: hallmarkFor(family, fineness, karat), notes: notesFor(mix, totalMass, family, karat)
  }
}

function hallmarkFor(family: AlloyFamily, fineness: number, karat: number | null): string {
  if (family === 'gold' && karat !== null) return `${karat.toFixed(1).replace(/\.0$/, '')}K · ${Math.round(fineness * 1000)}`
  if (family === 'silver') return `${Math.round(fineness * 1000)} silver`
  if (family === 'platinum') return `PT${Math.round(fineness * 1000)}`
  if (family === 'palladium') return `PD${Math.round(fineness * 1000)}`
  return 'base metal'
}

function notesFor(mix: AlloyMix, total: number, family: AlloyFamily, karat: number | null): string[] {
  const notes: string[] = []
  const f = (id: string) => frac(Math.max(0, mix[id] || 0), total)
  if (f('ni') > 0.005) notes.push('Contains nickel — an allergen; restricted for prolonged skin contact in the EU.')
  if (f('pd') > 0.05 && family === 'gold') notes.push('Palladium white gold — naturally white, needs no rhodium plating.')
  if (f('zn') > 0.15) notes.push('High zinc — casts easily but turns brittle and prone to firescale.')
  if (family === 'gold' && karat !== null && karat < 10) notes.push('Below 10K — cannot legally be sold as "gold" in the US.')
  if (family === 'gold' && karat !== null && karat > 24.05) notes.push('Over 24K is not physically possible — reduce alloying metals.')
  if (family === 'base') notes.push('Under 30% precious content — a base or prototype alloy, not a precious-metal hallmark.')
  if (total === 0) notes.push('Add at least one metal to compose an alloy.')
  return notes
}

const SPOT_BY: Record<AlloyFamily, number> = { gold: 2400, silver: 30, platinum: 1000, palladium: 1050, base: 30 }
const SYMBOL_BY: Record<AlloyFamily, Alloy['symbol']> = { gold: 'Au', silver: 'Ag', platinum: 'Pt', palladium: 'Pd', base: 'Ag' }

/** Turn a composed alloy into a design-usable Alloy row. */
export function compositionToAlloy(comp: AlloyComposition, id: string, name: string): Alloy {
  const white = comp.parts.some(p => ['ni', 'pd', 'pt', 'co'].includes(p.element.id))
  const hasNickel = comp.parts.some(p => p.element.id === 'ni')
  const precious = comp.family !== 'base'
  return {
    id,
    name,
    short: name.slice(0, 6).toUpperCase(),
    density: +comp.density.toFixed(2),
    fine: +comp.fineness.toFixed(3),
    precious,
    symbol: SYMBOL_BY[comp.family],
    spot: SPOT_BY[comp.family],
    perGram: precious ? 0 : 0.05,
    premium: 0.10,
    meltLoss: 0.02,
    buttonMin: comp.family === 'platinum' ? 15 : 8,
    finishPenalty: comp.family === 'platinum' ? 0.03 : white ? 0.01 : 0,
    color: comp.color,
    roughness: 0.2,
    hallmark: comp.hallmark.split(' ')[0],
    nickelFree: !hasNickel,
    platable: white
  }
}

/** Standard recipes, grams per 100 g. */
export interface Recipe { id: string; name: string; mix: AlloyMix }
export const RECIPES: Recipe[] = [
  { id: 'r-14ky', name: '14K Yellow', mix: { au: 58.5, cu: 29, ag: 12.5 } },
  { id: 'r-18ky', name: '18K Yellow', mix: { au: 75, ag: 15, cu: 10 } },
  { id: 'r-22ky', name: '22K Yellow', mix: { au: 91.7, ag: 5, cu: 3.3 } },
  { id: 'r-14kr', name: '14K Rose', mix: { au: 58.5, cu: 39, ag: 2.5 } },
  { id: 'r-14kw-ni', name: '14K White (Ni)', mix: { au: 58.5, cu: 17, ni: 17, zn: 7.5 } },
  { id: 'r-18kw-pd', name: '18K White (Pd)', mix: { au: 75, pd: 15, ag: 10 } },
  { id: 'r-sterling', name: 'Sterling .925', mix: { ag: 92.5, cu: 7.5 } },
  { id: 'r-argentium', name: 'Argentium .935', mix: { ag: 93.5, cu: 5, ge: 1.5 } },
  { id: 'r-pt950', name: 'Platinum 950', mix: { pt: 95, co: 5 } }
]
