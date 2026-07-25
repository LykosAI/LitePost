import { describe, it, expect } from 'vitest'
import {
  parseIntrospectionResult,
  unwrapTypeName,
  formatTypeRef,
  extractOperations,
  extractGraphQLErrors,
  getCompletionContext,
  type IntrospectionTypeRef,
  type ParsedSchema,
} from '@/utils/graphqlSchema'

// --- Test helpers ---

function makeTypeRef(kind: string, name: string | null, ofType?: IntrospectionTypeRef): IntrospectionTypeRef {
  return { kind, name, ofType: ofType ?? null }
}

function buildMockIntrospectionResponse(): string {
  return JSON.stringify({
    data: {
      __schema: {
        queryType: { name: 'Query' },
        mutationType: { name: 'Mutation' },
        subscriptionType: null,
        types: [
          {
            kind: 'OBJECT',
            name: 'Query',
            description: 'Root query type',
            fields: [
              {
                name: 'users',
                description: 'Get all users',
                args: [
                  {
                    name: 'limit',
                    description: 'Max results',
                    type: makeTypeRef('SCALAR', 'Int'),
                    defaultValue: '10',
                  },
                  {
                    name: 'offset',
                    description: null,
                    type: makeTypeRef('SCALAR', 'Int'),
                    defaultValue: null,
                  },
                ],
                type: makeTypeRef('NON_NULL', null, makeTypeRef('LIST', null, makeTypeRef('OBJECT', 'User'))),
                isDeprecated: false,
                deprecationReason: null,
              },
              {
                name: 'user',
                description: 'Get user by ID',
                args: [
                  {
                    name: 'id',
                    description: 'User ID',
                    type: makeTypeRef('NON_NULL', null, makeTypeRef('SCALAR', 'ID')),
                    defaultValue: null,
                  },
                ],
                type: makeTypeRef('OBJECT', 'User'),
                isDeprecated: false,
                deprecationReason: null,
              },
              {
                name: 'oldField',
                description: 'Deprecated field',
                args: [],
                type: makeTypeRef('SCALAR', 'String'),
                isDeprecated: true,
                deprecationReason: 'Use newField instead',
              },
            ],
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'OBJECT',
            name: 'User',
            description: 'A user',
            fields: [
              {
                name: 'id',
                description: null,
                args: [],
                type: makeTypeRef('NON_NULL', null, makeTypeRef('SCALAR', 'ID')),
                isDeprecated: false,
                deprecationReason: null,
              },
              {
                name: 'name',
                description: 'Display name',
                args: [],
                type: makeTypeRef('SCALAR', 'String'),
                isDeprecated: false,
                deprecationReason: null,
              },
              {
                name: 'posts',
                description: null,
                args: [],
                type: makeTypeRef('LIST', null, makeTypeRef('OBJECT', 'Post')),
                isDeprecated: false,
                deprecationReason: null,
              },
            ],
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'OBJECT',
            name: 'Post',
            description: null,
            fields: [
              {
                name: 'id',
                description: null,
                args: [],
                type: makeTypeRef('NON_NULL', null, makeTypeRef('SCALAR', 'ID')),
                isDeprecated: false,
                deprecationReason: null,
              },
              {
                name: 'title',
                description: null,
                args: [],
                type: makeTypeRef('SCALAR', 'String'),
                isDeprecated: false,
                deprecationReason: null,
              },
            ],
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'OBJECT',
            name: 'Mutation',
            description: null,
            fields: [
              {
                name: 'createUser',
                description: 'Create a new user',
                args: [
                  {
                    name: 'name',
                    description: null,
                    type: makeTypeRef('NON_NULL', null, makeTypeRef('SCALAR', 'String')),
                    defaultValue: null,
                  },
                ],
                type: makeTypeRef('OBJECT', 'User'),
                isDeprecated: false,
                deprecationReason: null,
              },
            ],
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'SCALAR',
            name: 'String',
            description: null,
            fields: null,
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'SCALAR',
            name: 'Int',
            description: null,
            fields: null,
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'SCALAR',
            name: 'ID',
            description: null,
            fields: null,
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
          {
            kind: 'SCALAR',
            name: 'Boolean',
            description: null,
            fields: null,
            inputFields: null,
            enumValues: null,
            possibleTypes: null,
          },
        ],
      },
    },
  })
}

// --- Tests ---

describe('parseIntrospectionResult', () => {
  it('parses a valid introspection response', () => {
    const schema = parseIntrospectionResult(buildMockIntrospectionResponse())

    expect(schema.queryTypeName).toBe('Query')
    expect(schema.mutationTypeName).toBe('Mutation')
    expect(schema.subscriptionTypeName).toBeNull()
    expect(schema.types.size).toBe(8)
    expect(schema.types.has('Query')).toBe(true)
    expect(schema.types.has('User')).toBe(true)
    expect(schema.types.has('Post')).toBe(true)
    expect(schema.fetchedAt).toBeGreaterThan(0)
  })

  it('throws on invalid response', () => {
    expect(() => parseIntrospectionResult('{"data":{}}')).toThrow('missing __schema')
    expect(() => parseIntrospectionResult('not json')).toThrow()
  })

  it('handles response with null types', () => {
    const response = JSON.stringify({
      data: {
        __schema: {
          queryType: { name: 'Query' },
          mutationType: null,
          subscriptionType: null,
          types: [],
        },
      },
    })
    const schema = parseIntrospectionResult(response)
    expect(schema.types.size).toBe(0)
    expect(schema.mutationTypeName).toBeNull()
  })
})

describe('unwrapTypeName', () => {
  it('unwraps scalar type', () => {
    expect(unwrapTypeName(makeTypeRef('SCALAR', 'String'))).toBe('String')
  })

  it('unwraps non-null type', () => {
    expect(unwrapTypeName(makeTypeRef('NON_NULL', null, makeTypeRef('SCALAR', 'Int')))).toBe('Int')
  })

  it('unwraps list of non-null', () => {
    const ref = makeTypeRef('LIST', null, makeTypeRef('NON_NULL', null, makeTypeRef('OBJECT', 'User')))
    expect(unwrapTypeName(ref)).toBe('User')
  })

  it('returns null for empty chain', () => {
    expect(unwrapTypeName(makeTypeRef('NON_NULL', null))).toBeNull()
  })
})

describe('formatTypeRef', () => {
  it('formats scalar', () => {
    expect(formatTypeRef(makeTypeRef('SCALAR', 'String'))).toBe('String')
  })

  it('formats non-null', () => {
    expect(formatTypeRef(makeTypeRef('NON_NULL', null, makeTypeRef('SCALAR', 'String')))).toBe('String!')
  })

  it('formats list', () => {
    expect(formatTypeRef(makeTypeRef('LIST', null, makeTypeRef('OBJECT', 'User')))).toBe('[User]')
  })

  it('formats non-null list of non-null', () => {
    const ref = makeTypeRef('NON_NULL', null,
      makeTypeRef('LIST', null,
        makeTypeRef('NON_NULL', null,
          makeTypeRef('SCALAR', 'Int'))))
    expect(formatTypeRef(ref)).toBe('[Int!]!')
  })
})

describe('extractOperations', () => {
  it('extracts named query', () => {
    const ops = extractOperations('query GetUsers { users { id } }')
    expect(ops).toEqual([{ type: 'query', name: 'GetUsers' }])
  })

  it('extracts multiple operations', () => {
    const ops = extractOperations(`
      query GetUsers { users { id } }
      mutation CreateUser { createUser(name: "test") { id } }
    `)
    expect(ops).toHaveLength(2)
    expect(ops[0]).toEqual({ type: 'query', name: 'GetUsers' })
    expect(ops[1]).toEqual({ type: 'mutation', name: 'CreateUser' })
  })

  it('extracts subscription', () => {
    const ops = extractOperations('subscription OnMessage { messages { text } }')
    expect(ops).toEqual([{ type: 'subscription', name: 'OnMessage' }])
  })

  it('returns empty for anonymous query', () => {
    const ops = extractOperations('{ users { id } }')
    expect(ops).toEqual([])
  })

  it('returns empty for empty string', () => {
    expect(extractOperations('')).toEqual([])
  })
})

describe('extractGraphQLErrors', () => {
  it('extracts errors from response body', () => {
    const body = JSON.stringify({
      data: null,
      errors: [
        {
          message: 'Cannot query field "foo" on type "User"',
          locations: [{ line: 3, column: 5 }],
          path: ['users', 0, 'foo'],
        },
      ],
    })
    const errors = extractGraphQLErrors(body)
    expect(errors).toHaveLength(1)
    expect(errors![0].message).toBe('Cannot query field "foo" on type "User"')
    expect(errors![0].locations).toEqual([{ line: 3, column: 5 }])
    expect(errors![0].path).toEqual(['users', 0, 'foo'])
  })

  it('returns null when no errors', () => {
    const body = JSON.stringify({ data: { users: [] } })
    expect(extractGraphQLErrors(body)).toBeNull()
  })

  it('returns null for empty errors array', () => {
    const body = JSON.stringify({ data: null, errors: [] })
    expect(extractGraphQLErrors(body)).toBeNull()
  })

  it('returns null for non-JSON body', () => {
    expect(extractGraphQLErrors('not json')).toBeNull()
  })

  it('handles multiple errors', () => {
    const body = JSON.stringify({
      errors: [
        { message: 'Error 1' },
        { message: 'Error 2' },
      ],
    })
    const errors = extractGraphQLErrors(body)
    expect(errors).toHaveLength(2)
  })
})

describe('getCompletionContext', () => {
  let schema: ParsedSchema

  beforeAll(() => {
    schema = parseIntrospectionResult(buildMockIntrospectionResponse())
  })

  it('returns root query fields at top level', () => {
    const text = 'query {\n  \n}'
    const offset = 10 // inside the braces, after newline+spaces
    const ctx = getCompletionContext(text, offset, schema)

    expect(ctx.type).toBe('field')
    expect(ctx.suggestions.map(s => s.label)).toContain('users')
    expect(ctx.suggestions.map(s => s.label)).toContain('user')
    expect(ctx.suggestions.map(s => s.label)).toContain('oldField')
  })

  it('returns nested type fields', () => {
    const text = 'query {\n  users {\n    \n  }\n}'
    const offset = 21 // inside users { ... }
    const ctx = getCompletionContext(text, offset, schema)

    expect(ctx.type).toBe('field')
    const labels = ctx.suggestions.map(s => s.label)
    expect(labels).toContain('id')
    expect(labels).toContain('name')
    expect(labels).toContain('posts')
    // Should NOT contain Query-level fields
    expect(labels).not.toContain('users')
  })

  it('returns deeply nested fields', () => {
    const text = 'query {\n  users {\n    posts {\n      \n    }\n  }\n}'
    const offset = 33 // inside posts { ... }
    const ctx = getCompletionContext(text, offset, schema)

    expect(ctx.type).toBe('field')
    const labels = ctx.suggestions.map(s => s.label)
    expect(labels).toContain('id')
    expect(labels).toContain('title')
    expect(labels).not.toContain('name') // User field, not Post field
  })

  it('returns mutation fields for mutation operations', () => {
    const text = 'mutation {\n  \n}'
    const offset = 13
    const ctx = getCompletionContext(text, offset, schema)

    expect(ctx.type).toBe('field')
    expect(ctx.suggestions.map(s => s.label)).toContain('createUser')
  })

  it('returns argument completions inside parentheses', () => {
    const text = 'query {\n  users(\n}'
    const offset = 16 // inside users(...)
    const ctx = getCompletionContext(text, offset, schema)

    expect(ctx.type).toBe('argument')
    const labels = ctx.suggestions.map(s => s.label)
    expect(labels).toContain('limit')
    expect(labels).toContain('offset')
  })

  it('returns no suggestions for empty schema', () => {
    const emptySchema: ParsedSchema = {
      queryTypeName: null,
      mutationTypeName: null,
      subscriptionTypeName: null,
      types: new Map(),
      fetchedAt: 0,
    }
    const text = 'query {\n  \n}'
    const ctx = getCompletionContext(text, 10, emptySchema)
    expect(ctx.type).toBe('none')
  })

  it('marks deprecated fields', () => {
    const text = 'query {\n  \n}'
    const ctx = getCompletionContext(text, 10, schema)
    const deprecated = ctx.suggestions.find(s => s.label === 'oldField')
    expect(deprecated?.isDeprecated).toBe(true)
  })

  it('includes type details in suggestions', () => {
    const text = 'query {\n  \n}'
    const ctx = getCompletionContext(text, 10, schema)
    const usersField = ctx.suggestions.find(s => s.label === 'users')
    expect(usersField?.detail).toBe('[User]!')
  })

  it('provides snippet insert text for object fields', () => {
    const text = 'query {\n  \n}'
    const ctx = getCompletionContext(text, 10, schema)
    const usersField = ctx.suggestions.find(s => s.label === 'users')
    expect(usersField?.insertText).toContain('{')
    expect(usersField?.insertText).toContain('$0')

    const oldField = ctx.suggestions.find(s => s.label === 'oldField')
    expect(oldField?.insertText).toBe('oldField')
  })
})

// Need this for beforeAll
import { beforeAll } from 'vitest'
