# Contributing

This guide covers how to set up a local development environment, run tests, and submit changes to LitePost.

## Prerequisites

### All Platforms

- [Node.js](https://nodejs.org/) v18 or later
- [pnpm](https://pnpm.io/) v8 or later
- [Rust](https://www.rust-lang.org/tools/install) (latest stable toolchain)

### Windows

- Microsoft Visual Studio C++ Build Tools (install via the [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/) -- select the "Desktop development with C++" workload)

### macOS

- Xcode Command Line Tools (install with `xcode-select --install`)

### Linux

Install the required system libraries:

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  libwebkit2gtk-4.0-dev \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## Development Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/LitePost.git
   cd LitePost
   ```

2. Install frontend dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm tauri dev
   ```

   This launches both the Vite dev server (with hot-reload for the React frontend) and the Tauri application window. Rust backend changes trigger an automatic rebuild of the native binary.

## Building for Production

```bash
pnpm tauri build
```

Platform-specific installers and bundles are written to `src-tauri/target/release/bundle/`.

## Project Structure

```
LitePost/
  src/                  React frontend
    components/         UI components (request panel, response panel, auth, etc.)
    hooks/              Custom React hooks (useRequest, useStreamingResponse, useTabs)
    store/              Zustand stores (environments, settings, theme)
    utils/              Utility functions (cURL parser, streaming, persistence)
    types/              Shared TypeScript type definitions
    test/               Test files (Vitest + React Testing Library)
  src-tauri/            Rust backend
    src/
      lib.rs            Tauri command definitions
      http_client.rs    HTTP request execution
      models.rs         Shared Rust types
      network_utils.rs  Network helper functions
  docs/                 Documentation (VitePress)
```

## Running Tests

Tests use [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/). Test files live in `src/test/`.

| Command                | Description                        |
|------------------------|------------------------------------|
| `pnpm test`            | Run all tests                      |
| `pnpm test:watch`      | Run tests in watch mode            |
| `pnpm test:coverage`   | Generate a coverage report         |
| `pnpm test:run`        | Run all tests once (CI-friendly)   |
| `pnpm test:ui`         | Open the Vitest UI                 |

## Contributing Workflow

1. **Fork** the repository on GitHub.
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/my-change
   ```
3. **Make your changes.** Follow existing code style and patterns. Keep commits focused.
4. **Run tests** to make sure nothing is broken:
   ```bash
   pnpm test:run
   ```
5. **Open a pull request** against `main` on [github.com/LykosAI/LitePost](https://github.com/LykosAI/LitePost). Include a clear description of what your change does and why.

## Documentation

The docs site is built with [VitePress](https://vitepress.dev/). To preview documentation changes locally:

```bash
pnpm docs:dev
```

This starts a local dev server with hot-reload at `http://localhost:5173`.

## License

LitePost is licensed under the [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html). By contributing, you agree that your contributions will be licensed under the same terms.
