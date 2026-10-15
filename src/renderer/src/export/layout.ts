// Calcolo del layout di stampa: come dividere la mappa in fogli, con sovrapposizione.
// Tutte le misure sono in punti tipografici (pt): 72 pt = 1 pollice = 2,54 cm = 1 casella.

export type PaperId = 'A4' | 'A3' | 'Letter'
export const PAPERS: Record<PaperId, { name: string; w: number; h: number }> = {
  A4: { name: 'A4 (210 × 297 mm)', w: (210 / 25.4) * 72, h: (297 / 25.4) * 72 },
  A3: { name: 'A3 (297 × 420 mm)', w: (297 / 25.4) * 72, h: (420 / 25.4) * 72 },
  Letter: { name: 'Letter (8,5 × 11 in)', w: 612, h: 792 }
}

export const PT_PER_CELL = 72 // 1 casella = 1 pollice = 2,54 cm
export const MM = 72 / 25.4

export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface TileOptions {
  paper: PaperId
  orientation: Orientation
  /** margine bianco su ogni lato (mm): contiene segni di taglio ed etichette */
  marginMm: number
  /** sovrapposizione tra fogli adiacenti (mm) */
  overlapMm: number
}

export interface Sheet {
  /** numero del foglio, da 1 */
  n: number
  col: number
  row: number
  /** sigla, es. "B3" (riga B, colonna 3) */
  label: string
  /** origine della porzione di mappa su questo foglio, in pt dalla cima-sinistra della mappa */
  mapX: number
  mapY: number
  /** dimensione della porzione di mappa stampata (pt) */
  w: number
  h: number
  /** linee di taglio rispetto all'angolo del riquadro (pt): a sinistra/in alto si taglia la sovrapposizione */
  trimLeft: number
  trimTop: number
  /** numeri dei fogli adiacenti (0 = nessuno) */
  neighbors: { left: number; right: number; up: number; down: number }
}

export interface TilePlan {
  pageW: number
  pageH: number
  margin: number
  overlap: number
  contentW: number
  contentH: number
  mapW: number
  mapH: number
  cols: number
  rows: number
  portrait: boolean
  sheets: Sheet[]
}

function countAxis(mapLen: number, contentLen: number, step: number): number {
  if (mapLen <= contentLen + 0.01) return 1
  return Math.ceil((mapLen - contentLen) / step - 1e-9) + 1
}

export function planTiles(mapWcells: number, mapHcells: number, o: TileOptions): TilePlan {
  const mapW = mapWcells * PT_PER_CELL
  const mapH = mapHcells * PT_PER_CELL
  const paper = PAPERS[o.paper]
  const margin = Math.max(0, o.marginMm) * MM
  const overlap = Math.max(0, o.overlapMm) * MM

  const build = (portrait: boolean): TilePlan => {
    const pageW = portrait ? paper.w : paper.h
    const pageH = portrait ? paper.h : paper.w
    const contentW = pageW - 2 * margin
    const contentH = pageH - 2 * margin
    const ov = Math.min(overlap, Math.min(contentW, contentH) / 3)
    const stepX = contentW - ov
    const stepY = contentH - ov
    const cols = countAxis(mapW, contentW, stepX)
    const rows = countAxis(mapH, contentH, stepY)
    const sheets: Sheet[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const mapX = col * stepX
        const mapY = row * stepY
        const n = row * cols + col + 1
        sheets.push({
          n,
          col,
          row,
          label: `${String.fromCharCode(65 + (row % 26))}${col + 1}`,
          mapX,
          mapY,
          w: Math.min(contentW, mapW - mapX),
          h: Math.min(contentH, mapH - mapY),
          trimLeft: col > 0 ? ov : 0,
          trimTop: row > 0 ? ov : 0,
          neighbors: {
            left: col > 0 ? n - 1 : 0,
            right: col < cols - 1 ? n + 1 : 0,
            up: row > 0 ? n - cols : 0,
            down: row < rows - 1 ? n + cols : 0
          }
        })
      }
    }
    return { pageW, pageH, margin, overlap: ov, contentW, contentH, mapW, mapH, cols, rows, portrait, sheets }
  }

  if (o.orientation === 'portrait') return build(true)
  if (o.orientation === 'landscape') return build(false)
  const p = build(true)
  const l = build(false)
  // sceglie l'orientamento che usa meno fogli; a parità, quello più simile alla forma della mappa
  if (p.sheets.length !== l.sheets.length) return p.sheets.length < l.sheets.length ? p : l
  return mapH > mapW ? p : l
}

/** Adatta la mappa a un foglio singolo. Restituisce pagina, riquadro e scala (pt stampati per pt reale). */
export function planFit(mapWcells: number, mapHcells: number, paperId: PaperId, orientation: Orientation, marginMm: number) {
  const mapW = mapWcells * PT_PER_CELL
  const mapH = mapHcells * PT_PER_CELL
  const paper = PAPERS[paperId]
  const margin = marginMm * MM
  const portrait = orientation === 'auto' ? mapH > mapW : orientation === 'portrait'
  const pageW = portrait ? paper.w : paper.h
  const pageH = portrait ? paper.h : paper.w
  const availW = pageW - 2 * margin
  const availH = pageH - 2 * margin - 14 // spazio per la didascalia in basso
  const scale = Math.min(availW / mapW, availH / mapH)
  const w = mapW * scale
  const h = mapH * scale
  return { pageW, pageH, margin, scale, x: margin + (availW - w) / 2, y: margin + (availH - h) / 2, w, h, portrait }
}

/** Dimensione stampata in cm di una mappa in scala reale. */
export const cellsToCm = (cells: number) => cells * 2.54
