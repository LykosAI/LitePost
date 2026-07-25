# Settings

LitePost settings let you customize the application theme, configure JSON response display behavior, and manage updates.

## Accessing Settings

Click the **gear icon** in the title bar (top-right area, next to the window controls) to open the settings panel. It slides in from the right side of the window.

## Theme

LitePost ships with four built-in color themes. Selecting a theme applies it immediately -- no restart required.

| Theme        | Description                              |
|--------------|------------------------------------------|
| **Sapphire** | Blue-to-indigo gradient (default)        |
| **Emerald**  | Emerald-to-teal gradient                 |
| **Amethyst** | Violet-to-purple gradient                |
| **Obsidian** | Zinc-to-dark-zinc gradient (near-black)  |

Each theme controls the primary accent color, gradient accents, and various UI highlights across the entire application. The active theme is indicated by a highlighted ring around its color swatch in the settings panel.

## JSON Viewer

These settings control how JSON responses are rendered in the collapsible tree viewer. Adjusting them is useful when working with large or deeply nested API responses.

### Max Auto-Expand Depth

How many levels deep the JSON tree automatically expands when a response is first displayed.

- **Default:** 2
- **Range:** 0 -- 10
- Set to 0 to collapse everything by default. Set higher to see more of the response structure without manual expanding.

### Max Auto-Expand Array Size

Arrays with more elements than this threshold are collapsed by default, showing only a summary line (e.g., `Array(150)`).

- **Default:** 50
- **Range:** 0 -- 200 (step: 10)

### Max Auto-Expand Object Size

Objects with more properties than this threshold are collapsed by default.

- **Default:** 20
- **Range:** 0 -- 100 (step: 5)

::: tip
If you frequently work with large payloads, lowering these thresholds can significantly improve rendering performance and make it easier to navigate responses.
:::

## Updates

LitePost can check for updates both automatically and manually.

### Automatic Checks

The application checks for updates on startup and then once every 24 hours while running. No action is needed to enable this -- it happens by default.

### Manual Check

In the settings panel, click **Check Now** in the Updates section to trigger an immediate check. If a new version is found, a toast notification appears with:

- The new version number
- Release notes (when available)
- An **Install Now** button that downloads and installs the update with a progress indicator, then relaunches the app

If you are already on the latest version, a confirmation toast is shown instead.

## Keyboard Shortcuts

| Shortcut                         | Action               |
|----------------------------------|----------------------|
| `Ctrl+I` (Windows/Linux)        | Open cURL import modal |
| `Cmd+I` (macOS)                 | Open cURL import modal |

## Data Storage

All application data -- collections, environments, settings, and theme preferences -- is stored locally on your machine as JSON files managed by the [Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/). Nothing is sent to any external server.
