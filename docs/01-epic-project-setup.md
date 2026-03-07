# Epic 01: Technology Selection & Project Setup

## Description

Before any feature work begins, the team must select the technology stack, set up the project structure, configure tooling, and establish development conventions. This epic produces a runnable "hello world" application skeleton with build, lint, test, and packaging pipelines configured.

**Dependencies:** None (this is the first epic).

---

## Technology Decisions to Make

### Decision 1: Application Framework / Runtime

The app needs to run as a native desktop application on Windows 11 with access to USB peripherals (camera, printer) and OS-level capabilities (kiosk mode, auto-start, prevent sleep).

| Option                            | Pros                                                                                                                                                                                 | Cons                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Electron** (Node.js + Chromium) | Mature ecosystem, massive community, excellent camera/media APIs via Chromium, rich UI via HTML/CSS, many packaging tools (electron-builder, electron-forge), proven for kiosk apps. | Large bundle size (~150MB+), higher memory usage, Chromium overhead.                                                             |
| **Tauri** (Rust + system WebView) | Much smaller bundle (~10–20MB), lower memory, Rust backend for performance, uses system WebView2 (built into Win11).                                                                 | Younger ecosystem, fewer community examples for kiosk/printer use cases, WebView2 quirks, Rust learning curve for backend logic. |
| **Qt / QML** (C++ or Python)      | Native performance, good hardware access, cross-platform.                                                                                                                            | Steeper UI development curve, less flexible styling than HTML/CSS, licensing considerations (GPL/commercial).                    |

**Questions to discuss:**

- Do you have a preference for or experience with any of these frameworks?
- Is bundle size a significant concern given the target is a dedicated tablet?
- Are you comfortable with Rust (for Tauri) or do you prefer staying in the JavaScript/TypeScript ecosystem?

---

### Decision 2: UI Library / Framework

| Option                  | Pros                                                                | Cons                                                                  |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **React**               | Largest ecosystem, most community components, well-known.           | Slightly more boilerplate, larger bundle vs. alternatives.            |
| **Vue**                 | Simpler API, great single-file components, good for smaller teams.  | Smaller ecosystem than React for desktop-specific components.         |
| **Svelte**              | Smallest runtime, fast, simple syntax, compiles away the framework. | Smaller ecosystem, fewer pre-built component libraries.               |
| **Vanilla HTML/CSS/JS** | No framework overhead, full control.                                | More manual state management, harder to maintain as complexity grows. |

**Questions to discuss:**

- Do you have frontend framework experience or a preference?
- How important is having access to pre-built UI component libraries?

---

### Decision 3: Programming Language

| Option         | Pros                                                                    | Cons                                           |
| -------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| **TypeScript** | Type safety, better IDE support, catches bugs early, industry standard. | Compilation step, slightly more setup.         |
| **JavaScript** | No compilation, simpler setup, lower barrier.                           | No type checking, harder to maintain at scale. |

**Questions to discuss:**

- Are you comfortable with TypeScript, or do you prefer plain JavaScript?

---

### Decision 4: Camera API

| Option                                         | Pros                                                                                                 | Cons                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Browser MediaDevices API** (`getUserMedia`)  | Built into Chromium/WebView, well-documented, supports video preview natively, resolution selection. | Limited advanced camera controls depending on browser.          |
| **Native USB library** (e.g., libusb bindings) | Full hardware control.                                                                               | Complex, unnecessary for a standard UVC webcam like Razer Kiyo. |
| **FFmpeg-based capture**                       | Powerful, flexible, supports many devices.                                                           | Complex integration, overkill for preview + snapshot.           |

**Recommendation:** Browser MediaDevices API is the clear choice for a UVC webcam.

**Questions to discuss:**

- Do you need any advanced camera controls beyond resolution, brightness, contrast, saturation, and mirror/flip?

---

### Decision 5: Printing API

| Option                                           | Pros                                                                                                 | Cons                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **OS print dialog / silent print via framework** | Electron: `webContents.print()` with silent mode. Tauri: system print command. Leverages OS drivers. | Less fine-grained control over printer-specific features.       |
| **Direct printer communication** (IPP, USB raw)  | Full control over print jobs.                                                                        | Complex, Canon SELPHY supports standard drivers so unnecessary. |
| **Generate PDF then print**                      | Clean separation, PDF as intermediate format, can preview what prints.                               | Extra step, but good abstraction.                               |

**Questions to discuss:**

- Is the Canon SELPHY connected via USB and does it appear as a standard Windows printer (accessible via Windows Settings > Printers)?
- Do you need to support printers other than Canon SELPHY in the future?

---

### Decision 6: Image Composition (Strip Generation)

| Option                                            | Pros                                                                                                    | Cons                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Canvas 2D API**                                 | Direct pixel-level control, fast, well-supported, can composite images, text, borders programmatically. | More manual layout code.                                                  |
| **HTML/CSS to image** (html-to-canvas or similar) | Use the DOM to lay out the strip, then capture to image.                                                | Dependent on rendering engine quirks, can be slow.                        |
| **Server-side image library** (Sharp, Jimp)       | Powerful image processing.                                                                              | Adds dependency, unnecessary when Canvas 2D is available in the renderer. |

**Questions to discuss:**

- Any preference on image processing approach?

---

### Decision 7: State Management

| Option                                                           | Pros                                             | Cons                                     |
| ---------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| **Framework built-in** (React Context, Vue Pinia, Svelte stores) | Simple, no extra dependency.                     | May become unwieldy for complex state.   |
| **Lightweight library** (Zustand, Jotai)                         | Structured, scalable, minimal overhead.          | Extra dependency.                        |
| **Full library** (Redux, MobX)                                   | Very structured, excellent devtools, middleware. | Heavier, possibly overkill for this app. |

**Questions to discuss:**

- The app has a fairly linear flow. A lightweight approach is likely sufficient. Any preference?

---

### Decision 8: Persistent Settings Storage

| Option                                     | Pros                                                      | Cons                                              |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------- |
| **JSON file on disk**                      | Simple, human-readable, easy to back up.                  | No schema validation out of the box.              |
| **SQLite**                                 | Structured queries, good for gallery metadata.            | Heavier dependency for simple key-value settings. |
| **Wrapper library** (electron-store, conf) | Handles file I/O, schema validation, defaults, migration. | Framework-specific.                               |

**Questions to discuss:**

- Are you open to a JSON file for settings and a file-system-based approach for the gallery?

---

### Decision 9: Audio

| Option              | Pros                                       | Cons                         |
| ------------------- | ------------------------------------------ | ---------------------------- |
| **HTML5 Audio API** | Built-in, simple, supports MP3/OGG/WAV.    | Limited mixing capabilities. |
| **Web Audio API**   | Full control over mixing, timing, effects. | More complex API.            |

**Recommendation:** HTML5 Audio for music playback, Web Audio API only if advanced mixing is needed (e.g., crossfading music with countdown beeps simultaneously).

---

### Decision 10: Internationalization

| Option                                        | Pros                                                                                           | Cons                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| **i18next**                                   | Industry standard, supports namespaces, interpolation, pluralization, many framework bindings. | Extra dependency.                      |
| **Custom JSON-based approach**                | Simple, no dependency, we only need 2 languages.                                               | Must implement interpolation manually. |
| **Framework-specific** (react-intl, vue-i18n) | Tight integration with the UI framework.                                                       | Tied to framework choice.              |

**Questions to discuss:**

- Only English and Dutch for now? Any chance of adding more languages later?

---

### Decision 11: Build & Packaging

| Option               | Pros                                                                         | Cons                                                    |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| **electron-builder** | Mature, supports Windows installer (NSIS, MSI), auto-update, code signing.   | Electron-specific.                                      |
| **electron-forge**   | Official Electron tooling, good defaults, integrates well with Vite/Webpack. | Less flexible than electron-builder for some scenarios. |
| **Tauri bundler**    | Built-in to Tauri, produces very small installers.                           | Tauri-specific.                                         |

**Questions to discuss:**

- Do you need a Windows installer (MSI/EXE) or is a portable executable sufficient?
- Do you need auto-update capability, or will updates be manual?

---

## Stories

### Story 1.1: Select and Document Technology Stack

> As an admin/developer, I want the technology stack selected and documented so that all subsequent development has a clear technical foundation.

**Acceptance Criteria:**

- A `TECH_STACK.md` document exists listing every technology choice with rationale.
- Decisions cover: runtime/framework, UI library, language, camera API, printing API, image composition, state management, persistence, audio, i18n, build/packaging.
- The document is reviewed and approved by the project owner.

---

### Story 1.2: Initialize Project Repository Structure

> As a developer, I want the project repository initialized with a standard folder structure so that code organization is clear from day one.

**Acceptance Criteria:**

- Project has the following top-level structure:
  ```
  src/
    main/          # main/backend process
    renderer/      # UI/frontend
      screens/
      components/
      services/
      assets/
        audio/
        images/
        fonts/
      i18n/
      styles/
    shared/        # shared types/constants
  docs/
  tests/
  scripts/        # build/dev scripts
  ```
- The `README.md` is updated with the project structure and development instructions.
- The `.gitignore` is updated for the chosen technology stack.

---

### Story 1.3: Configure Development Tooling

> As a developer, I want linting, formatting, and type checking configured so that code quality is enforced automatically.

**Acceptance Criteria:**

- Linter is configured with a standard rule set and runs without errors on the empty project.
- Code formatter is configured and integrated with the linter.
- Type checking (if TypeScript) is configured with strict mode.
- A pre-commit hook runs linting and formatting automatically.
- All tools can be invoked via documented commands (e.g., `npm run lint`, `npm run format`).

---

### Story 1.4: Configure Build and Development Server

> As a developer, I want a working development server with hot-reload so that I can iterate quickly during development.

**Acceptance Criteria:**

- Running a single command starts the application in development mode.
- Changes to UI code are reflected without a full restart (hot-reload / HMR).
- Changes to backend/main process code trigger an automatic restart.
- Build output is generated to a `dist/` or `build/` directory.
- A production build command produces an optimized output.

---

### Story 1.5: Configure Testing Framework

> As a developer, I want a testing framework configured so that I can write unit and integration tests from the start.

**Acceptance Criteria:**

- A test runner is configured and can discover and run test files.
- A sample test exists and passes.
- Test command is documented (e.g., `npm test`).
- Code coverage reporting is configured and outputs to a coverage directory.
- The coverage directory is in `.gitignore`.

---

### Story 1.6: Configure Packaging for Windows

> As a developer, I want a packaging pipeline that produces a Windows installer or portable executable so that the app can be deployed to the target tablet.

**Acceptance Criteria:**

- Running a single command produces a Windows NSIS installer (`.exe`).
- The output includes the application name, version, and icon.
- The packaged application launches and shows a blank/placeholder window.
- The packaging command is documented.

---

### Story 1.7: Establish Application Entry Point with Blank Window

> As a developer, I want a minimal application that opens a blank fullscreen window so that I have a verified end-to-end skeleton from source to running application.

**Acceptance Criteria:**

- The application starts and displays a fullscreen window.
- The window has no OS-level frame/chrome (frameless or borderless).
- The window shows a placeholder message: "Open Photobooth — Loading..."
- The application can be closed via a keyboard shortcut (dev mode only) or system tray.
- The application exits cleanly without errors.

**Edge Cases:**

- Fullscreen on a multi-monitor setup should target the primary monitor.
- The window should be topmost in development mode only (kiosk locking comes in Epic 12).
