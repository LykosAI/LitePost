import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageViewer } from '@/components/ImageViewer'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ZoomIn: () => <div data-testid="zoom-in" />,
  ZoomOut: () => <div data-testid="zoom-out" />,
  RotateCw: () => <div data-testid="rotate-cw" />
}))

describe('ImageViewer', () => {
  const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const svgImage = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red"/></svg>'
  const binaryImage = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
    0x00, 0x00, 0x00, 0x0D,                          // IHDR chunk length
    0x49, 0x48, 0x44, 0x52,                          // "IHDR"
    0x00, 0x00, 0x00, 0x01,                          // width=1
    0x00, 0x00, 0x00, 0x01,                          // height=1
    0x08,                                            // bit depth
    0x02,                                            // color type (RGB)
    0x00,                                            // compression method
    0x00,                                            // filter method
    0x00,                                            // interlace method
    0x1F, 0x15, 0xC4, 0x89,                          // IHDR CRC
    0x00, 0x00, 0x00, 0x0C,                          // IDAT chunk length
    0x49, 0x44, 0x41, 0x54,                          // "IDAT"
    0x78, 0x9C, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00,  // IDAT data (compressed)
    0x00, 0x02, 0x00, 0x01,                          // IDAT CRC
    0x00, 0x00, 0x00, 0x00,                          // IEND chunk length
    0x49, 0x45, 0x4E, 0x44,                          // "IEND"
    0xAE, 0x42, 0x60, 0x82                           // IEND CRC
  ])

  it('renders base64 image correctly', () => {
    render(
      <ImageViewer
        src={base64Image}
        contentType="image/png"
        isBase64={true}
      />
    )

    const img = screen.getByAltText('Response') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', `data:image/png;base64,${base64Image}`)
  })

  it('renders SVG image correctly', () => {
    render(
      <ImageViewer
        src={svgImage}
        contentType="image/svg+xml"
        isBase64={false}
      />
    )

    const img = screen.getByAltText('Response') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('data:image/svg+xml;charset=utf-8,')
  })

  it('handles binary image data', () => {
    // Convert binary data to base64
    const base64Data = btoa(String.fromCharCode.apply(null, Array.from(binaryImage)))
    console.log('Base64 data:', base64Data)
    
    render(
      <ImageViewer
        src={base64Data}
        contentType="image/png"
        isBase64={true}
      />
    )

    const img = screen.getByAltText('Response') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('data:image/png;base64,')
  })

  it('shows error message when image fails to load', () => {
    // Pass invalid data that will cause an error
    render(
      <ImageViewer
        src={''}
        contentType=""
        isBase64={false}
      />
    )

    expect(screen.getByText('Failed to load image')).toBeInTheDocument()
  })

  it('displays zoom controls', async () => {
    const user = userEvent.setup()
    render(
      <ImageViewer
        src={base64Image}
        contentType="image/png"
        isBase64={true}
      />
    )

    // Check controls are present
    expect(screen.getByTestId('zoom-in')).toBeInTheDocument()
    expect(screen.getByTestId('zoom-out')).toBeInTheDocument()
    expect(screen.getByTestId('rotate-cw')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()

    // Test zoom in
    const zoomInButton = screen.getByTestId('zoom-in').closest('button')
    await user.click(zoomInButton!)
    expect(screen.getByText('125%')).toBeInTheDocument()

    // Test zoom out
    const zoomOutButton = screen.getByTestId('zoom-out').closest('button')
    await user.click(zoomOutButton!)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('handles rotation', async () => {
    const user = userEvent.setup()
    render(
      <ImageViewer
        src={base64Image}
        contentType="image/png"
        isBase64={true}
      />
    )

    const img = screen.getByAltText('Response') as HTMLImageElement
    expect(img.style.transform).toBe('scale(1) rotate(0deg)')

    const rotateButton = screen.getByTestId('rotate-cw').closest('button')
    await user.click(rotateButton!)
    expect(img.style.transform).toBe('scale(1) rotate(90deg)')
  })

  it('limits zoom range', async () => {
    const user = userEvent.setup()
    render(
      <ImageViewer
        src={base64Image}
        contentType="image/png"
        isBase64={true}
      />
    )

    const zoomInButton = screen.getByTestId('zoom-in').closest('button')
    const zoomOutButton = screen.getByTestId('zoom-out').closest('button')

    // Test maximum zoom (300%)
    for (let i = 0; i < 10; i++) {
      await user.click(zoomInButton!)
    }
    expect(screen.getByText('300%')).toBeInTheDocument()

    // Test minimum zoom (25%)
    for (let i = 0; i < 20; i++) {
      await user.click(zoomOutButton!)
    }
    expect(screen.getByText('25%')).toBeInTheDocument()
  })
}) 
