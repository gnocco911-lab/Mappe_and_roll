// Token di carta da ritagliare e piegare: ogni miniatura è una striscia con la figura davanti,
// la stessa figura rovesciata dietro e due alette che formano la base. Si piega a metà,
// si piegano le alette in direzioni opposte e il token sta in piedi.
import { PDFDocument } from 'pdf-lib'
import type { CustomAsset } from '../types'
import { PAPERS, MM, type Orientation, type PaperId } from './layout'
import { drawBuiltin, ELEMENT_BY_ID } from '../elements/registry'
import { getAssetCanvas, preloadAssets } from '../canvas/imageCache'
import { toBytes } from './exporter'

export type TokenSource =
  | { type: 'numbered'; color: string; from: number; count: number }
  | { type: 'asset'; asset: CustomAsset; copies: number }

export interface PaperTokenSpec {
  source: TokenSource
  /** larghezza in caselle (1 = medio, 2 = grande...) */
  sizeCells: number
  /** altezza della figura in caselle */
  heightCells: number
  /** colore delle alette di base e dello sfondo della figura */
  baseColor: string
  paper: PaperId
  orientation: Orientation
  marginMm: number
  gapMm: number
}

export interface StripGeometry {
  w: number
  h: number
  flap: number
  total: number
}

export function stripGeometry(spec: PaperTokenSpec): StripGeometry {
  const w = spec.sizeCells * 72
  const h = spec.heightCells * 72
  const flap = Math.max(8 * MM, Math.min(20 * MM, w * 0.3))
  return { w, h, flap, total: 2 * h + 2 * flap }
}

export function layoutGrid(spec: PaperTokenSpec) {
  const geo = stripGeometry(spec)
  const paper = PAPERS[spec.paper]
  const portrait = spec.orientation === 'portrait' || (spec.orientation === 'auto' && geo.total >= geo.w)
  const pageW = portrait ? paper.w : paper.h
  const pageH = portrait ? paper.h : paper.w
  const m = spec.marginMm * MM
  const gap = spec.gapMm * MM
  const cols = Math.max(0, Math.floor((pageW - 2 * m + gap) / (geo.w + gap)))
  const rows = Math.max(0, Math.floor((pageH - 2 * m + gap) / (geo.total + gap)))
  return { geo, pageW, pageH, m, gap, cols, rows, perPage: cols * rows }
}

export function tokenCount(spec: PaperTokenSpec): number {
  return spec.source.type === 'numbered' ? spec.source.count : spec.source.copies
}

/** Disegna la figura (davanti o dietro) dentro il riquadro, appoggiata in basso. */
function drawFigure(g: CanvasRenderingContext2D, spec: PaperTokenSpec, n: number, x: number, y: number, w: number, h: number) {
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.fillStyle = '#ffffff'
  g.fillRect(x, y, w, h)
  const src = spec.source
  if (src.type === 'asset') {
    const cv = getAssetCanvas(src.asset)
    if (cv) {
      const pad = w * 0.05
      const k = Math.min((w - 2 * pad) / cv.width, (h - 2 * pad) / cv.height)
      const dw = cv.width * k
      const dh = cv.height * k
      g.imageSmoothingQuality = 'high'
      g.drawImage(cv, x + (w - dw) / 2, y + h - pad - dh, dw, dh)
    }
  } else {
    const def = ELEMENT_BY_ID['token']
    const d = Math.min(w, h) * 0.92
    g.translate(x + (w - d) / 2, y + (h - d) / 2)
    g.scale(d / 100, d / 100)
    drawBuiltin(g, def, { color: src.color, text: String(src.from + n), flipX: false, flipY: false }, 100, 100, 'color')
  }
  g.restore()
}

function drawStrip(g: CanvasRenderingContext2D, spec: PaperTokenSpec, n: number, x: number, y: number) {
  const { w, h, flap, total } = stripGeometry(spec)
  // alette di base
  g.fillStyle = spec.baseColor
  g.fillRect(x, y, w, flap)
  g.fillRect(x, y + flap + 2 * h, w, flap)
  // dietro: rovesciato di 180° (si piega dietro e torna dritto)
  g.save()
  g.translate(x + w / 2, y + flap + h / 2)
  g.rotate(Math.PI)
  drawFigure(g, spec, n, -w / 2, -h / 2, w, h)
  g.restore()
  // davanti
  drawFigure(g, spec, n, x, y + flap + h, w, h)
  // linee di piega (tratteggiate)
  g.save()
  g.setLineDash([3, 2.5])
  g.strokeStyle = 'rgba(0,0,0,0.55)'
  g.lineWidth = 0.5
  for (const yy of [flap, flap + h, flap + 2 * h]) {
    g.beginPath()
    g.moveTo(x, y + yy)
    g.lineTo(x + w, y + yy)
    g.stroke()
  }
  g.restore()
  // sagoma di taglio
  g.strokeStyle = '#000'
  g.lineWidth = 0.6
  g.strokeRect(x, y, w, total)
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.font = '5px sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('piega', x + w / 2, y + flap / 2)
  g.fillText('piega', x + w / 2, y + flap + 2 * h + flap / 2)
}

/** Compone le pagine (una per foglio) a una data risoluzione. */
export async function composePaperTokenPages(spec: PaperTokenSpec, dpi: number, maxPages = 99): Promise<HTMLCanvasElement[]> {
  if (spec.source.type === 'asset') await preloadAssets([spec.source.asset])
  const L = layoutGrid(spec)
  if (L.perPage < 1) throw new Error('Il token è troppo grande per il foglio scelto: riduci la dimensione o usa un foglio più grande.')
  const total = tokenCount(spec)
  const pages: HTMLCanvasElement[] = []
  const k = dpi / 72
  let n = 0
  while (n < total && pages.length < maxPages) {
    const c = document.createElement('canvas')
    c.width = Math.round(L.pageW * k)
    c.height = Math.round(L.pageH * k)
    const g = c.getContext('2d')!
    g.fillStyle = '#fff'
    g.fillRect(0, 0, c.width, c.height)
    g.scale(k, k)
    // centra la griglia di strisce nella pagina
    const gridW = L.cols * L.geo.w + (L.cols - 1) * L.gap
    const x0 = (L.pageW - gridW) / 2
    for (let r = 0; r < L.rows && n < total; r++) {
      for (let col = 0; col < L.cols && n < total; col++) {
        drawStrip(g, spec, n, x0 + col * (L.geo.w + L.gap), L.m + r * (L.geo.total + L.gap))
        n++
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.55)'
    g.font = '7px sans-serif'
    g.textAlign = 'left'
    g.textBaseline = 'alphabetic'
    g.fillText('Token di carta: ritaglia lungo il contorno continuo, piega sulle linee tratteggiate (a metà e alle alette), piega le alette in direzioni opposte per formare la base. Stampa al 100%.', L.m, L.pageH - Math.max(4, L.m / 3))
    pages.push(c)
    await new Promise((r) => setTimeout(r, 0))
  }
  return pages
}

export async function paperTokensToPdf(spec: PaperTokenSpec, dpi = 300): Promise<Uint8Array> {
  const L = layoutGrid(spec)
  const pages = await composePaperTokenPages(spec, dpi)
  const pdf = await PDFDocument.create()
  pdf.setTitle('Token di carta')
  for (const c of pages) {
    const jpg = await pdf.embedJpg(await toBytes(c, 'image/jpeg', 0.93))
    const p = pdf.addPage([L.pageW, L.pageH])
    p.drawImage(jpg, { x: 0, y: 0, width: L.pageW, height: L.pageH })
    c.width = c.height = 0
  }
  return pdf.save()
}
