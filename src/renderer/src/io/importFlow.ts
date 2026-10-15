// Flusso di importazione: dai file scelti alla finestra di revisione e alla libreria.
import { create } from 'zustand'
import type { CustomAsset } from '../types'
import { useUI } from '../store/uiStore'
import { fileToAsset } from './importImages'
import { IMAGE_FILTER, pickFiles, pickFolderImages } from './platform'

interface ImportState {
  drafts: CustomAsset[]
  /** 'new' = nuove immagini, 'edit' = modifica di un elemento già in libreria */
  mode: 'new' | 'edit'
  set: (drafts: CustomAsset[], mode: 'new' | 'edit') => void
}

export const useImport = create<ImportState>((set) => ({
  drafts: [],
  mode: 'new',
  set: (drafts, mode) => set({ drafts, mode })
}))

export async function startImport(files: { name: string; data: Uint8Array }[], category = 'Altro') {
  const drafts: CustomAsset[] = []
  const errors: string[] = []
  for (const f of files) {
    try {
      drafts.push(await fileToAsset(f.name, f.data, category))
    } catch (e) {
      errors.push(f.name)
      console.warn(e)
    }
  }
  if (errors.length) useUI.getState().showToast(`Non importati (formato non valido): ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '…' : ''}`)
  if (!drafts.length) return
  useImport.getState().set(drafts, 'new')
  useUI.getState().openDialog('importImages')
}

export async function importImagesFromDialog(category?: string) {
  const files = await pickFiles([IMAGE_FILTER], true)
  if (files.length) await startImport(files, category)
}

export async function importFolderFromDialog(category?: string) {
  const files = await pickFolderImages()
  if (!files.length) {
    useUI.getState().showToast('Nessuna immagine trovata nella cartella')
    return
  }
  await startImport(files, category)
}

export function editAsset(a: CustomAsset) {
  useImport.getState().set([a], 'edit')
  useUI.getState().openDialog('libraryEdit')
}
