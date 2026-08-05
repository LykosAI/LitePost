import { Collection, URLParam, Header, AuthConfig, AuthType, Cookie } from '@/types'
import { exampleBodyFor, pickContentType } from '@/utils/openapiExample'

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

/**
 * Sanity-check the document before walking it.
 *
 * Without this a non-spec (an HTML error page that happened to parse, a
 * Postman export, the wrong JSON file) produced an empty collection and a
 * success toast, which is a much worse outcome than an error.
 */
function assertOpenapiDocument(doc: unknown): asserts doc is Record<string, any> {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("That is not an OpenAPI document — expected a JSON object.");
  }

  const record = doc as Record<string, unknown>;
  if (typeof record.swagger === "string" && record.swagger.startsWith("2.")) {
    throw new Error(
      "That is a Swagger 2.0 document. LitePost imports OpenAPI 3.x — most tools can emit 3.x, " +
      "or you can convert the file first."
    );
  }
  if (!record.openapi && !record.paths) {
    throw new Error(
      "No `openapi` version or `paths` object found — this does not look like an OpenAPI document."
    );
  }
}

export interface OpenapiImportOptions {
  /**
   * Write request URLs as `{{name}}/path` instead of baking in the absolute
   * host, so one collection can be pointed at dev/test/stage/prod by switching
   * environments. Without it a collection is welded to whichever host its spec
   * was fetched from — which is a problem precisely where it matters most, on
   * the environments that do not expose a spec to import from.
   */
  baseUrlVariable?: string;
}

export function importFromOpenapi(
  openapiDoc: any,
  baseUrl: string,
  options: OpenapiImportOptions = {}
): Collection[] {
  assertOpenapiDocument(openapiDoc);

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
  const baseUrlVariable = options.baseUrlVariable?.trim();

  /**
   * `{{baseUrl}}/pet/findByStatus`. The variable reference is concatenated
   * rather than run through `new URL()`, which would reject `{{baseUrl}}` as an
   * invalid scheme. Trailing and leading slashes are normalised so the result
   * is right whether the user's variable ends in `/` or not.
   */
  const parameterizedUrl = (path: string) =>
    `{{${baseUrlVariable}}}/${path.replace(/^\/+/, '')}`;

  const paths = openapiDoc.paths || {};
  for (const path in paths) {
    const pathItem = paths[path];
    for (const method in pathItem) {
      if (["get", "post", "put", "patch", "delete", "options", "head"].includes(method.toLowerCase())) {
        const operation = pathItem[method];
        // Route first, summary second. The summary alone ("Update an existing
        // pet.") reads nicely but leaves you unable to tell which endpoint a
        // saved request actually hits without opening it — and the list
        // truncates, so whatever goes first is what survives. The method is
        // already shown as a separate badge, so it is not repeated here.
        const name = operation.summary
          ? `${path} — ${operation.summary}`
          : path;
        let fullUrl = path;
        try {
          if (baseUrlVariable) {
            fullUrl = parameterizedUrl(path);
          } else if (serverUrl) {
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
        let body = "";
        if (operation.requestBody && operation.requestBody.content) {
          const chosen = pickContentType(Object.keys(operation.requestBody.content));
          if (chosen) {
            contentType = chosen;
            // Only JSON bodies are generated. The example generator emits a JSON
            // value, and handing that to an endpoint expecting XML or form
            // encoding would be worse than leaving the body empty.
            if (/json/i.test(chosen)) {
              body = exampleBodyFor(operation.requestBody.content[chosen], openapiDoc);
            }
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
          // Every operation in a spec sits behind the same API and the same
          // OAuth app, so they inherit by default — otherwise importing means
          // configuring auth once per endpoint, dozens of times.
          authMode: 'inherit' as const,
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
