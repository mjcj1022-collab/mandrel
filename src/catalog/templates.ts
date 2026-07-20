import { DEFAULT_SPEC, NO_STONE, type DesignSpec, type ProductCategory } from '../spec/types'

/**
 * A template is a named starting point — a full DesignSpec the designer then
 * tunes. Every template is parametric: it sets values, not a frozen mesh, so
 * changing the stone or metal afterwards reflows weight, cost and geometry.
 */
export interface Template {
  id: string
  name: string
  blurb: string
  category: ProductCategory
  build: () => DesignSpec
}

interface Over {
  category?: ProductCategory
  metal?: Partial<DesignSpec['metal']>
  center?: Partial<DesignSpec['center']>
  setting?: Partial<DesignSpec['setting']>
  ring?: Partial<DesignSpec['ring']>
  pendant?: Partial<DesignSpec['pendant']>
  earring?: Partial<DesignSpec['earring']>
  bracelet?: Partial<DesignSpec['bracelet']>
  necklace?: Partial<DesignSpec['necklace']>
}

/** Merge overrides onto the default spec, block by block. */
const base = (over: Over): DesignSpec => ({
  ...DEFAULT_SPEC,
  ...(over.category ? { category: over.category } : {}),
  metal: { ...DEFAULT_SPEC.metal, ...(over.metal ?? {}) },
  center: { ...DEFAULT_SPEC.center, ...(over.center ?? {}) },
  setting: { ...DEFAULT_SPEC.setting, ...(over.setting ?? {}) },
  ring: { ...DEFAULT_SPEC.ring, ...(over.ring ?? {}) },
  pendant: { ...DEFAULT_SPEC.pendant, ...(over.pendant ?? {}) },
  earring: { ...DEFAULT_SPEC.earring, ...(over.earring ?? {}) },
  bracelet: { ...DEFAULT_SPEC.bracelet, ...(over.bracelet ?? {}) },
  necklace: { ...DEFAULT_SPEC.necklace, ...(over.necklace ?? {}) }
})

export const TEMPLATES: Template[] = [
  // Rings
  { id: 'solitaire', name: 'Classic Solitaire', blurb: 'Round, 4-prong, 1 ct', category: 'ring',
    build: () => base({ category: 'ring', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 }, setting: { typeId: 'p4' }, ring: { width: 2, thickness: 1.8 } }) },
  { id: 'tiffany', name: 'Six-Prong Solitaire', blurb: 'Tiffany-style, 1.25 ct', category: 'ring',
    build: () => base({ category: 'ring', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1.25 }, setting: { typeId: 'p6' } }) },
  { id: 'bezel-ring', name: 'Bezel Solitaire', blurb: 'Protective, low-profile', category: 'ring',
    build: () => base({ category: 'ring', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 0.9 }, setting: { typeId: 'bz' } }) },
  { id: 'oval', name: 'Oval Solitaire', blurb: 'Oval, six-prong, 18KY', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '18ky' }, center: { shapeId: 'ov', stoneTypeId: 'dia', carat: 1.5 }, setting: { typeId: 'p6' } }) },
  { id: 'emerald-plat', name: 'Emerald in Platinum', blurb: 'Emerald cut, bezel, Pt', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: 'pt95' }, center: { shapeId: 'em', stoneTypeId: 'dia', carat: 1.2 }, setting: { typeId: 'bz' } }) },
  { id: 'cocktail', name: 'Cocktail Ring', blurb: 'Statement 3 ct, six-prong', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '18ky' }, center: { shapeId: 'cu', stoneTypeId: 'sap', carat: 3 }, setting: { typeId: 'p6' }, ring: { width: 2.4, thickness: 2.0 } }) },
  { id: 'wedding-flat', name: 'Wedding Band', blurb: 'Plain flat, 2.5 mm', category: 'ring',
    build: () => base({ category: 'ring', center: { stoneTypeId: NO_STONE }, ring: { width: 2.5, thickness: 1.6, fit: 'standard' } }) },
  { id: 'mens-band', name: "Men's Band", blurb: 'Wide 6 mm comfort, white', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '14kw' }, center: { stoneTypeId: NO_STONE }, ring: { size: 10, width: 6, thickness: 1.9, fit: 'comfort' } }) },
  { id: 'halo', name: 'Halo', blurb: 'Round center, single halo, 18KW', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '18kw' }, center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 }, setting: { typeId: 'hal' } }) },
  { id: 'double-halo', name: 'Double Halo', blurb: 'Layered halo, cushion 1.25 ct', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '18kw' }, center: { shapeId: 'cu', stoneTypeId: 'dia', carat: 1.25 }, setting: { typeId: 'hl2' } }) },
  { id: 'three-stone', name: 'Three-Stone', blurb: 'Trilogy, emerald center, Pt', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: 'pt95' }, center: { shapeId: 'em', stoneTypeId: 'dia', carat: 1.2 }, setting: { typeId: 'th3' } }) },
  { id: 'pave-band', name: 'Pavé Solitaire', blurb: 'Pavé shank, round 1 ct, 18KW', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '18kw' }, center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 }, setting: { typeId: 'pav' }, ring: { width: 2.2, thickness: 1.9 } }) },
  { id: 'channel', name: 'Channel Band', blurb: 'Flush-set row, round 0.9 ct', category: 'ring',
    build: () => base({ category: 'ring', metal: { alloyId: '14kw' }, center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 0.9 }, setting: { typeId: 'chn' }, ring: { width: 2.6, thickness: 1.9 } }) },

  // Pendants
  { id: 'solitaire-pendant', name: 'Solitaire Pendant', blurb: 'Bezel, 1 ct, 18" chain', category: 'pendant',
    build: () => base({ category: 'pendant', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 }, setting: { typeId: 'bz' } }) },
  { id: 'pear-drop', name: 'Pear Drop', blurb: 'Pear, prong, on chain', category: 'pendant',
    build: () => base({ category: 'pendant', metal: { alloyId: '18kw' }, center: { shapeId: 'pe', stoneTypeId: 'dia', carat: 1 }, setting: { typeId: 'p4' } }) },

  // Earrings
  { id: 'studs', name: 'Diamond Studs', blurb: 'Pair, 4-prong, 0.5 ct ea', category: 'earring',
    build: () => base({ category: 'earring', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 0.5 }, setting: { typeId: 'p4' }, earring: { pair: true, dropLength: 0 } }) },
  { id: 'drops', name: 'Drop Earrings', blurb: 'Pair, 15 mm drop', category: 'earring',
    build: () => base({ category: 'earring', metal: { alloyId: '18ky' }, center: { shapeId: 'ov', stoneTypeId: 'sap', carat: 0.75 }, setting: { typeId: 'p4' }, earring: { pair: true, dropLength: 15 } }) },

  // Bracelets
  { id: 'tennis', name: 'Tennis Bracelet', blurb: '3 ct total, 42 stones', category: 'bracelet',
    build: () => base({ category: 'bracelet', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 3 }, setting: { typeId: 'p4' }, bracelet: { ...DEFAULT_SPEC.bracelet, kind: 'tennis', linkCount: 42 } }) },
  { id: 'bangle', name: 'Bangle', blurb: 'Solid 6 mm, no stone', category: 'bracelet',
    build: () => base({ category: 'bracelet', center: { stoneTypeId: NO_STONE }, bracelet: { ...DEFAULT_SPEC.bracelet, kind: 'bangle', width: 6, thickness: 2.4 } }) },
  { id: 'cuff', name: 'Cuff', blurb: 'Open cuff, 8 mm', category: 'bracelet',
    build: () => base({ category: 'bracelet', metal: { alloyId: '14kr' }, center: { stoneTypeId: NO_STONE }, bracelet: { ...DEFAULT_SPEC.bracelet, kind: 'cuff', width: 8, thickness: 2.6 } }) },

  // Necklaces
  { id: 'chain', name: 'Chain', blurb: '18" cable, no pendant', category: 'necklace',
    build: () => base({ category: 'necklace', center: { stoneTypeId: NO_STONE }, necklace: { ...DEFAULT_SPEC.necklace, length: 18, hasPendant: false } }) },
  { id: 'pendant-necklace', name: 'Pendant Necklace', blurb: '20" with bezel pendant', category: 'necklace',
    build: () => base({ category: 'necklace', center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 0.75 }, setting: { typeId: 'bz' }, necklace: { ...DEFAULT_SPEC.necklace, length: 20, hasPendant: true } }) }
]
