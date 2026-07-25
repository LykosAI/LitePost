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
    cookies?: string[]
    timing?: ResponseTiming
    size?: ResponseSize
  }[]
  cookies?: string[]
  is_base64?: boolean
  timing?: ResponseTiming
  size?: ResponseSize
}

export interface StreamingResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  chunkCount: number
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
  formDataEntries?: FormDataEntry[]
  preRequestScripts?: TestScript[]
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
  /** Issuer/base URL or full .well-known URL used to auto-fill the endpoints */
  discoveryUrl?: string
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

export interface FormDataEntry {
  id: string
  key: string
  value: string
  type: 'text' | 'file'
  fileName?: string
  fileSize?: number
  fileData?: string
  filePath?: string
  enabled: boolean
}

export interface ResponseExtractionRule {
  id: string
  source: 'body' | 'header' | 'status' | 'cookie'
  path: string
  variableName: string
  lastExtractedValue?: string
}

export interface NetworkConfig {
  timeout?: number         // total request timeout in seconds (0 = no timeout)
  connectTimeout?: number  // connection timeout in seconds
  sslVerification?: boolean // verify SSL certificates (default true)
  proxy?: string           // proxy URL (e.g. http://proxy:8080, socks5://proxy:1080)
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
  preRequestScripts?: TestScript[]
  testAssertions: TestAssertion[]
  testResults: TestResult | null
  extractionRules?: ResponseExtractionRule[]
  streaming?: StreamingResponse | null
  cancelStream?: (() => void) | (() => Promise<void>)
  // GraphQL support
  graphqlQuery?: string
  graphqlVariables?: string
  graphqlOperationName?: string
  isGraphQL?: boolean
  // Form data support (for multipart/form-data)
  formDataEntries?: FormDataEntry[]
  // Network controls (per-request overrides)
  networkConfig?: NetworkConfig
}

// WebSocket types
export interface WebSocketMessage {
  id: string
  data: string
  isBinary: boolean
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

export interface WebSocketState {
  connectionId: string
  isConnected: boolean
  messages: WebSocketMessage[]
  connectedAt: number | null
  error: string | null
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
  preRequestScripts?: TestScript[]
  testAssertions: TestAssertion[]
  testResults: TestResult | null
  extractionRules?: ResponseExtractionRule[]
  graphqlQuery?: string
  graphqlVariables?: string
  graphqlOperationName?: string
  isGraphQL?: boolean
  formDataEntries?: FormDataEntry[]
  networkConfig?: NetworkConfig
  createdAt?: Date
  updatedAt?: Date
}
