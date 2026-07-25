# LitePost Roadmap (Post-Phase 1)

This roadmap reflects current implementation status and the remaining planned phases.

## Current Status

- Phase 0 complete: multipart persistence hardening, collection runner multipart support, cURL parser robustness + tests.
- Phase 1 complete: pre-request script runtime, persistent extraction rules, request chaining support in single sends and collection runner.
- Phase 2 complete: global + per-request timeout, connect timeout, SSL verification toggle, proxy configuration.
- Phase 3 complete: schema introspection, field/argument autocomplete, operation picker, GraphQL error rendering, syntax highlighting.

## Phase 2 - Network Controls (Complete)

### Goals

- Add global and per-request timeout controls.
- Add SSL verification toggle (for local/self-signed development).
- Add proxy configuration support.

### Deliverables

- Settings UI + request-level overrides.
- Persisted settings model updates.
- Frontend request options wiring.
- Rust/Tauri transport wiring (`timeout`, `connect timeout`, SSL verify, proxy).
- Error messages for bad proxy/certificate config.

### Acceptance Criteria

- Users can set global timeout and override on specific requests.
- Users can disable SSL verification per request or globally.
- Users can route traffic through configured proxy and see requests succeed.
- Collection runner honors the same settings.

## Phase 3 - GraphQL Power Mode (Complete)

### Goals

- Move from basic GraphQL editing to high-productivity workflow.

### Deliverables

- Schema introspection fetch and cache.
- Query/mutation autocomplete from schema.
- Operation picker/validation improvements.
- Better GraphQL error rendering.

### Acceptance Criteria

- Users can introspect a GraphQL endpoint and get field autocomplete.
- Invalid query/variables issues are surfaced before send where possible.

## Phase 4 - WebSocket + Runner V2

### Goals

- Add first-class WebSocket support and enhance collection execution.

### Deliverables

- WebSocket panel: connect/send/log/status/close.
- Optional JSON formatting helpers in WS panel.
- Runner enhancements: sequential/parallel modes, configurable concurrency.
- Stop-on-fail and summary improvements.

### Acceptance Criteria

- Users can use `ws://` / `wss://` endpoints in-app.
- Runner can execute collections in configured mode with clear pass/fail reporting.

## Phase 5 - Power UX + Local-First Differentiators

### Goals

- Improve discoverability and speed for power users.

### Deliverables

- Command palette and expanded keyboard shortcuts.
- Response diff/compare workflow.
- OpenAPI import UX cleanup (modal-first, remove prompt-based flow).
- Better local backup/export/import ergonomics.

### Acceptance Criteria

- Common actions are available via shortcut/palette.
- Users can compare two responses with meaningful diffs.
- OpenAPI imports are guided and reliable.

## Phase 6 - Optional Stretch

### Candidate Features

- Local mock server.
- Local scheduled monitors/checks.
- Cookie jar inspector/editor enhancements.
- Additional auth helpers (SigV4/HMAC presets).

## Testing and Quality Gates (All Future Phases)

- Add targeted unit tests for each new runtime utility.
- Add integration-style tests for request preparation and chaining behavior.
- Ensure `pnpm build` and targeted Vitest suites pass before phase completion.

