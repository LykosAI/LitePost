/**
 * Build an example request body from an OpenAPI schema.
 *
 * An imported request that arrives with an empty body is barely a starting
 * point — you still have to go and read the spec to find out what the endpoint
 * wants. The spec already says, so fill it in.
 *
 * This produces a *shape*, not valid data: the point is to show the field names
 * and types so they can be edited, not to pass validation. Where the spec
 * offers something concrete (`example`, `default`, an `enum`) that is used in
 * preference to an invented value.
 */

type Schema = Record<string, unknown>

/** How deep to follow nested schemas before giving up. */
const MAX_DEPTH = 8

interface GenerateContext {
  /** Resolves `#/components/schemas/Pet` to its schema object. */
  resolve: (ref: string) => Schema | undefined
  /**
   * `$ref`s currently being expanded on this branch.
   *
   * Self-referential schemas are entirely normal — a tree node with children of
   * its own type, or Pet → Category → Pet. Without this the generator recurses
   * until the stack gives out.
   */
  active: Set<string>
  depth: number
}

function isSchema(value: unknown): value is Schema {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** A placeholder for a string, informed by `format` where one is given. */
function exampleString(schema: Schema): string {
  switch (schema.format) {
    case 'date-time':
      return '1970-01-01T00:00:00Z'
    case 'date':
      return '1970-01-01'
    case 'uuid':
      return '00000000-0000-0000-0000-000000000000'
    case 'email':
      return 'user@example.com'
    case 'uri':
    case 'url':
      return 'https://example.com'
    case 'byte':
      return ''
    case 'password':
      return ''
    default:
      return 'string'
  }
}

function generate(schema: unknown, ctx: GenerateContext): unknown {
  if (!isSchema(schema)) return null

  // Anything the spec states outright beats anything invented here.
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0]

  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref
    if (ctx.active.has(ref) || ctx.depth >= MAX_DEPTH) {
      // Cycle, or deep enough. `null` keeps the key visible so the shape still
      // reads correctly, rather than dropping the field silently.
      return null
    }
    const resolved = ctx.resolve(ref)
    if (!resolved) return null

    ctx.active.add(ref)
    const value = generate(resolved, { ...ctx, depth: ctx.depth + 1 })
    ctx.active.delete(ref)
    return value
  }

  if (ctx.depth >= MAX_DEPTH) return null

  const next = { ...ctx, depth: ctx.depth + 1 }

  // allOf is composition — merge the pieces into one object.
  if (Array.isArray(schema.allOf)) {
    const merged: Record<string, unknown> = {}
    for (const part of schema.allOf) {
      const value = generate(part, next)
      if (isSchema(value)) Object.assign(merged, value)
    }
    return merged
  }

  // oneOf/anyOf: no basis for choosing, so take the first and let the user edit.
  const variants = schema.oneOf ?? schema.anyOf
  if (Array.isArray(variants) && variants.length > 0) {
    return generate(variants[0], next)
  }

  if (Array.isArray(schema.type)) {
    // OpenAPI 3.1 allows a type union, commonly ["string", "null"].
    const concrete = schema.type.find((t) => t !== 'null') ?? schema.type[0]
    return generate({ ...schema, type: concrete }, ctx)
  }

  switch (schema.type) {
    case 'object':
    case undefined: {
      if (!isSchema(schema.properties)) {
        // A free-form object, or `additionalProperties` only.
        return schema.type === 'object' ? {} : null
      }
      const result: Record<string, unknown> = {}
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (isSchema(propSchema) && propSchema.readOnly === true) continue
        result[key] = generate(propSchema, next)
      }
      return result
    }
    case 'array': {
      const item = generate(schema.items, next)
      // One element is enough to show the shape.
      return item === null && !isSchema(schema.items) ? [] : [item]
    }
    case 'string':
      return exampleString(schema)
    case 'integer':
      return 0
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    default:
      return null
  }
}

/** Look up a local `#/components/schemas/Name` pointer in the document. */
export function makeRefResolver(document: unknown): (ref: string) => Schema | undefined {
  return (ref: string) => {
    if (!ref.startsWith('#/')) return undefined // external refs are not fetched
    let node: unknown = document
    for (const rawSegment of ref.slice(2).split('/')) {
      // JSON Pointer escapes, per RFC 6901.
      const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~')
      if (!isSchema(node)) return undefined
      node = node[segment]
    }
    return isSchema(node) ? node : undefined
  }
}

/**
 * Render an example body for a media-type object, as formatted JSON.
 * Returns an empty string when there is nothing useful to show.
 */
export function exampleBodyFor(mediaType: unknown, document: unknown): string {
  if (!isSchema(mediaType)) return ''

  // A spec-provided example is always better than a generated one.
  if (mediaType.example !== undefined) {
    return JSON.stringify(mediaType.example, null, 2)
  }
  if (isSchema(mediaType.examples)) {
    const first = Object.values(mediaType.examples)[0]
    if (isSchema(first) && first.value !== undefined) {
      return JSON.stringify(first.value, null, 2)
    }
  }

  if (!mediaType.schema) return ''

  try {
    const value = generate(mediaType.schema, {
      resolve: makeRefResolver(document),
      active: new Set(),
      depth: 0,
    })
    if (value === null || value === undefined) return ''
    return JSON.stringify(value, null, 2)
  } catch {
    // A malformed schema must not take the whole import down with it.
    return ''
  }
}

/**
 * Choose which media type to import a body for.
 *
 * JSON is preferred over whatever happens to be listed first — Swashbuckle
 * commonly emits `application/json`, `application/xml` and a form variant for
 * the same operation, and picking by position lands on XML often enough to be
 * annoying.
 */
export function pickContentType(contentTypes: string[]): string | undefined {
  if (contentTypes.length === 0) return undefined
  return (
    contentTypes.find((type) => /^application\/(json|.*\+json)/i.test(type)) ??
    contentTypes[0]
  )
}
