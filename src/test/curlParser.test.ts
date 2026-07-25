import { describe, it, expect } from 'vitest'
import { parseCurlCommand } from '@/utils/curlParser'

describe('curlParser', () => {
  it('parses --request/--url/--header with equals syntax', () => {
    const parsed = parseCurlCommand(
      `curl --request=POST --url=https://api.example.com/items?x=1 --header='Authorization: Bearer abc123' --header='Content-Type: application/json' --data-raw='{"name":"lite"}'`
    )

    expect(parsed.method).toBe('POST')
    expect(parsed.url).toBe('https://api.example.com/items?x=1')
    expect(parsed.auth.type).toBe('bearer')
    expect(parsed.auth.token).toBe('abc123')
    expect(parsed.contentType).toBe('application/json')
    expect(parsed.body).toBe('{"name":"lite"}')
    expect(parsed.headers).toEqual([])
  })

  it('combines repeated data flags and appends query params with --get', () => {
    const parsed = parseCurlCommand(
      "curl -G 'https://api.example.com/search' --data-urlencode 'q=lite post' --data 'page=2'"
    )

    expect(parsed.method).toBe('GET')
    expect(parsed.body).toBe('')
    expect(parsed.params).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'q', value: 'lite post' }),
        expect.objectContaining({ key: 'page', value: '2' }),
      ])
    )
  })

  it('parses multipart form flags into formData entries', () => {
    const parsed = parseCurlCommand(
      "curl -F 'name=jt' -F 'avatar=@C:\\tmp\\me.png' https://api.example.com/upload"
    )

    expect(parsed.method).toBe('POST')
    expect(parsed.url).toBe('https://api.example.com/upload')
    expect(parsed.contentType).toBe('multipart/form-data')
    expect(parsed.formDataEntries).toEqual(
        expect.arrayContaining([
        expect.objectContaining({ key: 'name', value: 'jt', type: 'text', enabled: true }),
        expect.objectContaining({
          key: 'avatar',
          type: 'file',
          fileName: 'me.png',
          filePath: expect.stringContaining('me.png'),
          enabled: true,
        }),
      ])
    )
    expect(parsed.body).toContain('name=jt')
    expect(parsed.body).toContain('[file: me.png]')
  })

  it('extracts cookies from both -b and Cookie header and removes Cookie header from request headers', () => {
    const parsed = parseCurlCommand(
      "curl 'https://api.example.com' -H 'Cookie: session=abc; theme=dark' -b 'region=us'"
    )

    expect(parsed.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'session', value: 'abc' }),
        expect.objectContaining({ name: 'theme', value: 'dark' }),
        expect.objectContaining({ name: 'region', value: 'us' }),
      ])
    )
    expect(parsed.headers.find((header) => header.key.toLowerCase() === 'cookie')).toBeUndefined()
  })

  it('parses short flags with attached values', () => {
    const parsed = parseCurlCommand(
      'curl -XPOST -HAccept:application/json https://api.example.com/health'
    )

    expect(parsed.method).toBe('POST')
    expect(parsed.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'Accept', value: 'application/json', enabled: true }),
      ])
    )
  })
})
