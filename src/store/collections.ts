import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  createdAt: Date
  updatedAt: Date
}

interface CollectionStore {
  collections: Collection[]
  addCollection: (name: string, description?: string, id?: string) => string
  updateCollection: (id: string, updates: Partial<Collection>) => void
  deleteCollection: (id: string) => void
  addRequest: (collectionId: string, request: Omit<SavedRequest, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) => void
  deleteRequest: (collectionId: string, requestId: string) => void
  importCollections: (collections: Collection[]) => void
  exportCollections: () => string
  exportToPostman: () => string
  importFromPostman: (json: string) => void
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      collections: [],

      addCollection: (name, description, id) => {
        const collectionId = id || crypto.randomUUID()
        set((state) => ({
          collections: [...state.collections, {
            id: collectionId,
            name,
            description,
            requests: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        }))
        return collectionId
      },

      updateCollection: (id, updates) => set((state) => ({
        collections: state.collections.map(collection => 
          collection.id === id 
            ? { 
                ...collection, 
                ...updates, 
                updatedAt: new Date() 
              } 
            : collection
        )
      })),

      deleteCollection: (id) => set((state) => ({
        collections: state.collections.filter(collection => collection.id !== id)
      })),

      addRequest: (collectionId, request) => set((state) => ({
        collections: state.collections.map(collection =>
          collection.id === collectionId
            ? {
                ...collection,
                requests: [...collection.requests, {
                  ...request,
                  id: crypto.randomUUID(),
                  createdAt: new Date(),
                  updatedAt: new Date()
                }],
                updatedAt: new Date()
              }
            : collection
        )
      })),

      updateRequest: (collectionId, requestId, updates) => set((state) => ({
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
      })),

      deleteRequest: (collectionId, requestId) => set((state) => ({
        collections: state.collections.map(collection =>
          collection.id === collectionId
            ? {
                ...collection,
                requests: collection.requests.filter(request => request.id !== requestId),
                updatedAt: new Date()
              }
            : collection
        )
      })),

      importCollections: (collections) => set((state) => ({
        collections: [
          ...state.collections.filter(
            c => !collections.some(newCol => newCol.id === c.id)
          ),
          ...collections
        ]
      })),

      exportCollections: () => JSON.stringify(get().collections, null, 2),

      exportToPostman: () => JSON.stringify(exportToPostman(get().collections), null, 2),

      importFromPostman: (json) => {
        try {
          const postmanCollections = JSON.parse(json)
          const collections = importFromPostman(
            Array.isArray(postmanCollections) 
              ? postmanCollections 
              : [postmanCollections]
          )
          set((state) => ({
            collections: [
              ...state.collections.filter(
                c => !collections.some(newCol => newCol.id === c.id)
              ),
              ...collections
            ]
          }))
        } catch (error) {
          console.error('Failed to import Postman collection:', error)
          throw new Error('Invalid Postman collection format')
        }
      }
    }),
    {
      name: 'collection-storage'
    }
  )
) 