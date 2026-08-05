import { invoke } from '@tauri-apps/api/core'
import { OAuth2Config, OAuth2GrantType } from '@/types'
import {
  VariableResolver,
  hasUnresolvedVariables,
  substituteOptional,
  substituteVariables,
} from '@/utils/variables'

export interface OAuthTokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

function requiredField(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`${fieldName} is required`)
  }
  return trimmed
}

function optionalOrNull(value?: string): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Reject a field that still contains `{{name}}` after substitution.
 *
 * Without this the literal braces go to the provider, which answers with a
 * generic "invalid client" — giving no hint that the real problem is a
 * variable that is not defined in the active environment.
 */
function assertResolved(value: string | undefined, fieldName: string) {
  if (!hasUnresolvedVariables(value)) return

  const names = [...value!.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim())
  throw new Error(
    `${fieldName} still contains ${names.map((n) => `{{${n}}}`).join(', ')} — ` +
    `${names.length === 1 ? 'that variable is' : 'those variables are'} not defined in the active environment.`
  )
}

function assertGrantRequirements(config: OAuth2Config) {
  requiredField(config.clientId, 'Client ID')

  assertResolved(config.clientId, 'Client ID')
  assertResolved(config.clientSecret, 'Client Secret')
  assertResolved(config.tokenUrl, 'Token URL')
  assertResolved(config.authUrl, 'Authorization URL')
  assertResolved(config.scope, 'Scope')
  assertResolved(config.username, 'Username')
  assertResolved(config.password, 'Password')

  switch (config.grantType) {
    case 'authorization_code':
      requiredField(config.authUrl, 'Authorization URL')
      requiredField(config.tokenUrl, 'Token URL')
      return
    case 'client_credentials':
      requiredField(config.tokenUrl, 'Token URL')
      return
    case 'password':
      requiredField(config.tokenUrl, 'Token URL')
      requiredField(config.username, 'Username')
      requiredField(config.password, 'Password')
      return
    default: {
      const _never: never = config.grantType
      throw new Error(`Unsupported grant type: ${_never}`)
    }
  }
}

function createTokenExchangeOptions(config: OAuth2Config, grantType: OAuth2GrantType) {
  return {
    token_url: requiredField(config.tokenUrl, 'Token URL'),
    grant_type: grantType,
    client_id: requiredField(config.clientId, 'Client ID'),
    client_secret: optionalOrNull(config.clientSecret),
    scope: optionalOrNull(config.scope),
    username: optionalOrNull(config.username),
    password: optionalOrNull(config.password),
  }
}

/**
 * Resolve every `{{variable}}` in the user-authored fields of an OAuth config.
 *
 * Call this immediately before talking to the provider, never before storing —
 * the config is persisted with the request, and the whole point of writing
 * `{{clientSecret}}` is that the secret itself stays in the environment rather
 * than on disk next to the collection.
 *
 * The token-state fields (accessToken, refreshToken, tokenType, expiresAt) are
 * deliberately left alone: they are issued by the provider, not authored by the
 * user, so there is nothing in them to substitute.
 */
export function resolveOAuth2Config(config: OAuth2Config, resolve: VariableResolver): OAuth2Config {
  return {
    ...config,
    discoveryUrl: substituteOptional(config.discoveryUrl, resolve),
    authUrl: substituteOptional(config.authUrl, resolve),
    tokenUrl: substituteOptional(config.tokenUrl, resolve),
    clientId: substituteVariables(config.clientId ?? '', resolve),
    clientSecret: substituteOptional(config.clientSecret, resolve),
    scope: substituteOptional(config.scope, resolve),
    redirectUri: substituteOptional(config.redirectUri, resolve),
    username: substituteOptional(config.username, resolve),
    password: substituteOptional(config.password, resolve),
  }
}

export function applyTokenResponse(config: OAuth2Config, token: OAuthTokenResponse): OAuth2Config {
  return {
    ...config,
    accessToken: token.access_token,
    tokenType: token.token_type || 'Bearer',
    refreshToken: token.refresh_token || config.refreshToken,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  }
}

export async function requestOAuthToken(
  rawConfig: OAuth2Config,
  resolve: VariableResolver
): Promise<OAuthTokenResponse> {
  // Substitute first, then validate — otherwise a required field holding only
  // `{{clientId}}` passes the non-empty check and the literal braces are what
  // reaches the provider.
  const config = resolveOAuth2Config(rawConfig, resolve)
  assertGrantRequirements(config)

  switch (config.grantType) {
    case 'authorization_code':
      return invoke<OAuthTokenResponse>('oauth2_auth_code_flow', {
        options: {
          auth_url: requiredField(config.authUrl, 'Authorization URL'),
          token_url: requiredField(config.tokenUrl, 'Token URL'),
          client_id: requiredField(config.clientId, 'Client ID'),
          client_secret: optionalOrNull(config.clientSecret),
          scope: optionalOrNull(config.scope),
          use_pkce: config.usePkce ?? true,
          redirect_uri: optionalOrNull(config.redirectUri),
        },
      })
    case 'client_credentials':
      return invoke<OAuthTokenResponse>('oauth2_token_exchange', {
        options: createTokenExchangeOptions(config, 'client_credentials'),
      })
    case 'password':
      return invoke<OAuthTokenResponse>('oauth2_token_exchange', {
        options: createTokenExchangeOptions(config, 'password'),
      })
    default: {
      const _never: never = config.grantType
      throw new Error(`Unsupported grant type: ${_never}`)
    }
  }
}

export async function refreshOAuthToken(
  rawConfig: OAuth2Config,
  resolve: VariableResolver
): Promise<OAuthTokenResponse> {
  const config = resolveOAuth2Config(rawConfig, resolve)

  return invoke<OAuthTokenResponse>('oauth2_refresh', {
    options: {
      token_url: requiredField(config.tokenUrl, 'Token URL'),
      client_id: requiredField(config.clientId, 'Client ID'),
      client_secret: optionalOrNull(config.clientSecret),
      refresh_token: requiredField(config.refreshToken, 'Refresh token'),
    },
  })
}
