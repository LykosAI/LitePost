import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock monaco-editor (imported directly in the component for worker setup)
vi.mock('monaco-editor', () => ({
  editor: {
    defineTheme: vi.fn(),
    setTheme: vi.fn(),
  },
  languages: {
    json: {
      jsonDefaults: {
        setDiagnosticsOptions: vi.fn(),
      },
    },
  },
}))

// Mock the worker imports (Vite ?worker syntax)
vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/json/json.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/css/css.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/html/html.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/typescript/ts.worker?worker', () => ({ default: vi.fn() }))

import { RequestBodyEditor } from '@/components/RequestBodyEditor'

// Mock Monaco Editor since it requires a real DOM
vi.mock('@monaco-editor/react', () => {
  const MockEditor = ({ defaultValue, onChange, language, loading }: any) => (
    <div data-testid="monaco-editor" data-language={language}>
      <textarea
        data-testid="mock-editor-textarea"
        defaultValue={defaultValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter request body"
      />
      {loading}
    </div>
  )

  return {
    default: MockEditor,
    loader: {
      config: vi.fn(),
    },
  }
})

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

// Mock tooltip
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}))

describe('RequestBodyEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  interface SetupOptions {
    body?: string
    contentType?: string
  }

  const setup = (options: SetupOptions = {}) => {
    const props = {
      body: options.body || '',
      contentType: options.contentType || 'application/json',
      onBodyChange: vi.fn(),
      onContentTypeChange: vi.fn(),
    }

    const utils = render(<RequestBodyEditor {...props} />)

    return {
      ...utils,
      ...props,
    }
  }

  it('renders with default props', () => {
    setup()

    expect(screen.getByTestId('content-type-select')).toBeInTheDocument()
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
  })

  it('displays the current content type', () => {
    setup({ contentType: 'application/json' })

    expect(screen.getByTestId('content-type-select')).toHaveValue('application/json')
  })

  it('passes the correct language to Monaco based on content type', () => {
    setup({ contentType: 'application/json' })

    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-language', 'json')
  })

  it('uses plaintext language for form-urlencoded', () => {
    setup({ contentType: 'application/x-www-form-urlencoded' })

    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-language', 'plaintext')
  })

  it('uses html language for text/html', () => {
    setup({ contentType: 'text/html' })

    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-language', 'html')
  })

  it('uses xml language for application/xml', () => {
    setup({ contentType: 'application/xml' })

    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-language', 'xml')
  })

  it('calls onContentTypeChange when content type is changed', () => {
    const { onContentTypeChange } = setup()

    const select = screen.getByTestId('content-type-select')
    fireEvent.change(select, { target: { value: 'text/plain' } })

    expect(onContentTypeChange).toHaveBeenCalledWith('text/plain')
  })

  it('calls onBodyChange when editor content changes after the idle commit delay', () => {
    const { onBodyChange } = setup()

    const textarea = screen.getByTestId('mock-editor-textarea')
    fireEvent.change(textarea, { target: { value: '{"hello": "world"}' } })

    // Not called immediately; Monaco keeps typing local while the user is active.
    expect(onBodyChange).not.toHaveBeenCalled()

    // Advance past the idle commit delay.
    vi.advanceTimersByTime(1200)
    expect(onBodyChange).toHaveBeenCalledWith('{"hello": "world"}')
  })

  it('displays the current body value as defaultValue', () => {
    setup({ body: '{"test": true}' })

    const textarea = screen.getByTestId('mock-editor-textarea')
    expect(textarea).toHaveValue('{"test": true}')
  })

  it('renders format button', () => {
    setup()

    expect(screen.getByTestId('format-button')).toBeInTheDocument()
  })

  it('supports all content types', () => {
    const { onContentTypeChange } = setup()
    const contentTypes = [
      'application/json',
      'application/xml',
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
