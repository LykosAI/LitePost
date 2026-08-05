import { AuthConfig } from '@/types'
import { basicAuthValue } from '@/utils/base64'

/**
 * Set a header, replacing any existing key that differs only in case.
 *
 * HTTP header names are case-insensitive but a JS object's keys are not, so a
 * plain assignment to `Authorization` leaves a user-typed `authorization`
 * sitting right next to it and both get sent. Servers are free to pick either
 * one, which shows up as an intermittent 401 that looks like the auth config is
 * broken when it is actually a stale header from the Headers tab.
 */
export function setHeader(headers: Record<string, string>, key: string, value: string) {
  const lowered = key.toLowerCase()
  for (const existing of Object.keys(headers)) {
    if (existing !== key && existing.toLowerCase() === lowered) {
      delete headers[existing]
    }
  }
  headers[key] = value
}

/**
 * Apply an auth config to a header map, mutating it in place.
 *
 * Shared by the single-request path and the collection runner, which had
 * grown independent copies of this logic — and so disagreed about the case
 * handling above.
 *
 * @returns the URL, which an api-key auth set to `query` will have appended to.
 */
export function applyAuthToHeaders(
  auth: AuthConfig | undefined,
  headers: Record<string, string>,
  url: string,
  substitute: (text: string) => string
): string {
  if (!auth) return url

  if (auth.type === 'basic') {
    const username = substitute(auth.username || '')
    const password = substitute(auth.password || '')
    setHeader(headers, 'Authorization', basicAuthValue(username, password))
    return url
  }

  if (auth.type === 'bearer' && auth.token) {
    setHeader(headers, 'Authorization', `Bearer ${substitute(auth.token)}`)
    return url
  }

  if (auth.type === 'api-key' && auth.key && auth.value) {
    const key = substitute(auth.key)
    const value = substitute(auth.value)
    if (auth.addTo === 'header') {
      setHeader(headers, key, value)
      return url
    }
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }

  if (auth.type === 'oauth2' && auth.oauth2?.accessToken) {
    // The token is issued, not authored, so it is used verbatim — no
    // substitution pass over a value the user never typed.
    const tokenType = auth.oauth2.tokenType || 'Bearer'
    setHeader(headers, 'Authorization', `${tokenType} ${auth.oauth2.accessToken}`)
  }

  return url
}
