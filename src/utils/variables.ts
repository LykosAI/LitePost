/**
 * `{{variable}}` substitution, shared by every code path that sends a request.
 *
 * This lived as three near-identical private copies (useRequest, CollectionRunner,
 * and an inline regex in OAuthConfigurator). The OAuth service had none at all,
 * which is why `{{clientId}}` reached the token endpoint verbatim.
 */

/** Resolves a variable name. Return undefined to leave the reference untouched. */
export type VariableResolver = (key: string) => string | undefined

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g

/**
 * Replace every `{{name}}` in `text` with its resolved value. Unknown names are
 * left as-is rather than blanked, so a typo shows up in the request instead of
 * silently sending an empty string.
 */
export function substituteVariables(text: string, resolve: VariableResolver): string {
  return text.replace(VARIABLE_PATTERN, (match, key) => resolve(String(key).trim()) ?? match)
}

/** `substituteVariables` that passes undefined through, for optional config fields. */
export function substituteOptional(
  text: string | undefined,
  resolve: VariableResolver
): string | undefined {
  return text === undefined ? undefined : substituteVariables(text, resolve)
}

/** True if the text still contains a `{{name}}` reference. */
export function hasUnresolvedVariables(text: string | undefined): boolean {
  if (!text) return false
  VARIABLE_PATTERN.lastIndex = 0
  return VARIABLE_PATTERN.test(text)
}
