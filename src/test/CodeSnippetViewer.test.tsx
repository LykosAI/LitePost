import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeSnippetViewer } from '@/components/CodeSnippetViewer'
import { CODE_SNIPPETS } from '@/utils/codeSnippets'
import { Header } from '@/types'

// Mock the CopyButton component
vi.mock('@/components/CopyButton', () => ({
  CopyButton: ({ content }: { content: string }) => (
    <button data-testid="copy-button" data-content={content}>
      Copy
    </button>
  ),
}))

// Mock the ScrollArea component
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}))

// Mock the Select components
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="language-select"
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

// Mock react-syntax-highlighter
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  ),
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}))

describe('CodeSnippetViewer', () => {
  const defaultProps = {
    method: 'GET',
    url: 'https://api.example.com/data',
    headers: [
      { 
        key: 'accept',
        name: 'Accept', 
        value: 'application/json',
        enabled: true,
      } as Header
    ],
    body: '',
    contentType: 'application/json',
    auth: { type: 'none' as const },
    cookies: [],
  }

  const setup = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props }
    const utils = render(<CodeSnippetViewer {...mergedProps} />)
    return {
      ...utils,
      ...mergedProps,
    }
  }

  it('renders with default language selected', () => {
    setup()
    
    expect(screen.getByTestId('language-select')).toHaveValue(CODE_SNIPPETS[0].value)
    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    expect(screen.getByTestId('copy-button')).toBeInTheDocument()
  })

  it('displays all available languages in the dropdown', () => {
    setup()
    
    const select = screen.getByTestId('language-select')
    
    CODE_SNIPPETS.forEach(lang => {
      expect(select).toContainHTML(lang.value)
      expect(select).toContainHTML(lang.label)
    })
  })

  it('changes language when selecting from dropdown', () => {
    setup()
    
    const select = screen.getByTestId('language-select')
    const pythonOption = CODE_SNIPPETS.find(s => s.value === 'python')!
    
    fireEvent.change(select, { target: { value: pythonOption.value } })
    
    expect(select).toHaveValue(pythonOption.value)
  })

  it('updates code snippet when language changes', () => {
    setup()
    
    const select = screen.getByTestId('language-select')
    const pythonOption = CODE_SNIPPETS.find(s => s.value === 'python')!
    
    fireEvent.change(select, { target: { value: pythonOption.value } })
    
    const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
    expect(syntaxHighlighter.textContent).toContain('httpx.Client')
    expect(syntaxHighlighter.textContent).toContain('client.get')
  })

  it('returns empty string when language has no generator', () => {
    setup()
    
    const select = screen.getByTestId('language-select')
    fireEvent.change(select, { target: { value: 'invalid-language' } })
    
    const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
    expect(syntaxHighlighter.textContent).toBe('')
  })

  it('updates code snippet when props change', () => {
    const { rerender } = setup()
    
    // Update props
    rerender(
      <CodeSnippetViewer
        {...defaultProps}
        method="POST"
        body='{"test": true}'
      />
    )
    
    const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
    expect(syntaxHighlighter.textContent).toContain('-X POST')
    expect(syntaxHighlighter.textContent).toContain('-d \'{"test": true}\'')
  })

  it('includes headers in generated code', () => {
    setup({
      headers: [
        { 
          key: 'authorization',
          name: 'Authorization', 
          value: 'Bearer token123',
          enabled: true,
        } as Header,
        { 
          key: 'accept',
          name: 'Accept', 
          value: 'application/json',
          enabled: true,
        } as Header,
      ],
    })
    
    const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
    expect(syntaxHighlighter.textContent).toContain('-H "authorization: Bearer token123"')
    expect(syntaxHighlighter.textContent).toContain('-H "accept: application/json"')
  })

  it('includes cookies in generated code', () => {
    setup({
      cookies: [
        { name: 'session', value: '123' },
        { name: 'theme', value: 'dark' },
      ],
    })
    
    const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
    expect(syntaxHighlighter.textContent).toContain('-b "session=123; theme=dark"')
  })

  it('includes auth configuration in generated code', () => {
    setup({
      auth: {
        type: 'basic' as const,
        username: 'user',
        password: 'pass',
      },
    })
    
    const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
    expect(syntaxHighlighter.textContent).toContain('-H "Authorization: Basic')
  })

  it('passes generated code to copy button', () => {
    setup()
    
    const copyButton = screen.getByTestId('copy-button')
    expect(copyButton).toHaveAttribute('data-content')
    expect(copyButton.getAttribute('data-content')).not.toBe('')
  })
}) 
