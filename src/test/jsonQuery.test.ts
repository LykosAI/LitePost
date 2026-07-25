import { describe, it, expect } from 'vitest'
import { runJsonQuery } from '@/utils/jsonQuery'

const data = {
  id: 2726029,
  name: 'Iris Lux',
  stats: { downloadCount: 48213, rating: 4.9 },
  modelVersions: [
    { id: 1, name: 'v2.4', files: ['a.safetensors'] },
    { id: 2, name: 'v2.3', files: ['b.safetensors'] },
  ],
}

describe('runJsonQuery', () => {
  it('returns the input unchanged for an empty query', () => {
    expect(runJsonQuery(data, '')).toEqual({ data, error: null, matched: true })
    expect(runJsonQuery(data, '   ')).toEqual({ data, error: null, matched: true })
  })

  it('evaluates simple dollar paths', () => {
    expect(runJsonQuery(data, '$.name').data).toBe('Iris Lux')
    expect(runJsonQuery(data, '$.stats.rating').data).toBe(4.9)
  })

  it('evaluates array index paths', () => {
    expect(runJsonQuery(data, '$.modelVersions[1].name').data).toBe('v2.3')
    expect(runJsonQuery(data, '$.modelVersions[0].files[0]').data).toBe('a.safetensors')
  })

  it('evaluates wildcard paths across arrays', () => {
    expect(runJsonQuery(data, '$.modelVersions[*].name').data).toEqual(['v2.4', 'v2.3'])
  })

  it('supports quoted bracket keys', () => {
    const spaced = { 'content type': 'application/json' }
    expect(runJsonQuery(spaced, '$["content type"]').data).toBe('application/json')
  })

  it('falls back to the longest matching prefix while typing', () => {
    const result = runJsonQuery(data, '$.stats.downloadCount.nope.deeper')
    expect(result.matched).toBe(false)
    expect(result.partial).toBe(true)
    expect(result.data).toBe(48213)
    expect(result.matchedPath).toBe('$.stats.downloadCount')
  })

  it('prefix-matches the trailing key segment against object keys', () => {
    const result = runJsonQuery(data, '$.stats.down')
    expect(result.partial).toBe(true)
    expect(result.data).toEqual({ downloadCount: 48213 })
    expect(result.matchedPath).toBe('$.stats.down…')
  })

  it('prefix-matches keys case-insensitively', () => {
    const headers = { headers: { Accept: 'a', 'Accept-Encoding': 'b', Host: 'c' } }
    const result = runJsonQuery(headers, '$.headers.acc')
    expect(result.data).toEqual({ Accept: 'a', 'Accept-Encoding': 'b' })
  })

  it('falls back to the whole document (flagged partial) when the first segment misses', () => {
    const result = runJsonQuery(data, '$.zzz.nothing')
    expect(result.matched).toBe(false)
    expect(result.partial).toBe(true)
    expect(result.data).toEqual(data)
    expect(result.matchedPath).toBe('$')
  })

  it('deep-filters by value substring', () => {
    const result = runJsonQuery(data, 'iris')
    expect(result.matched).toBe(true)
    expect(result.data).toEqual({ name: 'Iris Lux' })
  })

  it('deep-filters by key match, keeping the whole subtree', () => {
    const result = runJsonQuery(data, 'stats')
    expect(result.data).toEqual({ stats: { downloadCount: 48213, rating: 4.9 } })
  })

  it('filters arrays down to matching items', () => {
    const result = runJsonQuery(data, 'v2.3')
    expect(result.data).toEqual({ modelVersions: [{ name: 'v2.3' }] })
  })

  it('reports no match for text queries that hit nothing', () => {
    expect(runJsonQuery(data, 'zzz-nope').matched).toBe(false)
  })
})
