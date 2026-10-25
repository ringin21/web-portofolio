import type { Portfolio } from './types'

// Laravel sets the XSRF-TOKEN cookie; echoing it back as a header passes its CSRF check.
export function api(path: string, method = 'GET', body?: unknown) {
  const xsrf = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1]
  return fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(xsrf && { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

let portfolio: Promise<Portfolio> | undefined

// Memoized so main.tsx can start the request while the page chunk is still downloading;
// a failed request is forgotten so the next call retries.
export function loadPortfolio(): Promise<Portfolio> {
  // Plain GET (no custom headers) so it reuses the <link rel="preload"> in index.html.
  portfolio ??= fetch('/api/portfolio')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    // Content saved before a field existed lacks it; default so the UI can always .map().
    .then((d: Portfolio) => ({ ...d, education: d.education ?? [], companies: d.companies.map((c) => ({ ...c, logo: c.logo ?? '' })) }))
    .catch((e) => {
      portfolio = undefined
      throw e
    })
  return portfolio
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

const MAX_EDGE = 1600
const MAX_BYTES = 2 * 1024 * 1024
export const ACCEPTED = 'image/jpeg,image/png,image/webp'

// Downscale large photos (and re-encode as WebP) so camera files fit the server limit and the site stays light.
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= MAX_BYTES / 2) return file
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })
    return blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : file
  } catch {
    return file // not decodable in this browser: let the server judge it
  }
}

/** Uploads an image and resolves with its public URL; rejects with a user-facing message. */
export async function uploadImage(file: File): Promise<string> {
  if (!ACCEPTED.split(',').includes(file.type)) throw new Error('Format yang didukung: JPG, PNG, atau WebP.')
  const body = new FormData()
  body.append('file', await shrink(file))
  const xsrf = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1]
  // No Content-Type header: the browser must set the multipart boundary itself.
  const r = await fetch('/api/admin/uploads', {
    method: 'POST',
    headers: { Accept: 'application/json', ...(xsrf && { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) }) },
    body,
  }).catch(() => null)
  const json = await r?.json().catch(() => ({}))
  if (r?.ok) return json.url
  if (r?.status === 401 || r?.status === 419) throw new Error('Sesi berakhir. Muat ulang halaman dan masuk kembali.')
  if (r?.status === 413) throw new Error('Ukuran file terlalu besar.')
  throw new Error(json?.errors?.file?.[0] ?? (r ? 'Unggahan gagal. Coba lagi.' : 'Tidak dapat terhubung ke server.'))
}
