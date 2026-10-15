// Barra degli strumenti verticale a sinistra.
import { useUI, type ToolId } from '../store/uiStore'
import { Icon } from './Icons'

interface ToolDef {
  id: ToolId
  icon: string
  label: string
  key?: string
}

const GROUPS: { title: string; tools: ToolDef[] }[] = [
  {
    title: 'Selezione',
    tools: [
      { id: 'select', icon: 'select', label: 'Selezione e spostamento', key: 'V' },
      { id: 'hand', icon: 'hand', label: 'Mano: sposta la vista (anche Spazio + trascina)', key: 'H' }
    ]
  },
  {
    title: 'Pavimenti',
    tools: [
      { id: 'brush', icon: 'brush', label: 'Pennello pavimento', key: 'B' },
      { id: 'bucket', icon: 'bucket', label: 'Secchiello: riempie una stanza (si ferma ai muri)', key: 'F' },
      { id: 'rect', icon: 'rect', label: 'Rettangolo di pavimento', key: 'R' },
      { id: 'poly', icon: 'poly', label: 'Poligono di pavimento (Invio o doppio clic per chiudere)', key: 'P' },
      { id: 'floorErase', icon: 'eraser', label: 'Gomma pavimento', key: 'E' }
    ]
  },
  {
    title: 'Muri',
    tools: [
      { id: 'wallLine', icon: 'wall', label: 'Muro: trascina lungo la griglia', key: 'W' },
      { id: 'wallRect', icon: 'wallRect', label: 'Muri di una stanza rettangolare', key: 'Q' },
      { id: 'opening', icon: 'door', label: 'Porte, finestre, grate e passaggi: clicca su un muro', key: 'D' },
      { id: 'wallErase', icon: 'wallErase', label: 'Gomma muri', key: 'X' }
    ]
  },
  {
    title: 'Annotazioni',
    tools: [
      { id: 'text', icon: 'text', label: 'Testo / etichetta', key: 'T' },
      { id: 'note', icon: 'note', label: 'Nota del Master (non compare ai giocatori)', key: 'M' },
      { id: 'arrow', icon: 'arrow', label: 'Freccia', key: 'A' },
      { id: 'number', icon: 'number', label: 'Numero stanza (automatico)', key: 'N' }
    ]
  }
]

export const TOOL_KEYS: Record<string, ToolId> = Object.fromEntries(
  GROUPS.flatMap((g) => g.tools).filter((t) => t.key).map((t) => [t.key!.toLowerCase(), t.id])
)

export function Toolbar() {
  const tool = useUI((s) => s.tool)
  const setTool = useUI((s) => s.setTool)
  return (
    <div className="toolbar">
      {GROUPS.map((g) => (
        <div className="tool-group" key={g.title}>
          {g.tools.map((t) => (
            <button
              key={t.id}
              className={'tool-btn' + (tool === t.id ? ' active' : '')}
              title={`${t.label}${t.key ? ` [${t.key}]` : ''}`}
              data-testid={`tool-${t.id}`}
              onClick={() => setTool(t.id)}
            >
              <Icon name={t.icon} size={20} />
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
