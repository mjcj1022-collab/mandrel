export interface SettingType {
  id: string
  name: string
  variety: string
  prongs: number
  bezel: boolean
  fee: number
  finishPenalty: number
  resizeRange: string
  melee?: number      // count of accent stones (halo, pavé, channel, sides)
  accentCt?: number   // carat of each accent stone
  note?: string
}

export const SETTINGS: SettingType[] = [
  { id:'p4',  name:'4-prong',   variety:'Classic',      prongs:4, bezel:false, fee:85,  finishPenalty:0,     resizeRange:'plus or minus 2 sizes' },
  { id:'p6',  name:'6-prong',   variety:'Tiffany',      prongs:6, bezel:false, fee:110, finishPenalty:0.005, resizeRange:'plus or minus 2 sizes' },
  { id:'p8',  name:'Compass',   variety:'8-prong',      prongs:8, bezel:false, fee:140, finishPenalty:0.01,  resizeRange:'plus or minus 2 sizes' },
  { id:'dc',  name:'Double-claw', variety:'Secure',     prongs:8, bezel:false, fee:150, finishPenalty:0.01,  resizeRange:'plus or minus 2 sizes' },
  { id:'bz',  name:'Bezel',     variety:'Protective',   prongs:0, bezel:true,  fee:145, finishPenalty:0.015, resizeRange:'plus or minus 1 size' },
  { id:'fl',  name:'Flush',     variety:'Gypsy / burnish', prongs:0, bezel:true, fee:120, finishPenalty:0,   resizeRange:'plus or minus 2 sizes', note:'Set into the metal; low-profile and snag-free.' },
  { id:'hal', name:'Halo',      variety:'Single',       prongs:4, bezel:false, fee:240, finishPenalty:0.02,  resizeRange:'plus or minus 1 size', melee:16, accentCt:0.01 },
  { id:'hl2', name:'Double halo', variety:'Layered',    prongs:4, bezel:false, fee:360, finishPenalty:0.025, resizeRange:'plus or minus 1 size', melee:34, accentCt:0.01 },
  { id:'pav', name:'Pavé',      variety:'Bright-cut',   prongs:4, bezel:false, fee:260, finishPenalty:0.02,  resizeRange:'not recommended', melee:20, accentCt:0.015, note:'Pavé shank resists resizing without disturbing the stones.' },
  { id:'chn', name:'Channel',   variety:'Flush row',    prongs:4, bezel:false, fee:220, finishPenalty:0.015, resizeRange:'plus or minus 1 size', melee:10, accentCt:0.03 },
  { id:'ten', name:'Tension',   variety:'Pressure-held', prongs:0, bezel:false, fee:320, finishPenalty:0.02, resizeRange:'not resizable', note:'Held by spring tension in the shank; cannot be resized after making.' },
  { id:'th3', name:'Three-stone', variety:'Trilogy',    prongs:6, bezel:false, fee:200, finishPenalty:0.015, resizeRange:'plus or minus 1 size', melee:2, accentCt:0.35 }
]

export const settingById = (id: string): SettingType => SETTINGS.find(s => s.id === id) ?? SETTINGS[0]
