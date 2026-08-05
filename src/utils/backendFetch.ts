/**
 * GET a URL through the Rust HTTP backend instead of the webview's fetch().
 *
 * The webview's own fetch() is a browser fetch: it enforces CORS and uses the
 * webview's TLS stack. Neither is acceptable for the endpoints this app talks
 * to — an internal API server has no reason to send
 * `Access-Control-Allow-Origin` for a desktop app's origin, so the request
 * fails before a single byte is parsed. Going through `send_request` has no
 * CORS restriction and honours the user's network settings, which is also how
 * a corporate root CA gets handled (Settings → SSL verification).
 */
import { useSettingsStore } from '@/store/settings'

interface BackendResponse {
  status: number
  status_text?: string
  body: string
  error?: string
}

/** True when running inside the Tauri shell, false under vitest/browser dev. */
function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  )
}

export interface BackendFetchOptions {
  headers?: Record<string, string>
}

/**
 * Fetch `url` and return the response body as text.
 *
 * Falls back to the browser fetch() outside the Tauri shell (browser dev mode
 * and tests), where there is no backend to invoke.
 *
 * @throws if the request fails or the response status is not 2xx.
 */
export async function fetchTextViaBackend(
  url: string,
  options: BackendFetchOptions = {}
): Promise<string> {
  const headers = options.headers ?? { Accept: 'application/json' }

  if (!isTauri()) {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
    return response.text()
  }

  const { invoke } = await import('@tauri-apps/api/core')
  const { network } = useSettingsStore.getState()

  const response = await invoke<BackendResponse>('send_request', {
    options: {
      method: 'GET',
      url,
      headers,
      cookies: [],
      timeout: network.timeout || undefined,
      connect_timeout: network.connectTimeout || undefined,
      ssl_verification: network.sslVerification,
      proxy: network.proxy || undefined,
    },
  })

  if (response.error) {
    throw new Error(response.error)
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.body
}

/**
 * Fetch `url` and parse it as JSON.
 *
 * The separate parse step is deliberate: an endpoint behind a corporate SSO
 * proxy answers with an HTML login page and a 200, and `response.json()`
 * blowing up on `<` is a confusing way to learn that. The message below says
 * what actually happened.
 */
export async function fetchJsonViaBackend<T = unknown>(
  url: string,
  options: BackendFetchOptions = {}
): Promise<T> {
  const text = await fetchTextViaBackend(url, options)

  try {
    return JSON.parse(text) as T
  } catch {
    const preview = text.trim().slice(0, 80)
    const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text)
    throw new Error(
      looksLikeHtml
        ? 'The server returned an HTML page instead of JSON — the URL may be behind a login redirect.'
        : `The response was not valid JSON (starts with: ${preview})`
    )
  }
}
