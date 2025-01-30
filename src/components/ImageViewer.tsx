import { useState } from "react"
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { Button } from "./ui/button"

interface ImageViewerProps {
  src: string | Uint8Array
  contentType: string
  isBase64?: boolean
}

export function ImageViewer({ src, contentType, isBase64 }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  // Convert binary to data URL
  const dataUrl = (() => {
    console.log('ImageViewer props:', { src: typeof src === 'string' ? src.slice(0, 100) + '...' : 'Uint8Array', contentType, isBase64 });
    
    try {
      if (contentType.startsWith('image/svg')) {
        // For SVG, we need to unescape the quotes and properly encode the XML
        if (typeof src !== 'string') {
          throw new Error('SVG source must be a string');
        }
        const unescapedSvg = src.replace(/\\"/g, '"');
        return `data:${contentType};charset=utf-8,${encodeURIComponent(unescapedSvg)}`
      } else if (isBase64) {
        // For base64 encoded binary images
        if (typeof src !== 'string') {
          throw new Error('Base64 source must be a string');
        }
        return `data:${contentType};base64,${src}`
      } else {
        // For binary data
        try {
          let bytes: Uint8Array;
          if (src instanceof Uint8Array) {
            bytes = src;
            console.log('Using Uint8Array directly:', bytes.length, 'bytes');
          } else {
            // Convert binary string to Uint8Array
            bytes = new Uint8Array(src.length);
            for (let i = 0; i < src.length; i++) {
              bytes[i] = src.charCodeAt(i);
            }
            console.log('Converted string to Uint8Array:', bytes.length, 'bytes');
          }
          // Create blob directly from the Uint8Array
          const blob = new Blob([bytes.buffer], { type: contentType });
          console.log('Created blob:', blob.size, 'bytes');
          const url = URL.createObjectURL(blob);
          console.log('Created blob URL:', url);
          return url;
        } catch (e) {
          console.error('Failed to create blob:', e);
          return null;
        }
      }
    } catch (e) {
      console.error('Failed to create image URL:', e);
      return null;
    }
  })();

  if (!dataUrl) {
    return <div className="text-sm text-red-400">Failed to load image</div>
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="sticky top-0 z-10 flex gap-2 mb-2 bg-background/80 backdrop-blur p-2 rounded-md">
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground self-center">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <div className="flex items-center justify-center min-h-[200px]">
        <img
          src={dataUrl}
          alt="Response"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            maxWidth: '100%',
            height: 'auto'
          }}
          className="max-w-full"
        />
      </div>
    </div>
  )
} 