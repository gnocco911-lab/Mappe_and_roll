// Scorciatoie da tastiera. In Electron le combinazioni con Ctrl/⌘ sono gestite dal menu nativo
// (che richiama le stesse azioni); qui restano i tasti semplici e, nel browser, tutto il resto.
import { useEffect } from 'react'
import { ACTIONS, nudgeSelection, rotateSelection, flipSelection } from './actions'
import { useUI } from './store/uiStore'
import { isElectron } from './io/platform'
import { TOOL_KEYS } from './ui/Toolbar'
import { input } from './canvas/inputState'

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'color', 'button'].includes((el as HTMLInputElement).type)
}

export function useShortcuts() {
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      input.shift = e.shiftKey
      input.alt = e.altKey
      input.ctrl = e.ctrlKey || e.metaKey
      if (e.code === 'Space' && !isTyping(e.target)) {
        input.space = true
        e.preventDefault()
        return
      }
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      const ui = useUI.getState()

      if (mod) {
        if (isElectron()) return // gestito dal menu nativo
        const map: Record<string, string> = {
          n: 'file.new', o: 'file.open', s: e.shiftKey ? 'file.saveAs' : 'file.save', e: 'file.export',
          z: e.shiftKey ? 'edit.redo' : 'edit.undo', y: 'edit.redo', x: 'edit.cut', c: 'edit.copy', v: 'edit.paste',
          a: 'edit.selectAll', d: 'edit.duplicate', '0': 'view.fit', '+': 'view.zoomIn', '=': 'view.zoomIn', '-': 'view.zoomOut'
        }
        const id = map[k]
        if (id) {
          e.preventDefault()
          ACTIONS[id]()
        }
        return
      }
      if (e.altKey) return

      if (k === 'delete' || k === 'backspace') { e.preventDefault(); ACTIONS['edit.delete'](); return }
      if (k === 'escape') {
        if (ui.dialog) return
        if (ui.tool === 'select') ui.select([])
        else if (ui.tool !== 'poly') ui.setTool('select')
        return
      }
      if (k.startsWith('arrow') && ui.selection.length) {
        e.preventDefault()
        const step = e.shiftKey ? 0.1 : 1
        nudgeSelection(k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0)
        return
      }
      if (e.key === '[') { rotateSelection(-90); return }
      if (e.key === ']') { rotateSelection(90); return }
      if (e.shiftKey && k === 'h') { flipSelection('x'); return }
      if (e.shiftKey && k === 'v') { flipSelection('y'); return }
      if (k === 'g' && !e.shiftKey) { ACTIONS['view.grid'](); return }
      if (!e.shiftKey && TOOL_KEYS[k]) { ui.setTool(TOOL_KEYS[k]); return }
    }
    const onUp = (e: KeyboardEvent) => {
      input.shift = e.shiftKey
      input.alt = e.altKey
      input.ctrl = e.ctrlKey || e.metaKey
      if (e.code === 'Space') input.space = false
    }
    const onBlur = () => { input.space = input.shift = input.alt = input.ctrl = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
