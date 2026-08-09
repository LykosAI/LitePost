import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { OAuthConfigurator } from '@/components/OAuthConfigurator'
import { OAuth2Config } from '@/types'
import { useOAuthFlowStore } from '@/store/oauthFlows'

const invoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }))

// The Rust command reports the user code via an event while it keeps polling,
// so the mock records handlers by event name for tests to fire by hand.
const { listeners, listen } = vi.hoisted(() => {
  const listeners = new Map<string, (event: { payload: unknown }) => void>()
  return {
    listeners,
    listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => void) => {
      listeners.set(name, handler)
      return () => listeners.delete(name)
    }),
  }
})
vi.mock('@tauri-apps/api/event', () => ({ listen }))

vi.mock('@/store/environments', () => ({
  useEnvironmentStore: () => ({ getVariable: () => undefined }),
}))

const base: OAuth2Config = {
  grantType: 'device_code',
  clientId: 'device-client',
  deviceAuthUrl: 'https://id.example.com/oauth/device/code',
  tokenUrl: 'https://id.example.com/oauth/token',
}

const renderConfigurator = (oauth2: Partial<OAuth2Config> = {}) => {
  const onOAuth2Change = vi.fn()
  render(<OAuthConfigurator oauth2={{ ...base, ...oauth2 }} onOAuth2Change={onOAuth2Change} />)
  return onOAuth2Change
}

/** A flow that never resolves, standing in for a user who has not approved yet. */
function neverResolves() {
  return new Promise(() => { })
}

describe('device code flow', () => {
  beforeEach(() => {
    invoke.mockReset()
    listeners.clear()
    useOAuthFlowStore.setState({ flows: {} })
  })

  it('shows the device authorization URL field for the device grant', () => {
    renderConfigurator()

    expect(screen.getByPlaceholderText('https://provider.com/oauth/device/code')).toBeInTheDocument()
    // No redirect URI to configure — that is the point of the flow.
    expect(screen.queryByPlaceholderText(/callback/)).not.toBeInTheDocument()
  })

  it('starts the flow with a flow id and subscribes to its scoped prompt event', async () => {
    invoke.mockImplementation(neverResolves)
    renderConfigurator()

    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('oauth2_device_flow', expect.anything())
    })

    const [, args] = invoke.mock.calls.find(([cmd]) => cmd === 'oauth2_device_flow')!
    const options = (args as { options: Record<string, unknown> }).options
    expect(options.device_auth_url).toBe(base.deviceAuthUrl)
    expect(options.token_url).toBe(base.tokenUrl)
    expect(options.client_id).toBe(base.clientId)
    expect(options.flow_id).toBeTruthy()
    expect(listen).toHaveBeenCalledWith(
      `oauth-device-prompt-${options.flow_id}`,
      expect.any(Function)
    )
  })

  it('shows the user code once the provider hands one out', async () => {
    invoke.mockImplementation(neverResolves)
    renderConfigurator()
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    await waitFor(() => expect(listeners.size).toBe(1))
    const [fireEventFromRust] = listeners.values()
    act(() => {
      fireEventFromRust({
        payload: {
          user_code: 'WDJB-MJHT',
          verification_uri: 'https://id.example.com/activate',
          verification_uri_complete: null,
        },
      })
    })

    expect(screen.getByTestId('device-user-code')).toHaveTextContent('WDJB-MJHT')
    expect(screen.getByRole('link', { name: 'https://id.example.com/activate' })).toHaveAttribute(
      'href',
      'https://id.example.com/activate'
    )
  })

  it('can cancel the wait by the same id the flow was started with', async () => {
    invoke.mockImplementation((cmd: string) =>
      cmd === 'oauth2_cancel_flow' ? Promise.resolve(true) : neverResolves()
    )
    renderConfigurator()
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    fireEvent.click(await screen.findByTestId('cancel-token-request'))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('oauth2_cancel_flow', expect.anything())
    })
    const started = invoke.mock.calls.find(([cmd]) => cmd === 'oauth2_device_flow')!
    const cancelled = invoke.mock.calls.find(([cmd]) => cmd === 'oauth2_cancel_flow')!
    expect(cancelled[1].flowId).toBe(started[1].options.flow_id)
  })

  it('stores the token and drops the prompt when the sign-in is approved', async () => {
    invoke.mockResolvedValueOnce({
      access_token: 'device-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    const onOAuth2Change = renderConfigurator()

    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    await waitFor(() => {
      expect(onOAuth2Change).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'device-token', tokenType: 'Bearer' })
      )
    })
    expect(screen.queryByTestId('device-prompt')).not.toBeInTheDocument()
    // The scoped listener must not outlive its flow.
    expect(listeners.size).toBe(0)
  })
})
