# Testing

The **Test** panel in LitePost lets you define assertions that automatically run after each HTTP request. You configure assertions through UI dropdowns — no hand-coding required for basic checks. For advanced scenarios, LitePost also supports JavaScript-based test scripts with a Postman-compatible `pm` API.

## Assertion Types

Each assertion targets a specific part of the response. You select the type, a comparison operator, and an expected value from the Test panel's dropdown interface.

### Status

Validate the HTTP status code returned by the response.

| Operator    | Example                  | Passes when                |
|-------------|--------------------------|----------------------------|
| equals      | Status equals `200`      | Status code is exactly 200 |
| greaterThan | Status greaterThan `199` | Status code is 200 or more |
| lessThan    | Status lessThan `400`    | Status code is under 400   |

This is the most common assertion. A quick `Status equals 200` check confirms the request succeeded before you inspect the body.

### JSON

Validate a value at a specific JSON path in the response body. Paths use dot notation to traverse nested objects and bracket notation for arrays.

| JSON Path            | Operator | Expected   | Passes when                              |
|----------------------|----------|------------|------------------------------------------|
| `data.user.name`    | equals   | `"Alice"`  | The nested name field is exactly "Alice"  |
| `data.items`        | exists   | —          | The `items` key is present in `data`      |
| `data.count`        | greaterThan | `0`     | The count value is at least 1             |
| `message`           | contains | `"success"`| The message string includes "success"     |

Paths are evaluated against the parsed JSON response. If the path does not resolve (e.g., the key is missing), the assertion fails unless the operator is `exists` with a negated expectation.

### Header

Validate the value of a response header.

| Header Name    | Operator | Expected          | Passes when                                    |
|----------------|----------|-------------------|------------------------------------------------|
| Content-Type   | contains | `"json"`          | Content-Type header includes "json"            |
| Cache-Control  | equals   | `"no-cache"`      | Cache-Control is exactly "no-cache"            |
| X-Request-Id   | exists   | —                 | The X-Request-Id header is present             |

Header name matching is case-insensitive, consistent with the HTTP specification.

### Response Time

Validate how long the request took to complete. Timing values are in milliseconds.

| Operator    | Expected | Passes when                       |
|-------------|----------|-----------------------------------|
| lessThan    | `500`    | Total response time is under 500ms |
| greaterThan | `100`    | Response took more than 100ms      |
| equals      | `200`    | Response time is exactly 200ms     |

Response time assertions are useful for performance monitoring. The `lessThan` operator is the most practical choice here — exact equality on timing is rarely meaningful.

## Operators

All assertion types share the same set of comparison operators:

| Operator      | Description                                              |
|---------------|----------------------------------------------------------|
| `equals`      | Exact match (strict equality for numbers, string match for text) |
| `contains`    | The actual value includes the expected value as a substring |
| `exists`      | The target (header, JSON path, etc.) is present in the response |
| `greaterThan` | Numeric comparison, actual > expected                    |
| `lessThan`    | Numeric comparison, actual < expected                    |

## Test Scripts

For more complex validation logic, LitePost supports JavaScript-based test scripts with a Postman-compatible `pm` API. You write these in the script editor within the Test panel.

### The `pm` API

#### Defining Tests

Use `pm.test()` to define named test cases. Each test receives a callback function where you write your assertions.

```javascript
pm.test("Status code is 200", function () {
  pm.expect(pm.response.code).to.equal(200);
});
```

#### Assertions with `pm.expect`

`pm.expect(value)` provides chai-like assertion chaining:

```javascript
pm.test("Response contains user data", function () {
  const body = pm.response.json();
  pm.expect(body.data).to.have.property("name");
  pm.expect(body.data.name).to.equal("Alice");
});
```

#### Accessing the Response

`pm.response` exposes properties of the received response:

```javascript
pm.test("Comprehensive response check", function () {
  // Status code
  pm.expect(pm.response.code).to.equal(200);

  // Parse the JSON body
  const data = pm.response.json();
  pm.expect(data.items.length).to.be.greaterThan(0);
});
```

### Combining Dropdowns and Scripts

You can use both dropdown assertions and test scripts on the same request. Dropdown assertions run first, followed by any scripts. Both sets of results appear together in the test results display.

```javascript
// Script-based test alongside dropdown assertions
pm.test("User array is not empty", function () {
  const users = pm.response.json().data.users;
  pm.expect(users.length).to.be.greaterThan(0);
});

pm.test("First user has an email", function () {
  const firstUser = pm.response.json().data.users[0];
  pm.expect(firstUser).to.have.property("email");
});
```

## Test Results Display

After a request completes, the Test panel shows results for every assertion and test script:

- **Pass**: The assertion succeeded. Displayed with a green indicator and the assertion description.
- **Fail**: The assertion did not hold. Displayed with a red indicator, the assertion description, and an error message explaining what went wrong (e.g., "Expected 200 but received 404").

Each result is listed individually, so you can see at a glance which checks passed and which need attention.

## Tests in the Collection Runner

When you execute a collection through the **Collection Runner**, every request's assertions run automatically after that request completes. This turns your collection into a repeatable test suite.

- Assertions defined on each request (both dropdown and script-based) execute in order as the runner processes the collection.
- The runner summary shows aggregate results: total assertions, pass count, and fail count.
- Failed assertions are highlighted with the request name and failure details, so you can identify which endpoint in the collection broke and why.

:::tip
Define assertions on each request in a collection before running the Collection Runner. This gives you a full pass/fail report across your entire API workflow in a single run.
:::

This workflow is especially useful for regression testing — save a collection of critical endpoints with their assertions, then re-run the collection after backend changes to verify nothing is broken.
