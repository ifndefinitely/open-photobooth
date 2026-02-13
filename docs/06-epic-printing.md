# Epic 06: Printer Integration & Print Flow

## Description

Integrate with the Canon SELPHY (or any standard USB/Windows printer) to print the photo strip sheet. This epic covers printer discovery, availability checking, silent printing, the print progress UI with animated strip assembly, the thank-you completion screen, and print error handling.

**Dependencies:** Epic 05 (Print-ready strip sheet must be generated). Epic 02 (Print and Thank You screen placeholders).

---

## Stories

### Story 6.1: Enumerate Available Printers

> As an admin, I want to see a list of available printers so that I can select the correct one for the photobooth.

**Acceptance Criteria:**

- A function retrieves the list of printers installed on the operating system.
- Each printer is identified by its display name (e.g., "Canon SELPHY CP1300").
- The function returns printer status information if available (online/offline).
- The selected printer name is persisted in admin settings (`printer.printerName`).
- If no printers are found, a clear message is shown: "No printers detected."
- The list refreshes when the admin opens the Printer settings section.
- A "Refresh" button in admin allows manual re-enumeration.

---

### Story 6.2: Check Printer Availability Before Printing

> As a user, I want the app to verify the printer is reachable before starting a print job so that I don't wait for nothing.

**Acceptance Criteria:**

- Before sending a print job, the app checks if the selected printer is available/online.
- The check completes within 3 seconds (timeout if longer).
- If the printer is available, proceed to the print confirmation dialog.
- If the printer is not available, show a user-friendly error dialog:
  - Title: "Printer Not Connected"
  - Message: "Your photos could not be printed right now."
  - Debug detail: printer name, status, timestamp.
  - CTA: "Please contact the store owner for help."
  - Actions: "Try Again" (re-checks) and "Back" (returns to Review).
- The check is performed each time the user taps "Print" on the Review screen.

---

### Story 6.3: Send Silent Print Job

> As a developer, I want to send the strip sheet image to the selected printer silently (without the OS print dialog) so that the user experience is seamless.

**Acceptance Criteria:**

- A `print(imageData, settings)` function sends the print-ready strip sheet image to the selected printer.
- The print is silent — no OS print dialog appears to the user.
- Print settings consumed from admin configuration:
  - `printer.printerName`: which printer to use.
  - `printer.paperSize`: paper size (4×6", 5×7", etc.).
  - `printer.quality`: draft / normal / high.
  - `printer.colorMode`: color / grayscale.
  - `printer.margins`: top, right, bottom, left in mm (0 for borderless).
  - `printer.copies`: number of copies (default 1).
- The function returns a result/promise indicating success or failure.
- On failure, the result includes the OS-level error message for debugging.
- The function does not block the UI thread — it runs asynchronously.

---

### Story 6.4: Configure Printer Settings in Admin

> As an admin, I want to configure printer paper size, quality, color mode, margins, and copies so that prints come out correctly.

**Acceptance Criteria:**

- The "Printer" section in the admin panel contains:
  - **Printer selection:** Dropdown of available printers (from Story 6.1). Shows "(No printers found)" if none available.
  - **Paper size:** Dropdown — 4×6" (postcard), 5×7", Letter, A6, Custom. Default: 4×6".
  - **Print quality:** Dropdown — Draft, Normal, High. Default: High.
  - **Color mode:** Dropdown — Color, Grayscale. Default: Color.
  - **Margins:** Four numeric inputs (top, right, bottom, left) in millimeters. Default: 0 (borderless).
  - **Number of copies:** Number stepper, range 1–5. Default: 1.
- A "Print Test Page" button sends a test image (e.g., a color gradient with text "Test Print — Open Photobooth") to verify settings.
- All settings are persisted via the settings service.
- A note is displayed: "Make sure your printer drivers are installed and the printer is connected via USB."

---

### Story 6.5: Implement Print Confirmation Dialog

> As a user, I want to confirm before printing so that I don't accidentally waste printer paper.

**Acceptance Criteria:**

- When the user taps "Print" on the Review screen:
  1. Printer availability is checked (Story 6.2).
  2. If available, a confirmation dialog appears.
- The confirmation dialog displays:
  - Title: "Print Your Photos?"
  - A small preview thumbnail of the strip sheet.
  - Message: "Your photo strip will be printed." (i18n-ready)
  - Buttons: "Print" (confirm) and "Cancel".
- "Print" proceeds to the Print Progress screen (Story 6.6).
- "Cancel" dismisses the dialog and returns to the Review screen.
- The dialog reuses the confirmation dialog component from Story 2.8.

---

### Story 6.6: Implement Print Progress Screen with Strip Assembly Animation

> As a user, I want to see an engaging animation while my strip is printing so that I know the app is working and I'm entertained during the wait.

**Acceptance Criteria:**

- After print is confirmed and the print job is sent, the screen transitions to the Print Progress screen.
- The screen displays an animated strip assembly visualization:
  - The 4 individual photos appear one by one, sliding/flying into their positions in the strip layout.
  - Branding elements (logo, event name, date) animate in after the photos.
  - The border draws itself around each photo.
  - The complete strip does a subtle "shine" or "glow" effect once assembled.
- Below the animation, a progress message is displayed: "Printing your photos..." (i18n-ready).
- A secondary progress indicator (progress bar or spinner) shows the print job status if available, otherwise just an indeterminate animation.
- No interactive elements are available during printing — the user cannot navigate away.
- If printing takes longer than 60 seconds, show a secondary message: "Still printing, please wait..." (i18n-ready).
- The animation should be engaging for a 30–120 second wait (typical Canon SELPHY print time).

**Notes:**

- The animation does not need to be perfectly synchronized with actual print progress (which may not be reportable). It's primarily a waiting screen.

---

### Story 6.7: Implement Thank You / Completion Screen

> As a user, I want to see a "Thank You" screen after printing so that I know my photos are done and ready.

**Acceptance Criteria:**

- After the print job completes successfully, the screen transitions to the Thank You screen.
- The screen displays:
  - A large thank-you message: "Enjoy Your Photos!" (i18n-ready).
  - A subtitle: "Thank you for visiting our photobooth!" (i18n-ready).
  - Optionally, the finished strip preview is displayed.
- A "Done" button (large, prominent) returns to the Home screen.
- The idle timeout (from Story 2.9) applies on this screen — if the user walks away, it auto-returns to Home.
- The screen has a warm, celebratory feel (subtle confetti animation or similar — optional but nice).

---

### Story 6.8: Handle Print Errors

> As a user, I want to see a clear error message if printing fails so that I know what happened and can get help.

**Acceptance Criteria:**

- If the print job fails for any reason, the Print Progress screen transitions to an error state (or navigates to the Error screen).
- The error displays:
  - User-friendly title: "Printing Failed" (i18n-ready).
  - User-friendly message: "Your photos could not be printed." (i18n-ready).
  - Debug details (collapsible, smaller text): the OS error message, printer name, paper size, timestamp.
  - CTA: "Please contact the store owner." (i18n-ready).
  - Actions:
    - "Try Again" — re-sends the same print job.
    - "Back" — returns to the Review screen (user can try changing settings or just view their strip).
- Photos are still saved to the gallery regardless of print failure (Epic 08 handles this independently).
- All print errors are logged (consumed by Epic 11's logging service).
