// Pannello "Terreno": scelta della texture dei pavimenti e colore dello sfondo.
import { TEXTURES, getTextureSwatch } from '../core/textures'
import { useDoc } from '../store/docStore'
import { useUI } from '../store/uiStore'
import { ColorInput } from './controls'

export function TerrainPanel() {
  const textureId = useUI((s) => s.textureId)
  const setTexture = useUI((s) => s.setTexture)
  const bg = useDoc((s) => s.doc.background)
  return (
    <div className="panel-body">
      <h4>Texture del pavimento</h4>
      <div className="tex-grid">
        {TEXTURES.map((t) => (
          <button key={t.id} className={'tex' + (textureId === t.id ? ' active' : '')} onClick={() => setTexture(t.id)} title={t.name} data-testid={`tex-${t.id}`}>
            <img src={getTextureSwatch(t.id, 64)} alt={t.name} width={56} height={56} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
      <p className="hint">Scegli una texture e usa gli strumenti Pennello, Secchiello, Rettangolo o Poligono nella barra a sinistra.</p>
      <h4>Sfondo della mappa</h4>
      <div className="row">
        <ColorInput value={bg} onCommit={(c) => useDoc.getState().change((d) => { d.background = c })} title="Colore delle caselle senza pavimento" />
        <span className="hint">Colore delle caselle senza pavimento.</span>
      </div>
    </div>
  )
}
