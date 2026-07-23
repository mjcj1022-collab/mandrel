import { useDesign } from '../state/design'
import { alloyById, stoneById, shapeById, colorTint, isGradeable } from '../catalog'
import { stoneOnPiece } from '../spec/types'
import { ColorPicker } from './ColorPicker'

const numHex = (n: number) => '#' + (n & 0xffffff).toString(16).padStart(6, '0')

const DEFAULT_BG = '#0E1113'

/** Preset ramps per surface so a click gets a sensible starting palette. */
const METAL_SW = ['#D8B36A', '#E6BE63', '#F0C24F', '#FFD65A', '#D9A183', '#D79A80', '#D9DCDE', '#C9CDD1', '#CED2D5', '#B9BEC2']
const STONE_SW = ['#FFFFFF', '#1E4FA8', '#B01430', '#0E7A4A', '#E06A9A', '#EFC94A', '#7B4FBF', '#00A6A6', '#111318', '#F4F6FA']
const BG_SW    = ['#0E1113', '#050607', '#151a1d', '#F4F1EA', '#FFFFFF', '#101820', '#1B1420', '#0B1A16', '#20160E', '#2A2A2E']

/**
 * The custom-colour editor for the Color studio — a Photoshop-style picker
 * driving whichever surface is selected (metal, stone or the backdrop) plus a
 * Paint-style row of preset swatches. Selecting a surface here mirrors clicking
 * it in the 3D view; edits write straight into the shared `colorwork` override
 * so the render updates live.
 */
export function ColorPanel() {
  const spec = useDesign(s => s.spec)
  const colorwork = useDesign(s => s.colorwork)
  const setColorwork = useDesign(s => s.setColorwork)
  const resetColorwork = useDesign(s => s.resetColorwork)
  const target = useDesign(s => s.colorTarget)
  const setTarget = useDesign(s => s.setColorTarget)

  const hasStone = stoneOnPiece(spec)
  const alloy = alloyById(spec.metal.alloyId)
  const stone = stoneById(spec.center.stoneTypeId)
  const graded = isGradeable(spec.center.stoneTypeId)

  const metalBase = numHex(alloy.color)
  const stoneBase = numHex(graded ? colorTint(spec.center.grading.color) : stone.color)

  // The effective colour the picker should show for the active target: the
  // custom override if set, otherwise the piece's natural colour.
  const current: string =
    target === 'metal' ? (colorwork.metal ?? metalBase)
    : target === 'stone' ? (colorwork.stone ?? stoneBase)
    : (colorwork.bg ?? DEFAULT_BG)

  const swatches = target === 'metal' ? METAL_SW : target === 'stone' ? STONE_SW : BG_SW

  const apply = (hex: string) => setColorwork({ [target]: hex })
  const clearOne = () => setColorwork({ [target]: null })

  const shape = hasStone ? shapeById(spec.center.shapeId) : null

  return (
    <section className="grp colorpanel">
      <h3>Custom color</h3>
      <p className="colorpanel-hint">Pick a part on the render or a tab below, then paint it any color. Changes preview live and never touch your specs.</p>

      <div className="ctarget">
        <button aria-pressed={target === 'metal'} onClick={() => setTarget('metal')}>
          <span className="ctarget-sw" style={{ background: colorwork.metal ?? metalBase }} />
          Metal
        </button>
        <button aria-pressed={target === 'stone'} onClick={() => setTarget('stone')} disabled={!hasStone} title={hasStone ? undefined : 'This piece has no center stone'}>
          <span className="ctarget-sw" style={{ background: colorwork.stone ?? stoneBase }} />
          {hasStone && shape ? `Stone · ${shape.name}` : 'Stone'}
        </button>
        <button aria-pressed={target === 'bg'} onClick={() => setTarget('bg')}>
          <span className="ctarget-sw" style={{ background: colorwork.bg ?? DEFAULT_BG }} />
          Background
        </button>
      </div>

      <ColorPicker value={current} onChange={apply} swatches={swatches} />

      <div className="colorpanel-acts">
        <button className="sbtn" onClick={clearOne} disabled={
          target === 'metal' ? !colorwork.metal : target === 'stone' ? !colorwork.stone : !colorwork.bg
        }>Reset this</button>
        <button className="sbtn" onClick={resetColorwork} disabled={!colorwork.metal && !colorwork.stone && !colorwork.bg}>Reset all colors</button>
      </div>
    </section>
  )
}
