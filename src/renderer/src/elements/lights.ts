// Luci: torce, bracieri, candele, falò. Producono un alone luminoso (solo nella stampa a colori).
import type { ElementDef } from './registry'
import { COL, OUT, alpha, circle, dropShadow, flame, glow, line, paint, radial, seeded, shade } from './draw'

export const LIGHTS: ElementDef[] = [
  {
    id: 'torcia', name: 'Torcia', category: 'Luci', tags: ['torcia', 'luce', 'fuoco'], w: 0.5, h: 0.5, colorable: false, color: COL.fire,
    draw(g, o) {
      glow(g, o, o.w / 2, o.h / 2, 120)
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, 13), 2, 2)
      circle(g, o.w / 2, o.h / 2, 13)
      paint(g, COL.woodD, OUT, 2)
      flame(g, o.w / 2, o.h / 2, 11)
    }
  },
  {
    id: 'braciere', name: 'Braciere', category: 'Luci', tags: ['braciere', 'luce', 'fuoco'], w: 1, h: 1, colorable: true, color: COL.metalD,
    draw(g, o) {
      glow(g, o, o.w / 2, o.h / 2, 190)
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, o.w / 2 - 10), 3, 4)
      circle(g, o.w / 2, o.h / 2, o.w / 2 - 10)
      paint(g, o.c, OUT, 3)
      circle(g, o.w / 2, o.h / 2, o.w / 2 - 20)
      paint(g, '#2b1a12', OUT, 2)
      const rnd = seeded(8)
      for (let i = 0; i < 9; i++) { // braci
        circle(g, o.w / 2 + (rnd() - 0.5) * 38, o.h / 2 + (rnd() - 0.5) * 38, 4 + rnd() * 3)
        g.fillStyle = rnd() > 0.5 ? '#e0501a' : '#b32d0f'
        g.fill()
      }
      flame(g, o.w / 2 - 6, o.h / 2 + 2, 12)
      flame(g, o.w / 2 + 8, o.h / 2 - 4, 10)
    }
  },
  {
    id: 'candela', name: 'Candela', category: 'Luci', tags: ['candela', 'luce'], w: 0.4, h: 0.4, colorable: false, color: COL.white,
    draw(g, o) {
      glow(g, o, o.w / 2, o.h / 2, 70, '255,210,120', 0.32)
      circle(g, o.w / 2, o.h / 2, 11)
      paint(g, '#f3ead0', OUT, 1.8)
      circle(g, o.w / 2, o.h / 2, 4)
      paint(g, '#ffb53c', null)
      circle(g, o.w / 2, o.h / 2, 1.8)
      g.fillStyle = '#fff6c0'
      g.fill()
    }
  },
  {
    id: 'falo', name: 'Falò', category: 'Luci', tags: ['falò', 'fuoco', 'accampamento', 'luce'], w: 1, h: 1, colorable: false, color: COL.fire,
    draw(g, o) {
      glow(g, o, o.w / 2, o.h / 2, 230)
      const rnd = seeded(15)
      for (let i = 0; i < 9; i++) { // sassi attorno
        const a = (i / 9) * Math.PI * 2
        circle(g, o.w / 2 + Math.cos(a) * 40, o.h / 2 + Math.sin(a) * 40, 9 + rnd() * 3)
        paint(g, COL.stoneD, OUT, 1.8)
      }
      for (let i = 0; i < 4; i++) { // ceppi incrociati
        const a = (i / 4) * Math.PI + 0.4
        line(g, o.w / 2 - Math.cos(a) * 30, o.h / 2 - Math.sin(a) * 30, o.w / 2 + Math.cos(a) * 30, o.h / 2 + Math.sin(a) * 30, COL.woodD, 9)
        line(g, o.w / 2 - Math.cos(a) * 30, o.h / 2 - Math.sin(a) * 30, o.w / 2 + Math.cos(a) * 30, o.h / 2 + Math.sin(a) * 30, shade(COL.wood, -0.1), 5)
      }
      circle(g, o.w / 2, o.h / 2, 22)
      g.fillStyle = radial(g, o.w / 2, o.h / 2, 1, 22, alpha('#ff9a2e', 0.9), alpha('#8a1d06', 0))
      g.fill()
      flame(g, o.w / 2, o.h / 2 + 2, 16)
      flame(g, o.w / 2 - 10, o.h / 2 - 6, 9)
      flame(g, o.w / 2 + 11, o.h / 2 + 5, 8)
    }
  }
]
