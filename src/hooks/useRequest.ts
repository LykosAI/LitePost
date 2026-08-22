import { invoke } from '@tauri-apps/api/core'
import { Tab, HistoryItem } from '@/types'
import { useEnvironmentStore } from '@/store/environments'
import { useSettingsStore } from '@/store/settings'
import { buildSendRequestOptions } from '@/utils/requestBuilder'

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

  const sendRequest = async (tab: Tab) => {
    if (!tab.rawUrl) return null

    try {
      const { options, method } = await buildSendRequestOptions(tab, {
        auth: tab.auth,
        getVariable,
        setVariable,
        globalNetwork,
      })

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
