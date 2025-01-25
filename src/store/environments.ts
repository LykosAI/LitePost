import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Environment {
  id: string
  name: string
  variables: { [key: string]: string }
}

interface EnvironmentStore {
  environments: Environment[]
  activeEnvironmentId: string | null
  addEnvironment: (name: string) => void
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  deleteEnvironment: (id: string) => void
  setActiveEnvironment: (id: string | null) => void
  getVariable: (key: string) => string | undefined
}

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      environments: [],
      activeEnvironmentId: null,

      addEnvironment: (name) => set((state) => ({
        environments: [...state.environments, {
          id: crypto.randomUUID(),
          name,
          variables: {}
        }]
      })),

      updateEnvironment: (id, updates) => set((state) => ({
        environments: state.environments.map(env => 
          env.id === id ? { ...env, ...updates } : env
        )
      })),

      deleteEnvironment: (id) => set((state) => ({
        environments: state.environments.filter(env => env.id !== id),
        activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId
      })),

      setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),

      getVariable: (key) => {
        const state = get()
        const activeEnv = state.environments.find(env => env.id === state.activeEnvironmentId)
        return activeEnv?.variables[key]
      }
    }),
    {
      name: 'environment-storage'
    }
  )
) 