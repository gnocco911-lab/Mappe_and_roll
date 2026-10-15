// Texture generate proceduralmente (nessuna immagine esterna, nessuna licenza).
// Ogni texture è una piastrella 512x512 px "senza cuciture" che copre 2x2 caselle.
// Il generatore usa un rumore casuale con seme fisso: il risultato è sempre lo stesso.

export const TILE = 512
/** Quante caselle copre una piastrella (per lato). */
export const TILE_CELLS = 2

export interface TextureDef {
  id: string
  name: string
  /** colore medio, usato per le anteprime e per la modalità "chiara" */
  base: string
  draw: (g: CanvasRenderingContext2D, rnd: () => number) => void
}

// ------------------------------------------------------------ numeri casuali e rumore

/** Generatore pseudo-casuale con seme (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 100000) / 100000
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Rumore a valori periodico: si ripete ogni px celle in x e py celle in y (per piastrelle senza cuciture). */
function vnoise(x: number, y: number, px: number, py: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const mx = (v: number) => ((v % px) + px) % px
  const my = (v: number) => ((v % py) + py) % py
  const a = hash2(mx(x0), my(y0), seed)
  const b = hash2(mx(x0 + 1), my(y0), seed)
  const c = hash2(mx(x0), my(y0 + 1), seed)
  const d = hash2(mx(x0 + 1), my(y0 + 1), seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/**
 * Rumore frattale (più ottave). `freq` = numero di celle di rumore sulla piastrella
 * (intero, per garantire la ripetizione perfetta); `sy` permette di allungare in verticale.
 */
function fbm(u: number, v: number, freq: number, octaves: number, seed: number, fy = freq): number {
  let amp = 0.5
  let sum = 0
  let norm = 0
  let fx = freq
  let fyy = fy
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(u * fx, v * fyy, fx, fyy, seed + o * 17)
    norm += amp
    amp *= 0.5
    fx *= 2
    fyy *= 2
  }
  return sum / norm
}

type RGB = [number, number, number]
const hexToRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
]

/** Riempie la piastrella calcolando il colore pixel per pixel. */
function perPixel(g: CanvasRenderingContext2D, fn: (u: number, v: number, x: number, y: number) => RGB) {
  const img = g.createImageData(TILE, TILE)
  const d = img.data
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const c = fn(x / TILE, y / TILE, x, y)
      const i = (y * TILE + x) * 4
      d[i] = c[0]
      d[i + 1] = c[1]
      d[i + 2] = c[2]
      d[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
}

/** Disegna una forma anche ripetuta ai bordi opposti, così la piastrella resta continua. */
function wrapped(g: CanvasRenderingContext2D, x: number, y: number, r: number, fn: (x: number, y: number) => void) {
  for (const dx of [-TILE, 0, TILE]) {
    for (const dy of [-TILE, 0, TILE]) {
      const px = x + dx
      const py = y + dy
      if (px < -r || py < -r || px > TILE + r || py > TILE + r) continue
      fn(px, py)
    }
  }
}

// ------------------------------------------------------------ le texture

const stone: TextureDef = {
  id: 'pietra',
  name: 'Pietra',
  base: '#8a8780',
  draw(g, rnd) {
    // lastroni irregolari su 4 file, con malta scura tra l'uno e l'altro
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 8, 4, 11)
      const grain = vnoise(u * 128, v * 128, 128, 128, 5)
      const t = 0.35 + n * 0.5 + (grain - 0.5) * 0.12
      return mix([100, 98, 95], [160, 156, 148], t)
    })
    const rows = 3
    const rh = TILE / rows
    for (let r = 0; r < rows; r++) {
      let x = rnd() * 60
      const startX = x
      while (x < startX + TILE) {
        const w = 120 + rnd() * 130
        const end = Math.min(x + w, startX + TILE)
        const shade = (rnd() - 0.5) * 26
        wrapped(g, x, r * rh, TILE, (px, py) => {
          g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade / 255})` : `rgba(0,0,0,${-shade / 255})`
          g.fillRect(px, py, end - x, rh)
          g.strokeStyle = 'rgba(40,38,36,0.6)'
          g.lineWidth = 3
          g.strokeRect(px + 2, py + 2, end - x - 4, rh - 4)
          g.strokeStyle = 'rgba(255,255,255,0.18)'
          g.lineWidth = 2
          g.beginPath()
          g.moveTo(px + 5, py + rh - 6)
          g.lineTo(px + 5, py + 5)
          g.lineTo(px + end - x - 6, py + 5)
          g.stroke()
        })
        x = end
      }
    }
  }
}

const wood: TextureDef = {
  id: 'legno',
  name: 'Legno',
  base: '#9a6b3c',
  draw(g, rnd) {
    const planks = 8
    const ph = TILE / planks
    for (let p = 0; p < planks; p++) {
      const tone = rnd()
      const seed = 100 + p * 7
      const y0 = Math.floor(p * ph)
      const y1 = Math.floor((p + 1) * ph)
      const imgH = y1 - y0
      const img = g.createImageData(TILE, imgH)
      const shift = Math.floor(rnd() * 8)
      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < TILE; x++) {
          const u = x / TILE
          const v = y / imgH
          const warp = fbm(u, v * 0.3, 2, 2, seed) * 0.6
          const ring = Math.sin((v * 5 + warp * 6) * Math.PI * 2) * 0.5 + 0.5
          const streak = vnoise(u * 3 + shift, y * 0.9, 3, 99999, seed + 3)
          const t = 0.35 + tone * 0.25 + ring * 0.12 + streak * 0.15
          const c = mix([92, 58, 30], [170, 118, 68], Math.min(1, t))
          const i = (y * TILE + x) * 4
          img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255
        }
      }
      g.putImageData(img, 0, y0)
      // fessura tra le assi e giunzioni
      g.fillStyle = 'rgba(30,18,8,0.8)'
      g.fillRect(0, y0, TILE, 3)
      g.fillStyle = 'rgba(255,230,190,0.12)'
      g.fillRect(0, y0 + 3, TILE, 2)
      const jx = rnd() * TILE
      g.fillStyle = 'rgba(30,18,8,0.7)'
      g.fillRect(jx, y0, 3, imgH)
      // chiodi
      g.fillStyle = 'rgba(40,28,16,0.8)'
      for (const x of [jx - 14, jx + 17]) {
        for (const yy of [y0 + 12, y1 - 12]) {
          g.beginPath(); g.arc((x + TILE) % TILE, yy, 2.2, 0, 7); g.fill()
        }
      }
    }
  }
}

const grass: TextureDef = {
  id: 'erba',
  name: 'Erba',
  base: '#5f8f3e',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 4, 5, 21)
      const f = vnoise(u * 96, v * 96, 96, 96, 3)
      return mix([56, 96, 40], [112, 158, 66], Math.min(1, n * 1.15 + (f - 0.5) * 0.18))
    })
    // fili d'erba
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const len = 5 + rnd() * 9
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.1
      const light = rnd() > 0.5
      g.strokeStyle = light ? 'rgba(170,210,100,0.55)' : 'rgba(30,70,25,0.5)'
      g.lineWidth = 1.4
      wrapped(g, x, y, len, (px, py) => {
        g.beginPath()
        g.moveTo(px, py)
        g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len)
        g.stroke()
      })
    }
  }
}

const dirt: TextureDef = {
  id: 'terra',
  name: 'Terra',
  base: '#80603f',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 5, 5, 31)
      const f = vnoise(u * 128, v * 128, 128, 128, 9)
      return mix([96, 68, 42], [152, 112, 74], Math.min(1, n * 1.2 + (f - 0.5) * 0.2))
    })
    for (let i = 0; i < 220; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const r = 1.5 + rnd() * 4.5
      const tone = 90 + rnd() * 70
      const rot = rnd() * 3
      wrapped(g, x, y, r, (px, py) => {
        g.fillStyle = `rgba(${tone},${tone * 0.85},${tone * 0.68},0.85)`
        g.beginPath(); g.ellipse(px, py, r, r * 0.75, rot, 0, 7); g.fill()
        g.fillStyle = 'rgba(40,25,12,0.35)'
        g.beginPath(); g.ellipse(px + 1, py + 1.5, r, r * 0.7, 0, 0, 7); g.fill()
      })
    }
  }
}

const sand: TextureDef = {
  id: 'sabbia',
  name: 'Sabbia',
  base: '#d9c28e',
  draw(g) {
    perPixel(g, (u, v) => {
      const warp = fbm(u, v, 3, 3, 41) * 2.2
      const dune = Math.sin((v * 6 + warp) * Math.PI * 2 + u * Math.PI * 4) * 0.5 + 0.5
      const f = vnoise(u * 200, v * 200, 200, 200, 7)
      const t = 0.45 + dune * 0.22 + (f - 0.5) * 0.28
      return mix([196, 164, 108], [240, 222, 170], Math.min(1, Math.max(0, t)))
    })
  }
}

const water: TextureDef = {
  id: 'acqua',
  name: 'Acqua',
  base: '#3d7fb8',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 4, 4, 51)
      const w = fbm(u + n * 0.15, v, 6, 3, 52, 14)
      return mix([28, 84, 150], [74, 150, 205], Math.min(1, n * 0.8 + w * 0.4))
    })
    // creste d'onda
    g.lineCap = 'round'
    for (let i = 0; i < 90; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const len = 18 + rnd() * 34
      g.strokeStyle = `rgba(210,238,255,${0.18 + rnd() * 0.25})`
      g.lineWidth = 1.5 + rnd() * 1.5
      const bend = 6 + rnd() * 3
      wrapped(g, x, y, len, (px, py) => {
        g.beginPath()
        g.moveTo(px, py)
        g.quadraticCurveTo(px + len / 2, py - bend, px + len, py)
        g.stroke()
      })
    }
  }
}

const lava: TextureDef = {
  id: 'lava',
  name: 'Lava',
  base: '#c2400f',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 4, 5, 61)
      // crepe luminose dove il rumore è vicino a 0.5
      const crack = 1 - Math.min(1, Math.abs(n - 0.5) * 7)
      const crust = fbm(u, v, 8, 3, 63)
      const base = mix([38, 14, 10], [96, 30, 14], crust)
      return mix(base, [255, 170, 40], Math.pow(crack, 1.6))
    })
    for (let i = 0; i < 40; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const r = 2 + rnd() * 5
      wrapped(g, x, y, r, (px, py) => {
        g.fillStyle = 'rgba(255,220,100,0.55)'
        g.beginPath(); g.arc(px, py, r, 0, 7); g.fill()
      })
    }
  }
}

const snow: TextureDef = {
  id: 'neve',
  name: 'Neve',
  base: '#eef3f8',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 4, 4, 71)
      const f = vnoise(u * 160, v * 160, 160, 160, 2)
      return mix([214, 226, 240], [252, 253, 255], Math.min(1, n * 1.1 + (f - 0.5) * 0.12))
    })
    for (let i = 0; i < 260; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const r = 0.8 + rnd() * 1.6
      wrapped(g, x, y, r, (px, py) => {
        g.fillStyle = 'rgba(255,255,255,0.95)'
        g.beginPath(); g.arc(px, py, r, 0, 7); g.fill()
      })
    }
  }
}

const ice: TextureDef = {
  id: 'ghiaccio',
  name: 'Ghiaccio',
  base: '#a8d8ea',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 3, 4, 81)
      const crack = 1 - Math.min(1, Math.abs(fbm(u, v, 6, 2, 83) - 0.5) * 14)
      const base = mix([150, 205, 230], [222, 244, 252], n)
      return mix(base, [255, 255, 255], Math.pow(crack, 2) * 0.8)
    })
    g.strokeStyle = 'rgba(255,255,255,0.6)'
    g.lineWidth = 2
    for (let i = 0; i < 14; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const a = rnd() * 6.28
      const len = 30 + rnd() * 60
      const j1 = (rnd() - 0.5) * 10
      const j2 = (rnd() - 0.5) * 10
      wrapped(g, x, y, len, (px, py) => {
        g.beginPath()
        g.moveTo(px, py)
        g.lineTo(px + Math.cos(a) * len * 0.5 + j1, py + Math.sin(a) * len * 0.5)
        g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len + j2)
        g.stroke()
      })
    }
  }
}

const swamp: TextureDef = {
  id: 'palude',
  name: 'Palude',
  base: '#5a6b3a',
  draw(g, rnd) {
    perPixel(g, (u, v) => {
      const n = fbm(u, v, 4, 5, 91)
      const pool = n > 0.52 ? Math.min(1, (n - 0.52) * 6) : 0
      const mud = mix([70, 78, 38], [112, 112, 60], fbm(u, v, 9, 3, 93))
      return mix(mud, [44, 74, 66], pool)
    })
    // canne e ciuffi
    for (let i = 0; i < 260; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const len = 6 + rnd() * 10
      g.strokeStyle = rnd() > 0.5 ? 'rgba(140,160,70,0.7)' : 'rgba(40,60,28,0.7)'
      g.lineWidth = 1.5
      const a = -Math.PI / 2 + (rnd() - 0.5) * 0.9
      wrapped(g, x, y, len, (px, py) => {
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); g.stroke()
      })
    }
    // foglie di ninfea
    for (let i = 0; i < 14; i++) {
      const x = rnd() * TILE
      const y = rnd() * TILE
      const r = 7 + rnd() * 7
      wrapped(g, x, y, r, (px, py) => {
        g.fillStyle = 'rgba(86,130,60,0.85)'
        g.beginPath(); g.arc(px, py, r, 0.4, 6.0); g.lineTo(px, py); g.fill()
      })
    }
  }
}

export const TEXTURES: TextureDef[] = [stone, wood, grass, dirt, sand, water, lava, snow, ice, swamp]
export const TEXTURE_BY_ID: Record<string, TextureDef> = Object.fromEntries(TEXTURES.map((t) => [t.id, t]))

// ------------------------------------------------------------ cache

const tileCache = new Map<string, HTMLCanvasElement>()
const patternCache = new Map<string, CanvasPattern>()

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Piastrella della texture (a colori, oppure schiarita per il risparmio d'inchiostro). */
export function getTextureTile(id: string, light = false): HTMLCanvasElement {
  const key = `${id}:${light ? 'l' : 'c'}`
  let tile = tileCache.get(key)
  if (tile) return tile
  const def = TEXTURE_BY_ID[id] ?? stone
  if (light) {
    const src = getTextureTile(def.id, false)
    tile = document.createElement('canvas')
    tile.width = tile.height = TILE
    const g = tile.getContext('2d')!
    g.drawImage(src, 0, 0)
    // schiarisce molto: resta solo un leggero disegno di fondo
    g.fillStyle = 'rgba(255,255,255,0.78)'
    g.fillRect(0, 0, TILE, TILE)
  } else {
    tile = document.createElement('canvas')
    tile.width = tile.height = TILE
    const g = tile.getContext('2d')!
    def.draw(g, makeRng(hashStr(def.id)))
  }
  tileCache.set(key, tile)
  return tile
}

/**
 * Pattern da usare come `fillStyle`. Le coordinate del "mondo" sono in pixel con 100 px = 1 casella,
 * quindi la piastrella (2 caselle) viene scalata a 200 px.
 */
export function getTexturePattern(ctx: CanvasRenderingContext2D, id: string, light = false): CanvasPattern {
  const tile = getTextureTile(id, light)
  // il pattern è legato al contesto solo per creazione: si può riusare tra canvas diversi
  const key = `${id}:${light ? 'l' : 'c'}`
  let p = patternCache.get(key)
  if (!p) {
    p = ctx.createPattern(tile, 'repeat')!
    const s = (TILE_CELLS * 100) / TILE
    p.setTransform(new DOMMatrix().scale(s, s))
    patternCache.set(key, p)
  }
  return p
}

/** Anteprima quadrata (data URL) per i pulsanti del pannello. */
const swatchCache = new Map<string, string>()
export function getTextureSwatch(id: string, size = 48): string {
  const key = `${id}:${size}`
  let s = swatchCache.get(key)
  if (!s) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')!
    g.drawImage(getTextureTile(id), 0, 0, TILE, TILE, 0, 0, size, size)
    s = c.toDataURL('image/png')
    swatchCache.set(key, s)
  }
  return s
}
