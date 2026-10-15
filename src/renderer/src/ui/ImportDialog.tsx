// Finestra di importazione / modifica di elementi personalizzati:
// nome, categoria, tag, dimensione in caselle e colore di sfondo da rendere trasparente.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CustomAsset } from '../types'
import { useUI } from '../store/uiStore'
import { useDoc } from '../store/docStore'
import { useLibrary } from '../io/library'
import { useImport } from '../io/importFlow'
import { getAssetCanvas } from '../canvas/imageCache'
import { placeAt } from '../canvas/placement'
import { Modal } from './Modal'
import { NumInput } from './controls'
import { AssetThumb, DEFAULT_USER_CATEGORIES } from './LibraryPanel'

function Preview({ asset, onPick }: { asset: CustomAsset; onPick: (hex: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const rev = useDoc((s) => s.assetsRev)
  const orig = useRef<{ id: string; img: HTMLImageElement } | null>(null)

  useEffect(() => {
    const c = ref.current!
    const src = getAssetCanvas(asset)
    const g = c.getContext('2d')!
    g.clearRect(0, 0, c.width, c.height)
    if (!src) return
    const k = Math.min(c.width / src.width, c.height / src.height)
    g.drawImage(src, (c.width - src.width * k) / 2, (c.height - src.height * k) / 2, src.width * k, src.height * k)
  }, [asset, rev])

  // clic sull'anteprima: preleva il colore dall'immagine originale
  const pick = async (e: React.MouseEvent) => {
    const c = ref.current!
    const rect = c.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    if (!orig.current || orig.current.id !== asset.id + asset.dataUrl.length) {
      const img = new Image()
      await new Promise<void>((res) => { img.onload = () => res(); img.src = asset.dataUrl })
      orig.current = { id: asset.id + asset.dataUrl.length, img }
    }
    const img = orig.current.img
    const k = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight)
    const dw = img.naturalWidth * k
    const dh = img.naturalHeight * k
    const px = fx * c.width - (c.width - dw) / 2
    const py = fy * c.height - (c.height - dh) / 2
    if (px < 0 || py < 0 || px >= dw || py >= dh) return
    const t = document.createElement('canvas')
    t.width = 1
    t.height = 1
    const tg = t.getContext('2d', { willReadFrequently: true })!
    tg.drawImage(img, (px / dw) * img.naturalWidth, (py / dh) * img.naturalHeight, 1, 1, 0, 0, 1, 1)
    const [r, g, b] = tg.getImageData(0, 0, 1, 1).data
    onPick('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''))
  }

  return <canvas ref={ref} className="import-preview" width={320} height={240} onClick={pick} title="Clicca per scegliere il colore da rendere trasparente" />
}

export function ImportDialog() {
  const dialog = useUI((s) => s.dialog)
  const { drafts, mode } = useImport()
  const [list, setList] = useState<CustomAsset[]>(drafts)
  const [idx, setIdx] = useState(0)
  const [lock, setLock] = useState(true)
  const save = useLibrary((s) => s.save)
  const userItems = useLibrary((s) => s.items)

  useEffect(() => { setList(drafts); setIdx(0) }, [drafts])
  const close = () => useUI.getState().openDialog(null)
  const cur = list[idx]
  const cats = useMemo(() => [...new Set([...DEFAULT_USER_CATEGORIES, ...userItems.map((a) => a.category)])], [userItems])
  if (!cur || (dialog !== 'importImages' && dialog !== 'libraryEdit')) return null

  const upd = (patch: Partial<CustomAsset>) => setList((l) => l.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  const ratio = cur.wCells / cur.hCells

  const applyAll = () => setList((l) => l.map((a) => ({ ...a, category: cur.category, tags: cur.tags, tolerance: cur.tolerance, keyColor: cur.keyColor, keyEdge: cur.keyEdge })))

  const finish = async (place: boolean) => {
    for (const a of list) await save(a)
    if (mode === 'edit') {
      // aggiorna anche le copie già nel progetto corrente
      const st = useDoc.getState()
      for (const a of list) if (st.assets[a.id]) st.addAsset(a)
      useUI.getState().showToast('Elemento aggiornato')
    } else {
      useUI.getState().showToast(list.length === 1 ? 'Elemento aggiunto alla libreria' : `${list.length} elementi aggiunti alla libreria`)
    }
    close()
    if (place && mode === 'new' && list.length === 1) {
      const el = document.querySelector('.canvas-wrap') as HTMLElement | null
      const ui = useUI.getState()
      const x = ((el?.clientWidth ?? 800) / 2 - ui.panX) / ui.zoom / 100
      const y = ((el?.clientHeight ?? 600) / 2 - ui.panY) / ui.zoom / 100
      useDoc.getState().addAsset(list[0])
      placeAt({ kind: 'custom', ref: list[0].id }, x, y)
    }
  }

  return (
    <Modal
      title={mode === 'edit' ? 'Modifica elemento' : list.length > 1 ? `Importa ${list.length} immagini` : 'Importa immagine'}
      onClose={close}
      width={list.length > 1 ? 860 : 640}
      footer={
        <>
          <button className="btn" onClick={close}>Annulla</button>
          {mode === 'new' && list.length === 1 && <button className="btn" onClick={() => finish(true)} data-testid="import-save-place">Salva e inserisci nella mappa</button>}
          <button className="btn primary" onClick={() => finish(false)} data-testid="import-save">{mode === 'edit' ? 'Salva modifiche' : 'Salva nella libreria'}</button>
        </>
      }
    >
      <div className="import-layout">
        {list.length > 1 && (
          <div className="import-list">
            {list.map((a, i) => (
              <button key={a.id} className={i === idx ? 'active' : ''} onClick={() => setIdx(i)}>
                <AssetThumb asset={a} size={34} />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="import-main">
          <div className="checker"><Preview asset={cur} onPick={(hex) => upd({ keyColor: hex })} /></div>
          <div className="form-grid">
            <label>Nome</label>
            <input value={cur.name} onChange={(e) => upd({ name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} data-testid="import-name" />
            <label>Categoria</label>
            <input list="cats" value={cur.category} onChange={(e) => upd({ category: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            <label>Tag</label>
            <input
              placeholder="separati da virgola: goblin, mostro, piccolo"
              value={cur.tags.join(', ')}
              onChange={(e) => upd({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <label>Dimensione (caselle)</label>
            <div className="row">
              <NumInput value={cur.wCells} min={0.25} max={40} step={0.5} onCommit={(v) => upd(lock ? { wCells: v, hCells: Math.max(0.25, Math.round((v / ratio) * 100) / 100) } : { wCells: v })} title="Larghezza in caselle" /> ×
              <NumInput value={cur.hCells} min={0.25} max={40} step={0.5} onCommit={(v) => upd(lock ? { hCells: v, wCells: Math.max(0.25, Math.round(v * ratio * 100) / 100) } : { hCells: v })} title="Altezza in caselle" />
              <label className="toggle"><input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} /><span>mantieni proporzioni</span></label>
            </div>
            <label />
            <div className="row">
              {[[1, 1, 'Medio 1×1'], [2, 2, 'Grande 2×2'], [3, 3, 'Enorme 3×3'], [4, 4, 'Mastodontico 4×4']].map(([w, h, l]) => (
                <button key={l as string} className="chip small" onClick={() => upd({ wCells: w as number, hCells: h as number })}>{l as string}</button>
              ))}
            </div>
            <label>Sfondo trasparente</label>
            <div className="col">
              <div className="row">
                <label className="toggle">
                  <input type="checkbox" checked={!!cur.keyColor} onChange={(e) => upd({ keyColor: e.target.checked ? cur.keyColor ?? '#ffffff' : null })} data-testid="import-key-toggle" />
                  <span>Rendi trasparente un colore</span>
                </label>
                {cur.keyColor && <input type="color" className="color" value={cur.keyColor} onChange={(e) => upd({ keyColor: e.target.value })} />}
                {cur.keyColor && <button className="chip small" onClick={() => upd({ keyColor: '#ffffff' })}>Bianco</button>}
              </div>
              {cur.keyColor && (
                <>
                  <div className="row">
                    <span className="hint">Tolleranza</span>
                    <input type="range" min={0} max={60} value={cur.tolerance} onChange={(e) => upd({ tolerance: Number(e.target.value) })} />
                    <span className="hint">{cur.tolerance}</span>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={!!cur.keyEdge} onChange={(e) => upd({ keyEdge: e.target.checked })} /><span>Solo lo sfondo collegato ai bordi</span></label>
                  <span className="hint">Suggerimento: clicca sull'anteprima per scegliere il colore da rendere trasparente.</span>
                </>
              )}
            </div>
          </div>
          {list.length > 1 && (
            <button className="btn small" onClick={applyAll}>Applica categoria, tag e trasparenza a tutte le immagini</button>
          )}
        </div>
      </div>
    </Modal>
  )
}
