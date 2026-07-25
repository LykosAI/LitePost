# Pre-Request Scripts

Pre-request scripts are JavaScript code that runs **before** each request is sent. They let you dynamically modify requests, set environment variables, compute values, and prepare authentication — all without manual intervention.

You write pre-request scripts in the **Pre-Request** tab of the request panel. The script executes every time you send the request, including during Collection Runner execution.

## The `lp` API

LitePost provides the `lp` object as the script runtime API. It gives you access to environment variables, variable substitution, and request modification.

### Environment Access

Read and write environment variables from your scripts. Changes take effect immediately and persist in the active environment.

#### `lp.environment.get(key)`

Returns the value of an environment variable, or `undefined` if it does not exist.

```javascript
const baseUrl = lp.environment.get("baseUrl");
// "https://api.example.com"
```

#### `lp.environment.set(key, value)`

Creates or updates an environment variable. The value is stored as a string.

```javascript
lp.environment.set("timestamp", Date.now().toString());
```

#### `lp.environment.has(key)`

Returns `true` if the variable exists in the current environment, `false` otherwise.

```javascript
if (!lp.environment.has("authToken")) {
  lp.environment.set("authToken", "default-dev-token");
}
```

#### `lp.environment.unset(key)`

Removes a variable from the current environment.

```javascript
lp.environment.unset("tempValue");
```

### Variable Substitution

#### `lp.variables.replaceIn(text)`

Substitutes `{{variable}}` placeholders in a string with their current environment values. This is the same substitution that LitePost applies to URLs and headers, but available for use in your script logic.

```javascript
const url = lp.variables.replaceIn("{{baseUrl}}/api/{{version}}/users");
// "https://api.example.com/api/v2/users"
```

### Request Modification

Read and modify properties of the outgoing request before it is sent.

#### Method and URL

`lp.request.method` and `lp.request.url` are readable and writable properties.

```javascript
// Read the current method
const method = lp.request.method; // "GET"

// Change the method
lp.request.method = "POST";

// Read and modify the URL
const currentUrl = lp.request.url;
lp.request.url = currentUrl + "?debug=true";
```

#### Body

`lp.request.body` gets or sets the request body. For JSON APIs, parse and stringify as needed.

```javascript
// Set a JSON body
lp.request.body = JSON.stringify({
  username: lp.environment.get("testUser"),
  timestamp: Date.now()
});
```

#### Headers

Manage request headers with three methods:

```javascript
// Read a header value
const contentType = lp.request.header("Content-Type");

// Set or overwrite a header
lp.request.setHeader("Content-Type", "application/json");
lp.request.setHeader("X-Custom-Header", "my-value");

// Remove a header entirely
lp.request.removeHeader("X-Deprecated-Header");
```

#### Query Parameters

Add or overwrite query parameters on the request URL:

```javascript
// Add a query parameter (appends even if key exists)
lp.request.addQueryParam("tag", "beta");

// Set a query parameter (replaces if key exists, adds if not)
lp.request.setQueryParam("page", "1");
lp.request.setQueryParam("limit", "50");
```

## Use Cases

### Dynamic Timestamps

Add a timestamp header to every request for logging or cache-busting:

```javascript
lp.request.setHeader("X-Timestamp", Date.now().toString());
lp.request.setHeader("X-Request-Time", new Date().toISOString());
```

### Token Chaining

Read a previously extracted token from the environment and apply it as an authorization header. This is commonly paired with [response extraction rules](/response-extraction) that save tokens after a login request.

```javascript
const token = lp.environment.get("authToken");

if (token) {
  lp.request.setHeader("Authorization", "Bearer " + token);
} else {
  // Fallback for development
  lp.request.setHeader("Authorization", "Bearer dev-placeholder");
}
```

### Request Signing

Compute an HMAC signature or hash for APIs that require signed requests:

```javascript
const secret = lp.environment.get("apiSecret");
const timestamp = Date.now().toString();
const body = lp.request.body || "";

// Build the string to sign
const stringToSign = lp.request.method + "\n" + timestamp + "\n" + body;

// Set signing headers
lp.request.setHeader("X-Timestamp", timestamp);
lp.request.setHeader("X-Signature", stringToSign);
lp.request.setHeader("X-Api-Key", lp.environment.get("apiKey"));
```

### Custom Auth Preparation

Some APIs require rotating or computed credentials. Use a pre-request script to prepare them:

```javascript
// Rotate between API keys for rate limit distribution
const keys = ["key-alpha", "key-bravo", "key-charlie"];
const index = Date.now() % keys.length;
lp.request.setHeader("X-Api-Key", keys[index]);

// Set a nonce for replay protection
const nonce = Math.random().toString(36).substring(2, 15);
lp.request.setHeader("X-Nonce", nonce);
lp.environment.set("lastNonce", nonce);
```

### Conditional Request Modification

Modify the request based on environment configuration:

```javascript
const env = lp.environment.get("environment");

if (env === "staging") {
  lp.request.url = lp.request.url.replace("api.example.com", "staging.example.com");
  lp.request.setHeader("X-Debug", "true");
}

if (lp.environment.has("mockMode")) {
  lp.request.setQueryParam("mock", "true");
}
```

:::tip
Pre-request scripts run in the Collection Runner too. Define your auth and setup logic in pre-request scripts so that every request in the collection is properly configured without manual steps between requests.
:::
