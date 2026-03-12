# End-to-End Test Checklist

Manual testing checklist for verifying the complete photobooth flow. Run through each section before a release.

---

## Prerequisites

- USB webcam connected and detected by the OS
- USB printer connected, loaded with paper/ink, and set as available in OS printer settings
- App built and running (`npm run dev` or packaged installer)

---

## 1. Happy Path Flow

Test the complete user journey from start to finish.

### 1a. Single photo (photoCount = 1)

- [ ] App starts on Home screen with live camera preview
- [ ] Tap "Take Photos" — navigates to Session screen
- [ ] Countdown runs (3 → 2 → 1) with beep sounds
- [ ] Photo captured with flash effect and shutter sound
- [ ] Navigates to Review screen showing assembled strip
- [ ] Filter selector visible (if filters enabled in settings)
- [ ] Tap "Print" — printer availability check runs
- [ ] Print confirmation dialog appears
- [ ] Confirm print — navigates to Print screen
- [ ] Print progress animation plays while printer prints
- [ ] After print completes — navigates to Thank You screen
- [ ] Tap "Done" — returns to Home screen
- [ ] App is ready for next user

### 1b. Four photos (photoCount = 4)

- [ ] Same flow as 1a, but countdown + capture repeats 4 times
- [ ] Photo progress indicator shows "Photo 1 of 4", "Photo 2 of 4", etc.
- [ ] All 4 photos appear in the strip on Review screen

### 1c. Six photos (photoCount = 6)

- [ ] Same flow as 1a, but countdown + capture repeats 6 times
- [ ] Strip layout adjusts for 6 photos

---

## 2. Filter Selection

Test each filter on the Review screen.

- [ ] **Original (none)** — strip shows unfiltered photos
- [ ] **Black & White** — strip shows grayscale photos
- [ ] **Sepia** — strip shows warm-toned photos
- [ ] **Vintage** — strip shows vintage effect
- [ ] Switching between filters updates the strip preview within 1 second
- [ ] Selected filter is visually highlighted in the filter selector

---

## 3. Redo Flow

- [ ] On Review screen, tap "Redo"
- [ ] Confirmation dialog appears: "Redo Photos?"
- [ ] Tap "Yes, Redo" — navigates back to Session screen
- [ ] New photos are captured
- [ ] Returns to Review screen with new strip
- [ ] Original photos remain saved in gallery (verify in admin gallery)

---

## 4. Abort Flow (Start Over)

- [ ] On Review screen, tap "Start Over"
- [ ] Confirmation dialog appears: "Start Over?"
- [ ] Tap "Yes, Start Over" — returns to Home screen
- [ ] Photos are saved to gallery before abort (verify in admin gallery)

---

## 5. Idle Timeout

- [ ] On Review screen, wait for idle timeout duration (default: 60s)
- [ ] Idle countdown overlay appears
- [ ] If no interaction — auto-returns to Home screen
- [ ] On Thank You screen, wait for timeout — auto-returns to Home screen
- [ ] Tapping during countdown resets the timer

---

## 6. Language Switching

### English (default)

- [ ] All user-facing text is in English
- [ ] "Take Photos", "Print", "Redo", "Start Over", "Done" buttons correct
- [ ] Countdown, error messages, and dialogs in English

### Dutch

- [ ] Switch language to Dutch in Admin Settings → Language
- [ ] All user-facing text switches to Dutch
- [ ] Repeat happy path flow — all text in Dutch
- [ ] Switch back to English — text returns to English

---

## 7. Admin Panel Access

- [ ] Tap top-right corner of Home screen 5 times within 3 seconds
- [ ] PIN dialog appears
- [ ] Enter correct PIN (default: 0000) — Admin panel opens
- [ ] Enter wrong PIN — error shown, stays on Home screen
- [ ] Tap Cancel — PIN dialog closes, stays on Home screen
- [ ] In Admin panel: all 10 sections accessible and functional
- [ ] Exit Admin — returns to Home screen

---

## 8. Error Handling

### Camera errors

- [ ] Disconnect USB camera during session — error screen shown
- [ ] Error message is user-friendly (not a stack trace)
- [ ] "Back to Home" button works — returns to Home screen
- [ ] Reconnect camera — camera preview resumes on Home screen

### Printer errors

- [ ] Disconnect printer, then try to print — printer error dialog shown
- [ ] Error includes printer name and status
- [ ] "Try Again" button retries the print
- [ ] "Back" button returns to Review screen

---

## 9. Gallery Verification

After completing several sessions:

- [ ] Open Admin → Gallery section
- [ ] All completed sessions appear in the gallery list
- [ ] Sessions show correct photo count and timestamp
- [ ] "Open in Explorer" opens the gallery folder in the OS file manager
- [ ] Delete a session — removed from gallery list and disk

---

## 10. Audio Verification

- [ ] Background music plays on Home screen (if enabled in settings)
- [ ] Music pauses during photo session
- [ ] Countdown beep plays on each countdown tick
- [ ] Shutter sound plays on photo capture
- [ ] Music volume adjustable in Admin Settings
- [ ] Disabling audio in settings silences all sounds

---

## Sign-off

| Tester | Date | Result | Notes |
| ------ | ---- | ------ | ----- |
|        |      |        |       |
