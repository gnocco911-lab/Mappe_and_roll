// Conversioni tra byte e data URL (le immagini sono tenute in memoria come data URL).
export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[])
  }
  return `data:${mime};base64,${btoa(bin)}`
}

export function dataUrlToBytes(url: string): { mime: string; bytes: Uint8Array } {
  const comma = url.indexOf(',')
  const head = url.slice(5, comma)
  const mime = head.split(';')[0] || 'application/octet-stream'
  const body = url.slice(comma + 1)
  if (head.includes('base64')) {
    const bin = atob(body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { mime, bytes }
  }
  return { mime, bytes: new TextEncoder().encode(decodeURIComponent(body)) }
}

export const extFromMime = (mime: string) =>
  mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : mime.includes('svg') ? 'svg' : mime.includes('gif') ? 'gif' : 'bin'

export function mimeFromName(name: string): string {
  const e = name.toLowerCase().split('.').pop()
  return e === 'png' ? 'image/png' : e === 'jpg' || e === 'jpeg' ? 'image/jpeg' : e === 'webp' ? 'image/webp' : e === 'svg' ? 'image/svg+xml' : e === 'gif' ? 'image/gif' : 'application/octet-stream'
}
