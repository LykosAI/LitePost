import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadFromFile, saveToFile } from '@/utils/persistence'

export interface Environment {
  id: string
  name: string
  variables: { [key: string]: string }
}

interface EnvironmentState {
  environments: Environment[]
  activeEnvironmentId: string | null
  addEnvironment: (name: string) => void
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  deleteEnvironment: (id: string) => void
  setActiveEnvironment: (id: string | null) => void
  getVariable: (key: string) => string | undefined
}

interface PersistedEnvironmentState {
  environments: Environment[]
  activeEnvironmentId: string | null
}

const ENVIRONMENTS_FILE = 'environments.json'
const defaultData: PersistedEnvironmentState = {
  environments: [],
  activeEnvironmentId: null
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      ...defaultData,
      addEnvironment: (name) => {
        const newEnvironment: Environment = {
          id: crypto.randomUUID(),
          name,
          variables: {}
        }
        set((state) => ({
          environments: [...state.environments, newEnvironment]
        }))
      },
      updateEnvironment: (id, updates) => {
        set((state) => ({
          environments: state.environments.map(env =>
            env.id === id ? { ...env, ...updates } : env
          )
        }))
      },
      deleteEnvironment: (id) => {
        set((state) => ({
          environments: state.environments.filter(env => env.id !== id),
          activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId
        }))
      },
      setActiveEnvironment: (id) => {
        set({ activeEnvironmentId: id })
      },
      getVariable: (key) => {
        const activeEnv = get().environments.find(env => env.id === get().activeEnvironmentId)
        return activeEnv?.variables[key]
      }
    }),
    {
      name: 'environment-storage',
      storage: {
        getItem: async () => {
          const data = await loadFromFile<PersistedEnvironmentState>(ENVIRONMENTS_FILE, defaultData)
          return { state: data }
        },
        setItem: async (_, value) => {
          await saveToFile(ENVIRONMENTS_FILE, value.state as PersistedEnvironmentState)
        },
        removeItem: () => {}
      }
    }
  )
)