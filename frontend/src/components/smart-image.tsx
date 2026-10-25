import { useState, type ComponentProps, type ReactNode } from 'react'

// <img> that swaps to `fallback` when the src is empty or fails to load (e.g. placeholder paths).
export function SmartImage({ src, fallback, ...props }: ComponentProps<'img'> & { fallback: ReactNode }) {
  const [failed, setFailed] = useState<string>()
  if (!src || failed === src) return fallback
  return <img src={src} decoding="async" onError={() => setFailed(src)} {...props} />
}
