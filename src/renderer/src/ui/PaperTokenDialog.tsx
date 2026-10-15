// Token di carta stampabili: scelta dell'immagine o del token numerato, dimensione e foglio.
import { useEffect, useMemo, useState } from 'react'
import { useDoc } from '../store/docStore'
import { useLibrary } from '../io/library'
import { useUI } from '../store/uiStore'
import { PAPERS, type Orientation, type PaperId } from '../export/layout'
import { composePaperTokenPages, layoutGrid, paperTokensToPdf, tokenCount, type PaperTokenSpec } from '../export/paperTokens'
import { TOKEN_COLORS } from '../elements/tokens'
import { PDF_FILTER, saveFileAs } from '../io/platform'
import type { CustomAsset } from '../types'
import { Modal } from './Modal'
import { NumInput } from './controls'

const SIZES: [number, string][] = [[0.5, 'Minuta 0,5'], [1, 'Media 1×1'], [2, 'Grande 2×2'], [3, 'Enorme 3×3'], [4, 'Mastodontica 4×4']]

export function PaperTokenDialog() {
  const close = () => useUI.getState().openDialog(null)
  const lib = useLibrary((s) => s.items)
  const projectAssets = useDoc((s) => s.assets)
  const assets = useMemo(() => {
    const m = new Map<string, CustomAsset>()
    for (const a of lib) m.set(a.id, a)
    for (const a of Object.values(projectAssets)) m.set(a.id, a)
    return [...m.values()]
  }, [lib, projectAssets])

  const [mode, setMode] = useState<'numbered' | 'asset'>('numbered')
  const [color, setColor] = useState('#c0392b')
  const [from, setFrom] = useState(1)
  const [count, setCount] = useState(6)
  const [assetId, setAssetId] = useState<string>('')
  const [copies, setCopies] = useState(4)
  const [size, setSize] = useState(1)
  const [auto, setAuto] = useState(true)
  const [heightCells, setHeightCells] = useState(1.25)
  const [baseColor, setBaseColor] = useState('#d9d3c3')
  const [paper, setPaper] = useState<PaperId>('A4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [thumb, setThumb] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const asset = assets.find((a) => a.id === assetId) ?? assets[0]
  const useAsset = mode === 'asset' && !!asset
  const heightAuto = useAsset && auto ? size * (asset.hCells / asset.wCells) : mode === 'numbered' ? size : size * 1.25

  const spec: PaperTokenSpec | null = useMemo(() => {
    const h = auto ? heightAuto : heightCells
    const source = useAsset
      ? ({ type: 'asset', asset, copies } as const)
      : ({ type: 'numbered', color, from, count } as const)
    if (mode === 'asset' && !asset) return null
    return { source, sizeCells: size, heightCells: Math.max(0.3, h), baseColor, paper, orientation, marginMm: 8, gapMm: 3 }
  }, [mode, useAsset, asset, copies, color, from, count, size, auto, heightAuto, heightCells, baseColor, paper, orientation])

  // anteprima della prima pagina (con piccola attesa mentre si cambiano i valori)
  useEffect(() => {
    if (!spec) { setThumb(null); return }
    let alive = true
    const t = setTimeout(async () => {
      try {
        const pages = await composePaperTokenPages(spec, 60, 1)
        if (!alive) return
        setThumb(pages[0].toDataURL('image/jpeg', 0.85))
        setError(null)
      } catch (e) {
        if (alive) { setThumb(null); setError((e as Error).message) }
      }
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [spec])

  const info = spec ? layoutGrid(spec) : null
  const total = spec ? tokenCount(spec) : 0
  const pages = info && info.perPage > 0 ? Math.ceil(total / info.perPage) : 0

  const exportPdf = async () => {
    if (!spec) return
    setBusy(true)
    try {
      const bytes = await paperTokensToPdf(spec, 300)
      const path = await saveFileAs('token-di-carta.pdf', bytes, [PDF_FILTER], 'application/pdf')
      if (path) { useUI.getState().showToast('Token di carta salvati'); close() }
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <Modal title="Token di carta da ritagliare e piegare" onClose={close} width={760}
      footer={<><button className="btn" onClick={close}>Chiudi</button><button className="btn primary" onClick={exportPdf} disabled={!spec || busy || !!error || pages === 0} data-testid="btn-token-pdf">{busy ? 'Creazione…' : 'Crea PDF'}</button></>}>
      <div className="export-layout">
        <div>
          <h4>Immagine</h4>
          <div className="seg">
            <button className={mode === 'numbered' ? 'active' : ''} onClick={() => setMode('numbered')}>Token numerato</button>
            <button className={mode === 'asset' ? 'active' : ''} onClick={() => setMode('asset')} data-testid="pt-asset">Dalla mia libreria</button>
          </div>
          {mode === 'numbered' ? (
            <div className="form-grid compact">
              <label>Colore</label>
              <div className="row">{TOKEN_COLORS.map((c) => <button key={c} className={'swatch' + (color === c ? ' active' : '')} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
              <label>Primo numero</label>
              <NumInput value={from} min={0} max={999} step={1} decimals={0} onCommit={setFrom} />
              <label>Quanti token</label>
              <NumInput value={count} min={1} max={60} step={1} decimals={0} onCommit={setCount} />
            </div>
          ) : assets.length ? (
            <div className="form-grid compact">
              <label>Elemento</label>
              <select value={asset?.id} onChange={(e) => setAssetId(e.target.value)}>{assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
              <label>Copie</label>
              <NumInput value={copies} min={1} max={60} step={1} decimals={0} onCommit={setCopies} />
            </div>
          ) : (
            <p className="hint">La libreria personale è vuota: importa prima qualche immagine (scheda Libreria → La mia libreria).</p>
          )}
          <h4>Dimensione</h4>
          <div className="row">{SIZES.map(([n, l]) => <button key={n} className={'chip small' + (size === n ? ' active' : '')} onClick={() => setSize(n)}>{l}</button>)}</div>
          <div className="form-grid compact">
            <label>Altezza figura</label>
            <div className="row">
              <label className="toggle"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /><span>automatica</span></label>
              {!auto && <NumInput value={heightCells} min={0.3} max={6} step={0.25} onCommit={setHeightCells} />}
              <span className="hint">{(spec ? spec.heightCells : 0).toFixed(2).replace('.', ',')} caselle</span>
            </div>
            <label>Colore base</label>
            <input type="color" className="color" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} />
            <label>Foglio</label>
            <select value={paper} onChange={(e) => setPaper(e.target.value as PaperId)}>{Object.entries(PAPERS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select>
            <label>Orientamento</label>
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
              <option value="auto">Automatico</option><option value="portrait">Verticale</option><option value="landscape">Orizzontale</option>
            </select>
          </div>
          <div className="info-box">
            {error ? error : info ? <>{total} token · {info.cols}×{info.rows} per foglio · <b>{pages} {pages === 1 ? 'foglio' : 'fogli'}</b>. Larghezza reale: {(size * 2.54).toFixed(1).replace('.', ',')} cm.</> : null}
          </div>
        </div>
        <div>
          <h4>Anteprima della prima pagina</h4>
          {thumb && <img src={thumb} alt="Anteprima" style={{ width: '100%', background: '#fff', borderRadius: 4, boxShadow: '0 2px 8px #0008' }} />}
          <p className="hint">Come si usa: ritaglia lungo il contorno continuo, piega a metà sulla linea centrale (le due figure si trovano una sopra e una sotto), piega le alette in direzioni opposte per fare la base e incolla le figure dorso contro dorso.</p>
        </div>
      </div>
    </Modal>
  )
}
