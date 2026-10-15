// Libreria personale di elementi: salvata nel database locale del programma (IndexedDB),
// quindi resta tra una sessione e l'altra, funziona offline e non richiede alcun account.
import { create } from 'zustand'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import type { CustomAsset } from '../types'
import { bytesToDataUrl, dataUrlToBytes, extFromMime } from './bytes'

const DB_NAME = 'dnd-battlemap'
const STORE = 'library'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbAll(): Promise<CustomAsset[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as CustomAsset[])
    req.onerror = () => reject(req.error)
  })
}
async function dbPut(a: CustomAsset): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(a)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
async function dbDelete(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

interface LibState {
  items: CustomAsset[]
  loaded: boolean
  load: () => Promise<void>
  save: (a: CustomAsset) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useLibrary = create<LibState>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => {
    try {
      const items = await dbAll()
      items.sort((a, b) => a.name.localeCompare(b.name, 'it'))
      set({ items, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
  save: async (a) => {
    set((s) => {
      const i = s.items.findIndex((x) => x.id === a.id)
      const items = i >= 0 ? s.items.map((x) => (x.id === a.id ? a : x)) : [...s.items, a]
      items.sort((x, y) => x.name.localeCompare(y.name, 'it'))
      return { items }
    })
    try { await dbPut(a) } catch (e) { console.error('Libreria: salvataggio non riuscito', e) }
    void get
  },
  remove: async (id) => {
    set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
    try { await dbDelete(id) } catch (e) { console.error(e) }
  }
}))

// ----------------------------------------------------------- esporta / importa

interface LibMeta extends Omit<CustomAsset, 'dataUrl'> { file: string }

export function exportLibrary(items: CustomAsset[]): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  const metas: LibMeta[] = []
  for (const a of items) {
    const { bytes, mime } = dataUrlToBytes(a.dataUrl)
    const file = `images/${a.id}.${extFromMime(mime)}`
    files[file] = bytes
    const { dataUrl: _d, ...rest } = a
    metas.push({ ...rest, file })
  }
  files['library.json'] = strToU8(JSON.stringify({ format: 'dnd-battlemap-library', version: 1, items: metas }))
  return zipSync(files, { level: 6 })
}

export function parseLibrary(bytes: Uint8Array): CustomAsset[] {
  const files = unzipSync(bytes)
  const lj = files['library.json']
  if (!lj) throw new Error('File non valido: manca library.json')
  const data = JSON.parse(strFromU8(lj))
  if (data.format !== 'dnd-battlemap-library') throw new Error('Questo file non è una libreria di questa applicazione.')
  const out: CustomAsset[] = []
  for (const m of data.items as LibMeta[]) {
    const f = files[m.file]
    if (!f) continue
    const { file: _f, ...rest } = m
    out.push({ ...(rest as Omit<CustomAsset, 'dataUrl'>), dataUrl: bytesToDataUrl(f, m.mime) })
  }
  return out
}
