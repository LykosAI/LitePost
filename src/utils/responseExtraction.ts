import { Response, ResponseExtractionRule } from '@/types'

function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj

  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined

    const match = part.match(/^(\w+)\[(\d+)\]$/)
    if (match) {
      const [, arrayName, index] = match
      current = (current as Record<string, unknown>)?.[arrayName]
      if (Array.isArray(current)) {
        current = current[Number.parseInt(index, 10)]
      } else {
        return undefined
      }
      continue
    }

    current = (current as Record<string, unknown>)?.[part]
  }

  return current
}

export function extractRuleValue(
  response: Response,
  rule: ResponseExtractionRule
): { value: string; error: string | null } {
  try {
    switch (rule.source) {
      case 'status':
        return { value: String(response.status), error: null }
      case 'header': {
        const headerKey = Object.keys(response.headers).find(
          (key) => key.toLowerCase() === rule.path.toLowerCase()
        )

        if (!headerKey) {
          return { value: '', error: `Header '${rule.path}' not found` }
        }

        return { value: response.headers[headerKey], error: null }
      }
      case 'cookie': {
        if (!response.cookies?.length) {
          return { value: '', error: 'No cookies in response' }
        }

        const cookie = response.cookies.find((item) => item.startsWith(`${rule.path}=`))
        if (!cookie) {
          return { value: '', error: `Cookie '${rule.path}' not found` }
        }

        const eqIndex = cookie.indexOf('=')
        const semicolonIndex = cookie.indexOf(';')
        const cookieValue = cookie.substring(eqIndex + 1, semicolonIndex > 0 ? semicolonIndex : undefined).trim()
        return { value: cookieValue, error: null }
      }
      case 'body': {
        try {
          const parsed = JSON.parse(response.body)
          const value = getValueByPath(parsed, rule.path)
          if (value === undefined) {
            return { value: '', error: `Path '${rule.path}' not found` }
          }

          return {
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            error: null,
          }
        } catch {
          if (!rule.path) {
            return { value: response.body, error: null }
          }

          return { value: '', error: 'Response body is not JSON' }
        }
      }
      default:
        return { value: '', error: 'Unknown source' }
    }
  } catch (error) {
    return {
      value: '',
      error: error instanceof Error ? error.message : 'Extraction failed',
    }
  }
}

export function applyExtractionRules(
  response: Response,
  rules: ResponseExtractionRule[],
  setVariable: (key: string, value: string) => void
): {
  updatedRules: ResponseExtractionRule[]
  successCount: number
  errorCount: number
} {
  let successCount = 0
  let errorCount = 0

  const updatedRules = rules.map((rule) => {
    if (!rule.variableName.trim()) {
      errorCount++
      return rule
    }

    const { value, error } = extractRuleValue(response, rule)
    if (error) {
      errorCount++
      return rule
    }

    setVariable(rule.variableName.trim(), value)
    successCount++

    return {
      ...rule,
      lastExtractedValue: value,
    }
  })

  return {
    updatedRules,
    successCount,
    errorCount,
  }
}
