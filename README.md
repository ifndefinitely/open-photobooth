# Open Photobooth

A free and open-source, fully offline photobooth desktop application. Captures photos from a USB webcam, assembles them into a classic photobooth strip, and prints on a USB printer.

Built with Electron, React, and TypeScript. See [TECH_STACK.md](TECH_STACK.md) for detailed technology decisions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm (comes with Node.js)

### Install Dependencies

```bash
npm install
```

This will install all dependencies and apply patches (including a multi-threaded compression patch for faster builds).

### Development

```bash
npm run dev
```

This starts the Electron app with hot module replacement (HMR) for the renderer process and auto-restart for the main process.

- **Ctrl+Q** (or **Cmd+Q** on macOS) quits the app in development mode.
- DevTools open automatically in a detached window.
- On Linux, the app runs in a large window instead of fullscreen for easier development.

### Scripts

| Script                    | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `npm run dev`             | Start development server with HMR                           |
| `npm run build`           | Type-check and build for production                         |
| `npm start`               | Preview the production build                                |
| `npm run lint`            | Run ESLint                                                  |
| `npm run format`          | Format code with Prettier                                   |
| `npm run format:check`    | Check formatting without modifying files                    |
| `npm test`                | Run tests                                                   |
| `npm run test:watch`      | Run tests in watch mode                                     |
| `npm run test:coverage`   | Run tests with coverage report                              |
| `npm run typecheck`       | Run TypeScript type checking                                |
| `npm run package`         | Build and package for Windows (normal compression, ~150 MB) |
| `npm run package:dir`     | Build and package (unpacked, fastest for testing)           |
| `npm run package:release` | Build and package (same as package, kept for compatibility) |

### Build Performance

The project includes a patch for `app-builder-lib` that enables **multi-threaded compression** using 7zip's `-mmt` flag and **LZMA2 compression method** for better multicore utilization. This significantly speeds up the compression phase during packaging.

- **`npm run package`** uses normal compression with multi-threading (default, ~150 MB)
- **`npm run package:dir`** creates an unpacked build (no installer, fastest for testing)

**Environment variables for customization:**

- `ELECTRON_BUILDER_7Z_THREADS` - thread count (default: `on` = all cores; use `4`, `8`, etc. for specific count)
- `ELECTRON_BUILDER_COMPRESSION_METHOD` - compression algorithm (default: `LZMA2`; alternatives: `BZip2`, `LZMA`)

Examples:

```bash
ELECTRON_BUILDER_7Z_THREADS=4 npm run package
ELECTRON_BUILDER_COMPRESSION_METHOD=BZip2 npm run package
```

### Project Structure

```
src/
  main/                     # Electron main process
    index.ts
  preload/                  # Context bridge (preload scripts)
    index.ts
    index.d.ts
  renderer/                 # React application (renderer process)
    index.html
    src/
      App.tsx               # Root component
      main.tsx              # React entry point
      screens/              # Screen-level components
      components/           # Shared UI components
      services/             # Business logic services
      assets/               # Static assets (audio, images, fonts)
      i18n/                 # Internationalization files
      styles/               # Global styles
  shared/                   # Types and constants shared between processes
tests/                      # Test files
scripts/                    # Build and utility scripts
build/                      # Electron-builder resources (icons)
resources/                  # App resources bundled with Electron
docs/                       # Project documentation and epics
```

## Documentation

See the [docs/](docs/) directory for full project documentation, including the project overview, epics, and implementation stories.

## License

[AGPL-3.0](LICENSE)
