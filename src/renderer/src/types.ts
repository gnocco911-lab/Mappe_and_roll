// Tipi condivisi: descrivono tutto ciò che sta dentro un progetto (mappa).
// Le coordinate sono SEMPRE espresse in "caselle" (1 casella = 1,5 m = 2,54 cm in stampa).

/** Livelli della mappa, dal più basso al più alto. */
export type LayerId = 'terrain' | 'walls' | 'objects' | 'tokens' | 'master'
export const LAYER_ORDER: LayerId[] = ['terrain', 'walls', 'objects', 'tokens', 'master']
export const LAYER_NAMES: Record<LayerId, string> = {
  terrain: 'Terreno',
  walls: 'Muri',
  objects: 'Oggetti',
  tokens: 'Token',
  master: 'Note del Master'
}

export type GridType = 'square' | 'hex'

/** Tipi di "bordo" della griglia: muro, porte, finestre... */
export type WallKind = 'wall' | 'door' | 'locked' | 'secret' | 'window' | 'grate' | 'passage'
export const WALL_NAMES: Record<WallKind, string> = {
  wall: 'Muro',
  door: 'Porta',
  locked: 'Porta chiusa a chiave',
  secret: 'Porta segreta',
  window: 'Finestra',
  grate: 'Grata',
  passage: 'Passaggio'
}

export interface GridSettings {
  visible: boolean
  color: string
  /** spessore in pixel di mappa (100 px = 1 casella) */
  width: number
  opacity: number
}

export interface LayerState {
  visible: boolean
  locked: boolean
}

/** Tipi di elemento posizionabile. I token sono elementi integrati con ref "token". */
export type ItemKind = 'builtin' | 'custom' | 'text' | 'arrow' | 'number'
export type ItemLayer = 'objects' | 'tokens' | 'master'

export interface MapItem {
  id: string
  kind: ItemKind
  layer: ItemLayer
  /** id dell'elemento integrato oppure id dell'immagine personalizzata */
  ref?: string
  /** centro dell'elemento, in caselle */
  x: number
  y: number
  /** dimensione in caselle */
  w: number
  h: number
  /** rotazione in gradi */
  rot: number
  flipX: boolean
  flipY: boolean
  /** colore principale (ricolorazione) */
  color?: string
  /** testo (etichette, numeri, token) */
  text?: string
  fontSize?: number
  bold?: boolean
  locked: boolean
}

export interface MapDoc {
  version: number
  id: string
  name: string
  cols: number
  rows: number
  gridType: GridType
  background: string
  grid: GridSettings
  layers: Record<LayerId, LayerState>
  /** "c,r" -> id texture */
  floors: Record<string, string>
  /** chiave del bordo -> tipo */
  walls: Record<string, WallKind>
  /** ordine = ordine di sovrapposizione */
  items: MapItem[]
}

/** Immagine importata dall'utente, usata come elemento. */
export interface CustomAsset {
  id: string
  name: string
  category: string
  tags: string[]
  mime: string
  /** contenuto dell'immagine come data URL */
  dataUrl: string
  /** dimensione predefinita in caselle */
  wCells: number
  hCells: number
  /** colore reso trasparente (es. "#ffffff") oppure null */
  keyColor: string | null
  /** tolleranza 0-100 */
  tolerance: number
  /** true = rende trasparente solo lo sfondo collegato ai bordi (non i colori simili all'interno) */
  keyEdge?: boolean
}

export type ViewMode = 'master' | 'players'
export type InkMode = 'color' | 'light' | 'bw'

export const CELL = 100 // pixel di "mondo" per casella (solo rappresentazione interna)
