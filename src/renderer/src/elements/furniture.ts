// Arredi: tavoli, sedie, letti, bauli, barili, casse, librerie, armadi, bancone, camino...
import type { ElementDef } from './registry'
import {
  COL, OUT, LW, alpha, centerText, circle, dropShadow, ellipse, flame, glow, line, linear, paint, radial, rr, seeded, shade
} from './draw'

/** Venature del legno lungo la direzione x. */
function grain(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, n: number, seed: number) {
  const rnd = seeded(seed)
  g.save()
  rr(g, x, y, w, h, 2)
  g.clip()
  g.strokeStyle = alpha(color, 0.55)
  g.lineWidth = 1.2
  for (let i = 0; i < n; i++) {
    const yy = y + (i + 0.5 + (rnd() - 0.5) * 0.6) * (h / n)
    g.beginPath()
    g.moveTo(x, yy)
    g.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 6, x + w * 0.6, yy + (rnd() - 0.5) * 6, x + w, yy)
    g.stroke()
  }
  g.restore()
}

export const FURNITURE: ElementDef[] = [
  {
    id: 'tavolo_tondo', name: 'Tavolo rotondo', category: 'Arredi', tags: ['tavolo', 'mobili'], w: 2, h: 2, colorable: true, color: COL.wood,
    draw(g, o) {
      const r = o.w / 2 - 6
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, r))
      circle(g, o.w / 2, o.h / 2, r)
      paint(g, o.c)
      circle(g, o.w / 2, o.h / 2, r - 7)
      paint(g, shade(o.c, 0.12), alpha('#000', 0.35), 1.5)
      g.strokeStyle = alpha('#000', 0.18)
      g.lineWidth = 1.2
      for (let i = 1; i <= 3; i++) {
        g.beginPath()
        g.arc(o.w / 2, o.h / 2, (r - 7) * (i / 4), 0.3, 2.4)
        g.stroke()
      }
    }
  },
  {
    id: 'tavolo', name: 'Tavolo', category: 'Arredi', tags: ['tavolo', 'mobili'], w: 2, h: 1, colorable: true, color: COL.wood,
    draw(g, o) {
      dropShadow(g, () => rr(g, 6, 8, o.w - 12, o.h - 16, 6))
      rr(g, 6, 8, o.w - 12, o.h - 16, 6)
      paint(g, o.c)
      grain(g, 10, 12, o.w - 20, o.h - 24, shade(o.c, -0.5), 5, 3)
      line(g, o.w / 2, 10, o.w / 2, o.h - 10, alpha('#000', 0.35), 1.5)
    }
  },
  {
    id: 'tavolo_lungo', name: 'Tavolo lungo', category: 'Arredi', tags: ['tavolo', 'banchetto'], w: 3, h: 1, colorable: true, color: COL.wood,
    draw(g, o) {
      dropShadow(g, () => rr(g, 6, 14, o.w - 12, o.h - 28, 6))
      rr(g, 6, 14, o.w - 12, o.h - 28, 6)
      paint(g, o.c)
      grain(g, 10, 18, o.w - 20, o.h - 36, shade(o.c, -0.5), 4, 8)
      for (const x of [o.w / 3, (2 * o.w) / 3]) line(g, x, 16, x, o.h - 16, alpha('#000', 0.35), 1.5)
    }
  },
  {
    id: 'sedia', name: 'Sedia', category: 'Arredi', tags: ['sedia', 'mobili'], w: 0.7, h: 0.7, colorable: true, color: COL.woodL,
    draw(g, o) {
      dropShadow(g, () => rr(g, 8, 10, o.w - 16, o.h - 16, 5), 2, 3)
      rr(g, 8, 14, o.w - 16, o.h - 22, 5) // seduta
      paint(g, o.c)
      rr(g, 7, 6, o.w - 14, 12, 4) // schienale (verso l'alto)
      paint(g, shade(o.c, -0.3))
    }
  },
  {
    id: 'sgabello', name: 'Sgabello', category: 'Arredi', tags: ['sgabello', 'mobili'], w: 0.5, h: 0.5, colorable: true, color: COL.woodL,
    draw(g, o) {
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, o.w / 2 - 5), 2, 3)
      circle(g, o.w / 2, o.h / 2, o.w / 2 - 5)
      paint(g, o.c)
      circle(g, o.w / 2, o.h / 2, o.w / 2 - 12)
      paint(g, shade(o.c, 0.15), alpha('#000', 0.3), 1.2)
    }
  },
  {
    id: 'panca', name: 'Panca', category: 'Arredi', tags: ['panca', 'mobili'], w: 2, h: 0.5, colorable: true, color: COL.woodL,
    draw(g, o) {
      dropShadow(g, () => rr(g, 5, 6, o.w - 10, o.h - 12, 4), 2, 3)
      rr(g, 5, 6, o.w - 10, o.h - 12, 4)
      paint(g, o.c)
      line(g, 8, o.h / 2, o.w - 8, o.h / 2, alpha('#000', 0.3), 1.4)
    }
  },
  {
    id: 'letto', name: 'Letto singolo', category: 'Arredi', tags: ['letto', 'mobili', 'camera'], w: 1, h: 2, colorable: true, color: '#3d6fb5',
    draw(g, o) {
      dropShadow(g, () => rr(g, 4, 4, o.w - 8, o.h - 8, 6))
      rr(g, 4, 4, o.w - 8, o.h - 8, 6)
      paint(g, COL.woodD)
      rr(g, 10, 10, o.w - 20, o.h - 20, 5) // materasso
      paint(g, COL.white, alpha('#000', 0.45), 1.8)
      rr(g, 16, 16, o.w - 32, 38, 10) // cuscino
      paint(g, '#fffdf3', alpha('#000', 0.4), 1.5)
      rr(g, 10, 70, o.w - 20, o.h - 80, 5) // coperta
      paint(g, o.c)
      line(g, 12, 82, o.w - 12, 82, shade(o.c, 0.4), 4)
    }
  },
  {
    id: 'letto_doppio', name: 'Letto matrimoniale', category: 'Arredi', tags: ['letto', 'mobili', 'camera'], w: 2, h: 2, colorable: true, color: '#9b3d4a',
    draw(g, o) {
      dropShadow(g, () => rr(g, 4, 4, o.w - 8, o.h - 8, 6))
      rr(g, 4, 4, o.w - 8, o.h - 8, 6)
      paint(g, COL.woodD)
      rr(g, 12, 12, o.w - 24, o.h - 24, 5)
      paint(g, COL.white, alpha('#000', 0.45), 1.8)
      for (const x of [22, o.w / 2 + 6]) {
        rr(g, x, 20, o.w / 2 - 28, 42, 10)
        paint(g, '#fffdf3', alpha('#000', 0.4), 1.5)
      }
      rr(g, 12, 82, o.w - 24, o.h - 94, 5)
      paint(g, o.c)
      line(g, 14, 96, o.w - 14, 96, shade(o.c, 0.4), 5)
    }
  },
  {
    id: 'baule', name: 'Baule', category: 'Arredi', tags: ['baule', 'tesoro', 'contenitore'], w: 1, h: 0.7, colorable: true, color: COL.wood,
    draw(g, o) {
      dropShadow(g, () => rr(g, 8, 10, o.w - 16, o.h - 20, 6))
      rr(g, 8, 10, o.w - 16, o.h - 20, 6)
      paint(g, o.c)
      grain(g, 12, 14, o.w - 24, o.h - 28, shade(o.c, -0.5), 4, 5)
      for (const x of [22, o.w - 30]) { // fasce metalliche
        rr(g, x, 10, 8, o.h - 20, 2)
        paint(g, COL.metal, OUT, 1.5)
      }
      rr(g, o.w / 2 - 6, o.h / 2 - 7, 12, 14, 2) // serratura
      paint(g, COL.gold, OUT, 1.5)
    }
  },
  {
    id: 'barile', name: 'Barile', category: 'Arredi', tags: ['barile', 'botte', 'contenitore'], w: 0.8, h: 0.8, colorable: true, color: COL.wood,
    draw(g, o) {
      const r = o.w / 2 - 5
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, r), 2, 3)
      circle(g, o.w / 2, o.h / 2, r)
      paint(g, o.c)
      for (let i = -2; i <= 2; i++) line(g, o.w / 2 + i * r * 0.3, o.h / 2 - Math.sqrt(Math.max(0, r * r - (i * r * 0.3) ** 2)) + 2, o.w / 2 + i * r * 0.3, o.h / 2 + Math.sqrt(Math.max(0, r * r - (i * r * 0.3) ** 2)) - 2, alpha('#000', 0.3), 1.2)
      for (const k of [0.78, 0.45]) {
        circle(g, o.w / 2, o.h / 2, r * k)
        paint(g, null, COL.metalD, 2.4)
      }
      circle(g, o.w / 2, o.h / 2, 3)
      paint(g, COL.metalD, null)
    }
  },
  {
    id: 'cassa', name: 'Cassa', category: 'Arredi', tags: ['cassa', 'scatola', 'contenitore'], w: 0.9, h: 0.9, colorable: true, color: '#b88a4e',
    draw(g, o) {
      dropShadow(g, () => rr(g, 6, 6, o.w - 12, o.h - 12, 3), 2, 3)
      rr(g, 6, 6, o.w - 12, o.h - 12, 3)
      paint(g, o.c)
      rr(g, 14, 14, o.w - 28, o.h - 28, 2)
      paint(g, shade(o.c, 0.1), alpha('#000', 0.4), 1.5)
      line(g, 14, 14, o.w - 14, o.h - 14, alpha('#000', 0.55), 3)
      line(g, o.w - 14, 14, 14, o.h - 14, alpha('#000', 0.55), 3)
    }
  },
  {
    id: 'libreria', name: 'Libreria', category: 'Arredi', tags: ['libri', 'scaffale', 'mobili'], w: 2, h: 0.5, colorable: true, color: COL.woodD,
    draw(g, o) {
      dropShadow(g, () => rr(g, 3, 4, o.w - 6, o.h - 8, 3), 2, 3)
      rr(g, 3, 4, o.w - 6, o.h - 8, 3)
      paint(g, o.c)
      const rnd = seeded(77)
      const cols = ['#8a2f2f', '#2f5a8a', '#3d7a4a', '#8a6a2f', '#5a2f7a', '#7a7a7a']
      let x = 8
      while (x < o.w - 14) {
        const bw = 7 + rnd() * 6
        const bh = o.h - 20 - rnd() * 6
        rr(g, x, 10, bw, bh, 1.5)
        paint(g, cols[Math.floor(rnd() * cols.length)], OUT, 1.2)
        x += bw + 1.5
      }
    }
  },
  {
    id: 'armadio', name: 'Armadio', category: 'Arredi', tags: ['armadio', 'mobili'], w: 1, h: 0.6, colorable: true, color: COL.wood,
    draw(g, o) {
      dropShadow(g, () => rr(g, 4, 4, o.w - 8, o.h - 8, 3), 2, 3)
      rr(g, 4, 4, o.w - 8, o.h - 8, 3)
      paint(g, o.c)
      rr(g, 9, 9, o.w - 18, o.h - 18, 2)
      paint(g, shade(o.c, 0.1), alpha('#000', 0.35), 1.4)
      line(g, o.w / 2, 9, o.w / 2, o.h - 9, alpha('#000', 0.5), 1.8)
      for (const x of [o.w / 2 - 7, o.w / 2 + 7]) {
        circle(g, x, o.h / 2, 2.5)
        paint(g, COL.gold, OUT, 1)
      }
    }
  },
  {
    id: 'bancone', name: 'Bancone da taverna', category: 'Arredi', tags: ['bancone', 'taverna', 'bar'], w: 3, h: 1, colorable: true, color: COL.woodD,
    draw(g, o) {
      dropShadow(g, () => rr(g, 4, 10, o.w - 8, o.h - 20, 8))
      rr(g, 4, 10, o.w - 8, o.h - 20, 8)
      paint(g, o.c)
      rr(g, 12, 18, o.w - 24, o.h - 36, 5)
      paint(g, shade(o.c, 0.22), alpha('#000', 0.4), 1.5)
      grain(g, 16, 22, o.w - 32, o.h - 44, shade(o.c, -0.45), 3, 21)
      // boccali
      const rnd = seeded(4)
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 62 + rnd() * 10
        const y = 36 + rnd() * 28
        circle(g, x, y, 7)
        paint(g, '#d9b36a', OUT, 1.4)
        circle(g, x, y, 4)
        paint(g, '#f2dd9c', null)
      }
    }
  },
  {
    id: 'camino', name: 'Camino', category: 'Arredi', tags: ['camino', 'fuoco', 'focolare'], w: 2, h: 1, colorable: true, color: COL.stone,
    draw(g, o) {
      glow(g, o, o.w / 2, o.h * 0.65, 130)
      dropShadow(g, () => rr(g, 3, 3, o.w - 6, o.h - 6, 3))
      rr(g, 3, 3, o.w - 6, o.h - 6, 3) // muro in pietra
      paint(g, o.c)
      for (let i = 0; i < 6; i++) { // conci
        line(g, 3 + (i * (o.w - 6)) / 6, 3, 3 + (i * (o.w - 6)) / 6, 24, alpha('#000', 0.35), 1.4)
      }
      rr(g, 24, 24, o.w - 48, o.h - 30, 4) // focolare
      paint(g, '#241812', OUT, 2)
      g.fillStyle = radial(g, o.w / 2, o.h * 0.68, 2, 46, '#ffcc55', '#7a1c06')
      ellipse(g, o.w / 2, o.h * 0.68, 46, 24)
      g.fill()
      flame(g, o.w / 2 - 16, o.h * 0.66, 11)
      flame(g, o.w / 2 + 14, o.h * 0.7, 9)
      flame(g, o.w / 2, o.h * 0.6, 8)
    }
  },
  {
    id: 'tappeto', name: 'Tappeto', category: 'Arredi', tags: ['tappeto', 'decorazione'], w: 2, h: 3, colorable: true, color: COL.cloth,
    draw(g, o) {
      rr(g, 6, 6, o.w - 12, o.h - 12, 4)
      paint(g, o.c)
      rr(g, 16, 16, o.w - 32, o.h - 32, 3)
      paint(g, shade(o.c, 0.28), shade(o.c, -0.5), 2)
      rr(g, 28, 28, o.w - 56, o.h - 56, 3)
      paint(g, shade(o.c, -0.2), shade(o.c, -0.6), 2)
      // motivo a rombi
      g.save()
      rr(g, 28, 28, o.w - 56, o.h - 56, 3)
      g.clip()
      g.strokeStyle = alpha(COL.gold, 0.8)
      g.lineWidth = 2
      for (let y = 40; y < o.h - 30; y += 36) {
        g.beginPath()
        g.moveTo(o.w / 2, y - 14); g.lineTo(o.w / 2 + 22, y + 4); g.lineTo(o.w / 2, y + 22); g.lineTo(o.w / 2 - 22, y + 4)
        g.closePath()
        g.stroke()
      }
      g.restore()
      // frange
      g.strokeStyle = COL.white
      g.lineWidth = 1.6
      for (let x = 10; x < o.w - 8; x += 7) {
        line(g, x, 6, x, 0, COL.white, 1.6)
        line(g, x, o.h - 6, x, o.h, COL.white, 1.6)
      }
    }
  }
]
