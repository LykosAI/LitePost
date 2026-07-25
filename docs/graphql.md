# GraphQL

LitePost includes a dedicated GraphQL mode that provides a structured editing experience for GraphQL queries and mutations. Instead of manually constructing a JSON body, you get purpose-built editors for the query, variables, and operation name.

## Enabling GraphQL Mode

In the request body editor, select **GraphQL** from the body type dropdown. The body editor is replaced by the GraphQL editor panel with three sections.

The request method is typically `POST` and the URL points to your GraphQL endpoint:

```
POST https://api.example.com/graphql
```

## Editor Sections

### Query Editor

The main editor where you write your GraphQL query or mutation. It uses Monaco with GraphQL syntax highlighting, bracket matching, folding, and word wrap.

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    name
    email
    posts {
      title
      createdAt
    }
  }
}
```

A **Format** button in the toolbar reformats the document for readability.

### Variables Editor

Switch to the **Variables** tab to open a JSON editor for query variables. Variables are sent as a parsed JSON object alongside the query.

```json
{
  "id": "usr_42"
}
```

If the variables field is empty or contains invalid JSON, the request is sent without a `variables` key. LitePost does not block the request -- this lets you iterate quickly even with incomplete input.

### Operation Name

A text input to the right of the tab bar lets you specify which operation to execute. This is required when your document contains multiple named operations:

```graphql
query GetUser($id: ID!) {
  user(id: $id) { name }
}

query ListUsers {
  users { name }
}
```

Setting the operation name to `ListUsers` tells the server to execute that specific query. If your document has only one operation, you can leave this field blank.

## Request Format

When you click **Send**, LitePost constructs a JSON body from the three editor fields and sends it as a `POST` request with `Content-Type: application/json`:

```json
{
  "query": "query GetUser($id: ID!) { user(id: $id) { name email } }",
  "variables": {
    "id": "usr_42"
  },
  "operationName": "GetUser"
}
```

The `variables` key is omitted if the variables editor is empty. The `operationName` key is omitted if the operation name input is blank.

## Auth and Environment Variables

GraphQL mode works with all authentication types -- Basic, Bearer, API Key, and OAuth 2.0. Configure auth in the **Auth** tab as you would for any other request.

Environment variables (e.g. `{{base_url}}`, `{{auth_token}}`) are resolved in the URL, headers, and variable values before the request is sent.

## Planned Improvements

The following enhancements are on the roadmap:

- **Schema introspection** -- fetch the schema from the endpoint and use it to power editor features
- **Autocomplete** -- field and type suggestions based on the introspected schema
- **Better error rendering** -- inline display of GraphQL-specific errors returned in the `errors` array
