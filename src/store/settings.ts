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

export interface StreamingSettings {
  /**
   * Trailing characters of a stream body to keep, in KB. 0 means unlimited.
   * Caps the per-chunk render cost of long-lived streams.
   */
  maxBufferKB: number
}

interface SettingsState {
  jsonViewer: JSONViewerSettings
  network: NetworkSettings
  streaming: StreamingSettings
  updateJSONViewerSettings: (settings: Partial<JSONViewerSettings>) => Promise<void>
  updateNetworkSettings: (settings: Partial<NetworkSettings>) => Promise<void>
  updateStreamingSettings: (settings: Partial<StreamingSettings>) => Promise<void>
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

export const defaultStreamingSettings: StreamingSettings = {
  maxBufferKB: 2048,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      jsonViewer: defaultJSONSettings,
      network: defaultNetworkSettings,
      streaming: defaultStreamingSettings,
      updateJSONViewerSettings: async (settings) => {
        const nextSettings = { ...get().jsonViewer, ...settings }
        set({ jsonViewer: nextSettings })
        await saveToFile(SETTINGS_FILE, {
          jsonViewer: nextSettings,
          network: get().network,
          streaming: get().streaming,
        })
      },
      updateNetworkSettings: async (settings) => {
        const nextNetwork = { ...get().network, ...settings }
        set({ network: nextNetwork })
        await saveToFile(SETTINGS_FILE, {
          jsonViewer: get().jsonViewer,
          network: nextNetwork,
          streaming: get().streaming,
        })
      },
      updateStreamingSettings: async (settings) => {
        const nextStreaming = { ...get().streaming, ...settings }
        set({ streaming: nextStreaming })
        await saveToFile(SETTINGS_FILE, {
          jsonViewer: get().jsonViewer,
          network: get().network,
          streaming: nextStreaming,
        })
      }
    }),
    {
      name: 'settings-storage',
      storage: {
        getItem: async () => {
          const data = await loadFromFile<{
            jsonViewer: Partial<JSONViewerSettings>
            network?: Partial<NetworkSettings>
            streaming?: Partial<StreamingSettings>
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
              },
              streaming: {
                ...defaultStreamingSettings,
                ...(data?.streaming || {})
              }
            }
          }
        },
        setItem: async (_, value) => {
          await saveToFile(SETTINGS_FILE, {
            jsonViewer: value.state.jsonViewer,
            network: value.state.network,
            streaming: value.state.streaming
          })
        },
        removeItem: () => {}
      }
    }
  )
)
