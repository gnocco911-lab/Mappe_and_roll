// Piccole icone vettoriali (tracciati semplici su griglia 24x24), disegnate qui: nessuna dipendenza esterna.
const P: Record<string, string> = {
  select: 'M5 3l13 7-6 1.5L9.5 18z',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V11m0-6.5a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0V13m0-3.5a1.5 1.5 0 013 0V16a6 6 0 01-6 6h-1.5a6 6 0 01-4.8-2.4L4 15.5a1.6 1.6 0 012.5-2L8 15',
  brush: 'M18 3l3 3-9 9-3-3zM9 12l-4 1c-1 1-1 3-2.5 4.5 3 .8 5.5-.2 6.5-2.5z',
  bucket: 'M5 11l7-7 7 7-7 7zM3 20h18M19 14c1.5 2 1.5 3 0 4',
  rect: 'M4 6h16v12H4z',
  poly: 'M5 17l2-11 8-2 5 7-4 8z',
  eraser: 'M4 16l9-10 7 6-6 7H8zM9 21h11',
  wall: 'M3 9h18M3 15h18M8 9v6M13 9v6M18 9v6M5.5 5h13',
  wallRect: 'M4 5h16v14H4zM4 12h16M12 5v14',
  wallErase: 'M4 17l7-9 6 5-5 6zM3 21h14M14 4l6 6',
  door: 'M6 21V4h12v17M6 21h12M14 12.5v.1',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  note: 'M5 4h14v11l-5 5H5zM14 20v-5h5M8 9h8M8 13h4',
  arrow: 'M4 20L19 5M10 5h9v9',
  number: 'M12 3a9 9 0 100 18 9 9 0 000-18zM10 9l2-1.5V16',
  undo: 'M9 7L4 12l5 5M4 12h10a6 6 0 010 12',
  redo: 'M15 7l5 5-5 5M20 12H10a6 6 0 000 12',
  save: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7',
  open: 'M3 7a1 1 0 011-1h5l2 2h8a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  new: 'M6 3h8l4 4v14H6zM14 3v4h4M12 11v6M9 14h6',
  export: 'M12 3v12M7 10l5 5 5-5M5 20h14',
  grid: 'M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16',
  snap: 'M12 3v18M3 12h18M12 8a4 4 0 100 8 4 4 0 000-8z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  eyeOff: 'M3 3l18 18M10.5 6.2A9.6 9.6 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.6 7.6A16 16 0 002 12s4 7 10 7a9.5 9.5 0 004.2-1M9.9 9.9a3 3 0 004.2 4.2',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4',
  unlock: 'M6 11h12v10H6zM8 11V7a4 4 0 017.5-2',
  rotateL: 'M4 12a8 8 0 108-8H8M8 1L4 4l4 3',
  rotateR: 'M20 12a8 8 0 11-8-8h4M16 1l4 3-4 3',
  flipH: 'M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z',
  flipV: 'M3 12h18M7 8L12 3l5 5zM7 16l5 5 5-5z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  plus: 'M12 5v14M5 12h14',
  search: 'M10 4a6 6 0 100 12 6 6 0 000-12zM15 15l6 6',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9.5a1.5 1.5 0 100 .1',
  folder: 'M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1.5-2-3.4-2.4.7-1.7-1L14.5 4h-4l-.4 2.8-1.7 1L6 7.1 4 10.5 6 12l-.1 2 .1 0-2 1.5 2 3.4 2.4-.7 1.7 1L9.5 22h4l.4-2.8 1.7-1 2.4.7 2-3.4-2-1.5z',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5L12 22l9-4.5',
  front: 'M8 8h12v12H8zM4 4h12v3',
  back: 'M4 4h12v12H4zM8 20h12V8h-3',
  help: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5M12 17v.1',
  dice: 'M5 3h14v18H5zM9 8v.1M15 8v.1M12 12v.1M9 16v.1M15 16v.1',
  scissors: 'M6 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM8 7l12 11M8 17L20 6',
  check: 'M5 12l5 5 9-10',
  close: 'M6 6l12 12M18 6L6 18'
}

export function Icon({ name, size = 20, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] ?? P.select} />
    </svg>
  )
}
