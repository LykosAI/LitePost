import { invoke } from '@tauri-apps/api/core'
import { Tab, HistoryItem } from '@/types'
import { useEnvironmentStore } from '@/store/environments'
import { useSettingsStore } from '@/store/settings'
import { substituteVariables as substitute } from '@/utils/variables'

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
  const { getVariable, setVariable } = useEnvironmentStore()
  const { network: globalNetwork } = useSettingsStore()

  const substituteVariables = (text: string): string => substitute(text, getVariable)

  /**
   * Set a header, replacing any existing key that differs only in case.
   *
   * HTTP header names are case-insensitive but a JS object's keys are not, so a
   * plain assignment to `Authorization` leaves a user-typed `authorization`
   * sitting right next to it and both get sent. Servers are free to pick either
   * one, which shows up as an intermittent 401 that looks like the auth config
   * is broken when it is actually a stale header from the Headers tab.
   */
  const setHeader = (headers: Record<string, string>, key: string, value: string) => {
    const lowered = key.toLowerCase()
    for (const existing of Object.keys(headers)) {
      if (existing !== key && existing.toLowerCase() === lowered) {
        delete headers[existing]
      }
    }
    headers[key] = value
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
        setHeader(headerRecord, 'Authorization', `Basic ${credentials}`)
      } else if (tab.auth.type === 'bearer' && tab.auth.token) {
        setHeader(headerRecord, 'Authorization', `Bearer ${substituteVariables(tab.auth.token)}`)
      } else if (tab.auth.type === 'api-key' && tab.auth.key && tab.auth.value) {
        const key = substituteVariables(tab.auth.key)
        const value = substituteVariables(tab.auth.value)
        if (tab.auth.addTo === 'header') {
          setHeader(headerRecord, key, value)
        } else {
          const separator = url.includes('?') ? '&' : '?'
          url += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        }
      } else if (tab.auth.type === 'oauth2' && tab.auth.oauth2?.accessToken) {
        const tokenType = tab.auth.oauth2.tokenType || 'Bearer'
        setHeader(headerRecord, 'Authorization', `${tokenType} ${tab.auth.oauth2.accessToken}`)
      }

      // Add cookies to headers with variable substitution
      const cookieHeader = tab.cookies
        .map(c => `${encodeURIComponent(substituteVariables(c.name))}=${encodeURIComponent(substituteVariables(c.value))}`)
        .join('; ')

      if (cookieHeader) {
        setHeader(headerRecord, 'Cookie', cookieHeader)
      }

      // Substitute variables in body if it exists
      let body = tab.body && tab.method !== "GET" && tab.method !== "HEAD"
        ? substituteVariables(tab.body)
        : undefined
      let method = tab.method

      if (tab.preRequestScripts && tab.preRequestScripts.length > 0) {
        const { runPreRequestScripts } = await import('@/utils/preRequestRunner')
        const runtime = await runPreRequestScripts({
          scripts: tab.preRequestScripts,
          request: {
            method,
            url,
            headers: headerRecord,
            body,
          },
          getVariable,
          setVariable,
          substituteVariables,
        })

        method = runtime.method
        url = runtime.url
        body = runtime.body

        // Replace header values with runtime values.
        Object.keys(headerRecord).forEach((key) => {
          delete headerRecord[key]
        })
        Object.assign(headerRecord, runtime.headers)
      }

      // Merge network config: per-request overrides global defaults
      const nc = tab.networkConfig
      const timeout = nc?.timeout ?? globalNetwork.timeout
      const connect_timeout = nc?.connectTimeout ?? globalNetwork.connectTimeout
      const ssl_verification = nc?.sslVerification ?? globalNetwork.sslVerification
      const proxy = nc?.proxy ?? globalNetwork.proxy

      const options: Record<string, unknown> = {
        method,
        url,
        headers: headerRecord,
        body,
        content_type: body && method !== "GET" && method !== "HEAD" ? tab.contentType : undefined,
        cookies: tab.cookies.map(c => ({
          ...c,
          name: substituteVariables(c.name),
          value: substituteVariables(c.value)
        })),
        timeout: timeout || undefined,
        connect_timeout: connect_timeout || undefined,
        ssl_verification,
        proxy: proxy || undefined,
      }

      // Include form data for multipart/form-data requests
      if (tab.contentType === 'multipart/form-data' && tab.formDataEntries) {
        options.form_data = tab.formDataEntries.map((entry) => ({
          ...entry,
          key: substituteVariables(entry.key),
          value: entry.type === 'text' ? substituteVariables(entry.value) : entry.value,
          fileName: entry.fileName ? substituteVariables(entry.fileName) : entry.fileName
        }))
        options.content_type = 'multipart/form-data'
      }

      const response = await invoke<ResponseData>('send_request', { options })

      // Add to history
      onHistoryUpdate({
        method,
        url: tab.rawUrl,
        rawUrl: tab.rawUrl,
        timestamp: new Date(),
        params: tab.params,
        headers: tab.headers,
        body: tab.body,
        contentType: tab.contentType,
        auth: tab.auth,
        formDataEntries: tab.formDataEntries,
        preRequestScripts: tab.preRequestScripts,
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

      return mappedResponse
    } catch (error) {
      return {
        status: 0,
        statusText: "Error",
        headers: {},
        body: "",
        error: typeof error === 'string' ? error : error instanceof Error ? error.message : "An error occurred",
        redirectChain: [],
        cookies: [],
        is_base64: false
      }
    }
  }

  return { sendRequest }
} 
