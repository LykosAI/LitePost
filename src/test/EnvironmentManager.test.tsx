import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnvironmentManager } from '@/components/EnvironmentManager'
import { useEnvironmentStore } from '@/store/environments'

// Mock the KeyValueList component
vi.mock('@/components/KeyValueList', () => ({
  KeyValueList: ({ items, onItemsChange, envIndex }: any) => (
    <div data-testid={`key-value-list-${envIndex}`}>
      {items.map((item: any, index: number) => (
        <div key={index}>
          <input
            data-testid={`key-input-${envIndex}-${index}`}
            value={item.key}
            onChange={(e) => {
              const newItems = [...items]
              newItems[index] = { ...item, key: e.target.value }
              onItemsChange(newItems)
            }}
          />
          <input
            data-testid={`value-input-${envIndex}-${index}`}
            value={item.value}
            onChange={(e) => {
              const newItems = [...items]
              newItems[index] = { ...item, value: e.target.value }
              onItemsChange(newItems)
            }}
          />
        </div>
      ))}
    </div>
  )
}))

// Mock the environment store
vi.mock('@/store/environments', () => ({
  useEnvironmentStore: vi.fn()
}))

describe('EnvironmentManager', () => {
  const mockEnvironments = [
    { id: '1', name: 'Development', variables: { API_URL: 'http://dev.api' } },
    { id: '2', name: 'Production', variables: { API_URL: 'http://prod.api' } }
  ]

  const mockStore = {
    environments: mockEnvironments,
    activeEnvironmentId: '1',
    addEnvironment: vi.fn(),
    updateEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
    setActiveEnvironment: vi.fn()
  }

  beforeEach(() => {
    vi.mocked(useEnvironmentStore).mockReturnValue(mockStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders environments list correctly', () => {
    render(<EnvironmentManager />)
    
    expect(screen.getByText('Environments')).toBeInTheDocument()
    expect(screen.getByText('Active Environment')).toBeInTheDocument()
    
    // Check if both environments are rendered
    mockEnvironments.forEach((env, index) => {
      const nameInput = screen.getByDisplayValue(env.name)
      expect(nameInput).toBeInTheDocument()
      
      // Check if variables are rendered in KeyValueList
      const keyValueList = screen.getByTestId(`key-value-list-${index}`)
      expect(keyValueList).toBeInTheDocument()
      
      // Check key-value inputs
      const keyInput = screen.getByTestId(`key-input-${index}-0`)
      const valueInput = screen.getByTestId(`value-input-${index}-0`)
      expect(keyInput).toHaveValue('API_URL')
      expect(valueInput).toHaveValue(env.variables.API_URL)
    })
  })

  it('adds new environment when Add Environment button is clicked', () => {
    render(<EnvironmentManager />)
    
    const addButton = screen.getByRole('button', { name: /add environment/i })
    fireEvent.click(addButton)
    
    expect(mockStore.addEnvironment).toHaveBeenCalledWith('New Environment')
  })

  it('updates environment name when input changes', () => {
    render(<EnvironmentManager />)
    
    const nameInput = screen.getByDisplayValue('Development')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    
    expect(mockStore.updateEnvironment).toHaveBeenCalledWith('1', { name: 'New Name' })
  })

  it('updates environment variables when KeyValueList changes', () => {
    render(<EnvironmentManager />)
    
    const keyInput = screen.getByTestId('key-input-0-0')
    fireEvent.change(keyInput, { target: { value: 'NEW_API_URL' } })
    
    expect(mockStore.updateEnvironment).toHaveBeenCalledWith('1', {
      variables: { NEW_API_URL: 'http://dev.api' }
    })
  })

  it('deletes environment when delete button is clicked', () => {
    render(<EnvironmentManager />)
    
    const deleteButtons = screen.getAllByRole('button', { name: '' }) // Trash icon button
    fireEvent.click(deleteButtons[0]) // Delete first environment
    
    expect(mockStore.deleteEnvironment).toHaveBeenCalledWith('1')
  })

  it('changes active environment when select value changes', async () => {
    render(<EnvironmentManager />)
    
    const select = screen.getByRole('combobox')
    fireEvent.click(select)
    
    const option = screen.getByRole('option', { name: 'Production' })
    fireEvent.click(option)
    
    expect(mockStore.setActiveEnvironment).toHaveBeenCalledWith('2')
  })

  it('sets active environment to null when "None" is selected', () => {
    render(<EnvironmentManager />)
    
    const select = screen.getByRole('combobox')
    fireEvent.click(select)
    
    const option = screen.getByRole('option', { name: 'None' })
    fireEvent.click(option)
    
    expect(mockStore.setActiveEnvironment).toHaveBeenCalledWith(null)
  })
}) 