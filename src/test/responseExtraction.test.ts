import { describe, it, expect } from 'vitest'
import { applyExtractionRules, extractRuleValue } from '@/utils/responseExtraction'
import { Response, ResponseExtractionRule } from '@/types'

const baseResponse: Response = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'x-request-id': 'req-1',
  },
  body: JSON.stringify({
    data: {
      token: 'abc123',
    },
  }),
  cookies: ['session_id=sess-1; Path=/'],
  redirectChain: [],
}

describe('responseExtraction', () => {
  it('extracts values from body/header/cookie/status', () => {
    expect(extractRuleValue(baseResponse, {
      id: '1',
      source: 'body',
      path: 'data.token',
      variableName: 'token',
    }).value).toBe('abc123')

    expect(extractRuleValue(baseResponse, {
      id: '2',
      source: 'header',
      path: 'x-request-id',
      variableName: 'requestId',
    }).value).toBe('req-1')

    expect(extractRuleValue(baseResponse, {
      id: '3',
      source: 'cookie',
      path: 'session_id',
      variableName: 'session',
    }).value).toBe('sess-1')

    expect(extractRuleValue(baseResponse, {
      id: '4',
      source: 'status',
      path: '',
      variableName: 'statusCode',
    }).value).toBe('200')
  })

  it('applies rules and returns updated metadata', () => {
    const rules: ResponseExtractionRule[] = [
      {
        id: '1',
        source: 'body',
        path: 'data.token',
        variableName: 'token',
      },
      {
        id: '2',
        source: 'header',
        path: 'missing-header',
        variableName: 'missing',
      },
    ]

    const values = new Map<string, string>()
    const result = applyExtractionRules(baseResponse, rules, (key, value) => {
      values.set(key, value)
    })

    expect(result.successCount).toBe(1)
    expect(result.errorCount).toBe(1)
    expect(values.get('token')).toBe('abc123')
    expect(result.updatedRules[0].lastExtractedValue).toBe('abc123')
    expect(result.updatedRules[1].lastExtractedValue).toBeUndefined()
  })
})
