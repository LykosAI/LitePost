import type { editor as MonacoEditor } from 'monaco-editor'
import type { ThemeColor } from '@/store/theme'

interface MonacoThemeColors {
  editorBg: string
  lineHighlight: string
  selection: string
  cursor: string
  lineNumber: string
  lineNumberActive: string
  indentGuide: string
  indentGuideActive: string
  bracketBg: string
  bracketBorder: string
  widgetBg: string
  widgetBorder: string
}

interface MonacoThemeTokens {
  key: string
  string: string
  number: string
  keyword: string
  comment: string
  delimiter: string
}

export const themeConfigs: Record<
  ThemeColor,
  { colors: MonacoThemeColors; tokens: MonacoThemeTokens; base?: 'vs' | 'vs-dark'; foreground?: string }
> = {
  schematic: {
    base: 'vs',
    foreground: '#17261f',
    colors: {
      editorBg: '#fbfcf9',
      lineHighlight: '#dbe0d640',
      selection: '#2549d825',
      cursor: '#2549d8',
      lineNumber: '#a9b3aa',
      lineNumberActive: '#6d7a70',
      indentGuide: '#e3e7de',
      indentGuideActive: '#c9d1c5',
      bracketBg: '#2549d815',
      bracketBorder: '#2549d840',
      widgetBg: '#f2f4ef',
      widgetBorder: '#dbe0d6',
    },
    tokens: {
      key: '2549d8',
      string: 'a3541c',
      number: '17701f',
      keyword: '2549d8',
      comment: '8a958b',
      delimiter: '6d7a70',
    },
  },
  amber: {
    colors: {
      editorBg: '#161318',
      lineHighlight: '#26222940',
      selection: '#ffb45430',
      cursor: '#ffb454',
      lineNumber: '#57524b',
      lineNumberActive: '#a39a8d',
      indentGuide: '#26222a',
      indentGuideActive: '#332e37',
      bracketBg: '#ffb45420',
      bracketBorder: '#ffb45450',
      widgetBg: '#1a171c',
      widgetBorder: '#2b272e',
    },
    tokens: {
      key: 'e8b86d',
      string: '9ece8f',
      number: '6fc2ff',
      keyword: 'ffb454',
      comment: '6b6560',
      delimiter: 'a39a8d',
    },
  },
  blue: {
    colors: {
      editorBg: '#0c1524',
      lineHighlight: '#1e293b40',
      selection: '#3b82f640',
      cursor: '#60a5fa',
      lineNumber: '#4b5563',
      lineNumberActive: '#9ca3af',
      indentGuide: '#1e293b',
      indentGuideActive: '#334155',
      bracketBg: '#3b82f620',
      bracketBorder: '#3b82f660',
      widgetBg: '#111827',
      widgetBorder: '#1f2937',
    },
    tokens: {
      key: '6ee7b7',
      string: '93c5fd',
      number: 'fbbf24',
      keyword: 'c4b5fd',
      comment: '6b7280',
      delimiter: '9ca3af',
    },
  },
  green: {
    colors: {
      editorBg: '#0a1610',
      lineHighlight: '#16291f40',
      selection: '#22c55e30',
      cursor: '#4ade80',
      lineNumber: '#3f5f4a',
      lineNumberActive: '#86a38f',
      indentGuide: '#16291f',
      indentGuideActive: '#1e3a28',
      bracketBg: '#22c55e20',
      bracketBorder: '#22c55e50',
      widgetBg: '#0d1a12',
      widgetBorder: '#1a2e20',
    },
    tokens: {
      key: '86efac',
      string: '6ee7b7',
      number: 'fbbf24',
      keyword: 'a5f3fc',
      comment: '5f7a68',
      delimiter: '86a38f',
    },
  },
  purple: {
    colors: {
      editorBg: '#120c1f',
      lineHighlight: '#2d1f4740',
      selection: '#a855f740',
      cursor: '#c084fc',
      lineNumber: '#5c4680',
      lineNumberActive: '#a78bfa',
      indentGuide: '#221640',
      indentGuideActive: '#352460',
      bracketBg: '#a855f720',
      bracketBorder: '#a855f750',
      widgetBg: '#170e2a',
      widgetBorder: '#2a1a4a',
    },
    tokens: {
      key: 'c4b5fd',
      string: 'f0abfc',
      number: 'fbbf24',
      keyword: 'a5b4fc',
      comment: '7c6c9a',
      delimiter: 'a78bfa',
    },
  },
  black: {
    colors: {
      editorBg: '#080808',
      lineHighlight: '#ffffff08',
      selection: '#ffffff20',
      cursor: '#e5e5e5',
      lineNumber: '#404040',
      lineNumberActive: '#808080',
      indentGuide: '#1a1a1a',
      indentGuideActive: '#2a2a2a',
      bracketBg: '#ffffff10',
      bracketBorder: '#ffffff30',
      widgetBg: '#0d0d0d',
      widgetBorder: '#222222',
    },
    tokens: {
      key: 'e5e5e5',
      string: 'a3a3a3',
      number: 'fbbf24',
      keyword: 'd4d4d4',
      comment: '525252',
      delimiter: '737373',
    },
  },
}

export function buildMonacoTheme(themeColor: ThemeColor): MonacoEditor.IStandaloneThemeData {
  const config = themeConfigs[themeColor]
  const { colors: c, tokens: t } = config
  const foreground = config.foreground ?? '#d1d5db'

  return {
    base: config.base ?? 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: t.key },
      { token: 'string.value.json', foreground: t.string },
      { token: 'number', foreground: t.number },
      { token: 'keyword', foreground: t.keyword },
      { token: 'keyword.constant', foreground: t.keyword },
      { token: 'string', foreground: t.string },
      { token: 'comment', foreground: t.comment },
      { token: 'delimiter', foreground: t.delimiter },
      { token: 'variable', foreground: t.key },
      { token: 'annotation', foreground: t.number },
      { token: 'type.identifier', foreground: t.key },
      { token: 'identifier', foreground: foreground.replace('#', '') },
    ],
    colors: {
      'editor.background': c.editorBg,
      'editor.foreground': foreground,
      'editor.lineHighlightBackground': c.lineHighlight,
      'editor.selectionBackground': c.selection,
      'editor.inactiveSelectionBackground': c.selection.replace(/40$/, '20'),
      'editorCursor.foreground': c.cursor,
      'editorLineNumber.foreground': c.lineNumber,
      'editorLineNumber.activeForeground': c.lineNumberActive,
      'editorIndentGuide.background': c.indentGuide,
      'editorIndentGuide.activeBackground': c.indentGuideActive,
      'editorBracketMatch.background': c.bracketBg,
      'editorBracketMatch.border': c.bracketBorder,
      'editor.findMatchBackground': '#fbbf2440',
      'editor.findMatchHighlightBackground': '#fbbf2420',
      'editorWidget.background': c.widgetBg,
      'editorWidget.border': c.widgetBorder,
      'input.background': c.widgetBorder,
      'input.border': c.widgetBorder,
      'dropdown.background': c.widgetBg,
      'dropdown.border': c.widgetBorder,
      'list.activeSelectionBackground': c.selection,
      'list.hoverBackground': c.lineHighlight,
      'minimap.background': c.editorBg,
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': c.lineNumber + '40',
      'scrollbarSlider.hoverBackground': c.lineNumber + '60',
      'scrollbarSlider.activeBackground': c.lineNumber + '80',
      'editorSuggestWidget.background': c.widgetBg,
      'editorSuggestWidget.border': c.widgetBorder,
      'editorSuggestWidget.selectedBackground': c.selection,
    },
  }
}

let themesRegistered = false

/**
 * Ensure all LitePost Monaco themes are defined. Safe to call multiple times.
 */
export function ensureMonacoThemes(monacoInstance: typeof import('monaco-editor')) {
  if (themesRegistered) return
  themesRegistered = true

  for (const name of Object.keys(themeConfigs)) {
    monacoInstance.editor.defineTheme(
      `litepost-${name}`,
      buildMonacoTheme(name as ThemeColor),
    )
  }
}
