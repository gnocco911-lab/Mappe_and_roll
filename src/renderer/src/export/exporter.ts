// API di alto livello per l'esportazione: PDF a più fogli, PDF/PNG su pagina singola, PNG a 300 DPI.
import { PDFDocument } from 'pdf-lib'
import type { CustomAsset, InkMode, MapDoc, ViewMode } from '../types'
import { getGrid } from '../core/grid'
import { MapRenderer } from './MapRenderer'
import { PAPERS, planTiles, type Orientation, type PaperId } from './layout'
import { composeCover, composeFitPage, composeSheet, type PageMeta } from './pages'

export type ExportKind = 'pdfTiled' | 'pdfFit' | 'pngFit' | 'pngHigh'

export interface ExportSettings {
  kind: ExportKind
  paper: PaperId
  orientation: Orientation
  marginMm: number
  overlapMm: number
  dpi: number
  cropMarks: boolean
  sheetNumbers: boolean
  assemblyPage: boolean
  ink: InkMode
  showGrid: boolean
  versions: ViewMode[]
}

export const DEFAULT_SETTINGS: ExportSettings = {
  kind: 'pdfTiled',
  paper: 'A4',
  orientation: 'auto',
  marginMm: 12,
  overlapMm: 8,
  dpi: 200,
  cropMarks: true,
  sheetNumbers: true,
  assemblyPage: true,
  ink: 'color',
  showGrid: true,
  versions: ['master', 'players']
}

export const VERSION_LABEL: Record<ViewMode, string> = { master: 'Master', players: 'Giocatori' }
export const VERSION_SUFFIX: Record<ViewMode, string> = { master: '_master', players: '_giocatori' }

export type Progress = (fraction: number, text: string) => void

export function toBytes(c: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality = 0.9): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    c.toBlob(async (b) => {
      if (!b) return reject(new Error('Impossibile codificare l\'immagine (memoria insufficiente?)'))
      resolve(new Uint8Array(await b.arrayBuffer()))
    }, type, quality)
  })
}

// ---------------------------------------------------------------- PNG con DPI

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Inserisce nel PNG l'informazione di risoluzione (pHYs), così i programmi di stampa conoscono i DPI. */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(4 + 4 + 9 + 4)
  const dv = new DataView(chunk.buffer)
  dv.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // "pHYs"
  dv.setUint32(8, ppm)
  dv.setUint32(12, ppm)
  chunk[16] = 1
  dv.setUint32(17, crc32(chunk.subarray(4, 17)))
  // dopo la firma (8 byte) e il blocco IHDR (25 byte)
  const out = new Uint8Array(png.length + chunk.length)
  out.set(png.subarray(0, 33), 0)
  out.set(chunk, 33)
  out.set(png.subarray(33), 33 + chunk.length)
  return out
}

// ---------------------------------------------------------------- esportazioni

export interface Output {
  version: ViewMode
  bytes: Uint8Array
  /** informazioni da mostrare all'utente (es. DPI ridotti) */
  note?: string
}

export function describePlan(doc: MapDoc, s: ExportSettings) {
  const g = getGrid(doc.gridType, doc.cols, doc.rows)
  const plan = planTiles(g.width, g.height, s)
  return { plan, grid: g }
}

const metaFor = (doc: MapDoc, v: ViewMode, total = 1): PageMeta => ({ title: doc.name, versionLabel: `Versione ${VERSION_LABEL[v]}`, total })

export async function exportVersion(
  doc: MapDoc, assets: Record<string, CustomAsset>, version: ViewMode, s: ExportSettings, progress?: Progress
): Promise<Output> {
  const g = getGrid(doc.gridType, doc.cols, doc.rows)
  const renderer = await MapRenderer.create(doc, assets, { view: version, ink: s.ink, showGrid: s.showGrid })
  try {
    if (s.kind === 'pdfTiled') {
      const plan = planTiles(g.width, g.height, s)
      const pdf = await PDFDocument.create()
      pdf.setTitle(`${doc.name} — ${VERSION_LABEL[version]}`)
      pdf.setCreator('Mappe di Battaglia D&D')
      const meta = metaFor(doc, version, plan.sheets.length)
      const addPage = async (canvas: HTMLCanvasElement) => {
        const jpg = await pdf.embedJpg(await toBytes(canvas, 'image/jpeg', 0.9))
        const page = pdf.addPage([plan.pageW, plan.pageH])
        page.drawImage(jpg, { x: 0, y: 0, width: plan.pageW, height: plan.pageH })
        canvas.width = canvas.height = 0
      }
      if (s.assemblyPage && plan.sheets.length > 1) {
        progress?.(0, `${VERSION_LABEL[version]}: schema di montaggio…`)
        await addPage(await composeCover(plan, renderer, 150, { ...meta, cols: plan.cols, rows: plan.rows, paperName: PAPERS[s.paper].name }))
      }
      for (const sheet of plan.sheets) {
        progress?.(sheet.n / (plan.sheets.length + 1), `${VERSION_LABEL[version]}: foglio ${sheet.n} di ${plan.sheets.length}…`)
        await addPage(await composeSheet(plan, sheet, renderer, s.dpi, s, meta))
      }
      return { version, bytes: await pdf.save() }
    }

    if (s.kind === 'pdfFit' || s.kind === 'pngFit') {
      progress?.(0.2, `${VERSION_LABEL[version]}: disegno della pagina…`)
      const page = await composeFitPage(renderer, g.width, g.height, { paper: s.paper, orientation: s.orientation, marginMm: s.marginMm, dpi: s.kind === 'pngFit' ? 300 : s.dpi }, metaFor(doc, version))
      if (s.kind === 'pngFit') return { version, bytes: setPngDpi(await toBytes(page.canvas, 'image/png'), 300) }
      const pdf = await PDFDocument.create()
      pdf.setTitle(`${doc.name} — ${VERSION_LABEL[version]}`)
      const jpg = await pdf.embedJpg(await toBytes(page.canvas, 'image/jpeg', 0.92))
      const p = pdf.addPage([page.pageW, page.pageH])
      p.drawImage(jpg, { x: 0, y: 0, width: page.pageW, height: page.pageH })
      return { version, bytes: await pdf.save() }
    }

    // PNG ad alta risoluzione in scala reale (300 DPI), con limite di sicurezza sulla memoria
    let dpi = 300
    const maxPixels = 150e6
    const maxSide = 30000
    let note: string | undefined
    const allowed = Math.floor(Math.min(maxSide / Math.max(g.width, g.height), Math.sqrt(maxPixels / (g.width * g.height))))
    if (allowed < 300) {
      dpi = Math.max(72, allowed)
      note = `La mappa è molto grande: risoluzione ridotta a ${dpi} DPI per non esaurire la memoria.`
    }
    const canvas = await renderer.renderRegion(0, 0, g.width, g.height, dpi, (f) => progress?.(f, `${VERSION_LABEL[version]}: disegno…`))
    progress?.(0.95, `${VERSION_LABEL[version]}: codifica PNG…`)
    const bytes = setPngDpi(await toBytes(canvas, 'image/png'), dpi)
    canvas.width = canvas.height = 0
    return { version, bytes, note }
  } finally {
    renderer.dispose()
  }
}

// ---------------------------------------------------------------- anteprima

export interface PreviewPage {
  label: string
  url: string
  w: number
  h: number
}

/** Pagine di anteprima a bassa risoluzione (data URL), nello stesso aspetto della stampa. */
export async function buildPreview(
  doc: MapDoc, assets: Record<string, CustomAsset>, version: ViewMode, s: ExportSettings, progress?: Progress
): Promise<PreviewPage[]> {
  const g = getGrid(doc.gridType, doc.cols, doc.rows)
  const renderer = await MapRenderer.create(doc, assets, { view: version, ink: s.ink, showGrid: s.showGrid })
  const pages: PreviewPage[] = []
  const shot = (c: HTMLCanvasElement, label: string) => {
    pages.push({ label, url: c.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height })
    c.width = c.height = 0
  }
  try {
    const dpi = 55
    if (s.kind === 'pdfTiled') {
      const plan = planTiles(g.width, g.height, s)
      const meta = metaFor(doc, version, plan.sheets.length)
      if (s.assemblyPage && plan.sheets.length > 1) {
        shot(await composeCover(plan, renderer, dpi * 1.4, { ...meta, cols: plan.cols, rows: plan.rows, paperName: PAPERS[s.paper].name }), 'Schema di montaggio')
      }
      for (const sheet of plan.sheets) {
        progress?.(sheet.n / plan.sheets.length, `Foglio ${sheet.n} di ${plan.sheets.length}…`)
        shot(await composeSheet(plan, sheet, renderer, dpi, s, meta), `Foglio ${sheet.n} (${sheet.label})`)
      }
    } else if (s.kind === 'pdfFit' || s.kind === 'pngFit') {
      const page = await composeFitPage(renderer, g.width, g.height, { paper: s.paper, orientation: s.orientation, marginMm: s.marginMm, dpi: 80 }, metaFor(doc, version))
      shot(page.canvas, 'Pagina singola')
    } else {
      const c = await renderer.renderRegion(0, 0, g.width, g.height, Math.min(60, 1800 / Math.max(g.width, g.height)))
      shot(c, `Immagine ${Math.round(g.width * 300)} × ${Math.round(g.height * 300)} px (300 DPI)`)
    }
  } finally {
    renderer.dispose()
  }
  return pages
}
