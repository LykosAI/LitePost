import { describe, it, expect } from 'vitest'
import { decodeToken, looksLikeJwt } from '@/utils/jwt'

/**
 * Build a JWT-shaped string with the given payload. Signature is not checked.
 *
 * Encodes UTF-8 bytes before base64, the way a real issuer does — btoa() takes
 * a byte string, so handing it JSON with non-ASCII in it directly would either
 * throw or silently mangle the very case one of these tests covers.
 */
function makeToken(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj))
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(payload)}.c2lnbmF0dXJl`
}

const findClaim = (token: string, label: string) =>
  decodeToken(token)?.highlights.find((h) => h.label.startsWith(label))

describe('looksLikeJwt', () => {
  it('accepts a three-segment base64url token', () => {
    expect(looksLikeJwt(makeToken({ aud: 'x' }))).toBe(true)
  })

  it('rejects opaque tokens and junk', () => {
    // Plenty of providers issue non-JWT access tokens — not an error, just
    // nothing to decode.
    expect(looksLikeJwt('opaque-token-value')).toBe(false)
    expect(looksLikeJwt('a.b')).toBe(false)
    expect(looksLikeJwt('has spaces.in.it')).toBe(false)
    expect(looksLikeJwt(undefined)).toBe(false)
  })
})

describe('decodeToken', () => {
  it('returns null for an opaque token rather than throwing', () => {
    expect(decodeToken('opaque-token-value')).toBeNull()
  })

  it('returns null when the payload is not valid JSON', () => {
    expect(decodeToken('aGVhZGVy.bm90LWpzb24.c2ln')).toBeNull()
  })

  it('decodes claims and expiry', () => {
    const decoded = decodeToken(makeToken({ aud: 'api://my-api', exp: 1893456000, iat: 1893452400 }))

    expect(decoded?.claims.aud).toBe('api://my-api')
    expect(decoded?.expiresAt?.getTime()).toBe(1893456000 * 1000)
    expect(decoded?.issuedAt?.getTime()).toBe(1893452400 * 1000)
  })

  it('decodes non-ASCII claim values correctly', () => {
    // atob gives bytes, not characters — without the UTF-8 re-read this comes
    // back mangled.
    const decoded = decodeToken(makeToken({ aud: 'x', name: 'José Niño' }))
    expect(decoded?.claims.name).toBe('José Niño')
  })

  it('puts the audience first — it is the usual cause of a post-token 401', () => {
    const decoded = decodeToken(makeToken({ aud: 'api://my-api', scp: 'read' }))
    expect(decoded?.highlights[0].label).toContain('Audience')
  })

  it('calls out a Microsoft Graph audience by name', () => {
    // The exact symptom JT hit: a valid token, for entirely the wrong API.
    const decoded = findClaim(makeToken({ aud: '00000003-0000-0000-c000-000000000000' }), 'Audience')
    expect(decoded?.hint).toMatch(/Microsoft Graph/)
  })

  it('distinguishes a delegated token from an app-only one', () => {
    expect(findClaim(makeToken({ scp: 'User.Read' }), 'Scopes')?.hint).toMatch(/signed-in user/)
    expect(findClaim(makeToken({ roles: ['Thing.Read'] }), 'Roles')?.hint).toMatch(/app-only/)
  })

  it('flags a token carrying neither scp nor roles', () => {
    const claim = findClaim(makeToken({ aud: 'api://my-api' }), 'Permissions')
    expect(claim?.value).toBe('— none —')
    expect(claim?.hint).toMatch(/no app role has been assigned/)
  })

  it('joins array claims into a readable string', () => {
    expect(findClaim(makeToken({ roles: ['A', 'B'] }), 'Roles')?.value).toBe('A B')
  })

  it('warns about a v1.0 issuer but not a v2.0 one', () => {
    expect(findClaim(makeToken({ iss: 'https://sts.windows.net/tenant/' }), 'Issuer')?.hint)
      .toMatch(/v1\.0 issuer/)
    expect(findClaim(makeToken({ iss: 'https://login.microsoftonline.com/tenant/v2.0' }), 'Issuer')?.hint)
      .toBeUndefined()
  })

  it('falls back to azp when appid is absent', () => {
    expect(findClaim(makeToken({ azp: 'client-abc' }), 'Client')?.value).toBe('client-abc')
  })
})
