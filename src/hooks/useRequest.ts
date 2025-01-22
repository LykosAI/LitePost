import { fetch } from '@tauri-apps/plugin-http'
import { Tab, HistoryItem } from '@/types'

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

      // Add content type header if body is present
      if (tab.body && tab.method !== "GET" && tab.method !== "HEAD") {
        headerRecord["Content-Type"] = tab.contentType
      }

      const res = await fetch(tab.rawUrl, {
        method: tab.method,
        headers: headerRecord,
        body: tab.body && tab.method !== "GET" && tab.method !== "HEAD" ? tab.body : undefined
      })

      // Add to history
      onHistoryUpdate({
        method: tab.method,
        url: tab.rawUrl,
        timestamp: new Date()
      })

      // Convert headers to record
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // Convert the response to our format
      let responseBody = ""
      if (res.headers.get("content-type")?.includes("application/json")) {
        responseBody = JSON.stringify(await res.json(), null, 2)
      } else {
        responseBody = await res.text()
      }

      return {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
      }
    } catch (error) {
      console.error('Request error:', error)
      return {
        status: 0,
        statusText: "Error",
        headers: {},
        body: "",
        error: error instanceof Error ? error.message : "An error occurred",
      }
    }
  }

  return { sendRequest }
} 