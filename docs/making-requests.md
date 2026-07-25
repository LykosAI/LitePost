# Making Requests

LitePost supports all standard HTTP methods and gives you full control over every part of an outgoing request -- URL, parameters, headers, body, and cookies.

## HTTP Methods

Select a method from the dropdown to the left of the URL bar. The following methods are available:

| Method    | Typical Use                        |
|-----------|------------------------------------|
| `GET`     | Retrieve a resource                |
| `POST`    | Create a resource or submit data   |
| `PUT`     | Replace a resource entirely        |
| `PATCH`   | Partially update a resource        |
| `DELETE`  | Remove a resource                  |
| `HEAD`    | Retrieve headers only (no body)    |
| `OPTIONS` | Query supported methods/CORS info  |

The selected method is displayed in the URL bar and persists with the tab.

## URL Bar and Sending

Type or paste a full URL into the URL bar:

```
https://api.example.com/v1/users
```

Press the **Send** button (or use the keyboard shortcut) to execute the request. LitePost will resolve environment variables in the URL before sending -- see the Environments documentation for details.

If the URL contains query parameters inline (e.g. `?page=1&limit=20`), they will be parsed and shown in the Query Parameters editor automatically.

## Query Parameters

Below the URL bar, the **Params** section lets you build query parameters as key-value pairs without hand-editing the URL string.

Each parameter row has:

- **Key** -- the parameter name
- **Value** -- the parameter value
- **Toggle** -- a checkbox to enable or disable the parameter without deleting it

Disabled parameters stay in the list but are excluded from the outgoing URL. This is useful for experimenting with optional parameters.

```
Key:   page      Value: 1        [enabled]
Key:   limit     Value: 20       [enabled]
Key:   debug     Value: true     [disabled]
```

The URL bar updates in real time as you add, remove, or toggle parameters.

## Request Headers

The **Headers** tab lets you attach custom HTTP headers as key-value pairs. Like query parameters, each header has a toggle to enable or disable it individually.

```
Key:   Content-Type     Value: application/json    [enabled]
Key:   X-Request-ID     Value: abc-123             [enabled]
Key:   X-Debug-Mode     Value: verbose             [disabled]
```

LitePost automatically includes standard headers such as `User-Agent` and `Accept`. Any headers you add override the defaults when there is a name collision.

## Request Body

When using methods that accept a body (`POST`, `PUT`, `PATCH`), select a body type from the dropdown above the body editor. The available types are described below.

### JSON

The default body type for most API work. LitePost provides a Monaco-based editor with:

- Syntax highlighting
- Bracket matching and auto-closing
- Inline validation for malformed JSON

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "roles": ["admin", "editor"]
}
```

The `Content-Type` header is set to `application/json` automatically.

### Form URL-Encoded

A key-value editor for `application/x-www-form-urlencoded` bodies -- the encoding used by standard HTML forms.

```
Key:   username    Value: janedoe
Key:   password    Value: s3cret
```

Values are URL-encoded on send. Each row can be toggled on or off.

### Multipart/Form-Data

A key-value editor that also supports file uploads. Each row can be either a text field or a file field:

- **Text fields** -- enter a key and a string value.
- **File fields** -- click the file selector to attach a file from disk.

```
Key:   description   Value: "Profile photo"     (text)
Key:   avatar        Value: avatar.png           (file)
```

The `Content-Type` header is set to `multipart/form-data` with an auto-generated boundary.

### XML

A plain-text editor for XML payloads. The `Content-Type` header is set to `application/xml`.

```xml
<user>
  <name>Jane Doe</name>
  <email>jane@example.com</email>
</user>
```

### Plain Text

A plain-text editor with no format-specific features. The `Content-Type` header is set to `text/plain`.

### HTML

A plain-text editor for HTML content. The `Content-Type` header is set to `text/html`.

```html
<div class="notification">
  <p>Your order has been confirmed.</p>
</div>
```

## Cookies

The **Cookies** section lets you attach cookies to outgoing requests as key-value pairs. Cookies received in `Set-Cookie` response headers are automatically parsed and displayed, so you can inspect, modify, and resend them on subsequent requests.

::: tip
If the API you are testing relies on session cookies, send a login request first. LitePost will capture the `Set-Cookie` values and make them available for follow-up requests.
:::

## Tabs

LitePost supports multiple concurrent request tabs. Each tab preserves the full request state:

- HTTP method and URL
- Query parameters
- Headers
- Body type and content
- Auth configuration
- Cookies

You can:

- **Open a new tab** using the `+` button in the tab bar.
- **Rename a tab** by double-clicking its title and typing a new name.
- **Close a tab** with the close button on the tab.
- **Switch between tabs** by clicking them -- the request and response panels update immediately.

Tabs persist across sessions, so your work is not lost when you close and reopen LitePost.
