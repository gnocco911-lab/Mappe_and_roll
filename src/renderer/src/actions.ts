// Azioni dell'applicazione richiamabili da menu, barra degli strumenti e scorciatoie.
import type { CustomAsset, MapDoc, MapItem } from './types'
import { LAYER_NAMES } from './types'
import { useDoc, cloneItems } from './store/docStore'
import { useUI } from './store/uiStore'
import { askConfirm } from './store/confirmStore'
import { newDoc } from './core/defaults'
import { serializeProject, parseProject } from './io/project'
import { PROJECT_FILTER, api, pickFiles, saveFileAs, writeFileTo } from './io/platform'
import { ensureLayerEditable } from './canvas/placement'
import { measureText } from './canvas/MapScene'

// ------------------------------------------------------------------ progetti

/** Se ci sono modifiche non salvate chiede cosa fare. true = si può proseguire. */
export async function confirmDiscard(): Promise<boolean> {
  if (!useDoc.getState().dirty) return true
  const r = await askConfirm('Modifiche non salvate', 'La mappa ha modifiche non salvate. Vuoi salvarla prima di continuare?', [
    { id: 'save', label: 'Salva', kind: 'primary' },
    { id: 'discard', label: 'Non salvare', kind: 'danger' },
    { id: 'cancel', label: 'Annulla' }
  ])
  if (r === 'cancel') return false
  if (r === 'save') return saveProject()
  return true
}

export function loadDocument(doc: MapDoc, assets: Record<string, CustomAsset> = {}, path: string | null = null) {
  useDoc.getState().load(doc, assets, path)
  useUI.getState().select([])
  useUI.getState().setTool('select')
  useUI.getState().requestFit()
}

export async function newProject(doc?: MapDoc) {
  if (!(await confirmDiscard())) return
  loadDocument(doc ?? newDoc())
  api()?.clearRecovery()
}

export async function saveProject(saveAs = false): Promise<boolean> {
  const { doc, assets, filePath } = useDoc.getState()
  try {
    const bytes = serializeProject(doc, assets)
    let path = filePath
    if (!path || saveAs) {
      const safe = doc.name.replace(/[\\/:*?"<>|]+/g, '_') || 'mappa'
      path = await saveFileAs(`${safe}.dndmap`, bytes, [PROJECT_FILTER], 'application/zip')
      if (!path) return false
    } else {
      await writeFileTo(path, bytes, 'application/zip')
    }
    useDoc.getState().setFilePath(path)
    useDoc.getState().markSaved()
    api()?.clearRecovery()
    useUI.getState().showToast('Mappa salvata')
    return true
  } catch (e) {
    useUI.getState().showToast('Salvataggio non riuscito: ' + (e as Error).message)
    return false
  }
}

export function openProjectBytes(bytes: Uint8Array, path: string | null) {
  try {
    const { doc, assets } = parseProject(bytes)
    loadDocument(doc, assets, path)
    return true
  } catch (e) {
    useUI.getState().showToast('Impossibile aprire il file: ' + (e as Error).message)
    return false
  }
}

export async function openProject() {
  if (!(await confirmDiscard())) return
  const files = await pickFiles([PROJECT_FILTER], false)
  if (files[0]) openProjectBytes(files[0].data, files[0].path ?? null)
}

// ------------------------------------------------------------------ modifica

export function undo() { useDoc.getState().undo(); pruneSelection() }
export function redo() { useDoc.getState().redo(); pruneSelection() }

function pruneSelection() {
  const ids = new Set(useDoc.getState().doc.items.map((i) => i.id))
  const sel = useUI.getState().selection.filter((i) => ids.has(i))
  if (sel.length !== useUI.getState().selection.length) useUI.getState().select(sel)
}

export function selectedItems(): MapItem[] {
  const sel = new Set(useUI.getState().selection)
  return useDoc.getState().doc.items.filter((i) => sel.has(i.id))
}

export function deleteSelection() {
  const items = selectedItems().filter((i) => !i.locked)
  if (!items.length) return
  useDoc.getState().removeItems(items.map((i) => i.id))
  useUI.getState().select([])
}

export function copySelection() {
  const items = selectedItems()
  if (!items.length) return
  useUI.getState().setClipboard(items)
  useUI.getState().showToast(items.length === 1 ? 'Elemento copiato' : `${items.length} elementi copiati`)
}

export function cutSelection() {
  copySelection()
  deleteSelection()
}

export function pasteClipboard() {
  const clip = useUI.getState().clipboard
  if (!clip.length) return
  const layers = new Set(clip.map((i) => i.layer))
  for (const l of layers) if (!ensureLayerEditable(l)) return
  // incolla spostando di una casella, così si vede la copia
  const copies = cloneItems(clip, 1, 1)
  useDoc.getState().addItems(copies)
  useUI.getState().select(copies.map((c) => c.id))
  useUI.getState().setClipboard(copies) // la copia successiva scorre ancora
}

export function duplicateSelection() {
  const items = selectedItems()
  if (!items.length) return
  const copies = cloneItems(items, 1, 1)
  useDoc.getState().addItems(copies)
  useUI.getState().select(copies.map((c) => c.id))
}

export function selectAll() {
  const { doc } = useDoc.getState()
  const players = useUI.getState().viewMode === 'players'
  useUI.getState().select(
    doc.items.filter((i) => doc.layers[i.layer].visible && !doc.layers[i.layer].locked && !(players && i.layer === 'master')).map((i) => i.id)
  )
}

export function rotateSelection(delta: number) {
  const items = selectedItems().filter((i) => !i.locked)
  if (!items.length) return
  useDoc.getState().updateItems(items.map((i) => i.id), (it) => {
    it.rot = ((Math.round(it.rot / 90) * 90 + delta) % 360 + 360) % 360
  })
}

export function flipSelection(axis: 'x' | 'y') {
  const items = selectedItems().filter((i) => !i.locked)
  if (!items.length) return
  useDoc.getState().updateItems(items.map((i) => i.id), (it) => {
    if (axis === 'x') it.flipX = !it.flipX
    else it.flipY = !it.flipY
  })
}

export function nudgeSelection(dx: number, dy: number) {
  const items = selectedItems().filter((i) => !i.locked)
  if (!items.length) return
  useDoc.getState().updateItems(items.map((i) => i.id), (it) => {
    it.x += dx
    it.y += dy
  })
}

export function setItemText(id: string, patch: { text?: string; fontSize?: number; bold?: boolean }) {
  useDoc.getState().change((d) => {
    const it = d.items.find((i) => i.id === id)
    if (!it) return
    Object.assign(it, patch)
    if (it.kind === 'text') {
      const m = measureText(it.text ?? '', it.fontSize ?? 0.4, !!it.bold)
      it.w = m.w
      it.h = m.h
    }
  })
}

/** Sposta nell'ordine di sovrapposizione: 'front' / 'back' / 'up' / 'down'. */
export function reorderSelection(where: 'front' | 'back' | 'up' | 'down') {
  const ids = new Set(useUI.getState().selection)
  if (!ids.size) return
  useDoc.getState().change((d) => {
    const picked = d.items.filter((i) => ids.has(i.id))
    const rest = d.items.filter((i) => !ids.has(i.id))
    if (where === 'front') d.items = [...rest, ...picked]
    else if (where === 'back') d.items = [...picked, ...rest]
    else {
      const arr = [...d.items]
      if (where === 'up') {
        for (let i = arr.length - 2; i >= 0; i--) if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
      } else {
        for (let i = 1; i < arr.length; i++) if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
      }
      d.items = arr
    }
  })
}

export function moveSelectionToLayer(layer: MapItem['layer']) {
  const items = selectedItems()
  if (!items.length) return
  useDoc.getState().updateItems(items.map((i) => i.id), { layer })
  useUI.getState().showToast(`Spostato sul livello "${LAYER_NAMES[layer]}"`)
}

// ------------------------------------------------------------------ vista

export function zoomBy(factor: number) {
  const ui = useUI.getState()
  const el = document.querySelector('.canvas-wrap') as HTMLElement | null
  const cx = (el?.clientWidth ?? 800) / 2
  const cy = (el?.clientHeight ?? 600) / 2
  const nz = Math.max(0.08, Math.min(4, ui.zoom * factor))
  const wx = (cx - ui.panX) / ui.zoom
  const wy = (cy - ui.panY) / ui.zoom
  ui.setView(nz, cx - wx * nz, cy - wy * nz)
}

export function toggleGrid() {
  useDoc.getState().change((d) => { d.grid.visible = !d.grid.visible })
}

// ------------------------------------------------------------------ salvataggio automatico

/** Salva in silenzio: nel file del progetto se esiste, altrimenti in un file di recupero. */
export async function autosave(): Promise<void> {
  const a = api()
  if (!a) return
  const { doc, assets, filePath, dirty } = useDoc.getState()
  if (!dirty) return
  try {
    const bytes = serializeProject(doc, assets)
    if (filePath) {
      await a.writeFile(filePath, bytes)
      useDoc.getState().markSaved()
    } else {
      await a.writeRecovery(bytes)
    }
  } catch (e) {
    console.warn('Salvataggio automatico non riuscito', e)
  }
}

// ------------------------------------------------------------------ elenco azioni (menu e scorciatoie)

const typingTarget = (): HTMLInputElement | HTMLTextAreaElement | null => {
  const el = document.activeElement as HTMLElement | null
  if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'color', 'button'].includes((el as HTMLInputElement).type)))) {
    return el as HTMLInputElement
  }
  return null
}

export const ACTIONS: Record<string, () => void> = {
  'file.new': () => useUI.getState().openDialog('newmap'),
  'file.open': () => { void openProject() },
  'file.save': () => { void saveProject() },
  'file.saveAs': () => { void saveProject(true) },
  'file.export': () => useUI.getState().openDialog('export'),
  'file.settings': () => useUI.getState().openDialog('mapsettings'),
  'file.generator': () => useUI.getState().openDialog('generator'),
  'file.paperTokens': () => useUI.getState().openDialog('paperToken'),
  'file.importImages': () => { void import('./io/importFlow').then((m) => m.importImagesFromDialog()) },
  'edit.undo': () => (typingTarget() ? document.execCommand('undo') : undo()),
  'edit.redo': () => (typingTarget() ? document.execCommand('redo') : redo()),
  'edit.cut': () => (typingTarget() ? document.execCommand('cut') : cutSelection()),
  'edit.copy': () => (typingTarget() ? document.execCommand('copy') : copySelection()),
  'edit.paste': () => (typingTarget() ? document.execCommand('paste') : pasteClipboard()),
  'edit.selectAll': () => (typingTarget() ? document.execCommand('selectAll') : selectAll()),
  'edit.duplicate': duplicateSelection,
  'edit.delete': deleteSelection,
  'view.zoomIn': () => zoomBy(1.25),
  'view.zoomOut': () => zoomBy(1 / 1.25),
  'view.fit': () => useUI.getState().requestFit(),
  'view.grid': toggleGrid,
  'view.snap': () => useUI.getState().toggleSnap(),
  'help.shortcuts': () => useUI.getState().openDialog('shortcuts'),
  'help.about': () => useUI.getState().openDialog('about')
}

export function runAction(id: string) {
  ACTIONS[id]?.()
}
