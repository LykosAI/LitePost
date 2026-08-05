import { Collection, URLParam, Header, AuthConfig, AuthType, Cookie } from '@/types'

interface PostmanCollection {
  info: {
    _postman_id: string
    name: string
    description?: string
    schema: string
  }
  item: PostmanItem[]
}

interface PostmanItem {
  name: string
  request: {
    method: string
    header: { key: string; value: string }[]
    url: {
      raw: string
      protocol?: string
      host?: string[]
      path?: string[]
      query?: { key: string; value: string }[]
    }
    body?: {
      mode: string
      raw?: string
      formdata?: { key: string; value: string; type: string }[]
    }
    auth?: {
      type: AuthType
      basic?: { username: string; password: string }[]
      bearer?: { token: string }[]
      apikey?: { key: string; value: string; in: 'header' | 'query' }[]
    }
  }
}

export function exportToPostman(collections: Collection[]): PostmanCollection[] {
  return collections.map((collection) => ({
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: collection.requests.map((request) => ({
      name: request.name,
      request: {
        method: request.method,
        header: request.headers
          .filter(header => header.enabled)
          .map(header => ({
            key: header.key,
            value: typeof header.value === 'string' ? header.value : JSON.stringify(header.value)
          })),
        url: {
          raw: request.rawUrl,
          ...parseUrl(request.url)
        },
        body: request.body ? {
          mode: 'raw',
          raw: request.body
        } : undefined,
        auth: request.auth?.type !== 'none' ? {
          type: request.auth.type,
          ...(request.auth.type === 'basic' ? {
            basic: [{ username: request.auth.username || '', password: request.auth.password || '' }]
          } : request.auth.type === 'bearer' ? {
            bearer: [{ token: request.auth.token || '' }]
          } : request.auth.type === 'api-key' ? {
            apikey: [{ key: request.auth.key || '', value: request.auth.value || '', in: request.auth.addTo || 'header' }]
          } : request.auth.type === 'oauth2' ? {
            oauth2: [{ addTokenTo: 'header' }]
          } : {})
        } : undefined
      }
    }))
  }))
}

export function importFromPostman(postmanCollections: PostmanCollection[]): Collection[] {
  return postmanCollections.map((collection) => ({
    id: collection.info._postman_id || crypto.randomUUID(),
    name: collection.info.name,
    description: collection.info.description,
    requests: collection.item.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      method: item.request.method,
      url: buildUrl(item.request.url),
      rawUrl: item.request.url.raw,
      params: item.request.url.query?.map((param) => ({
        key: param.key,
        value: param.value,
        enabled: true
      } as URLParam)) || [],
      headers: item.request.header.map((header) => ({
        key: header.key,
        value: header.value,
        enabled: true
      } as Header)),
      body: item.request.body?.raw || '',
      contentType: item.request.header.find(h => h.key.toLowerCase() === 'content-type')?.value || 'application/json',
      auth: convertPostmanAuth(item.request.auth),
      cookies: [] as Cookie[],
      testScripts: [],
      testAssertions: [],
      testResults: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}

function convertPostmanAuth(auth?: PostmanItem['request']['auth']): AuthConfig {
  if (!auth) {
    return { type: 'none' }
  }

  switch (auth.type) {
    case 'basic':
      return {
        type: 'basic',
        username: auth.basic?.[0]?.username,
        password: auth.basic?.[0]?.password
      }
    case 'bearer':
      return {
        type: 'bearer',
        token: auth.bearer?.[0]?.token
      }
    case 'api-key':
      return {
        type: 'api-key',
        key: auth.apikey?.[0]?.key,
        value: auth.apikey?.[0]?.value,
        addTo: auth.apikey?.[0]?.in
      }
    case 'oauth2':
      return {
        type: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          clientId: '',
        }
      }
    default:
      return { type: 'none' }
  }
}

function parseUrl(url: string) {
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.host.split('.'),
      path: parsed.pathname.split('/').filter(Boolean),
      query: Array.from(parsed.searchParams.entries()).map(([key, value]) => ({
        key,
        value
      }))
    }
  } catch {
    return {}
  }
}

function buildUrl(urlObj: PostmanItem['request']['url']): string {
  if (!urlObj.protocol || !urlObj.host) {
    return urlObj.raw
  }

  const url = new URL(`${urlObj.protocol}://${urlObj.host.join('.')}`)
  
  if (urlObj.path) {
    url.pathname = '/' + urlObj.path.join('/')
  }
  
  if (urlObj.query) {
    urlObj.query.forEach(({ key, value }) => {
      url.searchParams.append(key, value)
    })
  }

  return url.toString()
}

export function importFromOpenapi(openapiDoc: any, baseUrl: string): Collection[] {
  const collections: Collection[] = [];
  const title = openapiDoc.info?.title || "Imported OpenAPI Collection";
  const description = openapiDoc.info?.description || "";
  const newCollection: Collection = {
    id: crypto.randomUUID(),
    name: title,
    description,
    requests: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const serverUrl = baseUrl;

  const paths = openapiDoc.paths || {};
  for (const path in paths) {
    const pathItem = paths[path];
    for (const method in pathItem) {
      if (["get", "post", "put", "patch", "delete", "options", "head"].includes(method.toLowerCase())) {
        const operation = pathItem[method];
        const name = operation.summary || `${method.toUpperCase()} ${path}`;
        let fullUrl = path;
        try {
          if (serverUrl) {
            // Ensure serverUrl ends with / to preserve base path
            const base = serverUrl.endsWith('/') ? serverUrl : serverUrl + '/';
            // Remove leading slash from path to prevent base path erasure
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            fullUrl = new URL(cleanPath, base).toString();
          }
        } catch {
          // Fallback: simple concatenation
          fullUrl = serverUrl ? serverUrl.replace(/\/$/, '') + path : path;
        }
        const params = (operation.parameters || [])
          .filter((param: any) => param.in !== "path")
          .map((param: any) => ({
            key: param.name,
            value: param.schema && param.schema.default ? String(param.schema.default) : "",
            enabled: true
          }));
        let contentType = "application/json";
        const body = "";
        if (operation.requestBody && operation.requestBody.content) {
          const contentTypes = Object.keys(operation.requestBody.content);
          if (contentTypes.length > 0) {
            contentType = contentTypes[0];
          }
        }
        const newRequest = {
          id: crypto.randomUUID(),
          name,
          method: method.toUpperCase(),
          url: fullUrl,
          rawUrl: fullUrl,
          params,
          headers: [],
          body,
          contentType,
          auth: { type: 'none' } as AuthConfig,
          cookies: [],
          testScripts: [],
          testAssertions: [],
          testResults: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        newCollection.requests.push(newRequest);
      }
    }
  }

  collections.push(newCollection);
  return collections;
} 
