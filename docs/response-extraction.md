# Response Extraction

Extraction rules let you automatically pull values out of HTTP responses and save them as environment variables. Once configured, rules run after every send -- no manual copy-pasting needed. This is the foundation for **request chaining**, where one request's output feeds into the next request's input.

## Configuring Extraction Rules

You configure extraction rules in the **Extract** tab of the Response panel. Each rule has three parts:

1. **Source**: Where to extract from (body, header, status, or cookie).
2. **Path or name**: The specific value to extract (a JSON path, header name, or cookie name).
3. **Variable name**: The environment variable to save the extracted value into.

Rules are saved per request and persist across sessions. Every time you send the request, the rules execute against the new response and update the environment variables.

## Sources

### Body (JSON Path)

Extract a value from a JSON response body using dot notation. Array indices use bracket notation.

| JSON Path          | Response Body                                          | Extracted Value |
|--------------------|--------------------------------------------------------|-----------------|
| `data.token`       | `{"data": {"token": "abc123"}}`                        | `abc123`        |
| `data.user.name`   | `{"data": {"user": {"name": "Alice"}}}`                | `Alice`         |
| `items[0].id`      | `{"items": [{"id": 42}, {"id": 43}]}`                  | `42`            |
| `meta.pagination.next` | `{"meta": {"pagination": {"next": "/page/2"}}}`    | `/page/2`       |

Paths are evaluated against the parsed JSON. If the path does not resolve to a value (e.g., the key is missing or the response is not valid JSON), the extraction is skipped and the environment variable is not updated.

### Header

Extract the value of a response header by name.

| Header Name     | Extracted Value Example                  |
|-----------------|------------------------------------------|
| `Content-Type`  | `application/json; charset=utf-8`        |
| `X-Request-Id`  | `req-7f3a2b1c`                           |
| `X-RateLimit-Remaining` | `42`                             |
| `Location`      | `https://api.example.com/resources/123`  |

Header name matching is case-insensitive. The full header value string is stored in the environment variable.

### Status

Extract the HTTP status code as a numeric string.

| Response Status | Extracted Value |
|-----------------|-----------------|
| 200 OK          | `200`           |
| 201 Created     | `201`           |
| 404 Not Found   | `404`           |

This is useful for conditional logic in [pre-request scripts](/pre-request-scripts) that check the outcome of a previous request.

### Cookie

Extract a cookie value by name from the response's `Set-Cookie` headers.

| Cookie Name    | Extracted Value Example       |
|----------------|-------------------------------|
| `session_id`   | `s%3Aabc123.xyz`              |
| `csrf_token`   | `d4f7a2b1c3e8`                |

Only the cookie value is extracted, not the attributes (Path, Expires, HttpOnly, etc.).

## Rule Configuration Example

Here is how three extraction rules might be configured for a login endpoint:

| Source | Path / Name      | Variable Name  |
|--------|-------------------|----------------|
| Body   | `data.token`      | `authToken`    |
| Body   | `data.user.id`    | `userId`       |
| Header | `X-Request-Id`    | `lastRequestId`|

After sending `POST /login`, LitePost extracts the token and user ID from the JSON body and the request ID from the headers, saving each to the specified environment variable. Any subsequent request can reference these as `{{authToken}}`, `{{userId}}`, and `{{lastRequestId}}`.

## Request Chaining Workflow

Extraction rules are most powerful when used to chain requests together. Here is a concrete three-step example.

### Step 1: Authenticate

**POST** `{{baseUrl}}/auth/login`

Request body:

```json
{
  "email": "alice@example.com",
  "password": "{{testPassword}}"
}
```

Extraction rules on this request:

| Source | Path          | Variable Name |
|--------|---------------|---------------|
| Body   | `data.token`  | `authToken`   |
| Body   | `data.user.id`| `userId`      |

After this request completes, the environment now contains `authToken` and `userId`.

### Step 2: Fetch User Profile

**GET** `{{baseUrl}}/users/{{userId}}/profile`

Headers:

```
Authorization: Bearer {{authToken}}
```

The URL substitutes `{{userId}}` (extracted in Step 1), and the Authorization header substitutes `{{authToken}}` (also from Step 1).

Extraction rules on this request:

| Source | Path                  | Variable Name    |
|--------|-----------------------|------------------|
| Body   | `data.profile.orgId`  | `organizationId` |

### Step 3: List Organization Resources

**GET** `{{baseUrl}}/orgs/{{organizationId}}/resources`

Headers:

```
Authorization: Bearer {{authToken}}
```

This request uses `{{organizationId}}` from Step 2 and `{{authToken}}` from Step 1, completing a three-step chain where each request depends on data from the previous one.

## Extraction in the Collection Runner

When you execute a collection through the Collection Runner, extraction rules on each request run in sequence. This means you can build entire workflows:

1. The runner sends the first request and executes its extraction rules.
2. The extracted values are written to the environment immediately.
3. The next request in the collection picks up those values via `{{variable}}` substitution.
4. This continues through every request in the collection.

Because the environment is shared and updated in real time, a collection can implement complex multi-step API workflows -- authentication, data creation, verification, and cleanup -- all in a single automated run.

:::tip
Pair extraction rules with [test assertions](/testing) to both validate and capture response data in one step. For example, assert that `data.token` exists, then extract it into an environment variable.
:::
