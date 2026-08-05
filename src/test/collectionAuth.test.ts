import { describe, it, expect } from 'vitest'
import { resolveRequestAuth, isInheritingAuth } from '@/utils/collectionAuth'
import { applyAuthToHeaders, setHeader } from '@/utils/authHeaders'
import { importFromOpenapi } from '@/utils/collection-converter'
import { AuthConfig } from '@/types'

const collectionAuth: AuthConfig = {
  type: 'oauth2',
  oauth2: { grantType: 'client_credentials', clientId: '{{clientId}}', accessToken: 'collection-token' },
}
const requestAuth: AuthConfig = { type: 'bearer', token: 'request-token' }

describe('resolveRequestAuth', () => {
  it('uses the collection auth when the request inherits', () => {
    expect(resolveRequestAuth({ auth: { type: 'none' }, authMode: 'inherit' }, { auth: collectionAuth }))
      .toEqual(collectionAuth)
  })

  it('uses the request auth when it overrides', () => {
    expect(resolveRequestAuth({ auth: requestAuth, authMode: 'override' }, { auth: collectionAuth }))
      .toEqual(requestAuth)
  })

  it('sends nothing when inheriting from a collection with no auth', () => {
    expect(resolveRequestAuth({ auth: requestAuth, authMode: 'inherit' }, {}))
      .toEqual({ type: 'none' })
  })

  // Collections saved before collection-level auth existed have no authMode.
  // Those requests must keep behaving exactly as they did.
  describe('requests saved before authMode existed', () => {
    it('keeps its own auth when it has any', () => {
      expect(resolveRequestAuth({ auth: requestAuth }, { auth: collectionAuth })).toEqual(requestAuth)
    })

    it('falls back to the collection only when it had nothing to send', () => {
      expect(resolveRequestAuth({ auth: { type: 'none' } }, { auth: collectionAuth }))
        .toEqual(collectionAuth)
    })

    it('is unchanged when there is no collection auth either', () => {
      expect(resolveRequestAuth({ auth: { type: 'none' } }, {})).toEqual({ type: 'none' })
    })
  })

  it('tolerates a missing collection entirely', () => {
    expect(resolveRequestAuth({ auth: requestAuth, authMode: 'inherit' })).toEqual({ type: 'none' })
  })
})

describe('isInheritingAuth', () => {
  it('reports inheritance accurately across the modes', () => {
    expect(isInheritingAuth({ auth: { type: 'none' }, authMode: 'inherit' }, { auth: collectionAuth })).toBe(true)
    expect(isInheritingAuth({ auth: requestAuth, authMode: 'override' }, { auth: collectionAuth })).toBe(false)
    expect(isInheritingAuth({ auth: requestAuth }, { auth: collectionAuth })).toBe(false)
    expect(isInheritingAuth({ auth: { type: 'none' } }, { auth: collectionAuth })).toBe(true)
    expect(isInheritingAuth({ auth: { type: 'none' } }, {})).toBe(false)
  })
})

describe('applyAuthToHeaders', () => {
  const sub = (text: string) => text.replace('{{token}}', 'resolved')

  it('replaces a case-variant header rather than sending both', () => {
    const headers: Record<string, string> = { authorization: 'Bearer stale' }
    applyAuthToHeaders({ type: 'bearer', token: 'fresh' }, headers, 'https://x', sub)

    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'authorization')).toHaveLength(1)
    expect(headers['Authorization']).toBe('Bearer fresh')
  })

  it('substitutes variables in authored fields', () => {
    const headers: Record<string, string> = {}
    applyAuthToHeaders({ type: 'bearer', token: '{{token}}' }, headers, 'https://x', sub)
    expect(headers['Authorization']).toBe('Bearer resolved')
  })

  it('appends an api key to the query string when configured that way', () => {
    const headers: Record<string, string> = {}
    const url = applyAuthToHeaders(
      { type: 'api-key', key: 'code', value: 'abc', addTo: 'query' },
      headers, 'https://x/api?a=1', sub
    )
    expect(url).toBe('https://x/api?a=1&code=abc')
    expect(headers).toEqual({})
  })

  it('leaves the request untouched for type none', () => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const url = applyAuthToHeaders({ type: 'none' }, headers, 'https://x', sub)
    expect(headers).toEqual({ Accept: 'application/json' })
    expect(url).toBe('https://x')
  })

  it('sends nothing for oauth2 with no token yet', () => {
    const headers: Record<string, string> = {}
    applyAuthToHeaders(
      { type: 'oauth2', oauth2: { grantType: 'client_credentials', clientId: 'c' } },
      headers, 'https://x', sub
    )
    expect(headers).toEqual({})
  })
})

describe('setHeader', () => {
  it('is a no-op replacement when the case already matches', () => {
    const headers: Record<string, string> = { Authorization: 'a' }
    setHeader(headers, 'Authorization', 'b')
    expect(headers).toEqual({ Authorization: 'b' })
  })

  it('does not disturb unrelated headers', () => {
    const headers: Record<string, string> = { Accept: 'json', 'x-trace': '1' }
    setHeader(headers, 'Authorization', 'a')
    expect(headers).toEqual({ Accept: 'json', 'x-trace': '1', Authorization: 'a' })
  })
})

describe('importFromOpenapi base URL parameterization', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test API' },
    paths: {
      '/pet/findByStatus': { get: { summary: 'Finds Pets by status.' } },
      '/pet/{petId}': { get: { summary: 'Find pet by ID.' } },
    },
  }

  it('writes URLs against the variable instead of the host', () => {
    const [collection] = importFromOpenapi(spec, 'https://dev-api.corp/v1', {
      baseUrlVariable: 'baseUrl',
    })

    expect(collection.requests.map((r) => r.url)).toEqual([
      '{{baseUrl}}/pet/findByStatus',
      '{{baseUrl}}/pet/{petId}',
    ])
    // rawUrl is what actually gets sent, so it must carry the variable too.
    expect(collection.requests[0].rawUrl).toBe('{{baseUrl}}/pet/findByStatus')
  })

  it('marks imported requests as inheriting the collection auth', () => {
    // Otherwise every operation in the spec needs OAuth configured by hand.
    const [collection] = importFromOpenapi(spec, 'https://dev-api.corp', { baseUrlVariable: 'baseUrl' })
    expect(collection.requests.every((r) => r.authMode === 'inherit')).toBe(true)
  })

  it('still bakes in the absolute host when no variable is requested', () => {
    const [collection] = importFromOpenapi(spec, 'https://dev-api.corp/v1')
    expect(collection.requests[0].url).toBe('https://dev-api.corp/v1/pet/findByStatus')
  })

  it('does not double up slashes when the base URL has a trailing one', () => {
    const [collection] = importFromOpenapi(spec, 'https://dev-api.corp/', { baseUrlVariable: 'baseUrl' })
    expect(collection.requests[0].url).toBe('{{baseUrl}}/pet/findByStatus')
  })
})
