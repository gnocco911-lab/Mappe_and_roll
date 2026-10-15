// Simboli per mappe di viaggio (esagoni): montagne, colline, foreste, città, castelli...
// Sono disegnati in prospettiva "da carta geografica", come sulle mappe di viaggio tradizionali.
import type { ElementDef } from './registry'
import { OUT, alpha, circle, dropShadow, ellipse, line, paint, poly, rr, seeded, shade } from './draw'

function tree(g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  for (let i = 0; i < 3; i++) {
    const w = s * (1 - i * 0.22)
    const yy = y - i * s * 0.42
    poly(g, [x - w / 2, yy, x + w / 2, yy, x, yy - s * 0.62])
    paint(g, shade(col, i * 0.1), OUT, 1.6)
  }
  g.fillStyle = '#5a3a1e'
  g.fillRect(x - 1.8, y, 3.6, s * 0.2)
}

function house(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roof: string) {
  rr(g, x, y, w, h, 1)
  paint(g, '#e4d6b8', OUT, 1.6)
  poly(g, [x - 3, y + 1, x + w + 3, y + 1, x + w / 2, y - h * 0.8])
  paint(g, roof, OUT, 1.6)
  rr(g, x + w / 2 - 3, y + h - 8, 6, 8, 1)
  paint(g, '#6a4528', OUT, 1)
}

export const TRAVEL: ElementDef[] = [
  {
    id: 'v_montagne', name: 'Montagne', category: 'Viaggio', tags: ['montagna', 'monti', 'viaggio'], w: 1, h: 1, colorable: true, color: '#8c8478',
    draw(g, o) {
      const peaks: [number, number, number, number][] = [[28, 78, 30, 54], [66, 80, 34, 66], [48, 70, 28, 42]]
      for (const [cx, base, hw, hgt] of peaks.sort((a, b) => a[1] - b[1])) {
        dropShadow(g, () => poly(g, [cx - hw, base, cx, base - hgt, cx + hw, base]), 2, 3, 0.2)
        poly(g, [cx - hw, base, cx, base - hgt, cx + hw, base])
        paint(g, o.c, OUT, 2)
        poly(g, [cx, base - hgt, cx + hw, base, cx + hw * 0.1, base])
        g.fillStyle = alpha('#000', 0.22)
        g.fill()
        poly(g, [cx, base - hgt, cx + hw * 0.32, base - hgt * 0.64, cx + hw * 0.1, base - hgt * 0.7, cx - hw * 0.12, base - hgt * 0.62, cx - hw * 0.3, base - hgt * 0.66])
        paint(g, '#f6f8fb', OUT, 1.2)
      }
    }
  },
  {
    id: 'v_colline', name: 'Colline', category: 'Viaggio', tags: ['colline', 'collina', 'viaggio'], w: 1, h: 1, colorable: true, color: '#9bb560',
    draw(g, o) {
      for (const [cx, cy, r] of [[32, 66, 24], [68, 66, 26], [50, 54, 22]] as const) {
        g.beginPath()
        g.ellipse(cx, cy + 14, r, r * 0.8, 0, Math.PI, 0)
        g.closePath()
        paint(g, o.c, OUT, 2)
        g.beginPath()
        g.ellipse(cx + r * 0.25, cy + 14, r * 0.7, r * 0.7, 0, Math.PI * 1.15, Math.PI * 1.9)
        g.strokeStyle = alpha(shade(o.c, -0.5), 0.5)
        g.lineWidth = 1.6
        g.stroke()
      }
    }
  },
  {
    id: 'v_foresta', name: 'Foresta', category: 'Viaggio', tags: ['foresta', 'bosco', 'alberi', 'viaggio'], w: 1, h: 1, colorable: true, color: '#3f7d46',
    draw(g, o) {
      const rnd = seeded(7)
      const pts: [number, number, number][] = [[30, 56, 26], [66, 54, 28], [48, 70, 30], [22, 78, 22], [76, 78, 24], [50, 44, 22]]
      pts.sort((a, b) => a[1] - b[1])
      for (const [x, y, s] of pts) tree(g, x, y, s, shade(o.c, (rnd() - 0.5) * 0.25))
    }
  },
  {
    id: 'v_citta', name: 'Città', category: 'Viaggio', tags: ['città', 'metropoli', 'viaggio'], w: 1, h: 1, colorable: true, color: '#b5483d',
    draw(g, o) {
      rr(g, 10, 52, 80, 34, 3)
      paint(g, '#cfc7b6', OUT, 2)
      for (let i = 0; i < 6; i++) line(g, 16 + i * 14, 52, 16 + i * 14, 48, OUT, 2.5)
      house(g, 16, 60, 18, 16, o.c)
      house(g, 38, 58, 20, 18, shade(o.c, 0.12))
      house(g, 62, 60, 18, 16, o.c)
      rr(g, 44, 28, 14, 30, 1)
      paint(g, '#e4d6b8', OUT, 1.8)
      poly(g, [41, 30, 61, 30, 51, 12])
      paint(g, shade(o.c, -0.15), OUT, 1.8)
      line(g, 51, 12, 51, 4, OUT, 1.6)
      poly(g, [51, 4, 62, 8, 51, 11])
      paint(g, '#d4a72c', OUT, 1)
    }
  },
  {
    id: 'v_villaggio', name: 'Villaggio', category: 'Viaggio', tags: ['villaggio', 'paese', 'viaggio'], w: 1, h: 1, colorable: true, color: '#a65a3a',
    draw(g, o) {
      house(g, 18, 48, 22, 18, o.c)
      house(g, 52, 42, 24, 20, shade(o.c, 0.1))
      house(g, 34, 68, 20, 16, o.c)
      tree(g, 82, 70, 14, '#3f7d46')
    }
  },
  {
    id: 'v_castello', name: 'Castello', category: 'Viaggio', tags: ['castello', 'fortezza', 'viaggio'], w: 1, h: 1, colorable: true, color: '#aaa59a',
    draw(g, o) {
      for (const x of [14, 70]) {
        rr(g, x, 30, 18, 52, 2)
        paint(g, shade(o.c, -0.08), OUT, 2)
        for (let i = 0; i < 3; i++) { rr(g, x + 1 + i * 6.5, 24, 4.5, 8, 1); paint(g, shade(o.c, -0.08), OUT, 1.4) }
      }
      rr(g, 28, 40, 44, 42, 2)
      paint(g, o.c, OUT, 2)
      for (let i = 0; i < 6; i++) { rr(g, 29 + i * 7.2, 35, 5, 7, 1); paint(g, o.c, OUT, 1.4) }
      rr(g, 42, 58, 16, 24, 8)
      paint(g, '#3a2a1e', OUT, 1.6)
      rr(g, 40, 14, 20, 30, 2)
      paint(g, shade(o.c, 0.1), OUT, 2)
      poly(g, [37, 16, 63, 16, 50, 0])
      paint(g, '#b5483d', OUT, 1.8)
    }
  },
  {
    id: 'v_torre', name: 'Torre', category: 'Viaggio', tags: ['torre', 'mago', 'viaggio'], w: 1, h: 1, colorable: true, color: '#9d98a6',
    draw(g, o) {
      dropShadow(g, () => rr(g, 36, 26, 28, 56, 2), 3, 3, 0.2)
      rr(g, 36, 26, 28, 56, 2)
      paint(g, o.c, OUT, 2)
      for (let i = 0; i < 4; i++) { rr(g, 36 + i * 7.5, 20, 5, 8, 1); paint(g, o.c, OUT, 1.4) }
      rr(g, 46, 36, 8, 14, 4)
      paint(g, '#2a2a3a', OUT, 1.4)
      rr(g, 46, 62, 8, 20, 4)
      paint(g, '#3a2a1e', OUT, 1.4)
    }
  },
  {
    id: 'v_rovine', name: 'Rovine', category: 'Viaggio', tags: ['rovine', 'antiche', 'viaggio'], w: 1, h: 1, colorable: true, color: '#b3ab98',
    draw(g, o) {
      for (const [x, h] of [[20, 40], [40, 30], [62, 46], [80, 22]] as const) {
        poly(g, [x, 84, x, 84 - h, x + 6, 84 - h - 5, x + 12, 84 - h + 4, x + 12, 84])
        paint(g, shade(o.c, (x % 3) * 0.06), OUT, 1.8)
      }
      line(g, 14, 85, 90, 85, OUT, 2.5)
      circle(g, 52, 78, 4); paint(g, o.c, OUT, 1.4)
      circle(g, 30, 80, 3); paint(g, o.c, OUT, 1.4)
    }
  },
  {
    id: 'v_caverna', name: 'Caverna', category: 'Viaggio', tags: ['caverna', 'grotta', 'viaggio'], w: 1, h: 1, colorable: true, color: '#8c8478',
    draw(g, o) {
      g.beginPath()
      g.moveTo(8, 86)
      g.quadraticCurveTo(14, 30, 50, 24)
      g.quadraticCurveTo(86, 30, 92, 86)
      g.closePath()
      paint(g, o.c, OUT, 2)
      g.beginPath()
      g.moveTo(32, 86)
      g.quadraticCurveTo(34, 50, 50, 48)
      g.quadraticCurveTo(66, 50, 68, 86)
      g.closePath()
      paint(g, '#1b1612', OUT, 2)
      g.strokeStyle = alpha('#000', 0.25)
      g.lineWidth = 1.5
      for (const x of [20, 76]) { g.beginPath(); g.moveTo(x, 80); g.quadraticCurveTo(x + 2, 56, x + 8, 44); g.stroke() }
    }
  },
  {
    id: 'v_poi', name: 'Punto di interesse', category: 'Viaggio', tags: ['bandiera', 'poi', 'segnaposto', 'viaggio'], w: 1, h: 1, colorable: true, color: '#c0392b',
    draw(g, o) {
      line(g, 36, 90, 36, 20, '#5a3a1e', 4)
      poly(g, [38, 22, 78, 34, 38, 48])
      paint(g, o.c, OUT, 2)
      ellipse(g, 36, 90, 10, 4)
      paint(g, alpha('#000', 0.3), null)
    }
  }
]
