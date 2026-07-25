import { URLParam } from "@/types"

export function getRequestNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname.split('/').pop() || url
  } catch {
    return url
  }
}

export function decodeUrlForDisplay(url: string): string {
  try {
    // First try to parse it as a URL to handle full URLs
    const parsed = new URL(url)
    const decodedPath = decodeURIComponent(parsed.pathname)
    return `${parsed.origin}${decodedPath}${parsed.search}`
  } catch {
    // If it's not a full URL, just decode the string
    return decodeURIComponent(url)
  }
}

const TEMPLATE_TOKEN_REGEX = /\{\{[^}]+\}\}/g

function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'))
  } catch {
    return value
  }
}

function encodeQueryComponentPreservingTemplates(value: string): string {
  const templateTokens = new Map<string, string>()
  let tokenIndex = 0

  const masked = value.replace(TEMPLATE_TOKEN_REGEX, (match) => {
    const token = `__LITEPOST_VAR_${tokenIndex++}__`
    templateTokens.set(token, match)
    return token
  })

  let encoded = encodeURIComponent(masked)
  for (const [token, original] of templateTokens) {
    encoded = encoded.replace(encodeURIComponent(token), original)
  }

  return encoded
}

function getQueryBounds(url: string): { start: number; end: number } | null {
  const queryStart = url.indexOf('?')
  if (queryStart === -1) {
    return null
  }

  const hashStart = url.indexOf('#', queryStart)
  return {
    start: queryStart + 1,
    end: hashStart === -1 ? url.length : hashStart,
  }
}

export function parseUrlParams(url: string): URLParam[] {
  const bounds = getQueryBounds(url)
  if (!bounds) {
    return []
  }

  const queryString = url.slice(bounds.start, bounds.end)
  if (!queryString.trim()) {
    return []
  }

  return queryString
    .split('&')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const separatorIndex = segment.indexOf('=')
      const rawKey = separatorIndex >= 0 ? segment.slice(0, separatorIndex) : segment
      const rawValue = separatorIndex >= 0 ? segment.slice(separatorIndex + 1) : ''

      return {
        key: decodeQueryComponent(rawKey),
        value: decodeQueryComponent(rawValue),
        enabled: true,
      }
    })
    .filter((param) => param.key)
}

export function buildQueryString(params: Pick<URLParam, 'key' | 'value' | 'enabled'>[]): string {
  return params
    .filter((param) => param.enabled && param.key)
    .map((param) => {
      const encodedKey = encodeQueryComponentPreservingTemplates(param.key)
      const encodedValue = encodeQueryComponentPreservingTemplates(param.value ?? '')
      return `${encodedKey}=${encodedValue}`
    })
    .join('&')
}

export function replaceUrlQuery(url: string, queryString: string): string {
  const hashStart = url.indexOf('#')
  const hash = hashStart === -1 ? '' : url.slice(hashStart)
  const withoutHash = hashStart === -1 ? url : url.slice(0, hashStart)
  const queryStart = withoutHash.indexOf('?')
  const base = queryStart === -1 ? withoutHash : withoutHash.slice(0, queryStart)

  return queryString ? `${base}?${queryString}${hash}` : `${base}${hash}`
}

export function extractTemplateVariables(text: string): string[] {
  const matches = text.match(TEMPLATE_TOKEN_REGEX) ?? []
  const seen = new Set<string>()
  const variables: string[] = []

  for (const variable of matches) {
    if (!seen.has(variable)) {
      seen.add(variable)
      variables.push(variable)
    }
  }

  return variables
}
