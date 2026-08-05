import { describe, it, expect } from 'vitest'
import { exampleBodyFor, pickContentType, makeRefResolver } from '@/utils/openapiExample'
import { importFromOpenapi } from '@/utils/collection-converter'

const doc = {
  components: {
    schemas: {
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
          category: { $ref: '#/components/schemas/Category' },
          photoUrls: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['available', 'pending', 'sold'] },
        },
      },
      Category: {
        type: 'object',
        properties: { id: { type: 'integer' }, name: { type: 'string' } },
      },
      // Self-referential: a category that contains categories.
      Node: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          children: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
        },
      },
      // Mutually recursive pair.
      A: { type: 'object', properties: { b: { $ref: '#/components/schemas/B' } } },
      B: { type: 'object', properties: { a: { $ref: '#/components/schemas/A' } } },
    },
  },
}

const bodyFor = (schema: unknown) => JSON.parse(exampleBodyFor({ schema }, doc) || 'null')

describe('exampleBodyFor', () => {
  it('expands a $ref into the full shape', () => {
    expect(bodyFor({ $ref: '#/components/schemas/Pet' })).toEqual({
      id: 0,
      name: 'string',
      category: { id: 0, name: 'string' },
      photoUrls: ['string'],
      status: 'available', // first enum value, not an invented string
    })
  })

  it('prefers a spec-provided example over anything generated', () => {
    const explicit = { name: 'Fido', id: 7 }
    expect(JSON.parse(exampleBodyFor({ schema: { $ref: '#/components/schemas/Pet' }, example: explicit }, doc)))
      .toEqual(explicit)
  })

  it('reads the first entry of an examples map', () => {
    const media = { schema: { type: 'string' }, examples: { ok: { value: { hello: 'world' } } } }
    expect(JSON.parse(exampleBodyFor(media, doc))).toEqual({ hello: 'world' })
  })

  it('honours default over a generated placeholder', () => {
    expect(bodyFor({ type: 'object', properties: { n: { type: 'integer', default: 42 } } }))
      .toEqual({ n: 42 })
  })

  it('uses formats to make strings plausible', () => {
    expect(bodyFor({
      type: 'object',
      properties: {
        when: { type: 'string', format: 'date-time' },
        id: { type: 'string', format: 'uuid' },
        mail: { type: 'string', format: 'email' },
      },
    })).toEqual({
      when: '1970-01-01T00:00:00Z',
      id: '00000000-0000-0000-0000-000000000000',
      mail: 'user@example.com',
    })
  })

  it('merges allOf composition into one object', () => {
    expect(bodyFor({
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { type: 'object', properties: { b: { type: 'boolean' } } },
      ],
    })).toEqual({ a: 'string', b: false })
  })

  it('takes the first branch of oneOf', () => {
    expect(bodyFor({ oneOf: [{ type: 'string' }, { type: 'integer' }] })).toBe('string')
  })

  it('omits readOnly properties, which a request body must not send', () => {
    expect(bodyFor({
      type: 'object',
      properties: { id: { type: 'integer', readOnly: true }, name: { type: 'string' } },
    })).toEqual({ name: 'string' })
  })

  it('handles a 3.1 nullable type union', () => {
    expect(bodyFor({ type: 'object', properties: { n: { type: ['string', 'null'] } } }))
      .toEqual({ n: 'string' })
  })

  describe('recursion', () => {
    // These are the cases that turn a naive generator into a stack overflow.
    it('terminates on a self-referential schema', () => {
      const result = bodyFor({ $ref: '#/components/schemas/Node' })
      expect(result).toEqual({ name: 'string', children: [null] })
    })

    it('terminates on a mutually recursive pair', () => {
      expect(bodyFor({ $ref: '#/components/schemas/A' })).toEqual({ b: { a: null } })
    })

    it('survives a $ref that does not resolve', () => {
      expect(bodyFor({ $ref: '#/components/schemas/Nope' })).toBeNull()
    })

    it('does not chase external refs', () => {
      expect(bodyFor({ $ref: 'https://example.com/schema.json#/Pet' })).toBeNull()
    })
  })

  it('returns an empty string when there is no schema at all', () => {
    expect(exampleBodyFor({}, doc)).toBe('')
    expect(exampleBodyFor(null, doc)).toBe('')
  })
})

describe('makeRefResolver', () => {
  it('resolves a components pointer', () => {
    expect(makeRefResolver(doc)('#/components/schemas/Category')).toEqual(
      doc.components.schemas.Category
    )
  })

  it('unescapes JSON Pointer segments', () => {
    const escaped = { paths: { '/pet': { get: { type: 'object' } } } }
    expect(makeRefResolver(escaped)('#/paths/~1pet/get')).toEqual({ type: 'object' })
  })
})

describe('pickContentType', () => {
  it('prefers JSON over whatever is listed first', () => {
    // Swashbuckle commonly lists xml before json for the same operation.
    expect(pickContentType(['application/xml', 'application/json'])).toBe('application/json')
  })

  it('recognises +json suffixes', () => {
    expect(pickContentType(['application/xml', 'application/merge-patch+json']))
      .toBe('application/merge-patch+json')
  })

  it('falls back to the first when there is no JSON', () => {
    expect(pickContentType(['application/xml', 'text/plain'])).toBe('application/xml')
    expect(pickContentType([])).toBeUndefined()
  })
})

describe('importFromOpenapi request bodies', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: doc.components,
    paths: {
      '/pet': {
        post: {
          summary: 'Add a pet',
          requestBody: {
            content: {
              'application/xml': { schema: { $ref: '#/components/schemas/Pet' } },
              'application/json': { schema: { $ref: '#/components/schemas/Pet' } },
            },
          },
        },
      },
      '/ping': { get: { summary: 'Ping' } },
    },
  }

  it('fills the body in and picks the JSON content type', () => {
    const [collection] = importFromOpenapi(spec, 'https://api.example.com')
    const post = collection.requests.find((r) => r.method === 'POST')!

    expect(post.contentType).toBe('application/json')
    expect(JSON.parse(post.body).name).toBe('string')
    expect(post.body).toContain('\n') // formatted, not a single line
  })

  it('leaves a GET with no request body empty', () => {
    const [collection] = importFromOpenapi(spec, 'https://api.example.com')
    const get = collection.requests.find((r) => r.method === 'GET')!
    expect(get.body).toBe('')
  })

  it('does not generate a JSON body for an XML-only endpoint', () => {
    const xmlOnly = {
      ...spec,
      paths: {
        '/x': {
          post: { requestBody: { content: { 'application/xml': { schema: { type: 'object' } } } } },
        },
      },
    }
    const [collection] = importFromOpenapi(xmlOnly, 'https://api.example.com')
    expect(collection.requests[0].contentType).toBe('application/xml')
    expect(collection.requests[0].body).toBe('')
  })
})
