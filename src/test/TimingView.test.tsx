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

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('100ms')).toBeInTheDocument()

    expect(screen.getByText('DNS Lookup')).toBeInTheDocument()
    expect(screen.getByText('10ms')).toBeInTheDocument()

    expect(screen.getByText('Time to First Byte')).toBeInTheDocument()
    expect(screen.getByText('50ms')).toBeInTheDocument()

    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(screen.getByText('40ms')).toBeInTheDocument()
  })

  it('shows DNS timing row when provided', () => {
    render(<TimingView timing={mockTiming} />)

    expect(screen.getByText('DNS Lookup')).toBeInTheDocument()
  })

  it('omits optional timing information when not provided', () => {
    const partialTiming = {
      total: 100
    }

    render(<TimingView timing={partialTiming} />)

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('100ms')).toBeInTheDocument()

    expect(screen.queryByText('DNS Lookup')).not.toBeInTheDocument()
    expect(screen.queryByText('Time to First Byte')).not.toBeInTheDocument()
    expect(screen.queryByText('Download')).not.toBeInTheDocument()
  })

  it('renders timing values with one decimal precision', () => {
    const timingWithDecimals = {
      total: 100.6,
      dns: 10.2,
      first_byte: 50.8,
      download: 40.4
    }

    render(<TimingView timing={timingWithDecimals} />)

    expect(screen.getByText('100.6ms')).toBeInTheDocument()
    expect(screen.getByText('10.2ms')).toBeInTheDocument()
    expect(screen.getByText('50.8ms')).toBeInTheDocument()
    expect(screen.getByText('40.4ms')).toBeInTheDocument()
  })

  it('renders waterfall bars for each timing phase', () => {
    const { container } = render(<TimingView timing={mockTiming} />)

    // Each timing row should have a bar element
    const bars = container.querySelectorAll('.rounded-full.h-full')
    expect(bars.length).toBeGreaterThanOrEqual(4) // dns, first_byte, download, total
  })
}) 
