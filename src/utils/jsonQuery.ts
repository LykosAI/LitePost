export interface JsonQueryResult {
  data: unknown
  error: string | null
  /** false when the query ran but nothing matched */
  matched: boolean
  /** true when a path query matched only a prefix of its segments (mid-typing) */
  partial?: boolean
  /** the path that actually matched, for the partial badge */
  matchedPath?: string
}

const PATH_SEGMENT_REGEX = /\[(\d+|\*|"[^"]*"|'[^']*')\]|[^.[\]]+/g

type PathSegment = { kind: 'key'; key: string } | { kind: 'index'; index: number } | { kind: 'wildcard' }

function parsePath(path: string): PathSegment[] | null {
  const segments: PathSegment[] = []
  const matches = path.matchAll(PATH_SEGMENT_REGEX)

  for (const match of matches) {
    const bracket = match[1]
    if (bracket === undefined) {
      segments.push({ kind: 'key', key: match[0] })
    } else if (bracket === '*') {
      segments.push({ kind: 'wildcard' })
    } else if (/^\d+$/.test(bracket)) {
      segments.push({ kind: 'index', index: Number.parseInt(bracket, 10) })
    } else {
      // quoted key: ["some key"] or ['some key']
      segments.push({ kind: 'key', key: bracket.slice(1, -1) })
    }
  }

  return segments.length > 0 ? segments : null
}

function formatPath(segments: PathSegment[]): string {
  let out = '$'
  for (const segment of segments) {
    if (segment.kind === 'key') out += `.${segment.key}`
    else if (segment.kind === 'index') out += `[${segment.index}]`
    else out += '[*]'
  }
  return out
}

function evaluatePath(data: unknown, segments: PathSegment[]): unknown {
  if (segments.length === 0) return data
  if (data === null || data === undefined) return undefined

  const [head, ...rest] = segments

  if (head.kind === 'wildcard') {
    const values = Array.isArray(data)
      ? data
      : typeof data === 'object'
        ? Object.values(data as Record<string, unknown>)
        : []
    const mapped = values
      .map((value) => evaluatePath(value, rest))
      .filter((value) => value !== undefined)
    return mapped.length > 0 ? mapped : undefined
  }

  if (head.kind === 'index') {
    if (!Array.isArray(data)) return undefined
    return evaluatePath(data[head.index], rest)
  }

  if (typeof data !== 'object') return undefined
  return evaluatePath((data as Record<string, unknown>)[head.key], rest)
}

/** Deep-filter: keep branches whose key or primitive value contains the query */
function filterDeep(node: unknown, query: string): { keep: boolean; value: unknown } {
  if (node === null || typeof node !== 'object') {
    const keep = String(node).toLowerCase().includes(query)
    return { keep, value: node }
  }

  if (Array.isArray(node)) {
    const kept = node
      .map((item) => filterDeep(item, query))
      .filter((result) => result.keep)
      .map((result) => result.value)
    return { keep: kept.length > 0, value: kept }
  }

  const out: Record<string, unknown> = {}
  let any = false
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.toLowerCase().includes(query)) {
      // Key match keeps the whole subtree
      out[key] = value
      any = true
      continue
    }
    const child = filterDeep(value, query)
    if (child.keep) {
      out[key] = child.value
      any = true
    }
  }
  return { keep: any, value: out }
}

/**
 * Run a filter query against parsed JSON.
 * Queries starting with `$` or `.` are treated as paths ($.a.b[0], $.items[*].name);
 * anything else deep-filters keys and values by substring.
 */
export function runJsonQuery(data: unknown, rawQuery: string): JsonQueryResult {
  const query = rawQuery.trim()
  if (!query) return { data, error: null, matched: true }

  if (query.startsWith('$') || query.startsWith('.')) {
    const path = query.replace(/^\$/, '').replace(/^\./, '')
    if (!path) return { data, error: null, matched: true }

    const segments = parsePath(path)
    if (!segments) {
      return { data: null, error: 'Invalid path', matched: false }
    }

    const result = evaluatePath(data, segments)
    if (result !== undefined) {
      return { data: result, error: null, matched: true }
    }

    // Mid-typing fallback: walk back to the longest prefix that still matches,
    // so `$.headers.A` shows headers (filtered to keys starting with "A")
    // instead of snapping back to the whole response.
    for (let end = segments.length - 1; end >= 0; end--) {
      const prefixResult = evaluatePath(data, segments.slice(0, end))
      if (prefixResult === undefined) continue

      const matchedPath = formatPath(segments.slice(0, end))

      // If exactly the trailing segment failed and it's a key on an object,
      // treat it as a key prefix: `$.headers.Acc` -> Accept, Accept-Encoding…
      const tail = segments[end]
      if (
        end === segments.length - 1 &&
        tail.kind === 'key' &&
        prefixResult !== null &&
        typeof prefixResult === 'object' &&
        !Array.isArray(prefixResult)
      ) {
        const prefix = tail.key.toLowerCase()
        const filtered: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(prefixResult as Record<string, unknown>)) {
          if (key.toLowerCase().startsWith(prefix)) {
            filtered[key] = value
          }
        }
        if (Object.keys(filtered).length > 0) {
          return { data: filtered, error: null, matched: false, partial: true, matchedPath: `${matchedPath}.${tail.key}…` }
        }
      }

      return { data: prefixResult, error: null, matched: false, partial: true, matchedPath }
    }

    return { data: null, error: null, matched: false }
  }

  const { keep, value } = filterDeep(data, query.toLowerCase())
  if (!keep) return { data: null, error: null, matched: false }
  return { data: value, error: null, matched: true }
}
