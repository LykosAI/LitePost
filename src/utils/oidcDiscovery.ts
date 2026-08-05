import { fetchJsonViaBackend } from '@/utils/backendFetch'

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

/**
 * Microsoft Entra serves a discovery document at both
 * `login.microsoftonline.com/<tenant>/.well-known/…` (v1.0) and
 * `…/<tenant>/v2.0/.well-known/…` (v2.0). Both are valid, so discovery
 * "succeeds" either way — but they are different protocol dialects. v1.0 keys
 * its token audience off a `resource` parameter, which LitePost does not send;
 * v2.0 uses `scope`, which it does. Point LitePost at the v1.0 document and you
 * get a token for the wrong audience and an unexplained 401 from your API.
 *
 * Returns the corrected v2.0 URL when the input is an Entra v1.0 URL.
 */
export function detectEntraV1Url(input: string): string | null {
  const url = normalizeDiscoveryUrl(input)
  if (!/(^|\/\/)(login\.microsoftonline\.com|login\.windows\.net|sts\.windows\.net)\//i.test(url)) {
    return null
  }
  if (/\/v2\.0\//i.test(url)) {
    return null
  }
  return url.replace(WELL_KNOWN_PATH, `/v2.0${WELL_KNOWN_PATH}`)
}

/**
 * Fetch and parse an OIDC discovery document. Goes through the Rust HTTP
 * backend in the app (no CORS restrictions); falls back to fetch() in
 * browser dev mode.
 */
export async function fetchOidcDiscovery(inputUrl: string): Promise<OidcDiscovery> {
  const url = normalizeDiscoveryUrl(inputUrl)
  const parsed = await fetchJsonViaBackend(url, { headers: { Accept: 'application/json' } })
  return parseDiscoveryDocument(parsed)
}
