import { useRef, useEffect } from 'react'
import { URLParam } from '@/types'
import { parseUrlParams } from '@/utils/url'

function areParamsEqual(a: URLParam[], b: URLParam[]): boolean {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    if (a[i].key !== b[i].key || a[i].value !== b[i].value || a[i].enabled !== b[i].enabled) {
      return false
    }
  }

  return true
}

export function useUrlParams(url: string, onParamsChange: (params: URLParam[]) => void, currentParams: URLParam[] = []) {
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const onParamsChangeRef = useRef(onParamsChange)
  const currentParamsRef = useRef(currentParams)

  useEffect(() => {
    onParamsChangeRef.current = onParamsChange
  }, [onParamsChange])

  useEffect(() => {
    currentParamsRef.current = currentParams
  }, [currentParams])

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      try {
        const existingParams = currentParamsRef.current
        const newParams = parseUrlParams(url)
        const parsedKeys = new Set(newParams.map((param) => param.key))

        // Keep manually created blank rows and disabled rows that are not currently in the URL.
        const retainedParams = existingParams.filter(
          (param) => param.key === '' || (!param.enabled && !parsedKeys.has(param.key))
        )

        const mergedParams = [...newParams, ...retainedParams]

        if (!areParamsEqual(mergedParams, existingParams)) {
          onParamsChangeRef.current(mergedParams)
        }
      } catch (error) {
        console.error('Error handling URL change:', error)
      }
    }, 200) // Debounce delay

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [url])
} 
