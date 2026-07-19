import type { DesignSpec } from '../spec/types'

/**
 * Encode a design into a URL-safe token and back. The full spec travels in the
 * link, so a client can open the exact design with no login — the basis for the
 * no-login share/approve flow.
 */
export function encodeSpec(spec: DesignSpec): string {
  const json = JSON.stringify(spec)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSpec(token: string): DesignSpec | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const obj = JSON.parse(json)
    return obj && obj.version === 1 ? (obj as DesignSpec) : null
  } catch {
    return null
  }
}

export function shareUrl(spec: DesignSpec): string {
  const base = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  return `${base}?d=${encodeSpec(spec)}`
}

export function specFromUrl(): DesignSpec | null {
  if (typeof location === 'undefined') return null
  const token = new URLSearchParams(location.search).get('d')
  return token ? decodeSpec(token) : null
}
