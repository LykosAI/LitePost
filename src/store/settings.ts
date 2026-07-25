import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadFromFile, saveToFile } from '@/utils/persistence'

export interface JSONViewerSettings {
  maxAutoExpandDepth: number
  maxAutoExpandArraySize: number
  maxAutoExpandObjectSize: number
}

export interface NetworkSettings {
  timeout: number         // total request timeout in seconds (0 = no timeout)
  connectTimeout: number  // connection timeout in seconds
  sslVerification: boolean
  proxy: string           // proxy URL or empty string
}

interface SettingsState {
  jsonViewer: JSONViewerSettings
  network: NetworkSettings
  updateJSONViewerSettings: (settings: Partial<JSONViewerSettings>) => Promise<void>
  updateNetworkSettings: (settings: Partial<NetworkSettings>) => Promise<void>
}

const SETTINGS_FILE = 'settings.json'
const defaultJSONSettings: JSONViewerSettings = {
  maxAutoExpandDepth: 2,
  maxAutoExpandArraySize: 50,
  maxAutoExpandObjectSize: 20,
}

export const defaultNetworkSettings: NetworkSettings = {
  timeout: 30,
  connectTimeout: 10,
  sslVerification: true,
  proxy: '',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      jsonViewer: defaultJSONSettings,
      network: defaultNetworkSettings,
      updateJSONViewerSettings: async (settings) => {
        const nextSettings = { ...get().jsonViewer, ...settings }
        set({ jsonViewer: nextSettings })
        await saveToFile(SETTINGS_FILE, { jsonViewer: nextSettings, network: get().network })
      },
      updateNetworkSettings: async (settings) => {
        const nextNetwork = { ...get().network, ...settings }
        set({ network: nextNetwork })
        await saveToFile(SETTINGS_FILE, { jsonViewer: get().jsonViewer, network: nextNetwork })
      }
    }),
    {
      name: 'settings-storage',
      storage: {
        getItem: async () => {
          const data = await loadFromFile<{
            jsonViewer: Partial<JSONViewerSettings>
            network?: Partial<NetworkSettings>
          }>(SETTINGS_FILE, { jsonViewer: defaultJSONSettings })
          return {
            state: {
              jsonViewer: {
                ...defaultJSONSettings,
                ...(data?.jsonViewer || {})
              },
              network: {
                ...defaultNetworkSettings,
                ...(data?.network || {})
              }
            }
          }
        },
        setItem: async (_, value) => {
          await saveToFile(SETTINGS_FILE, {
            jsonViewer: value.state.jsonViewer,
            network: value.state.network
          })
        },
        removeItem: () => {}
      }
    }
  )
)
