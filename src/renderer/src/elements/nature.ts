// Natura: alberi, cespugli, rocce, tronchi, funghi, ponti.
import type { ElementDef } from './registry'
import { COL, OUT, alpha, circle, dropShadow, ellipse, line, paint, poly, radial, rr, seeded, shade } from './draw'

/** Chioma "a nuvola": cerchi sovrapposti attorno al centro. */
function blobCanopy(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, color: string, seed: number, n = 9) {
  const rnd = seeded(seed)
  const lobes: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4
    const d = R * (0.5 + rnd() * 0.18)
    lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (0.42 + rnd() * 0.12)])
  }
  lobes.push([cx, cy, R * 0.6])
  dropShadow(g, () => { for (const [x, y, r] of lobes) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2) } }, 5, 7, 0.26)
  // contorno scuro prima, poi riempimento: si ottiene un unico profilo
  for (const [x, y, r] of lobes) {
    circle(g, x, y, r)
    paint(g, shade(color, -0.35), OUT, 2.6)
  }
  for (const [x, y, r] of lobes) {
    circle(g, x, y, r - 2)
    g.fillStyle = shade(color, -0.12)
    g.fill()
  }
  // luci sulle fronde
  for (const [x, y, r] of lobes) {
    g.fillStyle = radial(g, x - r * 0.3, y - r * 0.35, 1, r * 0.8, alpha(shade(color, 0.4), 0.85), alpha(color, 0))
    circle(g, x, y, r - 2)
    g.fill()
  }
}

export const NATURE: ElementDef[] = [
  {
    id: 'albero', name: 'Albero', category: 'Natura', tags: ['albero', 'foresta', 'pianta'], w: 3, h: 3, colorable: true, color: '#4f9340',
    draw(g, o) {
      blobCanopy(g, o.w / 2, o.h / 2, o.w / 2 - 12, o.c, 5, 9)
      // piccoli rami visibili
      const rnd = seeded(9)
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.28
        const d = 20 + rnd() * 40
        circle(g, o.w / 2 + Math.cos(a) * d, o.h / 2 + Math.sin(a) * d, 2.5)
        g.fillStyle = alpha(shade(o.c, -0.5), 0.45)
        g.fill()
      }
    }
  },
  {
    id: 'pino', name: 'Pino', category: 'Natura', tags: ['pino', 'abete', 'conifera', 'albero'], w: 2, h: 2, colorable: true, color: '#2f6b46',
    draw(g, o) {
      const cx = o.w / 2
      const cy = o.h / 2
      dropShadow(g, () => circle(g, cx, cy, o.w / 2 - 8), 4, 6, 0.26)
      for (let layer = 0; layer < 3; layer++) {
        const R = (o.w / 2 - 8) * (1 - layer * 0.3)
        const pts: number[] = []
        const spikes = 12
        for (let i = 0; i < spikes * 2; i++) {
          const a = (i / (spikes * 2)) * Math.PI * 2 + layer * 0.22
          const rad = i % 2 === 0 ? R : R * 0.62
          pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
        }
        poly(g, pts)
        paint(g, shade(o.c, layer * 0.14 - 0.1), OUT, 2.2)
      }
      circle(g, cx, cy, 5)
      paint(g, COL.woodD, OUT, 1.4)
    }
  },
  {
    id: 'cespuglio', name: 'Cespuglio', category: 'Natura', tags: ['cespuglio', 'siepe', 'pianta'], w: 1, h: 1, colorable: true, color: '#5c9a45',
    draw(g, o) {
      blobCanopy(g, o.w / 2, o.h / 2, o.w / 2 - 6, o.c, 31, 6)
      const rnd = seeded(2)
      for (let i = 0; i < 6; i++) {
        circle(g, 22 + rnd() * (o.w - 44), 22 + rnd() * (o.h - 44), 3)
        paint(g, '#c53a3a', OUT, 1)
      }
    }
  },
  {
    id: 'roccia', name: 'Roccia', category: 'Natura', tags: ['roccia', 'masso', 'pietra'], w: 1, h: 1, colorable: true, color: '#8e8c86',
    draw(g, o) {
      const pts = [20, 38, 36, 14, 62, 12, 84, 30, 88, 60, 70, 86, 38, 88, 16, 66].map((v, i) => (i % 2 ? v * (o.h / 100) : v * (o.w / 100)))
      dropShadow(g, () => poly(g, pts), 3, 4)
      poly(g, pts)
      paint(g, o.c)
      // sfaccettature
      const c = [o.w * 0.52, o.h * 0.5]
      for (let i = 0; i < pts.length; i += 4) line(g, c[0], c[1], pts[i], pts[i + 1], alpha('#000', 0.35), 1.5)
      poly(g, [pts[2], pts[3], pts[4], pts[5], c[0], c[1]])
      g.fillStyle = alpha('#fff', 0.2)
      g.fill()
      poly(g, [pts[8], pts[9], pts[10], pts[11], c[0], c[1]])
      g.fillStyle = alpha('#000', 0.18)
      g.fill()
    }
  },
  {
    id: 'roccia_grande', name: 'Masso', category: 'Natura', tags: ['roccia', 'masso', 'pietra', 'grande'], w: 2, h: 2, colorable: true, color: '#85837d',
    draw(g, o) {
      const rnd = seeded(61)
      const cx = o.w / 2
      const cy = o.h / 2
      const pts: number[] = []
      const n = 11
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rad = (o.w / 2 - 12) * (0.78 + rnd() * 0.25)
        pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
      }
      dropShadow(g, () => poly(g, pts), 4, 6)
      poly(g, pts)
      paint(g, o.c)
      for (let i = 0; i < pts.length; i += 2) {
        const j = (i + 2) % pts.length
        poly(g, [pts[i], pts[i + 1], pts[j], pts[j + 1], cx - 8, cy - 6])
        g.fillStyle = alpha(i / 2 % 3 === 0 ? '#fff' : '#000', 0.12 + rnd() * 0.1)
        g.fill()
        line(g, cx - 8, cy - 6, pts[i], pts[i + 1], alpha('#000', 0.3), 1.4)
      }
      poly(g, pts)
      paint(g, null)
    }
  },
  {
    id: 'tronco', name: 'Tronco', category: 'Natura', tags: ['tronco', 'legna', 'albero caduto'], w: 2, h: 0.6, colorable: true, color: '#7a5230',
    draw(g, o) {
      dropShadow(g, () => rr(g, 6, 8, o.w - 12, o.h - 16, 14), 3, 4)
      rr(g, 6, 8, o.w - 12, o.h - 16, 14)
      paint(g, o.c)
      for (let i = 1; i < 5; i++) line(g, 20, 8 + (i * (o.h - 16)) / 5, o.w - 30, 8 + (i * (o.h - 16)) / 5 + (i % 2 ? 1.5 : -1.5), alpha('#000', 0.3), 1.3)
      ellipse(g, o.w - 18, o.h / 2, 11, (o.h - 16) / 2 - 1) // sezione tagliata
      paint(g, shade(o.c, 0.35), OUT, 1.8)
      ellipse(g, o.w - 18, o.h / 2, 6, 11)
      paint(g, null, alpha('#000', 0.4), 1.2)
    }
  },
  {
    id: 'funghi', name: 'Funghi', category: 'Natura', tags: ['funghi', 'fungo', 'grotta'], w: 1, h: 1, colorable: true, color: '#c4433a',
    draw(g, o) {
      const caps: [number, number, number][] = [[0.38, 0.42, 22], [0.68, 0.34, 15], [0.62, 0.72, 17], [0.26, 0.74, 11]]
      for (const [x, y, r] of caps) {
        dropShadow(g, () => circle(g, x * o.w, y * o.h, r), 2, 3)
        circle(g, x * o.w, y * o.h, r)
        paint(g, o.c, OUT, 2)
        g.fillStyle = radial(g, x * o.w - r * 0.3, y * o.h - r * 0.3, 1, r, 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0)')
        circle(g, x * o.w, y * o.h, r)
        g.fill()
        const rnd = seeded(Math.floor(x * 100))
        for (let i = 0; i < 4; i++) {
          const a = rnd() * 6.28
          const d = rnd() * r * 0.6
          circle(g, x * o.w + Math.cos(a) * d, y * o.h + Math.sin(a) * d, r * 0.13)
          g.fillStyle = '#f6f0dc'
          g.fill()
        }
      }
    }
  },
  {
    id: 'ponte', name: 'Ponte di legno', category: 'Natura', tags: ['ponte', 'legno', 'fiume'], w: 1, h: 3, colorable: true, color: COL.wood,
    draw(g, o) {
      const planks = 14
      const ph = (o.h - 6) / planks
      dropShadow(g, () => rr(g, 6, 3, o.w - 12, o.h - 6, 2), 3, 5, 0.3)
      for (let i = 0; i < planks; i++) {
        rr(g, 8, 3 + i * ph, o.w - 16, ph - 1, 2)
        paint(g, shade(o.c, ((i * 37) % 11) / 40 - 0.12), OUT, 1.6)
        for (const x of [14, o.w - 14]) { circle(g, x, 3 + i * ph + ph / 2, 1.6); g.fillStyle = alpha('#000', 0.55); g.fill() }
      }
      for (const x of [4, o.w - 4]) { // parapetti
        line(g, x, 0, x, o.h, COL.woodD, 7)
        line(g, x, 0, x, o.h, OUT, 1.4)
      }
      for (let i = 0; i <= 6; i++) {
        for (const x of [4, o.w - 4]) { circle(g, x, (i * o.h) / 6 + 2, 5); paint(g, COL.woodD, OUT, 1.6) }
      }
    }
  }
]
