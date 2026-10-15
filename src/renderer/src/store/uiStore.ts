// Stato dell'interfaccia: strumento attivo, selezione, zoom, opzioni dei pennelli, finestre aperte.
import { create } from 'zustand'
import type { MapItem, ViewMode, WallKind } from '../types'

export type ToolId =
  | 'select' | 'hand'
  | 'brush' | 'bucket' | 'rect' | 'poly' | 'floorErase'
  | 'wallLine' | 'wallRect' | 'wallErase' | 'opening'
  | 'text' | 'note' | 'arrow' | 'number'
  | 'place'

export type DialogId = 'export' | 'newmap' | 'mapsettings' | 'importImages' | 'shortcuts' | 'about' | 'libraryEdit' | 'confirmClose' | 'recover' | 'generator' | 'paperToken' | null

export interface PlacingRef {
  kind: 'builtin' | 'custom'
  ref: string
}

interface UIState {
  tool: ToolId
  setTool: (t: ToolId) => void

  selection: string[]
  select: (ids: string[]) => void

  // vista
  zoom: number
  panX: number
  panY: number
  setView: (zoom: number, panX: number, panY: number) => void
  snap: boolean
  toggleSnap: () => void
  /** rotazione libera o a scatti di 90° con la maniglia */
  rotSnap: boolean
  toggleRotSnap: () => void
  /** richiesta di "adatta alla finestra" */
  fitTick: number
  requestFit: () => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void

  // opzioni degli strumenti
  textureId: string
  setTexture: (id: string) => void
  brushSize: number
  setBrushSize: (n: number) => void
  openingKind: Exclude<WallKind, 'wall'>
  setOpeningKind: (k: Exclude<WallKind, 'wall'>) => void
  placing: PlacingRef | null
  setPlacing: (p: PlacingRef | null) => void
  tokenColor: string
  setTokenColor: (c: string) => void
  tokenSize: number
  setTokenSize: (n: number) => void
  nextTokenNumber: number
  setNextTokenNumber: (n: number) => void
  nextRoomNumber: number
  setNextRoomNumber: (n: number) => void

  // finestre
  dialog: DialogId
  openDialog: (d: DialogId) => void
  /** testo da mostrare brevemente in basso */
  toast: string | null
  showToast: (msg: string) => void
  /** elementi copiati */
  clipboard: MapItem[]
  setClipboard: (items: MapItem[]) => void
  /** richiesta di mettere a fuoco il campo di testo del pannello proprietà */
  focusTextTick: number
  requestTextFocus: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUI = create<UIState>((set) => ({
  tool: 'select',
  setTool: (tool) => set({ tool, ...(tool !== 'place' ? { placing: null } : {}) }),

  selection: [],
  select: (selection) => set({ selection }),

  zoom: 0.6,
  panX: 40,
  panY: 40,
  setView: (zoom, panX, panY) => set({ zoom, panX, panY }),
  snap: true,
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  rotSnap: false,
  toggleRotSnap: () => set((s) => ({ rotSnap: !s.rotSnap })),
  fitTick: 0,
  requestFit: () => set((s) => ({ fitTick: s.fitTick + 1 })),
  viewMode: 'master',
  setViewMode: (viewMode) => set({ viewMode }),

  textureId: 'pietra',
  setTexture: (textureId) => set((s) => ({ textureId, tool: ['brush', 'bucket', 'rect', 'poly'].includes(s.tool) ? s.tool : 'brush' })),
  brushSize: 1,
  setBrushSize: (brushSize) => set({ brushSize }),
  openingKind: 'door',
  setOpeningKind: (openingKind) => set({ openingKind, tool: 'opening' }),
  placing: null,
  setPlacing: (placing) => set({ placing, tool: placing ? 'place' : 'select' }),
  tokenColor: '#c0392b',
  setTokenColor: (tokenColor) => set({ tokenColor }),
  tokenSize: 1,
  setTokenSize: (tokenSize) => set({ tokenSize }),
  nextTokenNumber: 1,
  setNextTokenNumber: (nextTokenNumber) => set({ nextTokenNumber }),
  nextRoomNumber: 1,
  setNextRoomNumber: (nextRoomNumber) => set({ nextRoomNumber }),

  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  toast: null,
  showToast: (toast) => {
    set({ toast })
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 3500)
  },
  clipboard: [],
  setClipboard: (clipboard) => set({ clipboard }),
  focusTextTick: 0,
  requestTextFocus: () => set((s) => ({ focusTextTick: s.focusTextTick + 1 }))
}))
