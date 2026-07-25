import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useUrlParams } from "@/hooks/useUrlParams"
import { URLParam } from "@/types"

describe("useUrlParams", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("parses template query parameters from URL", () => {
    const onParamsChange = vi.fn()

    renderHook(() =>
      useUrlParams(
        "https://httpbin.org/get?uuid={{last_uuid}}&page=1",
        onParamsChange,
        []
      )
    )

    vi.advanceTimersByTime(250)

    expect(onParamsChange).toHaveBeenCalledWith([
      { key: "uuid", value: "{{last_uuid}}", enabled: true },
      { key: "page", value: "1", enabled: true },
    ] satisfies URLParam[])
  })

  it("does not lose sync when callback identity changes before debounce completes", () => {
    const firstCallback = vi.fn()
    const secondCallback = vi.fn()

    const { rerender } = renderHook(
      ({ callback }) =>
        useUrlParams(
          "https://httpbin.org/get?uuid={{last_uuid}}",
          callback,
          []
        ),
      {
        initialProps: { callback: firstCallback },
      }
    )

    // Simulate rerender churn with a new callback before debounce fires.
    rerender({ callback: secondCallback })
    vi.advanceTimersByTime(250)

    expect(firstCallback).not.toHaveBeenCalled()
    expect(secondCallback).toHaveBeenCalledWith([
      { key: "uuid", value: "{{last_uuid}}", enabled: true },
    ] satisfies URLParam[])
  })

  it("retains disabled params when they are removed from the URL", () => {
    const onParamsChange = vi.fn()
    const disabledParam: URLParam = {
      key: "uuid",
      value: "{{last_uuid}}",
      enabled: false,
    }

    renderHook(() =>
      useUrlParams(
        "https://httpbin.org/get",
        onParamsChange,
        [disabledParam]
      )
    )

    vi.advanceTimersByTime(250)

    expect(onParamsChange).not.toHaveBeenCalled()
  })

  it("drops enabled params when they are removed from the URL", () => {
    const onParamsChange = vi.fn()
    const enabledParam: URLParam = {
      key: "uuid",
      value: "{{last_uuid}}",
      enabled: true,
    }

    renderHook(() =>
      useUrlParams(
        "https://httpbin.org/get",
        onParamsChange,
        [enabledParam]
      )
    )

    vi.advanceTimersByTime(250)

    expect(onParamsChange).toHaveBeenCalledWith([] satisfies URLParam[])
  })
})
