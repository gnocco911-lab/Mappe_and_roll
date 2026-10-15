// Pannello "Libreria": elementi integrati e libreria personale, con ricerca e categorie.
import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, ELEMENTS, getElementThumb, type ElementDef } from '../elements/registry'
import { useUI } from '../store/uiStore'
import { useDoc } from '../store/docStore'
import { useLibrary, exportLibrary, parseLibrary } from '../io/library'
import { getAssetCanvas } from '../canvas/imageCache'
import { ELEMENT_DRAG_MIME } from '../canvas/placement'
import { editAsset, importFolderFromDialog, importImagesFromDialog } from '../io/importFlow'
import { LIBRARY_FILTER, pickFiles, saveFileAs } from '../io/platform'
import { askConfirm } from '../store/confirmStore'
import type { CustomAsset } from '../types'
import { Icon } from './Icons'

export const DEFAULT_USER_CATEGORIES = ['Mostri', 'Personaggi', 'Arredi', 'Dungeon', 'Natura', 'Oggetti', 'Altro']

function BuiltinTile({ def }: { def: ElementDef }) {
  const placing = useUI((s) => s.placing)
  const setPlacing = useUI((s) => s.setPlacing)
  const active = placing?.kind === 'builtin' && placing.ref === def.id
  return (
    <button
      className={'lib-tile' + (active ? ' active' : '')}
      title={`${def.name} (${def.w}×${def.h} caselle)`}
      draggable
      data-testid={`el-${def.id}`}
      onDragStart={(e) => { e.dataTransfer.setData(ELEMENT_DRAG_MIME, JSON.stringify({ kind: 'builtin', ref: def.id })); e.dataTransfer.effectAllowed = 'copy' }}
      onClick={() => setPlacing(active ? null : { kind: 'builtin', ref: def.id })}
    >
      <img src={getElementThumb(def, 72)} alt="" width={56} height={56} draggable={false} />
      <span>{def.name}</span>
    </button>
  )
}

/** Miniatura di un'immagine personalizzata (con il colore trasparente già applicato). */
export function AssetThumb({ asset, size = 56 }: { asset: CustomAsset; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const rev = useDoc((s) => s.assetsRev)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const src = getAssetCanvas(asset)
    const g = c.getContext('2d')!
    g.clearRect(0, 0, c.width, c.height)
    if (!src) return
    const k = Math.min(c.width / src.width, c.height / src.height)
    g.drawImage(src, (c.width - src.width * k) / 2, (c.height - src.height * k) / 2, src.width * k, src.height * k)
  }, [asset, rev, size])
  return <canvas ref={ref} width={size * 2} height={size * 2} style={{ width: size, height: size }} />
}

function UserTile({ asset }: { asset: CustomAsset }) {
  const placing = useUI((s) => s.placing)
  const setPlacing = useUI((s) => s.setPlacing)
  const remove = useLibrary((s) => s.remove)
  const active = placing?.kind === 'custom' && placing.ref === asset.id
  return (
    <div className={'lib-tile user' + (active ? ' active' : '')}>
      <button
        className="tile-main"
        title={`${asset.name} (${asset.wCells}×${asset.hCells} caselle)${asset.tags.length ? '\n#' + asset.tags.join(' #') : ''}`}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData(ELEMENT_DRAG_MIME, JSON.stringify({ kind: 'custom', ref: asset.id })); e.dataTransfer.effectAllowed = 'copy' }}
        onClick={() => {
          if (!useDoc.getState().assets[asset.id]) useDoc.getState().addAsset(asset)
          setPlacing(active ? null : { kind: 'custom', ref: asset.id })
        }}
      >
        <AssetThumb asset={asset} />
        <span>{asset.name}</span>
      </button>
      <div className="tile-actions">
        <button title="Modifica nome, categoria, dimensione e trasparenza" onClick={() => editAsset(asset)}><Icon name="settings" size={13} /></button>
        <button
          title="Elimina dalla libreria"
          onClick={async () => {
            const r = await askConfirm('Elimina elemento', `Eliminare "${asset.name}" dalla libreria personale? Le mappe che lo usano già lo conservano.`, [
              { id: 'del', label: 'Elimina', kind: 'danger' }, { id: 'no', label: 'Annulla' }
            ])
            if (r === 'del') remove(asset.id)
          }}
        ><Icon name="trash" size={13} /></button>
      </div>
    </div>
  )
}

export function LibraryPanel() {
  const [tab, setTab] = useState<'builtin' | 'user'>('builtin')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('Tutte')
  const userItems = useLibrary((s) => s.items)
  const save = useLibrary((s) => s.save)
  const showToast = useUI((s) => s.showToast)

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const query = norm(q.trim())

  const builtin = useMemo(
    () => ELEMENTS.filter((e) => (cat === 'Tutte' || e.category === cat) && (!query || norm(e.name + ' ' + e.tags.join(' ')).includes(query))),
    [cat, query]
  )
  const userCats = useMemo(() => [...new Set([...DEFAULT_USER_CATEGORIES, ...userItems.map((a) => a.category)])], [userItems])
  const user = useMemo(
    () => userItems.filter((a) => (cat === 'Tutte' || a.category === cat) && (!query || norm(a.name + ' ' + a.tags.join(' ') + ' ' + a.category).includes(query))),
    [userItems, cat, query]
  )

  const cats = tab === 'builtin' ? ['Tutte', ...CATEGORIES] : ['Tutte', ...userCats]

  const doExport = async () => {
    if (!userItems.length) { showToast('La libreria personale è vuota'); return }
    const path = await saveFileAs('libreria-elementi.dndlib', exportLibrary(userItems), [LIBRARY_FILTER], 'application/zip')
    if (path) showToast('Libreria esportata')
  }
  const doImport = async () => {
    const f = (await pickFiles([LIBRARY_FILTER], false))[0]
    if (!f) return
    try {
      const items = parseLibrary(f.data)
      for (const a of items) await save(a)
      showToast(`Importati ${items.length} elementi nella libreria`)
      setTab('user')
    } catch (e) {
      showToast('Libreria non valida: ' + (e as Error).message)
    }
  }

  return (
    <div className="panel-body lib">
      <div className="tabs">
        <button className={tab === 'builtin' ? 'active' : ''} onClick={() => { setTab('builtin'); setCat('Tutte') }}>Integrati</button>
        <button className={tab === 'user' ? 'active' : ''} onClick={() => { setTab('user'); setCat('Tutte') }} data-testid="tab-user">La mia libreria ({userItems.length})</button>
      </div>
      <div className="search">
        <Icon name="search" size={15} />
        <input placeholder="Cerca per nome o tag…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="lib-search" />
      </div>
      <div className="chips">
        {cats.map((c) => (
          <button key={c} className={'chip small' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      {tab === 'user' && (
        <div className="lib-actions">
          <button onClick={() => importImagesFromDialog(cat === 'Tutte' ? undefined : cat)} data-testid="btn-import-images"><Icon name="image" size={15} /> Importa immagini…</button>
          <button onClick={() => importFolderFromDialog(cat === 'Tutte' ? undefined : cat)}><Icon name="folder" size={15} /> Importa cartella…</button>
          <button onClick={doExport}><Icon name="export" size={15} /> Esporta libreria</button>
          <button onClick={doImport}><Icon name="open" size={15} /> Importa libreria</button>
          <p className="hint">Puoi anche trascinare immagini (o intere cartelle) dentro la finestra.</p>
        </div>
      )}
      <div className="lib-grid">
        {tab === 'builtin' ? builtin.map((d) => <BuiltinTile key={d.id} def={d} />) : user.map((a) => <UserTile key={a.id} asset={a} />)}
        {tab === 'builtin' && !builtin.length && <p className="hint">Nessun elemento trovato.</p>}
        {tab === 'user' && !user.length && <p className="hint">{userItems.length ? 'Nessun elemento trovato.' : 'Nessun elemento personale: importa le tue immagini (PNG, JPG, WebP, SVG).'}</p>}
      </div>
    </div>
  )
}
