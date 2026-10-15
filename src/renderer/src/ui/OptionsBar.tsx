// Barra delle opzioni sopra l'area di disegno: cambia in base allo strumento attivo.
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { WALL_NAMES, type WallKind } from '../types'
import { ELEMENT_BY_ID } from '../elements/registry'
import { TOKEN_COLORS } from '../elements/tokens'
import { TEXTURE_BY_ID } from '../core/textures'
import { Icon } from './Icons'
import { NumInput, Toggle } from './controls'
import { toggleGrid, zoomBy } from '../actions'

const OPENING_KINDS: Exclude<WallKind, 'wall'>[] = ['door', 'locked', 'secret', 'window', 'grate', 'passage']

export function OptionsBar() {
  const ui = useUI()
  const doc = useDoc((s) => s.doc)
  const tool = ui.tool

  let content: React.ReactNode = null
  if (tool === 'brush' || tool === 'floorErase') {
    content = (
      <>
        <span className="opt-label">Dimensione pennello</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={'chip' + (ui.brushSize === n ? ' active' : '')} onClick={() => ui.setBrushSize(n)}>{n}</button>
        ))}
        {tool === 'brush' && <span className="opt-hint">Texture: <b>{TEXTURE_BY_ID[ui.textureId]?.name}</b></span>}
      </>
    )
  } else if (tool === 'bucket' || tool === 'rect' || tool === 'poly') {
    content = (
      <span className="opt-hint">
        Texture: <b>{TEXTURE_BY_ID[ui.textureId]?.name}</b> —{' '}
        {tool === 'bucket' ? 'clicca dentro una stanza: il riempimento si ferma ai muri.' : tool === 'rect' ? 'trascina per riempire un rettangolo di caselle.' : 'clicca i vertici; Invio, doppio clic o clic sul primo punto per chiudere; Esc annulla.'}
      </span>
    )
  } else if (tool === 'opening') {
    content = (
      <>
        {OPENING_KINDS.map((k) => (
          <button key={k} className={'chip' + (ui.openingKind === k ? ' active' : '')} onClick={() => ui.setOpeningKind(k)}>{WALL_NAMES[k]}</button>
        ))}
        <span className="opt-hint">Clicca su un bordo della griglia. Cliccando di nuovo lo stesso tipo torna muro.</span>
      </>
    )
  } else if (tool === 'wallLine' || tool === 'wallRect' || tool === 'wallErase') {
    content = (
      <span className="opt-hint">
        {doc.gridType === 'hex'
          ? 'Trascina lungo i lati degli esagoni per tracciare i muri.'
          : tool === 'wallLine' ? 'Trascina da un angolo all\'altro della griglia (linee orizzontali o verticali).' : tool === 'wallRect' ? 'Trascina in diagonale: vengono creati i quattro muri della stanza.' : 'Trascina sui muri da cancellare.'}
      </span>
    )
  } else if (tool === 'number') {
    content = (
      <>
        <span className="opt-label">Prossimo numero</span>
        <NumInput value={ui.nextRoomNumber} min={0} step={1} decimals={0} onCommit={ui.setNextRoomNumber} />
      </>
    )
  } else if (tool === 'place' && ui.placing) {
    const isToken = ui.placing.kind === 'builtin' && ui.placing.ref === 'token'
    const name = ui.placing.kind === 'builtin' ? ELEMENT_BY_ID[ui.placing.ref]?.name : 'Elemento personalizzato'
    content = (
      <>
        <span className="opt-hint">Inserimento: <b>{name}</b> — clicca sulla mappa (Esc per terminare).</span>
        {isToken && (
          <>
            <span className="opt-label">Colore</span>
            {TOKEN_COLORS.map((c) => (
              <button key={c} className={'swatch' + (ui.tokenColor === c ? ' active' : '')} style={{ background: c }} onClick={() => ui.setTokenColor(c)} title={c} />
            ))}
            <span className="opt-label">Taglia</span>
            {[[0.5, 'Minuta'], [1, 'Media'], [2, 'Grande'], [3, 'Enorme'], [4, 'Mastodontica']].map(([n, l]) => (
              <button key={n as number} className={'chip' + (ui.tokenSize === n ? ' active' : '')} onClick={() => ui.setTokenSize(n as number)} title={`${n}×${n} caselle`}>{l as string}</button>
            ))}
            <span className="opt-label">Numero</span>
            <NumInput value={ui.nextTokenNumber} min={0} step={1} decimals={0} onCommit={ui.setNextTokenNumber} />
          </>
        )}
      </>
    )
  } else if (tool === 'text' || tool === 'note') {
    content = <span className="opt-hint">Clicca sulla mappa per inserire il testo, poi modificalo nel pannello Proprietà.</span>
  } else if (tool === 'arrow') {
    content = <span className="opt-hint">Trascina dal punto di partenza alla punta della freccia.</span>
  } else if (tool === 'select') {
    content = <span className="opt-hint">Clic per selezionare · Maiusc per più elementi · trascina sul vuoto per selezionare un'area · rotellina per lo zoom.</span>
  } else if (tool === 'hand') {
    content = <span className="opt-hint">Trascina per spostare la vista.</span>
  }

  return (
    <div className="options-bar">
      <div className="opt-left">{content}</div>
      <div className="opt-right">
        <Toggle checked={ui.snap} onChange={ui.toggleSnap} label="Aggancia alla griglia" title="Attiva o disattiva l'aggancio alla griglia" />
        <button className={'icon-btn' + (doc.grid.visible ? ' active' : '')} title="Mostra / nascondi la griglia" onClick={toggleGrid}><Icon name="grid" size={18} /></button>
        <div className="seg" title="Vista di controllo: la versione per i giocatori nasconde il livello del Master">
          <button className={ui.viewMode === 'master' ? 'active' : ''} onClick={() => ui.setViewMode('master')}>Master</button>
          <button className={ui.viewMode === 'players' ? 'active' : ''} onClick={() => ui.setViewMode('players')}>Giocatori</button>
        </div>
        <button className="icon-btn" title="Riduci" onClick={() => zoomBy(1 / 1.25)}>−</button>
        <span className="zoom-label">{Math.round(ui.zoom * 100)}%</span>
        <button className="icon-btn" title="Ingrandisci" onClick={() => zoomBy(1.25)}>+</button>
        <button className="icon-btn" title="Adatta la mappa alla finestra" onClick={ui.requestFit}><Icon name="fit" size={18} /></button>
      </div>
    </div>
  )
}
