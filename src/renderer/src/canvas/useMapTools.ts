// Logica degli strumenti di disegno: pennello, secchiello, rettangolo, poligono,
// muri, porte, testi, frecce, numeri, inserimento elementi e selezione ad area.
import { useCallback, useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { CELL, type MapItem, type WallKind } from '../types'
import {
  brushCells, cellKey, floodCells, getGrid, lineCells, polygonCells, rectCells, snapItemCenter, type Grid
} from '../core/grid'
import { newItem } from '../core/defaults'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { buildItem, ensureLayerEditable, makeNumberItem, makeTextItem, placeAt, snapped } from './placement'
import { input } from './inputState'

export type Preview =
  | { type: 'cells'; cells: [number, number][]; mode: 'add' | 'erase' | 'hover' }
  | { type: 'edges'; keys: string[]; erase?: boolean }
  | { type: 'poly'; pts: number[]; cursor?: [number, number] }
  | { type: 'ghost'; item: MapItem }
  | { type: 'marquee'; x: number; y: number; w: number; h: number }
  | { type: 'vertex'; x: number; y: number }
  | { type: 'arrow'; item: MapItem }
  | null

interface Session {
  pan?: { sx: number; sy: number; px: number; py: number }
  paint?: { last: [number, number]; erase: boolean }
  rect?: { c: number; r: number }
  poly?: number[]
  wallStart?: [number, number]
  wallEdges?: Set<string>
  wallErase?: boolean
  lastPos?: [number, number]
  marquee?: { x: number; y: number }
  arrowStart?: [number, number]
}

const gridOf = (): Grid => {
  const { doc } = useDoc.getState()
  return getGrid(doc.gridType, doc.cols, doc.rows)
}

/** Posizione del puntatore in caselle. */
function worldPos(stage: Konva.Stage): [number, number] | null {
  const p = stage.getPointerPosition()
  if (!p) return null
  const { zoom, panX, panY } = useUI.getState()
  return [(p.x - panX) / zoom / CELL, (p.y - panY) / zoom / CELL]
}

/** Archi lungo una linea di vertici (griglia quadrata): orizzontale o verticale. */
function squareLineEdges(a: [number, number], b: [number, number]): string[] {
  const keys: string[] = []
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (Math.abs(dx) >= Math.abs(dy)) {
    const y = a[1]
    for (let c = Math.min(a[0], b[0]); c < Math.max(a[0], b[0]); c++) keys.push(`S:${c},${y - 1}`)
  } else {
    const x = a[0]
    for (let r = Math.min(a[1], b[1]); r < Math.max(a[1], b[1]); r++) keys.push(`E:${x - 1},${r}`)
  }
  return keys
}

function squareRectEdges(a: [number, number], b: [number, number]): string[] {
  const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0])
  const y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1])
  const keys: string[] = []
  for (let c = x1; c < x2; c++) keys.push(`S:${c},${y1 - 1}`, `S:${c},${y2 - 1}`)
  for (let r = y1; r < y2; r++) keys.push(`E:${x1 - 1},${r}`, `E:${x2 - 1},${r}`)
  return keys
}

/** Bordi attraversati dal puntatore tra due posizioni (per tracciare muri a mano libera). */
function sampleEdges(grid: Grid, a: [number, number], b: [number, number]): string[] {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1])
  const steps = Math.max(1, Math.ceil(dist / 0.12))
  const out: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const k = grid.nearestEdge(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    if (k && grid.edgeValid(k)) out.push(k)
  }
  return out
}

function applyWalls(keys: Iterable<string>, kind: WallKind | null) {
  const grid = gridOf()
  const list = [...keys].filter((k) => grid.edgeValid(k))
  if (!list.length) return
  useDoc.getState().change((d) => {
    for (const k of list) {
      if (kind === null) delete d.walls[k]
      else if (!d.walls[k] || d.walls[k] === 'wall') d.walls[k] = kind // non sovrascrive porte e finestre già messe
    }
  })
}

export function useMapTools() {
  const [preview, setPreview] = useState<Preview>(null)
  const S = useRef<Session>({})

  const paintCells = useCallback((cells: [number, number][], erase: boolean) => {
    const tex = useUI.getState().textureId
    const { floors } = useDoc.getState().doc
    const todo = cells.filter(([c, r]) => (erase ? floors[cellKey(c, r)] !== undefined : floors[cellKey(c, r)] !== tex))
    if (!todo.length) return
    useDoc.getState().live((d) => {
      for (const [c, r] of todo) {
        if (erase) delete d.floors[cellKey(c, r)]
        else d.floors[cellKey(c, r)] = tex
      }
    })
  }, [])

  const commitCells = useCallback((cells: [number, number][], erase: boolean) => {
    if (!cells.length) return
    const tex = useUI.getState().textureId
    useDoc.getState().change((d) => {
      for (const [c, r] of cells) {
        if (erase) delete d.floors[cellKey(c, r)]
        else d.floors[cellKey(c, r)] = tex
      }
    })
  }, [])

  const finishPolygon = useCallback(() => {
    const pts = S.current.poly
    S.current.poly = undefined
    setPreview(null)
    if (!pts || pts.length < 6) return
    if (!ensureLayerEditable('terrain')) return
    commitCells(polygonCells(gridOf(), pts), false)
  }, [commitCells])

  const cancelAll = useCallback(() => {
    S.current = {}
    useDoc.getState().endGesture()
    setPreview(null)
  }, [])

  // fine gesto anche se il mouse viene rilasciato fuori dall'area di disegno
  const finishPointer = useCallback(() => {
    const s = S.current
    const tool = useUI.getState().tool
    if (s.pan) s.pan = undefined
    if (s.paint) {
      s.paint = undefined
      useDoc.getState().endGesture()
    }
    if (s.rect && s.lastPos) {
      const grid = gridOf()
      const [c2, r2] = grid.cellAt(s.lastPos[0], s.lastPos[1])
      commitCells(rectCells(grid, s.rect.c, s.rect.r, c2, r2), tool === 'floorErase')
      s.rect = undefined
    }
    if (s.wallEdges) {
      applyWalls(s.wallEdges, s.wallErase ? null : 'wall')
      s.wallEdges = undefined
      s.wallStart = undefined
    }
    if (s.wallStart && s.lastPos) {
      const grid = gridOf()
      const a = s.wallStart
      const b = grid.snapVertex(s.lastPos[0], s.lastPos[1])
      applyWalls(tool === 'wallRect' ? squareRectEdges(a, b) : squareLineEdges(a, b), 'wall')
      s.wallStart = undefined
    }
    if (s.marquee && s.lastPos) {
      const m = s.marquee
      const x1 = Math.min(m.x, s.lastPos[0]), x2 = Math.max(m.x, s.lastPos[0])
      const y1 = Math.min(m.y, s.lastPos[1]), y2 = Math.max(m.y, s.lastPos[1])
      if (x2 - x1 > 0.05 || y2 - y1 > 0.05) {
        const { doc } = useDoc.getState()
        const players = useUI.getState().viewMode === 'players'
        const ids: string[] = []
        for (const it of doc.items) {
          const L = doc.layers[it.layer]
          if (!L.visible || L.locked || (players && it.layer === 'master')) continue
          const rad = (it.rot * Math.PI) / 180
          const hw = (Math.abs(Math.cos(rad)) * it.w + Math.abs(Math.sin(rad)) * it.h) / 2
          const hh = (Math.abs(Math.sin(rad)) * it.w + Math.abs(Math.cos(rad)) * it.h) / 2
          if (it.x + hw >= x1 && it.x - hw <= x2 && it.y + hh >= y1 && it.y - hh <= y2) ids.push(it.id)
        }
        const prev = input.shift ? useUI.getState().selection : []
        useUI.getState().select([...new Set([...prev, ...ids])])
      }
      s.marquee = undefined
    }
    if (s.arrowStart && s.lastPos) {
      const a = s.arrowStart
      const b = useUI.getState().snap ? gridOf().snapVertex(s.lastPos[0], s.lastPos[1]) : s.lastPos
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (len > 0.3 && ensureLayerEditable('objects')) {
        const it = newItem({
          kind: 'arrow', layer: 'objects', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: len, h: 0.45,
          rot: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
        })
        useDoc.getState().addItems([it])
        useUI.getState().select([it.id])
      }
      s.arrowStart = undefined
    }
    if (!s.poly) setPreview(null)
  }, [commitCells])

  useEffect(() => {
    const up = () => finishPointer()
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [finishPointer])

  // Invio chiude il poligono, Esc annulla
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.key === 'Enter' && S.current.poly) finishPolygon()
      if (e.key === 'Escape') {
        cancelAll()
        const ui = useUI.getState()
        if (ui.tool === 'place') ui.setTool('select')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finishPolygon, cancelAll])

  // cambio strumento: annulla operazioni a metà
  const tool = useUI((s) => s.tool)
  useEffect(() => { cancelAll() }, [tool, cancelAll])

  // ---------------------------------------------------------------- eventi del palco

  const onMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!
    const ui = useUI.getState()
    const evt = e.evt
    const s = S.current
    // spostamento della vista
    if (evt.button === 1 || (evt.button === 0 && (input.space || ui.tool === 'hand'))) {
      s.pan = { sx: evt.clientX, sy: evt.clientY, px: ui.panX, py: ui.panY }
      return
    }
    if (evt.button !== 0) return
    const pos = worldPos(stage)
    if (!pos) return
    s.lastPos = pos
    const grid = gridOf()
    const [c, r] = grid.cellAt(pos[0], pos[1])

    switch (ui.tool) {
      case 'select': {
        if (e.target === stage || e.target.name() !== 'item') {
          if (!input.shift) ui.select([])
          s.marquee = { x: pos[0], y: pos[1] }
        }
        break
      }
      case 'brush':
      case 'floorErase': {
        if (!ensureLayerEditable('terrain')) return
        useDoc.getState().beginGesture()
        s.paint = { last: [c, r], erase: ui.tool === 'floorErase' }
        paintCells(brushCells(grid, c, r, ui.brushSize), s.paint.erase)
        break
      }
      case 'bucket': {
        if (!ensureLayerEditable('terrain')) return
        const { floors, walls } = useDoc.getState().doc
        const cells = floodCells(grid, floors, walls, c, r)
        commitCells(cells, false)
        break
      }
      case 'rect': {
        if (!ensureLayerEditable('terrain')) return
        if (grid.inBounds(c, r)) s.rect = { c, r }
        break
      }
      case 'poly': {
        if (!ensureLayerEditable('terrain')) return
        const p: [number, number] = ui.snap ? grid.snapVertex(pos[0], pos[1]) : pos
        const pts = s.poly ?? []
        // clic sul primo punto, oppure secondo clic sullo stesso punto (doppio clic): chiude la forma
        const n = pts.length
        const onFirst = n >= 6 && Math.hypot(p[0] - pts[0], p[1] - pts[1]) < 0.35
        const onLast = n >= 6 && Math.hypot(p[0] - pts[n - 2], p[1] - pts[n - 1]) < 0.1
        if (onFirst || onLast) {
          finishPolygon()
          return
        }
        if (n >= 2 && Math.hypot(p[0] - pts[n - 2], p[1] - pts[n - 1]) < 0.1) return // punto doppio: ignorato
        s.poly = [...pts, p[0], p[1]]
        setPreview({ type: 'poly', pts: s.poly, cursor: p })
        break
      }
      case 'wallLine':
      case 'wallRect':
      case 'wallErase': {
        if (!ensureLayerEditable('walls')) return
        if (ui.tool === 'wallErase' || grid.type === 'hex') {
          s.wallEdges = new Set(sampleEdges(grid, pos, pos))
          s.wallErase = ui.tool === 'wallErase'
          setPreview({ type: 'edges', keys: [...s.wallEdges], erase: s.wallErase })
        } else {
          s.wallStart = grid.snapVertex(pos[0], pos[1])
        }
        break
      }
      case 'opening': {
        if (!ensureLayerEditable('walls')) return
        const key = grid.nearestEdge(pos[0], pos[1])
        if (!key || !grid.edgeValid(key)) return
        const kind = ui.openingKind
        useDoc.getState().change((d) => {
          d.walls[key] = d.walls[key] === kind ? 'wall' : kind
        })
        break
      }
      case 'text':
      case 'note': {
        const layer = ui.tool === 'note' ? 'master' : 'objects'
        if (!ensureLayerEditable(layer)) return
        const tmp = makeTextItem(pos[0], pos[1], layer)
        if (ui.snap) {
          tmp.x = Math.floor(pos[0]) + 0.5
          tmp.y = Math.floor(pos[1]) + 0.5
        }
        useDoc.getState().addItems([tmp])
        ui.select([tmp.id])
        ui.setTool('select')
        ui.requestTextFocus()
        break
      }
      case 'arrow': {
        if (!ensureLayerEditable('objects')) return
        s.arrowStart = ui.snap ? grid.snapVertex(pos[0], pos[1]) : pos
        break
      }
      case 'number': {
        if (!ensureLayerEditable('objects')) return
        const it = makeNumberItem(pos[0], pos[1], ui.nextRoomNumber)
        const [sx, sy] = ui.snap ? snapItemCenter(grid, pos[0], pos[1], 0.6, 0.6) : pos
        it.x = sx
        it.y = sy
        useDoc.getState().addItems([it])
        ui.setNextRoomNumber(ui.nextRoomNumber + 1)
        break
      }
      case 'place': {
        if (ui.placing) placeAt(ui.placing, pos[0], pos[1])
        break
      }
    }
  }, [paintCells, commitCells, finishPolygon])

  const onMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!
    const ui = useUI.getState()
    const s = S.current
    // pan
    if (s.pan) {
      const dx = e.evt.clientX - s.pan.sx
      const dy = e.evt.clientY - s.pan.sy
      ui.setView(ui.zoom, s.pan.px + dx, s.pan.py + dy)
      return
    }
    const pos = worldPos(stage)
    if (!pos) return
    const prevPos = s.lastPos ?? pos
    s.lastPos = pos
    const grid = gridOf()
    const [c, r] = grid.cellAt(pos[0], pos[1])

    switch (ui.tool) {
      case 'brush':
      case 'floorErase': {
        const erase = ui.tool === 'floorErase'
        if (s.paint) {
          const cells = lineCells(grid, s.paint.last[0], s.paint.last[1], c, r).flatMap(([cc, rr]) => brushCells(grid, cc, rr, ui.brushSize))
          paintCells(cells, s.paint.erase)
          s.paint.last = [c, r]
        }
        setPreview({ type: 'cells', cells: brushCells(grid, c, r, ui.brushSize), mode: erase ? 'erase' : 'hover' })
        break
      }
      case 'bucket':
        setPreview(grid.inBounds(c, r) ? { type: 'cells', cells: [[c, r]], mode: 'hover' } : null)
        break
      case 'rect': {
        if (s.rect) setPreview({ type: 'cells', cells: rectCells(grid, s.rect.c, s.rect.r, c, r), mode: 'add' })
        else setPreview(grid.inBounds(c, r) ? { type: 'cells', cells: [[c, r]], mode: 'hover' } : null)
        break
      }
      case 'poly': {
        const p: [number, number] = ui.snap ? grid.snapVertex(pos[0], pos[1]) : pos
        if (s.poly) setPreview({ type: 'poly', pts: s.poly, cursor: p })
        else setPreview({ type: 'vertex', x: p[0], y: p[1] })
        break
      }
      case 'wallLine':
      case 'wallRect':
      case 'wallErase': {
        if (s.wallEdges) {
          const prev = s.wallEdges
          for (const k of sampleEdges(grid, prevPos, pos)) prev.add(k)
          setPreview({ type: 'edges', keys: [...prev], erase: s.wallErase })
        } else if (s.wallStart) {
          const b = grid.snapVertex(pos[0], pos[1])
          const keys = ui.tool === 'wallRect' ? squareRectEdges(s.wallStart, b) : squareLineEdges(s.wallStart, b)
          setPreview({ type: 'edges', keys })
        } else if (ui.tool === 'wallErase' || grid.type === 'hex') {
          const k = grid.nearestEdge(pos[0], pos[1])
          setPreview({ type: 'edges', keys: k ? [k] : [], erase: ui.tool === 'wallErase' })
        } else {
          const v = grid.snapVertex(pos[0], pos[1])
          setPreview({ type: 'vertex', x: v[0], y: v[1] })
        }
        break
      }
      case 'opening': {
        const k = grid.nearestEdge(pos[0], pos[1])
        setPreview({ type: 'edges', keys: k && grid.edgeValid(k) ? [k] : [] })
        break
      }
      case 'select': {
        if (s.marquee) {
          const m = s.marquee
          setPreview({ type: 'marquee', x: Math.min(m.x, pos[0]), y: Math.min(m.y, pos[1]), w: Math.abs(pos[0] - m.x), h: Math.abs(pos[1] - m.y) })
        }
        break
      }
      case 'arrow': {
        if (s.arrowStart) {
          const a = s.arrowStart
          const b = ui.snap ? grid.snapVertex(pos[0], pos[1]) : pos
          const len = Math.hypot(b[0] - a[0], b[1] - a[1])
          setPreview({
            type: 'arrow',
            item: newItem({ kind: 'arrow', layer: 'objects', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: Math.max(len, 0.05), h: 0.45, rot: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI })
          })
        } else setPreview({ type: 'vertex', x: ui.snap ? grid.snapVertex(pos[0], pos[1])[0] : pos[0], y: ui.snap ? grid.snapVertex(pos[0], pos[1])[1] : pos[1] })
        break
      }
      case 'place': {
        if (!ui.placing) break
        const item = buildItem(ui.placing, pos[0], pos[1])
        if (!item) break
        const [sx, sy] = snapped(item, pos[0], pos[1])
        item.x = sx
        item.y = sy
        setPreview({ type: 'ghost', item })
        break
      }
      case 'text':
      case 'note':
      case 'number': {
        setPreview(grid.inBounds(c, r) ? { type: 'cells', cells: [[c, r]], mode: 'hover' } : null)
        break
      }
      default:
        break
    }
  }, [paintCells])

  // la chiusura del poligono con doppio clic è gestita in onMouseDown (secondo clic sullo stesso punto)
  const onDblClick = useCallback(() => undefined, [])

  const onMouseLeave = useCallback(() => {
    if (!S.current.poly && !S.current.paint && !S.current.rect && !S.current.wallStart && !S.current.wallEdges) setPreview(null)
  }, [])

  return { preview, onMouseDown, onMouseMove, onDblClick, onMouseLeave, finishPolygon }
}
