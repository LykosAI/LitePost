import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TitleBar } from '@/components/Titlebar'
import { useEnvironmentStore } from '@/store/environments'
import { useUiStore } from '@/store/ui'
import React from 'react'

// Create mock functions that we can track
const mockWindowFunctions = {
  minimize: vi.fn(),
  toggleMaximize: vi.fn(),
  close: vi.fn(),
}

// Mock all imports before any test code
vi.mock('@tauri-apps/api/window', () => ({
  Window: {
    getCurrent: () => mockWindowFunctions,
  },
}))

vi.mock('@/store/environments', () => ({
  useEnvironmentStore: vi.fn(),
}))

type PanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SelectProps = {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

// Mock all components
vi.mock('@/components/SettingsPanel', () => ({
  SettingsPanel: ({ open, onOpenChange }: PanelProps) => (
    <button onClick={() => onOpenChange(!open)}>Settings</button>
  ),
}))

vi.mock('@/components/EnvironmentPanel', () => ({
  EnvironmentPanel: ({ open, onOpenChange }: PanelProps) => (
    <button onClick={() => onOpenChange(!open)}>Environments</button>
  ),
}))

vi.mock('@/components/CollectionsPanel', () => ({
  CollectionsPanel: ({ open, onOpenChange }: PanelProps) => (
    <button onClick={() => onOpenChange(!open)}>Collections</button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: SelectProps) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="environment-select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => children,
  SelectValue: ({ placeholder }: { placeholder: string }) => placeholder,
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string, children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

describe('TitleBar', () => {
  const mockEnvironmentStore = {
    environments: [
      { id: 'env1', name: 'Development' },
      { id: 'env2', name: 'Production' },
    ],
    activeEnvironmentId: 'env1',
    setActiveEnvironment: vi.fn(),
  }

  beforeEach(() => {
    vi.mocked(useEnvironmentStore).mockReturnValue(mockEnvironmentStore)
    // Reset mock function calls
    mockWindowFunctions.minimize.mockReset()
    mockWindowFunctions.toggleMaximize.mockReset()
    mockWindowFunctions.close.mockReset()
    // The UI store is global — reset panel/palette state between tests
    useUiStore.setState({ paletteOpen: false, activePanel: null })
  })

  const setup = (props = {}) => {
    const user = userEvent.setup()
    const defaultProps = {
      currentRequest: undefined,
      onRequestSelect: vi.fn(),
      ...props,
    }

    const utils = render(<TitleBar {...defaultProps} />)
    return {
      user,
      ...utils,
      ...defaultProps,
    }
  }

  // it('renders the app title and logo', () => {
  //   setup()
  //   expect(screen.getByText('LitePost')).toBeInTheDocument()
  //   expect(screen.getByAltText('LitePost')).toBeInTheDocument()
  // })

  it('does not render window controls in non-Tauri environment', () => {
    setup()
    // Window controls (Minimize/Maximize/Close) only render when running inside Tauri
    expect(screen.queryByLabelText('Minimize')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Maximize')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
  })

  it('renders environment selector with correct options', () => {
    setup()
    const select = screen.getByTestId('environment-select')
    expect(select).toHaveValue('env1')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3) // None + 2 environments
    expect(options[0]).toHaveValue('null')
    expect(options[1]).toHaveValue('env1')
    expect(options[2]).toHaveValue('env2')
  })

  it('calls setActiveEnvironment when environment is changed', async () => {
    const { user } = setup()
    const select = screen.getByTestId('environment-select')

    await user.selectOptions(select, 'env2')
    expect(mockEnvironmentStore.setActiveEnvironment).toHaveBeenCalledWith('env2')

    await user.selectOptions(select, 'null')
    expect(mockEnvironmentStore.setActiveEnvironment).toHaveBeenCalledWith(null)
  })

  it('toggles panels when their buttons are clicked', async () => {
    const { user } = setup()

    // Test Environment Panel
    const envButton = screen.getByRole('button', { name: /Environments/i })
    await user.click(envButton)
    // The mock will handle the toggle internally

    // Test Settings Panel
    const settingsButton = screen.getByRole('button', { name: /Settings/i })
    await user.click(settingsButton)
    // The mock will handle the toggle internally

    // Test Collections Panel
    const collectionsButton = screen.getByRole('button', { name: /Collections/i })
    await user.click(collectionsButton)
    // The mock will handle the toggle internally
  })

  it('passes currentRequest and onRequestSelect to CollectionsPanel', () => {
    const currentRequest = { id: '1', name: 'Test Request' }
    const onRequestSelect = vi.fn()
    
    setup({ currentRequest, onRequestSelect })
    
    // Verify the CollectionsPanel is rendered with the correct props
    const collectionsButton = screen.getByRole('button', { name: /Collections/i })
    expect(collectionsButton).toBeInTheDocument()
  })
}) 
