import { invoke } from '@tauri-apps/api/core'
import { OAuth2Config, OAuth2GrantType } from '@/types'

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

function assertGrantRequirements(config: OAuth2Config) {
  requiredField(config.clientId, 'Client ID')

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

export function applyTokenResponse(config: OAuth2Config, token: OAuthTokenResponse): OAuth2Config {
  return {
    ...config,
    accessToken: token.access_token,
    tokenType: token.token_type || 'Bearer',
    refreshToken: token.refresh_token || config.refreshToken,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  }
}

export async function requestOAuthToken(config: OAuth2Config): Promise<OAuthTokenResponse> {
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

export async function refreshOAuthToken(config: OAuth2Config): Promise<OAuthTokenResponse> {
  return invoke<OAuthTokenResponse>('oauth2_refresh', {
    options: {
      token_url: requiredField(config.tokenUrl, 'Token URL'),
      client_id: requiredField(config.clientId, 'Client ID'),
      client_secret: optionalOrNull(config.clientSecret),
      refresh_token: requiredField(config.refreshToken, 'Refresh token'),
    },
  })
}
