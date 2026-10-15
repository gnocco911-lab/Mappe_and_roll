// Piccoli controlli riutilizzabili: campo numerico, selettore colore con attesa, interruttore.
import { useEffect, useRef, useState } from 'react'

export function NumInput({
  value, onCommit, min, max, step = 0.5, width = 64, decimals = 2, title, disabled
}: {
  value: number
  onCommit: (v: number) => void
  min?: number
  max?: number
  step?: number
  width?: number
  decimals?: number
  title?: string
  disabled?: boolean
}) {
  const fmt = (v: number) => String(Number(v.toFixed(decimals)))
  const [txt, setTxt] = useState(fmt(value))
  useEffect(() => setTxt(fmt(value)), [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    let v = parseFloat(txt.replace(',', '.'))
    if (!isFinite(v)) { setTxt(fmt(value)); return }
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    if (v !== value) onCommit(v)
    setTxt(fmt(v))
  }
  return (
    <input
      className="num"
      style={{ width }}
      value={txt}
      title={title}
      disabled={disabled}
      inputMode="decimal"
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() }
        else if (e.key === 'ArrowUp') { e.preventDefault(); const v = value + step; onCommit(max !== undefined ? Math.min(max, v) : v) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); const v = value - step; onCommit(min !== undefined ? Math.max(min, v) : v) }
        e.stopPropagation()
      }}
    />
  )
}

/** Selettore di colore: applica il valore dopo una breve pausa (un solo passo di annulla). */
export function ColorInput({ value, onCommit, title }: { value: string; onCommit: (c: string) => void; title?: string }) {
  const [v, setV] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => setV(value), [value])
  return (
    <input
      type="color"
      className="color"
      value={v}
      title={title}
      onChange={(e) => {
        const c = e.target.value
        setV(c)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => onCommit(c), 300)
      }}
    />
  )
}

export function Toggle({ checked, onChange, label, title }: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  return (
    <label className="toggle" title={title}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
