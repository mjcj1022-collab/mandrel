import { create } from 'zustand'
import {
  DEFAULT_SPEC, type DesignSpec, type FitProfile, type ProductCategory, type FinishId
} from '../spec/types'
import { registerAlloy, type Alloy } from '../catalog'
import { MARKET, setMarket as applyMarket, type Market } from '../lib/market'
import type { WeightUnit } from '../lib/units'

interface DesignStore {
  spec: DesignSpec
  unit: WeightUnit
  compareOpen: boolean
  market: Market
  setMarket: (patch: Partial<Market>) => void
  variants: DesignSpec[]
  pinVariant: () => void
  unpinVariant: (i: number) => void
  setCategory: (c: ProductCategory) => void
  setRing: (patch: Partial<DesignSpec['ring']>) => void
  setPendant: (patch: Partial<DesignSpec['pendant']>) => void
  setEarring: (patch: Partial<DesignSpec['earring']>) => void
  setBracelet: (patch: Partial<DesignSpec['bracelet']>) => void
  setNecklace: (patch: Partial<DesignSpec['necklace']>) => void
  setAlloy: (id: string) => void
  setRhodium: (on: boolean) => void
  setTwoTone: (on: boolean) => void
  setHeadAlloy: (id: string) => void
  setMetalForm: (id: string) => void
  applyCustomAlloy: (alloy: Alloy) => void
  setShape: (id: string) => void
  setStone: (id: string) => void
  setCarat: (ct: number) => void
  setGrading: (patch: Partial<DesignSpec['center']['grading']>) => void
  setCert: (patch: Partial<DesignSpec['center']['cert']>) => void
  setSetting: (id: string) => void
  setProfile: (p: DesignSpec['ring']['profile']) => void
  setMelee: (patch: Partial<NonNullable<DesignSpec['setting']['melee']>>) => void
  setFinish: (id: FinishId) => void
  setEngraving: (patch: Partial<DesignSpec['engraving']>) => void
  setFit: (fit: FitProfile) => void
  toggleHidden: (key: string) => void
  load: (spec: DesignSpec) => void
  toggleUnit: () => void
  toggleCompare: () => void
  reset: () => void
}

export const useDesign = create<DesignStore>(set => ({
  spec: DEFAULT_SPEC,
  unit: 'g',
  compareOpen: true,
  market: { ...MARKET },
  // Update the shared engine settings and clone spec so every price display refreshes.
  setMarket: patch => { applyMarket(patch); set(s => ({ market: { ...s.market, ...patch }, spec: { ...s.spec } })) },
  variants: [],
  pinVariant: () => set(s => (s.variants.length >= 4 ? {} : { variants: [...s.variants, s.spec] })),
  unpinVariant: i => set(s => ({ variants: s.variants.filter((_, j) => j !== i) })),
  setCategory: c => set(s => ({ spec: { ...s.spec, category: c } })),
  setRing: patch => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, ...patch } } })),
  setPendant: patch => set(s => ({ spec: { ...s.spec, pendant: { ...s.spec.pendant, ...patch } } })),
  setEarring: patch => set(s => ({ spec: { ...s.spec, earring: { ...s.spec.earring, ...patch } } })),
  setBracelet: patch => set(s => ({ spec: { ...s.spec, bracelet: { ...s.spec.bracelet, ...patch } } })),
  setNecklace: patch => set(s => ({ spec: { ...s.spec, necklace: { ...s.spec.necklace, ...patch } } })),
  setAlloy: id => set(s => ({ spec: { ...s.spec, metal: { ...s.spec.metal, alloyId: id } } })),
  setRhodium: (on: boolean) => set(s => ({ spec: { ...s.spec, metal: { ...s.spec.metal, rhodium: on } } })),
  setTwoTone: (on: boolean) => set(s => ({ spec: { ...s.spec, metal: { ...s.spec.metal, twoTone: on, headAlloyId: s.spec.metal.headAlloyId ?? (s.spec.metal.alloyId === '14ky' ? '14kw' : '14ky') } } })),
  setHeadAlloy: (id: string) => set(s => ({ spec: { ...s.spec, metal: { ...s.spec.metal, headAlloyId: id } } })),
  setMetalForm: (id: string) => set(s => ({ spec: { ...s.spec, metal: { ...s.spec.metal, form: id } } })),
  applyCustomAlloy: alloy => { registerAlloy(alloy); set(s => ({ spec: { ...s.spec, metal: { alloyId: alloy.id } } })) },
  setShape: id => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, shapeId: id } } })),
  setStone: id => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, stoneTypeId: id } } })),
  setCarat: ct => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, carat: ct } } })),
  setGrading: patch => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, grading: { ...s.spec.center.grading, ...patch } } } })),
  setCert: patch => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, cert: { ...s.spec.center.cert, ...patch } } } })),
  setSetting: id => set(s => ({ spec: { ...s.spec, setting: { typeId: id } } })),
  setProfile: p => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, profile: p } } })),
  setMelee: patch => set(s => ({ spec: { ...s.spec, setting: { ...s.spec.setting, melee: { ...s.spec.setting.melee, ...patch } } } })),
  setFinish: id => set(s => ({ spec: { ...s.spec, finish: id } })),
  setEngraving: patch => set(s => ({ spec: { ...s.spec, engraving: { ...s.spec.engraving, ...patch } } })),
  setFit: fit => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, fit } } })),
  // Backfill any fields absent from an older saved design.
  toggleHidden: key => set(s => {
    const cur = s.spec.hidden ?? []
    const hidden = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]
    return { spec: { ...s.spec, hidden } }
  }),
  load: spec => set({ spec: {
    ...DEFAULT_SPEC, ...spec,
    ring: { ...DEFAULT_SPEC.ring, ...spec.ring },
    center: { ...DEFAULT_SPEC.center, ...spec.center, grading: { ...DEFAULT_SPEC.center.grading, ...spec.center?.grading }, cert: { ...DEFAULT_SPEC.center.cert, ...spec.center?.cert } },
    engraving: { ...DEFAULT_SPEC.engraving, ...spec.engraving }
  } }),
  toggleUnit: () => set(s => ({ unit: s.unit === 'g' ? 'dwt' : 'g' })),
  toggleCompare: () => set(s => ({ compareOpen: !s.compareOpen })),
  reset: () => set({ spec: DEFAULT_SPEC })
}))
