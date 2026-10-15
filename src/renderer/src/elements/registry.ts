// Registro di tutti gli elementi integrati e funzioni per disegnarli (anche in miniatura).
import type { ItemLayer, MapItem, InkMode } from '../types'
import type { DrawFn } from './draw'
import { FURNITURE } from './furniture'
import { DUNGEON } from './dungeon'
import { NATURE } from './nature'
import { LIGHTS } from './lights'
import { TRAPS } from './traps'
import { TOKENS } from './tokens'

export type Category = 'Arredi' | 'Dungeon' | 'Natura' | 'Luci' | 'Trappole' | 'Segnalini'
export const CATEGORIES: Category[] = ['Arredi', 'Dungeon', 'Natura', 'Luci', 'Trappole', 'Segnalini']

export interface ElementDef {
  id: string
  name: string
  category: Category
  tags: string[]
  /** dimensione predefinita in caselle */
  w: number
  h: number
  /** si può ricolorare */
  colorable: boolean
  color: string
  /** livello in cui viene inserito (predefinito: oggetti) */
  layer?: ItemLayer
  draw: DrawFn
}

export const ELEMENTS: ElementDef[] = [...FURNITURE, ...DUNGEON, ...NATURE, ...LIGHTS, ...TRAPS, ...TOKENS]
export const ELEMENT_BY_ID: Record<string, ElementDef> = Object.fromEntries(ELEMENTS.map((e) => [e.id, e]))

/**
 * Disegna un elemento integrato dentro un riquadro di wpx x hpx (pixel di mondo, 100 = 1 casella).
 * Il disegno è definito per la dimensione predefinita e viene scalato.
 */
export function drawBuiltin(
  g: CanvasRenderingContext2D, def: ElementDef, item: Pick<MapItem, 'color' | 'text' | 'flipX' | 'flipY'>,
  wpx: number, hpx: number, ink: InkMode = 'color'
) {
  const dw = def.w * 100
  const dh = def.h * 100
  g.save()
  g.translate(wpx / 2, hpx / 2)
  g.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1)
  g.translate(-wpx / 2, -hpx / 2)
  g.scale(wpx / dw, hpx / dh)
  def.draw(g, { w: dw, h: dh, c: item.color || def.color, text: item.text, ink })
  g.restore()
}

const thumbCache = new Map<string, string>()

/** Miniatura (data URL) di un elemento integrato, per il pannello della libreria. */
export function getElementThumb(def: ElementDef, size = 64): string {
  const key = `${def.id}:${size}`
  let t = thumbCache.get(key)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const pad = def.id === 'token' ? 2 : 4
  const s = Math.min((size - pad * 2) / (def.w * 100), (size - pad * 2) / (def.h * 100))
  g.translate(size / 2, size / 2)
  g.scale(s, s)
  g.translate(-(def.w * 50), -(def.h * 50))
  drawBuiltin(g, def, { color: undefined, text: def.id === 'token' ? '1' : undefined, flipX: false, flipY: false }, def.w * 100, def.h * 100, 'light')
  t = c.toDataURL('image/png')
  thumbCache.set(key, t)
  return t
}
