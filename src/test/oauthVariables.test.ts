import { describe, it, expect } from 'vitest'
import { resolveOAuth2Config, requestOAuthToken } from '@/services/oauth'
import { substituteVariables, substituteOptional, hasUnresolvedVariables } from '@/utils/variables'
import { detectEntraV1Url } from '@/utils/oidcDiscovery'
import { OAuth2Config } from '@/types'

const env: Record<string, string> = {
  clientId: 'real-client-id',
  clientSecret: 'sup3r-s3cret',
  tenant: 'contoso',
}
const resolve = (key: string) => env[key]

describe('substituteVariables', () => {
  it('replaces known references', () => {
    expect(substituteVariables('{{clientId}}', resolve)).toBe('real-client-id')
  })

  it('replaces several references in one string', () => {
    expect(substituteVariables('https://login.microsoftonline.com/{{tenant}}/v2.0', resolve))
      .toBe('https://login.microsoftonline.com/contoso/v2.0')
  })

  it('leaves unknown references alone rather than blanking them', () => {
    // Blanking would send an empty client_id and produce a confusing provider
    // error; leaving the braces makes the typo visible in the request.
    expect(substituteVariables('{{nope}}', resolve)).toBe('{{nope}}')
  })

  it('tolerates surrounding whitespace in the name', () => {
    expect(substituteVariables('{{ clientId }}', resolve)).toBe('real-client-id')
  })

  it('passes undefined through', () => {
    expect(substituteOptional(undefined, resolve)).toBeUndefined()
  })

  it('detects leftover references without being confused by its own regex state', () => {
    // The pattern is /g, so a shared lastIndex would make repeat calls alternate
    // between true and false.
    expect(hasUnresolvedVariables('{{a}}')).toBe(true)
    expect(hasUnresolvedVariables('{{a}}')).toBe(true)
    expect(hasUnresolvedVariables('plain')).toBe(false)
  })
})

describe('resolveOAuth2Config', () => {
  const base: OAuth2Config = {
    grantType: 'client_credentials',
    clientId: '{{clientId}}',
    clientSecret: '{{clientSecret}}',
    tokenUrl: 'https://login.microsoftonline.com/{{tenant}}/oauth2/v2.0/token',
    scope: 'api://{{clientId}}/.default',
  }

  it('substitutes every user-authored field', () => {
    const resolved = resolveOAuth2Config(base, resolve)

    expect(resolved.clientId).toBe('real-client-id')
    expect(resolved.clientSecret).toBe('sup3r-s3cret')
    expect(resolved.tokenUrl).toBe('https://login.microsoftonline.com/contoso/oauth2/v2.0/token')
    expect(resolved.scope).toBe('api://real-client-id/.default')
  })

  it('leaves issued token state untouched', () => {
    // These come back from the provider — there is nothing to substitute, and
    // rewriting them would corrupt a token that happened to contain braces.
    const withToken: OAuth2Config = {
      ...base,
      accessToken: 'header.payload.signature',
      refreshToken: 'refresh-abc',
      tokenType: 'Bearer',
      expiresAt: 123456,
    }
    const resolved = resolveOAuth2Config(withToken, resolve)

    expect(resolved.accessToken).toBe('header.payload.signature')
    expect(resolved.refreshToken).toBe('refresh-abc')
    expect(resolved.tokenType).toBe('Bearer')
    expect(resolved.expiresAt).toBe(123456)
  })

  it('does not mutate the config it was given', () => {
    // The stored config must keep its {{references}} — that is the whole point
    // of writing a secret as a variable rather than inline.
    resolveOAuth2Config(base, resolve)
    expect(base.clientId).toBe('{{clientId}}')
    expect(base.clientSecret).toBe('{{clientSecret}}')
  })

  it('handles a config with no optional fields set', () => {
    const minimal: OAuth2Config = { grantType: 'authorization_code', clientId: 'abc' }
    const resolved = resolveOAuth2Config(minimal, resolve)

    expect(resolved.clientId).toBe('abc')
    expect(resolved.clientSecret).toBeUndefined()
    expect(resolved.scope).toBeUndefined()
  })
})

describe('requestOAuthToken validation', () => {
  it('names the undefined variable instead of letting braces reach the provider', async () => {
    const config: OAuth2Config = {
      grantType: 'client_credentials',
      clientId: '{{missingId}}',
      tokenUrl: 'https://login.microsoftonline.com/contoso/oauth2/v2.0/token',
    }

    await expect(requestOAuthToken(config, resolve)).rejects.toThrow(
      /Client ID still contains \{\{missingId\}\}/
    )
  })

  it('lists every unresolved name in one message', async () => {
    const config: OAuth2Config = {
      grantType: 'client_credentials',
      clientId: 'fine',
      clientSecret: '{{a}}{{b}}',
      tokenUrl: 'https://example.com/token',
    }

    await expect(requestOAuthToken(config, resolve)).rejects.toThrow(/\{\{a\}\}, \{\{b\}\}/)
  })
})

describe('detectEntraV1Url', () => {
  it('flags an Entra tenant URL with no version segment', () => {
    // login.microsoftonline.com/<tenant> serves the v1.0 document, which selects
    // the token audience with `resource` rather than `scope`.
    expect(detectEntraV1Url('login.microsoftonline.com/contoso')).toBe(
      'https://login.microsoftonline.com/contoso/v2.0/.well-known/openid-configuration'
    )
  })

  it('flags the fully written out v1.0 well-known URL', () => {
    expect(
      detectEntraV1Url('https://login.microsoftonline.com/contoso/.well-known/openid-configuration')
    ).toBe('https://login.microsoftonline.com/contoso/v2.0/.well-known/openid-configuration')
  })

  it('accepts a v2.0 URL', () => {
    expect(detectEntraV1Url('https://login.microsoftonline.com/contoso/v2.0')).toBeNull()
  })

  it('ignores non-Microsoft providers', () => {
    expect(detectEntraV1Url('https://auth.example.com')).toBeNull()
    expect(detectEntraV1Url('https://login.microsoftonline.com.evil.test/contoso')).toBeNull()
  })
})
