import { describe, it, expect } from 'vitest'
import { runPreRequestScripts } from '@/utils/preRequestRunner'
import { TestScript } from '@/types'

describe('runPreRequestScripts', () => {
  it('applies script mutations and resolves variables after script execution', async () => {
    const env = new Map<string, string>([['base_url', 'https://api.example.com']])

    const scripts: TestScript[] = [
      {
        id: '1',
        name: 'sign',
        enabled: true,
        code: `
pm.environment.set('token', 'abc123');
pm.request.setHeader('Authorization', 'Bearer {{token}}');
pm.request.setQueryParam('ts', '1700000000');
pm.request.setBody('token={{token}}');
`,
      },
    ]

    const result = await runPreRequestScripts({
      scripts,
      request: {
        method: 'GET',
        url: '{{base_url}}/users',
        headers: {},
      },
      getVariable: (key) => env.get(key),
      setVariable: (key, value) => {
        env.set(key, value)
      },
      substituteVariables: (text) =>
        text.replace(/\{\{([^}]+)\}\}/g, (match, key) => env.get(key.trim()) ?? match),
    })

    expect(result.url).toContain('https://api.example.com/users')
    expect(result.url).toContain('ts=1700000000')
    expect(result.headers.Authorization).toBe('Bearer abc123')
    expect(result.body).toBe('token=abc123')
  })

  it('throws with script name on execution failure', async () => {
    const scripts: TestScript[] = [
      {
        id: '1',
        name: 'broken',
        enabled: true,
        code: `throw new Error('boom')`,
      },
    ]

    await expect(
      runPreRequestScripts({
        scripts,
        request: { method: 'GET', url: 'https://api.example.com', headers: {} },
        getVariable: () => undefined,
        setVariable: () => {
          // no-op
        },
        substituteVariables: (value) => value,
      })
    ).rejects.toThrow("Pre-request script 'broken' failed: boom")
  })

  it('supports neutral aliases (lp/litepost) in addition to pm', async () => {
    const env = new Map<string, string>()

    const scripts: TestScript[] = [
      {
        id: '1',
        name: 'alias-test',
        enabled: true,
        code: `
lp.environment.set('token', 'xyz');
litepost.request.setHeader('Authorization', 'Bearer {{token}}');
`,
      },
    ]

    const result = await runPreRequestScripts({
      scripts,
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: {},
      },
      getVariable: (key) => env.get(key),
      setVariable: (key, value) => {
        env.set(key, value)
      },
      substituteVariables: (text) =>
        text.replace(/\{\{([^}]+)\}\}/g, (match, key) => env.get(key.trim()) ?? match),
    })

    expect(result.headers.Authorization).toBe('Bearer xyz')
  })
})
