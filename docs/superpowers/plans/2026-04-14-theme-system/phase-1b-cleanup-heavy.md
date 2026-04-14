# Phase 1b — Heavy CSS Cleanup

Six admin files with the highest hex counts. Each task writes the complete new file content (it's simpler and less error-prone than many surgical edits when every line needs a change).

All these files are **admin-classified** → they reference `--admin-*` tokens. None are themed. The guardrail in Task 1.4 ignores admin paths, so these tasks do not affect its output.

Reference the mapping table in [phase-1a-foundation.md](phase-1a-foundation.md#admin-token-mapping-table-reference-for-all-cleanup-tasks) for substitutions.

All file paths are absolute from project root (`/home/samvp/git-personal/open-photobooth`).

---

## Task 1.5 — GallerySection.module.css (53 hexes)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/GallerySection/GallerySection.module.css`

- [ ] **Step 1: Replace the file**

Write `src/renderer/src/screens/AdminScreen/sections/GallerySection/GallerySection.module.css`:

```css
.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 500px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.pathRow {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.pathRow .field {
  flex: 1;
}

.pathInput {
  padding: 8px 12px;
  font-size: 0.875rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-surface-hover);
  color: var(--admin-text-strong);
  min-height: var(--touch-target-min);
  font-family: monospace;
}

.pathInput:read-only {
  cursor: default;
}

.browseButton,
.explorerButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
  white-space: nowrap;
}

.browseButton:hover,
.explorerButton:hover {
  background: var(--admin-button-hover-bg);
}

.buttonRow {
  display: flex;
  gap: 8px;
}

.note {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  font-style: italic;
  margin: 0;
}

.errorMessage {
  font-size: 0.875rem;
  padding: 8px 12px;
  border-radius: var(--admin-input-radius);
  background: var(--admin-danger-bg);
  color: var(--admin-danger-text);
}

.successMessage {
  font-size: 0.875rem;
  padding: 8px 12px;
  border-radius: var(--admin-input-radius);
  background: var(--admin-success-bg);
  color: var(--admin-success-text);
}

.divider {
  border: none;
  border-top: 1px solid var(--admin-border-light);
  margin: 8px 0;
}

/* ── Gallery Browser ── */

.galleryHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.galleryTitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--admin-text-strong);
  margin: 0;
}

.deleteAllButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--admin-danger-strong);
  border-radius: var(--admin-input-radius);
  background: var(--admin-surface);
  color: var(--admin-danger-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
  white-space: nowrap;
}

.deleteAllButton:hover {
  background: var(--admin-danger-bg);
}

.deleteAllButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loadingMessage,
.emptyMessage {
  font-size: 0.9rem;
  color: var(--admin-text-hint);
  padding: 24px 0;
  text-align: center;
}

.sessionGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.sessionCard {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--admin-border-light);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s;
  background: var(--admin-surface);
}

.sessionCard:hover {
  box-shadow: var(--admin-shadow-md);
}

.sessionThumbnail {
  width: 100%;
  aspect-ratio: 1 / 3;
  object-fit: cover;
  background: var(--admin-surface-hover);
}

.sessionThumbnailPlaceholder {
  width: 100%;
  aspect-ratio: 1 / 3;
  background: var(--admin-surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-text-disabled);
  font-size: 0.8rem;
}

.sessionInfo {
  padding: 8px;
}

.sessionDate {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  margin: 0 0 2px;
}

.sessionPhotoCount {
  font-size: 0.75rem;
  color: var(--admin-text-hint);
  margin: 0;
}

.loadMoreButton {
  padding: 10px 20px;
  font-size: 0.9rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
  align-self: center;
}

.loadMoreButton:hover {
  background: var(--admin-button-hover-bg);
}

/* ── Session Detail View ── */

.detailView {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detailHeader {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.backButton:hover {
  background: var(--admin-button-hover-bg);
}

.detailTitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--admin-text-strong);
  margin: 0;
}

.detailMeta {
  font-size: 0.85rem;
  color: var(--admin-text-muted);
}

.detailPhotos {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
}

.detailPhotoThumb {
  width: 120px;
  height: 90px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--admin-border-light);
  flex-shrink: 0;
}

.detailStrip {
  max-width: 300px;
  border: 1px solid var(--admin-border-light);
  border-radius: 4px;
}

.deleteSessionButton {
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  border-radius: var(--admin-input-radius);
  background: var(--admin-danger-strong);
  color: var(--admin-text-on-accent);
  cursor: pointer;
  min-height: var(--touch-target-min);
  align-self: flex-start;
}

.deleteSessionButton:hover {
  background: var(--admin-danger-hover);
}

.deleteSessionButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Reprint & Selection ── */

.detailActions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.reprintButton {
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  border-radius: var(--admin-input-radius);
  background: var(--admin-accent);
  color: var(--admin-text-on-accent);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.reprintButton:hover {
  opacity: 0.9;
}

.reprintButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.galleryHeaderActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.selectButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
  white-space: nowrap;
}

.selectButton:hover {
  background: var(--admin-button-hover-bg);
}

.reprintSelectedButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--admin-input-radius);
  background: var(--admin-accent);
  color: var(--admin-text-on-accent);
  cursor: pointer;
  min-height: var(--touch-target-min);
  white-space: nowrap;
}

.reprintSelectedButton:hover {
  opacity: 0.9;
}

.sessionCardSelected {
  outline: 3px solid var(--admin-accent);
  outline-offset: -3px;
}

.selectCheckbox {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.selectCheckbox input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--admin-accent);
}
```

Note: the previous `var(--color-accent, #4caf50)` fallbacks are gone; `--admin-accent` is always defined so the fallback is unnecessary. The `#4caf50` fallback was green (not the app accent) — it was clearly a leftover placeholder.

- [ ] **Step 2: Verify visually**

Run: `npm run dev`, open admin, navigate to Gallery. Confirm layout matches what it looked like before, with the accent now blue (not green) on reprint buttons and selected cards. Everything else should look unchanged.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert GallerySection.module.css to --admin-* tokens

Replaces 53 hardcoded hex values with the fixed admin palette
from variables.css. No visual change except that the reprint/select
accent is now the real app blue instead of the leftover #4caf50
green placeholder.
```

Wait for confirmation.

---

## Task 1.6 — PrinterSection.module.css (18 hexes)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.module.css`

This file currently references `var(--color-accent)` directly (4 places). Those need to become `var(--admin-accent)` — otherwise the printer-settings focus outlines and Test button will re-theme.

- [ ] **Step 1: Replace the file**

Write `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.module.css`:

```css
.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.select {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-surface);
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.select:focus {
  outline: 2px solid var(--admin-accent);
  outline-offset: -1px;
}

.numberInput {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-surface);
  color: var(--admin-text-strong);
  width: 80px;
  min-height: var(--touch-target-min);
}

.numberInput:focus {
  outline: 2px solid var(--admin-accent);
  outline-offset: -1px;
}

.printerRow {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.printerRow .field {
  flex: 1;
}

.refreshButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
  white-space: nowrap;
}

.refreshButton:hover {
  background: var(--admin-button-hover-bg);
}

.marginsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.testButton {
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: var(--admin-input-radius);
  background: var(--admin-accent);
  color: var(--admin-text-on-accent);
  cursor: pointer;
  min-height: var(--touch-target-min);
  align-self: flex-start;
}

.testButton:hover {
  opacity: 0.9;
}

.testButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.note {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  font-style: italic;
  margin: 0;
}

.testStatus {
  font-size: 0.875rem;
  padding: 8px 12px;
  border-radius: var(--admin-input-radius);
}

.testStatusSuccess {
  background: var(--admin-success-bg);
  color: var(--admin-success-text);
}

.testStatusError {
  background: var(--admin-danger-bg);
  color: var(--admin-danger-text);
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`, open admin → Printer. Focus the dropdown and number input; the outline should still be admin blue. Click Test Print (should still work).

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert PrinterSection.module.css to --admin-* tokens

Also replaces references to var(--color-accent) with var(--admin-accent)
so the printer settings UI does not re-theme once Phase 2 lands.
```

Wait for confirmation.

---

## Task 1.7 — ReprintDialog.module.css (18 hexes)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/GallerySection/ReprintDialog.module.css`

ReprintDialog is only shown from within the admin Gallery section, so it's admin-classified. It uses `var(--color-accent, #4caf50)` in two places — the leftover green fallback disappears.

- [ ] **Step 1: Replace the file**

Write `src/renderer/src/screens/AdminScreen/sections/GallerySection/ReprintDialog.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-dialog);
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: backdropFadeIn 200ms ease-out;
}

@keyframes backdropFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card {
  background: var(--admin-surface);
  border-radius: var(--admin-button-radius);
  padding: 24px 32px;
  max-width: 440px;
  min-width: 320px;
  animation: dialogPopIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: var(--admin-shadow-dialog);
}

@keyframes dialogPopIn {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0 0 16px 0;
}

.progress {
  font-size: 0.9rem;
  color: var(--admin-text-muted);
  margin: 0 0 12px 0;
}

.progressBar {
  width: 100%;
  height: 6px;
  background: var(--admin-border-light);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progressFill {
  height: 100%;
  background: var(--admin-accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.statusList {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.statusItem {
  font-size: 0.85rem;
  color: var(--admin-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.statusPending {
  color: var(--admin-text-hint);
}

.statusPrinting {
  color: var(--admin-info-text);
  font-weight: 600;
}

.statusSuccess {
  color: var(--admin-success-text);
}

.statusError {
  color: var(--admin-danger-text);
}

.statusIcon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.errorDetail {
  font-size: 0.75rem;
  color: var(--admin-text-hint);
  margin-left: 24px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.doneButton,
.stopButton {
  padding: 8px 20px;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--admin-input-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.doneButton {
  background: var(--admin-accent);
  color: var(--admin-text-on-accent);
}

.doneButton:hover {
  opacity: 0.9;
}

.stopButton {
  background: var(--admin-danger-strong);
  color: var(--admin-text-on-accent);
}

.stopButton:hover {
  background: var(--admin-danger-hover);
}

.errorMessage {
  font-size: 0.9rem;
  padding: 12px;
  border-radius: var(--admin-input-radius);
  background: var(--admin-danger-bg);
  color: var(--admin-danger-text);
  margin-bottom: 16px;
}
```

Note: the overlay backdrop `rgba(0, 0, 0, 0.7)` stays hardcoded — it's a darkening layer, not a theme color.

- [ ] **Step 2: Verify**

Run: `npm run dev`, open admin → Gallery, select a session, click Reprint. The dialog should render with the admin blue progress bar and Done button.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert ReprintDialog.module.css to --admin-* tokens
```

Wait for confirmation.

---

## Task 1.8 — AdminScreen.module.css (14 hexes + themed-token references)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/AdminScreen.module.css`

This is the critical file that currently references `var(--color-accent)`, `var(--color-accent-active)`, and `var(--button-radius)`. Once Phase 2 ships and a non-default theme is active, the admin exit button would re-theme — breaking Non-Goal §2 of the spec. This task severs that coupling.

- [ ] **Step 1: Replace the file**

Write `src/renderer/src/screens/AdminScreen/AdminScreen.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--admin-bg);
  color: var(--admin-text-strong);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-border);
  flex-shrink: 0;
}

.headerTitle {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--admin-text);
}

.exitButton {
  min-height: var(--touch-target-min);
  padding: 8px 24px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--admin-text-on-accent);
  background: var(--admin-accent);
  border: none;
  border-radius: var(--admin-button-radius);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 0.1s ease,
    background-color 0.1s ease;
}

.exitButton:active {
  transform: scale(0.96);
  background: var(--admin-accent-active);
}

.body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.sidebarItem {
  min-height: var(--touch-target-min);
  padding: 14px 20px;
  font-size: 1rem;
  color: var(--admin-text-muted);
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease;
  touch-action: manipulation;
}

.sidebarItem:hover {
  background: var(--admin-surface-hover);
}

.sidebarItemActive {
  border-left-color: var(--admin-accent);
  background: var(--admin-accent-bg-subtle);
  color: var(--admin-text);
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.sectionTitle {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0 0 12px 0;
}

.sectionPlaceholder {
  font-size: 1rem;
  color: var(--admin-text-hint);
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`, open admin via the admin gesture, navigate between sections. Exit button, sidebar highlights, header — all should look identical to pre-task.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): decouple AdminScreen.module.css from themed tokens

Replace var(--color-accent), var(--color-accent-active), and
var(--button-radius) with the static --admin-* equivalents so the
admin shell never re-themes once Phase 2 lands.
```

Wait for confirmation.

---

## Task 1.9 — PinSection.module.css (13 hexes + themed references)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/PinSection/PinSection.module.css`

Also currently references themed tokens (`--color-accent`, `--color-accent-active`, `--button-radius`). Same decoupling fix as AdminScreen.

- [ ] **Step 1: Replace the file**

Write `src/renderer/src/screens/AdminScreen/sections/PinSection/PinSection.module.css`:

```css
.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 320px;
}

.success {
  font-size: 0.875rem;
  color: var(--admin-success-text);
  background: var(--admin-success-bg);
  border: 1px solid var(--admin-success-border);
  border-radius: var(--admin-input-radius);
  padding: 8px 12px;
  margin: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.changePinButton {
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--admin-text-on-accent);
  background: var(--admin-accent);
  border: none;
  border-radius: var(--admin-button-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
  touch-action: manipulation;
  transition:
    transform 0.1s ease,
    background-color 0.1s ease;
}

.changePinButton:active {
  transform: scale(0.97);
  background: var(--admin-accent-active);
}

.resetButton {
  padding: 10px 24px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-danger);
  background: transparent;
  border: 1px solid var(--admin-danger);
  border-radius: var(--admin-button-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
  touch-action: manipulation;
}

.resetButton:hover {
  background: var(--admin-danger-tint);
}

.confirmRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.confirmText {
  font-size: 0.875rem;
  color: var(--admin-danger);
  font-weight: 600;
}

.confirmYes {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-on-accent);
  background: var(--admin-danger);
  border: none;
  border-radius: var(--admin-input-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.confirmNo {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
  background: var(--admin-button-hover-bg);
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`, open admin → PIN section. Change PIN button should be admin blue; Reset area should be red; clicking Reset should show confirm row with red text.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert PinSection.module.css to --admin-* tokens
```

Wait for confirmation.

---

## Task 1.10 — NumberStepper.module.css (11 hexes)

**Files:**

- Modify: `src/renderer/src/components/admin/NumberStepper/NumberStepper.module.css`

Admin component; all colors map straight to admin tokens.

- [ ] **Step 1: Replace the file**

Write `src/renderer/src/components/admin/NumberStepper/NumberStepper.module.css`:

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  width: fit-content;
}

.stepButton {
  width: 48px;
  min-height: var(--touch-target-min);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--admin-text-strong);
  background: var(--admin-button-hover-bg);
  border: 1px solid var(--admin-border-input);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
  touch-action: manipulation;
}

.stepButton:first-child {
  border-radius: var(--admin-input-radius) 0 0 var(--admin-input-radius);
}

.stepButton:last-child {
  border-radius: 0 var(--admin-input-radius) var(--admin-input-radius) 0;
}

.stepButton:hover:not(:disabled) {
  background: var(--admin-button-active-bg);
}

.stepButton:active:not(:disabled) {
  background: var(--admin-border-input);
}

.stepButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.value {
  min-width: 48px;
  min-height: var(--touch-target-min);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--admin-text-strong);
  background: var(--admin-surface);
  border-top: 1px solid var(--admin-border-input);
  border-bottom: 1px solid var(--admin-border-input);
}

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`, open admin → Photo Session. The photo count / countdown steppers should look unchanged.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert NumberStepper.module.css to --admin-* tokens
```

Wait for confirmation.

---

Phase 1b complete (6 heavy files done). Proceed to [phase-1c-cleanup-rest.md](phase-1c-cleanup-rest.md).
