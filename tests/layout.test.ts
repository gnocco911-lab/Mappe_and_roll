import { describe, expect, it } from 'vitest'
import { MM, PAPERS, planFit, planTiles } from '../src/renderer/src/export/layout'

const base = { paper: 'A4' as const, orientation: 'portrait' as const, marginMm: 12, overlapMm: 8 }

describe('planTiles', () => {
  it('una mappa piccola sta su un solo foglio', () => {
    const p = planTiles(6, 8, base)
    expect(p.sheets.length).toBe(1)
    expect(p.sheets[0].label).toBe('A1')
    expect(p.sheets[0].w).toBeCloseTo(6 * 72)
  })
  it('30x20 caselle in A4 verticale: copre tutta la mappa con sovrapposizione', () => {
    const p = planTiles(30, 20, base)
    expect(p.cols * p.rows).toBe(p.sheets.length)
    const last = p.sheets[p.sheets.length - 1]
    expect(last.mapX + last.w).toBeCloseTo(30 * 72, 3)
    expect(last.mapY + last.h).toBeCloseTo(20 * 72, 3)
    // ogni foglio inizia prima della fine del precedente (sovrapposizione)
    const s0 = p.sheets[0], s1 = p.sheets[1]
    expect(s1.mapX).toBeLessThan(s0.mapX + s0.w)
    expect(s0.mapX + s0.w - s1.mapX).toBeCloseTo(p.overlap, 3)
  })
  it('le linee di taglio fanno combaciare i fogli senza buchi', () => {
    const p = planTiles(40, 25, { ...base, orientation: 'landscape' })
    for (let row = 0; row < p.rows; row++) {
      let covered = 0
      for (let col = 0; col < p.cols; col++) {
        const s = p.sheets[row * p.cols + col]
        // porzione visibile dopo il taglio: da mapX+trimLeft a mapX+w
        expect(s.mapX + s.trimLeft).toBeCloseTo(covered, 3)
        covered = s.mapX + s.w
      }
      expect(covered).toBeCloseTo(40 * 72, 3)
    }
  })
  it('numera i fogli per righe e indica i vicini', () => {
    const p = planTiles(30, 20, base)
    expect(p.sheets[0].neighbors).toMatchObject({ left: 0, up: 0, right: 2, down: p.cols + 1 })
    expect(p.sheets[p.cols].label).toBe('B1')
  })
  it('auto sceglie l\'orientamento con meno fogli', () => {
    const wide = planTiles(25, 7, { ...base, orientation: "auto" })
    expect(wide.portrait).toBe(false)
  })
  it('Letter e A3 hanno le dimensioni giuste', () => {
    expect(PAPERS.Letter.w).toBe(612)
    expect(PAPERS.A3.h / MM).toBeCloseTo(420, 1)
  })
})

describe('planFit', () => {
  it('riduce la mappa per stare nel foglio', () => {
    const f = planFit(30, 20, 'A4', 'auto', 10)
    expect(f.scale).toBeLessThan(1)
    expect(f.x).toBeGreaterThanOrEqual(f.margin - 0.01)
    expect(f.x + f.w).toBeLessThanOrEqual(f.pageW - f.margin + 0.01)
  })
})
