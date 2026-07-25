import { create } from 'zustand'

export type UiPanel = 'settings' | 'collections' | 'environments' | 'curl-import' | 'runner'

interface UiState {
  paletteOpen: boolean
  activePanel: UiPanel | null
  setPaletteOpen: (open: boolean) => void
  togglePalette: () => void
  openPanel: (panel: UiPanel) => void
  closePanel: () => void
}

// Session-only UI state (not persisted): lets the command palette, titlebar,
// and keyboard shortcuts open the same panels without prop drilling.
export const useUiStore = create<UiState>()((set) => ({
  paletteOpen: false,
  activePanel: null,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  openPanel: (panel) => set({ activePanel: panel, paletteOpen: false }),
  closePanel: () => set({ activePanel: null }),
}))
