import { invoke } from '@tauri-apps/api/core'
import { Tab, HistoryItem } from '@/types'
import { useEnvironmentStore } from '@/store/environments'

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
  const { getVariable } = useEnvironmentStore()

  const substituteVariables = (text: string): string => {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = getVariable(key.trim())
      return value !== undefined ? value : match
    })
  }

  const sendRequest = async (tab: Tab) => {
    if (!tab.rawUrl) return null

    try {
      // Substitute environment variables in URL and headers
      let url = substituteVariables(tab.rawUrl)
      const headerRecord: Record<string, string> = {}
      tab.headers.forEach(header => {
        if (header.enabled && header.key) {
          headerRecord[substituteVariables(header.key)] = substituteVariables(header.value)
        }
      })

      // Handle authentication with variable substitution
      if (tab.auth.type === 'basic') {
        const username = substituteVariables(tab.auth.username || '')
        const password = substituteVariables(tab.auth.password || '')
        const credentials = btoa(`${username}:${password}`)
        headerRecord['Authorization'] = `Basic ${credentials}`
      } else if (tab.auth.type === 'bearer' && tab.auth.token) {
        headerRecord['Authorization'] = `Bearer ${substituteVariables(tab.auth.token)}`
      } else if (tab.auth.type === 'api-key' && tab.auth.key && tab.auth.value) {
        const key = substituteVariables(tab.auth.key)
        const value = substituteVariables(tab.auth.value)
        if (tab.auth.addTo === 'header') {
          headerRecord[key] = value
        } else {
          // Add to query parameters
          const separator = url.includes('?') ? '&' : '?'
          url += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        }
      }

      // Add cookies to headers with variable substitution
      const cookieHeader = tab.cookies
        .map(c => `${encodeURIComponent(substituteVariables(c.name))}=${encodeURIComponent(substituteVariables(c.value))}`)
        .join('; ')

      if (cookieHeader) {
        headerRecord['Cookie'] = cookieHeader
      }

      // Substitute variables in body if it exists
      const body = tab.body && tab.method !== "GET" && tab.method !== "HEAD" 
        ? substituteVariables(tab.body) 
        : undefined

      const options = {
        method: tab.method,
        url,
        headers: headerRecord,
        body,
        content_type: tab.body && tab.method !== "GET" && tab.method !== "HEAD" ? tab.contentType : undefined,
        cookies: tab.cookies.map(c => ({
          ...c,
          name: substituteVariables(c.name),
          value: substituteVariables(c.value)
        }))
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