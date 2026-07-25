# Environments

Environments are named sets of key-value variables that let you switch between configurations without editing individual requests. A typical setup includes environments like "Development", "Staging", and "Production", each defining the same variable names with different values.

## Creating and Managing Environments

1. Click the **environment icon** in the title bar to open the Environments panel.
2. Click **Create New Environment** and enter a name (e.g., "Development").
3. To edit an existing environment, select it from the list and modify its variables.
4. To delete an environment, open its context menu and select **Delete**.

## Adding Variables

Each environment contains a list of key-value pairs. To add a variable:

1. Open the environment editor for the target environment.
2. Enter a **key** (e.g., `baseUrl`) and a **value** (e.g., `https://dev.api.example.com`).
3. Add as many variables as needed. Common examples:

| Key         | Value (Development)                  | Value (Production)                |
|-------------|--------------------------------------|-----------------------------------|
| `baseUrl`   | `https://dev.api.example.com`        | `https://api.example.com`         |
| `authToken` | `dev-token-abc123`                   | `prod-token-xyz789`               |
| `apiVersion`| `v2`                                 | `v2`                              |

## Switching Environments

Select the active environment from the **dropdown** in the title bar. Only one environment is active at a time. All variable substitutions use the active environment's values. Selecting "No Environment" disables substitution.

## Variable Substitution

Wrap any variable name in double curly braces to reference it: `{{variableName}}`. LitePost replaces these placeholders with the corresponding value from the active environment at the time the request is sent.

### Where Substitution Works

Variables are resolved in:

- **URLs** -- `{{baseUrl}}/api/users/{{userId}}`
- **Headers** -- `Authorization: Bearer {{authToken}}`
- **Request bodies** -- `{"tenant": "{{tenantId}}", "role": "admin"}`
- **Query parameters** -- `page={{pageNumber}}&limit={{pageSize}}`
- **Authentication credentials** -- API keys, bearer tokens, basic auth username/password fields

### Example

Given an environment with:

| Key       | Value                          |
|-----------|--------------------------------|
| `baseUrl` | `https://dev.api.example.com`  |
| `userId`  | `42`                           |

A request to `{{baseUrl}}/api/users/{{userId}}` resolves to:

```
GET https://dev.api.example.com/api/users/42
```

## How Variables Get Populated

Variables can be set through three mechanisms.

### Manual Entry

Open the environment editor and type key-value pairs directly. This is the most straightforward approach for static configuration like base URLs, API keys, and default parameters.

### Pre-Request Scripts

Pre-request scripts run before each request is sent and can programmatically set environment variables using the `lp.environment.set()` function:

```javascript
// Generate a timestamp before each request
lp.environment.set("timestamp", Date.now().toString());

// Compute a derived value
lp.environment.set("requestId", crypto.randomUUID());
```

This is useful for values that need to be computed dynamically, such as timestamps, nonces, or derived tokens.

### Response Extraction Rules

Response extraction rules automatically save values from a response into environment variables. After a request completes, the extraction engine pulls data from the response (e.g., a JSON field, a header value) and writes it to the specified variable.

For example, after a login request returns `{"access_token": "eyJ..."}`, an extraction rule can save the token to `{{authToken}}` so subsequent requests use it automatically.

This enables chaining requests: authenticate once, extract the token, and use it in every following request without manual copy-paste.

## Persistence

Environments are automatically saved to disk and persist across application sessions. There is no manual save step -- changes are written as you make them. Environment data is stored locally in a JSON file managed by LitePost's file system plugin.
