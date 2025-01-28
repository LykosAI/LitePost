import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestUrlBar } from '@/components/RequestUrlBar'

// Mock Radix UI's Select component
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="method-select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => children,
  SelectValue: ({ placeholder }: any) => placeholder,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ value, children }: any) => (
    <option value={value}>{children}</option>
  ),
}))

describe('RequestUrlBar', () => {
  interface SetupOptions {
    method?: string
    url?: string
    loading?: boolean
  }

  const setup = (options: SetupOptions = {}) => {
    const user = userEvent.setup()
    const props = {
      method: options.method || 'GET',
      url: options.url || '',
      loading: options.loading || false,
      onMethodChange: vi.fn(),
      onUrlChange: vi.fn(),
      onSend: vi.fn(),
      onSave: vi.fn(),
    }

    const utils = render(<RequestUrlBar {...props} />)

    return {
      user,
      ...utils,
      ...props,
    }
  }

  it('renders with default props', () => {
    setup()
    
    expect(screen.getByTestId('method-select')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter request URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument()
  })

  it('displays the current method and URL', () => {
    setup({
      method: 'POST',
      url: 'https://api.example.com'
    })
    
    expect(screen.getByTestId('method-select')).toHaveValue('POST')
    expect(screen.getByPlaceholderText('Enter request URL')).toHaveValue('https://api.example.com')
  })

  it('calls onMethodChange when method is changed', () => {
    const { onMethodChange } = setup({ method: 'GET' })
    
    const methodSelect = screen.getByTestId('method-select')
    fireEvent.change(methodSelect, { target: { value: 'POST' } })
    
    expect(onMethodChange).toHaveBeenCalledWith('POST')
  })

  it('calls onUrlChange when URL is changed', () => {
    const { onUrlChange } = setup()
    
    const urlInput = screen.getByPlaceholderText('Enter request URL')
    fireEvent.change(urlInput, { target: { value: 'https://api.example.com' } })
    
    expect(onUrlChange).toHaveBeenCalledWith('https://api.example.com')
  })

  it('prevents default question mark behavior in URL input', () => {
    setup()
    
    const urlInput = screen.getByPlaceholderText('Enter request URL')
    const event = createEvent.keyDown(urlInput, { key: '?' })
    event.stopPropagation = vi.fn()
    
    fireEvent(urlInput, event)
    
    expect(event.stopPropagation).toHaveBeenCalled()
  })

  it('does not stop propagation for non-question mark keys', () => {
    setup()
    
    const urlInput = screen.getByPlaceholderText('Enter request URL')
    const event = createEvent.keyDown(urlInput, { key: 'a' })
    event.stopPropagation = vi.fn()
    
    fireEvent(urlInput, event)
    
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })

  it('calls onSave when save button is clicked', async () => {
    const { user, onSave } = setup()
    
    const saveButton = screen.getByRole('button', { name: /Save/i })
    await user.click(saveButton)
    
    expect(onSave).toHaveBeenCalled()
  })

  it('calls onSend when send button is clicked', async () => {
    const { user, onSend } = setup()
    
    const sendButton = screen.getByRole('button', { name: /Send/i })
    await user.click(sendButton)
    
    expect(onSend).toHaveBeenCalled()
  })

  it('disables send button when loading', () => {
    setup({ loading: true })
    
    const sendButton = screen.getByRole('button', { name: /Sending/i })
    expect(sendButton).toBeDisabled()
  })

  it('changes send button text to "Sending..." when loading', () => {
    setup({ loading: true })
    
    expect(screen.getByRole('button', { name: /Sending/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Send$/i })).not.toBeInTheDocument()
  })

  it('supports all HTTP methods', () => {
    const { onMethodChange } = setup()
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    
    const methodSelect = screen.getByTestId('method-select')
    
    for (const method of methods) {
      fireEvent.change(methodSelect, { target: { value: method } })
      expect(onMethodChange).toHaveBeenCalledWith(method)
    }
  })
}) 