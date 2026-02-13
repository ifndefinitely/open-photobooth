# Epic 12: Kiosk Mode & Deployment

## Description

Implement kiosk mode features (auto-start on boot, prevent system sleep, prevent alt-tab/taskbar access, fullscreen lock, hide cursor) and prepare the application for deployment on the target Windows 11 tablet. This epic also covers building the Windows installer.

**Dependencies:** Epic 02 (App shell). Epic 07 (Kiosk settings). Epic 01 (Packaging pipeline).

---

## Stories

### Story 12.1: Implement Fullscreen Lock

> As an admin, I want the app locked in fullscreen mode so that users cannot see the desktop or window controls.

**Acceptance Criteria:**

- When the setting `kiosk.fullscreenLock` is enabled, the app enters fullscreen mode on startup.
- The user cannot exit fullscreen via F11, Escape, or any standard keyboard shortcut.
- The app window cannot be minimized, resized, or dragged.
- The window is always on top of other windows (topmost/always-on-top flag).
- The window has no title bar, no frame, no borders (frameless window).
- In the admin panel, fullscreen behavior is temporarily relaxed if needed for OS dialogs:
  - File picker dialogs (for logo upload, gallery path) must be able to appear on top of the app.
  - The app remains fullscreen but allows OS dialogs to overlay.
- A developer-only escape hatch exists: a keyboard shortcut (e.g., `Ctrl+Shift+Q`) exits the app entirely. This shortcut is only active when a development flag is set (not in production builds).

**Edge Cases:**

- On a multi-monitor setup, the app should occupy the primary monitor only.
- If the window loses focus (e.g., an OS notification), it should reclaim focus within 1 second.

---

### Story 12.2: Prevent Alt-Tab, Taskbar, and System Shortcuts

> As an admin, I want the app to prevent users from switching away via Alt-Tab or accessing the Windows taskbar so that the booth cannot be disrupted.

**Acceptance Criteria:**

- When `kiosk.preventAltTab` is enabled:
  - **Alt-Tab** is intercepted and blocked — pressing Alt-Tab does nothing.
  - **Windows key** is intercepted and blocked — pressing the Windows key does nothing.
  - **Alt-F4** is intercepted and blocked — the app cannot be closed by the user.
  - **Ctrl-Escape** is intercepted and blocked.
  - **Ctrl-Alt-Delete** is NOT blocked — this remains as a safety escape hatch for the admin.
  - The **Windows taskbar** is hidden while the app is in the foreground.
- These restrictions are enforced at the OS level (low-level keyboard hooks or equivalent mechanism).
- The restrictions are lifted when the admin panel is open (to allow the admin to interact with the OS if needed for troubleshooting).
- The restrictions are removed cleanly when the app exits (normal shutdown or crash).

**Edge Cases:**

- If the app crashes without cleanup, a separate mechanism (or Windows restart) should restore taskbar visibility. Document this scenario for the admin.
- Implementing low-level keyboard hooks may require specific OS APIs — the chosen framework must support this or a native addon is needed.
- Some keyboard shortcut blocking may require running the app with appropriate permissions. Document any requirements.

---

### Story 12.3: Prevent System Sleep and Screen Dimming

> As an admin, I want the device to stay awake and the screen to remain bright while the photobooth is running so that the screen doesn't turn off during an event.

**Acceptance Criteria:**

- When `kiosk.preventSleep` is enabled:
  - The system does not enter sleep or hibernate mode.
  - The screen saver does not activate.
  - The screen does not dim due to inactivity.
  - The screen does not turn off due to power settings.
- This is implemented via the appropriate OS API:
  - Windows: `SetThreadExecutionState` with `ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED`.
  - macOS: `caffeinate` process or `IOPMAssertionCreateWithName`.
  - Linux: `systemd-inhibit` or D-Bus screen saver inhibit.
- When the app exits, normal sleep/dim behavior is restored.
- When the setting is disabled, the app does not interfere with OS power management.

---

### Story 12.4: Implement Auto-Start on Boot

> As an admin, I want the app to start automatically when the tablet boots up so that the booth is ready without manual intervention.

**Acceptance Criteria:**

- When `kiosk.autoStart` is toggled ON in admin settings:
  - The app registers itself to start on Windows user login.
  - Mechanism: add a shortcut to the user's Startup folder (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`) or add a registry entry under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- When `kiosk.autoStart` is toggled OFF:
  - The auto-start registration is removed.
- The auto-start launches the app with all configured settings (fullscreen, kiosk mode, etc.).
- A confirmation dialog appears when enabling auto-start: "The app will start automatically when this device boots. Make sure all settings are configured correctly before enabling this."
- Cross-platform note: On macOS, use a Launch Agent plist. On Linux, use a `.desktop` file in `~/.config/autostart/`.

---

### Story 12.5: Hide System Cursor in Kiosk Mode

> As a user, I want the mouse cursor hidden during normal booth operation so that the touchscreen experience is clean and immersive.

**Acceptance Criteria:**

- When kiosk mode is active (any kiosk setting enabled), the system cursor is hidden on all user-facing screens:
  - Home, Session, Review, Print Progress, Thank You.
- The cursor reappears on these screens:
  - Admin panel (cursor needed for precise settings interaction).
  - Error screen (cursor may be needed if a physical mouse is connected for troubleshooting).
- The cursor hiding is implemented via CSS: `cursor: none` on the root element, toggled based on the active screen type.
- Touch events still work normally with the cursor hidden (the cursor is only a visual element).
- If a physical mouse is connected and moved on a user-facing screen, the cursor remains hidden (does not flash into view).

---

### Story 12.6: Create Windows Installer Package

> As an admin, I want a Windows installer that installs the photobooth app, creates shortcuts, and optionally configures auto-start so that deployment is straightforward.

**Acceptance Criteria:**

- The build pipeline produces a Windows installer (`.exe` using NSIS, or `.msi`).
- The installer includes:
  - The application executable and all dependencies.
  - All bundled assets: music files, sound effects, fonts, default images.
  - Any required runtime (if applicable, e.g., WebView2 bootstrapper for Tauri).
- The installer flow:
  - Welcome screen with app name and version.
  - License agreement (AGPL-3.0).
  - Installation directory selection (default: `C:\Program Files\OpenPhotobooth`).
  - Create desktop shortcut: checkbox (default: yes).
  - Create Start Menu entry: checkbox (default: yes).
  - Installation progress bar.
  - Completion screen with "Launch Open Photobooth" checkbox.
- The installer sets the app icon for shortcuts and the installed executable.
- Uninstalling via Windows Settings > Apps:
  - Removes the application files.
  - Removes desktop and Start Menu shortcuts.
  - Removes auto-start registration (if configured).
  - Does NOT remove the photo gallery folder (preserves user data).
  - Does NOT remove the settings file (preserves configuration).
- The total installer size is documented in the project README.
- The installer is tested on a clean Windows 11 installation.
