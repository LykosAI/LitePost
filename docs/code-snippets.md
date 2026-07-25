# Code Snippets

LitePost can generate ready-to-use code from any request in six languages. This is useful for sharing requests with teammates, embedding API calls in applications, or quickly prototyping integrations outside of LitePost.

## Accessing Code Snippets

Open the **Code** section in the request panel (under the `⋯` menu). The generated code reflects the current state of the request -- method, URL, headers, body, auth, and cookies. As you modify the request, the snippet updates automatically.

## Supported Languages

Select a language from the dropdown at the top of the snippet viewer.

### cURL

A shell command using `curl`. Includes method, headers, body, cookies, and auth headers.

```bash
# WARNING: curl commands may expose secrets in process listings

curl
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tok_abc123" \
  -d '{"name": "Jane Doe"}' \
  "https://api.example.com/users"
```

### Python

Uses the `httpx` library with a reusable client, timeout, redirect following, and HTTP/2 support.

```python
# Install: pip install httpx
import httpx

url = "https://api.example.com/users"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer tok_abc123",
}

with httpx.Client(
    timeout=30.0,
    follow_redirects=True,
    http2=True,
) as client:
    response = client.post(
        url,
        headers=headers,
    )

    print(f"Status Code: {response.status_code}")
```

### JavaScript

Provides two variants in a single snippet -- one using the Fetch API and one using Axios.

```javascript
// Using fetch
const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({"name": "Jane Doe"}),
};

fetch(
  "https://api.example.com/users",
  options
)
  .then(response => response.text())
  .then(data => {
    console.log("Response:", JSON.parse(data))
  })
  .catch(error => console.error(error));
```

### C#

Uses `HttpClient` with `IHttpClientFactory` through dependency injection, following Microsoft's recommended patterns for production use.

```csharp
using System.Net.Http;
using System.Text;
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddHttpClient();
var provider = services.BuildServiceProvider();

var clientFactory = provider.GetRequiredService<IHttpClientFactory>();
var client = clientFactory.CreateClient();

var response = await client
    .PostAsync(url, content);
```

### Go

Uses `net/http` with context-based timeouts, a configured transport, and proper resource cleanup.

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(
        ctx,
        "POST",
        url,
        body,
    )
    // ...
}
```

### Ruby

Uses the `faraday` gem with retry middleware, logging, and error handling.

```ruby
# Install with: gem install faraday
require "faraday"

conn = Faraday.new(
    url: "https://api.example.com/users",
    request: { timeout: 30 }
) do |f|
    f.request :retry, max: 2, interval: 0.05
    f.response :logger
    f.adapter Faraday.default_adapter
end

response = conn
  .post do |req|
    req.body = request_body
  end
```

## What Is Included

The generated code includes all active parts of the request:

- **Method** -- the HTTP verb
- **URL** -- with API-key query parameters appended when auth is set to query mode
- **Headers** -- all enabled custom headers plus auth headers (Basic, Bearer, API Key)
- **Body** -- the request body in the appropriate format for the language
- **Cookies** -- attached as headers or language-specific cookie objects
- **Content-Type** -- set automatically based on the body type

Disabled headers and parameters are excluded from the generated code.

## Copy to Clipboard

Click the **copy button** next to the language selector to copy the full snippet to your clipboard. The snippet is ready to paste into a terminal, script, or source file.
