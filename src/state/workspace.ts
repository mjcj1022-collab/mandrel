import { create } from 'zustand'

export type Workspace = 'design' | 'model' | 'color'

interface WorkspaceStore {
  mode: Workspace
  setMode: (m: Workspace) => void
}

/** Which top-level workspace is showing. Lifted out of App so any panel (e.g.
 *  "Send ring → Sculpt") can switch tabs. */
export const useWorkspace = create<WorkspaceStore>(set => ({
  mode: 'design',
  setMode: mode => set({ mode })
}))
