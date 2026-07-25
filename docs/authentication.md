# Authentication

LitePost supports several authentication schemes through the **Auth** chip on the request panel (the chip shows a ✓ whenever auth is configured). Select an auth type from the dropdown to configure credentials. The appropriate headers or parameters are applied automatically when the request is sent.

## No Auth

The default setting. No authentication headers or parameters are added to the request. Use this for public endpoints or when you are managing auth headers manually in the Headers section.

## Basic Auth

HTTP Basic Authentication encodes a username and password as a Base64 string and sends it in the `Authorization` header.

**Fields:**

| Field    | Description              |
|----------|--------------------------|
| Username | Your account username    |
| Password | Your account password    |

When you fill in both fields, LitePost generates the header automatically:

```
Authorization: Basic amFuZTpzM2NyZXQ=
```

The value is `base64("username:password")`. LitePost encodes this on every send, so changes to the credentials take effect immediately.

::: warning
Basic Auth transmits credentials in a reversible encoding, not encryption. Always use HTTPS when sending Basic Auth requests.
:::

## Bearer Token

Bearer token authentication is the most common scheme for APIs secured with OAuth 2.0, JWTs, or similar token-based systems.

**Fields:**

| Field | Description                         |
|-------|-------------------------------------|
| Token | The bearer token string             |

Paste your token into the field and LitePost adds the header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If you obtain tokens through the OAuth 2.0 flow (described below), the token field is populated automatically.

## API Key

API Key authentication sends a custom key-value pair as either a header or a query parameter. This is common for services like Google Maps, OpenWeatherMap, and Stripe.

**Fields:**

| Field     | Description                                        |
|-----------|----------------------------------------------------|
| Key Name  | The name of the header or query parameter           |
| Value     | The API key string                                  |
| Add To    | Choose **Header** or **Query Parameter** placement  |

### Header placement

```
X-API-Key: sk-abc123def456
```

### Query parameter placement

```
https://api.example.com/data?api_key=sk-abc123def456
```

The key name and placement are fully configurable, so this works with APIs that expect the key under any name (`apiKey`, `x-api-key`, `access_token`, etc.).

## OAuth 2.0

LitePost supports three OAuth 2.0 grant types. Each grant type is suited to a different scenario -- choose the one that matches your API's requirements.

### Common Fields

These fields appear for all OAuth 2.0 grant types:

| Field         | Description                                                  |
|---------------|--------------------------------------------------------------|
| Token URL     | The authorization server's token endpoint                    |
| Client ID     | Your application's client identifier                         |
| Client Secret | Your application's client secret (may be optional for PKCE)  |
| Scopes        | Space-separated list of requested permissions                |

### Auto-Fill from OIDC Discovery

Instead of hunting down endpoint URLs, paste your provider's issuer into the
**Discovery URL** field and click **Auto-fill**. LitePost accepts any of:

- A bare issuer or base URL -- `https://accounts.google.com` or just `auth.example.com`
- An issuer with a tenant path -- `https://login.example.com/tenant/v2.0`
- The full `/.well-known/openid-configuration` URL

LitePost fetches the discovery document (through its own HTTP backend, so CORS is
not a concern), fills in the **Authorization URL** and **Token URL**, and -- if the
Scopes field is empty -- seeds it with the standard scopes the provider actually
supports (`openid profile email`). Values you have already typed in Scopes are
never overwritten, and the field supports `{{variables}}` like everything else.

### Authorization Code

Use this grant type when the API requires user login through a browser. This is the standard flow for apps acting on behalf of a user.

**How it works:**

1. Click **Get New Access Token** in LitePost.
2. A browser window opens to the authorization server's login page.
3. The user logs in and grants consent.
4. The authorization server redirects back to LitePost with an authorization code.
5. LitePost exchanges the code for an access token at the Token URL.

**Additional fields:**

| Field             | Description                                              |
|-------------------|----------------------------------------------------------|
| Authorization URL | The authorization server's authorize endpoint            |
| Callback URL      | The redirect URI registered with your OAuth application. Leave blank to use LitePost's local callback server (`http://localhost:17823/callback`; if that port is busy, LitePost automatically falls back to a free one). |

#### PKCE Support

LitePost supports Proof Key for Code Exchange (PKCE), which is recommended for public clients that cannot securely store a client secret. When PKCE is enabled:

- LitePost generates a random `code_verifier` and derives a `code_challenge` using SHA-256.
- The `code_challenge` is sent with the authorization request.
- The `code_verifier` is sent with the token exchange request.

This prevents authorization code interception attacks without requiring a client secret.

### Client Credentials

Use this grant type for server-to-server communication where no user is involved. The application authenticates directly using its own client ID and secret.

**How it works:**

1. LitePost sends the client ID and secret to the Token URL.
2. The authorization server returns an access token.

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=my-app&client_secret=secret123&scope=read write
```

No browser interaction is required. This is the simplest OAuth flow.

### Password Grant

Use this grant type when you have the user's username and password directly. This grant type is typically reserved for first-party applications or testing environments.

**Additional fields:**

| Field    | Description            |
|----------|------------------------|
| Username | The user's username    |
| Password | The user's password    |

**How it works:**

1. LitePost sends the username, password, client ID, and secret to the Token URL.
2. The authorization server validates the credentials and returns an access token.

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=jane&password=s3cret&client_id=my-app&client_secret=secret123
```

::: warning
The Password Grant sends user credentials directly to the token endpoint. Only use this with trusted authorization servers over HTTPS. Many providers have deprecated this grant type in favor of Authorization Code with PKCE.
:::

### Token Management

Once a token is obtained through any OAuth flow, LitePost handles it as follows:

- **Automatic attachment** -- the access token is added to requests as a `Bearer` token in the `Authorization` header.
- **Expiration tracking** -- LitePost records the token's `expires_in` value and displays when the token will expire. Expired tokens are flagged so you know when to refresh.
- **Token refresh** -- if the authorization server issued a refresh token, LitePost can exchange it for a new access token without repeating the full authorization flow. Click **Refresh Token** when the current token has expired or is about to expire.
- **Manual override** -- you can paste a token directly into the Access Token field if you obtained it outside of LitePost.
