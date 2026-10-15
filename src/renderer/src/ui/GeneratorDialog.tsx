// Generatore casuale: dungeon, caverne e mappe di viaggio esagonali. Il risultato sostituisce la mappa
// corrente ed è annullabile con Ctrl+Z, così si può rigenerare finché piace.
import { useState } from 'react'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { DEFAULT_GENERATOR, generateMap, type GeneratorKind, type GeneratorOptions } from '../core/generate'
import { TEXTURES } from '../core/textures'
import { Modal } from './Modal'
import { NumInput, Toggle } from './controls'

const KINDS: { id: GeneratorKind; name: string; text: string; cols: number; rows: number }[] = [
  { id: 'dungeon', name: 'Dungeon', text: 'Stanze collegate da corridoi, con porte (anche segrete), arredi e trappole.', cols: 40, rows: 28 },
  { id: 'cave', name: 'Caverna', text: 'Grotta irregolare con laghetto, rocce e funghi.', cols: 36, rows: 24 },
  { id: 'travel', name: 'Mappa di viaggio', text: 'Mappa esagonale con mari, montagne, foreste e insediamenti.', cols: 24, rows: 16 }
]

export function GeneratorDialog() {
  const close = () => useUI.getState().openDialog(null)
  const [o, setO] = useState<GeneratorOptions>({ ...DEFAULT_GENERATOR, seed: Math.floor(Math.random() * 100000) })
  const set = (p: Partial<GeneratorOptions>) => setO((x) => ({ ...x, ...p }))

  const generate = () => {
    const g = generateMap(o)
    useDoc.getState().change((d) => {
      d.name = g.name
      d.cols = g.cols
      d.rows = g.rows
      d.gridType = g.gridType
      d.floors = g.floors
      d.walls = g.walls
      d.items = g.items
    })
    useUI.getState().select([])
    useUI.getState().requestFit()
    useUI.getState().showToast('Mappa generata: Ctrl+Z per tornare indietro, "Genera" per un altro tentativo')
  }

  return (
    <Modal title="Generatore casuale" onClose={close} width={560}
      footer={<><button className="btn" onClick={close}>Chiudi</button><button className="btn primary" onClick={generate} data-testid="btn-generate">Genera mappa</button></>}>
      <div className="tpl-grid">
        {KINDS.map((k) => (
          <button key={k.id} className={'tpl' + (o.kind === k.id ? ' active' : '')} onClick={() => set({ kind: k.id, cols: k.cols, rows: k.rows })} data-testid={`gen-${k.id}`}>
            <b>{k.name}</b><small>{k.text}</small>
          </button>
        ))}
      </div>
      <div className="form-grid">
        <label>Dimensione (caselle)</label>
        <div className="row">
          <NumInput value={o.cols} min={10} max={120} step={1} decimals={0} onCommit={(v) => set({ cols: Math.round(v) })} /> ×
          <NumInput value={o.rows} min={10} max={120} step={1} decimals={0} onCommit={(v) => set({ rows: Math.round(v) })} />
        </div>
        <label>Seme casuale</label>
        <div className="row">
          <NumInput value={o.seed} min={0} max={999999} step={1} decimals={0} width={90} onCommit={(v) => set({ seed: Math.round(v) })} title="Con lo stesso seme si ottiene sempre la stessa mappa" />
          <button className="btn small" style={{ marginTop: 0 }} onClick={() => set({ seed: Math.floor(Math.random() * 1000000) })} data-testid="btn-dice">🎲 Nuovo seme</button>
        </div>
        {o.kind === 'dungeon' && (
          <>
            <label>Numero di stanze</label>
            <div className="row"><input type="range" min={3} max={20} value={o.rooms} onChange={(e) => set({ rooms: Number(e.target.value) })} /><span className="hint">{o.rooms}</span></div>
            <label>Pavimento</label>
            <select value={o.floor} onChange={(e) => set({ floor: e.target.value })}>
              {TEXTURES.filter((t) => ['pietra', 'legno', 'terra', 'sabbia', 'ghiaccio', 'palude'].includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>
        )}
        {o.kind !== 'travel' && (
          <>
            <label>Contenuto</label>
            <div className="col">
              <Toggle checked={o.decorate} onChange={(v) => set({ decorate: v })} label={o.kind === 'dungeon' ? 'Arredi, luci e trappole' : 'Trappole'} />
              {o.kind === 'dungeon' && <Toggle checked={o.numbers} onChange={(v) => set({ numbers: v })} label="Numeri delle stanze" />}
            </div>
          </>
        )}
      </div>
      <p className="hint">La mappa attuale viene sostituita (puoi annullare). I tuoi elementi personalizzati e le impostazioni della griglia restano.</p>
    </Modal>
  )
}
