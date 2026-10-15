import { describe, expect, it } from 'vitest'
import { parseProject, serializeProject } from '../src/renderer/src/io/project'
import { exportLibrary, parseLibrary } from '../src/renderer/src/io/library'
import { newDoc, newItem } from '../src/renderer/src/core/defaults'
import { generateMap, DEFAULT_GENERATOR } from '../src/renderer/src/core/generate'
import { TEMPLATES } from '../src/renderer/src/core/templates'
import type { CustomAsset } from '../src/renderer/src/types'

// piccolissimo PNG 1x1 rosso
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
const asset = (id: string): CustomAsset => ({ id, name: 'Goblin', category: 'Mostri', tags: ['a', 'b'], mime: 'image/png', dataUrl: PNG, wCells: 1.5, hCells: 1, keyColor: '#ffffff', tolerance: 20, keyEdge: true })

describe('file di progetto', () => {
  it('salva e riapre mappa, muri, pavimenti e immagini', () => {
    const doc = newDoc({ name: 'Prova', cols: 12, rows: 9 })
    doc.floors['1,1'] = 'pietra'
    doc.walls['S:2,2'] = 'secret'
    doc.items.push(newItem({ kind: 'custom', layer: 'objects', ref: 'a1', x: 3, y: 3, w: 1.5, h: 1 }))
    doc.items.push(newItem({ kind: 'builtin', layer: 'master', ref: 'piastra', x: 5, y: 5 }))
    const bytes = serializeProject(doc, { a1: asset('a1'), inutile: asset('inutile') })
    const back = parseProject(bytes)
    expect(back.doc.name).toBe('Prova')
    expect(back.doc.cols).toBe(12)
    expect(back.doc.floors['1,1']).toBe('pietra')
    expect(back.doc.walls['S:2,2']).toBe('secret')
    expect(back.doc.items.length).toBe(2)
    expect(Object.keys(back.assets)).toEqual(['a1']) // salva solo le immagini usate
    expect(back.assets.a1.dataUrl).toBe(PNG)
    expect(back.assets.a1.keyEdge).toBe(true)
  })
  it('rifiuta file che non sono mappe', () => {
    expect(() => parseProject(new Uint8Array([1, 2, 3]))).toThrow()
  })
})

describe('libreria personale', () => {
  it('esporta e reimporta con nome, categoria e tag', () => {
    const lib = parseLibrary(exportLibrary([asset('x1'), asset('x2')]))
    expect(lib.length).toBe(2)
    expect(lib[0]).toMatchObject({ id: 'x1', name: 'Goblin', category: 'Mostri', tags: ['a', 'b'], wCells: 1.5 })
    expect(lib[0].dataUrl).toBe(PNG)
  })
})

describe('generatori e modelli', () => {
  it('a parità di seme producono la stessa mappa', () => {
    const a = generateMap({ ...DEFAULT_GENERATOR, kind: 'dungeon', seed: 5 })
    const b = generateMap({ ...DEFAULT_GENERATOR, kind: 'dungeon', seed: 5 })
    expect(Object.keys(a.floors).length).toBe(Object.keys(b.floors).length)
    expect(Object.keys(a.walls).sort()).toEqual(Object.keys(b.walls).sort())
  })
  it('il dungeon ha stanze chiuse da muri e almeno una porta', () => {
    const g = generateMap({ ...DEFAULT_GENERATOR, kind: 'dungeon', seed: 11 })
    expect(Object.keys(g.floors).length).toBeGreaterThan(100)
    expect(Object.values(g.walls)).toContain('wall')
    expect(Object.values(g.walls).some((k) => k !== 'wall')).toBe(true)
  })
  it('ogni modello si costruisce senza errori', () => {
    for (const t of TEMPLATES) {
      const d = t.build()
      expect(d.cols).toBeGreaterThan(0)
      expect(d.layers.master.visible).toBe(true)
    }
  })
  it('la mappa di viaggio è esagonale e contiene sia terra sia mare', () => {
    const g = generateMap({ ...DEFAULT_GENERATOR, kind: 'travel', cols: 24, rows: 16, seed: 3 })
    expect(g.gridType).toBe('hex')
    const tex = new Set(Object.values(g.floors))
    expect(tex.has('acqua')).toBe(true)
    expect(tex.has('erba')).toBe(true)
  })
})
