import { describe, it, expect } from "vitest"
import { parseFormDataBody, serializeFormData } from "@/components/FormDataEditor"

describe("FormDataEditor helpers", () => {
  it("parses file marker lines into file entries", () => {
    const parsed = parseFormDataBody("meta=demo\nfile2: [file: modDesc.xml]")

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "meta",
          value: "demo",
          type: "text",
          enabled: true,
        }),
        expect.objectContaining({
          key: "file2",
          type: "file",
          fileName: "modDesc.xml",
          enabled: true,
        }),
      ]),
    )
  })

  it("serializes file entries using file marker format", () => {
    const body = serializeFormData([
      {
        id: "1",
        key: "file2",
        value: "",
        type: "file",
        fileName: "modDesc.xml",
        enabled: true,
      },
    ])

    expect(body).toBe("file2: [file: modDesc.xml]")
  })
})
