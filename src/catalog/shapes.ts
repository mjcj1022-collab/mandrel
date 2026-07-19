/**
 * Stone shapes. mm size is SHAPE-DEPENDENT — one formula does not work.
 *   width_mm  = mmFactor * cbrt(carat)
 *   length_mm = width_mm * lwRatio
 */
export interface StoneShape {
  id: string
  name: string
  segments: number
  mmFactor: number
  lwRatio: number
  icon: string
}

export const SHAPES: StoneShape[] = [
  { id:'rd', name:'Round',    segments:16, mmFactor:6.47, lwRatio:1.00, icon:'M12 2a10 10 0 100 20 10 10 0 100-20z' },
  { id:'ov', name:'Oval',     segments:16, mmFactor:5.70, lwRatio:1.35, icon:'M12 1c4 0 7 5 7 11s-3 11-7 11-7-5-7-11S8 1 12 1z' },
  { id:'cu', name:'Cushion',  segments:8,  mmFactor:5.50, lwRatio:1.00, icon:'M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z' },
  { id:'pr', name:'Princess', segments:4,  mmFactor:5.50, lwRatio:1.00, icon:'M2 2h20v20H2z' },
  { id:'em', name:'Emerald',  segments:8,  mmFactor:5.00, lwRatio:1.40, icon:'M8 1h8l4 4v14l-4 4H8l-4-4V5z' },
  { id:'as', name:'Asscher',  segments:8,  mmFactor:5.35, lwRatio:1.00, icon:'M7 1h10l6 6v10l-6 6H7l-6-6V7z' },
  { id:'ra', name:'Radiant',  segments:8,  mmFactor:5.20, lwRatio:1.25, icon:'M7 1h10l5 5v12l-5 5H7l-5-5V6z' },
  { id:'pe', name:'Pear',     segments:16, mmFactor:5.30, lwRatio:1.50, icon:'M12 1c3 5 7 8 7 13a7 7 0 11-14 0c0-5 4-8 7-13z' },
  { id:'ma', name:'Marquise', segments:16, mmFactor:4.55, lwRatio:2.00, icon:'M12 1c4 4 6 8 6 11s-2 7-6 11c-4-4-6-8-6-11s2-7 6-11z' },
  { id:'he', name:'Heart',    segments:16, mmFactor:5.55, lwRatio:1.00, icon:'M12 22C6 17 2 13 2 9a5 5 0 0110-2 5 5 0 0110 2c0 4-4 8-10 13z' },
  { id:'tr', name:'Trillion', segments:3,  mmFactor:6.00, lwRatio:1.00, icon:'M12 3 L21 20 L3 20 Z' },
  { id:'bg', name:'Baguette', segments:4,  mmFactor:3.80, lwRatio:2.50, icon:'M8 2 h8 v20 h-8 z' },
  { id:'oe', name:'Old European', segments:16, mmFactor:6.20, lwRatio:1.00, icon:'M12 2a10 10 0 100 20 10 10 0 100-20z' },
  { id:'ro', name:'Rose cut', segments:12, mmFactor:6.60, lwRatio:1.00, icon:'M12 3 L20 12 L12 21 L4 12 Z' },
  { id:'ca', name:'Cabochon', segments:32, mmFactor:6.30, lwRatio:1.00, icon:'M3 15 a9 7 0 0118 0 z' },
  { id:'br', name:'Briolette', segments:12, mmFactor:4.80, lwRatio:1.60, icon:'M12 2c3 5 6 8 6 12a6 6 0 01-12 0c0-4 3-7 6-12z' }
]

export const shapeById = (id: string): StoneShape => SHAPES.find(s => s.id === id) ?? SHAPES[0]

export const stoneMm = (shape: StoneShape, carat: number) => {
  const width = shape.mmFactor * Math.cbrt(carat)
  return { width, length: width * shape.lwRatio }
}
