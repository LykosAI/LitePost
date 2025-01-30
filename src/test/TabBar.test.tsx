import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabBar } from '@/components/TabBar'
import { Tab } from '@/types'

// Mock the Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

describe('TabBar', () => {
  const mockTabs: Tab[] = [
    {
      id: 'tab1',
      name: 'Request 1',
      method: 'GET',
      url: 'https://api.example.com/1',
      rawUrl: 'https://api.example.com/1',
      params: [],
      headers: [],
      body: '',
      contentType: 'application/json',
      auth: { type: 'none' },
      cookies: [],
      testScripts: [],
      testAssertions: [],
      testResults: null,
      response: null,
      loading: false,
      isEditing: false,
    },
    {
      id: 'tab2',
      name: 'Request 2',
      method: 'POST',
      url: 'https://api.example.com/2',
      rawUrl: 'https://api.example.com/2',
      params: [],
      headers: [],
      body: '',
      contentType: 'application/json',
      auth: { type: 'none' },
      cookies: [],
      testScripts: [],
      testAssertions: [],
      testResults: null,
      response: null,
      loading: false,
      isEditing: false,
    },
    {
      id: 'tab3',
      name: 'Request 3',
      method: 'PUT',
      url: 'https://api.example.com/3',
      rawUrl: 'https://api.example.com/3',
      params: [],
      headers: [],
      body: '',
      contentType: 'application/json',
      auth: { type: 'none' },
      cookies: [],
      testScripts: [],
      testAssertions: [],
      testResults: null,
      response: null,
      loading: false,
      isEditing: false,
    },
  ]

  const setup = () => {
    const activeTab = 'tab1'
    const onTabChange = vi.fn()
    const onAddTab = vi.fn()
    const onCloseTab = vi.fn()
    const onStartEditing = vi.fn()
    const onStopEditing = vi.fn()

    const renderResult = render(
      <TabBar
        tabs={mockTabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onAddTab={onAddTab}
        onCloseTab={onCloseTab}
        onStartEditing={onStartEditing}
        onStopEditing={onStopEditing}
      />
    )

    const addButton = screen.getByTestId('plus-icon').parentElement!
    const closeButtons = screen.getAllByTestId('x-icon').map(icon => icon.parentElement!)

    return {
      tabs: mockTabs,
      activeTab,
      onTabChange,
      onAddTab,
      onCloseTab,
      onStartEditing,
      onStopEditing,
      addButton,
      closeButtons,
      user: userEvent.setup(),
      rerender: renderResult.rerender
    }
  }

  it('renders all tabs with correct names and methods', () => {
    setup()
    mockTabs.forEach(tab => {
      expect(screen.getByText(tab.name)).toBeInTheDocument()
    })
  })

  it('applies correct method color classes', () => {
    setup()
    const methodColors = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500'
    }
    mockTabs.forEach(tab => {
      const tabElement = screen.getByText(tab.name).closest('[role="tab"]')!
      const methodIndicator = tabElement.querySelector('div[class*="rounded-full"]')!
      expect(methodIndicator).toHaveClass(methodColors[tab.method as keyof typeof methodColors])
    })
  })

  it('shows active tab correctly', () => {
    setup()
    const tab1 = screen.getByText('Request 1').closest('[role="tab"]')
    expect(tab1).toHaveAttribute('data-state', 'active')
  })

  it('calls onTabChange when clicking a tab', async () => {
    const { onTabChange } = setup()
    const user = userEvent.setup()
    const tab2 = screen.getByText('Request 2').closest('[role="tab"]')!
    await user.click(tab2)
    expect(onTabChange).toHaveBeenCalledWith('tab2')
  })

  it('calls onAddTab when clicking the add button', async () => {
    const { onAddTab, addButton } = setup()
    const user = userEvent.setup()
    await user.click(addButton)
    expect(onAddTab).toHaveBeenCalled()
  })

  it('calls onCloseTab when clicking the close button', async () => {
    const { onCloseTab, closeButtons } = setup()
    const user = userEvent.setup()
    await user.click(closeButtons[0])
    expect(onCloseTab).toHaveBeenCalledWith('tab1')
  })

  it('starts editing on double click', async () => {
    const { onStartEditing } = setup()
    const user = userEvent.setup()
    const tab = screen.getByText('Request 1').closest('[role="tab"]')!
    await user.dblClick(tab)
    expect(onStartEditing).toHaveBeenCalledWith('tab1')
  })

  it('handles tab name editing', async () => {
    const { onStopEditing, rerender } = setup()
    const user = userEvent.setup()
    
    // Simulate the tab entering edit mode
    const editingTabs = mockTabs.map(tab => 
      tab.id === 'tab1' ? { ...tab, isEditing: true } : tab
    )
    
    rerender(
      <TabBar
        tabs={editingTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
        onAddTab={vi.fn()}
        onCloseTab={vi.fn()}
        onStartEditing={vi.fn()}
        onStopEditing={onStopEditing}
      />
    )

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Name{enter}')
    expect(onStopEditing).toHaveBeenCalledWith('tab1', 'New Name')
  })

  it('cancels editing on escape key', async () => {
    const { onStopEditing, rerender } = setup()
    const user = userEvent.setup()
    
    // Simulate the tab entering edit mode
    const editingTabs = mockTabs.map(tab => 
      tab.id === 'tab1' ? { ...tab, isEditing: true } : tab
    )
    
    rerender(
      <TabBar
        tabs={editingTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
        onAddTab={vi.fn()}
        onCloseTab={vi.fn()}
        onStartEditing={vi.fn()}
        onStopEditing={onStopEditing}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '{escape}')
    expect(onStopEditing).toHaveBeenCalledWith('tab1', 'Request 1')
  })

  it('stops editing on blur', async () => {
    const { onStopEditing, rerender } = setup()
    const user = userEvent.setup()
    
    // Simulate the tab entering edit mode
    const editingTabs = mockTabs.map(tab => 
      tab.id === 'tab1' ? { ...tab, isEditing: true } : tab
    )
    
    rerender(
      <TabBar
        tabs={editingTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
        onAddTab={vi.fn()}
        onCloseTab={vi.fn()}
        onStartEditing={vi.fn()}
        onStopEditing={onStopEditing}
      />
    )

    await user.click(document.body)
    expect(onStopEditing).toHaveBeenCalledWith('tab1', 'Request 1')
  })

  it('hides close button when only one tab exists', () => {
    const { tabs: [singleTab], ...props } = setup()
    cleanup()
    render(
      <TabBar
        {...props}
        tabs={[singleTab]}
        activeTab={singleTab.id}
      />
    )
    expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument()
  })

  it('handles horizontal scrolling', () => {
    setup()
    const tabsList = screen.getByRole('tablist')
    
    // Mock scrollLeft since it's not implemented in JSDOM
    Object.defineProperty(tabsList, 'scrollLeft', {
      configurable: true,
      value: 0,
      writable: true
    })
    Object.defineProperty(tabsList, 'scrollWidth', {
      configurable: true,
      value: 1000,
      writable: true
    })
    Object.defineProperty(tabsList, 'clientWidth', {
      configurable: true,
      value: 500,
      writable: true
    })

    // Test with shift key
    fireEvent.wheel(tabsList, { deltaY: 100, shiftKey: true })
    expect(tabsList.scrollLeft).toBe(100)

    // Test without shift key
    fireEvent.wheel(tabsList, { deltaX: 50 })
    expect(tabsList.scrollLeft).toBe(150)
  })
}) 
