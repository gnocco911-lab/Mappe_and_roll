// Finestre di dialogo semplici: conferma, nuova mappa, impostazioni mappa, scorciatoie, informazioni.
import { useState } from 'react'
import { useConfirm } from '../store/confirmStore'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { newDoc } from '../core/defaults'
import { TEMPLATES } from '../core/templates'
import { loadDocument, confirmDiscard } from '../actions'
import type { GridType } from '../types'
import { Modal } from './Modal'
import { ColorInput, NumInput } from './controls'

export function ConfirmHost() {
  const req = useConfirm((s) => s.req)
  const answer = useConfirm((s) => s.answer)
  if (!req) return null
  const cancelId = req.buttons.find((b) => b.id === 'cancel' || b.id === 'no')?.id ?? req.buttons[req.buttons.length - 1].id
  return (
    <Modal title={req.title} onClose={() => answer(cancelId)} width={440}
      footer={req.buttons.map((b) => (
        <button key={b.id} className={'btn ' + (b.kind ?? 'normal')} onClick={() => answer(b.id)} autoFocus={b.kind === 'primary'}>{b.label}</button>
      ))}>
      <p>{req.message}</p>
    </Modal>
  )
}

const TEMPLATE_ICONS: Record<string, string> = { vuota: '▢', stanza: '🏛', caverna: '⛰', taverna: '🍺', foresta: '🌲', strada: '🛤' }

export function NewMapDialog() {
  const close = () => useUI.getState().openDialog(null)
  const [tpl, setTpl] = useState('stanza')
  const [cols, setCols] = useState(30)
  const [rows, setRows] = useState(20)
  const [grid, setGrid] = useState<GridType>('square')
  const [name, setName] = useState('')
  const t = TEMPLATES.find((x) => x.id === tpl)!
  const blank = tpl === 'vuota'

  const create = async () => {
    if (!(await confirmDiscard())) return
    let doc = t.build()
    if (blank) doc = newDoc({ cols, rows, gridType: grid, name: name || 'Nuova mappa' })
    else if (name) doc.name = name
    if (!blank && grid === 'hex') useUI.getState().showToast('I modelli sono per griglia quadrata: usa "Mappa vuota" per una griglia esagonale.')
    loadDocument(doc)
    close()
  }

  return (
    <Modal title="Nuova mappa" onClose={close} width={640}
      footer={<><button className="btn" onClick={close}>Annulla</button><button className="btn primary" onClick={create} data-testid="create-map">Crea mappa</button></>}>
      <div className="tpl-grid">
        {TEMPLATES.map((x) => (
          <button key={x.id} className={'tpl' + (tpl === x.id ? ' active' : '')} onClick={() => setTpl(x.id)} data-testid={`tpl-${x.id}`}>
            <span className="tpl-icon">{TEMPLATE_ICONS[x.id]}</span>
            <b>{x.name}</b>
            <small>{x.description}</small>
          </button>
        ))}
      </div>
      <div className="form-grid">
        <label>Nome</label>
        <input value={name} placeholder={t.name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        {blank && (
          <>
            <label>Dimensione (caselle)</label>
            <div className="row">
              <NumInput value={cols} min={4} max={200} step={1} decimals={0} onCommit={setCols} /> ×
              <NumInput value={rows} min={4} max={200} step={1} decimals={0} onCommit={setRows} />
              <span className="hint">es. 30×20 = 45×30 m = 76×51 cm in stampa</span>
            </div>
            <label>Griglia</label>
            <div className="seg">
              <button className={grid === 'square' ? 'active' : ''} onClick={() => setGrid('square')}>Quadrata</button>
              <button className={grid === 'hex' ? 'active' : ''} onClick={() => setGrid('hex')}>Esagonale</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export function MapSettingsDialog() {
  const close = () => useUI.getState().openDialog(null)
  const doc = useDoc((s) => s.doc)
  const change = useDoc((s) => s.change)
  return (
    <Modal title="Impostazioni mappa" onClose={close} width={520} footer={<button className="btn primary" onClick={close}>Fatto</button>}>
      <div className="form-grid">
        <label>Nome</label>
        <input value={doc.name} onChange={(e) => change((d) => { d.name = e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
        <label>Dimensione (caselle)</label>
        <div className="row">
          <NumInput value={doc.cols} min={2} max={300} step={1} decimals={0} onCommit={(v) => change((d) => { d.cols = Math.round(v) })} /> ×
          <NumInput value={doc.rows} min={2} max={300} step={1} decimals={0} onCommit={(v) => change((d) => { d.rows = Math.round(v) })} />
          <span className="hint">{(doc.cols * 1.5).toLocaleString('it-IT')} × {(doc.rows * 1.5).toLocaleString('it-IT')} m · {(doc.cols * 2.54).toFixed(1).replace('.', ',')} × {(doc.rows * 2.54).toFixed(1).replace('.', ',')} cm in stampa</span>
        </div>
        <label>Tipo di griglia</label>
        <div className="seg">
          <button className={doc.gridType === 'square' ? 'active' : ''} onClick={() => doc.gridType !== 'square' && change((d) => { d.gridType = 'square'; d.walls = {} })}>Quadrata</button>
          <button className={doc.gridType === 'hex' ? 'active' : ''} onClick={() => doc.gridType !== 'hex' && change((d) => { d.gridType = 'hex'; d.walls = {} })}>Esagonale</button>
        </div>
        <label />
        <span className="hint">Cambiando tipo di griglia i muri già disegnati vengono rimossi (annullabile).</span>
        <label>Griglia visibile</label>
        <input type="checkbox" checked={doc.grid.visible} onChange={(e) => change((d) => { d.grid.visible = e.target.checked })} />
        <label>Colore griglia</label>
        <ColorInput value={doc.grid.color} onCommit={(c) => change((d) => { d.grid.color = c })} />
        <label>Spessore linee</label>
        <div className="row">
          <input type="range" min={0.5} max={6} step={0.25} value={doc.grid.width} onChange={(e) => change((d) => { d.grid.width = Number(e.target.value) })} />
          <span className="hint">{doc.grid.width.toFixed(2).replace('.', ',')}</span>
        </div>
        <label>Opacità griglia</label>
        <div className="row">
          <input type="range" min={0.05} max={1} step={0.05} value={doc.grid.opacity} onChange={(e) => change((d) => { d.grid.opacity = Number(e.target.value) })} />
          <span className="hint">{Math.round(doc.grid.opacity * 100)}%</span>
        </div>
        <label>Sfondo</label>
        <ColorInput value={doc.background} onCommit={(c) => change((d) => { d.background = c })} />
      </div>
      <p className="hint scale-note">Scala: 1 casella = 1,5 m (5 ft) = 2,54 cm in stampa, adatta a miniature da 25–28 mm.</p>
    </Modal>
  )
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl/⌘ + N', 'Nuova mappa'], ['Ctrl/⌘ + O', 'Apri'], ['Ctrl/⌘ + S', 'Salva'], ['Ctrl/⌘ + Maiusc + S', 'Salva con nome'],
  ['Ctrl/⌘ + E', 'Esporta / stampa'], ['Ctrl/⌘ + Z', 'Annulla'], ['Ctrl/⌘ + Maiusc + Z  o  Ctrl + Y', 'Ripeti'],
  ['Ctrl/⌘ + C / X / V', 'Copia / taglia / incolla'], ['Ctrl/⌘ + D', 'Duplica'], ['Ctrl/⌘ + A', 'Seleziona tutto'],
  ['Canc / Backspace', 'Elimina la selezione'], ['Frecce', 'Sposta di 1 casella (Maiusc: 0,1)'],
  ['[  e  ]', 'Ruota di 90° a sinistra / destra'], ['Maiusc + H / V', 'Ribalta orizzontale / verticale'],
  ['Spazio + trascina', 'Sposta la vista'], ['Rotellina', 'Zoom'], ['Ctrl/⌘ + 0', 'Adatta alla finestra'], ['Ctrl/⌘ + + / −', 'Zoom'],
  ['G', 'Mostra/nascondi griglia'], ['Esc', 'Annulla l\'operazione / torna alla selezione'],
  ['V · H', 'Selezione · Mano'], ['B · F · R · P · E', 'Pennello · Secchiello · Rettangolo · Poligono · Gomma'],
  ['W · Q · D · X', 'Muro · Stanza · Porte/finestre · Gomma muri'], ['T · M · A · N', 'Testo · Nota Master · Freccia · Numero stanza']
]

export function ShortcutsDialog() {
  const close = () => useUI.getState().openDialog(null)
  return (
    <Modal title="Scorciatoie da tastiera" onClose={close} width={560} footer={<button className="btn primary" onClick={close}>Chiudi</button>}>
      <table className="kbd-table"><tbody>
        {SHORTCUTS.map(([k, d]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>)}
      </tbody></table>
    </Modal>
  )
}

export function AboutDialog() {
  const close = () => useUI.getState().openDialog(null)
  return (
    <Modal title="Mappe di Battaglia D&D" onClose={close} width={520} footer={<button className="btn primary" onClick={close}>Chiudi</button>}>
      <p>Editor di mappe tattiche per Dungeons &amp; Dragons 5e, da stampare in scala reale e usare al tavolo con le miniature.</p>
      <ul className="plain">
        <li>1 casella = 1,5 m (5 ft) = 2,54 cm in stampa.</li>
        <li>Funziona completamente offline: nessun account, nessun abbonamento, nessuna chiamata a servizi online.</li>
        <li>Tutte le texture e gli elementi integrati sono generati dal programma: nessun problema di licenza.</li>
      </ul>
      <p className="hint">Software libero con licenza MIT. Costruito con Electron, React, Konva, pdf-lib, fflate, zustand e immer (tutti open source con licenza permissiva).</p>
    </Modal>
  )
}
