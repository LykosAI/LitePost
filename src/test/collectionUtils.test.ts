import { describe, it, expect } from 'vitest'
import { savedRequestToTab } from '@/components/collections/collectionUtils'
import { SavedRequest } from '@/types'

describe('savedRequestToTab', () => {
  it('preserves graphql and multipart form-data fields', () => {
    const request: SavedRequest = {
      id: 'saved-1',
      name: 'Upload Avatar',
      method: 'POST',
      url: 'https://api.example.com/upload',
      rawUrl: 'https://api.example.com/upload',
      params: [],
      headers: [],
      body: 'avatar: [file: me.png]',
      contentType: 'multipart/form-data',
      auth: { type: 'none' },
      cookies: [],
      testScripts: [],
      testAssertions: [],
      testResults: null,
      graphqlQuery: 'query { viewer { id } }',
      graphqlVariables: '{"id":1}',
      graphqlOperationName: 'ViewerQuery',
      isGraphQL: true,
      formDataEntries: [
        {
          id: 'form-1',
          key: 'avatar',
          value: '',
          type: 'file',
          fileName: 'me.png',
          enabled: true,
        },
      ],
    }

    const tab = savedRequestToTab(request)

    expect(tab.formDataEntries).toEqual(request.formDataEntries)
    expect(tab.graphqlQuery).toBe(request.graphqlQuery)
    expect(tab.graphqlVariables).toBe(request.graphqlVariables)
    expect(tab.graphqlOperationName).toBe(request.graphqlOperationName)
    expect(tab.isGraphQL).toBe(true)
  })
})
