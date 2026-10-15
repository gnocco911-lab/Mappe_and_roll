// Funzioni di aiuto per disegnare gli elementi vettoriali (vista dall'alto, stile coerente:
// contorno scuro, colori caldi, ombra leggera sotto ogni oggetto).
// Lo spazio di disegno è in "unità di progetto": 100 unità = 1 casella.
import { makeRng } from '../core/textures'

export const OUT = '#2a1f16' // colore del contorno
export const LW = 3 // spessore standard del contorno

export const COL = {
  wood: '#a1703c',
  woodD: '#6d4624',
  woodL: '#c38d52',
  stone: '#a9a8a2',
  stoneD: '#74736e',
  stoneL: '#cfcec8',
  metal: '#767b84',
  metalD: '#4a4e55',
  gold: '#d6a933',
  cloth: '#b23a3a',
  white: '#f1ecdf',
  green: '#4d8a3a',
  fire: '#ff9a2e'
}

export interface DrawOpts {
  /** dimensione di progetto in unità */
  w: number
  h: number
  /** colore principale (può essere ricolorato dall'utente) */
  c: string
  /** testo associato (numero del token, ecc.) */
  text?: string
  /** modalità inchiostro: gli effetti luminosi si disattivano quando non è 'color' */
  ink: 'color' | 'light' | 'bw'
}

export type DrawFn = (g: CanvasRenderingContext2D, o: DrawOpts) => void

// ------------------------------------------------------------ colori

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

/** Schiarisce (amt > 0) o scurisce (amt < 0) un colore. amt tra -1 e 1. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex)
  if (amt >= 0) return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt)
  return toHex(r * (1 + amt), g * (1 + amt), b * (1 + amt))
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r},${g},${b},${a})`
}

// ------------------------------------------------------------ forme

/** Rettangolo con angoli arrotondati (solo tracciato). */
export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export function circle(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
}

export function ellipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot = 0) {
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
}

export function poly(g: CanvasRenderingContext2D, pts: number[]) {
  g.beginPath()
  g.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  g.closePath()
}

/** Riempie e contorna il tracciato corrente. */
export function paint(g: CanvasRenderingContext2D, fill: string | null, stroke: string | null = OUT, lw = LW) {
  if (fill) {
    g.fillStyle = fill
    g.fill()
  }
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = lw
    g.lineJoin = 'round'
    g.lineCap = 'round'
    g.stroke()
  }
}

/** Ombra morbida sotto l'oggetto: ridisegna il tracciato spostato e scuro. */
export function dropShadow(g: CanvasRenderingContext2D, path: () => void, dx = 3, dy = 4, a = 0.28) {
  g.save()
  g.translate(dx, dy)
  path()
  g.fillStyle = `rgba(0,0,0,${a})`
  g.fill()
  g.restore()
}

export function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, stroke = OUT, lw = LW) {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = stroke
  g.lineWidth = lw
  g.lineCap = 'round'
  g.stroke()
}

/** Gradiente radiale rapido. */
export function radial(g: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, c0: string, c1: string) {
  const gr = g.createRadialGradient(cx, cy, r0, cx, cy, r1)
  gr.addColorStop(0, c0)
  gr.addColorStop(1, c1)
  return gr
}

export function linear(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c0: string, c1: string) {
  const gr = g.createLinearGradient(x0, y0, x1, y1)
  gr.addColorStop(0, c0)
  gr.addColorStop(1, c1)
  return gr
}

/** Generatore casuale stabile per elementi "irregolari" (sempre lo stesso risultato). */
export function seeded(seed: number) {
  return makeRng(seed)
}

/** Fiamma stilizzata. */
export function flame(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const gr = radial(g, cx, cy, 0, r, '#fff6b0', '#ff7a1a')
  g.fillStyle = gr
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const rad = r * (i % 2 === 0 ? 1 : 0.6)
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(160,50,0,0.7)'
  g.lineWidth = 1.5
  g.stroke()
  g.fillStyle = 'rgba(255,255,220,0.95)'
  circle(g, cx, cy, r * 0.28)
  g.fill()
}

/** Alone luminoso (solo quando l'inchiostro è a colori). */
export function glow(g: CanvasRenderingContext2D, o: DrawOpts, cx: number, cy: number, r: number, color = '255,190,80', a = 0.38) {
  if (o.ink !== 'color') return
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r)
  gr.addColorStop(0, `rgba(${color},${a})`)
  gr.addColorStop(1, `rgba(${color},0)`)
  g.fillStyle = gr
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()
}

/** Testo centrato (numero del token, ecc.). */
export function centerText(
  g: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number,
  fill = '#fff', stroke: string | null = null, font = 'Verdana, "DejaVu Sans", sans-serif'
) {
  g.font = `bold ${size}px ${font}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = size * 0.16
    g.lineJoin = 'round'
    g.strokeText(text, cx, cy)
  }
  g.fillStyle = fill
  g.fillText(text, cx, cy)
}
