import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthConfigurator } from '../components/AuthConfigurator'
import { AuthConfig } from '@/types'

describe('AuthConfigurator', () => {
  it('renders with no auth selected', () => {
    const auth: AuthConfig = { type: 'none' }
    const onAuthChange = vi.fn()
    render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    expect(screen.getByText('No Auth')).toBeInTheDocument()
  })

  it('changes auth type when selected', () => {
    const auth: AuthConfig = { type: 'none' }
    const onAuthChange = vi.fn()
    render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Basic Auth'))
    
    expect(onAuthChange).toHaveBeenCalledWith({ type: 'basic' })
  })

  it('renders and updates basic auth fields', () => {
    const auth: AuthConfig = { type: 'basic', username: '', password: '' }
    const onAuthChange = vi.fn()
    render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    const usernameInput = screen.getByPlaceholderText('Username')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    expect(onAuthChange).toHaveBeenCalledWith({ 
      type: 'basic', 
      username: 'testuser', 
      password: '' 
    })
    
    fireEvent.change(passwordInput, { target: { value: 'testpass' } })
    expect(onAuthChange).toHaveBeenCalledWith({ 
      type: 'basic', 
      username: '', 
      password: 'testpass' 
    })
  })

  it('renders and updates bearer token field', () => {
    const auth: AuthConfig = { type: 'bearer', token: '' }
    const onAuthChange = vi.fn()
    render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    const tokenInput = screen.getByPlaceholderText('Bearer Token')
    fireEvent.change(tokenInput, { target: { value: 'test-token' } })
    
    expect(onAuthChange).toHaveBeenCalledWith({ 
      type: 'bearer', 
      token: 'test-token' 
    })
  })

  it('renders and updates api key fields', () => {
    const auth: AuthConfig = { type: 'api-key', key: '', value: '', addTo: 'header' }
    const onAuthChange = vi.fn()
    render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    const keyInput = screen.getByPlaceholderText('Key')
    const valueInput = screen.getByPlaceholderText('Value')
    
    fireEvent.change(keyInput, { target: { value: 'api-key' } })
    expect(onAuthChange).toHaveBeenCalledWith({ 
      type: 'api-key', 
      key: 'api-key', 
      value: '', 
      addTo: 'header' 
    })
    
    fireEvent.change(valueInput, { target: { value: 'secret-value' } })
    expect(onAuthChange).toHaveBeenCalledWith({ 
      type: 'api-key', 
      key: '', 
      value: 'secret-value', 
      addTo: 'header' 
    })
  })

  it('changes api key location between header and query', () => {
    const auth: AuthConfig = { type: 'api-key', key: 'test-key', value: 'test-value', addTo: 'header' }
    const onAuthChange = vi.fn()
    render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    fireEvent.click(screen.getByText('Header'))
    fireEvent.click(screen.getByText('Query Parameter'))
    
    expect(onAuthChange).toHaveBeenCalledWith({ 
      type: 'api-key', 
      key: 'test-key', 
      value: 'test-value', 
      addTo: 'query' 
    })
  })

  it('switches between different auth types and updates UI accordingly', () => {
    let auth: AuthConfig = { type: 'basic', username: 'testuser', password: 'testpass' }
    const onAuthChange = vi.fn(newAuth => {
      auth = newAuth
    })
    const { rerender } = render(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    // Verify basic auth fields are present
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    
    // Switch to bearer token
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Bearer Token'))
    rerender(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    // Verify basic auth fields are removed and bearer token field appears
    expect(screen.queryByPlaceholderText('Username')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Bearer Token')).toBeInTheDocument()
    
    // Switch to API Key
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('API Key'))
    rerender(<AuthConfigurator auth={auth} onAuthChange={onAuthChange} />)
    
    // Verify bearer token field is removed and API Key fields appear
    expect(screen.queryByPlaceholderText('Bearer Token')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Key')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Value')).toBeInTheDocument()
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
}) 