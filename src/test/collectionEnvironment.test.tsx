import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { savedRequestToTab } from '@/components/collections/collectionUtils'
import { CollectionSettings } from '@/components/collections/CollectionSettings'
import { AuthConfig, Collection, SavedRequest } from '@/types'

const setActiveEnvironment = vi.fn()
const environments = [
  { id: 'env-dev', name: 'dev', variables: { baseUrl: 'https://dev-api.corp' } },
  { id: 'env-prod', name: 'prod', variables: { baseUrl: 'https://api.corp' } },
]

vi.mock('@/store/environments', () => ({
  useEnvironmentStore: () => ({
    environments,
    activeEnvironmentId: 'env-dev',
    setActiveEnvironment,
    getVariable: (key: string) => environments[0].variables[key as 'baseUrl'],
  }),
}))

const oauth: AuthConfig = {
  type: 'oauth2',
  oauth2: { grantType: 'client_credentials', clientId: '{{clientId}}', accessToken: 'tok' },
}

function makeRequest(overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: 'r1',
    name: '/pet — Add a pet',
    method: 'POST',
    url: '{{baseUrl}}/pet',
    rawUrl: '{{baseUrl}}/pet',
    params: [],
    headers: [],
    body: '',
    contentType: 'application/json',
    auth: { type: 'none' },
    cookies: [],
    testScripts: [],
    testAssertions: [],
    testResults: null,
    ...overrides,
  }
}

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return { id: 'c1', name: 'Petstore', requests: [], ...overrides }
}

describe('savedRequestToTab auth inheritance', () => {
  it('opens an inheriting request with the collection auth', () => {
    // Without this an imported spec opens with an empty Auth tab, so the panel
    // shows something different from what will actually be sent.
    const tab = savedRequestToTab(
      makeRequest({ authMode: 'inherit' }),
      makeCollection({ auth: oauth })
    )
    expect(tab.auth).toEqual(oauth)
  })

  it('keeps an overriding request on its own auth', () => {
    const own: AuthConfig = { type: 'bearer', token: 'mine' }
    const tab = savedRequestToTab(
      makeRequest({ auth: own, authMode: 'override' }),
      makeCollection({ auth: oauth })
    )
    expect(tab.auth).toEqual(own)
  })

  it('still works when called without a collection', () => {
    // The old single-argument call sites must keep compiling and behaving.
    const tab = savedRequestToTab(makeRequest({ auth: { type: 'bearer', token: 't' } }))
    expect(tab.auth).toEqual({ type: 'bearer', token: 't' })
  })

  it('carries the parameterized URL through untouched', () => {
    // Substitution happens at send time, not here.
    const tab = savedRequestToTab(makeRequest(), makeCollection())
    expect(tab.rawUrl).toBe('{{baseUrl}}/pet')
  })
})

describe('CollectionSettings', () => {
  const onUpdateCollection = vi.fn()

  beforeEach(() => {
    onUpdateCollection.mockReset()
    setActiveEnvironment.mockReset()
  })

  it('lists the available environments and the current link', () => {
    render(
      <CollectionSettings
        collection={makeCollection({ environmentId: 'env-prod' })}
        onUpdateCollection={onUpdateCollection}
      />
    )
    expect(screen.getByLabelText(/Environment for Petstore/)).toHaveTextContent('prod')
    expect(screen.getByText(/Activated automatically/)).toBeInTheDocument()
  })

  it('summarises the collection auth without expanding it', () => {
    render(
      <CollectionSettings collection={makeCollection({ auth: oauth })} onUpdateCollection={onUpdateCollection} />
    )
    expect(screen.getByText('OAuth 2.0 · token held')).toBeInTheDocument()
  })

  it('distinguishes an OAuth config that has not fetched a token yet', () => {
    const noToken: AuthConfig = {
      type: 'oauth2',
      oauth2: { grantType: 'client_credentials', clientId: 'c' },
    }
    render(
      <CollectionSettings collection={makeCollection({ auth: noToken })} onUpdateCollection={onUpdateCollection} />
    )
    expect(screen.getByText('OAuth 2.0 · no token yet')).toBeInTheDocument()
  })

  it('reveals the full auth editor on demand', () => {
    render(<CollectionSettings collection={makeCollection()} onUpdateCollection={onUpdateCollection} />)

    expect(screen.queryByText(/use this unless they set their own/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/Show auth for Petstore/))
    expect(screen.getByText(/use this unless they set their own/)).toBeInTheDocument()
  })

  it('shows no environment hint when the collection is not linked', () => {
    render(<CollectionSettings collection={makeCollection()} onUpdateCollection={onUpdateCollection} />)
    expect(screen.queryByText(/Activated automatically/)).not.toBeInTheDocument()
  })
})
