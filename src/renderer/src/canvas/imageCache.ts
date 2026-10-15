// Cache delle immagini personalizzate: decodifica una volta sola, applica il colore trasparente
// e conserva il risultato come canvas pronto da disegnare.
import type { CustomAsset } from '../types'
import { useDoc } from '../store/docStore'

interface Entry {
  key: string
  canvas: HTMLCanvasElement | null
  promise: Promise<void>
}

const cache = new Map<string, Entry>()
const MAX_SIDE = 2048

const assetKey = (a: CustomAsset) => `${a.id}|${a.dataUrl.length}|${a.keyColor}|${a.tolerance}|${a.keyEdge ? 1 : 0}`

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Immagine non leggibile'))
    img.src = url
  })
}

/** Rende trasparente il colore scelto (con tolleranza) sull'immagine data. */
export function applyColorKey(c: HTMLCanvasElement, keyColor: string, tolerance: number, edgeOnly: boolean) {
  const g = c.getContext('2d')!
  const img = g.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const n = parseInt(keyColor.slice(1), 16)
  const kr = (n >> 16) & 255, kg = (n >> 8) & 255, kb = n & 255
  const thr = (tolerance / 100) * 255
  const soft = thr * 0.5 + 6
  const w = c.width
  const h = c.height
  const dist = (i: number) => Math.sqrt((d[i] - kr) ** 2 + (d[i + 1] - kg) ** 2 + (d[i + 2] - kb) ** 2)
  if (!edgeOnly) {
    for (let i = 0; i < d.length; i += 4) {
      const dd = dist(i)
      if (dd <= thr) d[i + 3] = 0
      else if (dd < thr + soft) d[i + 3] = Math.min(d[i + 3], Math.round(((dd - thr) / soft) * 255))
    }
  } else {
    // parte dai pixel del bordo e si espande finché trova colori simili alla chiave
    const seen = new Uint8Array(w * h)
    const stack: number[] = []
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return
      const p = y * w + x
      if (seen[p]) return
      if (dist(p * 4) > thr + soft) return
      seen[p] = 1
      stack.push(p)
    }
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
    while (stack.length) {
      const p = stack.pop()!
      const x = p % w
      const y = (p - x) / w
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
    }
    for (let p = 0; p < w * h; p++) {
      if (!seen[p]) continue
      const dd = dist(p * 4)
      d[p * 4 + 3] = dd <= thr ? 0 : Math.round(((dd - thr) / soft) * 255)
    }
  }
  g.putImageData(img, 0, 0)
}

async function build(a: CustomAsset): Promise<HTMLCanvasElement> {
  const img = await loadImage(a.dataUrl)
  let w = img.naturalWidth || 512
  let h = img.naturalHeight || 512
  const isSvg = a.mime.includes('svg')
  if (isSvg) { // gli SVG senza dimensioni: si usa una risoluzione comoda
    const k = 1024 / Math.max(w, h)
    w = Math.round(w * k); h = Math.round(h * k)
  }
  const k = Math.min(1, MAX_SIDE / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * k))
  c.height = Math.max(1, Math.round(h * k))
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  if (a.keyColor) applyColorKey(c, a.keyColor, a.tolerance, !!a.keyEdge)
  return c
}

/** Restituisce il canvas pronto, oppure null se è ancora in caricamento (poi ridisegna da solo). */
export function getAssetCanvas(a: CustomAsset): HTMLCanvasElement | null {
  const key = assetKey(a)
  let e = cache.get(a.id)
  if (!e || e.key !== key) {
    const entry: Entry = { key, canvas: null, promise: Promise.resolve() }
    entry.promise = build(a)
      .then((c) => {
        entry.canvas = c
        // avvisa la scena che l'immagine è pronta
        useDoc.setState((s) => ({ assetsRev: s.assetsRev + 1 }))
      })
      .catch(() => {
        const c = document.createElement('canvas')
        c.width = c.height = 64
        const g = c.getContext('2d')!
        g.fillStyle = '#ccc'; g.fillRect(0, 0, 64, 64)
        g.strokeStyle = '#a33'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60)
        entry.canvas = c
      })
    cache.set(a.id, entry)
    e = entry
  }
  return e.canvas
}

/** Attende il caricamento di tutte le immagini indicate (prima di un'esportazione). */
export async function preloadAssets(assets: CustomAsset[]): Promise<void> {
  for (const a of assets) getAssetCanvas(a)
  await Promise.all(assets.map((a) => cache.get(a.id)!.promise))
}
