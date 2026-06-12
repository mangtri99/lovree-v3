export type MediaKind = 'image' | 'audio'
export interface MediaInput { kind: MediaKind; size: number; bytes: Buffer | Uint8Array }
export type MediaResult =
  | { ok: true; ext: string; contentType: string }
  | { ok: false; error: string }

const LIMITS: Record<MediaKind, number> = { image: 2 * 1024 * 1024, audio: 5 * 1024 * 1024 }

function startsWith(b: Uint8Array, sig: number[], offset = 0): boolean {
  for (let i = 0; i < sig.length; i++) if (b[offset + i] !== sig[i]) return false
  return true
}

function sniff(b: Uint8Array): { ext: string; contentType: string; kind: MediaKind } | null {
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return { ext: 'png', contentType: 'image/png', kind: 'image' }
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { ext: 'jpg', contentType: 'image/jpeg', kind: 'image' }
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return { ext: 'webp', contentType: 'image/webp', kind: 'image' }
  if (startsWith(b, [0x49, 0x44, 0x33])) return { ext: 'mp3', contentType: 'audio/mpeg', kind: 'audio' } // ID3
  if (startsWith(b, [0xff, 0xfb]) || startsWith(b, [0xff, 0xf3]) || startsWith(b, [0xff, 0xf2])) return { ext: 'mp3', contentType: 'audio/mpeg', kind: 'audio' } // MPEG frame
  return null
}

export function validateMediaUpload(input: MediaInput): MediaResult {
  if (input.size > LIMITS[input.kind]) return { ok: false, error: 'File too large' }
  const detected = sniff(input.bytes)
  if (!detected || detected.kind !== input.kind) return { ok: false, error: 'Unsupported or mismatched file type' }
  return { ok: true, ext: detected.ext, contentType: detected.contentType }
}
