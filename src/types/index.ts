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
  }[]
  cookies?: string[]
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