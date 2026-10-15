import { describe, expect, it } from 'vitest'
import { floodCells, getGrid, polygonCells, rectCells, brushCells } from '../src/renderer/src/core/grid'

describe('griglia quadrata', () => {
  const g = getGrid('square', 10, 8)
  it('dimensioni e centro', () => {
    expect(g.width).toBe(10)
    expect(g.center(2, 3)).toEqual([2.5, 3.5])
    expect(g.cellAt(2.9, 3.1)).toEqual([2, 3])
  })
  it('bordi e vicini coerenti', () => {
    const n = g.neighbors(3, 3)
    expect(n.find((x) => x.c === 4)?.edge).toBe('E:3,3')
    expect(n.find((x) => x.c === 2)?.edge).toBe('E:2,3')
    expect(g.edgeGeom('S:3,3')).toEqual([3, 4, 4, 4])
    expect(g.nearestEdge(3.5, 3.95)).toBe('S:3,3')
    expect(g.nearestEdge(3.02, 3.5)).toBe('E:2,3')
  })
  it('aggancio ai vertici', () => {
    expect(g.snapVertex(2.4, 3.6)).toEqual([2, 4])
  })
  it('rettangolo e pennello', () => {
    expect(rectCells(g, 1, 1, 3, 2).length).toBe(6)
    expect(brushCells(g, 5, 5, 1).length).toBe(1)
    expect(brushCells(g, 5, 5, 3).length).toBe(9)
  })
  it('poligono: caselle con il centro dentro', () => {
    expect(polygonCells(g, [1, 1, 4, 1, 4, 3, 1, 3]).length).toBe(6)
  })
  it('secchiello si ferma ai muri', () => {
    const walls: Record<string, string> = {}
    // stanza 3x3 da (2,2) a (4,4)
    for (let c = 2; c <= 4; c++) { walls[`S:${c},1`] = 'wall'; walls[`S:${c},4`] = 'wall' }
    for (let r = 2; r <= 4; r++) { walls[`E:1,${r}`] = 'wall'; walls[`E:4,${r}`] = 'wall' }
    expect(floodCells(g, {}, walls, 3, 3).length).toBe(9)
    walls['E:4,3'] = 'passage'
    expect(floodCells(g, {}, walls, 3, 3).length).toBeGreaterThan(9)
    walls['E:4,3'] = 'door'
    expect(floodCells(g, {}, walls, 3, 3).length).toBe(9)
  })
})

describe('griglia esagonale', () => {
  const g = getGrid('hex', 8, 6)
  it('cellAt è l\'inverso di center', () => {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const [x, y] = g.center(c, r)
      expect(g.cellAt(x, y)).toEqual([c, r])
    }
  })
  it('ogni casella ha 6 vicini coerenti (il bordo è condiviso)', () => {
    const nb = g.neighbors(3, 2)
    expect(nb.length).toBe(6)
    for (const n of nb) {
      const back = g.neighbors(n.c, n.r).find((m) => m.c === 3 && m.r === 2)
      expect(back?.edge).toBe(n.edge)
    }
  })
  it('i bordi hanno lunghezza pari al raggio dell\'esagono', () => {
    const [x1, y1, x2, y2] = g.edgeGeom('E:3,2')
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(1 / Math.sqrt(3), 5)
  })
  it('bordo più vicino appartiene alla casella', () => {
    const [x, y] = g.center(3, 2)
    const k = g.nearestEdge(x + 0.49, y)
    expect(g.cellEdges(3, 2)).toContain(k)
  })
})
