import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyValueList } from '../components/KeyValueList'

describe('KeyValueList', () => {
  it('renders empty list with add button', () => {
    const onItemsChange = vi.fn()
    render(<KeyValueList items={[]} onItemsChange={onItemsChange} />)
    
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })

  it('adds new item when clicking add button', () => {
    const onItemsChange = vi.fn()
    render(<KeyValueList items={[]} onItemsChange={onItemsChange} />)
    
    fireEvent.click(screen.getByText('Add Item'))
    expect(onItemsChange).toHaveBeenCalledWith([{ key: '', value: '', enabled: true }])
  })

  it('handles item updates', () => {
    const initialItems = [{ key: '', value: '', enabled: true }]
    const onItemsChange = vi.fn()
    render(<KeyValueList items={initialItems} onItemsChange={onItemsChange} />)
    
    const input = screen.getByPlaceholderText('Name')
    fireEvent.change(input, { target: { value: 'test-key' } })
    
    expect(onItemsChange).toHaveBeenCalledWith([
      { key: 'test-key', value: '', enabled: true }
    ])
  })

  it('handles item removal', () => {
    const initialItems = [{ key: 'test', value: 'value', enabled: true }]
    const onItemsChange = vi.fn()
    render(<KeyValueList items={initialItems} onItemsChange={onItemsChange} />)
    
    fireEvent.click(screen.getByLabelText('trash'))
    expect(onItemsChange).toHaveBeenCalledWith([])
  })

  it('handles enabled state toggle', () => {
    const initialItems = [{ key: 'test', value: 'value', enabled: true }]
    const onItemsChange = vi.fn()
    render(<KeyValueList items={initialItems} onItemsChange={onItemsChange} />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(onItemsChange).toHaveBeenCalledWith([
      { key: 'test', value: 'value', enabled: false }
    ])
  })

  it('respects disabled prop', () => {
    const onItemsChange = vi.fn()
    render(<KeyValueList 
      items={[{ key: 'test', value: 'value', enabled: true }]} 
      onItemsChange={onItemsChange}
      disabled={true}
    />)
    
    expect(screen.getByPlaceholderText('Name')).toBeDisabled()
    expect(screen.getByPlaceholderText('Value')).toBeDisabled()
    expect(screen.getByText('Add Item')).toBeDisabled()
  })

  it('handles value updates', () => {
    const initialItems = [{ key: 'test', value: '', enabled: true }]
    const onItemsChange = vi.fn()
    render(<KeyValueList items={initialItems} onItemsChange={onItemsChange} />)
    
    const input = screen.getByPlaceholderText('Value')
    fireEvent.change(input, { target: { value: 'test-value' } })
    
    expect(onItemsChange).toHaveBeenCalledWith([
      { key: 'test', value: 'test-value', enabled: true }
    ])
  })

  it('renders multiple items correctly', () => {
    const initialItems = [
      { key: 'key1', value: 'value1', enabled: true },
      { key: 'key2', value: 'value2', enabled: false }
    ]
    render(<KeyValueList items={initialItems} onItemsChange={() => {}} />)
    
    expect(screen.getAllByPlaceholderText('Name')).toHaveLength(2)
    expect(screen.getAllByPlaceholderText('Value')).toHaveLength(2)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('uses custom placeholders when provided', () => {
    render(
      <KeyValueList 
        items={[{ key: '', value: '', enabled: true }]}
        onItemsChange={() => {}}
        keyPlaceholder="Custom Key"
        valuePlaceholder="Custom Value"
      />
    )
    
    expect(screen.getByPlaceholderText('Custom Key')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Custom Value')).toBeInTheDocument()
  })

  it('maintains other items when removing one from middle', () => {
    const initialItems = [
      { key: 'key1', value: 'value1', enabled: true },
      { key: 'key2', value: 'value2', enabled: true },
      { key: 'key3', value: 'value3', enabled: true }
    ]
    const onItemsChange = vi.fn()
    render(<KeyValueList items={initialItems} onItemsChange={onItemsChange} />)
    
    const trashButtons = screen.getAllByLabelText('trash')
    fireEvent.click(trashButtons[1]) // Remove middle item
    
    expect(onItemsChange).toHaveBeenCalledWith([
      { key: 'key1', value: 'value1', enabled: true },
      { key: 'key3', value: 'value3', enabled: true }
    ])
  })
}) 