# Epic 11: Error Handling & Resilience

## Description

Implement a robust error handling system that catches errors at every level, displays user-friendly messages, provides debug information for the admin, logs everything to disk, and ensures the app always recovers to a usable state without requiring a restart.

**Dependencies:** Epic 02 (Error screen must exist). Epic 10 (Error messages must be i18n-ready).

---

## Stories

### Story 11.1: Implement Global Error Boundary

> As a developer, I want a global error boundary that catches unhandled errors and displays the error screen so that the app never shows a blank screen or crash dialog to the user.

**Acceptance Criteria:**

- A top-level error boundary wraps the entire application UI.
- Any unhandled exception or unhandled promise rejection that reaches the boundary triggers navigation to the Error screen.
- The Error screen displays:
  - User-friendly title: uses i18n key `error.title` ("Something Went Wrong").
  - User-friendly generic message: uses i18n key `error.generic`.
  - A collapsible/expandable section showing debug details: error message, stack trace, timestamp (ISO 8601).
  - CTA: uses i18n key `error.contactOwner`.
  - "Back to Home" button that navigates to Home and resets the application state.
- The error is also logged via the logging service (Story 11.2).
- After recovery (navigating to Home), the app functions normally — camera stream re-initialized, audio reset, session state cleared.

---

### Story 11.2: Implement Error Logging Service

> As a developer, I want errors and application events logged to a file on disk so that the admin can diagnose issues after the fact.

**Acceptance Criteria:**

- A logging service writes log entries to a file in the application data directory.
- Log entry format: `[TIMESTAMP] [LEVEL] [SOURCE] MESSAGE`
  - TIMESTAMP: ISO 8601 (e.g., `2026-02-13T14:30:45.123Z`).
  - LEVEL: `ERROR`, `WARN`, `INFO`, `DEBUG`.
  - SOURCE: component/service name (e.g., `Camera`, `Printer`, `Session`, `Settings`).
  - MESSAGE: human-readable description. For errors, includes stack trace on subsequent lines.
- Log levels and what they capture:
  - **ERROR:** Exceptions, hardware failures, print failures, file I/O errors.
  - **WARN:** Non-critical issues (settings file missing, disk space low, camera fallback resolution).
  - **INFO:** Application lifecycle events — startup, shutdown, session start, session complete, print job sent, print job complete, settings changed.
  - **DEBUG:** Verbose diagnostic info (camera stream parameters, printer capabilities, file paths). Only written if a debug flag is enabled.
- The log file path follows this pattern: `logs/open-photobooth-YYYY-MM-DD.log`.
- Log files rotate daily (new file per day).
- Log files older than 7 days are automatically deleted on app startup.
- Individual log files are capped at 5MB; if exceeded, a new file is started with a numeric suffix.
- The log file directory path is displayed in the admin panel (in the Kiosk section or a separate Diagnostics section).

---

### Story 11.3: Implement Camera-Specific Error Handling

> As a user, I want a clear message if the camera is not working so that I know the booth needs attention.

**Acceptance Criteria:**

- **No camera on startup:** If no video devices are found during initialization, the Home screen shows an error overlay instead of the video preview:
  - Message: "Camera not detected" (i18n key: `error.cameraDisconnected`).
  - The "Take Photos" button is disabled (grayed out, non-tappable) when no camera is available.
- **Camera disconnects during idle:** If the camera stream is lost while on the Home screen:
  - The preview area shows the error message overlay.
  - The "Take Photos" button disables.
- **Camera reconnects:** If the camera is plugged back in (USB re-plug):
  - The preview resumes automatically within 3 seconds (via device change detection or polling).
  - The "Take Photos" button re-enables.
  - No manual app restart required.
- **Camera in use:** If the camera is in use by another application, show: "Camera is being used by another application" (i18n key: `error.cameraInUse`).
- All camera errors are logged via the logging service.
- Camera errors do not crash the application — the rest of the app (admin panel, settings) remains functional.

---

### Story 11.4: Implement Printer-Specific Error Handling

> As a user, I want a clear message if the printer is not working so that I know printing is unavailable.

**Acceptance Criteria:**

- **Printer not found at print time:** When the user taps "Print" on the Review screen and the printer availability check (Epic 06, Story 6.2) fails:
  - Show a dialog: "Printer not connected" (i18n key: `error.printerNotFound`).
  - CTA: "Please contact the store owner."
  - Actions: "Try Again" (re-checks) and "Back" (returns to Review).
- **Print job fails mid-print:** If the print job is sent but fails during printing:
  - Navigate to the Error screen or show an error overlay on the Print Progress screen.
  - Title: "Printing Failed" (i18n key: `error.printFailed`).
  - Debug details: OS error message, printer name, paper size, timestamp.
  - Actions: "Try Again" (re-sends the print job) and "Back" (returns to Review).
- **Printer errors do not affect photos:** The user's photos remain in memory and in the gallery regardless of print failures. They can still view their strip, apply filters, and try printing again.
- All printer errors are logged via the logging service.
- Printer errors do not crash the application.

---

### Story 11.5: Implement Error Screen Component

> As a user, I want the error screen to show a friendly message with clear actions so that I am not confused when something goes wrong.

**Acceptance Criteria:**

- The Error screen component accepts these parameters:
  - `titleKey`: i18n key for the error title (default: `error.title`).
  - `messageKey`: i18n key for the user-friendly body message (default: `error.generic`).
  - `debugInfo`: optional string with technical details (error message, stack trace).
  - `actions`: array of button configurations `{ labelKey: string, handler: function }`. Default: a single "Back to Home" button.
- The layout is clean, not intimidating, and tablet-friendly:
  - A large warning icon (triangle with exclamation mark, or a sad face — not aggressive red).
  - Large title text (e.g., 32px).
  - Smaller body text below the title.
  - Debug details hidden behind a "Show details" toggle/expander. When expanded, shows a scrollable monospace text area.
  - CTA text: "Please contact the store owner."
  - Action buttons at the bottom, large enough for tablet use.
- All visible text uses the i18n system.
- The screen is visually consistent with the rest of the app (same background, font family, color palette).
- The screen does not show any technical jargon by default — only behind the "Show details" toggle.

---

### Story 11.6: Implement Resilient App State Recovery

> As a developer, I want the application to recover cleanly from any error state so that the booth does not require a manual restart.

**Acceptance Criteria:**

- Navigating from the Error screen to Home resets the following:
  - **Session state:** Captured photos array is cleared, countdown timers cancelled, session progress reset.
  - **Camera stream:** Re-initialization attempted. If camera is available, preview resumes. If not, the Home screen shows the camera error overlay (Story 11.3).
  - **Audio system:** Music restarts according to the current mode. SFX state reset.
  - **Print state:** Any in-progress print job tracking is cleared. (The actual print job may still complete on the printer — that's OK.)
  - **Navigation state:** No stale screen references or pending transitions remain.
- The idle timeout timer is restarted after recovery.
- If recovery itself fails (e.g., camera cannot be re-initialized AND there's an error re-initializing audio), the app remains on the Home screen with the relevant error overlays. It does not enter an error loop.
- The app can handle multiple sequential errors and recoveries without degradation (no memory leaks from repeated init/teardown cycles).

**Verification:**

- Disconnect the camera mid-session → error screen → tap "Back to Home" → reconnect camera → camera preview works → start new session → successfully complete.
- Disconnect the printer → attempt to print → error → "Try Again" → reconnect printer → successful print.
- Trigger 10 consecutive error → recovery cycles. Verify memory usage remains stable.
