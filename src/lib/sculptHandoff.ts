/**
 * Sculpt → commercial pipeline.
 *
 * A parametric design becomes sellable through DesignSpec → price → quote →
 * order. A sculpted piece has no DesignSpec — its shape is arbitrary geometry —
 * so it can't be forced into that shape. Instead it carries the facts that
 * actually drive a quote (alloy, metal volume/weight, stones, cost breakdown)
 * plus the geometry itself, so the saved record is both quotable and
 * re-openable in the modeler.
 */
import { sculptEstimate } from './sculpt'
import { alloyById } from '../catalog'
import type { SculptObject } from '../state/modeler'

/** One itemized line on a sculpt quote — mirrors the Design-side breakdown. */
export interface SculptQuoteLine {
  label: string
  detail?: string
  amount: number
}

/** The record persisted as a "design" so a sculpt can enter the order pipeline. */
export interface SculptDesignSpec {
  version: 1
  kind: 'sculpt'
  alloyId: string
  alloyName: string
  parts: number
  metal: { volumeMm3: number; castGrams: number }
  stones: { count: number; carats: number }
  estimate: {
    metal: number; stones: number; setting: number; finish: number
    subtotal: number; total: number
  }
  /** Full modeler scene, so the order can be reopened and re-cut. */
  objects: SculptObject[]
}

export interface SculptHandoff {
  name: string
  spec: SculptDesignSpec
  lines: SculptQuoteLine[]
  total: number
  /** Approximate persisted size, so callers can refuse absurd payloads. */
  bytes: number
}

/** Refuse to persist a scene bigger than this — bake/simplify first. */
export const MAX_SPEC_BYTES = 4_000_000

export class SculptHandoffError extends Error {}

/**
 * Build the quote + persistable record for a sculpted piece. Throws a
 * SculptHandoffError (with a message fit for the UI) when there's nothing
 * sellable or the scene is too large to store.
 */
export function sculptHandoff(name: string, objects: SculptObject[], alloyId: string): SculptHandoff {
  const metalParts = objects.filter(o => o.material === 'metal')
  if (!metalParts.length) {
    throw new SculptHandoffError('Nothing to quote — add at least one metal part.')
  }
  // Size first: a scene too big to store can't be saved no matter how it prices,
  // and reporting that beats a confusing pricing error. Geometry dominates the
  // payload, so measuring the objects is a faithful proxy for the whole spec.
  const geometryBytes = JSON.stringify(objects).length
  if (geometryBytes > MAX_SPEC_BYTES) {
    throw new SculptHandoffError(
      `This scene is ${(geometryBytes / 1e6).toFixed(1)} MB — too large to save. Fuse or simplify the mesh first.`
    )
  }
  const est = sculptEstimate(objects, alloyId)
  if (!(est.castG > 0)) {
    throw new SculptHandoffError('This piece has no metal volume to price.')
  }
  const alloy = alloyById(alloyId)

  const lines: SculptQuoteLine[] = [
    { label: 'Metal', detail: `${est.castG.toFixed(2)} g ${alloy.name}`, amount: est.metalCost },
  ]
  if (est.gemCount > 0) {
    lines.push({ label: 'Stones', detail: `${est.gemCount} · ${est.carats.toFixed(2)} ct`, amount: est.stoneCost })
    lines.push({ label: 'Setting labor', detail: `${est.gemCount} stone${est.gemCount === 1 ? '' : 's'}`, amount: est.settingLabor })
  }
  lines.push({ label: 'Cast, finish, polish', amount: est.finishFee })

  const spec: SculptDesignSpec = {
    version: 1,
    kind: 'sculpt',
    alloyId,
    alloyName: alloy.name,
    parts: objects.length,
    metal: { volumeMm3: est.vol, castGrams: est.castG },
    stones: { count: est.gemCount, carats: est.carats },
    estimate: {
      metal: est.metalCost, stones: est.stoneCost, setting: est.settingLabor,
      finish: est.finishFee, subtotal: est.subtotal, total: est.total,
    },
    objects,
  }

  return { name: name.trim() || 'Sculpted piece', spec, lines, total: est.total, bytes: JSON.stringify(spec).length }
}

/** True when a persisted design record came from the modeler. */
export function isSculptSpec(spec: unknown): spec is SculptDesignSpec {
  return !!spec && typeof spec === 'object' && (spec as { kind?: string }).kind === 'sculpt'
}
