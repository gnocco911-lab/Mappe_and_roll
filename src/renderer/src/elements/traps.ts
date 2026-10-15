// Trappole: piastre a pressione, fosse, feritoie per dardi. Vanno sul livello del Master
// e non compaiono mai nella versione per i giocatori.
import type { ElementDef } from './registry'
import { COL, OUT, alpha, circle, line, paint, poly, radial, rr, seeded, shade } from './draw'

export const TRAPS: ElementDef[] = [
  {
    id: 'piastra', name: 'Piastra a pressione', category: 'Trappole', tags: ['trappola', 'piastra', 'pressione'], w: 1, h: 1, colorable: true, color: '#9c9a92', layer: 'master',
    draw(g, o) {
      rr(g, 8, 8, o.w - 16, o.h - 16, 4)
      paint(g, o.c, OUT, 2.2)
      rr(g, 18, 18, o.w - 36, o.h - 36, 3)
      paint(g, shade(o.c, -0.12), alpha('#000', 0.5), 2)
      line(g, 18, 18, 8, 8, alpha('#000', 0.45), 1.5)
      line(g, o.w - 18, 18, o.w - 8, 8, alpha('#000', 0.45), 1.5)
      line(g, 18, o.h - 18, 8, o.h - 8, alpha('#000', 0.45), 1.5)
      line(g, o.w - 18, o.h - 18, o.w - 8, o.h - 8, alpha('#000', 0.45), 1.5)
      // contrassegno del Master: triangolo rosso
      poly(g, [o.w / 2, 30, o.w / 2 + 14, 58, o.w / 2 - 14, 58])
      paint(g, '#c93a2e', OUT, 1.6)
      line(g, o.w / 2, 38, o.w / 2, 48, '#fff', 2.4)
      circle(g, o.w / 2, 53, 1.4)
      g.fillStyle = '#fff'
      g.fill()
    }
  },
  {
    id: 'fossa', name: 'Fossa', category: 'Trappole', tags: ['fossa', 'buca', 'trappola'], w: 1, h: 1, colorable: false, color: '#111', layer: 'master',
    draw(g, o) {
      const rnd = seeded(3)
      const pts: number[] = []
      const n = 14
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rad = (o.w / 2 - 8) * (0.88 + rnd() * 0.16)
        pts.push(o.w / 2 + Math.cos(a) * rad, o.h / 2 + Math.sin(a) * rad)
      }
      poly(g, pts)
      g.fillStyle = radial(g, o.w / 2, o.h / 2, 4, o.w / 2, '#000', '#3c3128')
      g.fill()
      paint(g, null, OUT, 3)
    }
  },
  {
    id: 'fossa_spuntoni', name: 'Fossa con spuntoni', category: 'Trappole', tags: ['fossa', 'spuntoni', 'trappola'], w: 1, h: 1, colorable: false, color: '#111', layer: 'master',
    draw(g, o) {
      rr(g, 8, 8, o.w - 16, o.h - 16, 5)
      g.fillStyle = '#17110c'
      g.fill()
      paint(g, null, OUT, 3)
      for (let iy = 0; iy < 3; iy++) {
        for (let ix = 0; ix < 3; ix++) {
          const x = 24 + ix * 26 + (iy % 2) * 6
          const y = 24 + iy * 26
          poly(g, [x, y - 10, x + 7, y + 7, x - 7, y + 7])
          paint(g, '#b9bcc4', OUT, 1.4)
        }
      }
    }
  },
  {
    id: 'feritoia', name: 'Feritoia per dardi', category: 'Trappole', tags: ['dardi', 'feritoia', 'trappola'], w: 1, h: 0.3, colorable: false, color: '#555', layer: 'master',
    draw(g, o) {
      rr(g, 6, 6, o.w - 12, o.h - 12, 3)
      paint(g, COL.stoneD, OUT, 2)
      rr(g, 16, 11, o.w - 32, o.h - 22, 2)
      paint(g, '#0c0a08', null)
      // freccia che indica la direzione di tiro (verso il basso)
      poly(g, [o.w / 2 - 6, o.h - 6, o.w / 2 + 6, o.h - 6, o.w / 2, o.h + 4])
      paint(g, '#c93a2e', OUT, 1.2)
    }
  },
  {
    id: 'runa', name: 'Runa magica', category: 'Trappole', tags: ['runa', 'magia', 'glifo', 'trappola'], w: 1, h: 1, colorable: true, color: '#8e4fd0', layer: 'master',
    draw(g, o) {
      const cx = o.w / 2
      const cy = o.h / 2
      circle(g, cx, cy, o.w / 2 - 10)
      paint(g, alpha(o.c, 0.15), o.c, 2.6)
      circle(g, cx, cy, o.w / 2 - 20)
      paint(g, null, o.c, 1.6)
      const pts: number[] = []
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
        pts.push(cx + Math.cos(a) * (o.w / 2 - 20), cy + Math.sin(a) * (o.w / 2 - 20))
      }
      poly(g, pts)
      paint(g, null, o.c, 1.8)
    }
  }
]
