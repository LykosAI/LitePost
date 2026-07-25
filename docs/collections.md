# Collections

Collections are saved groups of API requests that let you organize, reuse, and share your work. Instead of rebuilding requests from scratch each session, you save them into named collections and load them whenever needed.

## Creating a Collection

1. Click the **collections icon** in the title bar to open the Collections panel.
2. Click **Create New Collection**.
3. Enter a name (e.g., "User Service" or "Payment API") and confirm.

The new collection appears in the panel, ready for requests.

## Saving Requests

To save the current request into a collection:

1. Click the **Save** button in the request panel (or use the save dialog).
2. Select the target collection from the list.
3. Optionally edit the request name, then confirm.

The request is saved with its full configuration: URL, method, headers, body, authentication, and query parameters.

## Loading Requests

Click any saved request in the Collections panel to open it in a new tab. Each loaded request is independent -- edits to the tab do not modify the saved collection entry until you explicitly save again.

## Searching Collections

Use the search field at the top of the Collections panel to filter collections and requests by name. The filter applies across all collections, surfacing matching requests regardless of which collection they belong to.

## Renaming and Deleting

- **Rename a collection**: Click the collection menu (three-dot icon) and select **Rename**. Enter the new name and confirm.
- **Delete a collection**: Click the collection menu and select **Delete**. This removes the collection and all its saved requests permanently.
- **Delete a single request**: Open the request context menu within a collection and select **Delete**.

## Import and Export

### Export as JSON

Export a collection to a JSON file for backup or sharing:

1. Open the collection menu and select **Export**.
2. Choose a save location. The file is written in LitePost's native JSON format.

### Import from Postman v2.1

LitePost fully supports importing Postman Collection v2.1 files:

1. Click **Import** in the Collections panel.
2. Select a `.json` file exported from Postman (v2.1 format).
3. LitePost parses the file and creates a new collection with all requests, folders, headers, bodies, and auth configurations preserved.

### Import from OpenAPI 3.x

Import an OpenAPI 3.x specification to auto-generate a collection of requests:

1. Click **Import** and select **OpenAPI**.
2. Provide the spec via **file upload** or by entering a **URL**.
3. LitePost parses the spec and creates requests for each endpoint, including:
   - HTTP method and path
   - Path parameters extracted and inserted as `{{paramName}}` variables
   - Request body schemas converted to sample JSON payloads
   - Documented headers and query parameters

This is useful for quickly scaffolding a collection from an existing API definition.

## Collection Runner

The Collection Runner executes every request in a collection sequentially, applying environment variables, pre-request scripts, and test assertions along the way.

### Starting a Run

1. Open a collection and click **Run Collection**.
2. Select the active environment (if any) for variable substitution.
3. Click **Start** to begin execution.

### Execution Flow

For each request in the collection, the runner:

1. **Substitutes environment variables** -- replaces `{{variableName}}` placeholders in the URL, headers, body, and auth fields with values from the active environment.
2. **Executes pre-request scripts** -- runs any configured pre-request script before sending the request. Scripts can modify variables or set up state.
3. **Sends the request** and records the response.
4. **Runs test assertions** -- evaluates test scripts against the response. Each assertion is marked as pass or fail.

### Progress Tracking

During execution, the runner displays progress as **current / total** (e.g., "3 / 12"). You can see which request is currently executing.

### Results Summary

After the run completes, the results view shows:

- **Per-request status**: HTTP status code for each request.
- **Timing**: Response time for each request in milliseconds.
- **Test results**: Pass/fail count for each request's test assertions, with details on any failures.

### Cancellation

Click **Cancel** at any time during a run to stop execution. Requests already completed retain their results; the remaining requests are skipped.
