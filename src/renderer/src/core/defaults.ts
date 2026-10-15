// Valori iniziali per un nuovo progetto.
import type { LayerId, LayerState, MapDoc, MapItem } from '../types'

export const DOC_VERSION = 1

export function uid(prefix = 'i'): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function defaultLayers(): Record<LayerId, LayerState> {
  return {
    terrain: { visible: true, locked: false },
    walls: { visible: true, locked: false },
    objects: { visible: true, locked: false },
    tokens: { visible: true, locked: false },
    master: { visible: true, locked: false }
  }
}

export function newDoc(partial: Partial<MapDoc> = {}): MapDoc {
  return {
    version: DOC_VERSION,
    id: uid('p'),
    name: 'Nuova mappa',
    cols: 30,
    rows: 20,
    gridType: 'square',
    background: '#f1ece0',
    grid: { visible: true, color: '#2e2820', width: 1.8, opacity: 0.55 },
    layers: defaultLayers(),
    floors: {},
    walls: {},
    items: [],
    ...partial
  }
}

export function newItem(partial: Partial<MapItem> & Pick<MapItem, 'kind' | 'layer'>): MapItem {
  return {
    id: uid('o'),
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    rot: 0,
    flipX: false,
    flipY: false,
    locked: false,
    ...partial
  }
}
