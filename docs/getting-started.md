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

The upper half of the main area is the request panel. It contains the URL bar and a
row of sub-tabs:

- **Params** -- query parameters parsed from the URL, editable as key-value pairs.
- **Auth** -- configure authentication (None, Basic, Bearer Token, API Key, or OAuth 2.0).
- **Headers** -- add or edit request headers.
- **Body** -- write a request body in JSON, plain text, XML, or other formats. Multipart form-data with file uploads is also supported.
- **Cookies** -- attach cookies to the request.
- **Pre-request** -- run JavaScript scripts before the request is sent.
- **Tests** -- write test scripts and assertions that execute after a response arrives.
- **Code** -- view auto-generated code snippets for the current request in cURL, Python, JavaScript, C#, Go, or Ruby.
- **GraphQL** -- toggle GraphQL mode to write queries and variables with a dedicated editor.

### Response Panel

The lower half shows everything about the response:

- **Response** -- the formatted response body with syntax highlighting and collapsible JSON.
- **Preview** -- an HTML preview when the response is an HTML document.
- **Raw** -- the unformatted response body.
- **Headers** -- response headers in a readable table.
- **Redirects** -- the full redirect chain, when applicable.
- **Cookies** -- cookies set by the server.
- **Timing** -- a breakdown of DNS, TCP, TLS, first byte, and download times.
- **Extract** -- define rules to extract values from responses into environment variables.

### Title Bar

The title bar at the very top of the window gives you quick access to:

- **Collections** -- open, manage, and run saved request collections.
- **Environments** -- create and switch between environment variable sets.
- **cURL Import** -- paste a cURL command to instantly populate a new request tab.
- **Settings** -- configure theme, JSON viewer behavior, and other preferences.

## Next Steps

Now that you know your way around, explore some of LitePost's deeper features:

- [Collections](/collections) -- save, organize, and batch-run groups of requests.
- [Environments](/environments) -- manage variables across development, staging, and production.
- [Authentication](/authentication) -- set up OAuth 2.0, API keys, and more.
- [Testing](/testing) -- write assertions and scripts to automate response validation.
- [Streaming](/streaming) -- work with SSE and chunked transfer responses in real time.
