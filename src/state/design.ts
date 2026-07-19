import { create } from 'zustand'
import {
  DEFAULT_SPEC, type DesignSpec, type FitProfile, type ProductCategory
} from '../spec/types'
import { registerAlloy, type Alloy } from '../catalog'
import type { WeightUnit } from '../lib/units'

interface DesignStore {
  spec: DesignSpec
  unit: WeightUnit
  compareOpen: boolean
  setCategory: (c: ProductCategory) => void
  setRing: (patch: Partial<DesignSpec['ring']>) => void
  setPendant: (patch: Partial<DesignSpec['pendant']>) => void
  setEarring: (patch: Partial<DesignSpec['earring']>) => void
  setBracelet: (patch: Partial<DesignSpec['bracelet']>) => void
  setNecklace: (patch: Partial<DesignSpec['necklace']>) => void
  setAlloy: (id: string) => void
  setRhodium: (on: boolean) => void
  applyCustomAlloy: (alloy: Alloy) => void
  setShape: (id: string) => void
  setStone: (id: string) => void
  setCarat: (ct: number) => void
  setSetting: (id: string) => void
  setFit: (fit: FitProfile) => void
  load: (spec: DesignSpec) => void
  toggleUnit: () => void
  toggleCompare: () => void
  reset: () => void
}

export const useDesign = create<DesignStore>(set => ({
  spec: DEFAULT_SPEC,
  unit: 'g',
  compareOpen: true,
  setCategory: c => set(s => ({ spec: { ...s.spec, category: c } })),
  setRing: patch => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, ...patch } } })),
  setPendant: patch => set(s => ({ spec: { ...s.spec, pendant: { ...s.spec.pendant, ...patch } } })),
  setEarring: patch => set(s => ({ spec: { ...s.spec, earring: { ...s.spec.earring, ...patch } } })),
  setBracelet: patch => set(s => ({ spec: { ...s.spec, bracelet: { ...s.spec.bracelet, ...patch } } })),
  setNecklace: patch => set(s => ({ spec: { ...s.spec, necklace: { ...s.spec.necklace, ...patch } } })),
  setAlloy: id => set(s => ({ spec: { ...s.spec, metal: { alloyId: id, rhodium: s.spec.metal.rhodium } } })),
  setRhodium: (on: boolean) => set(s => ({ spec: { ...s.spec, metal: { ...s.spec.metal, rhodium: on } } })),
  applyCustomAlloy: alloy => { registerAlloy(alloy); set(s => ({ spec: { ...s.spec, metal: { alloyId: alloy.id } } })) },
  setShape: id => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, shapeId: id } } })),
  setStone: id => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, stoneTypeId: id } } })),
  setCarat: ct => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, carat: ct } } })),
  setSetting: id => set(s => ({ spec: { ...s.spec, setting: { typeId: id } } })),
  setFit: fit => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, fit } } })),
  load: spec => set({ spec }),
  toggleUnit: () => set(s => ({ unit: s.unit === 'g' ? 'dwt' : 'g' })),
  toggleCompare: () => set(s => ({ compareOpen: !s.compareOpen })),
  reset: () => set({ spec: DEFAULT_SPEC })
}))
