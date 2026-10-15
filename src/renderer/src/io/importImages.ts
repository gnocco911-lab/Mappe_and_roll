// Trasforma un file immagine (PNG, JPG, WebP, SVG, GIF) in un elemento personalizzato.
import type { CustomAsset } from '../types'
import { uid } from '../core/defaults'
import { bytesToDataUrl, mimeFromName } from './bytes'

const MAX_SIDE = 2048

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Immagine non leggibile'))
    img.src = url
  })
}

/** Nome leggibile ricavato dal nome del file. */
export function prettyName(file: string): string {
  const base = file.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')
  const s = base.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Elemento'
}

/** Dimensione predefinita in caselle: il lato corto vale 1 casella, arrotondato a mezza casella. */
export function guessCells(w: number, h: number): { wCells: number; hCells: number } {
  const short = Math.min(w, h)
  const r = (v: number) => Math.min(12, Math.max(0.5, Math.round(v * 2) / 2))
  return { wCells: r(w / short), hCells: r(h / short) }
}

export async function fileToAsset(fileName: string, data: Uint8Array, category = 'Altro'): Promise<CustomAsset> {
  let mime = mimeFromName(fileName)
  if (!mime.startsWith('image/')) throw new Error(`"${fileName}" non è un'immagine supportata`)
  let dataUrl = bytesToDataUrl(data, mime)
  const img = await loadImg(dataUrl)
  let w = img.naturalWidth || 256
  let h = img.naturalHeight || 256
  // immagini molto grandi: riduce per non appesantire il progetto (non per gli SVG)
  if (!mime.includes('svg') && Math.max(w, h) > MAX_SIDE) {
    const k = MAX_SIDE / Math.max(w, h)
    const c = document.createElement('canvas')
    c.width = Math.round(w * k)
    c.height = Math.round(h * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    mime = mime === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    dataUrl = c.toDataURL(mime, 0.92)
    w = c.width
    h = c.height
  }
  const { wCells, hCells } = guessCells(w, h)
  return {
    id: uid('a'),
    name: prettyName(fileName),
    category,
    tags: [],
    mime,
    dataUrl,
    wCells,
    hCells,
    keyColor: null,
    tolerance: 12
  }
}

/** Legge i file trascinati nella finestra (anche cartelle intere). */
export async function filesFromDrop(dt: DataTransfer): Promise<{ name: string; data: Uint8Array }[]> {
  const out: { name: string; data: Uint8Array }[] = []
  const isImg = (n: string) => /\.(png|jpe?g|webp|svg|gif)$/i.test(n)
  const readEntry = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file: File = await new Promise((res, rej) => (entry as FileSystemFileEntry).file(res, rej))
      if (isImg(file.name)) out.push({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const readAll = async (): Promise<FileSystemEntry[]> => {
        const all: FileSystemEntry[] = []
        for (;;) {
          const batch: FileSystemEntry[] = await new Promise((res, rej) => reader.readEntries(res, rej))
          if (!batch.length) break
          all.push(...batch)
        }
        return all
      }
      for (const child of await readAll()) await readEntry(child)
    }
  }
  const entries: FileSystemEntry[] = []
  for (const item of Array.from(dt.items)) {
    const e = item.webkitGetAsEntry?.()
    if (e) entries.push(e)
  }
  if (entries.length) {
    for (const e of entries) await readEntry(e)
  } else {
    for (const f of Array.from(dt.files)) if (isImg(f.name)) out.push({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) })
  }
  return out
}
