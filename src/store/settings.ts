import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadFromFile, saveToFile } from '@/utils/persistence'

export interface JSONViewerSettings {
  maxAutoExpandDepth: number
  maxAutoExpandArraySize: number
  maxAutoExpandObjectSize: number
}

interface SettingsState {
  jsonViewer: JSONViewerSettings
  updateJSONViewerSettings: (settings: Partial<JSONViewerSettings>) => Promise<void>
}

const SETTINGS_FILE = 'settings.json'
const defaultSettings: JSONViewerSettings = {
  maxAutoExpandDepth: 2,
  maxAutoExpandArraySize: 50,
  maxAutoExpandObjectSize: 20,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      jsonViewer: defaultSettings,
      updateJSONViewerSettings: async (settings) => {
        set((state) => ({ jsonViewer: { ...state.jsonViewer, ...settings } }))
        await saveToFile(SETTINGS_FILE, { jsonViewer: settings })
      }
    }),
    {
      name: 'settings-storage',
      storage: {
        getItem: async () => {
          const data = await loadFromFile<{ jsonViewer: JSONViewerSettings }>(SETTINGS_FILE, { jsonViewer: defaultSettings })
          return { state: { jsonViewer: data.jsonViewer } }
        },
        setItem: async (_, value) => {
          await saveToFile(SETTINGS_FILE, { jsonViewer: value.state.jsonViewer })
        },
        removeItem: () => {}
      }
    }
  )
) 