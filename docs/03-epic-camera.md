# Epic 03: Webcam Integration & Live Preview

## Description

Integrate with the USB webcam to provide a real-time video preview on the Home screen and during photo sessions. This epic covers camera enumeration, stream initialization, resolution configuration, visual adjustments (mirror, flip, brightness, contrast, saturation), and single-frame capture.

**Dependencies:** Epic 02 (App Shell must provide the Home screen layout with the preview area).

---

## Stories

### Story 3.1: Enumerate Available Video Devices

> As a developer, I want to enumerate all connected video input devices so that the correct webcam can be selected.

**Acceptance Criteria:**

- On application startup, all available video input devices are discovered.
- Each device is identified by its label (e.g., "Razer Kiyo") and a unique device ID.
- The list of devices is available to the settings system for webcam selection in admin.
- If no video devices are found, an error state is set (consumed by the error handling system in Epic 11).
- Device enumeration refreshes when the admin opens the Webcam settings section.
- Hot-plugging: if a device is connected or disconnected while the app is running, the list updates (via device change event or polling).

---

### Story 3.2: Initialize Camera Stream and Display Live Preview

> As a user, I want to see a live video preview from the webcam on the Home screen so that I can position myself before taking photos.

**Acceptance Criteria:**

- When the Home screen mounts, a video stream is opened from the selected (or default) webcam.
- The live video feed is displayed in the preview area of the Home screen.
- The video fills the preview area while maintaining aspect ratio (object-fit: cover, centered, overflow hidden).
- The video stream runs at the configured resolution (default: highest available, up to 1920x1080).
- The preview has minimal latency (under 100ms perceived).
- The stream is properly released when navigating to the Admin panel and re-acquired when returning to Home.
- The same stream remains active when transitioning from Home to Session (no re-initialization flicker).

**Edge Cases:**

- If the webcam is disconnected during preview, show an error message in the preview area (e.g., "Camera not detected").
- If the webcam is in use by another application, show an appropriate error.
- Handle permission dialogs gracefully (should not appear in production kiosk mode, but may appear in dev).

---

### Story 3.3: Implement Camera Mirror and Flip

> As a user, I want the camera preview to be mirrored (like a mirror) so that my movements feel natural.

**Acceptance Criteria:**

- The camera preview is horizontally mirrored by default (CSS transform: `scaleX(-1)`).
- An admin setting toggles horizontal mirror on/off.
- An admin setting toggles vertical flip on/off.
- The mirror/flip settings apply to **both** the live preview AND captured photos.
- The transforms are applied via CSS on the preview element and via canvas transformation when capturing frames.
- Changing the setting in admin updates the preview in real-time.

---

### Story 3.4: Implement Camera Visual Adjustments

> As an admin, I want to adjust brightness, contrast, and saturation of the camera feed so that photos look good in different lighting conditions.

**Acceptance Criteria:**

- Admin settings provide sliders for:
  - **Brightness:** range -100 to +100, default 0.
  - **Contrast:** range -100 to +100, default 0.
  - **Saturation:** range -100 to +100, default 0.
- Adjustments are applied to the live preview in real-time using CSS filters (e.g., `filter: brightness(1.2) contrast(1.1) saturate(0.9)`).
- The same adjustments are applied to captured photos. This can be done either:
  - By applying CSS filters to the video element before canvas capture, or
  - By applying equivalent image processing to the captured frame.
- Adjustments persist across app restarts (saved to settings).
- The mapping from slider value (-100 to +100) to CSS filter value is: `1 + (value / 100)` for brightness/contrast, `1 + (value / 100)` for saturation.

---

### Story 3.5: Implement Camera Resolution Selection

> As an admin, I want to select the camera resolution so that I can balance photo quality and performance.

**Acceptance Criteria:**

- The Webcam admin section lists available resolutions for the selected camera.
- Selecting a resolution restarts the camera stream at the new resolution.
- The selected resolution is persisted in settings.
- Common resolutions are offered: 640x480, 1280x720, 1920x1080 (filtered to only those the camera actually supports).
- If the previously selected resolution is not available (e.g., camera changed), fall back to the closest available resolution and show a notice.
- Resolution changes take effect immediately (preview updates).

---

### Story 3.6: Implement Camera Test Preview in Admin

> As an admin, I want to see a live camera preview in the Webcam settings section so that I can verify my adjustments in real-time.

**Acceptance Criteria:**

- The Webcam admin section displays a live preview (smaller than the Home screen preview, e.g., 400x300 area).
- All adjustments (mirror, flip, brightness, contrast, saturation) are reflected in the admin preview in real-time as sliders are moved.
- The preview shows the currently selected camera at the currently selected resolution.
- Changing the camera device dropdown updates the preview to the new device.
- The admin preview stream is released when leaving the Webcam settings section (navigating to another admin section or back to booth).

---

### Story 3.7: Capture a Single Frame from the Video Stream

> As a developer, I want a service that captures a single high-resolution frame from the active video stream so that the photo session can use it.

**Acceptance Criteria:**

- A `captureFrame()` function/method exists that returns the current video frame as an image (in-memory blob or data URL).
- The captured frame is at the full configured resolution (not the display/preview size).
- The capture applies the current mirror/flip settings (via canvas transformation).
- The capture applies the current brightness/contrast/saturation settings (via CSS filter on the canvas or pixel manipulation).
- The capture completes in under 100ms.
- The returned image is in a format suitable for both display and later composition (PNG blob preferred for lossless quality; JPEG acceptable with quality >= 0.95).
- Multiple rapid calls (for multi-photo sessions) do not crash or corrupt the stream.

**Edge Cases:**

- If the camera stream is not active when `captureFrame()` is called, return an error (not a blank/black image).
- If the camera is disconnected mid-capture, handle gracefully with an error result.
