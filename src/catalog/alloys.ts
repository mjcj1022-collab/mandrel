/**
 * Alloy catalog. Every row carries its own math, so adding a metal is a data
 * change and never a code change.
 *
 * density    g/cm3      ask your caster and override; mills differ by ~3%
 * fine       fraction   pure precious content; drives spot pricing and hallmark
 * precious   bool       precious metals price on fine troy oz; base metals per gram
 * spot       $/troy oz  precious only. REPLACE WITH A LIVE FEED BEFORE QUOTING
 * perGram    $/g        base metals only (titanium, steel, brass, ...)
 * premium    fraction   fabrication markup over spot / stock
 * meltLoss   fraction   oxidation, crucible film, fines, per cycle
 * buttonMin  grams      below this the button cannot feed shrinkage
 * nickelFree bool       false = restricted for skin contact in the EU
 * platable   bool       takes rhodium plating (white metals)
 */
export interface Alloy {
  id: string
  name: string
  short: string
  density: number
  fine: number
  precious: boolean
  symbol: string
  spot: number
  perGram: number
  premium: number
  meltLoss: number
  buttonMin: number
  finishPenalty: number
  color: number
  roughness: number
  hallmark: string
  nickelFree: boolean
  platable: boolean
  note?: string
}

export const ALLOYS: Alloy[] = [
  // Gold
  { id:'10ky', name:'10K Yellow',    short:'10KY', density:11.57, fine:0.417, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.10, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD9BE84, roughness:0.24, hallmark:'10K',   nickelFree:true,  platable:false },
  { id:'14ky', name:'14K Yellow',    short:'14KY', density:13.07, fine:0.583, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.09, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD8B36A, roughness:0.22, hallmark:'14K',   nickelFree:true,  platable:false },
  { id:'14kw', name:'14K White Pd',  short:'14KW', density:12.61, fine:0.583, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.11, meltLoss:0.020, buttonMin:8,  finishPenalty:0.01,  color:0xD9DCDE, roughness:0.16, hallmark:'14K',   nickelFree:true,  platable:true },
  { id:'14kr', name:'14K Rose',      short:'14KR', density:12.90, fine:0.583, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.10, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD9A183, roughness:0.21, hallmark:'14K',   nickelFree:true,  platable:false },
  { id:'18ky', name:'18K Yellow',    short:'18KY', density:15.58, fine:0.750, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.08, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xE6BE63, roughness:0.20, hallmark:'18K',   nickelFree:true,  platable:false },
  { id:'18kw', name:'18K White Pd',  short:'18KW', density:15.70, fine:0.750, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.13, meltLoss:0.020, buttonMin:8,  finishPenalty:0.015, color:0xDCE0E2, roughness:0.15, hallmark:'18K',   nickelFree:true,  platable:true },
  { id:'18kr', name:'18K Rose',      short:'18KR', density:15.15, fine:0.750, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.09, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD79A80, roughness:0.20, hallmark:'18K',   nickelFree:true,  platable:false },
  { id:'18kg', name:'18K Green',     short:'18KG', density:15.60, fine:0.750, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.10, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xC9C87A, roughness:0.21, hallmark:'18K',   nickelFree:true,  platable:false, note:'Silver-rich green gold; soft, best in protected settings.' },
  { id:'22ky', name:'22K Yellow',    short:'22KY', density:17.80, fine:0.916, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.07, meltLoss:0.020, buttonMin:10, finishPenalty:0.01,  color:0xF0C24F, roughness:0.19, hallmark:'22K',   nickelFree:true,  platable:false },
  { id:'24ky', name:'24K Pure',      short:'24KY', density:19.32, fine:0.999, precious:true,  symbol:'Au', spot:2400, perGram:0, premium:0.05, meltLoss:0.015, buttonMin:12, finishPenalty:0.02,  color:0xFFD65A, roughness:0.22, hallmark:'24K',   nickelFree:true,  platable:false, note:'Very soft. Deforms in daily wear; suited to high-karat traditions.' },
  // Platinum group
  { id:'pt95', name:'Platinum 950',  short:'PT95', density:20.90, fine:0.950, precious:true,  symbol:'Pt', spot:1000, perGram:0, premium:0.12, meltLoss:0.015, buttonMin:15, finishPenalty:0.03,  color:0xC9CDD1, roughness:0.26, hallmark:'PLAT',  nickelFree:true,  platable:false },
  { id:'pt90', name:'Platinum 900',  short:'PT90', density:20.00, fine:0.900, precious:true,  symbol:'Pt', spot:1000, perGram:0, premium:0.12, meltLoss:0.015, buttonMin:15, finishPenalty:0.03,  color:0xC7CBCF, roughness:0.26, hallmark:'PLAT',  nickelFree:true,  platable:false },
  { id:'pd95', name:'Palladium 950', short:'PD95', density:12.00, fine:0.950, precious:true,  symbol:'Pd', spot:1050, perGram:0, premium:0.14, meltLoss:0.020, buttonMin:12, finishPenalty:0.02,  color:0xC6C9CC, roughness:0.24, hallmark:'PD950', nickelFree:true,  platable:false },
  // Silver
  { id:'ss92', name:'Sterling .925', short:'SS92', density:10.36, fine:0.925, precious:true,  symbol:'Ag', spot:30,   perGram:0, premium:0.20, meltLoss:0.040, buttonMin:6,  finishPenalty:0,     color:0xCED2D5, roughness:0.24, hallmark:'925',   nickelFree:true,  platable:true },
  { id:'ag93', name:'Argentium .935',short:'AG93', density:10.20, fine:0.935, precious:true,  symbol:'Ag', spot:30,   perGram:0, premium:0.28, meltLoss:0.030, buttonMin:6,  finishPenalty:0,     color:0xD4D8DB, roughness:0.20, hallmark:'935',   nickelFree:true,  platable:false, note:'Germanium-bearing; firescale-free and tarnish-resistant.' },
  { id:'ag99', name:'Fine .999',     short:'AG99', density:10.49, fine:0.999, precious:true,  symbol:'Ag', spot:30,   perGram:0, premium:0.15, meltLoss:0.040, buttonMin:6,  finishPenalty:0,     color:0xE0E4E7, roughness:0.22, hallmark:'999',   nickelFree:true,  platable:false, note:'Very soft; bezels and PMC, not shanks.' },
  // Contemporary / base metals (not cast the same way; priced per gram of stock)
  { id:'ti',   name:'Titanium G5',   short:'TI',   density:4.43,  fine:0, precious:false, symbol:'Ti',   spot:0, perGram:0.12, premium:0.30, meltLoss:0, buttonMin:0, finishPenalty:0.02, color:0xB9BEC2, roughness:0.30, hallmark:'Ti',   nickelFree:true,  platable:false, note:'Milled or CNC, not cast. Cannot be sized by stretching.' },
  { id:'tuc',  name:'Tungsten Carbide', short:'WC', density:15.6, fine:0, precious:false, symbol:'WC',  spot:0, perGram:0.08, premium:0.40, meltLoss:0, buttonMin:0, finishPenalty:0.04, color:0x9DA2A7, roughness:0.18, hallmark:'WC',   nickelFree:true,  platable:false, note:'Sintered, extremely hard; cannot be resized or soldered.' },
  { id:'coc',  name:'Cobalt Chrome', short:'CoCr', density:8.30,  fine:0, precious:false, symbol:'CoCr',spot:0, perGram:0.06, premium:0.30, meltLoss:0.02, buttonMin:0, finishPenalty:0.03, color:0xC4C9CE, roughness:0.20, hallmark:'CoCr', nickelFree:true,  platable:false },
  { id:'ss31', name:'Stainless 316L',short:'316L', density:7.90,  fine:0, precious:false, symbol:'SS',  spot:0, perGram:0.02, premium:0.30, meltLoss:0.02, buttonMin:0, finishPenalty:0.02, color:0xCACFD3, roughness:0.24, hallmark:'316L', nickelFree:false, platable:false, note:'Contains nickel; not for prolonged EU skin contact.' },
  { id:'zr',   name:'Zirconium',     short:'Zr',   density:6.52,  fine:0, precious:false, symbol:'Zr',  spot:0, perGram:0.10, premium:0.35, meltLoss:0, buttonMin:0, finishPenalty:0.03, color:0x8E9398, roughness:0.28, hallmark:'Zr',   nickelFree:true,  platable:false, note:'Oxidizes to a durable black surface.' },
  { id:'dam',  name:'Damascus Steel',short:'Dam',  density:7.80,  fine:0, precious:false, symbol:'Dam', spot:0, perGram:0.09, premium:0.45, meltLoss:0.02, buttonMin:0, finishPenalty:0.03, color:0xB6BABE, roughness:0.30, hallmark:'Dam',  nickelFree:true,  platable:false, note:'Pattern-welded; etched to reveal grain.' },
  { id:'brs',  name:'Brass',         short:'Brs',  density:8.50,  fine:0, precious:false, symbol:'Brs', spot:0, perGram:0.01, premium:0.25, meltLoss:0.03, buttonMin:5, finishPenalty:0.01, color:0xC9A94E, roughness:0.24, hallmark:'—',    nickelFree:true,  platable:true,  note:'Prototype / fashion metal; tarnishes.' },
  { id:'brz',  name:'Bronze',        short:'Brz',  density:8.80,  fine:0, precious:false, symbol:'Brz', spot:0, perGram:0.012,premium:0.25, meltLoss:0.03, buttonMin:5, finishPenalty:0.01, color:0xB07A44, roughness:0.26, hallmark:'—',    nickelFree:true,  platable:true,  note:'Prototype / sculptural metal; develops a patina.' },
  { id:'nis',  name:'Nickel Silver', short:'NiS',  density:8.70,  fine:0, precious:false, symbol:'NiS', spot:0, perGram:0.01, premium:0.25, meltLoss:0.03, buttonMin:5, finishPenalty:0.01, color:0xCFD3D6, roughness:0.24, hallmark:'—',    nickelFree:false, platable:true,  note:'Contains nickel despite the name; allergen.' }
]

export const alloyById_static = (id: string): Alloy | undefined => ALLOYS.find(a => a.id === id)

/** Runtime registry for alloys composed in the metal lab. */
export const CUSTOM_ALLOYS: Alloy[] = []

export function registerAlloy(a: Alloy): void {
  const i = CUSTOM_ALLOYS.findIndex(x => x.id === a.id)
  if (i >= 0) CUSTOM_ALLOYS[i] = a
  else CUSTOM_ALLOYS.push(a)
}

export const alloyById = (id: string): Alloy =>
  ALLOYS.find(a => a.id === id) ?? CUSTOM_ALLOYS.find(a => a.id === id) ?? ALLOYS[1]
