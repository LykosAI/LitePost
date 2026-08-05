import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OAuthConfigurator } from '@/components/OAuthConfigurator'
import { OAuth2Config } from '@/types'

const fetchOidcDiscovery = vi.fn()
vi.mock('@/utils/oidcDiscovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/oidcDiscovery')>()),
  fetchOidcDiscovery: (url: string) => fetchOidcDiscovery(url),
}))

vi.mock('@/store/environments', () => ({
  useEnvironmentStore: () => ({ getVariable: () => undefined }),
}))

function makeToken(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj))
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.c2ln`
}

const base: OAuth2Config = { grantType: 'authorization_code', clientId: 'client-abc' }

const renderConfigurator = (oauth2: Partial<OAuth2Config> = {}) => {
  const onOAuth2Change = vi.fn()
  render(<OAuthConfigurator oauth2={{ ...base, ...oauth2 }} onOAuth2Change={onOAuth2Change} />)
  return onOAuth2Change
}

describe('OAuthConfigurator token claims', () => {
  it('surfaces the audience of a decoded token', () => {
    renderConfigurator({ accessToken: makeToken({ aud: 'api://my-api', scp: 'read' }) })

    expect(screen.getByText('Audience (aud)')).toBeInTheDocument()
    expect(screen.getByText('api://my-api')).toBeInTheDocument()
  })

  it('calls out a Graph token, which is the reason a valid token still 401s', () => {
    renderConfigurator({ accessToken: makeToken({ aud: '00000003-0000-0000-c000-000000000000' }) })

    expect(screen.getByText(/This is Microsoft Graph — not your API/)).toBeInTheDocument()
  })

  it('toggles the full claim set', () => {
    renderConfigurator({ accessToken: makeToken({ aud: 'api://my-api', tid: 'tenant-1' }) })

    expect(screen.queryByText(/"tid"/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('toggle-all-claims'))
    expect(screen.getByText(/"tid": "tenant-1"/)).toBeInTheDocument()
  })

  it('says so plainly when the token is opaque', () => {
    renderConfigurator({ accessToken: 'opaque-token-value' })

    expect(screen.getByText(/Opaque token — no claims to decode/)).toBeInTheDocument()
    expect(screen.queryByTestId('toggle-all-claims')).not.toBeInTheDocument()
  })

  it('shows nothing at all before a token exists', () => {
    renderConfigurator()
    expect(screen.queryByText('Audience (aud)')).not.toBeInTheDocument()
  })
})

describe('OAuthConfigurator Entra v1.0 handling', () => {
  beforeEach(() => {
    fetchOidcDiscovery.mockReset()
    fetchOidcDiscovery.mockResolvedValue({
      authorizationEndpoint: 'https://login.microsoftonline.com/t/oauth2/authorize',
      tokenEndpoint: 'https://login.microsoftonline.com/t/oauth2/token',
      scopesSupported: ['openid'],
    })
  })

  it('warns when discovery lands on the v1.0 document', async () => {
    renderConfigurator({ discoveryUrl: 'login.microsoftonline.com/t' })
    fireEvent.click(screen.getByTestId('oidc-discover-button'))

    expect(await screen.findByTestId('use-entra-v2-button')).toBeInTheDocument()
    expect(screen.getByText(/Entra v1\.0 discovery document/)).toBeInTheDocument()
  })

  // Previously this only rewrote the field and told the user to press Auto-fill
  // again, leaving the v1.0 endpoints sitting in the form in the meantime.
  it('re-runs discovery against v2.0 rather than asking the user to', async () => {
    const onOAuth2Change = renderConfigurator({ discoveryUrl: 'login.microsoftonline.com/t' })
    fireEvent.click(screen.getByTestId('oidc-discover-button'))
    fireEvent.click(await screen.findByTestId('use-entra-v2-button'))

    await waitFor(() => {
      expect(fetchOidcDiscovery).toHaveBeenLastCalledWith(
        'https://login.microsoftonline.com/t/v2.0/.well-known/openid-configuration'
      )
    })

    // The corrected URL must survive the write-back — the component's `oauth2`
    // prop still holds the v1.0 value at that point, so spreading it blindly
    // would undo the switch.
    await waitFor(() => {
      expect(onOAuth2Change).toHaveBeenLastCalledWith(
        expect.objectContaining({
          discoveryUrl: 'https://login.microsoftonline.com/t/v2.0/.well-known/openid-configuration',
        })
      )
    })
    expect(screen.queryByTestId('use-entra-v2-button')).not.toBeInTheDocument()
  })

  it('does not auto-fill scope for client credentials', async () => {
    // `openid` describes the IdP's sign-in surface, not the API being called —
    // filling it in mints a token for the wrong audience.
    const onOAuth2Change = renderConfigurator({
      grantType: 'client_credentials',
      discoveryUrl: 'https://auth.example.com',
    })
    fireEvent.click(screen.getByTestId('oidc-discover-button'))

    await waitFor(() => expect(onOAuth2Change).toHaveBeenCalled())
    expect(onOAuth2Change.mock.calls[0][0].scope).toBeUndefined()
  })

  it('still auto-fills scope for the authorization code flow', async () => {
    const onOAuth2Change = renderConfigurator({ discoveryUrl: 'https://auth.example.com' })
    fireEvent.click(screen.getByTestId('oidc-discover-button'))

    await waitFor(() => expect(onOAuth2Change).toHaveBeenCalled())
    expect(onOAuth2Change.mock.calls[0][0].scope).toBe('openid')
  })
})
