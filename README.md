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
├── src/                     # React frontend source
│   ├── components/          # React components
│   │   └── ui/              # Reusable UI components (shadcn/ui)
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand state management
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── test/                # Test files
├── src-tauri/               # Rust backend source
│   ├── src/                 # Rust source code
│   └── capabilities/        # Tauri capability configurations
├── public/                  # Static assets
├── coverage/                # Test coverage reports
└── dist/                    # Production build output
```

Key directories:
- `src/components/`: React components organized by feature
- `src/hooks/`: Custom hooks for API requests, state management, etc.
- `src/store/`: Zustand stores for collections, environments, and settings
- `src/test/`: Unit tests using Vitest and React Testing Library
- `src-tauri/`: Rust backend with HTTP client and file system operations

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

## Testing 🧪

The project uses Vitest for testing. Here are the available test commands:

```bash
# Run all tests
pnpm test

# Run tests in watch mode (useful during development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests for a specific file
pnpm test RequestUrlBar
```

The test suite currently includes:
- Unit tests for React components using React Testing Library
- Component mocking (e.g., Radix UI components)
- Event handling tests
- State management tests
- Coverage reporting with v8

Coverage reports can be found in:
- Terminal output (text format)
- `coverage/` directory (HTML and JSON formats)

### Planned Test Improvements 🎯

We plan to add:
- Integration tests for API request/response flows
- End-to-end tests for critical user journeys
- Performance testing for large responses
- Cross-platform compatibility tests

### Writing Tests 📝

Tests are located in `src/test/` and follow the naming convention `*.test.tsx`. Each test file should:
- Import necessary testing utilities from `vitest` and `@testing-library/react`
- Mock external dependencies when needed
- Use React Testing Library's best practices for component testing

Example test structure:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YourComponent } from '@/components/YourComponent'

describe('YourComponent', () => {
  interface SetupOptions {
    initialValue?: string
    isDisabled?: boolean
  }

  const setup = (options: SetupOptions = {}) => {
    const user = userEvent.setup()
    const props = {
      value: options.initialValue || '',
      isDisabled: options.isDisabled || false,
      onChange: vi.fn(),
      onSubmit: vi.fn(),
    }

    const utils = render(<YourComponent {...props} />)

    return {
      user,
      ...utils,
      ...props,
    }
  }

  it('renders with default props', () => {
    setup()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('handles user input and submission', async () => {
    const { user, onChange, onSubmit } = setup()
    
    const input = screen.getByRole('textbox')
    const button = screen.getByRole('button')
    
    await user.type(input, 'Hello')
    expect(onChange).toHaveBeenCalledWith('Hello')
    
    await user.click(button)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('respects disabled state', () => {
    setup({ isDisabled: true })
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```
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