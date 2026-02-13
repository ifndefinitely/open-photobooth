# Epic 04: Photo Session Flow

## Description

Implement the core photo session experience: the countdown timer, photo capture with flash effect, multi-photo sequencing, session progress UI, and the transition to the review screen. The video preview remains visible during the entire countdown so users can see their pose.

**Dependencies:** Epic 03 (Camera must be working with frame capture). Epic 02 (Session screen placeholder must exist).

---

## Stories

### Story 4.1: Implement Countdown Timer Display

> As a user, I want to see a large countdown (3, 2, 1) overlaid on the live camera preview so that I know when the photo will be taken.

**Acceptance Criteria:**

- When the photo session starts (or when the next photo in the sequence begins), a large countdown number appears overlaid on the live camera preview.
- The countdown sequence is: 3 → 2 → 1 → capture (numbers depend on configured countdown duration — if set to 5s, it counts 5 → 4 → 3 → 2 → 1).
- Each number is displayed for exactly 1 second.
- The countdown numbers are large (at least 200px font size), centered on screen, and visually prominent:
  - Semi-transparent background circle/pill behind the number, or
  - High-contrast color with drop shadow.
- The camera preview remains fully visible and live behind the countdown overlay.
- Each number has a smooth animation: scale in from larger size + fade out before the next number appears.
- After the final "1", the countdown overlay disappears and the capture (+ flash) triggers.

---

### Story 4.2: Implement Single Photo Capture with Flash Effect

> As a user, I want the screen to flash briefly when my photo is taken so that I know the moment of capture.

**Acceptance Criteria:**

- At the end of the countdown (after "1" disappears), a frame is captured from the camera using the `captureFrame()` service.
- Simultaneously, a brief white flash effect covers the entire screen:
  - Duration: approximately 150ms total (fast fade-in, slower fade-out).
  - The flash is a white overlay at full opacity that quickly fades to transparent.
- The captured photo is stored in an in-memory session array (not yet saved to disk — that happens in Epic 08).
- After the flash fades, a brief (0.5s) thumbnail of the just-captured photo appears in a corner of the screen as visual feedback, then fades away.
- The flash effect is toggleable via admin setting `audio.flashEffect` (default: enabled). When disabled, the capture still occurs but without the white overlay.

---

### Story 4.3: Implement Multi-Photo Sequence

> As a user, I want the app to automatically take multiple photos in sequence so that I get a complete photo strip.

**Acceptance Criteria:**

- After one photo is captured (and the flash + thumbnail feedback completes), the next countdown starts automatically.
- This repeats for N photos (configured by admin setting `session.photoCount`, default 4, range 1–6).
- Between photos, there is a brief pause (approximately 1.5 seconds) showing the live preview with a "Get Ready!" message before the next countdown starts. This gives the user time to change their pose.
- After the final photo is captured and the flash completes, the app automatically navigates to the Review screen.
- All N captured photos (in-memory blobs) are passed to the Review screen / stored in session state.
- The live camera preview remains active throughout the entire sequence (no black frames between captures).

**Edge Cases:**

- If the user navigates away mid-session (e.g., via an error), all timers and state are cleaned up.
- If photo count is set to 1, the session goes directly: countdown → capture → review (no "get ready" pause needed).

---

### Story 4.4: Implement Photo Counter and Session Progress UI

> As a user, I want to see which photo number I am on during the session so that I know how many are left.

**Acceptance Criteria:**

- A progress indicator is displayed on the Session screen throughout the photo sequence.
- The indicator shows the current photo number out of total (e.g., "Photo 2 of 4" or "2 / 4").
- Alternatively (or additionally), use a row of dots/circles:
  - Filled dot = photo already captured.
  - Pulsing/highlighted dot = current photo (countdown in progress).
  - Empty dot = upcoming photo.
- The indicator is positioned so it does not obscure the camera preview or the countdown number (e.g., top-left or bottom-center).
- Optionally, small thumbnails of previously captured photos appear along the bottom or side of the screen as they are taken.

---

### Story 4.5: Admin Settings for Photo Count and Countdown Duration

> As an admin, I want to configure the number of photos per session and the countdown duration so that I can customize the experience per event.

**Acceptance Criteria:**

- The "Photo Session" section in the admin panel contains:
  - **Number of photos:** Number stepper or dropdown, values 1–6, default 4.
  - **Countdown duration (seconds):** Dropdown with values 1, 2, 3, 5. Default: 3.
- Changes are saved to persistent settings via the settings service.
- Changes take effect on the next session (not mid-session if one is active — though in practice sessions cannot be started from admin).
- The strip composition (Epic 05), progress indicator (Story 4.4), and all downstream components respect the configured photo count.

---

### Story 4.6: Handle Session Interruption Gracefully

> As a developer, I want the photo session to handle camera disconnection or other errors mid-session so that the app does not crash or get stuck.

**Acceptance Criteria:**

- If the camera stream is lost during an active session (e.g., USB cable disconnected):
  - All timers (countdown intervals, pause timeouts) are immediately cancelled.
  - The app navigates to the Error screen with a message: "Camera disconnected. Please contact the store owner."
  - Debug details include the device name and error message.
- If at least one photo was captured before the error, those photos are still saved to the gallery (via Epic 08's storage service).
- The user can return to the Home screen from the error screen.
- When returning to Home, the camera stream re-initialization is attempted. If the camera is back, the preview resumes. If not, the Home screen shows the camera error state.
- No orphaned timers or intervals remain after an interrupted session.
