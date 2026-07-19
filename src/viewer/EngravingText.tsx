import { useMemo } from 'react'
import * as THREE from 'three'
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json'
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json'
import gentilis from 'three/examples/fonts/gentilis_regular.typeface.json'
import optimer from 'three/examples/fonts/optimer_regular.typeface.json'
import type { DesignSpec } from '../spec/types'
import { sizeToDiameter } from '../lib/sizing'

// Parsed once at load — bundled, no network. Fully offline engraving.
const loader = new FontLoader()
type FontData = Parameters<typeof loader.parse>[0]
const FONTS: Record<string, Font> = {
  Serif: loader.parse(gentilis as unknown as FontData),
  Sans: loader.parse(helvetiker as unknown as FontData),
  Script: loader.parse(optimer as unknown as FontData),
  Block: loader.parse(helvetikerBold as unknown as FontData)
}

const ENG_MAT = new THREE.MeshStandardMaterial({ color: 0x1c1814, metalness: 0.3, roughness: 0.6 })

/**
 * The typed engraving cut into the band surface, positioned where the slider
 * puts it. Real extruded lettering from bundled fonts (works offline).
 */
export function EngravingText({ spec }: { spec: DesignSpec }) {
  const text = spec.engraving.text.trim()
  const inside = spec.engraving.placement === 'inside'
  const insideR = sizeToDiameter(spec.ring.size) / 2
  const outerR = insideR + spec.ring.thickness
  const surfaceR = inside ? insideR + 0.02 : outerR - 0.02
  const angle = (spec.engraving.position ?? 0.75) * Math.PI * 2
  const fontSize = Math.max(spec.ring.width * 0.5, 0.9)

  const geo = useMemo(() => {
    if (!text) return null
    const font = FONTS[spec.engraving.font] ?? FONTS.Serif
    const g = new TextGeometry(text, { font, size: fontSize, height: 0.12, curveSegments: 3, bevelEnabled: false })
    g.computeBoundingBox()
    const bb = g.boundingBox!
    g.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -0.06)
    return g
  }, [text, spec.engraving.font, fontSize])

  const { position, quaternion } = useMemo(() => {
    const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0)
    const normal = inside ? radial.clone().negate() : radial
    const up = new THREE.Vector3(0, 0, 1)
    const right = new THREE.Vector3().crossVectors(up, normal).normalize()
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
    return { position: [radial.x * surfaceR, radial.y * surfaceR, 0] as [number, number, number], quaternion: q }
  }, [angle, surfaceR, inside])

  if (!geo) return null
  return <mesh geometry={geo} material={ENG_MAT} position={position} quaternion={quaternion} />
}
