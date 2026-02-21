export interface Response {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  error?: string
  redirectChain: {
    url: string
    status: number
    statusText: string
    headers: Record<string, string>
    cookies?: Cookie[]
    timing?: ResponseTiming
    size?: ResponseSize
  }[]
  cookies?: Cookie[]
  cookieStrings?: string[]  // Original cookie strings for display
  redirectCookieStrings?: string[][]  // Original cookie strings for each redirect
  is_base64?: boolean
  timing?: ResponseTiming
  size?: ResponseSize
}

export interface StreamingResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  chunks: StreamChunk[]
  currentContent: string
  isComplete: boolean
  error?: string
  timing?: {
    start: number
    current: number
    duration: number
  }
  streamType?: 'sse' | 'chunked' | 'unknown'
}

export interface StreamChunk {
  id?: string
  event?: string
  data: string
  timestamp: number
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

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2'

export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'password'

export interface OAuth2Config {
  grantType: OAuth2GrantType
  authUrl?: string
  tokenUrl?: string
  clientId: string
  clientSecret?: string
  scope?: string
  usePkce?: boolean
  redirectUri?: string
  // Password grant only
  username?: string
  password?: string
  // Token state (stored with request)
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  expiresAt?: number
}

export interface AuthConfig {
  type: AuthType
  username?: string
  password?: string
  token?: string
  key?: string
  value?: string
  addTo?: 'header' | 'query'
  oauth2?: OAuth2Config
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
  streaming?: StreamingResponse | null
  cancelStream?: (() => void) | (() => Promise<void>)
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

export interface Collection {
  id: string
  name: string
  description?: string
  requests: SavedRequest[]
  createdAt?: Date
  updatedAt?: Date
}

export interface SavedRequest {
  id: string
  name: string
  method: string
  url: string
  rawUrl: string
  params: URLParam[]
  headers: Header[]
  body: string
  contentType: string
  auth: AuthConfig
  cookies: Cookie[]
  testScripts: TestScript[]
  testAssertions: TestAssertion[]
  testResults: TestResult | null
  createdAt?: Date
  updatedAt?: Date
}
