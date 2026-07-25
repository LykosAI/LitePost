# LitePost Real-App Test Checklist (Phase 1 -> Phase 2 Gate)

Use this checklist against the **release build** (`pnpm tauri build`) to validate core power-user flows before starting Phase 2.

## 1. Release Smoke

- [ ] Install and launch from `nsis` or `msi` bundle.
- [ ] Create/open/close tabs (`Ctrl+N`, `Ctrl+W` if enabled).
- [ ] Send a basic request (`GET https://httpbin.org/get`) and confirm `200`.
- [ ] Restart app and confirm state persists (tabs, active environment, saved collections).

## 2. cURL Import Robustness

### 2.1 Basic + Headers + Query

Paste:

```bash
curl -X GET "https://httpbin.org/anything?from=curl&n=1" -H "X-Test: litepost" -H "Accept: application/json"
```

- [ ] Method, URL, query, and headers are populated correctly.
- [ ] Sending the imported request succeeds.

### 2.2 JSON Body + Escaping

Paste:

```bash
curl -X POST "https://httpbin.org/anything" -H "Content-Type: application/json" -d "{\"name\":\"LitePost\",\"msg\":\"hello \\\"world\\\"\"}"
```

- [ ] Body is valid JSON in editor.
- [ ] Sent request echoes JSON in response.

### 2.3 Multipart + File

Paste (replace with a real file path):

```bash
curl -X POST "https://httpbin.org/post" -F "meta=demo" -F "file=@C:/tmp/demo.txt"
```

- [ ] `multipart/form-data` mode activates.
- [ ] Text field and file field are mapped correctly.
- [ ] Request succeeds and response includes `form` + `files`.

## 3. Multipart Editor UX

- [ ] Add/remove text and file rows.
- [ ] Pick file with dialog, then send.
- [ ] Save request to collection, reopen it, verify rows persisted.
- [ ] Switch tabs and return; rows remain intact.

## 4. Pre-request Scripts

Use script:

```javascript
pm.environment.set("nonce", Math.random().toString(16).slice(2));
pm.request.setHeader("X-Nonce", pm.environment.get("nonce"));
pm.request.setQueryParam("nonce", pm.environment.get("nonce"));
```

- [ ] Request sends with dynamic header/query values.
- [ ] `{{nonce}}` becomes available in environment.

Failure behavior:

```javascript
throw new Error("intentional test error");
```

- [ ] Request does not send.
- [ ] Error clearly identifies the failing script name.

## 5. Extraction Rules (Single Request)

Send:

```http
GET https://httpbin.org/uuid
```

Rule:

- Source: `body`
- Path: `uuid`
- Variable: `last_uuid`

- [ ] Preview resolves before extraction.
- [ ] "Extract All" stores `last_uuid` in active environment.

Also verify:

- [ ] Source `status` with variable `last_status` stores `200`.
- [ ] Source `header` with path `content-type` stores expected value.

## 6. Collection Runner + Chaining

Create collection with two requests:

1) `GET https://httpbin.org/uuid` with extraction rule `uuid -> run_uuid`
2) `GET https://httpbin.org/anything?id={{run_uuid}}`

- [ ] Select active environment.
- [ ] Run collection.
- [ ] Request 2 resolves `{{run_uuid}}` from request 1 extraction.
- [ ] Runner summary (pass/fail, durations) looks correct.

## 7. Regression Checks After Bundle Split

- [ ] Body editor still loads and formats JSON.
- [ ] GraphQL editor still mounts and accepts query/variables.
- [ ] Response/code snippet syntax highlighting still renders.
- [ ] No blank/unstyled editor panes after cold start.

## 8. Release Artifacts

Current expected outputs:

- `src-tauri/target/release/litepost.exe`
- `src-tauri/target/release/bundle/msi/litepost_0.2.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/litepost_0.2.0_x64-setup.exe`
