# Epic 07: Admin Settings Panel

## Description

Implement the settings infrastructure (persistence, defaults, UI components) and the admin settings sections that span multiple concerns. Individual feature-specific settings (webcam, printer, audio, etc.) are defined in their respective epics but plug into this panel's UI and persistence layer.

**Dependencies:** Epic 02 (Admin panel shell with section navigation must exist).

---

## Stories

### Story 7.1: Implement Settings Persistence Service

> As a developer, I want a centralized settings service that reads, writes, and provides default values so that all settings are reliably persisted.

**Acceptance Criteria:**

- A settings service provides these operations:
  - `get(key)`: Returns the value for a settings key, or the default if not set.
  - `set(key, value)`: Sets a value and triggers persistence.
  - `getAll()`: Returns the entire settings object.
  - `reset(key)`: Resets a key to its default value.
  - `resetAll()`: Resets all settings to defaults.
  - `onChange(key, callback)`: Subscribe to changes for a specific key (for reactive UI updates).
- Settings are persisted to a local JSON file in the application data directory.
- Every setting has a documented default value (see schema below).
- Settings are loaded once at app start and cached in memory for fast access.
- Writes are debounced (e.g., 500ms) so rapid slider changes don't thrash the disk.
- Writes are atomic: write to a temp file, then rename to the settings file (prevents corruption on crash).
- The settings file location is logged at startup for debugging.
- If the settings file is corrupted, missing, or unparseable, the app starts with all defaults and logs a warning.

**Complete Settings Schema:**

```
# Appearance
appearance.theme             : string  = "drugstore"   # drugstore | artDeco | wedding
appearance.logoPath          : string  = ""           # Path to logo image file
appearance.eventName         : string  = ""           # Event name text on strip
appearance.dateStampEnabled  : boolean = true          # Show date on strip
appearance.dateStampFormat   : string  = "MMMM D, YYYY" # Date format string
appearance.borderColor       : string  = "#000000"     # Photo border color
appearance.borderStyle       : string  = "none"        # none | solid | dashed | double
appearance.borderWidth       : number  = 0             # Border width in pixels (0-20)
appearance.backgroundColor   : string  = "#FFFFFF"     # Strip background color

# Camera
camera.deviceId              : string  = ""           # Empty = default/first camera
camera.resolution            : string  = "1280x720"   # WIDTHxHEIGHT
camera.mirrorHorizontal      : boolean = true          # Mirror preview + capture
camera.flipVertical          : boolean = false         # Flip preview + capture
camera.brightness            : number  = 0             # -100 to +100
camera.contrast              : number  = 0             # -100 to +100
camera.saturation            : number  = 0             # -100 to +100

# Printer
printer.printerName          : string  = ""           # Empty = OS default printer
printer.paperSize            : string  = "4x6"        # 4x6 | 5x7 | letter | A6
printer.quality              : string  = "high"       # draft | normal | high
printer.colorMode            : string  = "color"      # color | grayscale
printer.margins.top          : number  = 0             # Margin in mm
printer.margins.right        : number  = 0             # Margin in mm
printer.margins.bottom       : number  = 0             # Margin in mm
printer.margins.left         : number  = 0             # Margin in mm
printer.copies               : number  = 1             # 1-5

# Photo Session
session.photoCount           : number  = 4             # 1-6
session.countdownDuration    : number  = 3             # 1, 2, 3, or 5 seconds

# Filters
filters.enabled              : boolean = true          # Master toggle for filter UI
filters.blackAndWhite        : boolean = true          # Enable B&W filter option
filters.sepia                : boolean = true          # Enable sepia filter option
filters.vintage              : boolean = true          # Enable vintage filter option

# Audio
audio.musicMode              : string  = "idle"       # idle | session | always | off
audio.musicVolume            : number  = 50            # 0-100
audio.countdownBeep          : boolean = true          # Play beep on countdown numbers
audio.shutterSound           : boolean = true          # Play shutter click on capture
audio.flashEffect            : boolean = true          # Show visual flash on capture

# Security
pin.code                     : string  = "0000"       # 4-digit admin PIN

# Gallery
gallery.savePath             : string  = ""           # Empty = platform default

# Kiosk
kiosk.autoStart              : boolean = false         # Start on Windows boot
kiosk.preventSleep           : boolean = true          # Keep screen on
kiosk.preventAltTab          : boolean = true          # Block alt-tab and Win key
kiosk.fullscreenLock         : boolean = true          # Force fullscreen
kiosk.idleTimeout            : number  = 60            # Seconds (0 = disabled)

# Language
language.userLocale          : string  = "en"         # "en" or "nl"
```

---

### Story 7.2: Build Reusable Admin Form Components

> As a developer, I want reusable form components so that admin settings sections are built consistently and quickly.

**Acceptance Criteria:**

- The following form components exist:
  - **Toggle switch:** Boolean on/off. Label on left, switch on right.
  - **Slider:** Numeric range with min/max. Shows current numeric value. Label above.
  - **Dropdown / Select:** Single selection from a list of `{ label, value }` options. Label above.
  - **Text input:** Single-line text field. Label above. Optional placeholder text.
  - **Color picker:** Opens a visual color selection widget. Shows current color as a swatch. Label above.
  - **File picker:** Button labeled "Browse..." that opens the OS file dialog. Shows the selected filename (or "No file selected"). Label above. Optional "Remove" button.
  - **Number stepper:** Decrement (−) and increment (+) buttons flanking a numeric display. Configurable min, max, step. Label above.
  - **Section header:** Bold text with a subtle separator line. Used to group related settings within a section.
- All components accept `value` and `onChange` callback props.
- All components support a `disabled` state (grayed out, non-interactive).
- All components are styled consistently (same label font, spacing, and alignment).
- All components use the admin panel's utility theme (not the user-facing dark theme).

---

### Story 7.3: Implement Appearance Settings Section

> As an admin, I want to customize the strip appearance (logo, event name, date, border, background) so that the strip matches my event.

**Acceptance Criteria:**

- The "Appearance" section in the admin panel contains:
  - **Logo upload:** File picker for image files (PNG, JPG, GIF, SVG). Shows a thumbnail preview of the selected image. A "Remove" button clears the logo.
  - **Event name:** Text input, max 100 characters, placeholder: "e.g., Sam & Jamie's Wedding".
  - **Date stamp:** Toggle on/off. Date format dropdown: "February 13, 2026" / "13-02-2026" / "2026-02-13".
  - **Border color:** Color picker.
  - **Border style:** Dropdown (None, Solid, Dashed, Double).
  - **Border width:** Slider 0–20px.
  - **Background color:** Color picker.
- A live preview of a sample strip (using placeholder/test images for the photos) updates in real-time as settings are changed.
- All settings are read from and written to the settings persistence service.
- Settings keys correspond to the schema in Story 7.1.

---

### Story 7.4: Implement PIN Change Settings Section

> As an admin, I want to change the 4-digit PIN so that I can set a secure access code.

**Acceptance Criteria:**

- The "PIN" section in the admin panel contains:
  - "Current PIN" input (masked with dots/asterisks, numeric only).
  - "New PIN" input (masked, numeric only).
  - "Confirm New PIN" input (masked, numeric only).
  - "Change PIN" button.
- Validation rules:
  - Current PIN must match the stored PIN.
  - New PIN must be exactly 4 digits (0–9 only).
  - New PIN and Confirm New PIN must match.
- On success: a green confirmation message "PIN changed successfully" appears. The new PIN is saved to settings.
- On validation failure: specific red error messages appear below the relevant fields.
  - "Incorrect current PIN."
  - "PIN must be exactly 4 digits."
  - "PINs do not match."
- A "Reset to Default" button resets the PIN to 0000 (with confirmation dialog).

---

### Story 7.5: Implement Photo Session Settings Section

> As an admin, I want to configure the number of photos and countdown duration so that I can adjust the session to my event.

**Acceptance Criteria:**

- The "Photo Session" section in the admin panel contains:
  - **Number of photos:** Number stepper, range 1–6, default 4.
  - **Countdown duration:** Dropdown — 1 second, 2 seconds, 3 seconds, 5 seconds. Default: 3 seconds.
- Changes are saved to the settings service.
- A note is displayed: "Changes will take effect for the next photo session."

---

### Story 7.6: Implement Filter Settings Section

> As an admin, I want to enable/disable photo filters so that I control which options users see.

**Acceptance Criteria:**

- The "Filters" section in the admin panel contains:
  - **Master toggle:** "Enable filters" (on/off). When off, the filter selection UI is hidden from users entirely.
  - **Individual toggles** (only interactive when master toggle is on):
    - Black & White: on/off.
    - Sepia: on/off.
    - Vintage: on/off.
- When the master toggle is off, individual toggles are grayed out / disabled.
- Changes are saved to the settings service.

---

### Story 7.7: Implement Language Settings Section

> As an admin, I want to switch the user-facing language between English and Dutch so that the booth works for my audience.

**Acceptance Criteria:**

- The "Language" section in the admin panel contains:
  - **Language dropdown:** Two options — "English" and "Nederlands (Dutch)".
  - A note: "This changes user-facing text only. Admin settings remain in English."
- Changing the language saves to `language.userLocale` and triggers the i18n system to switch locale.
- The change takes effect on user-facing screens immediately (or on next navigation to a user-facing screen).
- The admin panel itself does NOT change language — it stays in English regardless.

---

### Story 7.8: Implement Kiosk Settings Section

> As an admin, I want to configure kiosk mode options so that I can lock down the device for public use.

**Acceptance Criteria:**

- The "Kiosk" section in the admin panel contains:
  - **Auto-start on boot:** Toggle. With a note: "When enabled, the app will start automatically when this device boots up."
  - **Prevent sleep:** Toggle. With a note: "Keeps the screen on and prevents the device from sleeping."
  - **Prevent Alt-Tab / Taskbar:** Toggle. With a note: "Blocks users from switching away from the app. Ctrl+Alt+Delete still works for admin access."
  - **Fullscreen lock:** Toggle. With a note: "Forces the app to remain in fullscreen mode."
  - **Idle timeout:** Dropdown — 30 seconds, 60 seconds, 90 seconds, 120 seconds, Disabled. Default: 60 seconds. With a note: "Time before the app automatically returns to the home screen when no one interacts."
- A warning banner is displayed at the top: "Changes to Auto-start and Prevent Alt-Tab take effect after restarting the app."
- All settings are saved to the settings service.
