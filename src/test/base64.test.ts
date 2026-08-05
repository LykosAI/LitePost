import { describe, it, expect } from 'vitest'
import { utf8ToBase64, base64ToUtf8, basicAuthValue } from '@/utils/base64'
import { applyAuthToHeaders } from '@/utils/authHeaders'
import { parseCurlCommand } from '@/utils/curlParser'

const identity = (text: string) => text

describe('utf8ToBase64', () => {
  it('matches btoa for plain ASCII', () => {
    expect(utf8ToBase64('user:hunter2')).toBe(btoa('user:hunter2'))
  })

  // btoa is Latin-1, and it fails in two different ways depending on where the
  // character sits. Above U+00FF it throws outright:
  it('encodes characters that would make btoa throw', () => {
    expect(() => btoa('user:密码')).toThrow()
    expect(() => utf8ToBase64('user:密码')).not.toThrow()
  })

  // ...but between U+0080 and U+00FF — precisely the common European accented
  // case — it does not complain at all. It emits the single Latin-1 byte, the
  // server decodes it as UTF-8, and the credential silently arrives wrong. That
  // is the worse of the two failures, because nothing anywhere reports it.
  it('differs from btoa on accented characters that btoa accepts silently', () => {
    expect(() => btoa('user:pässwörd')).not.toThrow()
    expect(utf8ToBase64('user:pässwörd')).not.toBe(btoa('user:pässwörd'))
    expect(base64ToUtf8(utf8ToBase64('user:pässwörd'))).toBe('user:pässwörd')
  })

  it('round-trips accented text', () => {
    expect(base64ToUtf8(utf8ToBase64('José:Niño'))).toBe('José:Niño')
  })

  it('round-trips CJK and emoji', () => {
    expect(base64ToUtf8(utf8ToBase64('user:密码🔑'))).toBe('user:密码🔑')
  })

  it('handles the empty string', () => {
    expect(utf8ToBase64('')).toBe('')
    expect(base64ToUtf8('')).toBe('')
  })

  it('does not hit the argument limit on long input', () => {
    // String.fromCharCode(...bytes) would blow the stack around here.
    const long = 'ü'.repeat(200_000)
    expect(base64ToUtf8(utf8ToBase64(long))).toBe(long)
  })

  it('produces the byte sequence a server would expect', () => {
    // 'é' is U+00E9 → UTF-8 0xC3 0xA9, not the single Latin-1 byte 0xE9.
    expect(utf8ToBase64('é')).toBe('w6k=')
  })
})

describe('basicAuthValue', () => {
  it('builds a complete header value', () => {
    expect(basicAuthValue('user', 'pass')).toBe(`Basic ${btoa('user:pass')}`)
  })

  it('keeps colons in the password intact', () => {
    // Only the first colon separates the two; the rest belong to the password.
    expect(base64ToUtf8(basicAuthValue('user', 'a:b:c').slice(6))).toBe('user:a:b:c')
  })
})

describe('basic auth end to end', () => {
  it('sends a non-ASCII password instead of throwing', () => {
    const headers: Record<string, string> = {}
    expect(() =>
      applyAuthToHeaders(
        { type: 'basic', username: 'jt', password: 'pässwörd' },
        headers, 'https://api.example.com', identity
      )
    ).not.toThrow()

    expect(base64ToUtf8(headers['Authorization'].slice(6))).toBe('jt:pässwörd')
  })

  it('reads a non-ASCII credential back out of a curl command', () => {
    // The mirror of the same fault: atob alone returns bytes-as-characters,
    // so an imported credential came back as mojibake.
    const encoded = utf8ToBase64('jt:pässwörd')
    const parsed = parseCurlCommand(
      `curl https://api.example.com -H "Authorization: Basic ${encoded}"`
    )

    expect(parsed.auth).toEqual({ type: 'basic', username: 'jt', password: 'pässwörd' })
  })

  it('round-trips a credential through curl import and back out', () => {
    const parsed = parseCurlCommand(
      `curl https://api.example.com -u "josé:契約"`
    )
    const headers: Record<string, string> = {}
    applyAuthToHeaders(parsed.auth, headers, 'https://api.example.com', identity)

    expect(base64ToUtf8(headers['Authorization'].slice(6))).toBe('josé:契約')
  })
})
