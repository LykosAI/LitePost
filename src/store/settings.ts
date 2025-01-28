import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface JSONViewerSettings {
  maxAutoExpandDepth: number
  maxAutoExpandArraySize: number
  maxAutoExpandObjectSize: number
}

export interface SettingsState {
  jsonViewer: JSONViewerSettings
  updateJSONViewerSettings: (settings: Partial<JSONViewerSettings>) => void
}

const defaultSettings: JSONViewerSettings = {
  maxAutoExpandDepth: 2,
  maxAutoExpandArraySize: 50,
  maxAutoExpandObjectSize: 20,
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      jsonViewer: defaultSettings,
      updateJSONViewerSettings: (settings) =>
        set((state) => ({
          jsonViewer: { ...state.jsonViewer, ...settings },
        })),
    }),
    {
      name: 'litepost-settings',
    }
  )
) 