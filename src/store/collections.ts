import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadFromFile, saveToFile, convertDates } from '@/utils/persistence'
import { Collection, SavedRequest } from '@/types'
import { exportToPostman, importFromPostman } from '@/utils/collection-converter'

const COLLECTIONS_FILE = 'collections.json'

const defaultData = { collections: [] }

const normalizeDate = (value: unknown, fallback: Date = new Date()): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return fallback
}

const toISOStringSafe = (value: unknown): string => normalizeDate(value).toISOString()

interface CollectionState {
  collections: Collection[]
  addCollection: (name: string, description?: string, id?: string) => string
  updateCollection: (id: string, updates: Partial<Collection>) => void
  deleteCollection: (id: string) => void
  addRequest: (collectionId: string, request: Omit<SavedRequest, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) => void
  deleteRequest: (collectionId: string, requestId: string) => void
  importCollections: (newCollections: Collection[]) => void
  exportCollections: () => string
  exportToPostman: () => string
  importFromPostman: (json: string) => Promise<void>
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],
      addCollection: (name, description, id) => {
        const collectionId = id || crypto.randomUUID()
        const newCollection: Collection = {
          id: collectionId,
          name,
          description,
          requests: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state) => ({
          collections: [...state.collections, newCollection]
        }))
        return collectionId
      },
      updateCollection: (id, updates) => {
        set((state) => ({
          collections: state.collections.map(collection =>
            collection.id === id
              ? {
                  ...collection,
                  ...updates,
                  updatedAt: new Date()
                }
              : collection
          )
        }))
      },
      deleteCollection: (id) => {
        set((state) => ({
          collections: state.collections.filter(collection => collection.id !== id)
        }))
      },
      addRequest: (collectionId, request) => {
        set((state) => ({
          collections: state.collections.map(collection =>
            collection.id === collectionId
              ? {
                  ...collection,
                  requests: [
                    ...collection.requests,
                    {
                      ...request,
                      id: crypto.randomUUID(),
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  ],
                  updatedAt: new Date()
                }
              : collection
          )
        }))
      },
      updateRequest: (collectionId, requestId, updates) => {
        set((state) => ({
          collections: state.collections.map(collection =>
            collection.id === collectionId
              ? {
                  ...collection,
                  requests: collection.requests.map(request =>
                    request.id === requestId
                      ? { ...request, ...updates, updatedAt: new Date() }
                      : request
                  ),
                  updatedAt: new Date()
                }
              : collection
          )
        }))
      },
      deleteRequest: (collectionId, requestId) => {
        set((state) => ({
          collections: state.collections.map(collection =>
            collection.id === collectionId
              ? {
                  ...collection,
                  requests: collection.requests.filter(request => request.id !== requestId),
                  updatedAt: new Date()
                }
              : collection
          )
        }))
      },
      importCollections: (newCollections) => {
        // Ensure all dates are Date objects
        const collectionsWithDates = newCollections.map(collection => ({
          ...collection,
          createdAt: normalizeDate(collection.createdAt),
          updatedAt: normalizeDate(collection.updatedAt),
          requests: collection.requests.map(request => ({
            ...request,
            createdAt: normalizeDate(request.createdAt),
            updatedAt: normalizeDate(request.updatedAt)
          }))
        }))

        // Merge with existing collections
        const merged = [
          ...get().collections.filter(
            c => !collectionsWithDates.some(newCol => newCol.id === c.id)
          ),
          ...collectionsWithDates
        ]

        set({ collections: merged })
      },
      exportCollections: () => {
        return JSON.stringify(get().collections, null, 2)
      },
      exportToPostman: () => {
        return JSON.stringify(exportToPostman(get().collections), null, 2)
      },
      importFromPostman: async (json) => {
        try {
          const postmanCollections = JSON.parse(json)
          const imported = importFromPostman(
            Array.isArray(postmanCollections)
              ? postmanCollections
              : [postmanCollections]
          )
          get().importCollections(imported)
        } catch (error) {
          console.error('Failed to import Postman collection:', error)
          throw new Error('Invalid Postman collection format')
        }
      }
    }),
    {
      name: 'collection-storage',
      storage: {
        getItem: async () => {
          const data = await loadFromFile<{ collections: Collection[] }>(
            COLLECTIONS_FILE, 
            defaultData
          )
          const collections = data?.collections ? convertDates<Collection[]>(data.collections) : []
          return { state: { collections } }
        },
        setItem: async (_, value) => {
          const collections = value.state.collections.map(c => ({
            ...c,
            createdAt: toISOStringSafe(c.createdAt),
            updatedAt: toISOStringSafe(c.updatedAt),
            requests: c.requests.map(r => ({
              ...r,
              createdAt: toISOStringSafe(r.createdAt),
              updatedAt: toISOStringSafe(r.updatedAt)
            }))
          }))
          await saveToFile(COLLECTIONS_FILE, { collections })
        },
        removeItem: () => {}
      }
    }
  )
) 
