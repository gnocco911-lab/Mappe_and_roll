// Dungeon: colonne, statue, altari, scale, botole, pozzi, gabbie, sarcofagi, macerie, ragnatele.
import type { ElementDef } from './registry'
import {
  COL, OUT, alpha, circle, dropShadow, ellipse, line, paint, poly, radial, rr, seeded, shade
} from './draw'

export const DUNGEON: ElementDef[] = [
  {
    id: 'colonna', name: 'Colonna', category: 'Dungeon', tags: ['colonna', 'pilastro', 'pietra'], w: 1, h: 1, colorable: true, color: COL.stone,
    draw(g, o) {
      const r = o.w / 2 - 12
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, r), 3, 4)
      circle(g, o.w / 2, o.h / 2, r)
      paint(g, o.c)
      g.fillStyle = radial(g, o.w / 2 - 8, o.h / 2 - 8, 2, r, 'rgba(255,255,255,0.45)', 'rgba(0,0,0,0.15)')
      circle(g, o.w / 2, o.h / 2, r)
      g.fill()
      circle(g, o.w / 2, o.h / 2, r * 0.62)
      paint(g, null, alpha('#000', 0.4), 1.6)
    }
  },
  {
    id: 'statua', name: 'Statua', category: 'Dungeon', tags: ['statua', 'scultura', 'pietra'], w: 1, h: 1, colorable: true, color: COL.stoneL,
    draw(g, o) {
      dropShadow(g, () => rr(g, 10, 10, o.w - 20, o.h - 20, 5))
      rr(g, 10, 10, o.w - 20, o.h - 20, 5) // piedistallo
      paint(g, COL.stoneD)
      // figura vista dall'alto: spalle, braccia, testa
      ellipse(g, o.w / 2, o.h / 2 + 4, 27, 15)
      paint(g, o.c)
      ellipse(g, o.w / 2 - 26, o.h / 2 + 4, 7, 12, 0.3)
      paint(g, shade(o.c, -0.1))
      ellipse(g, o.w / 2 + 26, o.h / 2 + 4, 7, 12, -0.3)
      paint(g, shade(o.c, -0.1))
      circle(g, o.w / 2, o.h / 2 - 2, 11)
      paint(g, shade(o.c, 0.1))
      line(g, o.w / 2 - 4, o.h / 2 + 6, o.w / 2 + 4, o.h / 2 + 6, alpha('#000', 0.35), 1.4)
    }
  },
  {
    id: 'altare', name: 'Altare', category: 'Dungeon', tags: ['altare', 'tempio', 'sacro'], w: 1, h: 2, colorable: true, color: COL.stone,
    draw(g, o) {
      dropShadow(g, () => rr(g, 6, 6, o.w - 12, o.h - 12, 4))
      rr(g, 6, 6, o.w - 12, o.h - 12, 4)
      paint(g, shade(o.c, -0.2))
      rr(g, 14, 14, o.w - 28, o.h - 28, 3)
      paint(g, o.c)
      // simbolo sacro: cerchio con croce
      circle(g, o.w / 2, o.h / 2, 22)
      paint(g, null, alpha('#000', 0.5), 2.4)
      line(g, o.w / 2, o.h / 2 - 22, o.w / 2, o.h / 2 + 22, alpha('#000', 0.5), 2.4)
      line(g, o.w / 2 - 22, o.h / 2, o.w / 2 + 22, o.h / 2, alpha('#000', 0.5), 2.4)
      // due candele
      for (const y of [28, o.h - 28]) {
        circle(g, o.w / 2, y, 6)
        paint(g, COL.white, OUT, 1.4)
        circle(g, o.w / 2, y, 2.5)
        paint(g, '#ffb53c', null)
      }
    }
  },
  {
    id: 'scale', name: 'Scale', category: 'Dungeon', tags: ['scale', 'gradini', 'scalinata'], w: 1, h: 2, colorable: true, color: COL.stone,
    draw(g, o) {
      const steps = 8
      const sh = (o.h - 8) / steps
      rr(g, 4, 4, o.w - 8, o.h - 8, 2)
      paint(g, shade(o.c, -0.2))
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1)
        const y = 4 + i * sh
        g.fillStyle = shade(o.c, 0.28 - t * 0.55)
        g.fillRect(6, y, o.w - 12, sh)
        line(g, 6, y + sh, o.w - 6, y + sh, alpha('#000', 0.55), 2)
        line(g, 6, y + 2, o.w - 6, y + 2, alpha('#fff', 0.25), 1.2)
      }
      // freccia di discesa
      g.fillStyle = alpha('#000', 0.55)
      poly(g, [o.w / 2 - 9, o.h * 0.4, o.w / 2 + 9, o.h * 0.4, o.w / 2, o.h * 0.4 + 18])
      g.fill()
      rr(g, 4, 4, o.w - 8, o.h - 8, 2)
      paint(g, null)
    }
  },
  {
    id: 'botola', name: 'Botola', category: 'Dungeon', tags: ['botola', 'passaggio', 'alzata'], w: 1, h: 1, colorable: true, color: COL.wood,
    draw(g, o) {
      dropShadow(g, () => rr(g, 8, 8, o.w - 16, o.h - 16, 3), 2, 3)
      rr(g, 8, 8, o.w - 16, o.h - 16, 3)
      paint(g, o.c)
      for (let i = 1; i < 4; i++) line(g, 8, 8 + (i * (o.h - 16)) / 4, o.w - 8, 8 + (i * (o.h - 16)) / 4, alpha('#000', 0.4), 1.4)
      for (const y of [22, o.h - 22]) { // cardini
        rr(g, 12, y - 4, 20, 8, 2)
        paint(g, COL.metalD, OUT, 1.2)
      }
      circle(g, o.w / 2, o.h / 2 + 8, 9) // anello
      paint(g, null, COL.metalD, 3.5)
    }
  },
  {
    id: 'pozzo', name: 'Pozzo', category: 'Dungeon', tags: ['pozzo', 'acqua'], w: 1, h: 1, colorable: true, color: COL.stone,
    draw(g, o) {
      dropShadow(g, () => circle(g, o.w / 2, o.h / 2, o.w / 2 - 6))
      circle(g, o.w / 2, o.h / 2, o.w / 2 - 6)
      paint(g, o.c)
      for (let i = 0; i < 12; i++) { // conci
        const a = (i / 12) * Math.PI * 2
        line(g, o.w / 2 + Math.cos(a) * 29, o.h / 2 + Math.sin(a) * 29, o.w / 2 + Math.cos(a) * 44, o.h / 2 + Math.sin(a) * 44, alpha('#000', 0.4), 1.4)
      }
      circle(g, o.w / 2, o.h / 2, 28)
      paint(g, null, OUT, 2.4)
      g.fillStyle = radial(g, o.w / 2, o.h / 2, 3, 28, '#18324a', '#0a1620')
      circle(g, o.w / 2, o.h / 2, 28)
      g.fill()
      g.strokeStyle = 'rgba(120,180,220,0.45)'
      g.lineWidth = 1.5
      g.beginPath(); g.arc(o.w / 2 - 4, o.h / 2 - 3, 12, 3.6, 5.2); g.stroke()
    }
  },
  {
    id: 'gabbia', name: 'Gabbia', category: 'Dungeon', tags: ['gabbia', 'prigione', 'ferro'], w: 1, h: 1, colorable: true, color: COL.metal,
    draw(g, o) {
      g.fillStyle = 'rgba(20,16,12,0.55)'
      rr(g, 8, 8, o.w - 16, o.h - 16, 3)
      g.fill()
      rr(g, 8, 8, o.w - 16, o.h - 16, 3)
      paint(g, null, o.c, 5)
      for (let i = 1; i < 6; i++) {
        const t = 8 + (i * (o.w - 16)) / 6
        line(g, t, 8, t, o.h - 8, o.c, 2.6)
        line(g, 8, t, o.w - 8, t, o.c, 2.6)
      }
      for (const [x, y] of [[8, 8], [o.w - 8, 8], [8, o.h - 8], [o.w - 8, o.h - 8]]) {
        circle(g, x, y, 4.5)
        paint(g, shade(o.c, -0.3), OUT, 1.2)
      }
    }
  },
  {
    id: 'sarcofago', name: 'Sarcofago', category: 'Dungeon', tags: ['sarcofago', 'tomba', 'bara', 'cripta'], w: 1, h: 2, colorable: true, color: COL.stone,
    draw(g, o) {
      const body = () => poly(g, [18, 6, o.w - 18, 6, o.w - 8, 26, o.w - 14, o.h - 8, 14, o.h - 8, 8, 26])
      dropShadow(g, body)
      body()
      paint(g, shade(o.c, -0.12))
      g.save()
      g.translate(0, 0)
      poly(g, [24, 14, o.w - 24, 14, o.w - 16, 30, o.w - 22, o.h - 16, 22, o.h - 16, 16, 30])
      paint(g, o.c, alpha('#000', 0.45), 1.8)
      g.restore()
      // sagoma scolpita
      circle(g, o.w / 2, 34, 10)
      paint(g, shade(o.c, 0.1), alpha('#000', 0.45), 1.6)
      ellipse(g, o.w / 2, 82, 17, 38)
      paint(g, shade(o.c, 0.1), alpha('#000', 0.45), 1.6)
      line(g, o.w / 2 - 12, 66, o.w / 2 + 12, 66, alpha('#000', 0.4), 1.6)
      line(g, o.w / 2 - 12, 74, o.w / 2 + 12, 74, alpha('#000', 0.4), 1.6)
    }
  },
  {
    id: 'macerie', name: 'Macerie', category: 'Dungeon', tags: ['macerie', 'crollo', 'rocce', 'detriti'], w: 1, h: 1, colorable: true, color: COL.stoneD,
    draw(g, o) {
      const rnd = seeded(13)
      const stones: [number, number, number][] = []
      for (let i = 0; i < 9; i++) stones.push([14 + rnd() * (o.w - 28), 14 + rnd() * (o.h - 28), 8 + rnd() * 12])
      stones.sort((a, b) => a[1] - b[1])
      for (const [x, y, r] of stones) {
        const pts: number[] = []
        const n = 5 + Math.floor(rnd() * 3)
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + rnd() * 0.5
          const rad = r * (0.7 + rnd() * 0.45)
          pts.push(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
        }
        dropShadow(g, () => poly(g, pts), 2, 3, 0.25)
        poly(g, pts)
        paint(g, shade(o.c, (rnd() - 0.4) * 0.35), OUT, 1.8)
        line(g, pts[0], pts[1], x, y, alpha('#fff', 0.2), 1.2)
      }
    }
  },
  {
    id: 'ragnatela', name: 'Ragnatela', category: 'Dungeon', tags: ['ragnatela', 'ragno', 'trappola'], w: 1, h: 1, colorable: true, color: '#e8e8e8',
    draw(g, o) {
      const cx = o.w / 2
      const cy = o.h / 2
      const R = o.w / 2 - 5
      g.strokeStyle = alpha('#3a3a3a', 0.8)
      g.lineWidth = 1.3
      const spokes = 10
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2
        line(g, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, o.c, 1.8)
        line(g, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, alpha('#000', 0.3), 0.6)
      }
      for (let ring = 1; ring <= 5; ring++) {
        const rad = (R * ring) / 5
        g.beginPath()
        for (let i = 0; i <= spokes; i++) {
          const a = (i / spokes) * Math.PI * 2
          const a2 = ((i + 0.5) / spokes) * Math.PI * 2
          const x = cx + Math.cos(a) * rad
          const y = cy + Math.sin(a) * rad
          if (i === 0) g.moveTo(x, y)
          else g.quadraticCurveTo(cx + Math.cos(a2 - (Math.PI * 2) / spokes / 2) * rad * 0.9, cy + Math.sin(a2 - (Math.PI * 2) / spokes / 2) * rad * 0.9, x, y)
        }
        g.strokeStyle = alpha('#ffffff', 0.9)
        g.lineWidth = 1.5
        g.stroke()
        g.strokeStyle = alpha('#000', 0.28)
        g.lineWidth = 0.6
        g.stroke()
      }
    }
  }
]
