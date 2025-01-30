import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CookieEditor } from '@/components/CookieEditor'
import { Cookie } from '@/types'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
}))

describe('CookieEditor', () => {
  const setup = (initialCookies: Cookie[] = []) => {
    const props = {
      cookies: initialCookies,
      onCookiesChange: vi.fn(),
    }

    const utils = render(<CookieEditor {...props} />)

    return {
      ...utils,
      ...props,
    }
  }

  it('renders empty state with only add button', () => {
    setup([])
    
    expect(screen.queryAllByPlaceholderText('Cookie name')).toHaveLength(0)
    expect(screen.queryAllByPlaceholderText('Cookie value')).toHaveLength(0)
    expect(screen.getByText('Add Cookie')).toBeInTheDocument()
  })

  it('renders existing cookies', () => {
    const cookies = [
      { name: 'session', value: '123' },
      { name: 'theme', value: 'dark' },
    ]
    
    setup(cookies)
    
    const nameInputs = screen.getAllByPlaceholderText('Cookie name')
    const valueInputs = screen.getAllByPlaceholderText('Cookie value')
    
    expect(nameInputs).toHaveLength(2)
    expect(valueInputs).toHaveLength(2)
    
    expect(nameInputs[0]).toHaveValue('session')
    expect(valueInputs[0]).toHaveValue('123')
    expect(nameInputs[1]).toHaveValue('theme')
    expect(valueInputs[1]).toHaveValue('dark')
  })

  it('adds a new cookie when clicking add button', () => {
    const { onCookiesChange } = setup([])
    
    fireEvent.click(screen.getByText('Add Cookie'))
    
    expect(onCookiesChange).toHaveBeenCalledWith([
      { name: '', value: '' }
    ])
  })

  it('updates cookie name', () => {
    const { onCookiesChange } = setup([
      { name: '', value: '' }
    ])
    
    const nameInput = screen.getByPlaceholderText('Cookie name')
    fireEvent.change(nameInput, { target: { value: 'session' } })
    
    expect(onCookiesChange).toHaveBeenCalledWith([
      { name: 'session', value: '' }
    ])
  })

  it('updates cookie value', () => {
    const { onCookiesChange } = setup([
      { name: 'session', value: '' }
    ])
    
    const valueInput = screen.getByPlaceholderText('Cookie value')
    fireEvent.change(valueInput, { target: { value: '123' } })
    
    expect(onCookiesChange).toHaveBeenCalledWith([
      { name: 'session', value: '123' }
    ])
  })

  it('removes a cookie when clicking trash icon', () => {
    const { onCookiesChange } = setup([
      { name: 'session', value: '123' },
      { name: 'theme', value: 'dark' }
    ])
    
    const trashButtons = screen.getAllByTestId('trash-icon')
    fireEvent.click(trashButtons[0])
    
    expect(onCookiesChange).toHaveBeenCalledWith([
      { name: 'theme', value: 'dark' }
    ])
  })

  it('handles multiple cookies correctly', () => {
    const { onCookiesChange } = setup([
      { name: 'session', value: '123' },
      { name: 'theme', value: 'dark' }
    ])
    
    // Update second cookie's name
    const nameInputs = screen.getAllByPlaceholderText('Cookie name')
    fireEvent.change(nameInputs[1], { target: { value: 'mode' } })
    
    expect(onCookiesChange).toHaveBeenCalledWith([
      { name: 'session', value: '123' },
      { name: 'mode', value: 'dark' }
    ])
  })

  it('preserves other cookie fields when updating one cookie', () => {
    const { onCookiesChange } = setup([
      { name: 'session', value: '123' },
      { name: 'theme', value: 'dark' }
    ])
    
    // Update first cookie's value
    const valueInputs = screen.getAllByPlaceholderText('Cookie value')
    fireEvent.change(valueInputs[0], { target: { value: '456' } })
    
    expect(onCookiesChange).toHaveBeenCalledWith([
      { name: 'session', value: '456' },
      { name: 'theme', value: 'dark' }
    ])
  })
}) 