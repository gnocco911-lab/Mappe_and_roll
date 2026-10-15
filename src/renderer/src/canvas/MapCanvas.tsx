// L'area di lavoro: palco Konva con la mappa, gli strumenti, la selezione e lo zoom.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Layer, Line, Rect, Shape, Stage, Transformer } from 'react-konva'
import type Konva from 'konva'
import { CELL, type MapItem } from '../types'
import { getGrid, type Grid } from '../core/grid'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { ItemNode, MapLayers, raw, type ItemHandlers } from './MapScene'
import { useMapTools, type Preview } from './useMapTools'
import { ELEMENT_DRAG_MIME, placeAt, snapped } from './placement'
import { input } from './inputState'

const MIN_ZOOM = 0.08
const MAX_ZOOM = 4

function PreviewLayer({ preview, grid }: { preview: Preview; grid: Grid }) {
  const assets = useDoc((s) => s.assets)
  const assetsRev = useDoc((s) => s.assetsRev)
  if (!preview) return null
  switch (preview.type) {
    case 'cells': {
      const { cells, mode } = preview
      return (
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const g = raw(ctx)
            g.beginPath()
            for (const [c, r] of cells) {
              const p = grid.polygon(c, r)
              g.moveTo(p[0] * CELL, p[1] * CELL)
              for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * CELL, p[i + 1] * CELL)
              g.closePath()
            }
            g.fillStyle = mode === 'erase' ? 'rgba(220,60,60,0.28)' : mode === 'add' ? 'rgba(80,140,255,0.3)' : 'rgba(255,255,255,0.22)'
            g.fill()
            g.strokeStyle = mode === 'erase' ? 'rgba(200,40,40,0.95)' : 'rgba(30,90,220,0.95)'
            g.lineWidth = 2
            g.stroke()
          }}
        />
      )
    }
    case 'edges':
      return (
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const g = raw(ctx)
            g.beginPath()
            for (const k of preview.keys) {
              const [x1, y1, x2, y2] = grid.edgeGeom(k)
              g.moveTo(x1 * CELL, y1 * CELL)
              g.lineTo(x2 * CELL, y2 * CELL)
            }
            g.strokeStyle = preview.erase ? 'rgba(230,60,60,0.9)' : 'rgba(40,120,255,0.9)'
            g.lineWidth = 9
            g.lineCap = 'round'
            g.stroke()
          }}
        />
      )
    case 'poly': {
      const pts = preview.cursor ? [...preview.pts, preview.cursor[0], preview.cursor[1]] : preview.pts
      return (
        <>
          <Line points={pts.map((v) => v * CELL)} stroke="#2a6cf0" strokeWidth={3} dash={[10, 6]} closed={pts.length >= 6} fill="rgba(60,120,255,0.18)" listening={false} />
          {Array.from({ length: preview.pts.length / 2 }, (_, i) => (
            <Circle key={i} x={preview.pts[i * 2] * CELL} y={preview.pts[i * 2 + 1] * CELL} radius={i === 0 ? 8 : 5} fill={i === 0 ? '#2a6cf0' : '#fff'} stroke="#2a6cf0" strokeWidth={2} listening={false} />
          ))}
        </>
      )
    }
    case 'vertex':
      return <Circle x={preview.x * CELL} y={preview.y * CELL} radius={6} fill="rgba(40,120,255,0.9)" stroke="#fff" strokeWidth={2} listening={false} />
    case 'marquee':
      return <Rect x={preview.x * CELL} y={preview.y * CELL} width={preview.w * CELL} height={preview.h * CELL} stroke="#2a6cf0" strokeWidth={1.5} dash={[6, 4]} fill="rgba(60,120,255,0.12)" listening={false} />
    case 'ghost':
    case 'arrow': {
      const it = preview.item
      return <ItemNode item={it} asset={it.kind === 'custom' ? assets[it.ref ?? ''] ?? undefined : undefined} assetsRev={assetsRev} ink="color" interactive={false} draggable={false} ghost />
    }
  }
}

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const doc = useDoc((s) => s.doc)
  const assets = useDoc((s) => s.assets)
  const assetsRev = useDoc((s) => s.assetsRev)
  const tool = useUI((s) => s.tool)
  const selection = useUI((s) => s.selection)
  const zoom = useUI((s) => s.zoom)
  const panX = useUI((s) => s.panX)
  const panY = useUI((s) => s.panY)
  const viewMode = useUI((s) => s.viewMode)
  const rotSnap = useUI((s) => s.rotSnap)
  const fitTick = useUI((s) => s.fitTick)

  const grid = getGrid(doc.gridType, doc.cols, doc.rows)
  const { preview, onMouseDown, onMouseMove, onDblClick, onMouseLeave } = useMapTools()

  // ------------------------------------------------------------ dimensioni e adattamento

  useEffect(() => {
    const el = containerRef.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const fit = useCallback(() => {
    const { doc: d } = useDoc.getState()
    const g = getGrid(d.gridType, d.cols, d.rows)
    const mw = g.width * CELL
    const mh = g.height * CELL
    const el = containerRef.current
    if (!el) return
    const z = Math.max(MIN_ZOOM, Math.min(2, Math.min((el.clientWidth - 80) / mw, (el.clientHeight - 80) / mh)))
    useUI.getState().setView(z, (el.clientWidth - mw * z) / 2, (el.clientHeight - mh * z) / 2)
  }, [])

  useEffect(() => { fit() }, [fitTick, doc.id, fit])

  // ------------------------------------------------------------ zoom con la rotellina

  const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()!
    const p = stage.getPointerPosition()
    if (!p) return
    const ui = useUI.getState()
    const factor = Math.exp(-e.evt.deltaY * (e.evt.ctrlKey ? 0.01 : 0.0016))
    const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ui.zoom * factor))
    const wx = (p.x - ui.panX) / ui.zoom
    const wy = (p.y - ui.panY) / ui.zoom
    ui.setView(nz, p.x - wx * nz, p.y - wy * nz)
  }, [])

  // ------------------------------------------------------------ selezione e trascinamento

  const dragStart = useRef<Map<string, [number, number]>>(new Map())

  const handlers = useMemo<ItemHandlers>(() => ({
    onDown: (it, e) => {
      if (e.evt.button !== 0) return
      const ui = useUI.getState()
      if (input.shift) {
        ui.select(ui.selection.includes(it.id) ? ui.selection.filter((i) => i !== it.id) : [...ui.selection, it.id])
      } else if (!ui.selection.includes(it.id)) ui.select([it.id])
    },
    onDragStart: (it, node) => {
      const stage = node.getStage()!
      useDoc.getState().beginGesture()
      dragStart.current.clear()
      const ids = useUI.getState().selection.includes(it.id) ? useUI.getState().selection : [it.id]
      for (const id of ids) {
        const n = stage.findOne('#' + id)
        if (n) dragStart.current.set(id, [n.x(), n.y()])
      }
    },
    onDragMove: (it, node) => {
      const stage = node.getStage()!
      const start = dragStart.current.get(it.id)
      if (!start) return
      let nx = node.x() / CELL
      let ny = node.y() / CELL
      if (useUI.getState().snap) [nx, ny] = snapped(it, nx, ny)
      node.position({ x: nx * CELL, y: ny * CELL })
      const dx = node.x() - start[0]
      const dy = node.y() - start[1]
      for (const [id, s] of dragStart.current) {
        if (id === it.id) continue
        stage.findOne('#' + id)?.position({ x: s[0] + dx, y: s[1] + dy })
      }
    },
    onDragEnd: (it, node) => {
      const stage = node.getStage()!
      const pos = new Map<string, [number, number]>()
      for (const id of dragStart.current.keys()) {
        const n = stage.findOne('#' + id)
        if (n) pos.set(id, [n.x() / CELL, n.y() / CELL])
      }
      dragStart.current.clear()
      useDoc.getState().endGesture()
      useDoc.getState().change((d) => {
        for (const o of d.items) {
          const p = pos.get(o.id)
          if (p) { o.x = p[0]; o.y = p[1] }
        }
      })
    },
    onDblClick: (it) => {
      if (it.kind === 'text' || it.kind === 'number') useUI.getState().requestTextFocus()
    }
  }), [])

  const editor = useMemo(() => ({
    handlers,
    canDrag: (it: MapItem) => tool === 'select' && !it.locked,
    canSelect: () => tool === 'select'
  }), [handlers, tool])

  // ------------------------------------------------------------ maniglie di trasformazione

  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    if (tool !== 'select') { tr.nodes([]); return }
    const nodes: Konva.Node[] = []
    for (const id of selection) {
      const it = doc.items.find((i) => i.id === id)
      if (!it || it.locked) continue
      const L = doc.layers[it.layer]
      if (!L.visible || L.locked || (viewMode === 'players' && it.layer === 'master')) continue
      const n = stage.findOne('#' + id)
      if (n) nodes.push(n)
    }
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selection, doc.items, doc.layers, tool, viewMode, assetsRev])

  const single = selection.length === 1 ? doc.items.find((i) => i.id === selection[0]) : undefined
  const anchors = useMemo(() => {
    if (single?.kind === 'arrow') return ['middle-left', 'middle-right']
    if (single?.kind === 'text') return []
    return ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']
  }, [single?.kind, single?.id])

  const onTransformEnd = useCallback(() => {
    const tr = trRef.current
    if (!tr) return
    const snap = useUI.getState().snap
    const upd = new Map<string, Partial<MapItem>>()
    const items = useDoc.getState().doc.items
    const rnd = (v: number) => Math.max(0.1, snap ? Math.max(0.25, Math.round(v * 4) / 4) : Math.round(v * 100) / 100)
    for (const n of tr.nodes()) {
      const it = items.find((i) => i.id === n.id())
      if (!it) continue
      const sx = n.scaleX()
      const sy = n.scaleY()
      const patch: Partial<MapItem> = {
        x: n.x() / CELL,
        y: n.y() / CELL,
        rot: Math.round(n.rotation() * 100) / 100,
        w: rnd(it.w * Math.abs(sx)),
        h: it.kind === 'text' || it.kind === 'arrow' ? it.h : rnd(it.h * Math.abs(sy))
      }
      if (sx < 0) patch.flipX = !it.flipX
      if (sy < 0) patch.flipY = !it.flipY
      n.scaleX(1)
      n.scaleY(1)
      upd.set(it.id, patch)
    }
    useDoc.getState().change((d) => {
      for (const o of d.items) {
        const p = upd.get(o.id)
        if (p) Object.assign(o, p)
      }
    })
  }, [])

  // ------------------------------------------------------------ trascinamento dalla libreria

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(ELEMENT_DRAG_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  }
  const onDrop = (e: React.DragEvent) => {
    const raw_ = e.dataTransfer.getData(ELEMENT_DRAG_MIME)
    if (!raw_) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current!.getBoundingClientRect()
    const ui = useUI.getState()
    const x = (e.clientX - rect.left - ui.panX) / ui.zoom / CELL
    const y = (e.clientY - rect.top - ui.panY) / ui.zoom / CELL
    placeAt(JSON.parse(raw_), x, y)
  }

  const cursor =
    tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : tool === 'place' ? 'copy' : tool === 'text' || tool === 'note' ? 'text' : 'crosshair'

  return (
    <div ref={containerRef} className="canvas-wrap" style={{ cursor }} onDragOver={onDragOver} onDrop={onDrop}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        x={panX}
        y={panY}
        scaleX={zoom}
        scaleY={zoom}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onDblClick={onDblClick}
        onWheel={onWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <MapLayers
          doc={doc}
          assets={assets}
          assetsRev={assetsRev}
          view={viewMode}
          ink="color"
          editor={editor}
        />
        <Layer listening={false}>
          <Rect x={0} y={0} width={grid.width * CELL} height={grid.height * CELL} stroke="#000" strokeWidth={2 / zoom} opacity={0.6} />
          <PreviewLayer preview={preview} grid={grid} />
        </Layer>
        <Layer>
          <Transformer
            ref={trRef}
            rotateEnabled
            rotationSnaps={[0, 90, 180, 270]}
            rotationSnapTolerance={rotSnap ? 45 : 2}
            enabledAnchors={anchors}
            keepRatio={single ? single.kind !== 'text' : true}
            borderStroke="#2a6cf0"
            anchorStroke="#2a6cf0"
            anchorFill="#fff"
            anchorSize={9}
            boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox)}
            onTransformEnd={onTransformEnd}
          />
        </Layer>
      </Stage>
    </div>
  )
}
