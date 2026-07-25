import { create } from 'zustand'
import type { ParsedSchema } from '@/utils/graphqlSchema'

interface GraphQLSchemaState {
  schemas: Record<string, ParsedSchema>
  loading: Record<string, boolean>
  errors: Record<string, string | null>
  setSchema: (url: string, schema: ParsedSchema) => void
  setLoading: (url: string, loading: boolean) => void
  setError: (url: string, error: string | null) => void
  clearSchema: (url: string) => void
  getSchema: (url: string) => ParsedSchema | null
  isLoading: (url: string) => boolean
  getError: (url: string) => string | null
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return url
  }
}

export const useGraphQLSchemaStore = create<GraphQLSchemaState>((set, get) => ({
  schemas: {},
  loading: {},
  errors: {},

  setSchema: (url, schema) => {
    const key = normalizeUrl(url)
    set(state => ({
      schemas: { ...state.schemas, [key]: schema },
      errors: { ...state.errors, [key]: null },
    }))
  },

  setLoading: (url, loading) => {
    const key = normalizeUrl(url)
    set(state => ({
      loading: { ...state.loading, [key]: loading },
    }))
  },

  setError: (url, error) => {
    const key = normalizeUrl(url)
    set(state => ({
      errors: { ...state.errors, [key]: error },
    }))
  },

  clearSchema: (url) => {
    const key = normalizeUrl(url)
    set(state => {
      const { [key]: _s, ...schemas } = state.schemas
      const { [key]: _e, ...errors } = state.errors
      return { schemas, errors }
    })
  },

  getSchema: (url) => {
    const key = normalizeUrl(url)
    return get().schemas[key] ?? null
  },

  isLoading: (url) => {
    const key = normalizeUrl(url)
    return get().loading[key] ?? false
  },

  getError: (url) => {
    const key = normalizeUrl(url)
    return get().errors[key] ?? null
  },
}))
