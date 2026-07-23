import { Component, type ReactNode } from 'react'

/**
 * Keeps a failed image-based-lighting load from taking down the whole scene.
 * The Sculpt studio pulls its HDR environment from a CDN; if that fetch fails
 * (offline, CDN outage, blocked network) the loader throws during render, which
 * without a boundary unmounts the entire app. Here we simply drop the
 * environment on error — the ambient + directional lights still light the piece,
 * so the modeler stays usable instead of white-screening.
 */
export class EnvBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { /* swallowed: lighting degrades gracefully */ }
  render() { return this.state.failed ? null : this.props.children }
}
