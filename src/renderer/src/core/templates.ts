// Modelli di partenza: stanza vuota, caverna, taverna, foresta, strada.
import type { MapDoc, MapItem, WallKind } from '../types'
import { newDoc, newItem } from './defaults'
import { cellKey } from './grid'
import { makeRng } from './textures'
import { ELEMENT_BY_ID } from '../elements/registry'
import { DEFAULT_GENERATOR, generateMap } from './generate'

export interface TemplateInfo {
  id: string
  name: string
  description: string
  build: () => MapDoc
}

// ---------------------------------------------------------------- aiuti

export function fill(doc: MapDoc, c1: number, r1: number, c2: number, r2: number, tex: string) {
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (c >= 0 && r >= 0 && c < doc.cols && r < doc.rows) doc.floors[cellKey(c, r)] = tex
}

/** Muri attorno alle caselle c1..c2 / r1..r2 (estremi inclusi). */
export function wallRect(doc: MapDoc, c1: number, r1: number, c2: number, r2: number, kind: WallKind = 'wall') {
  const x1 = c1, x2 = c2 + 1, y1 = r1, y2 = r2 + 1
  for (let c = x1; c < x2; c++) { doc.walls[`S:${c},${y1 - 1}`] = kind; doc.walls[`S:${c},${y2 - 1}`] = kind }
  for (let r = y1; r < y2; r++) { doc.walls[`E:${x1 - 1},${r}`] = kind; doc.walls[`E:${x2 - 1},${r}`] = kind }
}

export const hEdge = (x: number, y: number) => `S:${x},${y - 1}` // bordo orizzontale tra i vertici (x,y) e (x+1,y)
export const vEdge = (x: number, y: number) => `E:${x - 1},${y}` // bordo verticale tra (x,y) e (x,y+1)

export function put(doc: MapDoc, ref: string, x: number, y: number, extra: Partial<MapItem> = {}): MapItem {
  const def = ELEMENT_BY_ID[ref]
  const it = newItem({ kind: 'builtin', layer: def.layer ?? 'objects', ref, x, y, w: def.w, h: def.h, ...extra })
  doc.items.push(it)
  return it
}

/** Sedie attorno a un tavolo rotondo centrato in (x, y). */
function chairsAround(doc: MapDoc, x: number, y: number, d = 1.15, n = 4) {
  const dirs: [number, number, number][] = [[0, -d, 0], [d, 0, 90], [0, d, 180], [-d, 0, 270]]
  for (const [dx, dy, rot] of dirs.slice(0, n)) put(doc, 'sedia', x + dx, y + dy, { rot })
}

// ---------------------------------------------------------------- modelli

function emptyRoom(): MapDoc {
  const d = newDoc({ name: 'Stanza vuota' })
  fill(d, 8, 5, 21, 14, 'pietra')
  wallRect(d, 8, 5, 21, 14)
  d.walls[hEdge(14, 15)] = 'door'
  d.walls[vEdge(8, 9)] = 'passage'
  put(d, 'torcia', 9.0, 6.2)
  put(d, 'torcia', 21.0, 6.2)
  return d
}

function cave(): MapDoc {
  const g = generateMap({ ...DEFAULT_GENERATOR, kind: 'cave', cols: 30, rows: 20, seed: 20241, decorate: false })
  return newDoc({ ...g, name: 'Caverna' })
}

function travelMap(): MapDoc {
  const g = generateMap({ ...DEFAULT_GENERATOR, kind: 'travel', cols: 24, rows: 16, seed: 77 })
  return newDoc({ ...g })
}

function tavern(): MapDoc {
  const d = newDoc({ name: 'Taverna' })
  fill(d, 0, 0, d.cols - 1, d.rows - 1, 'erba')
  fill(d, 4, 3, 25, 16, 'legno')
  wallRect(d, 4, 3, 25, 16)
  d.walls[hEdge(14, 17)] = 'door'
  d.walls[hEdge(15, 17)] = 'door'
  for (const x of [7, 11, 18, 22]) d.walls[hEdge(x, 3)] = 'window'
  d.walls[vEdge(4, 10)] = 'window'
  d.walls[vEdge(26, 10)] = 'window'
  d.walls[vEdge(26, 6)] = 'window'
  // zona cucina separata da un muro interno
  for (let c = 4; c < 11; c++) d.walls[hEdge(c, 8)] = 'wall'
  d.walls[vEdge(11, 8)] = 'wall'
  d.walls[vEdge(11, 7)] = 'wall'
  d.walls[vEdge(11, 6)] = 'wall'
  d.walls[vEdge(11, 5)] = 'wall'
  d.walls[vEdge(11, 4)] = 'wall'
  d.walls[hEdge(8, 8)] = 'door'
  // cucina
  put(d, 'camino', 5.5, 4.0)
  put(d, 'tavolo', 8.0, 5.5)
  put(d, 'barile', 4.8, 7.2)
  put(d, 'cassa', 10.0, 7.3)
  put(d, 'barile', 10.2, 4.0)
  // sala
  put(d, 'bancone', 19.5, 4.5, { rot: 0 })
  put(d, 'barile', 17.2, 3.7)
  put(d, 'barile', 22.3, 3.7)
  put(d, 'sgabello', 18.0, 5.7)
  put(d, 'sgabello', 19.5, 5.7)
  put(d, 'sgabello', 21.0, 5.7)
  for (const [x, y] of [[8, 12], [13.5, 10.5], [13.5, 14], [21, 11], [21.5, 14.5]] as const) {
    put(d, 'tavolo_tondo', x, y)
    chairsAround(d, x, y)
  }
  put(d, 'camino', 25.0, 9.5, { rot: 90 })
  put(d, 'tappeto', 17.5, 11.5, { w: 2, h: 3, rot: 90, color: '#7a2f2f' })
  put(d, 'torcia', 14.5, 3.8)
  put(d, 'torcia', 4.8, 14.5)
  put(d, 'torcia', 25.2, 14.5)
  put(d, 'torcia', 13.0, 16.2)
  put(d, 'torcia', 17.0, 16.2)
  // sul retro, fuori dalla locanda
  put(d, 'albero', 1.8, 2.3, { w: 3, h: 3 })
  put(d, 'albero', 28.0, 18.0, { w: 3, h: 3 })
  put(d, 'cespuglio', 27.5, 3.5)
  put(d, 'cespuglio', 2.5, 17.5)
  // nota del Master (non stampata nella versione giocatori)
  const note = newItem({ kind: 'text', layer: 'master', x: 8, y: 1.5, w: 5.6, h: 0.6, text: 'Cantina: botola nascosta sotto il tappeto', fontSize: 0.3 })
  d.items.push(note)
  put(d, 'botola', 17.5, 11.5, { layer: 'master' })
  return d
}

function forest(): MapDoc {
  const d = newDoc({ name: 'Foresta' })
  const rnd = makeRng(4242)
  fill(d, 0, 0, d.cols - 1, d.rows - 1, 'erba')
  // un ruscello sinuoso da est a ovest
  const river = new Set<string>()
  for (let c = 0; c < d.cols; c++) {
    const cy = 14 + Math.sin(c / 4.2) * 2.4
    for (let r = 0; r < d.rows; r++) if (Math.abs(r + 0.5 - cy) < 1.15) { d.floors[cellKey(c, r)] = 'acqua'; river.add(cellKey(c, r)) }
  }
  // radura con falò
  const clear = (c: number, r: number) => Math.hypot(c - 9, r - 6) < 4.2
  for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++) if (clear(c, r) && !river.has(cellKey(c, r))) d.floors[cellKey(c, r)] = 'terra'
  put(d, 'falo', 9.5, 6.5)
  for (const [x, y, rot] of [[7.2, 6.4, 90], [11.8, 6.8, 80], [9.4, 4.0, 0]] as const) put(d, 'tronco', x, y, { rot, w: 2, h: 0.6 })
  // ponte sul ruscello
  put(d, 'ponte', 21.5, 13.8 + Math.sin(21.5 / 4.2) * 2.4 - 0.2, { w: 1, h: 3 })
  // alberi, cespugli, rocce
  for (let i = 0; i < 70; i++) {
    const x = rnd() * d.cols
    const y = rnd() * d.rows
    const [c, r] = [Math.floor(x), Math.floor(y)]
    if (clear(c, r) || river.has(cellKey(c, r)) || river.has(cellKey(c, r + 1)) || river.has(cellKey(c, r - 1))) continue
    if (Math.abs(x - 21.5) < 1.6 && Math.abs(y - 14) < 4) continue
    const t = rnd()
    if (t < 0.5) put(d, 'albero', x, y, { w: 2.2 + rnd() * 1.2, h: 2.2 + rnd() * 1.2, rot: rnd() * 360 })
    else if (t < 0.75) put(d, 'pino', x, y, { w: 1.7 + rnd() * 0.8, h: 1.7 + rnd() * 0.8, rot: rnd() * 360 })
    else if (t < 0.9) put(d, 'cespuglio', x, y, { rot: rnd() * 360 })
    else put(d, 'roccia', x, y, { rot: rnd() * 360 })
  }
  return d
}

function road(): MapDoc {
  const d = newDoc({ name: 'Strada' })
  const rnd = makeRng(777)
  fill(d, 0, 0, d.cols - 1, d.rows - 1, 'erba')
  const roadCells = new Set<string>()
  for (let c = 0; c < d.cols; c++) {
    const cy = 10 + Math.sin(c / 5) * 1.8
    for (let r = 0; r < d.rows; r++) if (Math.abs(r + 0.5 - cy) < 1.7) { d.floors[cellKey(c, r)] = 'terra'; roadCells.add(cellKey(c, r)) }
  }
  // un incrocio verso nord
  for (let r = 0; r < 10; r++) for (const c of [19, 20]) { d.floors[cellKey(c, r)] = 'terra'; roadCells.add(cellKey(c, r)) }
  // luogo d'imboscata: carro rovesciato (casse e barili) e tronchi
  put(d, 'cassa', 9.2, 8.6, { rot: 20 })
  put(d, 'cassa', 10.3, 9.2, { rot: -10 })
  put(d, 'barile', 8.6, 9.8)
  put(d, 'tronco', 6.5, 8.0, { rot: 100, w: 2.2, h: 0.6 })
  for (let i = 0; i < 90; i++) {
    const x = rnd() * d.cols
    const y = rnd() * d.rows
    const [c, r] = [Math.floor(x), Math.floor(y)]
    let near = false
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (roadCells.has(cellKey(c + dc, r + dr))) near = true
    if (near) continue
    const t = rnd()
    if (t < 0.45) put(d, 'albero', x, y, { w: 2 + rnd(), h: 2 + rnd(), rot: rnd() * 360 })
    else if (t < 0.7) put(d, 'cespuglio', x, y, { rot: rnd() * 360 })
    else if (t < 0.9) put(d, 'roccia', x, y, { rot: rnd() * 360 })
    else put(d, 'roccia_grande', x, y, { rot: rnd() * 360 })
  }
  return d
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'vuota', name: 'Mappa vuota', description: 'Nessun contenuto: parti da zero con la dimensione che preferisci.', build: () => newDoc({ name: 'Nuova mappa' }) },
  { id: 'stanza', name: 'Stanza vuota', description: 'Una stanza di pietra 14×10 con una porta e un passaggio.', build: emptyRoom },
  { id: 'caverna', name: 'Caverna', description: 'Grotta irregolare con laghetto, rocce e funghi.', build: cave },
  { id: 'taverna', name: 'Taverna', description: 'Locanda con sala, cucina, tavoli, bancone e camino.', build: tavern },
  { id: 'foresta', name: 'Foresta', description: 'Bosco con radura, falò e ruscello con ponte.', build: forest },
  { id: 'strada', name: 'Strada', description: 'Strada di campagna con incrocio e luogo d\'imboscata.', build: road },
  { id: 'viaggio', name: 'Mappa di viaggio', description: 'Mappa esagonale per i viaggi, con terreni e insediamenti.', build: travelMap }
]
