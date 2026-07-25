import { describe, expect, it } from "vitest"
import { buildQueryString, parseUrlParams, replaceUrlQuery } from "@/utils/url"

describe("url helpers", () => {
  it("parses query params with template variables", () => {
    const params = parseUrlParams("https://httpbin.org/get?uuid={{last_uuid}}&page=1")

    expect(params).toEqual([
      { key: "uuid", value: "{{last_uuid}}", enabled: true },
      { key: "page", value: "1", enabled: true },
    ])
  })

  it("builds query string while preserving template markers", () => {
    const queryString = buildQueryString([
      { key: "uuid", value: "{{last_uuid}}", enabled: true },
      { key: "search", value: "a value", enabled: true },
    ])

    expect(queryString).toBe("uuid={{last_uuid}}&search=a%20value")
  })

  it("replaces query without losing hash fragments", () => {
    const nextUrl = replaceUrlQuery(
      "https://api.example.com/path?old=1#section-2",
      "uuid={{last_uuid}}"
    )

    expect(nextUrl).toBe("https://api.example.com/path?uuid={{last_uuid}}#section-2")
  })
})
