import { AuthConfig, Header, URLParam, Cookie, FormDataEntry } from "@/types"

export interface ParsedCurlRequest {
    method: string
    url: string
    rawUrl: string
    headers: Header[]
    params: URLParam[]
    body: string
    contentType: string
    auth: AuthConfig
    cookies: Cookie[]
    formDataEntries?: FormDataEntry[]
}

/**
 * Tokenize a curl command string, handling quoted strings and backslash continuations.
 */
function tokenize(input: string): string[] {
    // Normalize line continuations (backslash + newline)
    const normalized = input
        .replace(/\\\r?\n\s*/g, ' ')
        .replace(/\r?\n/g, ' ')
        .trim()

    const tokens: string[] = []
    let current = ''
    let inSingleQuote = false
    let inDoubleQuote = false
    let escaped = false

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i]

        if (escaped) {
            current += char
            escaped = false
            continue
        }

        if (char === '\\' && !inSingleQuote) {
            escaped = true
            continue
        }

        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote
            continue
        }

        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote
            continue
        }

        if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
            if (current.length > 0) {
                tokens.push(current)
                current = ''
            }
            continue
        }

        current += char
    }

    if (current.length > 0) {
        tokens.push(current)
    }

    return tokens
}

/**
 * Normalize tokens so short/long flags with attached values are parsed consistently.
 */
function normalizeTokens(tokens: string[]): string[] {
    const normalized: string[] = []
    const shortFlagsWithValue = ['-X', '-H', '-d', '-u', '-A', '-e', '-b', '-F', '-o']

    for (const token of tokens) {
        // --header=value => --header value
        if (token.startsWith('--') && token.includes('=')) {
            const eqIndex = token.indexOf('=')
            normalized.push(token.substring(0, eqIndex), token.substring(eqIndex + 1))
            continue
        }

        // -XPOST => -X POST, -HAccept: application/json => -H ...
        const shortFlag = shortFlagsWithValue.find(
            (flag) => token.startsWith(flag) && token.length > flag.length
        )
        if (shortFlag) {
            normalized.push(shortFlag, token.substring(shortFlag.length))
            continue
        }

        normalized.push(token)
    }

    return normalized
}

/**
 * Extract URL parameters from a URL string.
 */
function extractParams(url: string): URLParam[] {
    try {
        const urlObj = new URL(url)
        const params: URLParam[] = []
        urlObj.searchParams.forEach((value, key) => {
            params.push({ key, value, enabled: true })
        })
        return params
    } catch {
        return []
    }
}

/**
 * Detect auth config from parsed headers.
 */
function detectAuth(headers: Record<string, string>): {
    auth: AuthConfig
    remainingHeaders: Record<string, string>
} {
    const remaining = { ...headers }
    const authHeader = Object.keys(remaining).find(
        (k) => k.toLowerCase() === 'authorization'
    )

    if (authHeader) {
        const value = remaining[authHeader]
        delete remaining[authHeader]

        // Basic auth
        const basicMatch = value.match(/^Basic\s+(.+)$/i)
        if (basicMatch) {
            try {
                const decoded = atob(basicMatch[1])
                const [username, ...passwordParts] = decoded.split(':')
                return {
                    auth: {
                        type: 'basic',
                        username,
                        password: passwordParts.join(':'),
                    },
                    remainingHeaders: remaining,
                }
            } catch {
                // If decoding fails, treat as bearer
            }
        }

        // Bearer token
        const bearerMatch = value.match(/^Bearer\s+(.+)$/i)
        if (bearerMatch) {
            return {
                auth: {
                    type: 'bearer',
                    token: bearerMatch[1],
                },
                remainingHeaders: remaining,
            }
        }
    }

    return {
        auth: { type: 'none' },
        remainingHeaders: remaining,
    }
}

function getFileNameFromPath(path: string): string {
    const cleanedPath = path.replace(/^"|"$/g, '').replace(/\\/g, '/')
    const segments = cleanedPath.split('/')
    const fileName = segments[segments.length - 1]
    return fileName || 'upload'
}

function normalizeFilePath(path: string): string {
    return path.replace(/^"|"$/g, '').trim()
}

function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

function parseFormPart(part: string, index: number): FormDataEntry | null {
    if (!part.trim()) {
        return null
    }

    const eqIndex = part.indexOf('=')
    const key = (eqIndex >= 0 ? part.substring(0, eqIndex) : part).trim()
    const value = eqIndex >= 0 ? part.substring(eqIndex + 1) : ''

    if (!key) {
        return null
    }

    const fileIndicator = value.startsWith('@') || value.startsWith('<')
    if (fileIndicator) {
        const rawPath = normalizeFilePath(value.substring(1).split(';')[0].trim())
        return {
            id: `form-${index}`,
            key,
            value: '',
            type: 'file',
            fileName: getFileNameFromPath(rawPath),
            filePath: rawPath,
            enabled: true,
        }
    }

    return {
        id: `form-${index}`,
        key,
        value,
        type: 'text',
        enabled: true,
    }
}

function serializeFormData(entries: FormDataEntry[]): string {
    return entries
        .filter((entry) => entry.enabled && entry.key)
        .map((entry) =>
            entry.type === 'file'
                ? `${entry.key}: [file: ${entry.fileName || 'no file selected'}]`
                : `${entry.key}=${entry.value}`
        )
        .join('\n')
}

function appendQueryData(url: string, dataParts: string[]): string {
    if (!url || dataParts.length === 0) {
        return url
    }

    const joined = dataParts.join('&')
    const parts = joined
        .split('&')
        .map((part) => part.trim())
        .filter(Boolean)

    try {
        const urlObj = new URL(url)
        for (const part of parts) {
            const eqIndex = part.indexOf('=')
            if (eqIndex >= 0) {
                urlObj.searchParams.append(part.substring(0, eqIndex), part.substring(eqIndex + 1))
            } else {
                urlObj.searchParams.append(part, '')
            }
        }
        return urlObj.toString()
    } catch {
        const separator = url.includes('?') ? '&' : '?'
        return `${url}${separator}${joined}`
    }
}

/**
 * Parse a curl command string into a structured request object.
 */
export function parseCurlCommand(curlCommand: string): ParsedCurlRequest {
    const trimmed = curlCommand.trim()

    // Strip leading "curl" (case-insensitive)
    const withoutCurl = trimmed.replace(/^curl\s*/i, '')
    const tokens = normalizeTokens(tokenize(withoutCurl))

    let method = ''
    let methodExplicit = false
    let url = ''
    const rawHeaders: Record<string, string> = {}
    const dataParts: string[] = []
    let body = ''
    let contentType = ''
    const cookieStrings: string[] = []
    const formDataEntries: FormDataEntry[] = []
    let basicAuthStr = ''
    let compressed = false
    let forceGet = false
    let forceHead = false

    let i = 0
    while (i < tokens.length) {
        const token = tokens[i]

        switch (token) {
            case '-X':
            case '--request':
                method = (tokens[++i] || 'GET').toUpperCase()
                methodExplicit = true
                break

            case '-I':
            case '--head':
                forceHead = true
                break

            case '-G':
            case '--get':
                forceGet = true
                break

            case '--url':
                url = tokens[++i] || ''
                break

            case '-H':
            case '--header': {
                const headerStr = tokens[++i] || ''
                const colonIndex = headerStr.indexOf(':')
                if (colonIndex > 0) {
                    const key = headerStr.substring(0, colonIndex).trim()
                    const value = headerStr.substring(colonIndex + 1).trim()
                    rawHeaders[key] = value
                }
                break
            }

            case '-d':
            case '--data':
            case '--data-raw':
            case '--data-binary':
            case '--data-ascii':
            case '--data-urlencode':
                dataParts.push(tokens[++i] || '')
                break

            case '-F':
            case '--form':
            case '--form-string': {
                const part = parseFormPart(tokens[++i] || '', formDataEntries.length)
                if (part) {
                    formDataEntries.push(part)
                }
                break
            }

            case '-b':
            case '--cookie':
                cookieStrings.push(tokens[++i] || '')
                break

            case '-u':
            case '--user':
                basicAuthStr = tokens[++i] || ''
                break

            case '-A':
            case '--user-agent':
                rawHeaders['User-Agent'] = tokens[++i] || ''
                break

            case '-e':
            case '--referer':
                rawHeaders['Referer'] = tokens[++i] || ''
                break

            case '--compressed':
                compressed = true
                break

            case '-L':
            case '--location':
            case '-k':
            case '--insecure':
            case '-s':
            case '--silent':
            case '-S':
            case '--show-error':
            case '-v':
            case '--verbose':
            case '-i':
            case '--include':
            case '-o':
            case '--output':
                // Skip flags we don't need (some consume next token)
                if (token === '-o' || token === '--output') {
                    i++ // skip the filename argument
                }
                break

            case '--':
                // End-of-options marker; next token is usually positional URL.
                if (!url && tokens[i + 1]) {
                    url = tokens[i + 1]
                    i++
                }
                break

            default:
                // If it looks like a URL or isn't a flag, treat as URL.
                if (!token.startsWith('-') && !url) {
                    url = token
                }
                break
        }

        i++
    }

    if (forceGet && dataParts.length > 0) {
        url = appendQueryData(url, dataParts)
    } else if (dataParts.length > 0) {
        body = dataParts.join('&')
    }

    if (formDataEntries.length > 0) {
        body = serializeFormData(formDataEntries)
        if (!contentType) {
            contentType = 'multipart/form-data'
        }
    }

    // Add Accept-Encoding if --compressed was used
    if (compressed && !Object.keys(rawHeaders).some((k) => k.toLowerCase() === 'accept-encoding')) {
        rawHeaders['Accept-Encoding'] = 'gzip, deflate, br'
    }

    // Extract content type from headers
    const contentTypeKey = Object.keys(rawHeaders).find(
        (k) => k.toLowerCase() === 'content-type'
    )
    if (contentTypeKey) {
        contentType = rawHeaders[contentTypeKey]
        delete rawHeaders[contentTypeKey]
    }

    // Extract cookie header into cookie list
    const cookieHeaderKey = Object.keys(rawHeaders).find(
        (k) => k.toLowerCase() === 'cookie'
    )
    if (cookieHeaderKey) {
        cookieStrings.push(rawHeaders[cookieHeaderKey])
        delete rawHeaders[cookieHeaderKey]
    }

    // Infer method if not explicitly set
    if (!method) {
        if (forceHead) {
            method = 'HEAD'
        } else if (body || formDataEntries.length > 0) {
            method = forceGet ? 'GET' : 'POST'
        } else {
            method = 'GET'
        }
    }

    if (!methodExplicit && forceHead) {
        method = 'HEAD'
    }

    // Handle -u / --user basic auth
    let auth: AuthConfig = { type: 'none' }
    let filteredHeaders = rawHeaders

    if (basicAuthStr) {
        const [username, ...passwordParts] = basicAuthStr.split(':')
        auth = {
            type: 'basic',
            username,
            password: passwordParts.join(':'),
        }
        filteredHeaders = rawHeaders
    } else {
        // Try to detect auth from Authorization header
        const detected = detectAuth(rawHeaders)
        auth = detected.auth
        filteredHeaders = detected.remainingHeaders
    }

    // Convert headers to the app format
    const headers: Header[] = Object.entries(filteredHeaders).map(
        ([key, value]) => ({
            key,
            value,
            enabled: true,
        })
    )

    // Parse cookies
    const cookies: Cookie[] = []
    for (const cookieStr of cookieStrings) {
        if (!cookieStr || cookieStr.startsWith('@')) {
            // Cookie jar file import is out of scope for now.
            continue
        }

        const pairs = cookieStr.split(';')
        for (const pair of pairs) {
            const eqIndex = pair.indexOf('=')
            if (eqIndex > 0) {
                cookies.push({
                    name: safeDecode(pair.substring(0, eqIndex).trim()),
                    value: safeDecode(pair.substring(eqIndex + 1).trim()),
                })
            }
        }
    }

    // Extract URL params
    const params = extractParams(url)

    // Infer content type from body if not set
    if (!contentType && body) {
        try {
            JSON.parse(body)
            contentType = 'application/json'
        } catch {
            if (body.includes('=') && !body.includes('{')) {
                contentType = 'application/x-www-form-urlencoded'
            } else {
                contentType = 'text/plain'
            }
        }
    }

    return {
        method,
        url,
        rawUrl: url,
        headers,
        params,
        body,
        contentType,
        auth,
        cookies,
        ...(formDataEntries.length > 0 ? { formDataEntries } : {}),
    }
}

/**
 * Validate whether a string looks like a curl command.
 */
export function isCurlCommand(text: string): boolean {
    const trimmed = text.trim()
    return /^curl\s/i.test(trimmed)
}
