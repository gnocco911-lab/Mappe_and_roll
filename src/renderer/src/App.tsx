// Finestra principale dell'applicazione.
import { useEffect, useState } from 'react'
import { useDoc } from './store/docStore'
import { useUI } from './store/uiStore'
import { MapCanvas } from './canvas/MapCanvas'
import { Toolbar } from './ui/Toolbar'
import { OptionsBar } from './ui/OptionsBar'
import { TerrainPanel } from './ui/TerrainPanel'
import { LibraryPanel } from './ui/LibraryPanel'
import { LayersPanel } from './ui/LayersPanel'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { AboutDialog, ConfirmHost, MapSettingsDialog, NewMapDialog, ShortcutsDialog } from './ui/Dialogs'
import { ImportDialog } from './ui/ImportDialog'
import { ExportDialog } from './ui/ExportDialog'
import { GeneratorDialog } from './ui/GeneratorDialog'
import { PaperTokenDialog } from './ui/PaperTokenDialog'
import { Icon } from './ui/Icons'
import { ACTIONS, autosave, confirmDiscard, openProjectBytes, redo, runAction, undo } from './actions'
import { useShortcuts } from './useShortcuts'
import { api } from './io/platform'
import { useLibrary } from './io/library'
import { startImport } from './io/importFlow'
import { filesFromDrop } from './io/importImages'
import { askConfirm } from './store/confirmStore'
import { getGrid } from './core/grid'

function TopBar() {
  const doc = useDoc((s) => s.doc)
  const dirty = useDoc((s) => s.dirty)
  const canUndo = useDoc((s) => s.past.length > 0)
  const canRedo = useDoc((s) => s.future.length > 0)
  const btn = (icon: string, label: string, id: string, extra = '') => (
    <button className={'top-btn ' + extra} onClick={() => runAction(id)} title={label} data-testid={`top-${id}`}>
      <Icon name={icon} size={18} /><span>{label}</span>
    </button>
  )
  return (
    <div className="topbar">
      <div className="brand">⚔ Mappe di Battaglia</div>
      {btn('new', 'Nuova', 'file.new')}
      {btn('open', 'Apri', 'file.open')}
      {btn('save', 'Salva', 'file.save')}
      {btn('dice', 'Genera', 'file.generator')}
      {btn('scissors', 'Token di carta', 'file.paperTokens')}
      {btn('print', 'Esporta / Stampa', 'file.export', 'accent')}
      <div className="sep" />
      <button className="top-btn" disabled={!canUndo} onClick={undo} title="Annulla (Ctrl+Z)" data-testid="top-undo"><Icon name="undo" size={18} /></button>
      <button className="top-btn" disabled={!canRedo} onClick={redo} title="Ripeti (Ctrl+Maiusc+Z)" data-testid="top-redo"><Icon name="redo" size={18} /></button>
      <div className="grow" />
      <button className="doc-title" onClick={() => runAction('file.settings')} title="Impostazioni della mappa (nome, dimensione, griglia)" data-testid="doc-title">
        {doc.name}{dirty ? ' •' : ''} <small>{doc.cols}×{doc.rows}</small>
      </button>
      <button className="top-btn" onClick={() => runAction('file.settings')} title="Impostazioni della mappa"><Icon name="settings" size={18} /></button>
      <button className="top-btn" onClick={() => runAction('help.shortcuts')} title="Scorciatoie da tastiera"><Icon name="help" size={18} /></button>
    </div>
  )
}

function StatusBar() {
  const doc = useDoc((s) => s.doc)
  const past = useDoc((s) => s.past.length)
  const sel = useUI((s) => s.selection.length)
  const g = getGrid(doc.gridType, doc.cols, doc.rows)
  return (
    <div className="statusbar">
      <span>Mappa {doc.cols}×{doc.rows} caselle ({(doc.cols * 1.5).toLocaleString('it-IT')}×{(doc.rows * 1.5).toLocaleString('it-IT')} m)</span>
      <span>In stampa: {(g.width * 2.54).toFixed(1).replace('.', ',')} × {(g.height * 2.54).toFixed(1).replace('.', ',')} cm</span>
      <span>1 casella = 1,5 m = 2,54 cm</span>
      <span className="grow" />
      {sel > 0 && <span>{sel} selezionat{sel === 1 ? 'o' : 'i'}</span>}
      <span>{past} passi annullabili</span>
    </div>
  )
}

export default function App() {
  const dialog = useUI((s) => s.dialog)
  const toast = useUI((s) => s.toast)
  const tool = useUI((s) => s.tool)
  const [leftTab, setLeftTab] = useState<'terrain' | 'library'>('terrain')
  const [dropping, setDropping] = useState(false)
  const doc = useDoc((s) => s.doc)
  const dirty = useDoc((s) => s.dirty)
  const filePath = useDoc((s) => s.filePath)

  useShortcuts()

  // libreria personale, recupero dopo chiusura imprevista, menu e chiusura finestra
  useEffect(() => {
    void useLibrary.getState().load()
    const a = api()
    if (a) {
      void a.readRecovery().then(async (bytes) => {
        if (!bytes) return
        const r = await askConfirm('Recupero', 'È stata trovata una mappa non salvata dell\'ultima sessione. Vuoi ripristinarla?', [
          { id: 'yes', label: 'Ripristina', kind: 'primary' }, { id: 'no', label: 'Elimina' }
        ])
        if (r === 'yes' && openProjectBytes(bytes, null)) useDoc.setState({ dirty: true })
        else void a.clearRecovery()
      })
    }
    const offMenu = a?.onMenu((id) => runAction(id))
    const offClose = a?.onBeforeClose(async () => {
      if (await confirmDiscard()) a.closeNow()
    })
    return () => { offMenu?.(); offClose?.() }
  }, [])

  // salvataggio automatico ogni 20 secondi
  useEffect(() => {
    const t = setInterval(() => { void autosave() }, 20000)
    return () => clearInterval(t)
  }, [])

  // titolo della finestra
  useEffect(() => {
    const title = `${doc.name}${dirty ? ' •' : ''} — Mappe di Battaglia D&D`
    document.title = title
    api()?.setTitle(title)
  }, [doc.name, dirty, filePath])

  // trascinamento di immagini o cartelle nella finestra; incolla immagini dagli appunti
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDropping(true) } }
    const leave = (e: DragEvent) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDropping(false) } }
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault() }
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDropping(false)
      const files = await filesFromDrop(e.dataTransfer!)
      if (!files.length) { useUI.getState().showToast('Nessuna immagine valida trovata (servono PNG, JPG, WebP o SVG)'); return }
      // un file .dndmap trascinato viene aperto
      await startImport(files)
    }
    const paste = async (e: ClipboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const imgs = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (!imgs.length) return
      e.preventDefault()
      await startImport(await Promise.all(imgs.map(async (f, i) => ({ name: f.name && f.name !== 'image.png' ? f.name : `Immagine incollata ${i + 1}.png`, data: new Uint8Array(await f.arrayBuffer()) }))))
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
      window.removeEventListener('paste', paste)
    }
  }, [])

  // quando si sceglie un elemento della libreria passa alla scheda giusta
  useEffect(() => { if (tool === 'place') setLeftTab('library') }, [tool])

  void ACTIONS

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <Toolbar />
        <aside className="side left">
          <div className="tabs big">
            <button className={leftTab === 'terrain' ? 'active' : ''} onClick={() => setLeftTab('terrain')} data-testid="tab-terrain">Terreno</button>
            <button className={leftTab === 'library' ? 'active' : ''} onClick={() => setLeftTab('library')} data-testid="tab-library">Libreria</button>
          </div>
          {leftTab === 'terrain' ? <TerrainPanel /> : <LibraryPanel />}
        </aside>
        <section className="center">
          <OptionsBar />
          <MapCanvas />
          {toast && <div className="toast" role="status">{toast}</div>}
        </section>
        <aside className="side right">
          <LayersPanel />
          <PropertiesPanel />
        </aside>
      </div>
      <StatusBar />
      {dropping && <div className="drop-overlay"><div>Rilascia qui le immagini o la cartella<br /><small>PNG, JPG, WebP, SVG</small></div></div>}
      {dialog === 'newmap' && <NewMapDialog />}
      {dialog === 'mapsettings' && <MapSettingsDialog />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'about' && <AboutDialog />}
      {dialog === 'export' && <ExportDialog />}
      {dialog === 'generator' && <GeneratorDialog />}
      {dialog === 'paperToken' && <PaperTokenDialog />}
      {(dialog === 'importImages' || dialog === 'libraryEdit') && <ImportDialog />}
      <ConfirmHost />
    </div>
  )
}
