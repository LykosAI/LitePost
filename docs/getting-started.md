# Getting Started

This guide walks you through installing LitePost and sending your first API request.

## Download & Install

LitePost is available for Windows, macOS, and Linux. Head to the
[GitHub Releases page](https://github.com/LykosAI/LitePost/releases) to grab the
latest installer for your platform.

| Platform | Status | Installer |
|----------|--------|-----------|
| Windows  | Stable | `.msi` or `.exe` setup |
| macOS    | Beta   | `.dmg` disk image |
| Linux    | Beta   | `.AppImage` or `.deb` package |

Download the installer, run it, and follow the on-screen prompts. LitePost has no
sign-up requirement and no account needed -- it is ready to use the moment you open it.

:::tip
On macOS you may need to right-click the app and choose **Open** the first time, since
the build is not yet notarized by Apple.
:::

## Your First Request

Once LitePost is open, you will see a blank request tab ready to go. Follow these steps
to send a simple GET request.

1. **Choose a method.** The method dropdown on the left of the URL bar defaults to
   **GET**, which is what you want for a basic read request.

2. **Enter a URL.** Click the URL input field and type a test endpoint. A good one to
   start with is:

   ```
   https://jsonplaceholder.typicode.com/posts/1
   ```

3. **Send the request.** Click the **Send** button, or simply press **Enter**. LitePost
   will fire the request and display a loading indicator while it waits for the server.

4. **Read the response.** The response panel below the request panel shows the returned
   data. For the URL above you will see a JSON object with fields like `userId`, `id`,
   `title`, and `body`. The status badge (e.g., **200 OK**), response time, and
   response size are displayed at the top of the panel.

:::info
LitePost supports environment variables in URLs and headers. Wrap a variable name in
double curly braces -- for example `{{base_url}}/posts/1` -- and it will be replaced
at send time with the value from your active environment.
:::

## Exploring the Interface

LitePost organizes everything into a few key areas.

### Tab Bar

The tab bar runs across the top of the main content area. Each tab represents an
independent request with its own method, URL, headers, body, and response. You can
open as many tabs as you need and rename them by double-clicking the tab title.

### Request Panel

The top of the main area is the request panel: the URL bar plus a row of **section
chips**. Each chip summarizes its section at a glance (`Headers 3`, `Auth ✓`,
`Body 768B`) and clicking one opens that editor; clicking again -- or sending the
request -- collapses it so the response gets the full window. Drag the handle
below an open editor to resize it.

The everyday sections have their own chips:

- **Params** -- query parameters parsed from the URL, editable as key-value pairs.
- **Headers** -- add or edit request headers.
- **Auth** -- configure authentication (None, Basic, Bearer Token, API Key, or OAuth 2.0).
- **Body** -- write a request body in JSON, plain text, XML, or other formats. Multipart form-data with file uploads is also supported.
- **Tests** -- write test scripts and assertions that execute after a response arrives.

The rest live in the **`⋯` menu**:

- **Cookies** -- attach cookies to the request.
- **Pre-request** -- run JavaScript scripts before the request is sent.
- **Code** -- view auto-generated code snippets for the current request in cURL, Python, JavaScript, C#, Go, or Ruby.
- **GraphQL** -- toggle GraphQL mode to write queries and variables with a dedicated editor.
- **Settings** -- per-request network overrides (timeout, SSL verification, proxy).
- **WebSocket** -- connect to a WebSocket endpoint and exchange messages.

### Response Panel

The rest of the window belongs to the response. Before your first request it offers
a small gallery of sample requests you can send with one click. After a response
arrives you get:

- **Response** -- the formatted response body with syntax highlighting and collapsible JSON, plus a filter bar for narrowing JSON bodies with plain text or a path like `$.items[*].name`.
- **Preview** -- an HTML preview when the response is an HTML document.
- **Raw** -- the unformatted response body.
- **Headers** -- response headers in a readable table.
- **Redirects** -- the full redirect chain, when applicable.
- **Cookies** -- cookies set by the server.
- **Timing** -- a breakdown of DNS, TCP, TLS, first byte, and download times.
- **Extract** -- define rules to extract values from responses into environment variables.

### History Sidebar

The left sidebar lists every request you have sent, grouped by date, with
back-to-back repeats collapsed into a single row (marked `×N`). Click an entry to
reopen it in a new tab, search it from the box at the top, or collapse the whole
sidebar to a slim rail with the button in its header.

### Command Palette

Press **Ctrl+K** (or **Cmd+K** on macOS) anywhere to open the command palette. It
fuzzy-searches your history and saved collection requests, switches environments,
and runs actions like importing a cURL command or opening any panel -- all without
touching the mouse.

### Title Bar

The title bar at the very top of the window gives you quick access to:

- **Search (`Ctrl K` pill)** -- opens the command palette.
- **Environment selector** -- switch the active environment.
- **cURL Import** -- paste a cURL command to instantly populate a new request tab.
- **Collection Runner** -- batch-run a saved collection.
- **Collections** -- open and manage saved request collections.
- **Environments** -- create and edit environment variable sets.
- **Settings** -- configure theme, JSON viewer behavior, and other preferences.

## Next Steps

Now that you know your way around, explore some of LitePost's deeper features:

- [Collections](/collections) -- save, organize, and batch-run groups of requests.
- [Environments](/environments) -- manage variables across development, staging, and production.
- [Authentication](/authentication) -- set up OAuth 2.0, API keys, and more.
- [Testing](/testing) -- write assertions and scripts to automate response validation.
- [Streaming](/streaming) -- work with SSE and chunked transfer responses in real time.
