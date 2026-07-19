/** Stone types. rate is $/ct at 1.00 ct; price scales superlinearly with size. */
export interface StoneType {
  id: string
  name: string
  variety: string
  rate: number
  exponent: number
  mohs: number
  color: number
  ior: number
  transparent: boolean
  labGrown: boolean
  treatment?: string
  care?: string
  birthstone?: number   // month 1-12
}

export const STONES: StoneType[] = [
  { id:'dia', name:'Diamond',    variety:'Natural, G/VS',   rate:5200, exponent:1.55, mohs:10,   color:0xFFFFFF, ior:2.42, transparent:true,  labGrown:false, birthstone:4 },
  { id:'lab', name:'Diamond',    variety:'Lab-grown, G/VS', rate:900,  exponent:1.30, mohs:10,   color:0xFFFFFF, ior:2.42, transparent:true,  labGrown:true },
  { id:'moi', name:'Moissanite', variety:'Near-colorless',  rate:400,  exponent:1.15, mohs:9.25, color:0xFAFFFA, ior:2.65, transparent:true,  labGrown:true },
  { id:'wsp', name:'White Sapphire', variety:'Colorless',   rate:250,  exponent:1.20, mohs:9,    color:0xF4F6FA, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated' },
  { id:'sap', name:'Sapphire',   variety:'Blue',            rate:1100, exponent:1.40, mohs:9,    color:0x1E4FA8, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated', birthstone:9 },
  { id:'psp', name:'Sapphire',   variety:'Pink',            rate:900,  exponent:1.38, mohs:9,    color:0xE06A9A, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated' },
  { id:'ysp', name:'Sapphire',   variety:'Yellow',          rate:600,  exponent:1.32, mohs:9,    color:0xEFC94A, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated' },
  { id:'rub', name:'Ruby',       variety:'Pigeon blood',    rate:1800, exponent:1.60, mohs:9,    color:0xB01430, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated', birthstone:7 },
  { id:'eme', name:'Emerald',    variety:'Colombian',       rate:1500, exponent:1.50, mohs:7.5,  color:0x0E7A4A, ior:1.58, transparent:true,  labGrown:false, treatment:'Oiled', care:'Never ultrasonic. Cleaning strips the oiling.', birthstone:5 },
  { id:'alx', name:'Alexandrite',variety:'Colour-change',   rate:8000, exponent:1.55, mohs:8.5,  color:0x5A7A5A, ior:1.746,transparent:true,  labGrown:false, birthstone:6 },
  { id:'aqu', name:'Aquamarine', variety:'Santa Maria',     rate:320,  exponent:1.25, mohs:7.75, color:0x9FD4DE, ior:1.58, transparent:true,  labGrown:false, birthstone:3 },
  { id:'mor', name:'Morganite',  variety:'Peach',           rate:130,  exponent:1.10, mohs:7.75, color:0xE8A894, ior:1.58, transparent:true,  labGrown:false },
  { id:'spn', name:'Spinel',     variety:'Red',             rate:700,  exponent:1.45, mohs:8,    color:0xC0304A, ior:1.72, transparent:true,  labGrown:false },
  { id:'tan', name:'Tanzanite',  variety:'Violet-blue',     rate:600,  exponent:1.35, mohs:6.5,  color:0x5B4BC4, ior:1.69, transparent:true,  labGrown:false, treatment:'Heated', care:'Cleaves easily. Avoid knocks and thermal shock.', birthstone:12 },
  { id:'tur', name:'Tourmaline', variety:'Green',           rate:300,  exponent:1.30, mohs:7.25, color:0x2E8B57, ior:1.62, transparent:true,  labGrown:false, birthstone:10 },
  { id:'tsv', name:'Tsavorite',  variety:'Garnet, green',   rate:900,  exponent:1.42, mohs:7.25, color:0x1F8A4C, ior:1.74, transparent:true,  labGrown:false },
  { id:'gar', name:'Garnet',     variety:'Almandine red',   rate:90,   exponent:1.15, mohs:7.25, color:0x7A1F2B, ior:1.79, transparent:true,  labGrown:false, birthstone:1 },
  { id:'per', name:'Peridot',    variety:'Olivine',         rate:80,   exponent:1.15, mohs:6.75, color:0x9AB83C, ior:1.65, transparent:true,  labGrown:false, care:'Sensitive to acids and thermal shock.', birthstone:8 },
  { id:'ame', name:'Amethyst',   variety:'Siberian',        rate:45,   exponent:1.05, mohs:7,    color:0x7B4FBF, ior:1.54, transparent:true,  labGrown:false, birthstone:2 },
  { id:'cit', name:'Citrine',    variety:'Madeira',         rate:35,   exponent:1.05, mohs:7,    color:0xC9781F, ior:1.55, transparent:true,  labGrown:false, treatment:'Heated', birthstone:11 },
  { id:'tpz', name:'Topaz',      variety:'Blue',            rate:40,   exponent:1.10, mohs:8,    color:0x7EC8E3, ior:1.62, transparent:true,  labGrown:false, treatment:'Irradiated', birthstone:12 },
  { id:'opa', name:'Opal',       variety:'Australian',      rate:350,  exponent:1.20, mohs:5.5,  color:0xCFE7E0, ior:1.45, transparent:false, labGrown:false, care:'Dehydrates and crazes. Never ultrasonic.', birthstone:10 },
  { id:'tqs', name:'Turquoise',  variety:'Sleeping Beauty', rate:60,   exponent:1.00, mohs:6,    color:0x37B5B0, ior:1.61, transparent:false, labGrown:false, treatment:'Stabilized', care:'Porous; keep from oils and heat.', birthstone:12 },
  { id:'lap', name:'Lapis Lazuli',variety:'Afghan',         rate:50,   exponent:1.00, mohs:5.5,  color:0x25429B, ior:1.50, transparent:false, labGrown:false, care:'Soft and porous; avoid ultrasonic and acids.' },
  { id:'onx', name:'Onyx',       variety:'Black',           rate:20,   exponent:1.00, mohs:7,    color:0x18181A, ior:1.55, transparent:false, labGrown:false, treatment:'Dyed' },
  { id:'pea', name:'Pearl',      variety:'Akoya',           rate:200,  exponent:1.00, mohs:2.75, color:0xF2EDE4, ior:1.53, transparent:false, labGrown:false, care:'Dissolved by acid and perfume. Set last, never in a daily ring.', birthstone:6 }
]

export const stoneById = (id: string): StoneType => STONES.find(s => s.id === id) ?? STONES[0]

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const birthstoneMonth = (s: StoneType): string | undefined => (s.birthstone ? MONTHS[s.birthstone] : undefined)
