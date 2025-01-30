import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestPanel } from '@/components/TestPanel'
import { TestScript, TestAssertion, TestResult, Response } from '@/types'
import React from 'react'
import { SelectTrigger, SelectContent } from '@/components/ui/select'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  Check: () => <div data-testid="check" />,
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid={`select-${value}`} data-value={value}>
      {React.Children.map(children, child => {
        if (child.type === SelectTrigger || child.type === SelectContent) {
          return React.cloneElement(child, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectTrigger: ({ children, 'aria-label': ariaLabel }: any) => (
    <button role="combobox" aria-label={ariaLabel}>
      {children}
    </button>
  ),
  SelectValue: () => <span>Value</span>,
  SelectContent: ({ children, onValueChange }: any) => (
    <div>
      {React.Children.map(children, child => 
        React.cloneElement(child, { 
          onClick: () => onValueChange(child.props.value)
        })
      )}
    </div>
  ),
  SelectItem: ({ children, value, onClick }: any) => (
    <div role="option" data-value={value} onClick={onClick}>
      {children}
    </div>
  ),
}))

describe('TestPanel', () => {
  const mockScripts: TestScript[] = [
    {
      id: '1',
      name: 'Test Script 1',
      code: 'pm.test("Test 1", () => { pm.expect(true).to.be.true; });',
      enabled: true,
    },
  ]

  const mockAssertions: TestAssertion[] = [
    {
      id: '1',
      type: 'status',
      operator: 'equals',
      expected: 200,
      enabled: true,
    },
  ]

  const mockTestResults: TestResult = {
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
    error: undefined,
  }

  const mockResponse: Response = {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
    },
    body: '{"test": true}',
    redirectChain: [],
  }

  const defaultProps = {
    scripts: mockScripts,
    assertions: mockAssertions,
    testResults: mockTestResults,
    response: mockResponse,
    onScriptsChange: vi.fn(),
    onAssertionsChange: vi.fn(),
    onRunTests: vi.fn(),
  }

  const setup = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props }
    const user = userEvent.setup()
    const utils = render(<TestPanel {...mergedProps} />)
    return {
      user,
      ...utils,
      ...mergedProps,
    }
  }

  it('renders the component with basic elements', () => {
    setup()
    
    expect(screen.getByText('Tests')).toBeInTheDocument()
    expect(screen.getByText('Run Tests')).toBeInTheDocument()
    expect(screen.getByText('Add Script')).toBeInTheDocument()
    expect(screen.getByText('Add Assertion')).toBeInTheDocument()
  })

  it('displays existing test scripts', () => {
    setup()
    
    expect(screen.getByRole('heading', { name: 'Test Scripts' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Script 1')).toBeInTheDocument()
    expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent(mockScripts[0].code)
  })

  it('displays existing assertions', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Test Scripts' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Operator' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('200')).toBeInTheDocument()
  })

  it('displays test results when available', () => {
    setup()
    
    expect(screen.getByText('Test Results')).toBeInTheDocument()
    expect(screen.getByText('Tests passed')).toBeInTheDocument()
    expect(screen.getByText('(100ms)')).toBeInTheDocument()
    expect(screen.getByText('Test 1')).toBeInTheDocument()
    expect(screen.getByText('Status code is 200')).toBeInTheDocument()
  })

  it('disables Run Tests button when no response is available', () => {
    setup({ response: null })
    
    expect(screen.getByText('Run Tests')).toBeDisabled()
  })

  it('disables Run Tests button when no scripts or assertions are present', () => {
    setup({ scripts: [], assertions: [] })
    
    expect(screen.getByText('Run Tests')).toBeDisabled()
  })

  // Add more test cases for interactive features
  it('adds a new test script', async () => {
    const { user, onScriptsChange } = setup()
    
    await user.click(screen.getByText('Add Script'))
    
    expect(onScriptsChange).toHaveBeenCalledWith(expect.arrayContaining([
      ...mockScripts,
      expect.objectContaining({
        name: 'Test Script 2',
        enabled: true,
      })
    ]))
  })

  it('removes a test script', async () => {
    const { user, onScriptsChange } = setup()
    
    await user.click(screen.getAllByTestId('trash-icon')[0])
    
    expect(onScriptsChange).toHaveBeenCalledWith([])
  })

  it('updates script name', async () => {
    const { user, onScriptsChange } = setup()
    const input = screen.getByDisplayValue('Test Script 1')
    
    await user.clear(input)
    fireEvent.change(input, {
      target: {
        value: 'Updated Script Name'
      }
    })
    fireEvent.blur(input)
    
    expect(onScriptsChange).toHaveBeenLastCalledWith([
      {
        id: '1',
        name: 'Updated Script Name',
        code: 'pm.test("Test 1", () => { pm.expect(true).to.be.true; });',
        enabled: true
      }
    ])
  })

  it('updates script code', async () => {
    const { user, onScriptsChange } = setup()
    const codeEditor = screen.getByDisplayValue('pm.test("Test 1", () => { pm.expect(true).to.be.true; });')
    
    await user.clear(codeEditor)
    fireEvent.change(codeEditor, {
      target: {
        value: 'pm.test("Updated Test", () => { pm.expect(false).to.be.false; });'
      }
    })
    fireEvent.blur(codeEditor)
    
    expect(onScriptsChange).toHaveBeenLastCalledWith([
      {
        id: '1',
        name: 'Test Script 1',
        code: 'pm.test("Updated Test", () => { pm.expect(false).to.be.false; });',
        enabled: true
      }
    ])
  })

  it('adds a new assertion', async () => {
    const { user, onAssertionsChange } = setup()
    
    await user.click(screen.getByText('Add Assertion'))
    
    expect(onAssertionsChange).toHaveBeenCalledWith(expect.arrayContaining([
      ...mockAssertions,
      expect.objectContaining({
        type: 'status',
        operator: 'equals',
        expected: 200,
        enabled: true,
      })
    ]))
  })

  it('removes an assertion', async () => {
    const { user, onAssertionsChange } = setup()
    
    await user.click(screen.getAllByTestId('trash-icon')[1])
    
    expect(onAssertionsChange).toHaveBeenCalledWith([])
  })

  it('updates assertion type', async () => {
    const { user, onAssertionsChange } = setup()
    const typeSelect = screen.getByTestId('select-status')
    const jsonOption = within(typeSelect).getByRole('option', { name: 'JSON Value' })
    
    await user.click(jsonOption)
    
    expect(onAssertionsChange).toHaveBeenCalledWith([
      {
        id: '1',
        type: 'json',
        operator: 'equals',
        expected: 200,
        enabled: true
      }
    ])
  })

  it('updates assertion operator', async () => {
    const { user, onAssertionsChange } = setup()
    const operatorSelect = screen.getByTestId('select-equals')
    const existsOption = within(operatorSelect).getByRole('option', { name: 'Exists' })
    
    await user.click(existsOption)
    
    expect(onAssertionsChange).toHaveBeenCalledWith([
      {
        id: '1',
        type: 'status',
        operator: 'exists',
        expected: 200,
        enabled: true
      }
    ])
  })

  it('hides expected value input when operator is exists', async () => {
    setup({
      assertions: [{
        ...mockAssertions[0],
        operator: 'exists'
      }]
    })
    
    expect(screen.queryByPlaceholderText('Expected value')).not.toBeInTheDocument()
  })

  it('calls onRunTests when clicking Run Tests button', async () => {
    const { user, onRunTests } = setup()
    
    await user.click(screen.getByText('Run Tests'))
    
    expect(onRunTests).toHaveBeenCalled()
  })

  it('displays failed test results correctly', () => {
    const failedResults: TestResult = {
      success: false,
      duration: 100,
      scriptId: '1',
      scriptResults: [
        {
          name: 'Failed Test',
          success: false,
          message: 'Expected error',
        },
      ],
      assertions: [
        {
          id: '1',
          success: false,
          message: 'Expected 200 but got 404',
        },
      ],
      error: 'Test execution failed',
    }
    
    setup({ testResults: failedResults })
    
    expect(screen.getByText('Tests failed')).toBeInTheDocument()
    expect(screen.getByText('Expected error')).toBeInTheDocument()
    expect(screen.getByText('Expected 200 but got 404')).toBeInTheDocument()
    expect(screen.getByText('Test execution failed')).toBeInTheDocument()
  })
}) 
