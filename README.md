# LitePost

A lightweight, cross-platform API testing application built with Tauri, React, and TypeScript.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (v8 or later)
- [Rust](https://www.rust-lang.org/) (latest stable)
- Platform-specific dependencies for Tauri:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential`, `libwebkit2gtk-4.0-dev`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/LykosAI/LitePost.git
   cd LitePost
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm tauri dev
   ```

## Building for Production

To create a production build:
```bash
pnpm tauri build
```

The built applications will be available in `src-tauri/target/release/bundle/`.

## Project Structure

```
litepost/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── src-tauri/             # Rust backend source
│   ├── src/               # Rust source code
│   └── capabilities/      # Tauri capability configurations
└── public/                # Static assets
```

## Features 🚀

- 🎨 Modern, native UI built with React, Tailwind CSS, and Shadcn UI
- 💻 Cross-platform support (Windows, macOS, Linux)

### Request & Authentication 🔐
- Multiple request tabs with history
- Authentication support:
  - Basic Auth
  - Bearer Token
  - API Key (header and query parameter)
- Custom request headers and parameters
- 📝 Code generation for multiple languages (curl, Python, JavaScript, C#, Go, Ruby)

### Response Handling 📊
- Advanced response visualization:
  - ✨ JSON prettification with syntax highlighting
  - 📄 XML formatting
  - 🌐 HTML preview
  - 🖼️ Image preview
- Response metrics:
  - 📏 Size measurements
  - ⚡ Request/response timing
  - 📈 Network timing breakdown (DNS, First byte, Download time)

### Environment Management 🌍
- Create, edit, and delete environments
- Variable substitution
- Environment switching
- Environment-specific variables

### Collections 📁
- Save and organize requests in collections
- Basic folder organization
- Import/export collections
- Postman format compatibility

### Testing ✅
- JavaScript-based test scripts
- Comprehensive test assertions:
  - Status code validation
  - JSON value verification
  - Header checks
  - Response time validation
- Test execution with results display

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License ⚖️

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). This means:

- You can use this software for any purpose
- You can modify this software
- You can distribute this software
- You must include the license and copyright notice with each copy
- You must disclose your source code when you distribute the software
- You must state changes made to the code
- If you use this software over a network, you must make your modified version available to users of that network

See the [LICENSE](LICENSE) file for the full license text.