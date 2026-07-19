import { useState } from 'react'
import { useDesign } from '../state/design'
import { ALLOYS, SHAPES, STONES, SETTINGS, TEMPLATES, shapeById, stoneMm, alloyById, birthstoneMonth, stoneById, type Alloy } from '../catalog'
import { sizeToDiameter, sizeToCircumference, formatSize, fitAdvice, sizeConversions } from '../lib/sizing'
import { guardrails } from '../lib/pricing'
import { settingById } from '../catalog'
import {
  type ProductCategory, type BraceletKind, type EarringBack,
  CATEGORY_LABEL, hasCenterStone, stoneOnPiece, NO_STONE
} from '../spec/types'

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')
const CATEGORIES: ProductCategory[] = ['ring', 'pendant', 'earring', 'bracelet', 'necklace']

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="grp"><h3>{title}</h3>{children}</div>
}

function Slider({ id, label, value, min, max, step, display, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number
  display: string; onChange: (v: number) => void
}) {
  return (
    <>
      <div className="row"><label htmlFor={id}>{label}</label><span className="val">{display}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} />
    </>
  )
}

function CategorySwitch() {
  const { spec, setCategory } = useDesign()
  return (
    <Group title="Piece">
      <div className="opts">
        {CATEGORIES.map(c => (
          <button key={c} className="opt" aria-pressed={spec.category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
    </Group>
  )
}

function TemplatePicker() {
  const load = useDesign(s => s.load)
  return (
    <Group title="Start from a template">
      <div className="opts c2">
        {TEMPLATES.map(t => (
          <button key={t.id} className="opt tpl" onClick={() => load(t.build())}>
            {t.name}<small>{t.blurb}</small>
          </button>
        ))}
      </div>
    </Group>
  )
}

function RingControls() {
  const { spec, setRing, setFit } = useDesign()
  const advice = fitAdvice(spec.ring.size, spec.ring.width, spec.ring.fit)
  const conv = sizeConversions(spec.ring.size)
  const resize = settingById(spec.setting.typeId).resizeRange
  return (
    <>
      <Group title="Ring size">
        <Slider id="s-size" label="US size" value={spec.ring.size} min={3} max={13} step={0.25}
          display={formatSize(spec.ring.size)} onChange={v => setRing({ size: v })} />
        <p className="hint">
          Inside diameter <b>{sizeToDiameter(spec.ring.size).toFixed(2)}</b> mm ·
          circumference <b>{sizeToCircumference(spec.ring.size).toFixed(2)}</b> mm
        </p>
        <p className="hint">
          UK <b>{conv.uk}</b> · EU <b>{conv.eu.toFixed(1)}</b> · JP <b>{conv.jp}</b>
          <span style={{ opacity: 0.65 }}> · resizes {resize}</span>
        </p>
        {advice.level !== 'none' && (
          <div className={`flag ${advice.level === 'warn' ? '' : 'note'}`}>
            <b>{advice.title}</b>{advice.body}
            {advice.suggested !== undefined && (
              <button className="inline-act" onClick={() => setRing({ size: advice.suggested! })}>
                Apply size {formatSize(advice.suggested)}
              </button>
            )}
          </div>
        )}
      </Group>
      <Group title="Band">
        <Slider id="s-width" label="Width" value={spec.ring.width} min={1.5} max={9} step={0.1}
          display={`${spec.ring.width.toFixed(1)} mm`} onChange={v => setRing({ width: v })} />
        <div style={{ height: 16 }} />
        <Slider id="s-thick" label="Thickness" value={spec.ring.thickness} min={1.1} max={2.8} step={0.1}
          display={`${spec.ring.thickness.toFixed(1)} mm`} onChange={v => setRing({ thickness: v })} />
        <div className="opts c2" style={{ marginTop: 16 }}>
          <button className="opt" aria-pressed={spec.ring.fit === 'standard'} onClick={() => setFit('standard')}>
            Standard fit<small>Flat interior</small>
          </button>
          <button className="opt" aria-pressed={spec.ring.fit === 'comfort'} onClick={() => setFit('comfort')}>
            Comfort fit<small>Domed interior</small>
          </button>
        </div>
      </Group>
    </>
  )
}

function PendantControls() {
  const { spec, setPendant } = useDesign()
  const p = spec.pendant
  return (
    <Group title="Pendant & chain">
      <Slider id="p-bail" label="Bail opening" value={p.bailInner} min={2} max={8} step={0.5}
        display={`${p.bailInner.toFixed(1)} mm`} onChange={v => setPendant({ bailInner: v })} />
      <div style={{ height: 16 }} />
      <Slider id="p-gauge" label="Bail gauge" value={p.bailGauge} min={0.8} max={2.5} step={0.1}
        display={`${p.bailGauge.toFixed(1)} mm`} onChange={v => setPendant({ bailGauge: v })} />
      <div className="opts c2" style={{ marginTop: 16 }}>
        <button className="opt" aria-pressed={p.hasChain} onClick={() => setPendant({ hasChain: true })}>With chain</button>
        <button className="opt" aria-pressed={!p.hasChain} onClick={() => setPendant({ hasChain: false })}>Pendant only</button>
      </div>
      {p.hasChain && (
        <>
          <div style={{ height: 16 }} />
          <Slider id="p-len" label="Chain length" value={p.chainLength} min={14} max={30} step={2}
            display={`${p.chainLength}"`} onChange={v => setPendant({ chainLength: v })} />
        </>
      )}
    </Group>
  )
}

function EarringControls() {
  const { spec, setEarring } = useDesign()
  const e = spec.earring
  const backs: [EarringBack, string][] = [['friction', 'Friction'], ['screw', 'Screw-back'], ['lever', 'Leverback'], ['latch', 'Latch']]
  return (
    <Group title="Earrings">
      <div className="opts c2">
        <button className="opt" aria-pressed={e.pair} onClick={() => setEarring({ pair: true })}>Pair</button>
        <button className="opt" aria-pressed={!e.pair} onClick={() => setEarring({ pair: false })}>Single</button>
      </div>
      <div style={{ height: 16 }} />
      <Slider id="e-drop" label="Drop length" value={e.dropLength} min={0} max={25} step={1}
        display={e.dropLength === 0 ? 'Stud' : `${e.dropLength} mm`} onChange={v => setEarring({ dropLength: v })} />
      <div style={{ height: 16 }} />
      <Slider id="e-post" label="Post length" value={e.postLength} min={8} max={13} step={0.5}
        display={`${e.postLength.toFixed(1)} mm`} onChange={v => setEarring({ postLength: v })} />
      <div className="row" style={{ marginTop: 16 }}><label>Back</label></div>
      <div className="opts c2">
        {backs.map(([id, name]) => (
          <button key={id} className="opt" aria-pressed={e.back === id} onClick={() => setEarring({ back: id })}>{name}</button>
        ))}
      </div>
    </Group>
  )
}

function BraceletControls() {
  const { spec, setBracelet } = useDesign()
  const b = spec.bracelet
  const kinds: [BraceletKind, string][] = [['tennis', 'Tennis'], ['bangle', 'Bangle'], ['cuff', 'Cuff'], ['chain', 'Chain']]
  return (
    <Group title="Bracelet">
      <div className="opts c2">
        {kinds.map(([id, name]) => (
          <button key={id} className="opt" aria-pressed={b.kind === id} onClick={() => setBracelet({ kind: id })}>{name}</button>
        ))}
      </div>
      <div style={{ height: 16 }} />
      <Slider id="b-wrist" label="Wrist" value={b.wristCircumference} min={130} max={220} step={1}
        display={`${b.wristCircumference} mm · ${(b.wristCircumference / 25.4).toFixed(1)}"`} onChange={v => setBracelet({ wristCircumference: v })} />
      <div style={{ height: 16 }} />
      <Slider id="b-fit" label="Fit allowance" value={b.fitAllowance} min={5} max={25} step={1}
        display={`+${b.fitAllowance} mm`} onChange={v => setBracelet({ fitAllowance: v })} />
      {(b.kind === 'bangle' || b.kind === 'cuff') && (
        <>
          <div style={{ height: 16 }} />
          <Slider id="b-w" label="Width" value={b.width} min={2} max={12} step={0.5}
            display={`${b.width.toFixed(1)} mm`} onChange={v => setBracelet({ width: v })} />
          <div style={{ height: 16 }} />
          <Slider id="b-t" label="Thickness" value={b.thickness} min={1.2} max={4} step={0.1}
            display={`${b.thickness.toFixed(1)} mm`} onChange={v => setBracelet({ thickness: v })} />
        </>
      )}
      {b.kind === 'tennis' && (
        <>
          <div style={{ height: 16 }} />
          <Slider id="b-links" label="Stone count" value={b.linkCount} min={20} max={70} step={1}
            display={`${b.linkCount} stones`} onChange={v => setBracelet({ linkCount: v })} />
          <p className="hint">Carat slider below sets <b>total</b> weight; each stone is {(spec.center.carat / b.linkCount).toFixed(3)} ct.</p>
        </>
      )}
    </Group>
  )
}

function NecklaceControls() {
  const { spec, setNecklace } = useDesign()
  const n = spec.necklace
  const labels: [number, string][] = [[14, 'Choker'], [16, 'Choker'], [18, 'Princess'], [20, 'Matinee'], [24, 'Opera'], [30, 'Rope']]
  const label = labels.reduce((acc, [len, name]) => n.length >= len ? name : acc, 'Collar')
  return (
    <Group title="Necklace">
      <Slider id="n-len" label="Length" value={n.length} min={14} max={30} step={1}
        display={`${n.length}" · ${label}`} onChange={v => setNecklace({ length: v })} />
      <div style={{ height: 16 }} />
      <Slider id="n-gauge" label="Chain gauge" value={n.gauge} min={0.6} max={3} step={0.1}
        display={`${n.gauge.toFixed(1)} mm`} onChange={v => setNecklace({ gauge: v })} />
      <div className="opts c2" style={{ marginTop: 16 }}>
        <button className="opt" aria-pressed={!n.hasPendant} onClick={() => setNecklace({ hasPendant: false })}>Chain only</button>
        <button className="opt" aria-pressed={n.hasPendant} onClick={() => setNecklace({ hasPendant: true })}>With pendant</button>
      </div>
    </Group>
  )
}

const METAL_GROUPS: [string, (a: Alloy) => boolean][] = [
  ['Gold', a => a.symbol === 'Au'],
  ['Platinum group', a => a.symbol === 'Pt' || a.symbol === 'Pd'],
  ['Silver', a => a.symbol === 'Ag'],
  ['Contemporary', a => !a.precious]
]

function MetalGroup() {
  const { spec, setAlloy, setRhodium } = useDesign()
  const [nickelFree, setNickelFree] = useState(false)
  const active = alloyById(spec.metal.alloyId)
  const list = nickelFree ? ALLOYS.filter(a => a.nickelFree) : ALLOYS

  return (
    <Group title="Metal">
      <label className="filter-row">
        <input type="checkbox" checked={nickelFree} onChange={e => setNickelFree(e.target.checked)} />
        Nickel-free only
      </label>
      {METAL_GROUPS.map(([label, pred]) => {
        const items = list.filter(pred)
        if (!items.length) return null
        return (
          <div key={label} className="metal-sub">
            <p className="subhead">{label}</p>
            <div className="opts">
              {items.map(a => (
                <button key={a.id} className="opt" aria-pressed={spec.metal.alloyId === a.id} onClick={() => setAlloy(a.id)}>
                  <span className="sw" style={{ background: hex(a.color) }} />
                  {a.short}<small>{a.density} g/cm³</small>
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {active.platable && (
        <label className="filter-row" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={!!spec.metal.rhodium} onChange={e => setRhodium(e.target.checked)} />
          Rhodium plated<small>white finish, re-plate every 12–18 mo</small>
        </label>
      )}
      {!active.precious && active.note && <div className="flag note"><b>{active.name}</b>{active.note}</div>}
    </Group>
  )
}

export function Controls() {
  const { spec, setShape, setStone, setCarat, setSetting } = useDesign()
  const shape = shapeById(spec.center.shapeId)
  const mm = stoneMm(shape, spec.center.carat)
  const rails = guardrails(spec)

  const tennis = spec.category === 'bracelet' && spec.bracelet.kind === 'tennis'
  const necklacePendant = spec.category === 'necklace' && spec.necklace.hasPendant
  // Categories where a stone is relevant at all
  const stoneRelevant = hasCenterStone(spec.category) || tennis || necklacePendant
  // Whether a plain (unstoned) option is meaningful — a plain tennis is just a chain
  const plainAllowed = hasCenterStone(spec.category)
  const active = stoneOnPiece(spec)
  const caratLabel = tennis ? 'Total carat' : 'Center stone'

  return (
    <>
      <CategorySwitch />
      <TemplatePicker />

      {spec.category === 'ring' && <RingControls />}
      {spec.category === 'pendant' && <PendantControls />}
      {spec.category === 'earring' && <EarringControls />}
      {spec.category === 'bracelet' && <BraceletControls />}
      {spec.category === 'necklace' && <NecklaceControls />}

      <MetalGroup />

      {stoneRelevant && plainAllowed && (
        <Group title="Stone">
          <div className="opts c2">
            <button className="opt" aria-pressed={active} onClick={() => setStone(active ? spec.center.stoneTypeId : 'dia')}>
              Set a stone
            </button>
            <button className="opt" aria-pressed={!active} onClick={() => setStone(NO_STONE)}>
              No stone<small>Plain band</small>
            </button>
          </div>
        </Group>
      )}

      {stoneRelevant && active && (
        <>
          <Group title="Stone shape">
            <div className="opts">
              {SHAPES.map(s => (
                <button key={s.id} className="opt" aria-pressed={spec.center.shapeId === s.id} onClick={() => setShape(s.id)}>
                  <span className="shp">
                    <svg viewBox="0 0 24 24"><path d={s.icon} fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                  </span>
                  {s.name}
                </button>
              ))}
            </div>
          </Group>

          <Group title="Stone type">
            <div className="opts c2">
              {STONES.map(s => (
                <button key={s.id} className="opt" aria-pressed={spec.center.stoneTypeId === s.id} onClick={() => setStone(s.id)}>
                  {s.name}<small>{s.variety}</small>
                </button>
              ))}
            </div>
            {(() => {
              const st = stoneById(spec.center.stoneTypeId)
              const bm = birthstoneMonth(st)
              return <p className="hint">Mohs <b>{st.mohs}</b>{st.treatment ? ` · ${st.treatment}` : ''}{bm ? ` · ${bm} birthstone` : ''}</p>
            })()}
          </Group>

          <Group title="Carat weight">
            <Slider id="s-ct" label={caratLabel} value={spec.center.carat} min={0.25} max={5} step={0.05}
              display={`${spec.center.carat.toFixed(2)} ct`} onChange={setCarat} />
            <p className="hint">
              {tennis
                ? <>Each of {spec.bracelet.linkCount} stones ≈ <b>{(spec.center.carat / spec.bracelet.linkCount).toFixed(3)}</b> ct</>
                : <>Measures <b>{mm.length.toFixed(2)} × {mm.width.toFixed(2)}</b> mm · millimetre size is shape-dependent</>}
            </p>
          </Group>

          <Group title="Setting">
            <div className="opts c2">
              {SETTINGS.map(s => (
                <button key={s.id} className="opt" aria-pressed={spec.setting.typeId === s.id} onClick={() => setSetting(s.id)}>
                  {s.name}<small>{s.variety}</small>
                </button>
              ))}
            </div>
            {rails.map((g, i) => (
              <div key={i} className={`flag ${g.level === 'ok' ? 'ok' : g.level === 'note' ? 'note' : ''}`}>
                <b>{g.title}</b>{g.body}
              </div>
            ))}
          </Group>
        </>
      )}
    </>
  )
}
