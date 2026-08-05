import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Tab } from '@/types'

const invoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }))

const env: Record<string, string> = { token: 'from-env' }
vi.mock('@/store/environments', () => ({
  useEnvironmentStore: () => ({
    getVariable: (key: string) => env[key],
    setVariable: vi.fn(),
  }),
}))

vi.mock('@/store/settings', () => ({
  useSettingsStore: () => ({
    network: { timeout: 30, connectTimeout: 10, sslVerification: true, proxy: '' },
  }),
}))

import { useRequest } from '@/hooks/useRequest'

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 't1',
    name: 'Test',
    method: 'GET',
    url: 'https://api.example.com/things',
    rawUrl: 'https://api.example.com/things',
    params: [],
    headers: [],
    body: '',
    contentType: 'application/json',
    response: null,
    loading: false,
    auth: { type: 'none' },
    cookies: [],
    testScripts: [],
    testAssertions: [],
    testResults: null,
    ...overrides,
  }
}

/** The `headers` map that actually went out to the Rust backend. */
function sentHeaders(): Record<string, string> {
  const [, payload] = invoke.mock.calls.at(-1) as [string, { options: { headers: Record<string, string> } }]
  return payload.options.headers
}

async function send(tab: Tab) {
  const { result } = renderHook(() => useRequest(vi.fn()))
  await result.current.sendRequest(tab)
}

describe('useRequest auth headers', () => {
  beforeEach(() => {
    invoke.mockReset()
    invoke.mockResolvedValue({
      status: 200,
      status_text: 'OK',
      headers: {},
      body: '{}',
      redirect_chain: [],
      cookies: [],
      is_base64: false,
    })
  })

  // The bug: header names are case-insensitive over the wire but a JS object's
  // keys are not, so a stale lowercase `authorization` from the Headers tab
  // survived alongside the `Authorization` that auth generates and both were
  // sent. Which one the server honoured was its choice — presenting as an
  // intermittent 401 that looked like the auth config was broken.
  it('replaces a differently-cased Authorization header instead of sending both', async () => {
    await send(makeTab({
      headers: [{ key: 'authorization', value: 'Bearer stale-token', enabled: true }],
      auth: { type: 'oauth2', oauth2: { grantType: 'client_credentials', clientId: 'c', accessToken: 'fresh-token', tokenType: 'Bearer' } },
    }))

    const headers = sentHeaders()
    const authKeys = Object.keys(headers).filter((k) => k.toLowerCase() === 'authorization')

    expect(authKeys).toHaveLength(1)
    expect(headers[authKeys[0]]).toBe('Bearer fresh-token')
  })

  it('applies the same rule to bearer auth', async () => {
    await send(makeTab({
      headers: [{ key: 'AUTHORIZATION', value: 'Bearer stale', enabled: true }],
      auth: { type: 'bearer', token: '{{token}}' },
    }))

    const headers = sentHeaders()
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'authorization')).toHaveLength(1)
    expect(Object.values(headers)).toContain('Bearer from-env')
  })

  it('applies the same rule to a case-mismatched api-key header', async () => {
    await send(makeTab({
      headers: [{ key: 'x-api-key', value: 'stale', enabled: true }],
      auth: { type: 'api-key', key: 'X-API-Key', value: 'fresh', addTo: 'header' },
    }))

    const headers = sentHeaders()
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'x-api-key')).toHaveLength(1)
    expect(Object.values(headers)).toContain('fresh')
  })

  it('leaves unrelated headers alone', async () => {
    await send(makeTab({
      headers: [
        { key: 'Accept', value: 'application/json', enabled: true },
        { key: 'X-Trace', value: 'abc', enabled: true },
      ],
      auth: { type: 'bearer', token: 'tok' },
    }))

    const headers = sentHeaders()
    expect(headers['Accept']).toBe('application/json')
    expect(headers['X-Trace']).toBe('abc')
    expect(headers['Authorization']).toBe('Bearer tok')
  })

  it('does not send an Authorization header when oauth2 has no token yet', async () => {
    await send(makeTab({
      auth: { type: 'oauth2', oauth2: { grantType: 'client_credentials', clientId: 'c' } },
    }))

    expect(Object.keys(sentHeaders()).some((k) => k.toLowerCase() === 'authorization')).toBe(false)
  })
})
