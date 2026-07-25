import { Tab } from '@/types'

export interface SampleRequest {
  id: string
  label: string
  description: string
  tab: Partial<Tab>
}

// Shown in the empty response state so a fresh install has something to click.
export const SAMPLE_REQUESTS: SampleRequest[] = [
  {
    id: 'json-get',
    label: 'GET some JSON',
    description: 'httpbin.org/json — a small JSON document',
    tab: {
      name: 'json',
      method: 'GET',
      url: 'https://httpbin.org/json',
      rawUrl: 'https://httpbin.org/json',
    },
  },
  {
    id: 'post-echo',
    label: 'POST an echo',
    description: 'httpbin.org/post — echoes your JSON body back',
    tab: {
      name: 'post',
      method: 'POST',
      url: 'https://httpbin.org/post',
      rawUrl: 'https://httpbin.org/post',
      body: '{\n  "hello": "litepost",\n  "sent_at": "just now"\n}',
      contentType: 'application/json',
    },
  },
  {
    id: 'sse-stream',
    label: 'Stream SSE',
    description: 'sse.dev/test — send with the Stream SSE option',
    tab: {
      name: 'test',
      method: 'GET',
      url: 'https://sse.dev/test',
      rawUrl: 'https://sse.dev/test',
    },
  },
  {
    id: 'graphql-countries',
    label: 'Query GraphQL',
    description: 'countries.trevorblades.com — list countries',
    tab: {
      name: 'countries',
      method: 'POST',
      url: 'https://countries.trevorblades.com/',
      rawUrl: 'https://countries.trevorblades.com/',
      contentType: 'application/json',
      isGraphQL: true,
      graphqlQuery: 'query {\n  countries {\n    code\n    name\n    emoji\n  }\n}',
    },
  },
]
