// Finestra di conferma generica (sostituisce window.confirm, che in Electron non è affidabile).
import { create } from 'zustand'

export interface ConfirmButton {
  id: string
  label: string
  kind?: 'primary' | 'danger' | 'normal'
}

interface ConfirmState {
  req: { title: string; message: string; buttons: ConfirmButton[]; resolve: (id: string) => void } | null
  ask: (title: string, message: string, buttons: ConfirmButton[]) => Promise<string>
  answer: (id: string) => void
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  req: null,
  ask: (title, message, buttons) =>
    new Promise((resolve) => set({ req: { title, message, buttons, resolve } })),
  answer: (id) => {
    const r = get().req
    set({ req: null })
    r?.resolve(id)
  }
}))

export const askConfirm = (title: string, message: string, buttons: ConfirmButton[]) => useConfirm.getState().ask(title, message, buttons)
