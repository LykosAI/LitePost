# Responses

After a request is sent, LitePost displays the full response in the response panel. This includes the status code, body, headers, timing breakdown, size metrics, and redirect chain.

## Status Code

The HTTP status code and status text are displayed at the top of the response panel. The status is color-coded for quick identification:

| Range | Color  | Meaning       | Example              |
|-------|--------|---------------|----------------------|
| 2xx   | Green  | Success       | `200 OK`             |
| 3xx   | Yellow | Redirection   | `301 Moved Permanently` |
| 4xx   | Red    | Client Error  | `404 Not Found`      |
| 5xx   | Red    | Server Error  | `500 Internal Server Error` |

## Response Body

LitePost selects a viewer based on the `Content-Type` header of the response. You can also switch viewers manually.

### JSON

JSON responses are displayed in a collapsible tree view with syntax highlighting. Each object and array can be expanded or collapsed individually.

You can configure the default expand depth to control how many levels are expanded when the response first loads:

- **Depth 1** -- only top-level keys are visible.
- **Depth 2** -- top-level keys and their immediate children are visible.
- **All** -- the entire tree is expanded.

Example of a collapsed JSON response:

```json
{
  "user": { ... },
  "meta": { ... }
}
```

Expanding the `user` key reveals its contents:

```json
{
  "user": {
    "id": 42,
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "meta": { ... }
}
```

### XML

XML responses are formatted with proper indentation and displayed with syntax highlighting.

```xml
<response>
  <status>ok</status>
  <user>
    <id>42</id>
    <name>Jane Doe</name>
  </user>
</response>
```

### HTML Preview

HTML responses are rendered in an inline preview pane, so you can see the page as a browser would display it. The raw HTML source is also available by switching to the source view.

### Images

Image responses (`image/png`, `image/jpeg`, `image/gif`, and other standard image types) are displayed as an inline preview. The image dimensions and file size are shown alongside the preview.

### Plain Text

Text responses that do not match a structured format are displayed with syntax highlighting in a read-only editor.

### Binary

Binary responses that cannot be displayed as text or images are shown as a Base64-encoded string. You can copy the Base64 value for use elsewhere.

### Large Response Handling

Very large responses are handled with automatic fallbacks to keep the interface responsive:

- **JSON responses up to 2 MB** render in the collapsible tree view. To keep huge documents fast, each node shows at most 100 children at a time with a **"show more"** row that reveals the rest in chunks.
- **JSON responses over 2 MB** are displayed as raw plain text.
- **Non-JSON responses over 500 KB** are displayed as plain text without syntax highlighting.

## Filtering the Response Body

JSON responses get a filter bar above the body. Type either kind of query:

- **A path** (starts with `$` or `.`) extracts part of the document:

  | Query                  | Result                                     |
  |------------------------|--------------------------------------------|
  | `$.items[0].name`      | One value                                  |
  | `$.items[*].id`        | That field from every array element        |
  | `$["content type"]`    | Keys containing spaces or dots             |

  While you type, the filter falls back to the **longest valid prefix** instead of
  snapping back to the whole document -- and a trailing partial key matches by
  prefix, so `$.headers.Acc` shows `Accept`, `Accept-Encoding`, and friends. An
  amber badge shows which path actually matched.

- **Plain text** deep-filters the tree to branches whose keys or values contain
  the query (matching a key keeps its whole subtree).

The badge on the right reports `filtered`, a partial-match path, or `no matches`.
The filter resets when a new response arrives, and the **Copy** button always
copies the full, unfiltered body.

## Response Headers

The **Headers** tab in the response panel shows all headers returned by the server in a read-only formatted view. Each header is displayed as a key-value pair:

```
Content-Type:           application/json; charset=utf-8
X-Request-Id:           req-abc123
Cache-Control:          no-cache
X-RateLimit-Remaining:  98
```

Headers are listed in the order they were received from the server.

## Timing Breakdown

The **Timing** tab provides a detailed breakdown of where time was spent during the request lifecycle. Each phase is displayed as a labeled bar in a waterfall chart:

| Phase              | What It Measures                                                  |
|--------------------|-------------------------------------------------------------------|
| DNS Lookup         | Time to resolve the hostname to an IP address                     |
| TCP Connection     | Time to establish the TCP connection                              |
| TLS Handshake      | Time to negotiate the TLS/SSL session (HTTPS only)                |
| Request Processing | Time from sending the request to the server beginning its response |
| Time to First Byte | Total time until the first byte of the response is received       |
| Download           | Time to download the complete response body                       |
| **Total**          | End-to-end duration from send to complete                         |

The timing data is useful for diagnosing performance issues. For example:

- A slow **DNS Lookup** suggests DNS resolver problems or a missing local cache entry.
- A slow **TLS Handshake** may indicate certificate chain verification overhead.
- A slow **Request Processing** time points to server-side latency.
- A slow **Download** time relative to body size suggests bandwidth constraints.

## Size Metrics

Below the status code, LitePost displays the size of the response broken down into:

| Metric       | Description                                    |
|--------------|------------------------------------------------|
| Headers Size | Total size of all response headers             |
| Body Size    | Size of the response body                      |
| Total        | Combined size of headers and body              |

Sizes are displayed in human-readable units: **B** (bytes) for small responses, **KB** for responses in the kilobyte range, and **MB** for larger payloads.

## Redirect Chain

When a request results in one or more redirects (3xx responses), LitePost records the entire redirect chain and displays it in the **Redirects** section.

Each hop in the chain shows:

- **Status code and status text** -- e.g., `301 Moved Permanently`
- **URL** -- the target URL for that redirect
- **Response headers** -- the headers returned at that hop
- **Timing** -- how long that individual hop took

Example redirect chain:

```
1. GET http://example.com/old-page
   -> 301 Moved Permanently
   -> Location: https://example.com/old-page

2. GET https://example.com/old-page
   -> 308 Permanent Redirect
   -> Location: https://example.com/new-page

3. GET https://example.com/new-page
   -> 200 OK (final response)
```

The final response (the one with a non-3xx status code) is what appears in the main response panel. The redirect chain provides visibility into the intermediate hops so you can debug redirect loops, inspect HSTS upgrades, or verify that your API's redirect behavior is correct.

::: warning
If a redirect chain exceeds the maximum number of allowed redirects, LitePost stops following and reports the error. Check the redirect chain to identify loops or unexpectedly long chains.
:::
