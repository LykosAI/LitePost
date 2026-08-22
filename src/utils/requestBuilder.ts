import {
  AuthConfig,
  Cookie,
  FormDataEntry,
  Header,
  NetworkConfig,
  TestScript,
} from '@/types'
import { NetworkSettings } from '@/store/settings'
import { substituteVariables as substitute, VariableResolver } from '@/utils/variables'
import { applyAuthToHeaders, setHeader } from '@/utils/authHeaders'

/**
 * The request fields shared by a live Tab and a SavedRequest — everything the
 * send pipeline needs, and nothing UI-specific.
 */
export interface SendRequestSource {
  method: string
  url: string
  rawUrl?: string
  headers: Header[]
  body?: string
  contentType?: string
  cookies: Cookie[]
  preRequestScripts?: TestScript[]
  formDataEntries?: FormDataEntry[]
  networkConfig?: NetworkConfig
}

export interface BuildContext {
  /** Auth to apply — pass the already-resolved config (e.g. collection fallback). */
  auth: AuthConfig | undefined
  getVariable: VariableResolver
  setVariable: (key: string, value: string) => void
  globalNetwork: NetworkSettings
}

export interface BuiltRequest {
  /** Options payload for the `send_request` Tauri command. */
  options: Record<string, unknown>
  /** Final method — pre-request scripts may have changed it. */
  method: string
  /** Final URL after substitution, auth query params, and scripts. */
  url: string
}

/**
 * Build the `send_request` options for a request, applying the full pipeline:
 * `{{variable}}` substitution → auth → cookie header → pre-request scripts →
 * network config merge → multipart form data.
 *
 * Shared by the single-request path (useRequest) and the collection runner,
 * which had grown ~90-line independent copies that drifted apart — the runner
 * bypassed `setHeader` for cookies, so a user-typed `cookie` header was sent
 * twice there but not in the normal send path.
 */
export async function buildSendRequestOptions(
  source: SendRequestSource,
  ctx: BuildContext
): Promise<BuiltRequest> {
  const substituteVariables = (text: string): string => substitute(text, ctx.getVariable)

  let url = substituteVariables(source.rawUrl || source.url)

  const headerRecord: Record<string, string> = {}
  source.headers.forEach(header => {
    if (header.enabled && header.key) {
      headerRecord[substituteVariables(header.key)] = substituteVariables(header.value)
    }
  })

  url = applyAuthToHeaders(ctx.auth, headerRecord, url, substituteVariables)

  const cookieHeader = source.cookies
    .map(c => `${encodeURIComponent(substituteVariables(c.name))}=${encodeURIComponent(substituteVariables(c.value))}`)
    .join('; ')
  if (cookieHeader) {
    setHeader(headerRecord, 'Cookie', cookieHeader)
  }

  let body = source.body && source.method !== 'GET' && source.method !== 'HEAD'
    ? substituteVariables(source.body)
    : undefined
  let method = source.method

  if (source.preRequestScripts && source.preRequestScripts.length > 0) {
    // Dynamic import keeps the script runtime out of the startup bundle for
    // the overwhelmingly common case of requests without scripts.
    const { runPreRequestScripts } = await import('@/utils/preRequestRunner')
    const runtime = await runPreRequestScripts({
      scripts: source.preRequestScripts,
      request: { method, url, headers: headerRecord, body },
      getVariable: ctx.getVariable,
      setVariable: ctx.setVariable,
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
  const nc = source.networkConfig
  const timeout = nc?.timeout ?? ctx.globalNetwork.timeout
  const connect_timeout = nc?.connectTimeout ?? ctx.globalNetwork.connectTimeout
  const ssl_verification = nc?.sslVerification ?? ctx.globalNetwork.sslVerification
  const proxy = nc?.proxy ?? ctx.globalNetwork.proxy

  const options: Record<string, unknown> = {
    method,
    url,
    headers: headerRecord,
    body,
    content_type: body && method !== 'GET' && method !== 'HEAD' ? source.contentType : undefined,
    cookies: source.cookies.map(c => ({
      ...c,
      name: substituteVariables(c.name),
      value: substituteVariables(c.value),
    })),
    timeout: timeout || undefined,
    connect_timeout: connect_timeout || undefined,
    ssl_verification,
    proxy: proxy || undefined,
  }

  if (source.contentType === 'multipart/form-data' && source.formDataEntries) {
    options.form_data = source.formDataEntries.map((entry) => ({
      ...entry,
      key: substituteVariables(entry.key),
      value: entry.type === 'text' ? substituteVariables(entry.value) : entry.value,
      fileName: entry.fileName ? substituteVariables(entry.fileName) : entry.fileName,
    }))
    options.content_type = 'multipart/form-data'
  }

  return { options, method, url }
}
