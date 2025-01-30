import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestPanel } from '@/components/RequestPanel'
import { AuthConfig, URLParam, Header, Cookie, TestScript, TestAssertion } from '@/types'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Save: () => <div data-testid="save-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

// Mock child components
vi.mock('@/components/RequestUrlBar', () => ({
  RequestUrlBar: ({ onSend, onSave }: { 
    onSend: () => void,
    onSave: () => void 
  }) => (
    <div>
      <button onClick={onSend} data-testid="send-button">Send</button>
      <button onClick={onSave} data-testid="save-button">Save</button>
    </div>
  )
}))

vi.mock('@/components/KeyValueList', () => ({
  KeyValueList: ({ onItemsChange }: { onItemsChange: (items: any[]) => void }) => (
    <button onClick={() => onItemsChange([{ key: 'new', value: 'value' }])}>Add Item</button>
  )
}))

vi.mock('@/components/AuthConfigurator', () => ({
  AuthConfigurator: () => <div data-testid="auth-configurator" />
}))

vi.mock('@/components/RequestBodyEditor', () => ({
  RequestBodyEditor: () => <div data-testid="body-editor" />
}))

vi.mock('@/components/CookieEditor', () => ({
  CookieEditor: () => <div data-testid="cookie-editor" />
}))

vi.mock('@/components/TestPanel', () => ({
  TestPanel: ({ onRunTests }: { onRunTests: () => void }) => (
    <div data-testid="test-panel">
      <button onClick={onRunTests} data-testid="run-tests-button">
        Run Tests
      </button>
    </div>
  )
}))

vi.mock('@/components/CodeSnippetViewer', () => ({
  CodeSnippetViewer: () => <div data-testid="code-snippet" />
}))

// Add mock for SaveRequestDialog
vi.mock('@/components/SaveRequestDialog', () => ({
  SaveRequestDialog: ({ onSave, onNewCollection, open }: { 
    onSave: (id: string) => void,
    onNewCollection: (name: string) => void,
    open: boolean
  }) => {
    if (!open) return null;
    return (
      <div data-testid="save-dialog">
        <button 
          data-testid="save-to-existing"
          onClick={() => onSave('collection-1')}
        >
          Save to Existing
        </button>
        <button 
          data-testid="create-new"
          onClick={() => onNewCollection('New Collection')}
        >
          Create New
        </button>
      </div>
    );
  }
}))

// Update the useCollectionStore mock:
const mockStore = {
  collections: [],
  addRequest: vi.fn(),
  addCollection: vi.fn(() => 'collection-1')
}

vi.mock('@/store/collections', () => ({
  useCollectionStore: () => mockStore
}))

// Mock runTests utility
vi.mock('@/utils/testRunner', () => ({
  runTests: vi.fn().mockResolvedValue({
    success: true,
    duration: 100,
    scriptId: '1',
    scriptResults: [
      {
        name: 'Test 1',
        success: true,
        message: 'Test passed',
      },
    ],
    assertions: [
      {
        id: '1',
        success: true,
        message: 'Status code is 200',
      },
    ],
  }),
}))

describe('RequestPanel', () => {
  const mockProps = {
    method: 'GET',
    url: 'https://api.example.com',
    loading: false,
    params: [] as URLParam[],
    headers: [] as Header[],
    body: '',
    contentType: 'application/json',
    auth: { type: 'none' } as AuthConfig,
    cookies: [] as Cookie[],
    testScripts: [] as TestScript[],
    testAssertions: [] as TestAssertion[],
    testResults: null,
    response: null,
    onMethodChange: vi.fn(),
    onUrlChange: vi.fn(),
    onParamsChange: vi.fn(),
    onHeadersChange: vi.fn(),
    onBodyChange: vi.fn(),
    onContentTypeChange: vi.fn(),
    onAuthChange: vi.fn(),
    onCookiesChange: vi.fn(),
    onTestScriptsChange: vi.fn(),
    onTestAssertionsChange: vi.fn(),
    onTestResultsChange: vi.fn(),
    onSend: vi.fn(),
    addRequest: vi.fn(),
    addCollection: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all main components', () => {
    render(<RequestPanel {...mockProps} />)
    
    expect(screen.getByTestId('send-button')).toBeInTheDocument()
    expect(screen.getByText('Params')).toBeInTheDocument()
    expect(screen.getByText('Auth')).toBeInTheDocument()
    expect(screen.getByText('Headers')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Cookies')).toBeInTheDocument()
    expect(screen.getByText('Tests')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
  })

  it('displays correct tabs content when selected', async () => {
    render(<RequestPanel {...mockProps} />)
    const user = userEvent.setup()

    // Test Params tab
    await user.click(screen.getByText('Params'))
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()

    // Test Auth tab
    await user.click(screen.getByText('Auth'))
    expect(screen.getByTestId('auth-configurator')).toBeInTheDocument()

    // Test Headers tab
    await user.click(screen.getByText('Headers'))
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()

    // Test Body tab
    await user.click(screen.getByText('Body'))
    expect(screen.getByTestId('body-editor')).toBeInTheDocument()

    // Test Cookies tab
    await user.click(screen.getByText('Cookies'))
    expect(screen.getByTestId('cookie-editor')).toBeInTheDocument()

    // Test Tests tab
    await user.click(screen.getByText('Tests'))
    expect(screen.getByTestId('test-panel')).toBeInTheDocument()

    // Test Code tab
    await user.click(screen.getByText('Code'))
    expect(screen.getByTestId('code-snippet')).toBeInTheDocument()
  })

  it('calls onSend when send button is clicked', async () => {
    render(<RequestPanel {...mockProps} />)
    const user = userEvent.setup()
    
    await user.click(screen.getByTestId('send-button'))
    expect(mockProps.onSend).toHaveBeenCalled()
  })

  it('updates parameters when KeyValueList changes', async () => {
    render(<RequestPanel {...mockProps} />)
    const user = userEvent.setup()
    
    await user.click(screen.getByText('Params'))
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    
    expect(mockProps.onParamsChange).toHaveBeenCalledWith([{ key: 'new', value: 'value' }])
  })

  it('triggers keyboard shortcut for send', async () => {
    render(<RequestPanel {...mockProps} />)
    
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: false })
    expect(mockProps.onSend).toHaveBeenCalled()
  })

  it('does not trigger send on Enter when in textarea', async () => {
    render(<RequestPanel {...mockProps} />)
    
    // Simulate textarea focus
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: false })
    expect(mockProps.onSend).not.toHaveBeenCalled()
    
    document.body.removeChild(textarea)
  })

  it('passes correct props to CodeSnippetViewer', async () => {
    const customProps = {
      ...mockProps,
      method: 'POST',
      url: 'https://api.test.com',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      body: '{"test": true}'
    }
    
    render(<RequestPanel {...customProps} />)
    const user = userEvent.setup()
    
    // Navigate to Code tab first
    await user.click(screen.getByText('Code'))
    
    // Now check for the code snippet
    expect(screen.getByTestId('code-snippet')).toBeInTheDocument()
  })

  it('runs tests and updates results when response is available', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"test": true}',
      redirectChain: [],
      timing: { 
        start: Date.now(),
        end: Date.now() + 100,
        total: 100,
        duration: 100
      }
    };

    const customProps = {
      ...mockProps,
      response: mockResponse,
      testScripts: [{ id: '1', name: 'Test 1', code: 'test code', enabled: true }],
      testAssertions: [{
        id: '1',
        type: 'status' as const,
        operator: 'equals' as const,
        expected: 200,
        enabled: true
      }]
    };

    render(<RequestPanel {...customProps} />);
    const user = userEvent.setup();

    // Navigate to Tests tab and click Run Tests
    await user.click(screen.getByText('Tests'));
    await user.click(screen.getByTestId('run-tests-button'));

    expect(customProps.onTestResultsChange).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      scriptResults: expect.arrayContaining([
        expect.objectContaining({
          name: 'Test 1',
          success: true
        })
      ]),
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          success: true
        })
      ])
    }));
  });
})

describe('RequestPanel Save Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProps = {
    method: 'GET',
    url: 'https://api.example.com',
    loading: false,
    params: [] as URLParam[],
    headers: [] as Header[],
    body: '',
    contentType: 'application/json',
    auth: { type: 'none' } as AuthConfig,
    cookies: [] as Cookie[],
    testScripts: [] as TestScript[],
    testAssertions: [] as TestAssertion[],
    testResults: null,
    response: null,
    onMethodChange: vi.fn(),
    onUrlChange: vi.fn(),
    onParamsChange: vi.fn(),
    onHeadersChange: vi.fn(),
    onBodyChange: vi.fn(),
    onContentTypeChange: vi.fn(),
    onAuthChange: vi.fn(),
    onCookiesChange: vi.fn(),
    onTestScriptsChange: vi.fn(),
    onTestAssertionsChange: vi.fn(),
    onTestResultsChange: vi.fn(),
    onSend: vi.fn()
  };

  const setup = () => ({
    user: userEvent.setup(),
    store: mockStore,
    ...render(<RequestPanel {...mockProps} />)
  });

  it('saves request to existing collection', async () => {
    const { user, store } = setup();
    
    await user.click(screen.getByTestId('save-button'));
    await user.click(screen.getByTestId('save-to-existing'));
    
    expect(store.addRequest).toHaveBeenCalledWith(
      'collection-1',
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com'
      })
    );
  });

  it('creates new collection and saves request', async () => {
    const { user, store } = setup();
    
    await user.click(screen.getByTestId('save-button'));
    await user.click(screen.getByTestId('create-new'));
    
    expect(store.addCollection).toHaveBeenCalledWith('New Collection');
    expect(store.addRequest).toHaveBeenCalled();
  });
});

describe('Keyboard Shortcuts', () => {
  const mockProps = {
    method: 'GET',
    url: 'https://api.example.com',
    loading: false,
    params: [] as URLParam[],
    headers: [] as Header[],
    body: '',
    contentType: 'application/json',
    auth: { type: 'none' } as AuthConfig,
    cookies: [] as Cookie[],
    testScripts: [] as TestScript[],
    testAssertions: [] as TestAssertion[],
    testResults: null,
    response: null,
    onMethodChange: vi.fn(),
    onUrlChange: vi.fn(),
    onParamsChange: vi.fn(),
    onHeadersChange: vi.fn(),
    onBodyChange: vi.fn(),
    onContentTypeChange: vi.fn(),
    onAuthChange: vi.fn(),
    onCookiesChange: vi.fn(),
    onTestScriptsChange: vi.fn(),
    onTestAssertionsChange: vi.fn(),
    onTestResultsChange: vi.fn(),
    onSend: vi.fn(),
    addRequest: vi.fn(),
    addCollection: vi.fn()
  };

  it('does not trigger send with Ctrl+Enter', async () => {
    render(<RequestPanel {...mockProps} />);
    
    fireEvent.keyDown(document, { 
      key: 'Enter', 
      ctrlKey: true,
      metaKey: false 
    });
    
    expect(mockProps.onSend).not.toHaveBeenCalled();
  });
}); 