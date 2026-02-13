# Epic 13: Final Polish, Testing & Integration

## Description

Final integration testing, visual polish, performance optimization, touch interaction verification, long-running stability testing, and admin-facing documentation. This epic ensures all features work together smoothly and the app is ready for real-world deployment.

**Dependencies:** All other epics must be substantially complete.

---

## Stories

### Story 13.1: End-to-End Flow Testing

> As a developer, I want to verify the complete user flow works end-to-end so that the photobooth experience is seamless from start to finish.

**Acceptance Criteria:**

- The following "happy path" flow is tested and works without errors:
  1. App starts in fullscreen on Home screen with live camera preview.
  2. User taps "Take Photos."
  3. Countdown runs (3→2→1), photo is captured with flash and shutter sound.
  4. Process repeats for all N configured photos (test with 1, 4, and 6).
  5. Review screen shows the assembled strip with filter options.
  6. User selects a filter (test each: none, B&W, sepia, vintage) and taps Print.
  7. Print confirmation dialog appears; user confirms.
  8. Print progress animation plays while the printer prints.
  9. Thank You screen appears; user taps Done.
  10. App returns to Home screen, ready for next user.
- The "redo" flow is tested:
  1. On Review screen, tap Redo → confirmation dialog → confirm → back to Session → new photos captured → back to Review.
  2. Original photos remain saved to gallery; new photos are also saved.
- The "abort" flow is tested:
  1. On Review screen, tap Start Over → confirmation dialog → confirm → back to Home.
  2. Photos are saved to gallery before abort.
- The "idle timeout" is tested:
  1. On Review screen, wait for timeout → auto-return to Home.
  2. On Thank You screen, wait for timeout → auto-return to Home.
- All flows are tested in both English and Dutch.

---

### Story 13.2: Visual Polish and Animations

> As a user, I want smooth animations and transitions so that the app feels polished and professional.

**Acceptance Criteria:**

- **Screen transitions:** All screen changes have a smooth animation (fade, slide, or crossfade). Duration: 250–400ms. No jarring cuts.
- **Button interactions:** All tappable buttons have a visible press state:
  - Scale down slightly on press (e.g., `transform: scale(0.96)`).
  - Color shift or opacity change.
  - Release returns to normal with a smooth ease-out.
- **Countdown animation:** Numbers animate in with a scale + fade effect. Each number enters at 1.5x size and scales down to 1x while fading in, then fades out before the next appears.
- **Flash effect:** Convincing camera flash — fast white-to-transparent fade (150ms total).
- **Print progress animation:** The strip assembly animation is smooth (60fps), engaging, and lasts the expected 30–120 second print duration without looking repetitive. Consider: photos flying into position, borders drawing, logo sliding in, final "shine" effect.
- **Loading states:** Any loading/processing moment (strip composition, gallery loading) shows a consistent spinner or skeleton animation.
- **No visual glitches:** No flash of unstyled content, no layout jumps, no overlapping elements during transitions.
- **Confirmation dialogs:** Backdrop fades in; dialog scales up from center with a spring-like ease.

---

### Story 13.3: Performance Optimization

> As a developer, I want the app to perform smoothly on the target tablet hardware so that there are no frame drops, lag, or perceived slowness.

**Acceptance Criteria:**

- Camera preview runs at a stable 30fps on the target tablet with no visible stutter or frame drops.
- Screen transitions complete within 400ms (including any async work).
- Strip composition (4 photos + branding + styling) completes within 2 seconds.
- Changing filters on the Review screen updates the strip preview within 1 second.
- Memory usage stays below 500MB during normal operation (measured over a full session cycle).
- The app starts from cold launch in under 5 seconds on the target tablet.
- No blocking operations on the UI thread (all heavy work — image composition, file I/O, print jobs — is async).
- CSS animations and transitions use GPU-accelerated properties where possible (`transform`, `opacity`).

---

### Story 13.4: Touch Interaction Optimization

> As a user, I want all interactive elements to be easily tappable on a tablet screen so that the touch experience is smooth and error-free.

**Acceptance Criteria:**

- All interactive elements meet minimum touch target sizes:
  - Standard buttons: minimum 48×48 pixels.
  - Primary action buttons (Take Photos, Print, Done): minimum 80px height, 200px width.
  - Confirmation dialog buttons: minimum 60px height.
  - PIN keypad buttons: minimum 60×60 pixels.
  - Admin sidebar items: minimum 48px height.
  - Admin form controls: minimum 44px height.
- No elements require hover-only interaction — all interactions are tap/click.
- No double-tap or long-press interactions exist anywhere in the app. All interactions are single-tap.
- Minimum 8px gap between adjacent interactive elements (prevents accidental taps on the wrong element).
- No text is smaller than 16px on user-facing screens (readability on tablet at arm's length).
- Touch feedback is immediate — no perceptible delay between tap and visual response.

---

### Story 13.5: Stress Testing and Long-Running Stability

> As an admin, I want the app to run reliably for an entire event (8–12 hours) without degradation so that I don't need to restart it.

**Acceptance Criteria:**

- The app runs for 8 hours in a simulated environment with the following cycle repeated continuously:
  1. Start session → capture 4 photos → review → print → thank you → home.
  2. Repeat every 30 seconds (automated or semi-automated test).
- After 8 hours:
  - Memory usage has not increased by more than 20% compared to the 1-hour mark (no memory leaks).
  - Camera preview frame rate remains stable (30fps ± 2fps).
  - Strip composition time remains consistent (within 10% of initial time).
  - Audio playback has no glitches, skips, or degradation.
  - Gallery browsing in admin remains responsive even with 500+ saved sessions.
- Log files are rotated and total log disk usage does not exceed 50MB.
- No unhandled errors or exceptions appear in the logs during the 8-hour run.
- If any resource leak is found, identify and fix it.

---

### Story 13.6: Create Admin Setup Guide

> As an admin, I want documentation for setting up and operating the photobooth so that I can deploy and manage it independently.

**Acceptance Criteria:**

- A user guide (document or in-app help) covers the following sections:
  - **Hardware requirements:** Minimum tablet specs, supported webcam models, supported printer models, USB hub requirements (if any).
  - **Installation:** Step-by-step instructions for installing the app from the Windows installer.
  - **First-time setup:** How to access the admin panel (5 taps + PIN), configure the webcam, configure the printer, set the event name and logo, choose the language.
  - **Operating the booth:** How to start the app, what the user experience looks like, what to do if a user reports a problem.
  - **Troubleshooting:**
    - Camera not detected → check USB connection, try different port, restart app.
    - Printer not printing → check USB connection, check printer has paper/ink, check Windows printer settings.
    - App frozen → Ctrl+Alt+Delete, open Task Manager, end the app, restart.
    - Photos not saving → check gallery save path in settings, check disk space.
    - Audio not playing → check audio settings, check system volume is not muted.
  - **Resetting to defaults:** How to reset all settings to factory defaults.
  - **Updating the app:** How to install a new version (uninstall old, install new — photo gallery is preserved).
  - **Finding logs:** Where log files are stored for technical support.
- The guide is written for a non-developer audience (no jargon, clear language, step-by-step format).
- Include screenshots or diagrams for key steps where applicable.
