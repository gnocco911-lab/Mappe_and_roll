// Disegna la mappa fuori schermo ad alta risoluzione, usando la stessa scena dell'editor.
// Le immagini grandi vengono prodotte a "tasselli" per non superare i limiti di memoria del canvas.
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Stage } from 'react-konva'
import Konva from 'konva'
import type { CustomAsset, InkMode, MapDoc, ViewMode } from '../types'
import { CELL } from '../types'
import { MapLayers } from '../canvas/MapScene'
import { preloadAssets } from '../canvas/imageCache'
import { getGrid } from '../core/grid'

const MAX_TILE = 3072 // lato massimo di un tassello (pixel)

export interface RenderOptions {
  view: ViewMode
  ink: InkMode
  showGrid: boolean
}

/** Applica la modalità "risparmio inchiostro" ai pixel di un canvas. */
export function applyInk(c: HTMLCanvasElement, ink: InkMode) {
  if (ink === 'color') return
  const g = c.getContext('2d', { willReadFrequently: true })!
  const img = g.getImageData(0, 0, c.width, c.height)
  const d = img.data
  if (ink === 'bw') {
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const v = Math.max(0, Math.min(255, (gray - 128) * 1.3 + 128 + 14))
      d[i] = d[i + 1] = d[i + 2] = v
    }
  } else {
    // chiaro: meno saturo e più chiaro
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      for (let k = 0; k < 3; k++) {
        const desat = d[i + k] * 0.6 + gray * 0.4
        d[i + k] = desat + (255 - desat) * 0.22
      }
    }
  }
  g.putImageData(img, 0, 0)
}

export class MapRenderer {
  private root: Root
  private host: HTMLDivElement
  private stage!: Konva.Stage
  readonly mapW: number
  readonly mapH: number

  private constructor(private doc: MapDoc, assets: Record<string, CustomAsset>, private opts: RenderOptions) {
    const g = getGrid(doc.gridType, doc.cols, doc.rows)
    this.mapW = g.width
    this.mapH = g.height
    this.host = document.createElement('div')
    this.host.style.cssText = 'position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden;pointer-events:none'
    document.body.appendChild(this.host)
    this.root = createRoot(this.host)
    const prev = Konva.pixelRatio
    Konva.pixelRatio = 1 // i canvas di esportazione non devono moltiplicarsi per la densità dello schermo
    try {
      flushSync(() => {
        this.root.render(
          <Stage width={10} height={10} ref={(s) => { if (s) this.stage = s }}>
            <MapLayers
              doc={doc}
              assets={assets}
              assetsRev={0}
              view={opts.view}
              ink={opts.ink}
              background
              showGrid={opts.showGrid}
            />
          </Stage>
        )
      })
    } finally {
      Konva.pixelRatio = prev
    }
  }

  static async create(doc: MapDoc, assets: Record<string, CustomAsset>, opts: RenderOptions): Promise<MapRenderer> {
    const used = new Set(doc.items.filter((i) => i.kind === 'custom' && i.ref).map((i) => i.ref!))
    await preloadAssets(Object.values(assets).filter((a) => used.has(a.id)))
    // pausa per lasciare ai canvas il tempo di prepararsi
    return new MapRenderer(doc, assets, opts)
  }

  /** Un tassello (massimo MAX_TILE x MAX_TILE pixel). Coordinate e dimensioni in caselle. */
  private tile(x: number, y: number, w: number, h: number, ppc: number): HTMLCanvasElement {
    const pw = Math.max(1, Math.round(w * ppc))
    const ph = Math.max(1, Math.round(h * ppc))
    this.stage.size({ width: pw, height: ph })
    const s = ppc / CELL
    this.stage.scale({ x: s, y: s })
    this.stage.position({ x: -x * ppc, y: -y * ppc })
    const c = this.stage.toCanvas({ x: 0, y: 0, width: pw, height: ph, pixelRatio: 1 })
    return c
  }

  /**
   * Disegna la regione (x, y, w, h in caselle) con `ppc` pixel per casella
   * (a scala reale 1 casella = 1 pollice, quindi ppc = DPI).
   */
  async renderRegion(x: number, y: number, w: number, h: number, ppc: number, onProgress?: (f: number) => void): Promise<HTMLCanvasElement> {
    const pw = Math.max(1, Math.round(w * ppc))
    const ph = Math.max(1, Math.round(h * ppc))
    const out = document.createElement('canvas')
    out.width = pw
    out.height = ph
    const g = out.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, pw, ph)
    const tilesX = Math.ceil(pw / MAX_TILE)
    const tilesY = Math.ceil(ph / MAX_TILE)
    let done = 0
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const px0 = tx * MAX_TILE
        const py0 = ty * MAX_TILE
        const tw = Math.min(MAX_TILE, pw - px0)
        const th = Math.min(MAX_TILE, ph - py0)
        const t = this.tile(x + px0 / ppc, y + py0 / ppc, tw / ppc, th / ppc, ppc)
        g.drawImage(t, 0, 0, t.width, t.height, px0, py0, tw, th)
        t.width = t.height = 0 // libera subito la memoria
        done++
        onProgress?.(done / (tilesX * tilesY))
        await new Promise((r) => setTimeout(r, 0)) // lascia respirare l'interfaccia
      }
    }
    applyInk(out, this.opts.ink)
    return out
  }

  dispose() {
    this.root.unmount()
    this.host.remove()
  }
}
