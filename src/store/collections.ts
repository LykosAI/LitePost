import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadFromFile, saveToFile, convertDates } from '@/utils/persistence'
import { Tab } from '@/types'
import { exportToPostman, importFromPostman } from '@/utils/collection-converter'

export interface Collection {
  id: string
  name: string
  description?: string
  requests: SavedRequest[]
  createdAt: Date
  updatedAt: Date
}

export interface SavedRequest {
  id: string
  name: string
  method: string
  url: string
  rawUrl: string
  params: Tab['params']
  headers: Tab['headers']
  body: string
  contentType: string
  auth: Tab['auth']
  cookies: Tab['cookies']
  testScripts: Tab['testScripts']
  testAssertions: Tab['testAssertions']
  testResults: Tab['testResults']
  createdAt: Date
  updatedAt: Date
}

const COLLECTIONS_FILE = 'collections.json'

const defaultData = { collections: [] }

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
        const merged = [
          ...get().collections.filter(
            c => !newCollections.some(newCol => newCol.id === c.id)
          ),
          ...convertDates<Collection[]>(newCollections)
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
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            requests: c.requests.map(r => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString()
            }))
          }))
          await saveToFile(COLLECTIONS_FILE, { collections })
        },
        removeItem: () => {}
      }
    }
  )
) 