import { describe, it, expect } from 'vitest'
import { normalizeDiscoveryUrl, parseDiscoveryDocument } from '@/utils/oidcDiscovery'

describe('normalizeDiscoveryUrl', () => {
  it('appends the well-known path to a base URL', () => {
    expect(normalizeDiscoveryUrl('https://auth.example.com')).toBe(
      'https://auth.example.com/.well-known/openid-configuration'
    )
  })

  it('strips trailing slashes before appending', () => {
    expect(normalizeDiscoveryUrl('https://auth.example.com/')).toBe(
      'https://auth.example.com/.well-known/openid-configuration'
    )
  })

  it('keeps issuer paths (multi-tenant issuers)', () => {
    expect(normalizeDiscoveryUrl('https://login.example.com/tenant-a/v2.0')).toBe(
      'https://login.example.com/tenant-a/v2.0/.well-known/openid-configuration'
    )
  })

  it('leaves a full well-known URL untouched', () => {
    const full = 'https://auth.example.com/.well-known/openid-configuration'
    expect(normalizeDiscoveryUrl(full)).toBe(full)
  })

  it('prepends https:// to bare hosts', () => {
    expect(normalizeDiscoveryUrl('auth.example.com')).toBe(
      'https://auth.example.com/.well-known/openid-configuration'
    )
  })

  it('trims whitespace', () => {
    expect(normalizeDiscoveryUrl('  https://auth.example.com  ')).toBe(
      'https://auth.example.com/.well-known/openid-configuration'
    )
  })
})

describe('parseDiscoveryDocument', () => {
  const validDoc = {
    issuer: 'https://auth.example.com',
    authorization_endpoint: 'https://auth.example.com/oauth/authorize',
    token_endpoint: 'https://auth.example.com/oauth/token',
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
  }

  it('extracts endpoints and scopes', () => {
    expect(parseDiscoveryDocument(validDoc)).toEqual({
      authorizationEndpoint: 'https://auth.example.com/oauth/authorize',
      tokenEndpoint: 'https://auth.example.com/oauth/token',
      scopesSupported: ['openid', 'profile', 'email', 'offline_access'],
    })
  })

  it('tolerates a missing scopes_supported', () => {
    const { scopes_supported: _omitted, ...noScopes } = validDoc
    expect(parseDiscoveryDocument(noScopes).scopesSupported).toBeUndefined()
  })

  it('accepts a token-only document (client credentials providers)', () => {
    const result = parseDiscoveryDocument({ token_endpoint: 'https://a/t' })
    expect(result.tokenEndpoint).toBe('https://a/t')
    expect(result.authorizationEndpoint).toBeUndefined()
  })

  it('filters non-string scopes', () => {
    const doc = { ...validDoc, scopes_supported: ['openid', 42, null, 'email'] }
    expect(parseDiscoveryDocument(doc).scopesSupported).toEqual(['openid', 'email'])
  })

  it('rejects documents with neither endpoint', () => {
    expect(() => parseDiscoveryDocument({ issuer: 'https://a' })).toThrow(/discovery document/)
  })

  it('rejects non-object responses', () => {
    expect(() => parseDiscoveryDocument('an html error page')).toThrow(/not a JSON object/)
    expect(() => parseDiscoveryDocument(null)).toThrow(/not a JSON object/)
    expect(() => parseDiscoveryDocument([1, 2])).toThrow(/not a JSON object/)
  })
})
