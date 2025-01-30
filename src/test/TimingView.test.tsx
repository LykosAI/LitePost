import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimingView } from '@/components/TimingView'

describe('TimingView', () => {
  const mockTiming = {
    total: 100,
    dns: 10,
    first_byte: 50,
    download: 40
  }

  it('renders all timing information when available', () => {
    render(<TimingView timing={mockTiming} />)
    
    expect(screen.getByText('Total Time')).toBeInTheDocument()
    expect(screen.getByText('100ms')).toBeInTheDocument()
    
    expect(screen.getByText('DNS Lookup')).toBeInTheDocument()
    expect(screen.getByText('10ms')).toBeInTheDocument()
    
    expect(screen.getByText('Time to First Byte')).toBeInTheDocument()
    expect(screen.getByText('50ms')).toBeInTheDocument()
    
    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(screen.getByText('40ms')).toBeInTheDocument()
  })

  it('shows tooltip for DNS lookup time', () => {
    render(<TimingView timing={mockTiming} />)
    
    const tooltip = screen.getByText('(?)')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip.parentElement).toHaveTextContent('DNS Lookup')
  })

  it('omits optional timing information when not provided', () => {
    const partialTiming = {
      total: 100
    }
    
    render(<TimingView timing={partialTiming} />)
    
    expect(screen.getByText('Total Time')).toBeInTheDocument()
    expect(screen.getByText('100ms')).toBeInTheDocument()
    
    expect(screen.queryByText('DNS Lookup')).not.toBeInTheDocument()
    expect(screen.queryByText('Time to First Byte')).not.toBeInTheDocument()
    expect(screen.queryByText('Download')).not.toBeInTheDocument()
  })

  it('rounds timing values to whole numbers', () => {
    const timingWithDecimals = {
      total: 100.6,
      dns: 10.2,
      first_byte: 50.8,
      download: 40.4
    }
    
    render(<TimingView timing={timingWithDecimals} />)
    
    expect(screen.getByText('101ms')).toBeInTheDocument()
    expect(screen.getByText('10ms')).toBeInTheDocument()
    expect(screen.getByText('51ms')).toBeInTheDocument()
    expect(screen.getByText('40ms')).toBeInTheDocument()
  })
}) 