// Formato del file di progetto ".dndmap": un archivio zip con
//   project.json      → mappa + elenco immagini
//   assets/<id>.<ext> → le immagini personalizzate usate dalla mappa
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import type { CustomAsset, MapDoc } from '../types'
import { DOC_VERSION, newDoc, defaultLayers } from '../core/defaults'
import { bytesToDataUrl, dataUrlToBytes, extFromMime } from './bytes'

interface AssetMeta extends Omit<CustomAsset, 'dataUrl'> {
  file: string
}

export function serializeProject(doc: MapDoc, assets: Record<string, CustomAsset>): Uint8Array {
  const used = new Set(doc.items.filter((i) => i.kind === 'custom' && i.ref).map((i) => i.ref!))
  const files: Record<string, Uint8Array> = {}
  const metas: AssetMeta[] = []
  for (const id of used) {
    const a = assets[id]
    if (!a) continue
    const { bytes, mime } = dataUrlToBytes(a.dataUrl)
    const file = `assets/${a.id}.${extFromMime(mime)}`
    files[file] = bytes
    const { dataUrl: _d, ...rest } = a
    metas.push({ ...rest, file })
  }
  files['project.json'] = strToU8(JSON.stringify({ format: 'dnd-battlemap', version: DOC_VERSION, doc, assets: metas }))
  return zipSync(files, { level: 6 })
}

export function parseProject(bytes: Uint8Array): { doc: MapDoc; assets: Record<string, CustomAsset> } {
  const files = unzipSync(bytes)
  const pj = files['project.json']
  if (!pj) throw new Error('File non valido: manca project.json')
  const data = JSON.parse(strFromU8(pj))
  if (data.format !== 'dnd-battlemap') throw new Error('Questo file non è una mappa di questa applicazione.')
  const d = data.doc as Partial<MapDoc>
  // completa eventuali campi mancanti (file di versioni precedenti)
  const base = newDoc()
  const doc: MapDoc = {
    ...base,
    ...d,
    grid: { ...base.grid, ...(d.grid ?? {}) },
    layers: { ...defaultLayers(), ...(d.layers ?? {}) },
    floors: d.floors ?? {},
    walls: d.walls ?? {},
    items: d.items ?? []
  } as MapDoc
  const assets: Record<string, CustomAsset> = {}
  for (const m of (data.assets ?? []) as AssetMeta[]) {
    const f = files[m.file]
    if (!f) continue
    const { file: _f, ...rest } = m
    const mime = m.mime || 'image/png'
    assets[m.id] = { ...(rest as Omit<CustomAsset, 'dataUrl'>), dataUrl: bytesToDataUrl(f, mime) }
  }
  return { doc, assets }
}
