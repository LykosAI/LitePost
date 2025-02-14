import { useRef, useEffect } from 'react'
import { URLParam } from '@/types'

export function useUrlParams(url: string, onParamsChange: (params: URLParam[]) => void, currentParams: URLParam[] = []) {
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      try {
        // Don't parse params if we're still typing or no query string
        if (!url.includes('?')) {
          // Only clear params if there are no manually added empty ones
          if (!currentParams.some(p => p.key === '')) {
            onParamsChange([])
          }
          return
        }

        const [_, queryString] = url.split('?')
        
        // Don't parse if no query string
        if (!queryString || queryString.trim() === '') {
          // Only clear params if there are no manually added empty ones
          if (!currentParams.some(p => p.key === '')) {
            onParamsChange([])
          }
          return
        }

        // Parse the URL parameters
        try {
          const searchParams = new URLSearchParams(queryString)
          const newParams: URLParam[] = []
          
          searchParams.forEach((value, key) => {
            if (key) {  // Only add parameters with non-empty keys
              newParams.push({
                key,
                value,
                enabled: true
              })
            }
          })

          // Preserve any manually added empty params
          const emptyParams = currentParams.filter(p => p.key === '')
          onParamsChange([...newParams, ...emptyParams])
        } catch (error) {
          // Invalid query string, just keep existing params
          console.error('Error parsing URL params:', error)
        }
      } catch (error) {
        console.error('Error handling URL change:', error)
      }
    }, 1000) // Debounce delay

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [url, onParamsChange, currentParams])
} 