export interface OidcDiscovery {
  authorizationEndpoint?: string
  tokenEndpoint?: string
  scopesSupported?: string[]
}

const WELL_KNOWN_PATH = '/.well-known/openid-configuration'

/**
 * Accepts an issuer/base URL ("https://auth.example.com") or a full
 * discovery URL ("…/.well-known/openid-configuration") and returns the
 * discovery document URL. A bare host gets https:// prepended.
 */
export function normalizeDiscoveryUrl(input: string): string {
  let url = input.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  if (url.includes('/.well-known/')) {
    return url
  }
  return url.replace(/\/+$/, '') + WELL_KNOWN_PATH
}

/** Extract the fields LitePost cares about from an OIDC discovery document */
export function parseDiscoveryDocument(json: unknown): OidcDiscovery {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('Discovery response is not a JSON object')
  }
  const doc = json as Record<string, unknown>
  const authorizationEndpoint = typeof doc.authorization_endpoint === 'string' ? doc.authorization_endpoint : undefined
  const tokenEndpoint = typeof doc.token_endpoint === 'string' ? doc.token_endpoint : undefined
  const scopesSupported = Array.isArray(doc.scopes_supported)
    ? doc.scopes_supported.filter((scope): scope is string => typeof scope === 'string')
    : undefined

  if (!authorizationEndpoint && !tokenEndpoint) {
    throw new Error('No authorization_endpoint or token_endpoint in the response — is this an OIDC discovery document?')
  }

  return { authorizationEndpoint, tokenEndpoint, scopesSupported }
}

const isTauri = typeof window !== 'undefined' && !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__

/**
 * Fetch and parse an OIDC discovery document. Goes through the Rust HTTP
 * backend in the app (no CORS restrictions); falls back to fetch() in
 * browser dev mode.
 */
export async function fetchOidcDiscovery(inputUrl: string): Promise<OidcDiscovery> {
  const url = normalizeDiscoveryUrl(inputUrl)

  let bodyText: string
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core')
    const response = await invoke<{ status: number; body: string; error?: string }>('send_request', {
      options: {
        method: 'GET',
        url,
        headers: { Accept: 'application/json' },
        cookies: [],
      },
    })
    if (response.error) {
      throw new Error(response.error)
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Discovery request failed with status ${response.status}`)
    }
    bodyText = response.body
  } else {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      throw new Error(`Discovery request failed with status ${response.status}`)
    }
    bodyText = await response.text()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    throw new Error('Discovery response is not valid JSON')
  }
  return parseDiscoveryDocument(parsed)
}
