import { AuthConfig, Collection, SavedRequest } from '@/types'

const NO_AUTH: AuthConfig = { type: 'none' }

/**
 * Work out which auth a saved request actually sends.
 *
 * The motivating case is an OpenAPI import: it produces dozens of requests that
 * all hit the same API behind the same OAuth app, and configuring each one by
 * hand is not a reasonable thing to ask of anyone.
 *
 * `authMode` is optional because collections predate it. When it is absent the
 * request's own auth wins if it has any — that is precisely how these requests
 * behaved before collection-level auth existed, so nothing already saved
 * changes behaviour. Only a request that had nothing to send (`type: 'none'`)
 * falls through to the collection, where inheriting can lose nothing.
 */
export function resolveRequestAuth(
  request: Pick<SavedRequest, 'auth' | 'authMode'>,
  collection?: Pick<Collection, 'auth'>
): AuthConfig {
  if (request.authMode === 'override') {
    return request.auth ?? NO_AUTH
  }
  if (request.authMode === 'inherit') {
    return collection?.auth ?? NO_AUTH
  }

  // Not recorded: preserve the pre-existing behaviour.
  if (request.auth && request.auth.type !== 'none') {
    return request.auth
  }
  return collection?.auth ?? request.auth ?? NO_AUTH
}

/**
 * Whether a request is currently taking its auth from the collection, for
 * showing the user where the auth they are about to send comes from.
 */
export function isInheritingAuth(
  request: Pick<SavedRequest, 'auth' | 'authMode'>,
  collection?: Pick<Collection, 'auth'>
): boolean {
  if (request.authMode === 'override') return false
  if (request.authMode === 'inherit') return true
  return !(request.auth && request.auth.type !== 'none') && !!collection?.auth
}
