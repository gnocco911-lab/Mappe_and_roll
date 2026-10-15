// Pannello "Proprietà": modifica dell'elemento (o degli elementi) selezionati.
import { useEffect, useRef } from 'react'
import { LAYER_NAMES, type ItemLayer, type MapItem } from '../types'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { ELEMENT_BY_ID } from '../elements/registry'
import {
  deleteSelection, duplicateSelection, flipSelection, moveSelectionToLayer, reorderSelection, rotateSelection, selectedItems, setItemText
} from '../actions'
import { Icon } from './Icons'
import { ColorInput, NumInput, Toggle } from './controls'
import { AssetThumb } from './LibraryPanel'

function itemName(it: MapItem, assets: Record<string, { name: string }>): string {
  if (it.kind === 'builtin') return ELEMENT_BY_ID[it.ref ?? '']?.name ?? 'Elemento'
  if (it.kind === 'custom') return assets[it.ref ?? '']?.name ?? 'Immagine'
  return it.kind === 'text' ? (it.layer === 'master' ? 'Nota del Master' : 'Testo') : it.kind === 'arrow' ? 'Freccia' : 'Numero stanza'
}

export function PropertiesPanel() {
  const selection = useUI((s) => s.selection)
  const focusTick = useUI((s) => s.focusTextTick)
  const doc = useDoc((s) => s.doc)
  const assets = useDoc((s) => s.assets)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const items = selection.map((id) => doc.items.find((i) => i.id === id)).filter(Boolean) as MapItem[]
  const it = items.length === 1 ? items[0] : null

  useEffect(() => {
    if (focusTick > 0) setTimeout(() => { textRef.current?.focus(); textRef.current?.select() }, 30)
  }, [focusTick])

  if (!items.length) {
    return (
      <div className="panel-section">
        <h4>Proprietà</h4>
        <p className="hint">Seleziona un elemento sulla mappa per modificarne posizione, dimensione, rotazione, colore e livello.</p>
      </div>
    )
  }

  const upd = (patch: Partial<MapItem>) => useDoc.getState().updateItems(items.map((i) => i.id), patch)
  const colorable =
    it && (it.kind === 'text' || it.kind === 'number' || it.kind === 'arrow' || (it.kind === 'builtin' && ELEMENT_BY_ID[it.ref ?? '']?.colorable))
  const hasText = it && (it.kind === 'text' || it.kind === 'number' || it.ref === 'token')
  const allLocked = items.every((i) => i.locked)

  return (
    <div className="panel-section props" data-testid="props">
      <h4>
        {it ? itemName(it, assets) : `${items.length} elementi selezionati`}
        {it?.kind === 'custom' && assets[it.ref ?? ''] && <span className="thumb-inline"><AssetThumb asset={assets[it.ref!]} size={28} /></span>}
      </h4>

      {it && hasText && (
        <div className="field">
          <label>{it.kind === 'text' ? 'Testo' : 'Numero / etichetta'}</label>
          <textarea
            ref={textRef}
            rows={it.kind === 'text' ? 3 : 1}
            value={it.text ?? ''}
            onChange={(e) => setItemText(it.id, { text: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            data-testid="prop-text"
          />
        </div>
      )}
      {it?.kind === 'text' && (
        <div className="field row">
          <label>Dimensione testo</label>
          <NumInput value={it.fontSize ?? 0.4} min={0.15} max={3} step={0.05} onCommit={(v) => setItemText(it.id, { fontSize: v })} />
          <Toggle checked={!!it.bold} onChange={(v) => setItemText(it.id, { bold: v })} label="Grassetto" />
        </div>
      )}

      {it && (
        <div className="grid2">
          <div className="field"><label>X (caselle)</label><NumInput value={it.x} step={0.5} onCommit={(v) => upd({ x: v })} /></div>
          <div className="field"><label>Y (caselle)</label><NumInput value={it.y} step={0.5} onCommit={(v) => upd({ y: v })} /></div>
          {it.kind !== 'text' && (
            <>
              <div className="field"><label>Larghezza</label><NumInput value={it.w} min={0.1} step={0.5} onCommit={(v) => upd({ w: v })} title="Dimensione in caselle: es. 2 = creatura Grande" /></div>
              <div className="field"><label>Altezza</label><NumInput value={it.h} min={0.1} step={0.5} disabled={it.kind === 'arrow'} onCommit={(v) => upd({ h: v })} /></div>
            </>
          )}
          <div className="field"><label>Rotazione (°)</label><NumInput value={it.rot} step={15} decimals={1} onCommit={(v) => upd({ rot: ((v % 360) + 360) % 360 })} /></div>
        </div>
      )}

      <div className="btn-row">
        <button className="icon-btn" title="Ruota di 90° a sinistra" onClick={() => rotateSelection(-90)} data-testid="rot-left"><Icon name="rotateL" size={17} /></button>
        <button className="icon-btn" title="Ruota di 90° a destra" onClick={() => rotateSelection(90)} data-testid="rot-right"><Icon name="rotateR" size={17} /></button>
        <button className="icon-btn" title="Ribalta orizzontalmente" onClick={() => flipSelection('x')}><Icon name="flipH" size={17} /></button>
        <button className="icon-btn" title="Ribalta verticalmente" onClick={() => flipSelection('y')}><Icon name="flipV" size={17} /></button>
        <button className="icon-btn" title="Duplica (Ctrl+D)" onClick={duplicateSelection} data-testid="btn-duplicate"><Icon name="copy" size={17} /></button>
        <button className={'icon-btn' + (allLocked ? ' active' : '')} title={allLocked ? 'Sblocca' : 'Blocca: non si potrà più spostare per sbaglio'} onClick={() => upd({ locked: !allLocked })} data-testid="btn-lock"><Icon name={allLocked ? 'lock' : 'unlock'} size={17} /></button>
        <button className="icon-btn danger" title="Elimina (Canc)" onClick={deleteSelection}><Icon name="trash" size={17} /></button>
      </div>

      {colorable && it && (
        <div className="field row">
          <label>Colore</label>
          <ColorInput
            value={it.color || (it.kind === 'builtin' ? ELEMENT_BY_ID[it.ref ?? '']?.color : it.kind === 'arrow' ? '#b3261e' : it.kind === 'number' ? '#fff8e6' : it.layer === 'master' ? '#4a2c00' : '#1c1612') || '#888888'}
            onCommit={(c) => upd({ color: c })}
          />
          {it.color && <button className="link" onClick={() => upd({ color: undefined })}>ripristina</button>}
        </div>
      )}

      <div className="field row">
        <label>Livello</label>
        <select value={it ? it.layer : ''} onChange={(e) => moveSelectionToLayer(e.target.value as ItemLayer)}>
          {it ? null : <option value="">—</option>}
          {(['objects', 'tokens', 'master'] as ItemLayer[]).map((l) => <option key={l} value={l}>{LAYER_NAMES[l]}</option>)}
        </select>
      </div>
      <div className="btn-row">
        <button className="small" onClick={() => reorderSelection('front')} title="Porta in primo piano"><Icon name="front" size={14} /> Davanti</button>
        <button className="small" onClick={() => reorderSelection('up')}>▲</button>
        <button className="small" onClick={() => reorderSelection('down')}>▼</button>
        <button className="small" onClick={() => reorderSelection('back')} title="Porta sullo sfondo"><Icon name="back" size={14} /> Dietro</button>
      </div>
      <p className="hint">{selectedItems().length > 1 ? 'Le modifiche si applicano a tutti gli elementi selezionati.' : 'Trascina le maniglie sulla mappa per ridimensionare e ruotare.'}</p>
    </div>
  )
}
