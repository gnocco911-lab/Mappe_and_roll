// Generatori procedurali (caverne, dungeon) con seme: stesso seme = stessa mappa.
import { makeRng } from './textures'
import { getGrid, cellKey } from './grid'

/** Caverna con automa cellulare. Restituisce l'insieme delle caselle libere ("c,r"). */
export function generateCave(cols: number, rows: number, seed: number, density = 0.46): Set<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const rnd = makeRng(seed + attempt * 7919)
    let wall: boolean[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => c === 0 || r === 0 || c === cols - 1 || r === rows - 1 || rnd() < density)
    )
    for (let it = 0; it < 5; it++) {
      const next = wall.map((row) => row.slice())
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          let n = 0
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (wall[r + dr][c + dc]) n++
          next[r][c] = n >= 5
        }
      }
      wall = next
    }
    // si tiene solo la regione connessa più grande
    const seen = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
    let best: [number, number][] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (wall[r][c] || seen[r][c]) continue
        const region: [number, number][] = []
        const stack: [number, number][] = [[c, r]]
        seen[r][c] = true
        while (stack.length) {
          const [cc, rr] = stack.pop()!
          region.push([cc, rr])
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = cc + dc, nr = rr + dr
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || wall[nr][nc] || seen[nr][nc]) continue
            seen[nr][nc] = true
            stack.push([nc, nr])
          }
        }
        if (region.length > best.length) best = region
      }
    }
    if (best.length >= cols * rows * 0.28) return new Set(best.map(([c, r]) => cellKey(c, r)))
  }
  // ripiego: una grande stanza ovale
  const out = new Set<string>()
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const dx = (c - cols / 2) / (cols / 2), dy = (r - rows / 2) / (rows / 2)
    if (dx * dx + dy * dy < 0.8) out.add(cellKey(c, r))
  }
  return out
}

export interface DungeonRoom { c: number; r: number; w: number; h: number }

export interface DungeonResult {
  rooms: DungeonRoom[]
  /** caselle di corridoio */
  corridors: Set<string>
  /** porte: bordo → true */
  doors: string[]
}

/** Dungeon a stanze e corridoi, su griglia quadrata. */
export function generateDungeon(cols: number, rows: number, seed: number, roomCount = 9): DungeonResult {
  const rnd = makeRng(seed)
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
  const rooms: DungeonRoom[] = []
  for (let tries = 0; tries < 400 && rooms.length < roomCount; tries++) {
    const w = ri(4, 9)
    const h = ri(4, 8)
    const c = ri(1, cols - w - 2)
    const r = ri(1, rows - h - 2)
    if (c < 1 || r < 1 || c + w > cols - 1 || r + h > rows - 1) continue
    // le stanze non si toccano (lasciano almeno 2 caselle di distanza)
    if (rooms.some((o) => c < o.c + o.w + 2 && c + w + 2 > o.c && r < o.r + o.h + 2 && r + h + 2 > o.r)) continue
    rooms.push({ c, r, w, h })
  }
  rooms.sort((a, b) => a.c - b.c)
  const corridors = new Set<string>()
  const centerOf = (o: DungeonRoom): [number, number] => [o.c + Math.floor(o.w / 2), o.r + Math.floor(o.h / 2)]
  const carve = (x1: number, y1: number, x2: number, y2: number) => {
    let x = x1, y = y1
    const horizFirst = rnd() < 0.5
    const goX = () => { while (x !== x2) { corridors.add(cellKey(x, y)); x += Math.sign(x2 - x) } }
    const goY = () => { while (y !== y2) { corridors.add(cellKey(x, y)); y += Math.sign(y2 - y) } }
    if (horizFirst) { goX(); goY() } else { goY(); goX() }
    corridors.add(cellKey(x2, y2))
  }
  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay] = centerOf(rooms[i - 1])
    const [bx, by] = centerOf(rooms[i])
    carve(ax, ay, bx, by)
  }
  // qualche collegamento in più per creare anelli
  for (let i = 0; i < Math.floor(rooms.length / 4); i++) {
    const a = rooms[ri(0, rooms.length - 1)]
    const b = rooms[ri(0, rooms.length - 1)]
    if (a !== b) { const [ax, ay] = centerOf(a); const [bx, by] = centerOf(b); carve(ax, ay, bx, by) }
  }
  return { rooms, corridors, doors: [] }
}

export { getGrid }
