// La scena della mappa: terreno, griglia, muri e oggetti.
// È usata sia dall'editor (interattivo) sia dall'esportazione (fuori schermo): così
// quello che si vede a schermo è esattamente quello che si stampa.
import { memo, useCallback, useMemo } from 'react'
import { Layer, Rect, Shape } from 'react-konva'
import type Konva from 'konva'
import {
  CELL, type CustomAsset, type InkMode, type ItemLayer, type MapDoc, type MapItem, type ViewMode, type WallKind
} from '../types'
import { floorOutline, getGrid, parseCell, type Grid } from '../core/grid'
import { getTexturePattern } from '../core/textures'
import { ELEMENT_BY_ID, drawBuiltin } from '../elements/registry'
import { centerText, circle, OUT, paint, rr } from '../elements/draw'
import { getAssetCanvas } from './imageCache'

/** Contesto 2D "vero" dietro il contesto di Konva. */
export const raw = (ctx: Konva.Context): CanvasRenderingContext2D => (ctx as unknown as { _context: CanvasRenderingContext2D })._context

const LABEL_FONT = 'Georgia, "Times New Roman", "DejaVu Serif", serif'

// ------------------------------------------------------------------ terreno

export const TerrainShape = memo(function TerrainShape({ doc, ink }: { doc: MapDoc; ink: InkMode }) {
  const grid = getGrid(doc.gridType, doc.cols, doc.rows)
  const groups = useMemo(() => {
    const m = new Map<string, [number, number][]>()
    for (const [k, tex] of Object.entries(doc.floors)) {
      const rc = parseCell(k)
      if (!grid.inBounds(rc[0], rc[1])) continue
      let a = m.get(tex)
      if (!a) m.set(tex, (a = []))
      a.push(rc)
    }
    return m
  }, [doc.floors, grid])
  const outline = useMemo(() => floorOutline(grid, doc.floors), [doc.floors, grid])

  const sceneFunc = useCallback(
    (ctx: Konva.Context) => {
      const g = raw(ctx)
      for (const [tex, cells] of groups) {
        g.beginPath()
        for (const [c, r] of cells) {
          const p = grid.polygon(c, r)
          g.moveTo(p[0] * CELL, p[1] * CELL)
          for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * CELL, p[i + 1] * CELL)
          g.closePath()
        }
        g.fillStyle = getTexturePattern(g, tex, ink !== 'color')
        g.fill()
      }
      // bordo scuro dove il pavimento incontra il vuoto
      g.beginPath()
      for (const [x1, y1, x2, y2] of outline) {
        g.moveTo(x1 * CELL, y1 * CELL)
        g.lineTo(x2 * CELL, y2 * CELL)
      }
      g.strokeStyle = ink === 'color' ? 'rgba(30,24,18,0.85)' : 'rgba(40,40,40,0.9)'
      g.lineWidth = 5
      g.lineCap = 'round'
      g.stroke()
    },
    [groups, outline, grid, ink]
  )
  return <Shape listening={false} sceneFunc={sceneFunc} />
})

// ------------------------------------------------------------------ griglia

export const GridShape = memo(function GridShape({ doc }: { doc: MapDoc }) {
  const grid = getGrid(doc.gridType, doc.cols, doc.rows)
  const segs = useMemo(() => {
    const out: [number, number, number, number][] = []
    if (grid.type === 'square') {
      for (let c = 0; c <= doc.cols; c++) out.push([c, 0, c, doc.rows])
      for (let r = 0; r <= doc.rows; r++) out.push([0, r, doc.cols, r])
    } else {
      const keys = new Set<string>()
      for (let r = 0; r < doc.rows; r++) for (let c = 0; c < doc.cols; c++) for (const k of grid.cellEdges(c, r)) keys.add(k)
      for (const k of keys) out.push(grid.edgeGeom(k))
    }
    return out
  }, [grid, doc.cols, doc.rows])
  const sceneFunc = useCallback(
    (ctx: Konva.Context) => {
      const g = raw(ctx)
      g.beginPath()
      for (const [x1, y1, x2, y2] of segs) {
        g.moveTo(x1 * CELL, y1 * CELL)
        g.lineTo(x2 * CELL, y2 * CELL)
      }
      g.globalAlpha = doc.grid.opacity
      g.strokeStyle = doc.grid.color
      g.lineWidth = doc.grid.width
      g.lineCap = 'butt'
      g.stroke()
      g.globalAlpha = 1
    },
    [segs, doc.grid.color, doc.grid.opacity, doc.grid.width]
  )
  if (!doc.grid.visible) return null
  return <Shape listening={false} sceneFunc={sceneFunc} />
})

// ------------------------------------------------------------------ muri e porte

const WALL_T = 12 // spessore del muro (pixel di mondo)

function drawWalls(g: CanvasRenderingContext2D, grid: Grid, walls: Record<string, WallKind>, view: ViewMode, ink: InkMode) {
  const solid: number[][] = []
  const special: [WallKind, number[]][] = []
  for (const [key, kind] of Object.entries(walls)) {
    if (!grid.edgeValid(key)) continue
    const geom = grid.edgeGeom(key).map((v) => v * CELL)
    if (kind === 'wall' || kind === 'window') solid.push(geom)
    else if (kind === 'secret') {
      solid.push(geom) // per i giocatori è un muro normale
      if (view === 'master') special.push([kind, geom])
    } else special.push([kind, geom])
  }
  const path = (segs: number[][]) => {
    g.beginPath()
    for (const [x1, y1, x2, y2] of segs) {
      g.moveTo(x1, y1)
      g.lineTo(x2, y2)
    }
  }
  g.lineCap = 'square'
  g.lineJoin = 'miter'
  // ombra, contorno scuro, poi bordo interno più chiaro
  g.save()
  g.translate(2, 3)
  path(solid)
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.lineWidth = WALL_T
  g.stroke()
  g.restore()
  path(solid)
  g.strokeStyle = '#1f1b19'
  g.lineWidth = WALL_T
  g.stroke()
  path(solid)
  g.strokeStyle = ink === 'color' ? '#6a645c' : '#8a8a8a'
  g.lineWidth = WALL_T - 6
  g.stroke()

  for (const [kind, [x1, y1, x2, y2]] of special) {
    const len = Math.hypot(x2 - x1, y2 - y1)
    const ang = Math.atan2(y2 - y1, x2 - x1)
    g.save()
    g.translate((x1 + x2) / 2, (y1 + y2) / 2)
    g.rotate(ang)
    const half = len / 2
    if (kind !== 'secret' && kind !== 'window') {
      // montanti agli estremi dell'apertura
      for (const sx of [-half, half]) {
        g.fillStyle = '#1f1b19'
        g.fillRect(sx - WALL_T / 2, -WALL_T / 2, WALL_T, WALL_T)
        g.fillStyle = ink === 'color' ? '#6a645c' : '#8a8a8a'
        g.fillRect(sx - WALL_T / 2 + 3, -WALL_T / 2 + 3, WALL_T - 6, WALL_T - 6)
      }
    }
    if (kind === 'door' || kind === 'locked') {
      const L = len - WALL_T - 6
      rr(g, -L / 2, -5, L, 10, 2)
      paint(g, ink === 'color' ? '#94622f' : '#c9c9c9', OUT, 2)
      g.strokeStyle = 'rgba(0,0,0,0.3)'
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(-L / 2 + 3, 0)
      g.lineTo(L / 2 - 3, 0)
      g.stroke()
      circle(g, L / 2 - 8, 0, 2.4)
      paint(g, '#d9b13b', OUT, 1)
      if (kind === 'locked') {
        // lucchetto
        g.rotate(-ang)
        rr(g, -6, -3, 12, 10, 2)
        paint(g, '#d9b13b', OUT, 1.6)
        g.beginPath()
        g.arc(0, -3, 4, Math.PI, 0)
        g.strokeStyle = OUT
        g.lineWidth = 2
        g.stroke()
        circle(g, 0, 2, 1.5)
        g.fillStyle = OUT
        g.fill()
      }
    } else if (kind === 'window') {
      const L = len - WALL_T - 10
      rr(g, -L / 2, -3, L, 6, 1.5)
      paint(g, '#bfe6fa', OUT, 1.4)
      g.strokeStyle = 'rgba(255,255,255,0.8)'
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(-L / 2 + 4, -0.5)
      g.lineTo(L / 2 - 4, -0.5)
      g.stroke()
    } else if (kind === 'grate') {
      const L = len - WALL_T - 4
      rr(g, -L / 2, -5, L, 10, 1)
      paint(g, 'rgba(25,20,18,0.55)', OUT, 1.6)
      g.strokeStyle = ink === 'color' ? '#8a9099' : '#777'
      g.lineWidth = 2.2
      const n = Math.max(3, Math.round(L / 11))
      for (let i = 1; i < n; i++) {
        const x = -L / 2 + (i * L) / n
        g.beginPath()
        g.moveTo(x, -5)
        g.lineTo(x, 5)
        g.stroke()
      }
    } else if (kind === 'secret') {
      g.rotate(-ang)
      circle(g, 0, 0, 9)
      paint(g, '#7a2a9a', '#fff', 1.6)
      centerText(g, 'S', 0, 0.5, 12, '#fff')
    }
    g.restore()
  }
}

export const WallsShape = memo(function WallsShape({ doc, view, ink }: { doc: MapDoc; view: ViewMode; ink: InkMode }) {
  const grid = getGrid(doc.gridType, doc.cols, doc.rows)
  const sceneFunc = useCallback((ctx: Konva.Context) => drawWalls(raw(ctx), grid, doc.walls, view, ink), [grid, doc.walls, view, ink])
  return <Shape listening={false} sceneFunc={sceneFunc} />
})

// ------------------------------------------------------------------ testo

/** Misura un testo e restituisce la dimensione del riquadro in caselle. */
export function measureText(text: string, fontSize: number, bold: boolean, pad = 0.12): { w: number; h: number } {
  const c = measureCanvas ?? (measureCanvas = document.createElement('canvas'))
  const g = c.getContext('2d')!
  g.font = `${bold ? 'bold ' : ''}${fontSize * CELL}px ${LABEL_FONT}`
  const lines = (text || ' ').split('\n')
  let w = 0
  for (const l of lines) w = Math.max(w, g.measureText(l || ' ').width)
  return { w: w / CELL + pad * 2, h: (lines.length * fontSize * 1.2) + pad * 2 }
}
let measureCanvas: HTMLCanvasElement | null = null

function drawTextItem(g: CanvasRenderingContext2D, it: MapItem, w: number, h: number) {
  const fs = (it.fontSize ?? 0.4) * CELL
  const lines = (it.text ?? '').split('\n')
  const note = it.layer === 'master'
  if (note) {
    rr(g, 0, 0, w, h, 5)
    paint(g, 'rgba(255,243,168,0.95)', 'rgba(110,80,0,0.8)', 1.6)
  }
  g.font = `${it.bold ? 'bold ' : ''}${fs}px ${LABEL_FONT}`
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  const color = it.color || (note ? '#4a2c00' : '#1c1612')
  const lh = fs * 1.2
  const pad = 0.12 * CELL
  lines.forEach((l, i) => {
    const y = pad + lh * i + lh / 2
    if (!note) {
      g.lineJoin = 'round'
      g.strokeStyle = 'rgba(255,255,255,0.85)'
      g.lineWidth = fs * 0.2
      g.strokeText(l, pad, y)
    }
    g.fillStyle = color
    g.fillText(l, pad, y)
  })
}

function drawNumberItem(g: CanvasRenderingContext2D, it: MapItem, w: number, h: number) {
  const r = Math.min(w, h) / 2 - 3
  circle(g, w / 2 + 1.5, h / 2 + 2, r)
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.fill()
  circle(g, w / 2, h / 2, r)
  paint(g, it.color || '#fff8e6', OUT, 3)
  circle(g, w / 2, h / 2, r - 5)
  paint(g, null, 'rgba(0,0,0,0.35)', 1.2)
  const t = it.text ?? ''
  centerText(g, t, w / 2, h / 2 + 1, r * (t.length > 2 ? 0.85 : t.length > 1 ? 1.1 : 1.35), '#2a1f16', undefined, LABEL_FONT)
}

function drawArrowItem(g: CanvasRenderingContext2D, it: MapItem, w: number, h: number) {
  const col = it.color || '#b3261e'
  const t = Math.max(5, h * 0.22)
  const head = Math.min(w * 0.45, h * 1.1)
  const cy = h / 2
  g.beginPath()
  g.moveTo(4, cy - t / 2)
  g.lineTo(w - head, cy - t / 2)
  g.lineTo(w - head, cy - h / 2 + 2)
  g.lineTo(w - 3, cy)
  g.lineTo(w - head, cy + h / 2 - 2)
  g.lineTo(w - head, cy + t / 2)
  g.lineTo(4, cy + t / 2)
  g.closePath()
  paint(g, col, OUT, 2.4)
}

// ------------------------------------------------------------------ oggetti

const hitRect = (ctx: Konva.Context, shape: Konva.Shape) => {
  ctx.beginPath()
  ctx.rect(0, 0, shape.width(), shape.height())
  ctx.closePath()
  ctx.fillStrokeShape(shape)
}

export interface ItemHandlers {
  onDown?: (it: MapItem, e: Konva.KonvaEventObject<MouseEvent>) => void
  onDragStart?: (it: MapItem, node: Konva.Node) => void
  onDragMove?: (it: MapItem, node: Konva.Node) => void
  onDragEnd?: (it: MapItem, node: Konva.Node) => void
  onDblClick?: (it: MapItem) => void
}

interface ItemNodeProps {
  item: MapItem
  asset?: CustomAsset
  assetsRev: number
  ink: InkMode
  interactive: boolean
  draggable: boolean
  handlers?: ItemHandlers
  ghost?: boolean
}

export const ItemNode = memo(function ItemNode({ item, asset, ink, interactive, draggable, handlers, ghost }: ItemNodeProps) {
  const wpx = item.w * CELL
  const hpx = item.h * CELL
  const sceneFunc = (ctx: Konva.Context) => {
    const g = raw(ctx)
    if (ghost) g.globalAlpha = 0.65
    if (item.kind === 'builtin') {
      const def = ELEMENT_BY_ID[item.ref ?? '']
      if (def) drawBuiltin(g, def, item, wpx, hpx, ink)
    } else if (item.kind === 'custom') {
      const cv = asset ? getAssetCanvas(asset) : null
      if (cv) {
        g.save()
        g.translate(wpx / 2, hpx / 2)
        g.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1)
        g.imageSmoothingQuality = 'high'
        g.drawImage(cv, -wpx / 2, -hpx / 2, wpx, hpx)
        g.restore()
      } else {
        g.strokeStyle = '#999'
        g.setLineDash([6, 6])
        g.strokeRect(2, 2, wpx - 4, hpx - 4)
        g.setLineDash([])
      }
    } else {
      g.save()
      g.translate(wpx / 2, hpx / 2)
      g.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1)
      g.translate(-wpx / 2, -hpx / 2)
      if (item.kind === 'text') drawTextItem(g, item, wpx, hpx)
      else if (item.kind === 'number') drawNumberItem(g, item, wpx, hpx)
      else if (item.kind === 'arrow') drawArrowItem(g, item, wpx, hpx)
      g.restore()
    }
    g.globalAlpha = 1
  }
  return (
    <Shape
      id={item.id}
      name="item"
      x={item.x * CELL}
      y={item.y * CELL}
      width={wpx}
      height={hpx}
      offsetX={wpx / 2}
      offsetY={hpx / 2}
      rotation={item.rot}
      listening={interactive}
      draggable={draggable}
      sceneFunc={sceneFunc}
      hitFunc={hitRect}
      onMouseDown={(e) => handlers?.onDown?.(item, e)}
      onDragStart={(e) => handlers?.onDragStart?.(item, e.target)}
      onDragMove={(e) => handlers?.onDragMove?.(item, e.target)}
      onDragEnd={(e) => handlers?.onDragEnd?.(item, e.target)}
      onDblClick={() => handlers?.onDblClick?.(item)}
    />
  )
})

const ITEM_LAYERS: ItemLayer[] = ['objects', 'tokens', 'master']

export interface SceneProps {
  doc: MapDoc
  assets: Record<string, CustomAsset>
  assetsRev: number
  view: ViewMode
  ink: InkMode
  /** se presente, gli elementi sono interattivi */
  editor?: {
    handlers: ItemHandlers
    canDrag: (it: MapItem) => boolean
    canSelect: (it: MapItem) => boolean
  }
  /** disegna lo sfondo come rettangolo della mappa */
  background?: boolean
  showGrid?: boolean
}

/** Tutti gli strati della mappa, già nell'ordine corretto. */
export function MapLayers({ doc, assets, assetsRev, view, ink, editor, background = true, showGrid = true }: SceneProps) {
  const players = view === 'players'
  const L = doc.layers
  const bg = ink === 'color' ? doc.background : '#ffffff'
  const gridDoc = useMemo(() => (showGrid ? doc : { ...doc, grid: { ...doc.grid, visible: false } }), [doc, showGrid])
  const grid = getGrid(doc.gridType, doc.cols, doc.rows)
  return (
    <>
      <Layer listening={false}>
        {background && <Rect x={0} y={0} width={grid.width * CELL} height={grid.height * CELL} fill={bg} />}
        {L.terrain.visible && <TerrainShape doc={doc} ink={ink} />}
        <GridShape doc={gridDoc} />
        {L.walls.visible && <WallsShape doc={doc} view={view} ink={ink} />}
      </Layer>
      <Layer listening={!!editor}>
        {ITEM_LAYERS.map((layer) => {
          if (players && layer === 'master') return null
          if (!L[layer].visible) return null
          return doc.items
            .filter((it) => it.layer === layer)
            .map((it) => (
              <ItemNode
                key={it.id}
                item={it}
                asset={it.kind === 'custom' ? assets[it.ref ?? ''] : undefined}
                assetsRev={assetsRev}
                ink={ink}
                interactive={!!editor && !L[layer].locked && editor.canSelect(it)}
                draggable={!!editor && !L[layer].locked && editor.canDrag(it)}
                handlers={editor?.handlers}
              />
            ))
        })}
      </Layer>
    </>
  )
}
