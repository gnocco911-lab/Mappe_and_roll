// Accesso ai file del sistema. In Electron usa le finestre native (tramite il preload);
// nel browser (solo per sviluppo/test) ripiega su download e selezione file.

export interface PickedFile {
  name: string
  path?: string
  data: Uint8Array
}

export interface FileFilter {
  name: string
  extensions: string[]
}

interface ElectronApi {
  platform: string
  version: string
  saveDialog(opts: { defaultPath?: string; filters?: FileFilter[] }): Promise<string | null>
  writeFile(path: string, data: Uint8Array): Promise<void>
  readFile(path: string): Promise<Uint8Array>
  openDialog(opts: { filters?: FileFilter[]; multiple?: boolean }): Promise<string[]>
  openFolderImages(): Promise<{ name: string; path: string; data: Uint8Array }[]>
  saveMany(opts: { baseName: string; ext: string; filters: FileFilter[]; files: { suffix: string; data: Uint8Array }[] }): Promise<string[] | null>
  writeRecovery(data: Uint8Array): Promise<void>
  readRecovery(): Promise<Uint8Array | null>
  clearRecovery(): Promise<void>
  setTitle(title: string): void
  onMenu(cb: (action: string) => void): () => void
  onBeforeClose(cb: () => void): () => void
  closeNow(): void
}

declare global {
  interface Window {
    api?: ElectronApi
  }
}

export const api = (): ElectronApi | undefined => (typeof window !== 'undefined' ? window.api : undefined)
export const isElectron = () => !!api()

function download(name: string, data: Uint8Array, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

const baseName = (p: string) => p.replace(/^.*[\\/]/, '')

/** Salva un file chiedendo dove. Restituisce il percorso (o il nome nel browser), null se annullato. */
export async function saveFileAs(defaultName: string, data: Uint8Array, filters: FileFilter[], mime = 'application/octet-stream'): Promise<string | null> {
  const a = api()
  if (a) {
    const p = await a.saveDialog({ defaultPath: defaultName, filters })
    if (!p) return null
    await a.writeFile(p, data)
    return p
  }
  download(defaultName, data, mime)
  return defaultName
}

/** Scrive su un percorso noto (salvataggio rapido). Nel browser scarica il file. */
export async function writeFileTo(path: string, data: Uint8Array, mime = 'application/octet-stream'): Promise<void> {
  const a = api()
  if (a) await a.writeFile(path, data)
  else download(baseName(path), data, mime)
}

/** Salva più file con lo stesso nome base e suffissi diversi (Master / Giocatori). */
export async function saveMany(
  baseNameStr: string, ext: string, filters: FileFilter[], files: { suffix: string; data: Uint8Array }[], mime: string
): Promise<string[] | null> {
  const a = api()
  if (a) return a.saveMany({ baseName: baseNameStr, ext, filters, files })
  for (const f of files) download(`${baseNameStr}${f.suffix}.${ext}`, f.data, mime)
  return files.map((f) => `${baseNameStr}${f.suffix}.${ext}`)
}

export async function pickFiles(filters: FileFilter[], multiple = false): Promise<PickedFile[]> {
  const a = api()
  if (a) {
    const paths = await a.openDialog({ filters, multiple })
    const out: PickedFile[] = []
    for (const p of paths) out.push({ name: baseName(p), path: p, data: await a.readFile(p) })
    return out
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    input.accept = filters.flatMap((f) => f.extensions.map((e) => '.' + e)).join(',')
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      resolve(await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) }))))
    }
    input.oncancel = () => resolve([])
    input.click()
  })
}

/** Legge tutte le immagini di una cartella (anche nelle sottocartelle). */
export async function pickFolderImages(): Promise<PickedFile[]> {
  const a = api()
  if (a) return a.openFolderImages()
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.setAttribute('webkitdirectory', '')
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).filter((f) => /\.(png|jpe?g|webp|svg|gif)$/i.test(f.name))
      resolve(await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) }))))
    }
    input.click()
  })
}

export const IMAGE_FILTER: FileFilter = { name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] }
export const PROJECT_FILTER: FileFilter = { name: 'Mappa D&D (*.dndmap)', extensions: ['dndmap'] }
export const LIBRARY_FILTER: FileFilter = { name: 'Libreria elementi (*.dndlib)', extensions: ['dndlib'] }
export const PDF_FILTER: FileFilter = { name: 'PDF', extensions: ['pdf'] }
export const PNG_FILTER: FileFilter = { name: 'Immagine PNG', extensions: ['png'] }
