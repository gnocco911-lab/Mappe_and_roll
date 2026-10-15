// Modalità "solo browser": utile per sviluppo e per i test automatici.
// Non fa parte dell'app distribuita.
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
  plugins: [react()],
  server: { port: 5199, host: '127.0.0.1' }
})
