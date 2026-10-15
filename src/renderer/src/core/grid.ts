// Geometria della griglia: caselle quadrate oppure esagoni (punta in alto).
// Tutte le coordinate sono in "caselle" (1 casella = larghezza di un quadrato = distanza tra lati opposti di un esagono).
//
// I BORDI (muri, porte, finestre...) hanno una chiave testuale univoca:
//   quadrato:  "E:c,r" = lato destro della casella, "S:c,r" = lato inferiore
//   esagono:   "E:c,r", "SE:c,r", "SW:c,r"  (gli altri lati appartengono ai vicini)
import type { GridType } from '../types'

export interface Neighbor {
  c: number
  r: number
  /** chiave del bordo condiviso con questa casella vicina */
  edge: string
}

export interface Grid {
  type: GridType
  cols: number
  rows: number
  /** dimensioni totali della mappa in caselle */
  width: number
  height: number
  center(c: number, r: number): [number, number]
  /** vertici del poligono della casella, in formato piatto [x0,y0,x1,y1,...] */
  polygon(c: number, r: number): number[]
  /** casella che contiene il punto (può essere fuori dai limiti) */
  cellAt(x: number, y: number): [number, number]
  inBounds(c: number, r: number): boolean
  neighbors(c: number, r: number): Neighbor[]
  /** chiavi dei bordi che circondano la casella */
  cellEdges(c: number, r: number): string[]
  /** estremi di un bordo [x1,y1,x2,y2] */
  edgeGeom(key: string): [number, number, number, number]
  /** bordo più vicino al punto */
  nearestEdge(x: number, y: number): string
  /** il bordo tocca almeno una casella della mappa? */
  edgeValid(key: string): boolean
  /** vertice più vicino al punto */
  snapVertex(x: number, y: number): [number, number]
}

const R_HEX = 1 / Math.sqrt(3) // raggio dell'esagono con larghezza 1

export function parseEdge(key: string): { dir: string; c: number; r: number } {
  const i = key.indexOf(':')
  const [c, r] = key.slice(i + 1).split(',').map(Number)
  return { dir: key.slice(0, i), c, r }
}

function distPointSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy
  let t = l2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

// ------------------------------------------------------------------ quadrata

function makeSquare(cols: number, rows: number): Grid {
  const g: Grid = {
    type: 'square',
    cols,
    rows,
    width: cols,
    height: rows,
    center: (c, r) => [c + 0.5, r + 0.5],
    polygon: (c, r) => [c, r, c + 1, r, c + 1, r + 1, c, r + 1],
    cellAt: (x, y) => [Math.floor(x), Math.floor(y)],
    inBounds: (c, r) => c >= 0 && r >= 0 && c < cols && r < rows,
    neighbors: (c, r) => [
      { c: c + 1, r, edge: `E:${c},${r}` },
      { c, r: r + 1, edge: `S:${c},${r}` },
      { c: c - 1, r, edge: `E:${c - 1},${r}` },
      { c, r: r - 1, edge: `S:${c},${r - 1}` }
    ],
    cellEdges: (c, r) => [`E:${c},${r}`, `S:${c},${r}`, `E:${c - 1},${r}`, `S:${c},${r - 1}`],
    edgeGeom: (key) => {
      const { dir, c, r } = parseEdge(key)
      return dir === 'E' ? [c + 1, r, c + 1, r + 1] : [c, r + 1, c + 1, r + 1]
    },
    nearestEdge: (x, y) => {
      const [c, r] = g.cellAt(x, y)
      let best = ''
      let bd = Infinity
      for (const k of g.cellEdges(c, r)) {
        const [x1, y1, x2, y2] = g.edgeGeom(k)
        const d = distPointSegment(x, y, x1, y1, x2, y2)
        if (d < bd) {
          bd = d
          best = k
        }
      }
      return best
    },
    edgeValid: (key) => {
      const { dir, c, r } = parseEdge(key)
      const [c2, r2] = dir === 'E' ? [c + 1, r] : [c, r + 1]
      return g.inBounds(c, r) || g.inBounds(c2, r2)
    },
    snapVertex: (x, y) => [Math.round(x), Math.round(y)]
  }
  return g
}

// ------------------------------------------------------------------ esagonale

// direzioni dei vicini per righe pari/dispari ("odd-r")
const HEX_DIRS_EVEN: Record<string, [number, number]> = {
  E: [1, 0], W: [-1, 0], NE: [0, -1], NW: [-1, -1], SE: [0, 1], SW: [-1, 1]
}
const HEX_DIRS_ODD: Record<string, [number, number]> = {
  E: [1, 0], W: [-1, 0], NE: [1, -1], NW: [0, -1], SE: [1, 1], SW: [0, 1]
}
const hexDirs = (r: number) => (r & 1 ? HEX_DIRS_ODD : HEX_DIRS_EVEN)

function hexCenter(c: number, r: number): [number, number] {
  return [c + 0.5 + (r & 1 ? 0.5 : 0), R_HEX + r * 1.5 * R_HEX]
}

/** vertici dell'esagono (k0 alto, poi in senso orario) */
function hexVertices(cx: number, cy: number): [number, number][] {
  const R = R_HEX
  return [
    [cx, cy - R],
    [cx + 0.5, cy - R / 2],
    [cx + 0.5, cy + R / 2],
    [cx, cy + R],
    [cx - 0.5, cy + R / 2],
    [cx - 0.5, cy - R / 2]
  ]
}

function makeHex(cols: number, rows: number): Grid {
  const g: Grid = {
    type: 'hex',
    cols,
    rows,
    width: cols + (rows > 1 ? 0.5 : 0),
    height: R_HEX * (1.5 * rows + 0.5),
    center: hexCenter,
    polygon: (c, r) => {
      const [cx, cy] = hexCenter(c, r)
      return hexVertices(cx, cy).flat()
    },
    cellAt: (x, y) => {
      // conversione pixel -> assiale -> arrotondamento cubico -> offset "odd-r"
      const px = x - 0.5
      const py = y - R_HEX
      const q = (Math.sqrt(3) / 3 * px - py / 3) / R_HEX
      const rr = ((2 / 3) * py) / R_HEX
      let cx = q
      let cz = rr
      let cy = -cx - cz
      let rx = Math.round(cx)
      let ry = Math.round(cy)
      let rz = Math.round(cz)
      const dx = Math.abs(rx - cx)
      const dy = Math.abs(ry - cy)
      const dz = Math.abs(rz - cz)
      if (dx > dy && dx > dz) rx = -ry - rz
      else if (dy > dz) ry = -rx - rz
      else rz = -rx - ry
      const r = rz
      const c = rx + (r - (r & 1)) / 2
      return [c, r]
    },
    inBounds: (c, r) => c >= 0 && r >= 0 && c < cols && r < rows,
    neighbors: (c, r) => {
      const d = hexDirs(r)
      const out: Neighbor[] = []
      for (const name of ['E', 'SE', 'SW', 'W', 'NW', 'NE']) {
        const [dc, dr] = d[name]
        const nc = c + dc
        const nr = r + dr
        let edge: string
        if (name === 'E' || name === 'SE' || name === 'SW') edge = `${name}:${c},${r}`
        else if (name === 'W') edge = `E:${nc},${nr}`
        else if (name === 'NW') edge = `SE:${nc},${nr}`
        else edge = `SW:${nc},${nr}`
        out.push({ c: nc, r: nr, edge })
      }
      return out
    },
    cellEdges: (c, r) => g.neighbors(c, r).map((n) => n.edge),
    edgeGeom: (key) => {
      const { dir, c, r } = parseEdge(key)
      const [cx, cy] = hexCenter(c, r)
      const v = hexVertices(cx, cy)
      const [a, b] = dir === 'E' ? [v[1], v[2]] : dir === 'SE' ? [v[2], v[3]] : [v[3], v[4]]
      return [a[0], a[1], b[0], b[1]]
    },
    nearestEdge: (x, y) => {
      const [c, r] = g.cellAt(x, y)
      let best = ''
      let bd = Infinity
      for (const k of g.cellEdges(c, r)) {
        const [x1, y1, x2, y2] = g.edgeGeom(k)
        const d = distPointSegment(x, y, x1, y1, x2, y2)
        if (d < bd) {
          bd = d
          best = k
        }
      }
      return best
    },
    edgeValid: (key) => {
      const { dir, c, r } = parseEdge(key)
      if (g.inBounds(c, r)) return true
      const [dc, dr] = hexDirs(r)[dir]
      return g.inBounds(c + dc, r + dr)
    },
    snapVertex: (x, y) => {
      const [c, r] = g.cellAt(x, y)
      const [cx, cy] = hexCenter(c, r)
      let best: [number, number] = [cx, cy - R_HEX]
      let bd = Infinity
      for (const v of hexVertices(cx, cy)) {
        const d = Math.hypot(v[0] - x, v[1] - y)
        if (d < bd) {
          bd = d
          best = v
        }
      }
      return best
    }
  }
  return g
}

const cache = new Map<string, Grid>()

/** Restituisce (con cache) la geometria per il tipo e la dimensione richiesti. */
export function getGrid(type: GridType, cols: number, rows: number): Grid {
  const k = `${type}:${cols}x${rows}`
  let g = cache.get(k)
  if (!g) {
    g = type === 'hex' ? makeHex(cols, rows) : makeSquare(cols, rows)
    if (cache.size > 20) cache.clear()
    cache.set(k, g)
  }
  return g
}

export const cellKey = (c: number, r: number) => `${c},${r}`
export function parseCell(key: string): [number, number] {
  const i = key.indexOf(',')
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))]
}

// ------------------------------------------------------------ operazioni su caselle

/** Caselle coperte da un pennello di diametro `size` centrato sulla casella (c, r). */
export function brushCells(grid: Grid, c: number, r: number, size: number): [number, number][] {
  if (size <= 1) return grid.inBounds(c, r) ? [[c, r]] : []
  const [cx, cy] = grid.center(c, r)
  const rad = size / 2 + 0.01
  const reach = Math.ceil(size) + 1
  const out: [number, number][] = []
  for (let rr = r - reach; rr <= r + reach; rr++) {
    for (let cc = c - reach; cc <= c + reach; cc++) {
      if (!grid.inBounds(cc, rr)) continue
      const [x, y] = grid.center(cc, rr)
      if (Math.hypot(x - cx, y - cy) <= rad) out.push([cc, rr])
    }
  }
  return out
}

/** Caselle sulla linea retta tra due caselle (per tratti di pennello veloci). */
export function lineCells(grid: Grid, c1: number, r1: number, c2: number, r2: number): [number, number][] {
  const [x1, y1] = grid.center(c1, r1)
  const [x2, y2] = grid.center(c2, r2)
  const dist = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.max(1, Math.ceil(dist / 0.25))
  const seen = new Set<string>()
  const out: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const [c, r] = grid.cellAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
    const k = cellKey(c, r)
    if (!seen.has(k)) {
      seen.add(k)
      out.push([c, r])
    }
  }
  return out
}

/** Rettangolo di caselle (coordinate offset) tra due angoli. */
export function rectCells(grid: Grid, c1: number, r1: number, c2: number, r2: number): [number, number][] {
  const out: [number, number][] = []
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      if (grid.inBounds(c, r)) out.push([c, r])
    }
  }
  return out
}

/** Test punto-in-poligono (regola pari/dispari). */
export function pointInPolygon(x: number, y: number, pts: number[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Caselle il cui centro cade dentro il poligono (coordinate in caselle). */
export function polygonCells(grid: Grid, pts: number[]): [number, number][] {
  if (pts.length < 6) return []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i])
    minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1])
  }
  const [c0, r0] = grid.cellAt(minX, minY)
  const [c1, r1] = grid.cellAt(maxX, maxY)
  const out: [number, number][] = []
  for (let r = Math.min(r0, r1) - 1; r <= Math.max(r0, r1) + 1; r++) {
    for (let c = Math.min(c0, c1) - 1; c <= Math.max(c0, c1) + 1; c++) {
      if (!grid.inBounds(c, r)) continue
      const [x, y] = grid.center(c, r)
      if (pointInPolygon(x, y, pts)) out.push([c, r])
    }
  }
  return out
}

/**
 * Riempimento a secchiello: parte dalla casella (c, r) e si espande sulle caselle con lo stesso
 * contenuto, fermandosi ai muri (qualsiasi bordo tranne il "passaggio").
 */
export function floodCells(
  grid: Grid,
  floors: Record<string, string>,
  walls: Record<string, string>,
  c: number,
  r: number
): [number, number][] {
  if (!grid.inBounds(c, r)) return []
  const target = floors[cellKey(c, r)]
  const seen = new Set<string>([cellKey(c, r)])
  const queue: [number, number][] = [[c, r]]
  const out: [number, number][] = []
  while (queue.length) {
    const [cc, rr] = queue.pop()!
    out.push([cc, rr])
    for (const n of grid.neighbors(cc, rr)) {
      if (!grid.inBounds(n.c, n.r)) continue
      const k = cellKey(n.c, n.r)
      if (seen.has(k)) continue
      const w = walls[n.edge]
      if (w && w !== 'passage') continue
      if (floors[k] !== target) continue
      seen.add(k)
      queue.push([n.c, n.r])
    }
  }
  return out
}

/** Segmenti del contorno dei pavimenti: bordi tra una casella con pavimento e una senza. */
export function floorOutline(grid: Grid, floors: Record<string, string>): number[][] {
  const out: number[][] = []
  for (const key of Object.keys(floors)) {
    const [c, r] = parseCell(key)
    for (const n of grid.neighbors(c, r)) {
      if (floors[cellKey(n.c, n.r)] === undefined || !grid.inBounds(n.c, n.r)) {
        out.push(grid.edgeGeom(n.edge))
      }
    }
  }
  return out
}

/** Posizione del centro di un oggetto con aggancio alla griglia. */
export function snapItemCenter(grid: Grid, x: number, y: number, w: number, h: number): [number, number] {
  if (grid.type === 'square') {
    // oggetti piccoli: al centro della casella; altri: bordi allineati alla griglia
    const ax = (v: number, size: number) => (size <= 0.75 ? Math.floor(v) + 0.5 : Math.round(v - size / 2) + size / 2)
    return [ax(x, w), ax(y, h)]
  }
  const odd = Math.round(Math.max(w, h)) % 2 === 1 || Math.max(w, h) < 1
  if (odd) {
    const [c, r] = grid.cellAt(x, y)
    return grid.center(c, r)
  }
  return grid.snapVertex(x, y)
}
