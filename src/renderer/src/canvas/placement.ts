// Creazione e inserimento di elementi sulla mappa.
import type { ItemLayer, MapItem } from '../types'
import { LAYER_NAMES } from '../types'
import { getGrid, snapItemCenter } from '../core/grid'
import { newItem } from '../core/defaults'
import { ELEMENT_BY_ID } from '../elements/registry'
import { useDoc } from '../store/docStore'
import { useUI, type PlacingRef } from '../store/uiStore'
import { useLibrary } from '../io/library'
import { measureText } from './MapScene'

export const ELEMENT_DRAG_MIME = 'application/x-dnd-element'

/** Controlla che il livello sia visibile e non bloccato; altrimenti avvisa. */
export function ensureLayerEditable(layer: keyof ReturnType<typeof useDoc.getState>['doc']['layers']): boolean {
  const l = useDoc.getState().doc.layers[layer]
  if (!l.visible) {
    useUI.getState().showToast(`Il livello "${LAYER_NAMES[layer]}" è nascosto: rendilo visibile per modificarlo.`)
    return false
  }
  if (l.locked) {
    useUI.getState().showToast(`Il livello "${LAYER_NAMES[layer]}" è bloccato: sbloccalo per modificarlo.`)
    return false
  }
  return true
}

/** Costruisce l'elemento da inserire (senza aggiungerlo). */
export function buildItem(p: PlacingRef, x: number, y: number): MapItem | null {
  const ui = useUI.getState()
  if (p.kind === 'builtin') {
    const def = ELEMENT_BY_ID[p.ref]
    if (!def) return null
    const isToken = def.id === 'token'
    const size = isToken ? ui.tokenSize : 1
    return newItem({
      kind: 'builtin',
      layer: def.layer ?? 'objects',
      ref: def.id,
      x,
      y,
      w: isToken ? size : def.w,
      h: isToken ? size : def.h,
      color: isToken ? ui.tokenColor : undefined,
      text: isToken ? String(ui.nextTokenNumber) : undefined
    })
  }
  const docS = useDoc.getState()
  let asset = docS.assets[p.ref]
  if (!asset) asset = useLibrary.getState().items.find((a) => a.id === p.ref)!
  if (!asset) return null
  return newItem({ kind: 'custom', layer: 'objects', ref: asset.id, x, y, w: asset.wCells, h: asset.hCells })
}

/** Aggancia (se richiesto) il centro alla griglia. */
export function snapped(item: MapItem, x: number, y: number, force?: boolean): [number, number] {
  const { doc } = useDoc.getState()
  if (!(force ?? useUI.getState().snap)) return [x, y]
  const quarter = Math.abs(item.rot % 180) > 45 && Math.abs(item.rot % 180) < 135
  return snapItemCenter(getGrid(doc.gridType, doc.cols, doc.rows), x, y, quarter ? item.h : item.w, quarter ? item.w : item.h)
}

/** Inserisce un elemento della libreria alla posizione indicata (in caselle). */
export function placeAt(p: PlacingRef, x: number, y: number): MapItem | null {
  const item = buildItem(p, x, y)
  if (!item) return null
  if (!ensureLayerEditable(item.layer)) return null
  const [sx, sy] = snapped(item, x, y)
  item.x = sx
  item.y = sy
  if (item.kind === 'custom') {
    const a = useLibrary.getState().items.find((l) => l.id === item.ref)
    if (a && !useDoc.getState().assets[a.id]) useDoc.getState().addAsset(a)
  }
  useDoc.getState().addItems([item])
  const ui = useUI.getState()
  ui.select([item.id])
  if (item.ref === 'token') ui.setNextTokenNumber(ui.nextTokenNumber + 1)
  return item
}

export function makeTextItem(x: number, y: number, layer: ItemLayer): MapItem {
  const text = layer === 'master' ? 'Nota del Master' : 'Testo'
  const fontSize = 0.4
  const m = measureText(text, fontSize, false)
  return newItem({ kind: 'text', layer, x, y, w: m.w, h: m.h, text, fontSize })
}

export function makeNumberItem(x: number, y: number, n: number): MapItem {
  return newItem({ kind: 'number', layer: 'objects', x, y, w: 0.6, h: 0.6, text: String(n) })
}
