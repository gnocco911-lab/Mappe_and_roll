// Generatore casuale di mappe: dungeon, caverne, foreste e mappe di viaggio esagonali.
// Lo stesso seme produce sempre la stessa mappa; si può rigenerare finché piace.
import type { MapDoc, MapItem, WallKind } from '../types'
import { newItem } from './defaults'
import { cellKey, getGrid, parseCell } from './grid'
import { generateCave, generateDungeon } from './generators'
import { makeRng } from './textures'
import { ELEMENT_BY_ID } from '../elements/registry'

export type GeneratorKind = 'dungeon' | 'cave' | 'travel'

export interface GeneratorOptions {
  kind: GeneratorKind
  cols: number
  rows: number
  seed: number
  /** numero di stanze (solo dungeon) */
  rooms: number
  /** texture del pavimento (dungeon) */
  floor: string
  /** aggiunge arredi, luci, trappole */
  decorate: boolean
  /** aggiunge i numeri delle stanze */
  numbers: boolean
}

export type GeneratedContent = Pick<MapDoc, 'cols' | 'rows' | 'gridType' | 'floors' | 'walls' | 'items'> & { name: string }

function put(items: MapItem[], ref: string, x: number, y: number, extra: Partial<MapItem> = {}) {
  const def = ELEMENT_BY_ID[ref]
  items.push(newItem({ kind: 'builtin', layer: def.layer ?? 'objects', ref, x, y, w: def.w, h: def.h, ...extra }))
}

// ---------------------------------------------------------------- dungeon

function dungeon(o: GeneratorOptions): GeneratedContent {
  const { cols, rows } = o
  const grid = getGrid('square', cols, rows)
  const rnd = makeRng(o.seed * 31 + 7)
  const res = generateDungeon(cols, rows, o.seed, o.rooms)
  const floors: Record<string, string> = {}
  for (const k of res.floor) floors[k] = o.floor
  const walls: Record<string, WallKind> = {}
  // muro su ogni bordo tra pavimento e vuoto
  for (const k of res.floor) {
    const [c, r] = parseCell(k)
    for (const n of grid.neighbors(c, r)) if (!res.floor.has(cellKey(n.c, n.r))) walls[n.edge] = 'wall'
  }
  // muri tra stanza e corridoio adiacenti (tranne agli ingressi), poi porte agli ingressi
  const doorSet = new Set(res.doorEdges)
  for (const k of res.floor) {
    const [c, r] = parseCell(k)
    for (const n of grid.neighbors(c, r)) {
      if (!res.floor.has(cellKey(n.c, n.r))) continue
      if (res.roomCells.has(k) !== res.roomCells.has(cellKey(n.c, n.r)) && !doorSet.has(n.edge)) walls[n.edge] = 'wall'
    }
  }
  for (const e of res.doorEdges) {
    const t = rnd()
    walls[e] = t < 0.62 ? 'door' : t < 0.8 ? 'passage' : t < 0.9 ? 'locked' : 'secret'
  }
  const items: MapItem[] = []
  res.rooms.forEach((room, i) => {
    const cx = room.c + room.w / 2
    const cy = room.r + room.h / 2
    if (o.numbers) items.push(newItem({ kind: 'number', layer: 'objects', x: room.c + 0.8, y: room.r + 0.8, w: 0.6, h: 0.6, text: String(i + 1) }))
    if (!o.decorate) return
    // torce lungo il muro superiore
    for (let k = 0; k < Math.min(2, Math.floor(room.w / 4)); k++) put(items, 'torcia', room.c + 1.5 + rnd() * (room.w - 3), room.r + 0.22)
    if (room.w >= 6 && room.h >= 5) for (const [dx, dy] of [[1.5, 1.5], [room.w - 1.5, 1.5], [1.5, room.h - 1.5], [room.w - 1.5, room.h - 1.5]]) put(items, 'colonna', room.c + dx, room.r + dy)
    if (rnd() < 0.3) put(items, 'ragnatela', room.c + room.w - 0.5, room.r + 0.5, { rot: 90 })
    const t = rnd()
    if (t < 0.28) { // sala con tavolo e sedie
      put(items, 'tavolo', cx, cy)
      put(items, 'sedia', cx - 0.6, cy - 0.85)
      put(items, 'sedia', cx + 0.6, cy - 0.85)
      put(items, 'sedia', cx - 0.6, cy + 0.85, { rot: 180 })
      put(items, 'sedia', cx + 0.6, cy + 0.85, { rot: 180 })
    } else if (t < 0.46) { // magazzino
      put(items, 'baule', room.c + room.w - 1.1, room.r + room.h - 0.8)
      put(items, 'barile', room.c + 0.7, room.r + room.h - 0.7)
      put(items, 'cassa', room.c + 1.7, room.r + room.h - 0.6)
      put(items, 'cassa', room.c + 0.6, room.r + room.h - 1.5, { rot: 20 })
    } else if (t < 0.6) { // cappella
      put(items, 'altare', cx, room.r + 1.4, { rot: 90 })
      put(items, 'braciere', room.c + 1.0, cy + 0.5)
      put(items, 'braciere', room.c + room.w - 1.0, cy + 0.5)
    } else if (t < 0.72) { // cripta
      put(items, 'sarcofago', cx - 1.2, cy)
      put(items, 'sarcofago', cx + 1.2, cy)
      put(items, 'statua', room.c + 1, room.r + room.h - 1)
    } else if (t < 0.82) {
      put(items, 'macerie', cx + (rnd() - 0.5) * 2, cy + (rnd() - 0.5) * 2)
      put(items, 'macerie', cx + (rnd() - 0.5) * 3, cy + (rnd() - 0.5) * 2, { rot: 45 })
    } else if (t < 0.9) {
      put(items, 'pozzo', cx, cy)
    } else { // trappola: fossa con spuntoni nascosta (solo Master)
      put(items, 'fossa_spuntoni', cx, cy)
    }
  })
  if (o.decorate) {
    // piastre a pressione nei corridoi (livello Master)
    const corr = [...res.floor].filter((k) => !res.roomCells.has(k))
    for (let i = 0; i < Math.min(3, Math.floor(corr.length / 25)); i++) {
      const [c, r] = parseCell(corr[Math.floor(rnd() * corr.length)])
      put(items, 'piastra', c + 0.5, r + 0.5)
    }
  }
  return { name: 'Dungeon casuale', cols, rows, gridType: 'square', floors, walls, items }
}

// ---------------------------------------------------------------- caverna

function cave(o: GeneratorOptions): GeneratedContent {
  const { cols, rows } = o
  const rnd = makeRng(o.seed + 99)
  const cells = generateCave(cols, rows, o.seed)
  const floors: Record<string, string> = {}
  const blobs = Array.from({ length: Math.max(3, Math.round((cols * rows) / 90)) }, () => [rnd() * cols, rnd() * rows, 2 + rnd() * 3] as const)
  const free: [number, number][] = []
  for (const k of cells) {
    const [c, r] = parseCell(k)
    floors[k] = blobs.some(([bx, by, br]) => Math.hypot(c - bx, r - by) < br) ? 'pietra' : 'terra'
    free.push([c, r])
  }
  const items: MapItem[] = []
  if (free.length) {
    const [lc, lr] = free[Math.floor(rnd() * free.length)]
    for (const [c, r] of free) if (Math.hypot(c - lc, r - lr) < 1.8 + rnd() * 0.9) floors[cellKey(c, r)] = 'acqua'
    const n = Math.round(free.length / 28)
    for (let i = 0; i < n; i++) {
      const [c, r] = free[Math.floor(rnd() * free.length)]
      if (floors[cellKey(c, r)] === 'acqua') continue
      const ref = rnd() < 0.55 ? 'roccia' : rnd() < 0.5 ? 'funghi' : 'roccia_grande'
      put(items, ref, c + 0.5 + (rnd() - 0.5) * 0.4, r + 0.5 + (rnd() - 0.5) * 0.4, { rot: Math.floor(rnd() * 360) })
    }
    if (o.decorate) for (let i = 0; i < 3; i++) {
      const [c, r] = free[Math.floor(rnd() * free.length)]
      if (floors[cellKey(c, r)] !== 'acqua') put(items, 'piastra', c + 0.5, r + 0.5)
    }
  }
  return { name: 'Caverna casuale', cols, rows, gridType: 'square', floors, walls: {}, items }
}

// ---------------------------------------------------------------- mappa di viaggio

/** Rumore a valori liscio (non periodico) per i biomi. */
function makeNoise(seed: number) {
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return (((h ^ (h >>> 16)) >>> 0) % 100000) / 100000
  }
  const sm = (t: number) => t * t * (3 - 2 * t)
  const n1 = (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y)
    const fx = sm(x - x0), fy = sm(y - y0)
    const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
  }
  return (x: number, y: number) => 0.55 * n1(x, y) + 0.3 * n1(x * 2.1 + 17, y * 2.1 + 9) + 0.15 * n1(x * 4.3 + 5, y * 4.3 + 31)
}

function travel(o: GeneratorOptions): GeneratedContent {
  const { cols, rows } = o
  const grid = getGrid('hex', cols, rows)
  const rnd = makeRng(o.seed + 5)
  const elev = makeNoise(o.seed * 3 + 1)
  const moist = makeNoise(o.seed * 7 + 2)
  const floors: Record<string, string> = {}
  const items: MapItem[] = []
  const landCells: [number, number][] = []
  const kinds = new Map<string, string>()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [x, y] = grid.center(c, r)
      // l'isola è più alta al centro: bordi verso il mare
      const edge = Math.min(1, Math.hypot((x / grid.width - 0.5) * 2, (y / grid.height - 0.5) * 2))
      const e = elev(x * 0.28, y * 0.28) - edge * 0.28 + 0.1
      const m = moist(x * 0.3 + 40, y * 0.3 + 40)
      let tex: string
      let kind = 'piano'
      if (e < 0.30) tex = 'acqua'
      else if (e < 0.35) tex = 'sabbia'
      else if (e > 0.74) { tex = 'neve'; kind = 'cima' }
      else if (e > 0.63) { tex = 'pietra'; kind = 'monte' }
      else if (m > 0.66 && e < 0.5) { tex = 'palude'; kind = 'palude' }
      else if (m < 0.32 && e < 0.6) tex = 'sabbia'
      else { tex = 'erba'; kind = m > 0.52 ? 'bosco' : e > 0.56 ? 'collina' : 'piano' }
      floors[cellKey(c, r)] = tex
      kinds.set(cellKey(c, r), kind)
      if (tex !== 'acqua') landCells.push([c, r])
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kind = kinds.get(cellKey(c, r))!
      const [x, y] = grid.center(c, r)
      const jitter = () => (rnd() - 0.5) * 0.12
      if (kind === 'monte' || kind === 'cima') put(items, 'v_montagne', x + jitter(), y + jitter(), { w: 1.15, h: 1.15 })
      else if (kind === 'bosco') put(items, 'v_foresta', x + jitter(), y + jitter(), { w: 1.05, h: 1.05 })
      else if (kind === 'collina' && rnd() < 0.8) put(items, 'v_colline', x + jitter(), y + jitter())
    }
  }
  // insediamenti sulla terra pianeggiante
  const flat = landCells.filter(([c, r]) => ['piano', 'collina', 'bosco'].includes(kinds.get(cellKey(c, r))!))
  const pick = (ref: string, n: number) => {
    for (let i = 0; i < n && flat.length; i++) {
      const idx = Math.floor(rnd() * flat.length)
      const [c, r] = flat.splice(idx, 1)[0]
      const [x, y] = grid.center(c, r)
      // sostituisce il simbolo di terreno presente
      for (let j = items.length - 1; j >= 0; j--) if (Math.abs(items[j].x - x) < 0.3 && Math.abs(items[j].y - y) < 0.3) items.splice(j, 1)
      put(items, ref, x, y, { w: 1.1, h: 1.1 })
    }
  }
  const area = cols * rows
  pick('v_citta', Math.max(1, Math.round(area / 150)))
  pick('v_castello', Math.max(1, Math.round(area / 180)))
  pick('v_villaggio', Math.max(2, Math.round(area / 55)))
  pick('v_torre', Math.round(area / 220))
  pick('v_rovine', Math.round(area / 200))
  pick('v_poi', Math.round(area / 260))
  // caverne nei monti
  const mountains = landCells.filter(([c, r]) => kinds.get(cellKey(c, r)) === 'monte')
  for (let i = 0; i < Math.min(2, mountains.length); i++) {
    const [c, r] = mountains[Math.floor(rnd() * mountains.length)]
    const [x, y] = grid.center(c, r)
    put(items, 'v_caverna', x, y + 0.05, { w: 0.8, h: 0.8 })
  }
  // etichetta della scala (modificabile)
  items.push(newItem({ kind: 'text', layer: 'objects', x: 3.2, y: grid.height - 0.5, w: 5.2, h: 0.55, text: '1 esagono = 6 miglia (circa 10 km)', fontSize: 0.3, bold: true }))
  return { name: 'Mappa di viaggio', cols, rows, gridType: 'hex', floors, walls: {}, items }
}

export function generateMap(o: GeneratorOptions): GeneratedContent {
  if (o.kind === 'dungeon') return dungeon(o)
  if (o.kind === 'cave') return cave(o)
  return travel(o)
}

export const DEFAULT_GENERATOR: GeneratorOptions = {
  kind: 'dungeon', cols: 40, rows: 28, seed: 1234, rooms: 9, floor: 'pietra', decorate: true, numbers: true
}
