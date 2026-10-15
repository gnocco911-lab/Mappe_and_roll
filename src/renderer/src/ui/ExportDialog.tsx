// Finestra "Esporta / Stampa": scelta del formato, delle versioni, dell'inchiostro e anteprima.
import { useMemo, useState } from 'react'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { PAPERS, cellsToCm, type Orientation, type PaperId } from '../export/layout'
import {
  DEFAULT_SETTINGS, VERSION_SUFFIX, buildPreview, describePlan, exportVersion, type ExportKind, type ExportSettings, type Output, type PreviewPage
} from '../export/exporter'
import { PDF_FILTER, PNG_FILTER, saveMany } from '../io/platform'
import type { InkMode, ViewMode } from '../types'
import { Modal } from './Modal'
import { NumInput, Toggle } from './controls'

const KINDS: { id: ExportKind; title: string; text: string }[] = [
  { id: 'pdfTiled', title: 'PDF in scala reale su più fogli', text: 'Per le miniature: ogni casella misura 2,54 cm. Con segni di taglio, numerazione e schema di montaggio.' },
  { id: 'pdfFit', title: 'PDF su una sola pagina', text: 'La mappa intera ridotta per stare su un foglio (utile per consultazione e note).' },
  { id: 'pngFit', title: 'PNG su una sola pagina', text: 'Come sopra, ma come immagine (300 DPI).' },
  { id: 'pngHigh', title: 'PNG ad alta risoluzione (300 DPI)', text: 'Tutta la mappa in scala reale, per programmi di stampa o tavoli virtuali.' }
]

export function ExportDialog() {
  const close = () => useUI.getState().openDialog(null)
  const doc = useDoc((s) => s.doc)
  const [s, setS] = useState<ExportSettings>(() => ({ ...DEFAULT_SETTINGS, showGrid: doc.grid.visible }))
  const [busy, setBusy] = useState<{ f: number; text: string } | null>(null)
  const [preview, setPreview] = useState<{ version: ViewMode; pages: PreviewPage[] }[] | null>(null)
  const [zoomed, setZoomed] = useState<PreviewPage | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const set = (patch: Partial<ExportSettings>) => setS((o) => ({ ...o, ...patch }))

  const { plan, grid } = useMemo(() => describePlan(doc, s), [doc, s])
  const tiled = s.kind === 'pdfTiled'
  const fitOpts = s.kind === 'pdfFit' || s.kind === 'pngFit'
  const toggleVersion = (v: ViewMode) => {
    const has = s.versions.includes(v)
    if (has && s.versions.length === 1) return
    set({ versions: has ? s.versions.filter((x) => x !== v) : [...s.versions, v] })
  }
  const hasMaster = doc.items.some((i) => i.layer === 'master') || Object.values(doc.walls).includes('secret')

  const run = async () => {
    setMsg(null)
    setPreview(null)
    const { doc: d, assets } = useDoc.getState()
    const outs: Output[] = []
    try {
      const order = (['master', 'players'] as ViewMode[]).filter((v) => s.versions.includes(v))
      for (let i = 0; i < order.length; i++) {
        const o = await exportVersion(d, assets, order[i], s, (f, text) => setBusy({ f: (i + f) / order.length, text }))
        outs.push(o)
      }
      setBusy({ f: 1, text: 'Salvataggio…' })
      const png = s.kind === 'pngFit' || s.kind === 'pngHigh'
      const ext = png ? 'png' : 'pdf'
      const safe = d.name.replace(/[\\/:*?"<>|]+/g, '_') || 'mappa'
      const single = outs.length === 1
      const saved = await saveMany(
        safe, ext, [png ? PNG_FILTER : PDF_FILTER],
        outs.map((o) => ({ suffix: single && outs[0].version === 'master' && s.versions.length === 1 ? '' : VERSION_SUFFIX[o.version], data: o.bytes })),
        png ? 'image/png' : 'application/pdf'
      )
      setBusy(null)
      if (saved) {
        const notes = outs.map((o) => o.note).filter(Boolean)
        setMsg(`Esportazione completata (${saved.length} file).${notes.length ? ' ' + notes[0] : ''}`)
        useUI.getState().showToast('Esportazione completata')
      }
    } catch (e) {
      setBusy(null)
      setMsg('Errore durante l\'esportazione: ' + (e as Error).message)
    }
  }

  const doPreview = async () => {
    setMsg(null)
    setPreview(null)
    const { doc: d, assets } = useDoc.getState()
    try {
      const order = (['master', 'players'] as ViewMode[]).filter((v) => s.versions.includes(v))
      const all: { version: ViewMode; pages: PreviewPage[] }[] = []
      for (let i = 0; i < order.length; i++) {
        const pages = await buildPreview(d, assets, order[i], s, (f, text) => setBusy({ f: (i + f) / order.length, text: `Anteprima ${order[i] === 'master' ? 'Master' : 'Giocatori'}: ${text}` }))
        all.push({ version: order[i], pages })
      }
      setPreview(all)
    } catch (e) {
      setMsg('Errore nell\'anteprima: ' + (e as Error).message)
    }
    setBusy(null)
  }

  const cmW = cellsToCm(grid.width).toFixed(1).replace('.', ',')
  const cmH = cellsToCm(grid.height).toFixed(1).replace('.', ',')

  return (
    <Modal
      title="Esporta e stampa"
      onClose={busy ? () => undefined : close}
      width={820}
      footer={
        <>
          <button className="btn" onClick={close} disabled={!!busy}>Chiudi</button>
          <button className="btn" onClick={doPreview} disabled={!!busy} data-testid="btn-preview">Anteprima di stampa</button>
          <button className="btn primary" onClick={run} disabled={!!busy} data-testid="btn-export-run">Esporta…</button>
        </>
      }
    >
      <div className="export-layout">
        <div className="export-col">
          <h4>Formato</h4>
          {KINDS.map((k) => (
            <label key={k.id} className={'radio-card' + (s.kind === k.id ? ' active' : '')}>
              <input type="radio" name="kind" checked={s.kind === k.id} onChange={() => set({ kind: k.id })} data-testid={`kind-${k.id}`} />
              <span><b>{k.title}</b><small>{k.text}</small></span>
            </label>
          ))}
        </div>
        <div className="export-col">
          <h4>Versioni</h4>
          <div className="row wrap">
            <Toggle checked={s.versions.includes('master')} onChange={() => toggleVersion('master')} label="Master (completa)" title="Tutto: trappole, porte segrete e note" />
            <Toggle checked={s.versions.includes('players')} onChange={() => toggleVersion('players')} label="Giocatori" title="Senza il livello del Master; le porte segrete diventano muri" />
          </div>
          <p className="hint">
            {s.versions.length === 2 ? 'Verranno creati due file: *_master e *_giocatori.' : s.versions[0] === 'players' ? 'Versione per i giocatori: il livello del Master non è incluso.' : 'Versione completa per il Master.'}
            {!hasMaster && ' (Questa mappa non ha ancora trappole, note o porte segrete.)'}
          </p>

          <h4>Inchiostro</h4>
          <div className="seg">
            {([['color', 'Colori'], ['light', 'Risparmio (chiaro)'], ['bw', 'Bianco e nero']] as [InkMode, string][]).map(([id, l]) => (
              <button key={id} className={s.ink === id ? 'active' : ''} onClick={() => set({ ink: id })}>{l}</button>
            ))}
          </div>
          <Toggle checked={s.showGrid} onChange={(v) => set({ showGrid: v })} label="Includi la griglia" />

          {(tiled || fitOpts) && (
            <>
              <h4>Carta</h4>
              <div className="form-grid compact">
                <label>Formato</label>
                <select value={s.paper} onChange={(e) => set({ paper: e.target.value as PaperId })}>
                  {Object.entries(PAPERS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
                </select>
                <label>Orientamento</label>
                <select value={s.orientation} onChange={(e) => set({ orientation: e.target.value as Orientation })}>
                  <option value="auto">Automatico</option><option value="portrait">Verticale</option><option value="landscape">Orizzontale</option>
                </select>
                <label>Margine (mm)</label>
                <NumInput value={s.marginMm} min={tiled ? 8 : 0} max={30} step={1} decimals={0} onCommit={(v) => set({ marginMm: v })} title="Margine bianco su ogni lato; contiene segni di taglio e numeri" />
                {tiled && (
                  <>
                    <label>Sovrapposizione (mm)</label>
                    <NumInput value={s.overlapMm} min={0} max={30} step={1} decimals={0} onCommit={(v) => set({ overlapMm: v })} />
                    <label>Qualità (DPI)</label>
                    <select value={s.dpi} onChange={(e) => set({ dpi: Number(e.target.value) })}>
                      <option value={150}>150 (veloce)</option><option value={200}>200 (consigliata)</option><option value={300}>300 (massima)</option>
                    </select>
                  </>
                )}
              </div>
              {tiled && (
                <div className="col">
                  <Toggle checked={s.cropMarks} onChange={(v) => set({ cropMarks: v })} label="Segni di taglio" />
                  <Toggle checked={s.sheetNumbers} onChange={(v) => set({ sheetNumbers: v })} label="Numerazione dei fogli" />
                  <Toggle checked={s.assemblyPage} onChange={(v) => set({ assemblyPage: v })} label="Pagina con lo schema di montaggio" />
                </div>
              )}
            </>
          )}
          <div className="info-box">
            La mappa in scala reale misura <b>{cmW} × {cmH} cm</b>
            {tiled && <> e richiede <b>{plan.sheets.length} {plan.sheets.length === 1 ? 'foglio' : 'fogli'}</b> {s.paper} ({plan.cols} × {plan.rows}, {plan.portrait ? 'verticali' : 'orizzontali'}).</>}
            {s.kind === 'pngHigh' && <> → <b>{Math.round(grid.width * 300)} × {Math.round(grid.height * 300)} px</b>.</>}
          </div>
        </div>
      </div>

      {busy && (
        <div className="progress">
          <div className="bar"><div style={{ width: `${Math.round(busy.f * 100)}%` }} /></div>
          <span>{busy.text}</span>
        </div>
      )}
      {msg && <div className="info-box" data-testid="export-msg">{msg}</div>}

      {preview && (
        <div className="preview" data-testid="preview">
          {preview.map(({ version, pages }) => (
            <div key={version}>
              <h4>Anteprima — versione {version === 'master' ? 'Master' : 'Giocatori'} ({pages.length} {pages.length === 1 ? 'pagina' : 'pagine'})</h4>
              <div className="preview-grid">
                {pages.map((p, i) => (
                  <figure key={i} onClick={() => setZoomed(p)} title="Clicca per ingrandire">
                    <img src={p.url} alt={p.label} />
                    <figcaption>{p.label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {zoomed && (
        <div className="lightbox" onClick={() => setZoomed(null)}>
          <img src={zoomed.url} alt={zoomed.label} />
        </div>
      )}
    </Modal>
  )
}
