export interface Response {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  error?: string
}

export interface HistoryItem {
  method: string
  url: string
  timestamp: Date
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
} 