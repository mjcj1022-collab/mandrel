import { useEffect, useState } from 'react'
import { apiConfigured, apiHealth } from '../lib/api'

type State = 'standalone' | 'checking' | 'connected' | 'offline'

const LABEL: Record<State, string> = {
  standalone: 'Standalone',
  checking: 'Backend…',
  connected: 'Backend ✓',
  offline: 'Backend offline',
}
const TITLE: Record<State, string> = {
  standalone: 'Running locally on this browser — set VITE_API_URL to connect the live API',
  checking: 'Checking the backend…',
  connected: 'Connected to the live API',
  offline: 'Backend is configured but unreachable — a free host may be waking up (retrying)',
}

/**
 * Masthead pill showing whether the app is talking to the live API. Pings
 * /api/health on mount and every 30 s; shows Standalone when no backend is
 * configured (VITE_API_URL unset). Never throws — offline just shows amber.
 */
export function BackendStatus() {
  const [state, setState] = useState<State>(apiConfigured() ? 'checking' : 'standalone')

  useEffect(() => {
    if (!apiConfigured()) return
    let alive = true
    const ac = new AbortController()
    const ping = async () => {
      const ok = await apiHealth(ac.signal)
      if (alive) setState(ok ? 'connected' : 'offline')
    }
    ping()
    const t = setInterval(ping, 30000)
    return () => { alive = false; clearInterval(t); ac.abort() }
  }, [])

  return (
    <span className={`mast-conn ${state}`} title={TITLE[state]} aria-label={TITLE[state]}>
      <i className="dot" aria-hidden="true" />{LABEL[state]}
    </span>
  )
}
