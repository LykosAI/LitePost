# cURL Import

LitePost can parse any cURL command and convert it into a fully populated request tab. This is useful when you copy a request from browser DevTools, a README, or a teammate's message and want to replay or modify it in LitePost.

## Opening the Import Dialog

Open the cURL import modal in one of two ways:

- Click the **cURL import button** in the title bar (terminal icon).
- Use the keyboard shortcut **Ctrl+I** (Windows/Linux) or **Cmd+I** (macOS).

## Importing a cURL Command

Paste or type a cURL command into the text area. LitePost parses the command as you type and shows a **live preview** below the input.

```
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tok_abc123" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}'
```

The preview displays:

- **Method** -- the resolved HTTP method (e.g. `POST`)
- **URL** -- the target URL
- **Headers count** -- how many headers were parsed
- **Auth type** -- detected auth (basic, bearer, or none)
- **Body type** -- the inferred content type
- **Cookies count** -- how many cookies were parsed
- **Params count** -- query parameters extracted from the URL

If the command is malformed or missing a URL, an error message appears instead of the preview. Fix the command and the preview updates automatically.

Click **Import Request** to create a new tab with all the parsed fields populated. Click **Cancel** to close the dialog without importing.

## Supported cURL Features

The parser handles the following flags and formats:

| Flag | Long form | Description |
|------|-----------|-------------|
| `-X` | `--request` | HTTP method (`GET`, `POST`, `PUT`, etc.) |
| `-H` | `--header` | Request header (`"Key: Value"`) |
| `-d` | `--data`, `--data-raw`, `--data-binary`, `--data-ascii`, `--data-urlencode` | Request body |
| `-u` | `--user` | Basic auth credentials (`user:password`) |
| `-A` | `--user-agent` | User-Agent header |
| `-b` | `--cookie` | Cookies (`"name=value; name2=value2"`) |
| `-F` | `--form`, `--form-string` | Multipart form data (`"field=value"` or `"file=@path"`) |
| `-e` | `--referer` | Referer header |
| `-G` | `--get` | Force GET method (appends `-d` data as query params) |
| `-I` | `--head` | Force HEAD method |
| | `--compressed` | Adds `Accept-Encoding: gzip, deflate, br` |
| | `--url` | Explicit URL (alternative to positional argument) |

Flags that do not affect the HTTP request itself (`-L`, `-k`, `-s`, `-v`, `-i`, `-o`) are silently ignored.

## Parsing Behavior

The parser handles several real-world cURL patterns:

- **Quoted strings** -- both single and double quotes are supported for header values and body content.
- **Line continuations** -- backslash-newline sequences (`\` at end of line) are joined into a single command.
- **Attached flags** -- compact forms like `-XPOST` or `-HAccept:application/json` are expanded correctly.
- **Long flag equals syntax** -- `--header="Key: Value"` is equivalent to `--header "Key: Value"`.
- **Auth detection** -- `Authorization: Basic ...` and `Authorization: Bearer ...` headers are detected and moved to the auth configuration instead of being listed as plain headers.
- **Content type inference** -- if no `Content-Type` header is present, the parser infers `application/json` for JSON bodies, `application/x-www-form-urlencoded` for key-value pairs, and `text/plain` otherwise.

## Example

A cURL command copied from browser DevTools:

```bash
curl 'https://api.example.com/search?q=litepost' \
  -H 'Accept: application/json' \
  -H 'Cookie: session=abc123; theme=dark' \
  --compressed
```

After import, the new tab contains:

- **Method:** `GET`
- **URL:** `https://api.example.com/search?q=litepost`
- **Headers:** `Accept: application/json`, `Accept-Encoding: gzip, deflate, br`
- **Cookies:** `session=abc123`, `theme=dark`
- **Params:** `q=litepost`
