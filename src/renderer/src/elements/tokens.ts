// Segnalini: token numerati e colorati per mostri e PNG.
import type { ElementDef } from './registry'
import { OUT, centerText, circle, paint, radial, shade } from './draw'

export const TOKEN_COLORS = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#d35d9c', '#34495e', '#ecf0f1']

export const TOKENS: ElementDef[] = [
  {
    id: 'token', name: 'Token numerato', category: 'Segnalini', tags: ['token', 'segnalino', 'mostro', 'png', 'numero'], w: 1, h: 1, colorable: true, color: '#c0392b', layer: 'tokens',
    draw(g, o) {
      const r = Math.min(o.w, o.h) / 2 - 4
      const cx = o.w / 2
      const cy = o.h / 2
      circle(g, cx + 2, cy + 3, r)
      g.fillStyle = 'rgba(0,0,0,0.3)'
      g.fill()
      circle(g, cx, cy, r)
      paint(g, o.c, OUT, 3)
      circle(g, cx, cy, r - 6)
      g.fillStyle = radial(g, cx - r * 0.3, cy - r * 0.35, 1, r, shade(o.c, 0.3), shade(o.c, -0.18))
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.8)'
      g.lineWidth = 2
      g.stroke()
      if (o.text) {
        const light = isLight(o.c)
        centerText(g, o.text, cx, cy + 1, r * (o.text.length > 2 ? 0.8 : o.text.length > 1 ? 1.05 : 1.3), light ? '#1a1a1a' : '#fff', light ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)')
      }
    }
  }
]

function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}
