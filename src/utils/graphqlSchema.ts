import type { editor as MonacoEditor, languages, Position, IRange } from 'monaco-editor'

// --- Introspection Query ---

export const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          name
          description
          type { ...TypeRef }
          defaultValue
        }
        type { ...TypeRef }
        isDeprecated
        deprecationReason
      }
      inputFields {
        name
        description
        type { ...TypeRef }
        defaultValue
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
      }
      possibleTypes { ...TypeRef }
    }
  }
}
fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
        }
      }
    }
  }
}`

// --- Introspection Types ---

export interface IntrospectionTypeRef {
  kind: string
  name: string | null
  ofType: IntrospectionTypeRef | null
}

export interface IntrospectionInputValue {
  name: string
  description: string | null
  type: IntrospectionTypeRef
  defaultValue: string | null
}

export interface IntrospectionField {
  name: string
  description: string | null
  args: IntrospectionInputValue[]
  type: IntrospectionTypeRef
  isDeprecated: boolean
  deprecationReason: string | null
}

export interface IntrospectionEnumValue {
  name: string
  description: string | null
  isDeprecated: boolean
}

export interface IntrospectionType {
  kind: string
  name: string | null
  description: string | null
  fields: IntrospectionField[] | null
  inputFields: IntrospectionInputValue[] | null
  enumValues: IntrospectionEnumValue[] | null
  possibleTypes: IntrospectionTypeRef[] | null
}

export interface ParsedSchema {
  queryTypeName: string | null
  mutationTypeName: string | null
  subscriptionTypeName: string | null
  types: Map<string, IntrospectionType>
  fetchedAt: number
}

// --- Schema Parsing ---

export function parseIntrospectionResult(body: string): ParsedSchema {
  const json = JSON.parse(body)
  const schema = json.data?.__schema
  if (!schema) {
    throw new Error('Invalid introspection response: missing __schema')
  }

  const types = new Map<string, IntrospectionType>()
  for (const type of schema.types ?? []) {
    if (type.name) {
      types.set(type.name, type)
    }
  }

  return {
    queryTypeName: schema.queryType?.name ?? null,
    mutationTypeName: schema.mutationType?.name ?? null,
    subscriptionTypeName: schema.subscriptionType?.name ?? null,
    types,
    fetchedAt: Date.now(),
  }
}

// --- Type Utilities ---

export function unwrapTypeName(typeRef: IntrospectionTypeRef): string | null {
  let current: IntrospectionTypeRef | null = typeRef
  while (current) {
    if (current.name) return current.name
    current = current.ofType
  }
  return null
}

export function formatTypeRef(typeRef: IntrospectionTypeRef): string {
  if (typeRef.kind === 'NON_NULL') {
    return typeRef.ofType ? `${formatTypeRef(typeRef.ofType)}!` : '!'
  }
  if (typeRef.kind === 'LIST') {
    return typeRef.ofType ? `[${formatTypeRef(typeRef.ofType)}]` : '[]'
  }
  return typeRef.name || 'Unknown'
}

// --- Completion Context ---

interface FieldPathEntry {
  fieldName: string
}

function getFieldPath(text: string, offset: number): FieldPathEntry[] {
  const textBefore = text.substring(0, offset)
  // Remove comments and strings
  const cleaned = textBefore.replace(/#[^\n]*/g, '').replace(/"""[\s\S]*?"""/g, '""').replace(/"[^"]*"/g, '""')

  const stack: FieldPathEntry[] = []
  let lastIdentifier = ''
  let i = 0

  while (i < cleaned.length) {
    const ch = cleaned[i]

    if (/[a-zA-Z_]/.test(ch)) {
      let id = ''
      while (i < cleaned.length && /[a-zA-Z0-9_]/.test(cleaned[i])) {
        id += cleaned[i]
        i++
      }
      // Don't use keywords as field names
      if (['query', 'mutation', 'subscription', 'fragment', 'on', 'true', 'false', 'null'].includes(id)) {
        lastIdentifier = ''
      } else {
        lastIdentifier = id
      }
      continue
    }

    if (ch === '(') {
      let parenDepth = 1
      i++
      while (i < cleaned.length && parenDepth > 0) {
        if (cleaned[i] === '(') parenDepth++
        if (cleaned[i] === ')') parenDepth--
        i++
      }
      continue
    }

    if (ch === '{') {
      stack.push({ fieldName: lastIdentifier })
      lastIdentifier = ''
      i++
      continue
    }

    if (ch === '}') {
      stack.pop()
      lastIdentifier = ''
      i++
      continue
    }

    i++
  }

  return stack
}

function findOperationType(text: string, offset: number): 'query' | 'mutation' | 'subscription' {
  const textBefore = text.substring(0, offset)
  const cleaned = textBefore.replace(/#[^\n]*/g, '')

  const queryIdx = cleaned.lastIndexOf('query')
  const mutationIdx = cleaned.lastIndexOf('mutation')
  const subscriptionIdx = cleaned.lastIndexOf('subscription')

  const max = Math.max(queryIdx, mutationIdx, subscriptionIdx)
  if (max < 0) return 'query'
  if (max === mutationIdx) return 'mutation'
  if (max === subscriptionIdx) return 'subscription'
  return 'query'
}

function isInsideParentheses(text: string, offset: number): { inside: boolean; fieldName: string } {
  const textBefore = text.substring(0, offset)
  const cleaned = textBefore.replace(/#[^\n]*/g, '').replace(/"[^"]*"/g, '""')

  let parenDepth = 0
  let lastIdentifier = ''
  let fieldBeforeParen = ''

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (/[a-zA-Z_]/.test(ch)) {
      let id = ''
      while (i < cleaned.length && /[a-zA-Z0-9_]/.test(cleaned[i])) {
        id += cleaned[i]
        i++
      }
      i-- // loop will increment
      lastIdentifier = id
      continue
    }
    if (ch === '(') {
      parenDepth++
      fieldBeforeParen = lastIdentifier
      lastIdentifier = ''
    }
    if (ch === ')') {
      parenDepth--
    }
  }

  return { inside: parenDepth > 0, fieldName: parenDepth > 0 ? fieldBeforeParen : '' }
}

export interface CompletionContext {
  type: 'field' | 'argument' | 'none'
  suggestions: CompletionSuggestion[]
}

export interface CompletionSuggestion {
  label: string
  detail: string
  description: string | null
  isDeprecated: boolean
  kind: 'field' | 'argument' | 'enum'
  insertText?: string
}

export function getCompletionContext(
  text: string,
  offset: number,
  schema: ParsedSchema,
): CompletionContext {
  // Check if inside argument parentheses
  const parenCtx = isInsideParentheses(text, offset)
  if (parenCtx.inside && parenCtx.fieldName) {
    return getArgumentCompletions(text, offset, parenCtx.fieldName, schema)
  }

  // Field completions
  const operationType = findOperationType(text, offset)
  let rootTypeName: string | null
  if (operationType === 'mutation') rootTypeName = schema.mutationTypeName
  else if (operationType === 'subscription') rootTypeName = schema.subscriptionTypeName
  else rootTypeName = schema.queryTypeName

  if (!rootTypeName) return { type: 'none', suggestions: [] }

  const fieldPath = getFieldPath(text, offset)
  if (fieldPath.length === 0) return { type: 'none', suggestions: [] }

  // Walk the type tree
  let currentType = schema.types.get(rootTypeName)
  if (!currentType) return { type: 'none', suggestions: [] }

  // Skip first entry (root operation, empty field name)
  for (let i = 1; i < fieldPath.length; i++) {
    const entry = fieldPath[i]
    if (!entry.fieldName || !currentType?.fields) break

    const field = currentType.fields.find(f => f.name === entry.fieldName)
    if (!field) break

    const typeName = unwrapTypeName(field.type)
    if (!typeName) break

    currentType = schema.types.get(typeName)
    if (!currentType) return { type: 'none', suggestions: [] }
  }

  if (!currentType?.fields) return { type: 'none', suggestions: [] }

  const suggestions: CompletionSuggestion[] = currentType.fields
    .filter(f => !f.name.startsWith('__'))
    .map(f => ({
      label: f.name,
      detail: formatTypeRef(f.type),
      description: f.description,
      isDeprecated: f.isDeprecated,
      kind: 'field' as const,
      insertText: hasSubfields(f.type, schema) ? `${f.name} {\n  $0\n}` : f.name,
    }))

  return { type: 'field', suggestions }
}

function getArgumentCompletions(
  text: string,
  offset: number,
  fieldName: string,
  schema: ParsedSchema,
): CompletionContext {
  // Find the parent type to look up the field's arguments
  const operationType = findOperationType(text, offset)
  let rootTypeName: string | null
  if (operationType === 'mutation') rootTypeName = schema.mutationTypeName
  else if (operationType === 'subscription') rootTypeName = schema.subscriptionTypeName
  else rootTypeName = schema.queryTypeName

  if (!rootTypeName) return { type: 'none', suggestions: [] }

  const fieldPath = getFieldPath(text, offset)
  let currentType = schema.types.get(rootTypeName)
  if (!currentType) return { type: 'none', suggestions: [] }

  // Walk to parent type (all but last entry which is the { containing the parenthesized field)
  for (let i = 1; i < fieldPath.length; i++) {
    const entry = fieldPath[i]
    if (!entry.fieldName || !currentType?.fields) break

    const field = currentType.fields.find(f => f.name === entry.fieldName)
    if (!field) break

    const typeName = unwrapTypeName(field.type)
    if (!typeName) break

    currentType = schema.types.get(typeName)
    if (!currentType) return { type: 'none', suggestions: [] }
  }

  // Now find the field with arguments
  const field = currentType?.fields?.find(f => f.name === fieldName)
  if (!field?.args?.length) return { type: 'none', suggestions: [] }

  const suggestions: CompletionSuggestion[] = field.args.map(arg => ({
    label: arg.name,
    detail: formatTypeRef(arg.type),
    description: arg.description,
    isDeprecated: false,
    kind: 'argument' as const,
    insertText: `${arg.name}: `,
  }))

  return { type: 'argument', suggestions }
}

function hasSubfields(typeRef: IntrospectionTypeRef, schema: ParsedSchema): boolean {
  const typeName = unwrapTypeName(typeRef)
  if (!typeName) return false
  const type = schema.types.get(typeName)
  return type?.kind === 'OBJECT' || type?.kind === 'INTERFACE' || type?.kind === 'UNION'
}

// --- Operation Extraction ---

export interface ExtractedOperation {
  type: 'query' | 'mutation' | 'subscription'
  name: string
}

export function extractOperations(query: string): ExtractedOperation[] {
  const ops: ExtractedOperation[] = []
  const regex = /\b(query|mutation|subscription)\s+(\w+)/g
  let match
  while ((match = regex.exec(query)) !== null) {
    ops.push({ type: match[1] as ExtractedOperation['type'], name: match[2] })
  }
  return ops
}

// --- Monaco GraphQL Language ---

let graphqlRegistered = false

export function registerGraphQLLanguage(monacoInstance: typeof import('monaco-editor')) {
  if (graphqlRegistered) return
  graphqlRegistered = true

  monacoInstance.languages.register({ id: 'graphql' })

  monacoInstance.languages.setMonarchTokensProvider('graphql', {
    keywords: [
      'query', 'mutation', 'subscription', 'fragment', 'on',
      'type', 'interface', 'union', 'enum', 'input', 'scalar',
      'schema', 'extend', 'directive', 'implements', 'repeatable',
    ],
    typeKeywords: ['Int', 'Float', 'String', 'Boolean', 'ID'],
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/"""/, 'string', '@blockstring'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
        [/\$[a-zA-Z_]\w*/, 'variable'],
        [/@[a-zA-Z_]\w*/, 'annotation'],
        [/\.\.\./, 'delimiter'],
        [/[A-Z]\w*/, {
          cases: {
            '@typeKeywords': 'type',
            '@default': 'type.identifier',
          },
        }],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            'true|false|null': 'keyword.constant',
            '@default': 'identifier',
          },
        }],
        [/[{}()[\]]/, '@brackets'],
        [/[!:=|&]/, 'delimiter'],
        [/,/, 'delimiter'],
      ],
      blockstring: [
        [/"""/, 'string', '@pop'],
        [/./, 'string'],
      ],
    },
  } as languages.IMonarchLanguage)

  monacoInstance.languages.setLanguageConfiguration('graphql', {
    comments: { lineComment: '#' },
    brackets: [
      ['{', '}'],
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
  })
}

// --- Monaco Completion Provider ---

export function createCompletionProvider(
  schemaRef: { current: ParsedSchema | null },
): languages.CompletionItemProvider {
  return {
    triggerCharacters: ['{', ' ', '\n', '(', ','],
    provideCompletionItems(
      model: MonacoEditor.ITextModel,
      position: Position,
    ): languages.CompletionList {
      const schema = schemaRef.current
      if (!schema) return { suggestions: [] }

      const text = model.getValue()
      const offset = model.getOffsetAt(position)

      const ctx = getCompletionContext(text, offset, schema)
      if (ctx.type === 'none') return { suggestions: [] }

      const word = model.getWordUntilPosition(position)
      const range: IRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      }

      // Import CompletionItemKind values
      // Monaco enum: Field=4, Variable=5, Property=9, Value=11, Enum=15
      const suggestions: languages.CompletionItem[] = ctx.suggestions.map((s, i) => ({
        label: s.isDeprecated ? `${s.label} (deprecated)` : s.label,
        kind: s.kind === 'field' ? 4 : s.kind === 'argument' ? 5 : 15,
        detail: s.detail,
        documentation: s.description || undefined,
        insertText: s.insertText || s.label,
        insertTextRules: s.insertText?.includes('$0') ? 4 : 0, // InsertAsSnippet = 4
        range,
        sortText: String(i).padStart(4, '0'),
        tags: s.isDeprecated ? [1] : undefined, // Deprecated tag
      }))

      return { suggestions }
    },
  }
}

// --- GraphQL Error Detection ---

export interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: (string | number)[]
  extensions?: Record<string, unknown>
}

export function extractGraphQLErrors(body: string): GraphQLError[] | null {
  try {
    const json = JSON.parse(body)
    if (json.errors && Array.isArray(json.errors) && json.errors.length > 0) {
      return json.errors
    }
  } catch {
    // Not JSON or invalid
  }
  return null
}
