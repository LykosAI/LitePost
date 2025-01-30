import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestBodyEditor } from '@/components/RequestBodyEditor'

// Mock Radix UI's Select component
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="content-type-select"
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

describe('RequestBodyEditor', () => {
  interface SetupOptions {
    body?: string
    contentType?: string
  }

  const setup = (options: SetupOptions = {}) => {
    const user = userEvent.setup()
    const props = {
      body: options.body || '',
      contentType: options.contentType || 'application/json',
      onBodyChange: vi.fn(),
      onContentTypeChange: vi.fn(),
    }

    const utils = render(<RequestBodyEditor {...props} />)

    return {
      user,
      ...utils,
      ...props,
    }
  }

  it('renders with default props', () => {
    setup()
    
    expect(screen.getByTestId('content-type-select')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter request body')).toBeInTheDocument()
  })

  it('displays the current content type and body', () => {
    setup({
      contentType: 'application/json',
      body: '{"test": true}'
    })
    
    expect(screen.getByTestId('content-type-select')).toHaveValue('application/json')
    expect(screen.getByPlaceholderText('Enter request body')).toHaveValue('{"test": true}')
  })

  it('calls onContentTypeChange when content type is changed', () => {
    const { onContentTypeChange } = setup()
    
    const select = screen.getByTestId('content-type-select')
    fireEvent.change(select, { target: { value: 'text/plain' } })
    
    expect(onContentTypeChange).toHaveBeenCalledWith('text/plain')
  })

  it('calls onBodyChange when body is changed', async () => {
    const { onBodyChange } = setup()
    
    const textarea = screen.getByPlaceholderText('Enter request body')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    
    expect(onBodyChange).toHaveBeenCalledWith('Hello')
  })

  it('auto-completes brackets when typing {', () => {
    const { onBodyChange } = setup()
    
    const textarea = screen.getByPlaceholderText('Enter request body')
    fireEvent.keyDown(textarea, { key: '{' })
    
    expect(onBodyChange).toHaveBeenCalledWith('{}')
  })

  it('auto-completes brackets when typing [', () => {
    const { onBodyChange } = setup()
    
    const textarea = screen.getByPlaceholderText('Enter request body')
    fireEvent.keyDown(textarea, { key: '[' })
    
    expect(onBodyChange).toHaveBeenCalledWith('[]')
  })

  it('auto-completes brackets when typing (', () => {
    const { onBodyChange } = setup()
    
    const textarea = screen.getByPlaceholderText('Enter request body')
    fireEvent.keyDown(textarea, { key: '(' })
    
    expect(onBodyChange).toHaveBeenCalledWith('()')
  })

  it('supports all content types', () => {
    const { onContentTypeChange } = setup()
    const contentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'text/plain',
      'text/html',
      'multipart/form-data',
    ]
    
    const select = screen.getByTestId('content-type-select')
    
    contentTypes.forEach(type => {
      fireEvent.change(select, { target: { value: type } })
      expect(onContentTypeChange).toHaveBeenCalledWith(type)
    })
  })
}) 