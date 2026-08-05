/**
 * Minimal JWT payload decoding, for showing a token's claims in the UI.
 *
 * This deliberately does NOT verify the signature — LitePost is a client
 * inspecting a token it was just handed, not a resource server deciding whether
 * to trust one. Verification would need the provider's signing keys and would
 * tell the user nothing they need here. Treat everything this returns as
 * "what the token says about itself".
 */

export interface JwtClaims {
  [claim: string]: unknown
}

export interface DecodedToken {
  claims: JwtClaims
  /** Claims worth showing first, in the order they answer "why is this 401ing?" */
  highlights: { label: string; value: string; hint?: string }[]
  expiresAt: Date | null
  issuedAt: Date | null
}

/** base64url → UTF-8 string. */
function decodeSegment(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))

  // atob yields one byte per char; re-read it as UTF-8 so non-ASCII claim
  // values (names, for instance) do not come out mangled.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

/** A JWT is three dot-separated base64url segments. Opaque tokens are not. */
export function looksLikeJwt(token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
}

function asString(value: unknown): string {
  if (Array.isArray(value)) return value.join(' ')
  if (value === null || value === undefined) return ''
  return String(value)
}

function toDate(value: unknown): Date | null {
  return typeof value === 'number' ? new Date(value * 1000) : null
}

/**
 * Decode a JWT's payload. Returns null for opaque tokens or malformed input —
 * plenty of providers issue non-JWT access tokens, which is not an error.
 */
export function decodeToken(token: string | undefined): DecodedToken | null {
  if (!looksLikeJwt(token)) return null

  let claims: JwtClaims
  try {
    const parsed = JSON.parse(decodeSegment(token!.split('.')[1]))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    claims = parsed as JwtClaims
  } catch {
    return null
  }

  const highlights: DecodedToken['highlights'] = []

  // `aud` first, always: a token minted for the wrong audience is the single
  // most common cause of a 401 that follows a *successful* token request.
  if (claims.aud !== undefined) {
    const aud = asString(claims.aud)
    highlights.push({
      label: 'Audience (aud)',
      value: aud,
      hint:
        aud === '00000003-0000-0000-c000-000000000000'
          ? 'This is Microsoft Graph — not your API. Set a scope naming your own API, e.g. api://<client-id>/.default'
          : 'The API this token is for. It must match the API you are calling.',
    })
  }

  // Delegated tokens carry `scp` (a user acted); app-only tokens carry `roles`.
  // Which one is present tells you whether the grant type matches what the API
  // expects, and an app-only token with neither means no app role was assigned.
  if (claims.scp !== undefined) {
    highlights.push({
      label: 'Scopes (scp)',
      value: asString(claims.scp),
      hint: 'Delegated permissions — this token represents a signed-in user.',
    })
  }
  if (claims.roles !== undefined) {
    highlights.push({
      label: 'Roles',
      value: asString(claims.roles),
      hint: 'App roles — this token is app-only, with no user behind it.',
    })
  }
  if (claims.scp === undefined && claims.roles === undefined) {
    highlights.push({
      label: 'Permissions',
      value: '— none —',
      hint:
        'No scp and no roles. For client credentials this usually means no app role has been ' +
        'assigned to the application, which most APIs reject.',
    })
  }

  if (claims.iss !== undefined) {
    const iss = asString(claims.iss)
    highlights.push({
      label: 'Issuer (iss)',
      value: iss,
      hint: /\/v2\.0\/?$/.test(iss)
        ? undefined
        : /sts\.windows\.net|login\.microsoftonline\.com/.test(iss)
          ? 'A v1.0 issuer. If your API validates a v2.0 issuer it will reject this token.'
          : undefined,
    })
  }
  if (claims.appid !== undefined || claims.azp !== undefined) {
    highlights.push({
      label: 'Client (appid)',
      value: asString(claims.appid ?? claims.azp),
      hint: 'The application this token was issued to.',
    })
  }

  return {
    claims,
    highlights,
    expiresAt: toDate(claims.exp),
    issuedAt: toDate(claims.iat),
  }
}
