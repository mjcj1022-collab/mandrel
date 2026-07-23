/**
 * Gemstone sourcing. Today it searches a curated demo inventory so the flow is
 * fully usable offline; a real supplier feed can be wired in later (e.g. via a
 * VITE_GEM_API_URL fetch) behind the same searchInventory shape. Each stone
 * carries the fields the design needs — shape, carat, 4Cs, lab and cert — so a
 * picked stone flows straight into the piece.
 */
export interface InventoryStone {
  id: string
  stoneTypeId: string          // catalog stone id (dia, lab, sap, …)
  shapeId: string              // catalog shape id (rd, ov, …)
  carat: number
  color: string                // COLOR_GRADES id (D…M) — or a descriptor for coloured stones
  clarity: string              // CLARITY_GRADES id (fl…i3)
  cut: string                  // CUT_GRADES id (ex…pr)
  lab: 'GIA' | 'IGI' | 'AGS'
  cert: string
  price: number                // supplier asking price, USD
  labGrown?: boolean
}

export interface StoneFilter { shapeId?: string; caratMin?: number; caratMax?: number; stoneTypeId?: string }

export const DEMO_INVENTORY: InventoryStone[] = [
  { id: 'g1', stoneTypeId: 'dia', shapeId: 'rd', carat: 0.51, color: 'F', clarity: 'vs1', cut: 'ex', lab: 'GIA', cert: '2201559874', price: 1650 },
  { id: 'g2', stoneTypeId: 'dia', shapeId: 'rd', carat: 0.72, color: 'G', clarity: 'vs2', cut: 'ex', lab: 'GIA', cert: '5192847761', price: 2980 },
  { id: 'g3', stoneTypeId: 'dia', shapeId: 'rd', carat: 1.01, color: 'E', clarity: 'vvs2', cut: 'ex', lab: 'GIA', cert: '1345229087', price: 8450 },
  { id: 'g4', stoneTypeId: 'dia', shapeId: 'ov', carat: 1.20, color: 'G', clarity: 'vs1', cut: 'ex', lab: 'GIA', cert: '6472118834', price: 9200 },
  { id: 'g5', stoneTypeId: 'dia', shapeId: 'cu', carat: 1.53, color: 'H', clarity: 'si1', cut: 'vg', lab: 'IGI', cert: 'IGI-448902', price: 9800 },
  { id: 'g6', stoneTypeId: 'dia', shapeId: 'em', carat: 1.71, color: 'F', clarity: 'vvs1', cut: 'ex', lab: 'GIA', cert: '2288741903', price: 18400 },
  { id: 'g7', stoneTypeId: 'dia', shapeId: 'pe', carat: 2.02, color: 'G', clarity: 'vs2', cut: 'vg', lab: 'GIA', cert: '7719203344', price: 24500 },
  { id: 'g8', stoneTypeId: 'lab', shapeId: 'rd', carat: 1.00, color: 'E', clarity: 'vvs2', cut: 'ex', lab: 'IGI', cert: 'IGI-LG-33127', price: 940, labGrown: true },
  { id: 'g9', stoneTypeId: 'lab', shapeId: 'ov', carat: 1.51, color: 'F', clarity: 'vs1', cut: 'ex', lab: 'IGI', cert: 'IGI-LG-51880', price: 1480, labGrown: true },
  { id: 'g10', stoneTypeId: 'lab', shapeId: 'pr', carat: 2.05, color: 'G', clarity: 'vs2', cut: 'ex', lab: 'IGI', cert: 'IGI-LG-77451', price: 2150, labGrown: true },
  { id: 'g11', stoneTypeId: 'sap', shapeId: 'ov', carat: 1.85, color: 'Blue', clarity: 'vs1', cut: 'vg', lab: 'AGS', cert: 'AGS-90112', price: 3400 },
  { id: 'g12', stoneTypeId: 'rub', shapeId: 'cu', carat: 1.12, color: 'Red', clarity: 'si1', cut: 'gd', lab: 'AGS', cert: 'AGS-77320', price: 5200 },
  { id: 'g13', stoneTypeId: 'eme', shapeId: 'em', carat: 1.44, color: 'Green', clarity: 'si2', cut: 'vg', lab: 'AGS', cert: 'AGS-61094', price: 4100 },
  { id: 'g14', stoneTypeId: 'dia', shapeId: 'ma', carat: 0.91, color: 'H', clarity: 'vs2', cut: 'vg', lab: 'GIA', cert: '3390218866', price: 3300 },
  { id: 'g15', stoneTypeId: 'dia', shapeId: 'pr', carat: 1.30, color: 'I', clarity: 'si1', cut: 'vg', lab: 'IGI', cert: 'IGI-556210', price: 6100 },
]

/** Which grades the design's grading accepts (letter colours); coloured stones
 *  keep the catalog default so applying them never sets an invalid grade. */
const LETTER_COLOR = /^[D-M]$/

export function searchInventory(f: StoneFilter, inv: InventoryStone[] = DEMO_INVENTORY): InventoryStone[] {
  return inv
    .filter(s =>
      (!f.shapeId || f.shapeId === 'any' || s.shapeId === f.shapeId) &&
      (!f.stoneTypeId || f.stoneTypeId === 'any' || s.stoneTypeId === f.stoneTypeId) &&
      (f.caratMin == null || s.carat >= f.caratMin) &&
      (f.caratMax == null || s.carat <= f.caratMax))
    .sort((a, b) => a.carat - b.carat)
}

/** The colour grade to write into the design for a stone (only letter grades are
 *  valid gradings; coloured-stone descriptors are ignored). */
export const gradingColor = (s: InventoryStone): string | null => (LETTER_COLOR.test(s.color) ? s.color : null)
