/**
 * Base64 that survives non-ASCII text.
 *
 * `btoa` and `atob` operate on Latin-1: every character has to fit in one byte.
 * Hand `btoa` a string containing `é`, a CJK character or an emoji and it does
 * not mangle the output, it *throws* `InvalidCharacterError` — so a password
 * with an accent in it takes the whole request down rather than degrading.
 * `atob` has the mirror problem, returning bytes-as-characters that read as
 * mojibake once they are treated as text.
 *
 * Encoding to UTF-8 first, and decoding back out of it, is what RFC 7617 §2.1
 * expects of Basic credentials and what servers overwhelmingly assume.
 */

/** UTF-8 encode, then base64. Safe for any string. */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)

  // Built one character per byte rather than via String.fromCharCode(...bytes),
  // which blows the argument limit on large inputs.
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

/** base64 decode, then read the bytes back as UTF-8. */
export function base64ToUtf8(encoded: string): string {
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

/** `Basic <base64(user:pass)>`, the one place these credentials get assembled. */
export function basicAuthValue(username: string, password: string): string {
  return `Basic ${utf8ToBase64(`${username}:${password}`)}`
}
