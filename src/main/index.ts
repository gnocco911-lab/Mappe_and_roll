// Processo principale di Electron: crea la finestra, il menu in italiano e gestisce i file su disco.
// L'applicazione non effettua nessuna connessione di rete: tutto è locale.
import { app, BrowserWindow, Menu, dialog, ipcMain, session } from 'electron'
import { join, basename, extname } from 'node:path'
import { promises as fs } from 'node:fs'

// stesso nome in sviluppo e nell'app installata: così la libreria personale e i recuperi si ritrovano
app.setName('Mappe di Battaglia D&D')

const isMac = process.platform === 'darwin'
let win: BrowserWindow | null = null
let forceClose = false

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'])
const recoveryPath = () => join(app.getPath('userData'), 'recupero.dndmap')

function send(channel: string, ...args: unknown[]) {
  win?.webContents.send(channel, ...args)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#1d2026',
    title: 'Mappe di Battaglia D&D',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  })
  win.once('ready-to-show', () => win?.show())

  // nessun collegamento esterno viene aperto dentro l'app
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e) => e.preventDefault())

  // chiusura: l'interfaccia può chiedere di salvare
  win.on('close', (e) => {
    if (forceClose) return
    e.preventDefault()
    send('app:before-close')
  })
  win.on('closed', () => { win = null })

  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function buildMenu() {
  const m = (label: string, action: string, accelerator?: string) => ({ label, accelerator, click: () => send('menu:action', action) })
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: 'about' as const, label: 'Informazioni' }, { type: 'separator' as const }, { role: 'hide' as const, label: 'Nascondi' }, { role: 'hideOthers' as const }, { role: 'unhide' as const }, { type: 'separator' as const }, { role: 'quit' as const, label: 'Esci' }] }] : []),
    {
      label: 'File',
      submenu: [
        m('Nuova mappa…', 'file.new', 'CmdOrCtrl+N'),
        m('Apri…', 'file.open', 'CmdOrCtrl+O'),
        m('Salva', 'file.save', 'CmdOrCtrl+S'),
        m('Salva con nome…', 'file.saveAs', 'CmdOrCtrl+Shift+S'),
        { type: 'separator' },
        m('Importa immagini nella libreria…', 'file.importImages', 'CmdOrCtrl+I'),
        m('Esporta / Stampa…', 'file.export', 'CmdOrCtrl+E'),
        { type: 'separator' },
        m('Generatore casuale…', 'file.generator'),
        m('Token di carta da ritagliare…', 'file.paperTokens'),
        m('Impostazioni mappa…', 'file.settings'),
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const, label: 'Esci' }])
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        m('Annulla', 'edit.undo', 'CmdOrCtrl+Z'),
        m('Ripeti', 'edit.redo', 'CmdOrCtrl+Shift+Z'),
        { type: 'separator' },
        m('Taglia', 'edit.cut', 'CmdOrCtrl+X'),
        m('Copia', 'edit.copy', 'CmdOrCtrl+C'),
        m('Incolla', 'edit.paste', 'CmdOrCtrl+V'),
        m('Duplica', 'edit.duplicate', 'CmdOrCtrl+D'),
        m('Seleziona tutto', 'edit.selectAll', 'CmdOrCtrl+A')
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        m('Ingrandisci', 'view.zoomIn', 'CmdOrCtrl+Plus'),
        m('Riduci', 'view.zoomOut', 'CmdOrCtrl+-'),
        m('Adatta alla finestra', 'view.fit', 'CmdOrCtrl+0'),
        { type: 'separator' },
        m('Mostra / nascondi griglia', 'view.grid'),
        m('Aggancio alla griglia', 'view.snap'),
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Schermo intero' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const, label: 'Strumenti sviluppatore' }])
      ]
    },
    {
      label: 'Aiuto',
      submenu: [m('Scorciatoie da tastiera', 'help.shortcuts'), m('Informazioni', 'help.about')]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---------------------------------------------------------------- IPC

type Filter = { name: string; extensions: string[] }

function registerIpc() {
  ipcMain.handle('dialog:save', async (_e, opts: { defaultPath?: string; filters?: Filter[] }) => {
    const r = await dialog.showSaveDialog(win!, { defaultPath: opts.defaultPath, filters: opts.filters })
    return r.canceled ? null : r.filePath
  })
  ipcMain.handle('dialog:open', async (_e, opts: { filters?: Filter[]; multiple?: boolean }) => {
    const r = await dialog.showOpenDialog(win!, { filters: opts.filters, properties: ['openFile', ...(opts.multiple ? (['multiSelections'] as const) : [])] })
    return r.canceled ? [] : r.filePaths
  })
  ipcMain.handle('fs:write', async (_e, path: string, data: Uint8Array) => {
    await fs.writeFile(path, Buffer.from(data))
  })
  ipcMain.handle('fs:read', async (_e, path: string) => new Uint8Array(await fs.readFile(path)))

  // legge tutte le immagini di una cartella (e sottocartelle)
  ipcMain.handle('dialog:openFolderImages', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    if (r.canceled || !r.filePaths[0]) return []
    const out: { name: string; path: string; data: Uint8Array }[] = []
    const walk = async (dir: string, depth: number) => {
      for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name)
        if (ent.isDirectory() && depth < 6) await walk(p, depth + 1)
        else if (ent.isFile() && IMAGE_EXT.has(extname(ent.name).toLowerCase())) {
          out.push({ name: ent.name, path: p, data: new Uint8Array(await fs.readFile(p)) })
        }
      }
    }
    await walk(r.filePaths[0], 0)
    return out.slice(0, 2000)
  })

  // salva più file con lo stesso nome base (es. mappa_master.pdf e mappa_giocatori.pdf)
  ipcMain.handle('dialog:saveMany', async (_e, opts: { baseName: string; ext: string; filters: Filter[]; files: { suffix: string; data: Uint8Array }[] }) => {
    const first = opts.files[0]
    const r = await dialog.showSaveDialog(win!, { defaultPath: `${opts.baseName}${first.suffix}.${opts.ext}`, filters: opts.filters })
    if (r.canceled || !r.filePath) return null
    const dirName = join(r.filePath, '..')
    const chosen = basename(r.filePath, extname(r.filePath))
    // il nome scelto vale per il primo file; gli altri usano lo stesso nome con il proprio suffisso
    const stem = first.suffix && chosen.endsWith(first.suffix) ? chosen.slice(0, -first.suffix.length) : chosen
    const written: string[] = []
    for (const f of opts.files) {
      const p = f === first ? r.filePath : join(dirName, `${stem}${f.suffix}.${opts.ext}`)
      await fs.writeFile(p, Buffer.from(f.data))
      written.push(p)
    }
    return written
  })

  ipcMain.handle('recovery:write', async (_e, data: Uint8Array) => { await fs.writeFile(recoveryPath(), Buffer.from(data)) })
  ipcMain.handle('recovery:read', async () => {
    try { return new Uint8Array(await fs.readFile(recoveryPath())) } catch { return null }
  })
  ipcMain.handle('recovery:clear', async () => { try { await fs.unlink(recoveryPath()) } catch { /* niente da cancellare */ } })

  ipcMain.on('window:title', (_e, title: string) => win?.setTitle(title))
  ipcMain.on('app:close-now', () => {
    forceClose = true
    win?.close()
  })
}

// ---------------------------------------------------------------- avvio

app.whenReady().then(() => {
  // blocca ogni richiesta di rete: l'app funziona solo in locale
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url
    const local = u.startsWith('file://') || u.startsWith('devtools://') || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1') || u.startsWith('ws://localhost') || u.startsWith('ws://127.0.0.1')
    cb({ cancel: !local })
  })
  registerIpc()
  buildMenu()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => { forceClose = true })
app.on('window-all-closed', () => { if (!isMac) app.quit() })
