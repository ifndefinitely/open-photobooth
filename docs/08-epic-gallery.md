# Epic 08: Local Gallery & Storage

## Description

Implement local photo storage (automatically saving every session's photos and strips to disk) and an admin-accessible gallery browser for viewing and deleting saved content.

**Dependencies:** Epic 04 (Photo capture must work). Epic 05 (Strip generation must work). Epic 07 (Settings service for gallery path configuration).

---

## Stories

### Story 8.1: Implement Photo Storage Service

> As a developer, I want a storage service that saves photos and strips to a configurable folder on disk so that all photobooth output is preserved.

**Acceptance Criteria:**

- A storage service exposes a `saveSession(sessionData)` function where `sessionData` contains:
  - Array of individual photo image blobs/buffers.
  - The composed strip image.
  - The print-ready 2-up strip sheet image.
  - Session metadata: timestamp, photo count, filter applied.
- The save path is read from admin settings (`gallery.savePath`). If empty, use the platform default:
  - Windows: `%USERPROFILE%\Pictures\OpenPhotobooth`
  - macOS: `~/Pictures/OpenPhotobooth`
  - Linux: `~/Pictures/OpenPhotobooth`
- Each session is saved in a subfolder named with an ISO timestamp (e.g., `2026-02-13_14-30-45/`).
- Files saved per session:
  - `photo-1.jpg`, `photo-2.jpg`, ..., `photo-N.jpg` (individual photos, JPEG quality 95%).
  - `strip.png` (composed strip, lossless).
  - `print-sheet.png` (2-up print-ready sheet, lossless).
  - `metadata.json` (timestamp, photo count, filter, settings snapshot).
- The service creates the directory structure if it does not exist.
- All file operations are asynchronous (non-blocking).

**Edge Cases:**

- If the save directory is not writable, log an error and show a non-blocking warning in the admin panel (do not prevent the user from continuing their session).
- If disk space is critically low, log a warning.
- Handle duplicate timestamps by appending a suffix (e.g., `2026-02-13_14-30-45_2/`).

---

### Story 8.2: Save Photos Automatically After Each Session

> As an admin, I want all photos from every session saved automatically to the gallery folder so that no photos are lost regardless of user actions.

**Acceptance Criteria:**

- After ALL N photos in a session are captured (last flash completes), the storage service is called to save the individual photos.
- This happens immediately, before the user reaches the Review screen (or concurrently with strip composition).
- Saving happens in the background and does not block the UI or delay the transition to the Review screen.
- The strip image is saved after it is composed (may be slightly after the individual photos).
- If the user chooses "Redo," the original session photos remain on disk (not deleted). The new session is saved as a separate folder.
- If the user aborts, the already-saved photos remain on disk.
- If saving fails, the user experience is not affected — they can still view, filter, and print their photos. The failure is only logged.

---

### Story 8.3: Implement Gallery Browser in Admin Panel

> As an admin, I want to browse saved photo sessions in the admin panel so that I can review what has been captured.

**Acceptance Criteria:**

- The "Gallery" admin section shows a grid (or list) of saved sessions.
- Each session entry displays:
  - A thumbnail of the strip image (or first photo if strip is not yet generated).
  - Date and time of the session (formatted from the folder name).
  - Number of photos in the session.
- Sessions are sorted by date, newest first.
- Tapping/clicking a session opens a detail view:
  - All individual photos displayed as a row of thumbnails.
  - The strip image at a larger size.
  - The session metadata (filter used, timestamp).
- The gallery loads asynchronously with a loading indicator.
- If there are many sessions (100+), use pagination or virtual scrolling to avoid performance issues.
- If the gallery folder does not exist or is empty, show a message: "No photos yet. Sessions will appear here after guests take photos."

---

### Story 8.4: Implement Gallery Deletion

> As an admin, I want to delete individual sessions or all sessions from the gallery so that I can manage disk space.

**Acceptance Criteria:**

- In the gallery detail view, a "Delete Session" button removes the session folder and all its files from disk.
- In the gallery list view, a "Delete All Sessions" button removes all session folders.
- Both actions require a confirmation dialog:
  - Single delete: "Delete this session? This cannot be undone."
  - Delete all: "Delete all sessions? This will permanently remove all saved photos. This cannot be undone."
- Deletion is performed asynchronously.
- "Delete All" shows a progress indicator if there are many sessions.
- After deletion, the gallery list updates immediately to reflect the change.
- Deletion errors are logged but do not crash the admin panel. A toast/message indicates if a file could not be deleted (e.g., locked by another process).

---

### Story 8.5: Configure Gallery Save Path

> As an admin, I want to configure where photos are saved on disk so that I can point to an external drive or specific folder.

**Acceptance Criteria:**

- The "Gallery" admin section includes:
  - **Save Folder** field showing the current configured path (or the default path if none configured).
  - A **"Browse..."** button that opens the OS folder picker dialog.
  - The selected path is validated:
    - The directory must exist (or be creatable).
    - The directory must be writable.
  - If the path is invalid or not writable, show a red error message: "This folder is not writable. Please choose a different location."
  - The default path is shown as placeholder text when no custom path is configured.
- Changing the save path does not move existing files. A note explains: "Changing the save folder only affects future sessions. Existing photos remain in the previous location."
- The path is saved to `gallery.savePath` in the settings service.

---

### Story 8.6: Open Gallery Folder in File Explorer

> As an admin, I want a button to open the gallery folder in the OS file manager so that I can easily access the files outside the app.

**Acceptance Criteria:**

- A "Open in File Explorer" button exists in the Gallery admin section, near the save path field.
- Clicking it opens the configured save folder in the OS file manager:
  - Windows: opens in Windows File Explorer.
  - macOS: opens in Finder.
  - Linux: opens in the default file manager.
- If the folder does not exist yet (no sessions saved), it is created before opening.
- If the folder cannot be opened (e.g., path is invalid), show an error toast.
