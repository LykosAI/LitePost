import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnvironmentPanel } from '@/components/EnvironmentPanel'

// Mock the EnvironmentManager component
vi.mock('@/components/EnvironmentManager', () => ({
  EnvironmentManager: () => <div data-testid="environment-manager">Environment Manager Mock</div>
}))

describe('EnvironmentPanel', () => {
  it('renders trigger button correctly', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={false} onOpenChange={onOpenChange} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('h-10', 'w-10', 'rounded-none')
  })

  it('calls onOpenChange when trigger button is clicked', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={false} onOpenChange={onOpenChange} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('renders sheet content when open is true', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={true} onOpenChange={onOpenChange} />)
    
    expect(screen.getByText('Environment Manager')).toBeInTheDocument()
    expect(screen.getByTestId('environment-manager')).toBeInTheDocument()
  })

  it('does not render sheet content when open is false', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={false} onOpenChange={onOpenChange} />)
    
    expect(screen.queryByText('Environment Manager')).not.toBeInTheDocument()
    expect(screen.queryByTestId('environment-manager')).not.toBeInTheDocument()
  })

  it('applies correct styling to sheet content', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={true} onOpenChange={onOpenChange} />)
    
    const sheetContent = screen.getByRole('dialog')
    expect(sheetContent).toHaveClass(
      'dark',
      'w-[600px]',
      'sm:w-[800px]',
      'sm:max-w-none',
      'border-l',
      'border-border',
      'bg-background',
      'text-foreground'
    )
  })
}) 