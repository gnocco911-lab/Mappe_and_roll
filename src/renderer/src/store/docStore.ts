// Stato del documento (mappa) con cronologia illimitata di annulla/ripeti.
// Ogni modifica crea una nuova versione "immutabile" del documento (con immer):
// le versioni precedenti condividono la memoria, quindi la cronologia resta leggera.
import { create } from 'zustand'
import { produce, type Draft } from 'immer'
import type { CustomAsset, MapDoc, MapItem } from '../types'
import { newDoc, uid } from '../core/defaults'

interface DocState {
  doc: MapDoc
  past: MapDoc[]
  future: MapDoc[]
  /** immagini personalizzate usate dal progetto (salvate dentro il file) */
  assets: Record<string, CustomAsset>
  /** incrementato a ogni modifica delle immagini (per ridisegnare) */
  assetsRev: number
  filePath: string | null
  dirty: boolean

  /** Modifica annullabile in un solo passo. */
  change: (fn: (d: Draft<MapDoc>) => void) => void
  /** Modifica senza cronologia (solo dentro un gesto: vedi beginGesture). */
  live: (fn: (d: Draft<MapDoc>) => void) => void
  beginGesture: () => void
  endGesture: () => void
  undo: () => void
  redo: () => void
  /** Sostituisce il documento (nuovo / apri): azzera la cronologia. */
  load: (doc: MapDoc, assets?: Record<string, CustomAsset>, filePath?: string | null) => void
  addAsset: (a: CustomAsset) => void
  setFilePath: (p: string | null) => void
  markSaved: () => void

  addItems: (items: MapItem[]) => void
  updateItems: (ids: string[], patch: Partial<MapItem> | ((it: Draft<MapItem>) => void)) => void
  removeItems: (ids: string[]) => void
}

// Stato del gesto corrente (fuori dallo store: non serve ridisegnare per questo).
let gestureSnapshot: MapDoc | null = null
let gestureActive = false

export const useDoc = create<DocState>((set, get) => ({
  doc: newDoc(),
  past: [],
  future: [],
  assets: {},
  assetsRev: 0,
  filePath: null,
  dirty: false,

  change: (fn) =>
    set((s) => {
      const next = produce(s.doc, fn)
      if (next === s.doc) return s
      return { doc: next, past: [...s.past, s.doc], future: [], dirty: true }
    }),

  beginGesture: () => {
    gestureActive = true
    gestureSnapshot = get().doc
  },

  live: (fn) =>
    set((s) => {
      const next = produce(s.doc, fn)
      if (next === s.doc) return s
      if (gestureActive && gestureSnapshot) {
        const snap = gestureSnapshot
        gestureSnapshot = null
        return { doc: next, past: [...s.past, snap], future: [], dirty: true }
      }
      if (gestureActive) return { doc: next, dirty: true }
      return { doc: next, past: [...s.past, s.doc], future: [], dirty: true }
    }),

  endGesture: () => {
    gestureActive = false
    gestureSnapshot = null
  },

  undo: () =>
    set((s) => {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      return { doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future], dirty: true }
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s
      const next = s.future[0]
      return { doc: next, past: [...s.past, s.doc], future: s.future.slice(1), dirty: true }
    }),

  load: (doc, assets = {}, filePath = null) => {
    gestureActive = false
    gestureSnapshot = null
    set((s) => ({ doc, past: [], future: [], assets, assetsRev: s.assetsRev + 1, filePath, dirty: false }))
  },

  addAsset: (a) => set((s) => ({ assets: { ...s.assets, [a.id]: a }, assetsRev: s.assetsRev + 1 })),
  setFilePath: (p) => set({ filePath: p }),
  markSaved: () => set({ dirty: false }),

  addItems: (items) =>
    get().change((d) => {
      for (const it of items) d.items.push(it as Draft<MapItem>)
    }),

  updateItems: (ids, patch) => {
    const set_ = new Set(ids)
    get().change((d) => {
      for (const it of d.items) {
        if (!set_.has(it.id)) continue
        if (typeof patch === 'function') patch(it)
        else Object.assign(it, patch)
      }
    })
  },

  removeItems: (ids) => {
    const set_ = new Set(ids)
    get().change((d) => {
      d.items = d.items.filter((it) => !set_.has(it.id))
    })
  }
}))

/** Copia di elementi con nuovi id (per duplica / incolla). */
export function cloneItems(items: MapItem[], dx = 0, dy = 0): MapItem[] {
  return items.map((it) => ({ ...it, id: uid('o'), x: it.x + dx, y: it.y + dy }))
}
