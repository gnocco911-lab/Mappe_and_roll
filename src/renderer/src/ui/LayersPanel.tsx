// Pannello "Livelli": mostra/nascondi e blocca ogni livello.
import { LAYER_NAMES, LAYER_ORDER, type LayerId } from '../types'
import { useDoc } from '../store/docStore'
import { Icon } from './Icons'

const HINTS: Record<LayerId, string> = {
  terrain: 'Pavimenti e texture',
  walls: 'Muri, porte, finestre (le porte segrete sono visibili solo al Master)',
  objects: 'Arredi, scenari, testi, frecce e numeri',
  tokens: 'Segnalini di mostri e PNG',
  master: 'Trappole e note: mai nella versione per i giocatori'
}

export function LayersPanel() {
  const layers = useDoc((s) => s.doc.layers)
  const change = useDoc((s) => s.change)
  const toggle = (id: LayerId, key: 'visible' | 'locked') => change((d) => { d.layers[id][key] = !d.layers[id][key] })
  return (
    <div className="panel-section">
      <h4>Livelli</h4>
      <div className="layers">
        {[...LAYER_ORDER].reverse().map((id) => (
          <div key={id} className={'layer-row' + (id === 'master' ? ' master' : '')} title={HINTS[id]}>
            <button className={'icon-btn' + (layers[id].visible ? '' : ' off')} title={layers[id].visible ? 'Nascondi' : 'Mostra'} onClick={() => toggle(id, 'visible')} data-testid={`vis-${id}`}>
              <Icon name={layers[id].visible ? 'eye' : 'eyeOff'} size={16} />
            </button>
            <button className={'icon-btn' + (layers[id].locked ? ' active' : '')} title={layers[id].locked ? 'Sblocca' : 'Blocca'} onClick={() => toggle(id, 'locked')} data-testid={`lock-${id}`}>
              <Icon name={layers[id].locked ? 'lock' : 'unlock'} size={16} />
            </button>
            <span className="layer-name">{LAYER_NAMES[id]}</span>
            {id === 'master' && <span className="badge">solo Master</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
