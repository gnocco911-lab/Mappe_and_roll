// Configurazione della compilazione (electron-vite):
// compila separatamente il processo principale, il preload e l'interfaccia (renderer).
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: { '@': resolve(__dirname, 'src/renderer/src') }
    },
    plugins: [react()],
    build: {
      // l'interfaccia è caricata da file locali: niente CDN, niente rete
      chunkSizeWarningLimit: 3000
    }
  }
})
