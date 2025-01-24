import { invoke } from '@tauri-apps/api/core'
import { Tab, HistoryItem } from '@/types'

interface RedirectInfo {
  url: string
  status: number
  status_text: string
  headers: Record<string, string>
  cookies?: string[]
  timing?: ResponseTiming
  size?: ResponseSize
}

interface ResponseTiming {
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

interface ResponseSize {
  headers: number
  body: number
  total: number
}

interface ResponseData {
  status: number
  status_text: string
  headers: Record<string, string>
  body: string
  redirect_chain: RedirectInfo[]
  cookies: string[]
  is_base64: boolean
  timing?: ResponseTiming
  size?: ResponseSize
}

export function useRequest(onHistoryUpdate: (item: HistoryItem) => void) {
  const sendRequest = async (tab: Tab) => {
    if (!tab.rawUrl) return null

    try {
      // Convert enabled headers to record
      const headerRecord: Record<string, string> = {}
      tab.headers.forEach(header => {
        if (header.enabled && header.key) {
          headerRecord[header.key] = header.value
        }
      })

      // Handle authentication
      let url = tab.rawUrl
      if (tab.auth.type === 'basic') {
        const credentials = btoa(`${tab.auth.username || ''}:${tab.auth.password || ''}`)
        headerRecord['Authorization'] = `Basic ${credentials}`
      } else if (tab.auth.type === 'bearer' && tab.auth.token) {
        headerRecord['Authorization'] = `Bearer ${tab.auth.token}`
      } else if (tab.auth.type === 'api-key' && tab.auth.key && tab.auth.value) {
        if (tab.auth.addTo === 'header') {
          headerRecord[tab.auth.key] = tab.auth.value
        } else {
          // Add to query parameters
          const separator = url.includes('?') ? '&' : '?'
          url += `${separator}${encodeURIComponent(tab.auth.key)}=${encodeURIComponent(tab.auth.value)}`
        }
      }

      // Add cookies to headers
      const cookieHeader = tab.cookies
        .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
        .join('; ')

      if (cookieHeader) {
        headerRecord['Cookie'] = cookieHeader
      }

      const options = {
        method: tab.method,
        url,
        headers: headerRecord,
        body: tab.body && tab.method !== "GET" && tab.method !== "HEAD" ? tab.body : undefined,
        content_type: tab.body && tab.method !== "GET" && tab.method !== "HEAD" ? tab.contentType : undefined,
        cookies: tab.cookies
      }

      console.log('Sending request with options:', options);
      const response = await invoke<ResponseData>('send_request', { options })
      console.log('Received response:', response);

      // Add to history
      onHistoryUpdate({
        method: tab.method,
        url: tab.rawUrl,
        rawUrl: tab.rawUrl,
        timestamp: new Date(),
        params: tab.params,
        headers: tab.headers,
        body: tab.body,
        contentType: tab.contentType,
        auth: tab.auth
      })

      const mappedResponse = {
        status: response.status,
        statusText: response.status_text,
        headers: response.headers,
        body: response.body,
        redirectChain: response.redirect_chain.map((redirect: RedirectInfo) => ({
          url: redirect.url,
          status: redirect.status,
          statusText: redirect.status_text,
          headers: redirect.headers,
          cookies: redirect.cookies,
          timing: redirect.timing,
          size: redirect.size
        })),
        cookies: response.cookies,
        is_base64: response.is_base64,
        timing: response.timing,
        size: response.size
      }

      console.log('Mapped response:', mappedResponse);
      return mappedResponse
    } catch (error) {
      console.error('Request error:', error)
      return {
        status: 0,
        statusText: "Error",
        headers: {},
        body: "",
        error: typeof error === 'string' ? error : error instanceof Error ? error.message : "An error occurred"
      }
    }
  }

  return { sendRequest }
} 