import { CSSProperties, ComponentType, useEffect, useMemo, useState } from "react"
import { useThemeStore } from "@/store/theme"

type SyntaxHighlighterComponent = ComponentType<{
  language?: string
  style?: Record<string, CSSProperties>
  customStyle?: CSSProperties
  wrapLongLines?: boolean
  children: string
}>

type PrismLightComponent = SyntaxHighlighterComponent & {
  registerLanguage?: (name: string, syntax: unknown) => void
}

export type SyntaxHighlighterVariant =
  | "response-body"
  | "response-details"
  | "code-snippet"
  | "test-editor"

interface LazySyntaxHighlighterProps {
  language?: string
  variant: SyntaxHighlighterVariant
  wrapLongLines?: boolean
  children: string
  fallbackClassName?: string
}

let loadedHighlighter: SyntaxHighlighterComponent | null = null
let loadedStyles: { dark: Record<string, CSSProperties>; light: Record<string, CSSProperties> } | null = null
let loadPromise: Promise<void> | null = null

const styleCache = new Map<
  string,
  {
    style: Record<string, CSSProperties>
    customStyle: CSSProperties
  }
>()

function buildStyles(
  variant: SyntaxHighlighterVariant,
  oneDark: Record<string, CSSProperties>,
  cacheKey: string,
) {
  const cached = styleCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const transparentPre = {
    ...(oneDark["pre[class*=\"language-\"]"] || {}),
    background: "transparent",
    margin: 0,
    padding: 0,
  }

  const transparentCode = {
    ...(oneDark["code[class*=\"language-\"]"] || {}),
    background: "transparent",
  }

  const transparentToken = {
    ...(oneDark["token"] || {}),
    background: "transparent",
  }

  let style: Record<string, CSSProperties>
  let customStyle: CSSProperties

  if (variant === "response-body") {
    style = {
      ...oneDark,
      "code[class*=\"language-\"]": {
        ...transparentCode,
        background: "none",
      },
      "pre[class*=\"language-\"]": {
        ...transparentPre,
        background: "none",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        overflowWrap: "anywhere",
      },
    }
    customStyle = {
      margin: 0,
      padding: "0.25rem",
      background: "transparent",
      fontSize: "0.8125rem",
      minWidth: "auto",
      wordBreak: "break-all",
      overflowWrap: "anywhere",
      whiteSpace: "pre-wrap",
    }
  } else if (variant === "response-details") {
    style = {
      ...oneDark,
      "pre[class*=\"language-\"]": transparentPre,
      "code[class*=\"language-\"]": transparentCode,
    }
    customStyle = {
      margin: 0,
      padding: "0.25rem",
      background: "transparent",
      fontSize: "0.8125rem",
      minWidth: "auto",
      wordBreak: "break-all",
    }
  } else if (variant === "code-snippet") {
    style = {
      ...oneDark,
      "pre[class*=\"language-\"]": transparentPre,
      "code[class*=\"language-\"]": transparentCode,
      "pre > code": {
        ...(oneDark["pre > code"] || {}),
        background: "transparent",
      },
      token: transparentToken,
    }
    customStyle = {
      background: "transparent",
      fontSize: "inherit",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      overflowWrap: "break-word",
    }
  } else {
    style = {
      ...oneDark,
      "pre[class*=\"language-\"]": transparentPre,
      "code[class*=\"language-\"]": transparentCode,
      token: {
        ...transparentToken,
        background: "transparent !important",
      },
      "token.operator": {
        ...(oneDark["token.operator"] || {}),
        background: "transparent !important",
      },
      "token.string": {
        ...(oneDark["token.string"] || {}),
        background: "transparent !important",
      },
    }
    customStyle = {
      margin: 0,
      padding: 0,
      background: "transparent",
      fontSize: "inherit",
    }
  }

  const resolved = { style, customStyle }
  styleCache.set(cacheKey, resolved)
  return resolved
}

async function ensureLoaded(): Promise<void> {
  if (loadedHighlighter && loadedStyles) {
    return
  }

  if (!loadPromise) {
    loadPromise = Promise.all([
      import("react-syntax-highlighter/dist/esm/prism-light"),
      import("react-syntax-highlighter/dist/esm/styles/prism"),
      import("react-syntax-highlighter/dist/esm/languages/prism/bash"),
      import("react-syntax-highlighter/dist/esm/languages/prism/python"),
      import("react-syntax-highlighter/dist/esm/languages/prism/javascript"),
      import("react-syntax-highlighter/dist/esm/languages/prism/csharp"),
      import("react-syntax-highlighter/dist/esm/languages/prism/go"),
      import("react-syntax-highlighter/dist/esm/languages/prism/ruby"),
      import("react-syntax-highlighter/dist/esm/languages/prism/markup"),
    ]).then(([
      syntaxHighlighterModule,
      styleModule,
      bashLanguageModule,
      pythonLanguageModule,
      javascriptLanguageModule,
      csharpLanguageModule,
      goLanguageModule,
      rubyLanguageModule,
      markupLanguageModule,
    ]) => {
      const PrismLight = syntaxHighlighterModule.default as PrismLightComponent
      PrismLight.registerLanguage?.("bash", bashLanguageModule.default)
      PrismLight.registerLanguage?.("python", pythonLanguageModule.default)
      PrismLight.registerLanguage?.("javascript", javascriptLanguageModule.default)
      PrismLight.registerLanguage?.("csharp", csharpLanguageModule.default)
      PrismLight.registerLanguage?.("go", goLanguageModule.default)
      PrismLight.registerLanguage?.("ruby", rubyLanguageModule.default)
      PrismLight.registerLanguage?.("markup", markupLanguageModule.default)

      loadedHighlighter = PrismLight as SyntaxHighlighterComponent
      loadedStyles = {
        dark: styleModule.oneDark as Record<string, CSSProperties>,
        light: styleModule.oneLight as Record<string, CSSProperties>,
      }
    })
  }

  await loadPromise
}

export function LazySyntaxHighlighter({
  language,
  variant,
  wrapLongLines = false,
  children,
  fallbackClassName = "text-sm font-mono whitespace-pre-wrap break-all text-foreground",
}: LazySyntaxHighlighterProps) {
  const { color } = useThemeStore()
  const mode = color === "schematic" ? "light" : "dark"
  const [isReady, setIsReady] = useState(Boolean(loadedHighlighter && loadedStyles))

  useEffect(() => {
    if (isReady) {
      return
    }

    let cancelled = false

    ensureLoaded()
      .then(() => {
        if (!cancelled) {
          setIsReady(true)
        }
      })
      .catch(() => {
        // Keep fallback rendering when dynamic import fails.
      })

    return () => {
      cancelled = true
    }
  }, [isReady])

  const styles = useMemo(() => {
    if (!loadedStyles) {
      return null
    }

    return buildStyles(variant, loadedStyles[mode], `${variant}:${mode}`)
    // isReady looks unused here but is load-bearing: loadedStyles is a
    // module-level mutable filled in by the dynamic import, and isReady
    // flipping is the only signal that it is now populated. Drop it and this
    // memo keeps returning the null it computed on the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, isReady, mode])

  if (!isReady || !loadedHighlighter || !styles) {
    return <pre data-testid="syntax-highlighter" className={fallbackClassName}>{children}</pre>
  }

  const SyntaxHighlighter = loadedHighlighter

  return (
    <SyntaxHighlighter
      language={language}
      style={styles.style}
      customStyle={styles.customStyle}
      wrapLongLines={wrapLongLines}
    >
      {children}
    </SyntaxHighlighter>
  )
}
