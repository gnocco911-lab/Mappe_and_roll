// Composizione delle pagine di stampa su canvas: fogli con segni di taglio, copertina con lo
// schema di montaggio e pagina singola "adatta al foglio". Le stesse pagine servono per
// l'anteprima e per il PDF, quindi l'anteprima è fedele al risultato.
import type { MapRenderer } from './MapRenderer'
import { planFit, type Sheet, type TilePlan, MM } from './layout'

export interface PageMeta {
  title: string
  versionLabel: string
  total: number
}

const FONT = '"Segoe UI", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif'

function newPage(wPt: number, hPt: number, dpi: number) {
  const k = dpi / 72
  const c = document.createElement('canvas')
  c.width = Math.round(wPt * k)
  c.height = Math.round(hPt * k)
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  g.scale(k, k) // da qui si disegna in punti (pt)
  return { c, g, k }
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}

/** Un foglio della mappa in scala reale, con segni di taglio e numerazione. */
export async function composeSheet(
  plan: TilePlan, sheet: Sheet, renderer: MapRenderer, dpi: number,
  flags: { cropMarks: boolean; sheetNumbers: boolean }, meta: PageMeta
): Promise<HTMLCanvasElement> {
  const { c, g } = newPage(plan.pageW, plan.pageH, dpi)
  const m = plan.margin
  const region = await renderer.renderRegion(sheet.mapX / 72, sheet.mapY / 72, sheet.w / 72, sheet.h / 72, dpi)
  g.drawImage(region, m, m, sheet.w, sheet.h)
  region.width = region.height = 0

  const x0 = m
  const y0 = m
  const x1 = m + sheet.w
  const y1 = m + sheet.h
  const tl = x0 + sheet.trimLeft
  const tt = y0 + sheet.trimTop

  // linee di accostamento dove si taglia la sovrapposizione
  g.save()
  g.strokeStyle = 'rgba(200,30,30,0.8)'
  g.lineWidth = 0.6
  g.setLineDash([4, 3])
  if (sheet.trimLeft > 0) { g.beginPath(); g.moveTo(tl, y0); g.lineTo(tl, y1); g.stroke() }
  if (sheet.trimTop > 0) { g.beginPath(); g.moveTo(x0, tt); g.lineTo(x1, tt); g.stroke() }
  g.restore()

  if (flags.cropMarks && m >= 8) {
    const len = Math.min(m - 3, 16)
    const gap = 2
    g.strokeStyle = '#000'
    g.lineWidth = 0.5
    g.beginPath()
    for (const x of [tl, x1]) {
      g.moveTo(x, y0 - gap); g.lineTo(x, y0 - gap - len) // in alto
      g.moveTo(x, y1 + gap); g.lineTo(x, y1 + gap + len) // in basso
    }
    for (const y of [tt, y1]) {
      g.moveTo(x0 - gap, y); g.lineTo(x0 - gap - len, y) // a sinistra
      g.moveTo(x1 + gap, y); g.lineTo(x1 + gap + len, y) // a destra
    }
    g.stroke()
  }

  if (flags.sheetNumbers && m >= 20) {
    g.fillStyle = '#222'
    g.font = `bold 8px ${FONT}`
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    const fy = plan.pageH - m / 2 + 1
    const n = sheet.neighbors
    const nb = [n.up ? `▲ ${n.up}` : '', n.left ? `◀ ${n.left}` : '', n.right ? `${n.right} ▶` : '', n.down ? `${n.down} ▼` : ''].filter(Boolean).join('   ')
    g.fillText(`Foglio ${sheet.n} di ${meta.total} · ${sheet.label}`, x0, fy)
    g.font = `7px ${FONT}`
    g.fillStyle = '#555'
    g.textAlign = 'center'
    g.fillText(nb, plan.pageW / 2, fy)
    g.textAlign = 'right'
    g.fillText(`${meta.title} · ${meta.versionLabel}`, plan.pageW - m, fy)
  }
  return c
}

/** Copertina con istruzioni e schema di montaggio (include un quadrato di controllo da 2,54 cm). */
export async function composeCover(plan: TilePlan, renderer: MapRenderer, dpi: number, meta: PageMeta & { cols: number; rows: number; paperName: string }): Promise<HTMLCanvasElement> {
  const { c, g } = newPage(plan.pageW, plan.pageH, dpi)
  const m = Math.max(plan.margin, 28)
  const W = plan.pageW
  g.textBaseline = 'top'
  g.fillStyle = '#111'
  g.font = `bold 20px ${FONT}`
  g.textAlign = 'left'
  g.fillText(meta.title, m, m)
  g.font = `12px ${FONT}`
  g.fillStyle = '#555'
  g.fillText(`${meta.versionLabel} · Schema di montaggio`, m, m + 26)

  // quadrato di controllo scala: 1 casella = 2,54 cm = 72 pt
  const qx = W - m - 72
  g.strokeStyle = '#000'
  g.lineWidth = 0.8
  g.strokeRect(qx, m, 72, 72)
  g.fillStyle = '#333'
  g.font = `8px ${FONT}`
  g.textAlign = 'center'
  g.fillText('2,54 cm = 1 casella', qx + 36, m + 76)
  g.fillText('(controllo scala)', qx + 36, m + 86)

  g.textAlign = 'left'
  g.fillStyle = '#222'
  g.font = `10.5px ${FONT}`
  const mapCm = [(plan.mapW / 72) * 2.54, (plan.mapH / 72) * 2.54]
  const fmt = (v: number) => v.toFixed(1).replace('.', ',')
  const info = [
    `Mappa: ${plan.mapW / 72} × ${plan.mapH / 72} caselle  =  ${fmt(mapCm[0])} × ${fmt(mapCm[1])} cm  =  ${fmt((plan.mapW / 72) * 1.5)} × ${fmt((plan.mapH / 72) * 1.5)} m`,
    `${meta.total} fogli ${meta.paperName.split(' ')[0]} (${meta.cols} × ${meta.rows}), ${plan.portrait ? 'verticali' : 'orizzontali'}`,
    'Stampa al 100% (“dimensione reale”), senza “adatta alla pagina”. Verifica che il quadrato qui accanto misuri 2,54 cm.',
    'Taglia lungo i segni agli angoli di ogni foglio: i margini bianchi e, a sinistra e in alto, la striscia di sovrapposizione (linea rossa tratteggiata).',
    'Accosta i fogli come nello schema e incollali dietro con il nastro adesivo.'
  ]
  let y = m + 52
  const maxW = qx - m - 14
  for (const t of info) {
    for (const l of wrap(g, t, maxW)) { g.fillText(l, m, y); y += 14 }
    y += 3
  }

  // schema: miniatura della mappa con i fogli sovrapposti
  const top = Math.max(y + 10, m + 100)
  const availW = W - 2 * m
  const availH = plan.pageH - top - m
  const s = Math.min(availW / plan.mapW, availH / plan.mapH)
  const dw = plan.mapW * s
  const dh = plan.mapH * s
  const dx = m + (availW - dw) / 2
  const dy = top
  const thumbPpc = Math.min(60, 1600 / (plan.mapW / 72))
  const thumb = await renderer.renderRegion(0, 0, plan.mapW / 72, plan.mapH / 72, thumbPpc)
  g.globalAlpha = 0.75
  g.drawImage(thumb, dx, dy, dw, dh)
  g.globalAlpha = 1
  thumb.width = thumb.height = 0
  for (const sh of plan.sheets) {
    const rx = dx + sh.mapX * s
    const ry = dy + sh.mapY * s
    const rw = sh.w * s
    const rh = sh.h * s
    // striscia di sovrapposizione
    g.fillStyle = 'rgba(220,40,40,0.18)'
    if (sh.trimLeft) g.fillRect(rx, ry, sh.trimLeft * s, rh)
    if (sh.trimTop) g.fillRect(rx, ry, rw, sh.trimTop * s)
    g.strokeStyle = 'rgba(20,60,160,0.95)'
    g.lineWidth = 1.2
    g.strokeRect(rx, ry, rw, rh)
    const fs = Math.max(10, Math.min(rw, rh) * 0.28)
    g.font = `bold ${fs}px ${FONT}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.lineJoin = 'round'
    g.lineWidth = fs * 0.2
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.strokeText(String(sh.n), rx + rw / 2, ry + rh / 2)
    g.fillStyle = 'rgba(20,60,160,1)'
    g.fillText(String(sh.n), rx + rw / 2, ry + rh / 2)
    g.font = `${Math.max(7, fs * 0.38)}px ${FONT}`
    g.fillStyle = '#333'
    g.fillText(sh.label, rx + rw / 2, ry + rh / 2 + fs * 0.72)
  }
  return c
}

/** Mappa intera su un solo foglio, ridotta per stare nella pagina. */
export async function composeFitPage(
  renderer: MapRenderer, mapWcells: number, mapHcells: number,
  o: { paper: Parameters<typeof planFit>[2]; orientation: Parameters<typeof planFit>[3]; marginMm: number; dpi: number }, meta: PageMeta
): Promise<{ canvas: HTMLCanvasElement; pageW: number; pageH: number }> {
  const f = planFit(mapWcells, mapHcells, o.paper, o.orientation, o.marginMm)
  const { c, g } = newPage(f.pageW, f.pageH, o.dpi)
  // risoluzione della mappa: pixel per casella a seconda della scala di riduzione
  const ppc = f.scale * o.dpi
  const img = await renderer.renderRegion(0, 0, mapWcells, mapHcells, ppc)
  g.drawImage(img, f.x, f.y, f.w, f.h)
  img.width = img.height = 0
  g.strokeStyle = 'rgba(0,0,0,0.5)'
  g.lineWidth = 0.5
  g.strokeRect(f.x, f.y, f.w, f.h)
  g.fillStyle = '#444'
  g.font = `8px ${FONT}`
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  const cm = (2.54 * f.scale).toFixed(2).replace('.', ',')
  const fy = f.pageH - f.margin + 4
  g.fillText(`${meta.title} · ${meta.versionLabel}`, f.margin, fy)
  g.textAlign = 'right'
  g.fillText(`Scala ridotta: 1 casella = ${cm} cm (non adatta alle miniature)`, f.pageW - f.margin, fy)
  void MM
  return { canvas: c, pageW: f.pageW, pageH: f.pageH }
}
