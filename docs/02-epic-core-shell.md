# Epic 02: App Shell, Navigation & Screen Management

## Description

Build the foundational application shell including screen-based navigation, global layout, theming foundations, the hidden admin access gesture, and core reusable UI components. This epic creates the skeleton that all feature screens plug into.

**Dependencies:** Epic 01 (Project Setup must be complete).

---

## Stories

### Story 2.1: Implement Screen Router and Navigation System

> As a developer, I want a screen-based navigation system so that the app can transition between Home, Session, Review, Print, Admin, and Error screens.

**Acceptance Criteria:**

- A navigation system supports named screens: `home`, `session`, `review`, `print`, `admin`, `error`, `thankyou`.
- Navigation is imperative (triggered by code, not URL-based) — this is a kiosk app, not a web app.
- Only one screen is active/visible at a time.
- Screen transitions work without visual glitches (no flash of unstyled content).
- Navigation state is accessible from any component/service that needs it.
- Browser-style back button / history navigation is disabled.
- A default/fallback route always leads to the Home screen.

**Edge Cases:**

- If an invalid screen name is navigated to, default to Home.
- Navigation during an active print job should be prevented (print screen handles its own flow).

---

### Story 2.2: Create Global Layout Container

> As a user, I want the app to display in a consistent fullscreen layout so that the experience feels polished and immersive.

**Acceptance Criteria:**

- A root layout container fills the entire viewport (100vw x 100vh).
- No scrollbars appear on any screen.
- The container has a configurable background color (default: dark/black).
- All screens render inside this container.
- The layout handles different screen resolutions gracefully (the tablet resolution is the primary target, but should not break on other resolutions).
- System cursor is hidden during normal operation (visible in admin panel).
- Text selection is disabled on all user-facing screens.

---

### Story 2.3: Build Home Screen Skeleton

> As a user, I want to see a Home screen with a large video preview area and a prominent "Take Photos" button so that I know how to start.

**Acceptance Criteria:**

- The Home screen occupies the full layout container.
- A large area (at least 70% of screen height) is reserved for the camera preview (placeholder/black rectangle for now).
- A large, stylish "Take Photos" button is centered below or overlaid on the preview area.
- The button is large enough to be easily tapped on a tablet (minimum 80px height, 200px width).
- Tapping the button navigates to the Session screen.
- The button has a visible press/active state animation (scale, color shift, or ripple).
- The screen displays the event name if configured (placeholder text for now).
- The button text comes from the i18n system (hardcoded English for now, wired up in Epic 10).

---

### Story 2.4: Build Placeholder Screens for All Routes

> As a developer, I want placeholder screens for Session, Review, Print, Thank You, and Error so that navigation can be tested end-to-end.

**Acceptance Criteria:**

- Each of the following screens exists as a minimal placeholder:
  - **Session Screen:** Shows "Photo Session" text and a button to navigate to Review.
  - **Review Screen:** Shows "Review" text and buttons for Print, Redo, and Abort.
  - **Print Screen:** Shows "Printing..." text and a button to navigate to Thank You.
  - **Thank You Screen:** Shows "Thank You!" text and a button to navigate to Home.
  - **Error Screen:** Shows "Error" with a placeholder message and a button to navigate to Home.
- All navigation paths from the screen flow diagram are functional and testable.
- Redo navigates back to Session.
- Abort navigates back to Home.

---

### Story 2.5: Implement Hidden Admin Access Gesture

> As an admin, I want to access the admin panel by tapping the top-right corner 5 times so that regular users cannot accidentally find it.

**Acceptance Criteria:**

- An invisible tap target exists in the top-right corner of the Home screen (approximately 80x80 pixels).
- Tapping this area 5 times within 3 seconds triggers the admin access flow (PIN dialog).
- If the user taps fewer than 5 times or too slowly, the tap count resets silently.
- After 5 successful taps, a PIN entry dialog appears (Story 2.6).
- The tap target is completely invisible — no visual indication whatsoever.
- The tap counter resets when navigating away from Home.

**Edge Cases:**

- Taps outside the target area reset the counter.
- Require at least 100ms between taps to filter out accidental multi-touch (e.g., screen cleaning).

---

### Story 2.6: Implement PIN Entry Dialog

> As an admin, I want to enter a 4-digit PIN to access the admin panel so that the settings are protected.

**Acceptance Criteria:**

- A modal/overlay dialog appears requesting a 4-digit PIN.
- The PIN input shows dots/asterisks (not plain text).
- A numeric keypad is displayed on screen (for tablet use — no keyboard required).
- The correct PIN (default: `0000`) navigates to the Admin screen.
- An incorrect PIN shows a brief error message ("Incorrect PIN") and clears the input.
- After 3 consecutive incorrect attempts, the dialog closes and the user must repeat the 5-tap gesture.
- A "Cancel" button closes the dialog and returns to the Home screen.
- The PIN value is read from the settings persistence service (not hardcoded after initial setup).

---

### Story 2.7: Build Admin Panel Shell with Section Navigation

> As an admin, I want the admin panel to have a sidebar or tab navigation with sections so that I can easily find different settings.

**Acceptance Criteria:**

- The Admin screen has a sidebar (or tab bar) listing all settings sections:
  - Appearance
  - Webcam
  - Printer
  - Photo Session
  - Filters
  - Audio
  - PIN
  - Gallery
  - Kiosk
  - Language
- Selecting a section displays its content in the main area (placeholder content for now — each epic fills in its own section).
- A prominent "Back to Booth" or "Exit Admin" button returns to the Home screen.
- The admin panel is styled differently from user-facing screens (lighter/utility theme) to clearly distinguish it.
- The admin panel is scrollable if content overflows (unlike user-facing screens).

---

### Story 2.8: Implement Confirmation Dialog Component

> As a user, I want to see an "Are you sure?" confirmation when I tap Redo or Abort so that I do not accidentally lose my photos.

**Acceptance Criteria:**

- A reusable confirmation dialog component exists with these properties:
  - `title`: The dialog title text.
  - `message`: The dialog body text.
  - `confirmLabel`: Text for the confirm button.
  - `cancelLabel`: Text for the cancel button.
  - `onConfirm`: Callback when confirmed.
  - `onCancel`: Callback when cancelled.
- The dialog is modal (blocks interaction with the screen behind it).
- The dialog has a semi-transparent dark backdrop.
- The dialog buttons are large enough for tablet use (minimum 48px height).
- The dialog is used on the Review screen for "Redo" and "Abort" actions:
  - **Redo:** Title: "Redo Photos?" / Message: "This will discard your current photos. Are you sure?" / Confirm navigates to Session.
  - **Abort:** Title: "Start Over?" / Message: "This will discard your photos and return to the home screen. Are you sure?" / Confirm navigates to Home.
- Cancel in both cases returns to the Review screen.
- All dialog text is externalizable for i18n (wired up in Epic 10).

---

### Story 2.9: Implement Idle Timeout and Auto-Return to Home

> As an admin, I want the app to automatically return to the Home screen after a period of inactivity so that the booth is always ready for the next user.

**Acceptance Criteria:**

- If no user interaction (touch, click, key press) occurs for a configurable duration, the app navigates to the Home screen.
- Default timeout: 60 seconds.
- The timeout applies on these screens: Review, Thank You.
- The timeout does NOT apply on: Home, active Session (countdown in progress), Print progress, Admin panel.
- Any touch/click/key event resets the idle timer.
- The timeout duration is configurable in admin settings (30s, 60s, 90s, 120s, or disabled).
- When the timeout triggers, it navigates directly to Home without a confirmation dialog (the user walked away).
- A subtle visual countdown indicator appears in the last 10 seconds (e.g., a small text "Returning to home in 10s..." at the bottom of the screen) to warn an active user.
