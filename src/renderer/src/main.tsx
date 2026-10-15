import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { useDoc } from './store/docStore'
import { useUI } from './store/uiStore'

// solo in sviluppo: espone gli archivi di stato per i test automatici
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__app = { useDoc, useUI }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
