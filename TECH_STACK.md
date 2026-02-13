# Technology Stack — Open Photobooth

This document records every major technology choice, why it was chosen, and what alternatives were considered. It serves as a reference for contributors and future maintainers.

---

## Runtime: Electron

**Why:** The app needs direct access to USB webcams, local printers, the filesystem, and OS-level kiosk controls (disable Alt-Tab, auto-start, hide cursor). Electron provides all of this through Chromium (for the UI) and Node.js (for system access) in a single framework with a large ecosystem and mature tooling.

**Alternatives considered:**

| Alternative         | Why not                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tauri               | Smaller binary size, but the Rust backend adds complexity for contributors. Printer and webcam access are less mature than in Electron's ecosystem. |
| NW.js               | Smaller community, fewer maintained plugins, and less active development compared to Electron.                                                      |
| Native (C# / WPF)   | Windows-only is fine for this project, but the UI development experience is slower, and finding open-source contributors is harder.                 |
| Progressive Web App | Cannot access printers silently, cannot enforce kiosk mode, cannot prevent OS-level shortcuts.                                                      |

---

## UI Framework: React

**Why:** React has the largest ecosystem, the most available contributors, and excellent TypeScript support. The component model maps naturally to the photobooth's screen-based UI. React's declarative approach keeps UI logic readable.

**Alternatives considered:**

| Alternative | Why not                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Vue         | Equally capable, but React has a larger contributor pool and more library options.             |
| Svelte      | Excellent developer experience, but smaller ecosystem and fewer contributors familiar with it. |
| Solid       | Very performant, but young ecosystem and small community.                                      |
| Vanilla JS  | No component model means more boilerplate and harder maintenance as the app grows.             |

---

## Language: TypeScript (strict mode)

**Why:** Type safety catches bugs at compile time, improves IDE support, and serves as living documentation. Strict mode (`strict: true`) prevents common pitfalls like implicit `any` and unchecked nulls. For a kiosk app that must run reliably for hours, this safety net is worth the small overhead.

**Alternatives considered:**

| Alternative             | Why not                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| JavaScript              | No type safety. Bugs that TypeScript catches at build time would surface at runtime during events. |
| TypeScript (non-strict) | Defeats much of the purpose. Strict mode is a one-time setup cost with ongoing benefits.           |

---

## Build Tooling: electron-vite (alex8088) + Vite

**Why:** `electron-vite` provides a unified Vite-based build pipeline for Electron's main process, preload scripts, and the renderer. It offers fast HMR in development, sensible defaults for Electron projects, and an official `create-electron` scaffolding tool. Vite itself is fast, modern, and well-maintained.

**Alternatives considered:**

| Alternative              | Why not                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron Forge + Webpack | Webpack is slower for development (no native ESM HMR). Forge is more opinionated about packaging, which conflicts with our electron-builder choice. |
| Electron Forge + Vite    | Forge's Vite plugin is newer and less mature than electron-vite.                                                                                    |
| Manual Vite config       | electron-vite handles the complexity of multi-target builds (main/preload/renderer) out of the box. Rolling our own would be error-prone.           |

---

## Camera API: Browser MediaDevices API

**Why:** `navigator.mediaDevices.getUserMedia()` is built into Chromium and works directly in the Electron renderer process. No native modules needed. It supports device enumeration, resolution selection, and live video preview — everything the photobooth requires.

**Alternatives considered:**

| Alternative                | Why not                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| node-webcam                | Native dependency, harder to build and distribute. Fewer features than the browser API. |
| OpenCV (via opencv4nodejs) | Massive dependency, complex build, overkill for simple frame capture.                   |
| FFmpeg                     | Good for video processing, but overly complex for live preview + frame capture.         |

---

## Printing: Electron `webContents.print()` (silent mode)

**Why:** Electron's built-in `webContents.print()` supports silent printing (no dialog), printer selection by name, and standard print options. No additional dependencies needed. It works well with the Canon SELPHY and other USB printers.

**Alternatives considered:**

| Alternative                     | Why not                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| node-printer / pdf-to-printer   | Native dependencies that are difficult to build and maintain across platforms. |
| Writing to a PDF and opening it | Requires user interaction, which breaks the kiosk flow.                        |

---

## Image Composition: Canvas 2D API

**Why:** The HTML5 Canvas API is built into Chromium and handles everything needed for strip composition: drawing images, adding borders, applying color filters, rendering text overlays. No additional dependencies. An `OffscreenCanvas` can be used in a Web Worker if performance requires it.

**Alternatives considered:**

| Alternative     | Why not                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Sharp (Node.js) | Native dependency (libvips). Harder to build and distribute. Canvas API is sufficient for our needs. |
| Jimp            | Pure JS but slow for real-time use. Canvas is hardware-accelerated.                                  |
| ImageMagick     | External binary dependency, complex to bundle.                                                       |

---

## State Management: Zustand

**Why:** Zustand is minimal, TypeScript-friendly, and requires almost no boilerplate. It provides a simple store pattern that's easy to understand for new contributors. The photobooth's state is straightforward (current screen, session state, settings) and doesn't need the ceremony of larger solutions.

_Installed in its own epic — not part of the initial scaffold._

**Alternatives considered:**

| Alternative                | Why not                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Redux Toolkit              | More boilerplate (slices, actions, reducers). Overkill for this app's state complexity.                   |
| Jotai / Recoil             | Atomic state models are powerful but add conceptual overhead for a simple app.                            |
| React Context + useReducer | Workable, but re-renders cascade through the tree. Zustand avoids this with selector-based subscriptions. |

---

## Settings Storage: electron-store

**Why:** `electron-store` provides a simple JSON-file-based key-value store with schema validation, defaults, and atomic writes. It stores settings in the OS-standard app data directory. No database setup, no server — perfect for a fully offline app.

_Installed in its own epic — not part of the initial scaffold._

**Alternatives considered:**

| Alternative                 | Why not                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| SQLite (via better-sqlite3) | Relational database is overkill for flat key-value settings. Adds a native dependency.           |
| lowdb                       | Similar concept, but electron-store is purpose-built for Electron with better defaults handling. |
| Plain JSON file (manual)    | Would need to implement atomic writes, schema validation, and defaults from scratch.             |

---

## Audio: HTML5 Audio API

**Why:** The HTML5 `Audio` object is built into Chromium. It handles playback of bundled audio files (background music, countdown beeps, shutter sound) with no dependencies. Volume control, looping, and multiple simultaneous sounds are supported natively.

**Alternatives considered:**

| Alternative   | Why not                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Howler.js     | Adds a dependency for features we don't need (spatial audio, sprites). The native API is sufficient. |
| Web Audio API | Lower-level API designed for synthesis and processing. Overkill for simple file playback.            |

---

## i18n: i18next + react-i18next

**Why:** i18next is the most widely adopted i18n framework in the JS ecosystem. It supports JSON translation files, interpolation, pluralization, and namespace separation. `react-i18next` provides React hooks (`useTranslation`) for clean component integration. Adding a new language is a matter of adding a JSON file.

_Installed in its own epic — not part of the initial scaffold._

**Alternatives considered:**

| Alternative           | Why not                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| react-intl (FormatJS) | ICU message syntax is more powerful but harder for non-developer translators to edit.     |
| Custom solution       | Would need to implement interpolation, pluralization, and React integration from scratch. |
| lingui                | Smaller community, fewer resources available.                                             |

---

## Packaging: electron-builder (Windows portable EXE)

**Why:** electron-builder supports portable EXE output (no installer required), which is ideal for a kiosk app that may be deployed by non-technical users. It has mature Windows support, handles code signing, and integrates well with CI pipelines.

**Alternatives considered:**

| Alternative       | Why not                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Electron Forge    | More opinionated about the full workflow (dev + build + publish). We only need packaging. electron-builder is more flexible. |
| electron-packager | Lower-level, requires more manual configuration for installers and platform-specific settings.                               |

---

## Testing: Vitest

**Why:** Vitest is Vite-native, which means it shares the same config and transform pipeline as the app's build tooling. It's fast, supports TypeScript out of the box, and has a Jest-compatible API (easy for contributors to pick up). Built-in coverage via `@vitest/coverage-v8`.

**Alternatives considered:**

| Alternative          | Why not                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Jest                 | Requires separate TypeScript transform config (ts-jest or babel). Slower startup. Does not share Vite's config. |
| Playwright / Cypress | E2E testing tools, not unit/integration test runners. May be added later for E2E tests.                         |

---

## Linting & Formatting: ESLint (flat config) + Prettier

**Why:** ESLint catches code quality issues and potential bugs. Prettier enforces consistent formatting. Together, they eliminate style debates and catch errors before runtime. Flat config (eslint.config.mjs) is ESLint's modern configuration format.

**Alternatives considered:**

| Alternative                         | Why not                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Biome                               | Promising all-in-one tool, but younger ecosystem and less plugin support.          |
| ESLint only (with formatting rules) | ESLint's formatting rules are deprecated. Prettier is the standard for formatting. |
| dprint                              | Fast, but less community adoption and plugin ecosystem than Prettier.              |

---

## Pre-commit Hooks: husky + lint-staged

**Why:** husky manages Git hooks. lint-staged runs linters only on staged files, keeping pre-commit fast. Together, they prevent unlinted or unformatted code from being committed, maintaining code quality without manual discipline.

**Alternatives considered:**

| Alternative         | Why not                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| lefthook            | Capable, but husky is more widely known and has more community resources. |
| simple-git-hooks    | Simpler, but lint-staged integration is less documented.                  |
| No pre-commit hooks | Relies on contributors remembering to lint. They won't always.            |
