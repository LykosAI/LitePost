# SSE Streaming

LitePost has built-in support for Server-Sent Events (SSE) and chunked transfer encoding. When a response is detected as a stream, LitePost automatically switches from the standard response view to a live streaming display.

## How It Works

After you send a request, LitePost inspects the response headers. If the `Content-Type` is `text/event-stream` or the transfer encoding is chunked, the response panel switches to streaming mode. Data appears in real time as the server pushes it -- there is no need to wait for the connection to close before seeing output.

Each incoming chunk is appended to the display immediately. JSON responses are parsed and rendered with the collapsible JSON viewer as they arrive.

## Stream Display

The streaming view shows the accumulated content in a scrollable pane. As new chunks arrive, the view auto-scrolls to the bottom so you always see the latest data. A pulsing green indicator in the corner confirms that the stream is still active and receiving data.

The status bar above the stream content shows:

- **Status** -- the HTTP status code and reason phrase (e.g. `200 OK`)
- **Streaming badge** -- displays `Streaming (N chunks)...` while active, or `Complete` when the stream ends
- **Time** -- elapsed wall-clock time since the request was sent

```
Status: 200 OK    Streaming (42 chunks)...    Time: 1830ms
```

## Controls

Two controls appear in the top-right corner of the stream pane:

### Pause / Play

Click the pause button to freeze auto-scrolling. The stream continues to receive data in the background -- pausing only stops the display from scrolling so you can inspect earlier content. Click play to resume auto-scrolling to the latest content.

### Cancel

Click the cancel button to terminate the stream. LitePost sends a cancellation signal to the backend, which closes the underlying connection. The stream view marks the response as complete and shows `Request cancelled by user`.

A copy button is also available to copy the full accumulated content to the clipboard at any point during or after the stream.

## Headers Inspection

While streaming, you can switch to the **Headers** tab to inspect response headers without interrupting the stream. This is useful for checking `Content-Type`, caching directives, or custom headers the server sends before the body.

## Error Handling

If the server responds with a 4xx or 5xx status code, the status text is highlighted in red even while the stream is active. This makes it easy to spot error responses that still use chunked transfer encoding.

If a network error occurs during streaming, the error message is displayed in the stream pane and the stream is marked as complete.

## Scoped Streams

Each stream is scoped to the request tab that initiated it. Stream events use a unique request ID (e.g. `sse-chunk-<requestId>`) so that data from one stream never leaks into another tab. You can run multiple concurrent streams in different tabs without interference.

::: tip
If you want to compare the output of two SSE endpoints side by side, open each in its own tab and send both requests. Each tab maintains its own independent stream state.
:::

## Cancellation Under the Hood

On the backend, cancellation uses a `tokio::sync::watch` channel. When you click cancel, the frontend invokes the `cancel_stream` command with the request ID. The Rust backend flips the watch flag, and the streaming loop -- running inside a `tokio::select!` -- detects the signal and closes the connection cleanly.
