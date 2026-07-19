/**
 * Stock form the metal is melted from. The form doesn't change the mass of the
 * finished piece, but it changes what you pay (fabrication premium over spot)
 * and how much you lose in the melt — so the pour weight and cost reflect it.
 */
export interface MetalForm {
  id: string
  label: string
  premiumAdd: number    // added to the alloy's fabrication premium
  meltLossAdd: number   // added to the alloy's per-cycle melt loss
  note: string
}

export const METAL_FORMS: MetalForm[] = [
  { id: 'grain', label: 'Casting grain', premiumAdd: 0.00, meltLossAdd: 0.000, note: 'Fresh casting grain — the standard clean melt.' },
  { id: 'sheet', label: 'Sheet', premiumAdd: 0.15, meltLossAdd: -0.003, note: 'Rolled sheet: higher fabrication premium, melts clean.' },
  { id: 'wire', label: 'Wire', premiumAdd: 0.20, meltLossAdd: -0.003, note: 'Drawn wire: the highest fabrication premium.' },
  { id: 'scrap', label: 'Recycled scrap', premiumAdd: -0.10, meltLossAdd: 0.025, note: 'Your own scrap: cheaper stock, but more melt loss and firescale.' }
]

export const metalFormById = (id: string | undefined): MetalForm =>
  METAL_FORMS.find(f => f.id === id) ?? METAL_FORMS[0]
