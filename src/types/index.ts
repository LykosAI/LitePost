export interface Response {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  error?: string
  redirectChain?: {
    url: string
    status: number
    statusText: string
    headers: Record<string, string>
    cookies?: string[]
    timing?: ResponseTiming
    size?: ResponseSize
  }[]
  cookies?: string[]
  is_base64?: boolean
  timing?: ResponseTiming
  size?: ResponseSize
}

export interface ResponseTiming {
  start: number
  end: number
  duration: number
  dns?: number
  tcp?: number
  tls?: number
  request?: number
  first_byte?: number
  download?: number
  total: number
}

export interface ResponseSize {
  headers: number
  body: number
  total: number
}

export interface HistoryItem {
  method: string
  url: string
  rawUrl: string
  timestamp: Date
  params: URLParam[]
  headers: Header[]
  body: string
  contentType: string
  auth: AuthConfig
}

export interface URLParam {
  key: string
  value: string
  enabled: boolean
}

export interface Header {
  key: string
  value: string
  enabled: boolean
}

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key'

export interface AuthConfig {
  type: AuthType
  username?: string
  password?: string
  token?: string
  key?: string
  value?: string
  addTo?: 'header' | 'query'
}

export interface Session {
  id: string
  name: string
  cookies: Cookie[]
  headers: Header[]
  domain: string
  createdAt: Date
  lastUsed: Date
}

export interface TestScript {
  id: string
  name: string
  code: string
  enabled: boolean
}

export interface TestAssertion {
  id: string
  type: 'status' | 'json' | 'header' | 'responseTime'
  property?: string // For JSON path or header name
  operator: 'equals' | 'contains' | 'exists' | 'greaterThan' | 'lessThan'
  expected: string | number | boolean
  enabled: boolean
}

export interface TestResult {
  scriptId: string
  success: boolean
  error?: string
  assertions: {
    id: string
    success: boolean
    message: string
  }[]
  scriptResults: {
    name: string
    success: boolean
    message?: string
  }[]
  duration: number
}

export interface Tab {
  id: string
  name: string
  method: string
  url: string
  rawUrl: string
  params: URLParam[]
  headers: Header[]
  body: string
  contentType: string
  response: Response | null
  loading: boolean
  isEditing?: boolean
  auth: AuthConfig
  cookies: Cookie[]
  activeSession?: Session
  testScripts: TestScript[]
  testAssertions: TestAssertion[]
  testResults: TestResult | null
}

export interface Cookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: Date
  secure?: boolean
  httpOnly?: boolean
} 