import { AuthConfig, Header, Cookie } from "@/types"

interface RequestData {
  method: string
  url: string
  headers: Header[]
  body?: string
  contentType?: string
  auth: AuthConfig
  cookies: Cookie[]
}

function getAuthHeaders(auth: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {}
  
  switch (auth.type) {
    case 'basic':
      if (auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`)
        headers['Authorization'] = `Basic ${credentials}`
      }
      break
    case 'bearer':
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`
      }
      break
    case 'api-key':
      if (auth.key && auth.value && auth.addTo === 'header') {
        headers[auth.key] = auth.value
      }
      break
  }

  return headers
}

function getEnabledHeaders(headers: Header[]): Record<string, string> {
  return headers
    .filter(h => h.enabled && h.key)
    .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})
}

function escapeString(str: string, quote: string = '"'): string {
  return str.replace(/\\/g, '\\\\')
    .replace(new RegExp(quote, 'g'), `\\${quote}`)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function addApiKeyToUrl(url: string, auth: AuthConfig): string {
  if (auth.type === 'api-key' && auth.addTo === 'query' && auth.key) {
    const separator = url.includes('?') ? '&' : '?'
    const value = auth.value || ''
    return `${url}${separator}${encodeURIComponent(auth.key)}=${encodeURIComponent(value)}`
  }
  return url
}

export function generateCurlSnippet(request: RequestData): string {
  const parts = ['curl']
  
  // Method
  if (request.method !== 'GET') {
    parts.push(`  -X ${request.method} \\`)
  }

  // Headers
  const headers = {
    ...getEnabledHeaders(request.headers),
    ...getAuthHeaders(request.auth)
  }

  if (request.contentType) {
    headers['Content-Type'] = request.contentType
  }

  Object.entries(headers).forEach(([key, value]) => {
    parts.push(`  -H "${escapeString(key)}: ${escapeString(value)}" \\`)
  })

  // Cookies
  if (request.cookies.length > 0) {
    const cookieString = request.cookies
      .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ')
    parts.push(`  -b "${escapeString(cookieString)}" \\`)
  }

  // Body
  if (request.body) {
    parts.push(`  -d '${escapeString(request.body, "'")}' \\`)
  }

  // URL (with API key in query if specified)
  const url = addApiKeyToUrl(request.url, request.auth)
  parts.push(`  "${escapeString(url)}"`)

  parts.unshift('# WARNING: curl commands may expose secrets in process listings\n')

  return parts.join('\n')
}

export function generatePythonSnippet(request: RequestData): string {
  const lines = ['import httpx']
  
  // URL
  const url = addApiKeyToUrl(request.url, request.auth)
  lines.push(`\nurl = "${escapeString(url)}"`)

  // Headers
  const headers = {
    ...getEnabledHeaders(request.headers),
    ...getAuthHeaders(request.auth)
  }

  if (request.contentType) {
    headers['Content-Type'] = request.contentType
  }

  if (Object.keys(headers).length > 0) {
    lines.push('\nheaders = {')
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`    "${escapeString(key)}": "${escapeString(value)}",`)
    })
    lines.push('}')
  }

  // Cookies
  if (request.cookies.length > 0) {
    lines.push('\ncookies = {')
    request.cookies.forEach(cookie => {
      lines.push(`    "${escapeString(cookie.name)}": "${escapeString(cookie.value)}",`)
    })
    lines.push('}')
  }

  // Client setup with sensible defaults
  lines.push('\n# Reuse this client for multiple requests')
  lines.push('with httpx.Client(')
  lines.push('    timeout=30.0,')
  lines.push('    follow_redirects=True,')
  lines.push('    http2=True,')
  lines.push(') as client:')
  lines.push('    response = client.' + `${request.method.toLowerCase()}(`)
  lines.push('        url,')

  if (request.body) {
    if (request.contentType?.includes('json')) {
      lines.push('        json={')  // Assume JSON serializable data
      lines.push('            # Add your JSON data here')
      lines.push('        },')
    } else {
      lines.push('        content="""')
      lines.push(request.body)
      lines.push('        """,')
    }
  }

  if (Object.keys(headers).length > 0) {
    lines.push('        headers=headers,')
  }

  if (request.cookies.length > 0) {
    lines.push('        cookies=cookies,')
  }

  lines.push('    )')

  // Response handling
  lines.push('\n    print(f"Status Code: {response.status_code}")')
  lines.push('    print(f"Response Headers: {response.headers}")\n')
  
  if (request.contentType?.includes('json')) {
    lines.push('    try:')
    lines.push('        print(response.json())')
    lines.push('    except ValueError:')
    lines.push('        print("Failed to parse JSON response")')
  } else {
    lines.push('    print(response.text)')
  }

  lines.unshift('# Generated code - verify before use in production')
  lines.unshift('# Install: pip install httpx')
  lines.unshift('# Recommended for production: Add error handling and logging')

  return lines.join('\n')
}

export function generateJavaScriptSnippet(request: RequestData): string {
  const lines = []
  
  // URL
  const url = addApiKeyToUrl(request.url, request.auth)

  // Headers
  const headers = {
    ...getEnabledHeaders(request.headers),
    ...getAuthHeaders(request.auth)
  }

  if (request.contentType) {
    headers['Content-Type'] = request.contentType
  }

  // Using fetch
  lines.push('// Using fetch')
  lines.push('const options = {')
  lines.push(`  method: "${request.method}",`)
  
  if (Object.keys(headers).length > 0) {
    lines.push('  headers: {')
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`    "${escapeString(key)}": "${escapeString(value)}",`)
    })
    lines.push('  },')
  }

  if (request.body) {
    if (request.contentType?.includes('json')) {
      lines.push(`  body: JSON.stringify(${request.body}),`)
    } else {
      lines.push(`  body: \`${escapeString(request.body, '`')}\`,`)
    }
  }

  if (request.cookies.length > 0) {
    const cookieString = request.cookies
      .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ')
    if (!headers.Cookie) {
      lines.push(`  credentials: 'include',`)
      if (!lines.find(l => l.includes('headers:'))) {
        lines.push('  headers: {')
      }
      lines.push(`    "Cookie": "${escapeString(cookieString)}",`)
      lines.push('  },')
    }
  }

  lines.push('};')
  lines.push('')
  lines.push('fetch(')
  lines.push(`  "${escapeString(url)}",`)
  lines.push('  options')
  lines.push(')')
  lines.push('  .then(response => response.text())')
  lines.push('  .then(data => {')
  if (request.contentType?.includes('json')) {
    lines.push('    console.log("Response:", JSON.parse(data))')
  } else {
    lines.push('    console.log("Response:", data)')
  }
  lines.push('  })')
  lines.push('  .catch(error => console.error(error));')

  // Using axios
  lines.push('\n// Using axios')
  lines.push('import axios from "axios";')
  lines.push('')
  lines.push('axios({')
  lines.push(`  method: "${request.method.toLowerCase()}",`)
  lines.push(`  url: "${escapeString(url)}",`)
  
  if (Object.keys(headers).length > 0) {
    lines.push('  headers: {')
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`    "${escapeString(key)}": "${escapeString(value)}",`)
    })
    lines.push('  },')
  }

  if (request.body) {
    if (request.contentType?.includes('json')) {
      lines.push(`  data: ${request.body},`)
    } else {
      lines.push(`  data: \`${escapeString(request.body, '`')}\`,`)
    }
  }

  lines.push('})')
  lines.push('  .then(response => console.log(response.data))')
  lines.push('  .catch(error => console.error(error));')

  lines.unshift('// Generated code - verify before use in production')
  lines.unshift('// Requires Node.js 14+ or browser environment')
  lines.unshift('// For axios: npm install axios')

  return lines.join('\n')
}

export function generateCSharpSnippet(request: RequestData): string {
  const lines = ['using System;']
  lines.push('using System.Net.Http;')
  lines.push('using System.Text;')
  lines.push('using Microsoft.Extensions.DependencyInjection;')
  
  if (request.contentType?.includes('json')) {
    lines.push('using System.Text.Json;')
  }
  
  lines.push('\n// Setup dependency injection')
  lines.push('var services = new ServiceCollection();')
  lines.push('services.AddHttpClient();')
  lines.push('var provider = services.BuildServiceProvider();')
  lines.push('\n// Get HttpClient from factory')
  lines.push('var clientFactory = provider.GetRequiredService<IHttpClientFactory>();')
  lines.push('var client = clientFactory.CreateClient();')
  
  // Headers
  const headers = {
    ...getEnabledHeaders(request.headers),
    ...getAuthHeaders(request.auth)
  }

  if (request.contentType) {
    headers['Content-Type'] = request.contentType
  }

  if (Object.keys(headers).length > 0) {
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`client.DefaultRequestHeaders.Add("${escapeString(key)}", "${escapeString(value)}");`)
    })
  }

  // Cookies
  if (request.cookies.length > 0) {
    const cookieContainer = request.cookies
      .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ')
    lines.push(`client.DefaultRequestHeaders.Add("Cookie", "${escapeString(cookieContainer)}");`)
  }

  // URL
  const url = addApiKeyToUrl(request.url, request.auth)
  lines.push(`\nvar url = "${escapeString(url)}";`)

  // Body
  if (request.body) {
    if (request.contentType?.includes('json')) {
      lines.push('var jsonContent = JsonSerializer.Serialize(')
      lines.push(request.body)
      lines.push(');')
      lines.push('var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");')
    } else {
      lines.push(`var content = new StringContent(@"${escapeString(request.body)}", Encoding.UTF8, "${request.contentType || 'text/plain'}");`)
    }
  }

  // Request
  lines.push('\nvar response = await client')
  switch (request.method.toUpperCase()) {
    case 'GET':
      lines.push('    .GetAsync(url);')
      break
    case 'POST':
      lines.push('    .PostAsync(url, content);')
      break
    case 'PUT':
      lines.push('    .PutAsync(url, content);')
      break
    case 'DELETE':
      lines.push('    .DeleteAsync(url);')
      break
    case 'PATCH':
      lines.push('    .PatchAsync(url, content);')
      break
    default:
      lines.push(`    .SendAsync(new HttpRequestMessage(new HttpMethod("${request.method}"), url));`)
  }

  lines.push('\nvar responseContent = await response.Content.ReadAsStringAsync();')
  lines.push('Console.WriteLine($"Status: {response.StatusCode}");')
  lines.push('Console.WriteLine(responseContent);')

  // Cleanup
  lines.push('\n// Dispose services')
  lines.push('provider.Dispose();')

  // Note: HttpClient should be reused in production applications
  // See: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests')

  lines.push('\ntry {')
  lines.push('} catch (HttpRequestException ex) {')
  lines.push('    Console.WriteLine($"HTTP Error: {ex.Message}");')
  lines.push('} catch (TaskCanceledException ex) {')
  lines.push('    Console.WriteLine("Request timed out");')
  lines.push('} catch (Exception ex) {')
  lines.push('    Console.WriteLine($"General error: {ex.Message}");')
  lines.push('}')

  lines.unshift('// Generated code - verify before use in production')

  return lines.join('\n')
}

export function generateGoSnippet(request: RequestData): string {
  const lines = ['package main', '']
  lines.push('import (')
  lines.push('    "context"')
  lines.push('    "fmt"')
  lines.push('    "io"')
  lines.push('    "net/http"')
  lines.push('    "time"')
  if (request.body) {
    lines.push('    "strings"')
  }
  lines.push(')')

  lines.push('\nfunc main() {')
  lines.push('    // Create context with timeout')
  lines.push('    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)')
  lines.push('    defer cancel()')
  
  // Body
  if (request.body) {
    lines.push(`    bodyStr := \`${escapeString(request.body, '`')}\``)
    lines.push('    body := strings.NewReader(bodyStr)')
  }

  // URL
  const url = addApiKeyToUrl(request.url, request.auth)
  lines.push(`    url := "${escapeString(url)}"`)

  // Request
  if (request.body) {
    lines.push('    req, err := http.NewRequestWithContext(')
    lines.push('        ctx,')
    lines.push(`        "${request.method}",`)
    lines.push('        url,')
    lines.push('        body,')
    lines.push('    )')
  } else {
    lines.push('    req, err := http.NewRequestWithContext(')
    lines.push('        ctx,')
    lines.push(`        "${request.method}",`)
    lines.push('        url,')
    lines.push('        nil,')
    lines.push('    )')
  }

  lines.push('    if err != nil {')
  lines.push('        fmt.Printf("Error creating request: %v\\n", err)')
  lines.push('        return')
  lines.push('    }')

  // Headers
  const headers = {
    ...getEnabledHeaders(request.headers),
    ...getAuthHeaders(request.auth)
  }

  if (request.contentType) {
    headers['Content-Type'] = request.contentType
  }

  if (Object.keys(headers).length > 0) {
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`    req.Header.Add("${escapeString(key)}", "${escapeString(value)}")`)
    })
  }

  // Cookies
  if (request.cookies.length > 0) {
    request.cookies.forEach(cookie => {
      lines.push(`    req.AddCookie(&http.Cookie{`)
      lines.push(`        Name: "${escapeString(cookie.name)}",`)
      lines.push(`        Value: "${escapeString(cookie.value)}",`)
      lines.push(`    })`)
    })
  }

  // Client with timeouts
  lines.push('\n    client := &http.Client{')
  lines.push('        Timeout: 30 * time.Second,')
  lines.push('        Transport: &http.Transport{')
  lines.push('            MaxIdleConns:        100,')
  lines.push('            IdleConnTimeout:     90 * time.Second,')
  lines.push('            DisableCompression:  true,')
  lines.push('        },')
  lines.push('    }')

  lines.push('\n    resp, err := client.Do(req)')
  lines.push('    if err != nil {')
  lines.push('        fmt.Printf("Error sending request: %v\\n", err)')
  lines.push('        return')
  lines.push('    }')
  lines.push('    defer resp.Body.Close()')

  lines.push('\n    body, err := io.ReadAll(resp.Body)')
  lines.push('    if err != nil {')
  lines.push('        fmt.Printf("Error reading response: %v\\n", err)')
  lines.push('        return')
  lines.push('    }')

  lines.push('\n    fmt.Printf("Status: %s\\n", resp.Status)')
  lines.push('    fmt.Printf("Response: %s\\n", string(body))')
  lines.push('}')

  lines.push('// Client should be reused for multiple requests')
  lines.push('// See https://pkg.go.dev/net/http#Client')

  lines.unshift('// Generated code - verify before use in production')
  lines.unshift('// Requires Go 1.13+')

  return lines.join('\n')
}

export function generateRubySnippet(request: RequestData): string {
  const lines = ['require "faraday"']
  if (request.contentType?.includes('json')) {
    lines.push('require "json"')
  }

  // URL
  const url = addApiKeyToUrl(request.url, request.auth)
  lines.push('\n# Create connection with middleware')
  lines.push('conn = Faraday.new(')
  lines.push(`    url: "${escapeString(url)}",`)
  lines.push('    request: { timeout: 30 }')
  lines.push(') do |f|')
  lines.push('    f.request :retry, max: 2, interval: 0.05')
  lines.push('    f.response :logger')
  lines.push('    f.adapter Faraday.default_adapter')
  lines.push('end')

  // Headers
  const headers = {
    ...getEnabledHeaders(request.headers),
    ...getAuthHeaders(request.auth)
  }

  if (request.contentType) {
    headers['Content-Type'] = request.contentType
  }

  if (Object.keys(headers).length > 0) {
    lines.push('\n# Add headers')
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`conn.headers["${escapeString(key)}"] = "${escapeString(value)}"`)
    })
  }

  // Cookies
  if (request.cookies.length > 0) {
    lines.push('\n# Add cookies')
    const cookieString = request.cookies
      .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ')
    lines.push(`conn.headers["Cookie"] = "${escapeString(cookieString)}"`)
  }

  // Request
  lines.push('\nbegin')
  lines.push('  response = conn')
  
  const reqParts = [`  .${request.method.toLowerCase()}`]
  
  if (request.body) {
    if (request.contentType?.includes('json')) {
      lines.push('  request_body = JSON.generate(')
      lines.push(request.body)
      lines.push('  )')
      reqParts.push(' do |req|')
      reqParts.push('    req.body = request_body')
      reqParts.push('  end')
    } else {
      reqParts.push(' do |req|')
      reqParts.push(`    req.body = <<~BODY\n${request.body}\nBODY`)
      reqParts.push('  end')
    }
  }

  lines.push(reqParts.join(''))

  // Response handling
  lines.push('\n  puts "Status: #{response.status}"')
  lines.push('  puts response.body')
  lines.push('rescue Faraday::Error => e')
  lines.push('  puts "Error: #{e.message}"')
  lines.push('end')

  lines.unshift('# Generated code - verify before use in production')
  lines.unshift('# Requires faraday gem')
  lines.unshift('# Install with: gem install faraday')

  return lines.join('\n')
}

export const CODE_SNIPPETS = [
  { label: 'cURL', value: 'curl', generator: generateCurlSnippet },
  { label: 'Python', value: 'python', generator: generatePythonSnippet },
  { label: 'JavaScript', value: 'javascript', generator: generateJavaScriptSnippet },
  { label: 'C#', value: 'csharp', generator: generateCSharpSnippet },
  { label: 'Go', value: 'go', generator: generateGoSnippet },
  { label: 'Ruby', value: 'ruby', generator: generateRubySnippet },
] 