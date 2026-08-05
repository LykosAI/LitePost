import { TestScript } from '@/types'

export interface RuntimeRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

interface PreRequestRunnerOptions {
  scripts: TestScript[]
  request: RuntimeRequest
  getVariable: (key: string) => string | undefined
  setVariable: (key: string, value: string) => void
  substituteVariables: (text: string) => string
}

function setQueryParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set(key, value)
    return parsed.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }
}

function removeHeaderCaseInsensitive(headers: Record<string, string>, key: string): Record<string, string> {
  const next: Record<string, string> = {}

  for (const [headerKey, headerValue] of Object.entries(headers)) {
    if (headerKey.toLowerCase() !== key.toLowerCase()) {
      next[headerKey] = headerValue
    }
  }

  return next
}

export async function runPreRequestScripts({
  scripts,
  request,
  getVariable,
  setVariable,
  substituteVariables,
}: PreRequestRunnerOptions): Promise<RuntimeRequest> {
  const runtime: RuntimeRequest = {
    method: request.method,
    url: request.url,
    headers: { ...request.headers },
    body: request.body,
  }

  for (const script of scripts.filter((item) => item.enabled)) {
    const api = {
      environment: {
        get: (key: string) => getVariable(key),
        set: (key: string, value: unknown) => setVariable(key, String(value)),
        has: (key: string) => getVariable(key) !== undefined,
        unset: (key: string) => setVariable(key, ''),
      },
      variables: {
        replaceIn: (text: string) => substituteVariables(text),
      },
      request: {
        get method() {
          return runtime.method
        },
        setMethod: (method: string) => {
          runtime.method = method.toUpperCase()
        },
        get url() {
          return runtime.url
        },
        setUrl: (url: string) => {
          runtime.url = url
        },
        get body() {
          return runtime.body || ''
        },
        setBody: (body: string) => {
          runtime.body = body
        },
        get headers() {
          return { ...runtime.headers }
        },
        setHeader: (key: string, value: string) => {
          runtime.headers = {
            ...removeHeaderCaseInsensitive(runtime.headers, key),
            [key]: value,
          }
        },
        removeHeader: (key: string) => {
          runtime.headers = removeHeaderCaseInsensitive(runtime.headers, key)
        },
        setQueryParam: (key: string, value: string) => {
          runtime.url = setQueryParam(runtime.url, key, value)
        },
      },
    }

    try {
      // Keep Postman-style `pm` for compatibility and expose neutral aliases for LitePost scripts.
      const fn = new Function('pm', 'lp', 'litepost', script.code)
      const result = fn(api, api, api)
      if (result && typeof result.then === 'function') {
        await result
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Pre-request script '${script.name}' failed: ${message}`, { cause: error })
    }
  }

  runtime.url = substituteVariables(runtime.url)

  const substitutedHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(runtime.headers)) {
    substitutedHeaders[substituteVariables(key)] = substituteVariables(value)
  }
  runtime.headers = substitutedHeaders

  if (runtime.body !== undefined) {
    runtime.body = substituteVariables(runtime.body)
  }

  return runtime
}
