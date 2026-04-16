# Phase 1c — Remaining Cleanup + Phase 1 Verification Gate

Medium files (3–10 hexes each), trivial files (1–2 hexes), and the Phase 1 verification gate.

Themed files reference tokens from `src/renderer/src/themes/tokens.css` (`--color-*`, `--font-*`, `--button-radius`, `--card-*`, `--input-radius`). Admin files reference `--admin-*` from `src/renderer/src/styles/variables.css`.

See [phase-1a-foundation.md](phase-1a-foundation.md#admin-token-mapping-table-reference-for-all-cleanup-tasks) for the admin mapping table.

---

## Task 1.11 — FilePicker.module.css (admin, 10 hexes)

**Files:**

- Modify: `src/renderer/src/components/admin/FilePicker/FilePicker.module.css`

- [ ] **Step 1: Replace the file**

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

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.browseButton {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-strong);
  background: var(--admin-button-hover-bg);
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
  transition: background-color 0.15s ease;
}

.browseButton:hover {
  background: var(--admin-button-active-bg);
}

.browseButton:active {
  background: var(--admin-border-input);
}

.filename {
  font-size: 0.875rem;
  color: var(--admin-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.removeButton {
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--admin-danger);
  background: transparent;
  border: 1px solid var(--admin-danger);
  border-radius: var(--admin-input-radius);
  cursor: pointer;
  min-height: var(--touch-target-min);
  transition: background-color 0.15s ease;
}

.removeButton:hover {
  background: var(--admin-danger-tint);
}

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert FilePicker.module.css to --admin-* tokens
```

---

## Task 1.12 — WebcamSection.module.css (admin, 9 hexes + themed references)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/WebcamSection/WebcamSection.module.css`

References `var(--color-accent)` in three places (`.select:focus`, `.checkboxLabel input accent-color`, `.slider accent-color`). Those become `var(--admin-accent)`.

- [ ] **Step 1: Replace the file**

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

.previewArea {
  width: 400px;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  background: #000;
}

.preview {
  width: 100%;
  height: 100%;
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

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  color: var(--admin-text-strong);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.checkboxLabel input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--admin-accent);
}

.slider {
  width: 100%;
  min-height: var(--touch-target-min);
  accent-color: var(--admin-accent);
  cursor: pointer;
}

.notice {
  font-size: 0.8125rem;
  color: var(--admin-warning-text);
  margin: 2px 0 0 0;
}
```

Note: `.previewArea { background: #000 }` stays hardcoded. That element holds the raw camera feed, which is always a black-backed letterbox — it is not a theme surface. It is an admin file, so the guardrail doesn't check it anyway.

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert WebcamSection.module.css to --admin-* tokens
```

---

## Task 1.13 — PinDialog.module.css (THEMED, 8 hexes + themed references)

**Files:**

- Modify: `src/renderer/src/components/PinDialog/PinDialog.module.css`

**This file is themed** — it's rendered over user-facing screens when the admin gesture is triggered, so it should take on the current theme's palette. All colors map to `--color-*` tokens from `tokens.css`.

- [ ] **Step 1: Replace the file**

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-dialog);
  background: rgba(0, 0, 0, 0.85);
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

.card {
  background: var(--color-surface);
  border-radius: var(--card-radius);
  padding: 32px;
  width: 320px;
  box-shadow: var(--card-shadow);
  animation: dialogPopIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.title {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 1.5rem;
  color: var(--color-text);
  margin: 0;
}

.dots {
  display: flex;
  gap: 16px;
}

.dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--color-text-muted);
  background: transparent;
  transition: background-color 0.15s ease;
}

.dotFilled {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.error {
  color: var(--color-error);
  font-size: 0.95rem;
  min-height: 1.4em;
  text-align: center;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.key {
  min-height: 64px;
  font-family: var(--font-body);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-surface-light);
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 0.1s ease,
    background-color 0.1s ease;
}

.key:active {
  transform: scale(0.96);
  background: var(--color-surface);
}

.keyEmpty {
  visibility: hidden;
}

.keyBackspace {
  font-size: 1.2rem;
}

.cancelButton {
  width: 100%;
  min-height: var(--touch-target-min);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-text-muted);
  border-radius: var(--button-radius);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 0.1s ease,
    background-color 0.1s ease;
}

.cancelButton:active {
  transform: scale(0.96);
  background: rgba(255, 255, 255, 0.1);
}
```

Note: `rgba(255, 255, 255, 0.1)` in `.cancelButton:active` stays hardcoded — it's a highlight overlay, not a theme color. It works on dark themes but may be too subtle on the wedding theme; the light-theme walkthrough in Task 1.24 will flag it if so, and we can fix it then.

- [ ] **Step 2: Verify in admin**

Run: `npm run dev`. Trigger the admin gesture (multi-tap the top-right corner of the home screen). The PIN dialog should appear and look identical to before.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(theme): convert PinDialog.module.css to themed tokens

PinDialog is shown over user-facing screens, so it themes. All
colors, fonts, and shapes now resolve through tokens.css.
```

---

## Task 1.14 — ConfirmationDialog.module.css (THEMED, 7 hexes + themed references)

**Files:**

- Modify: `src/renderer/src/components/ConfirmationDialog/ConfirmationDialog.module.css`

Shown over user-facing screens (e.g. "Start over?" during a session) → themed.

- [ ] **Step 1: Replace the file**

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
  background: var(--color-surface);
  border-radius: var(--card-radius);
  padding: 32px;
  max-width: 420px;
  min-width: 300px;
  box-shadow: var(--card-shadow);
  animation: dialogPopIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
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
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 1.5rem;
  color: var(--color-text);
  margin: 0 0 12px 0;
}

.message {
  font-family: var(--font-body);
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin: 0 0 24px 0;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.cancelButton,
.confirmButton {
  min-height: var(--touch-target-dialog);
  min-width: 120px;
  padding: 14px 24px;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
}

.cancelButton:active,
.confirmButton:active {
  transform: scale(0.96);
}

.cancelButton {
  color: var(--color-text);
  background: var(--color-surface-light);
  border-color: var(--color-text-muted);
}

.cancelButton:active {
  background: var(--color-surface);
}

.confirmButton {
  color: var(--color-accent-contrast);
  background: var(--color-accent);
}

.confirmButton:active {
  background: var(--color-accent-active);
}

.confirmDanger {
  background: var(--color-error);
  color: #ffffff;
}

.confirmDanger:active {
  background: var(--color-error);
  opacity: 0.85;
}
```

Note: `color: #ffffff` on `.confirmDanger` is intentional — the error color is always red, so white text on red reads well across all themes. The guardrail will flag this hex; add `components/ConfirmationDialog/ConfirmationDialog.module.css` to the WHITELIST in `scripts/check-hardcoded-colors.sh`.

- [ ] **Step 2: Update the guardrail whitelist**

Edit `scripts/check-hardcoded-colors.sh`. In the `WHITELIST=(...)` array, add:

```bash
  "src/renderer/src/components/ConfirmationDialog/ConfirmationDialog.module.css"
```

After edit, the array should contain at least:

```bash
WHITELIST=(
  "src/renderer/src/components/FlashOverlay/FlashOverlay.module.css"
  "src/renderer/src/components/ConfirmationDialog/ConfirmationDialog.module.css"
)
```

- [ ] **Step 3: Verify in admin → Factory Reset → Reset confirmation**

Run: `npm run dev`, open admin, navigate to PIN section, click Reset and confirm. The ConfirmationDialog should look identical.

Stop the dev server.

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(theme): convert ConfirmationDialog.module.css to themed tokens
```

---

## Task 1.15 — AudioSection.module.css (admin, 7 hexes)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/AudioSection/AudioSection.module.css`

- [ ] **Step 1: Replace the file**

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

.note {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
  font-style: italic;
}

.previewButton {
  padding: 8px 16px;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
  align-self: flex-start;
}

.previewButton:hover {
  background: var(--admin-button-hover-bg);
}

.previewButton:active {
  background: var(--admin-button-active-bg);
}

.previewButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert AudioSection.module.css to --admin-* tokens
```

---

## Task 1.16 — TextInput.module.css (admin, 7 hexes)

**Files:**

- Modify: `src/renderer/src/components/admin/TextInput/TextInput.module.css`

- [ ] **Step 1: Replace the file**

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

.input {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  background: var(--admin-surface);
  color: var(--admin-text-strong);
  min-height: var(--touch-target-min);
}

.input:focus {
  outline: 2px solid var(--admin-accent);
  outline-offset: -1px;
}

.inputError {
  border-color: var(--admin-danger);
}

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}

.error {
  font-size: 0.8rem;
  color: var(--admin-danger);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert TextInput.module.css to --admin-* tokens
```

---

## Task 1.17 — ColorPicker, Dropdown, Slider (admin, batch, 15 hexes total)

**Files:**

- Modify: `src/renderer/src/components/admin/ColorPicker/ColorPicker.module.css`
- Modify: `src/renderer/src/components/admin/Dropdown/Dropdown.module.css`
- Modify: `src/renderer/src/components/admin/Slider/Slider.module.css`

Three small admin control files, all trivially mechanical. Batched to avoid task noise.

- [ ] **Step 1: Replace ColorPicker.module.css**

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

.pickerRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.colorInput {
  width: 48px;
  height: 36px;
  border: 1px solid var(--admin-border-input);
  border-radius: var(--admin-input-radius);
  cursor: pointer;
  padding: 2px;
  background: var(--admin-surface);
  min-height: var(--touch-target-min);
}

.colorInput:focus {
  outline: 2px solid var(--admin-accent);
  outline-offset: -1px;
}

.hexValue {
  font-size: 0.875rem;
  color: var(--admin-text-muted);
  font-family: monospace;
}

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 2: Replace Dropdown.module.css**

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

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 3: Replace Slider.module.css**

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

.labelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-strong);
  min-width: 32px;
  text-align: right;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  appearance: none;
  background: var(--admin-border);
  outline: none;
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--admin-accent);
  cursor: pointer;
  border: 2px solid var(--admin-surface);
  box-shadow: var(--admin-shadow-sm);
}

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert ColorPicker/Dropdown/Slider to --admin-* tokens
```

---

## Task 1.18 — PrintScreen.module.css (THEMED, 5 hexes)

**Files:**

- Modify: `src/renderer/src/screens/PrintScreen/PrintScreen.module.css`

Most of this file already uses tokens. The remaining hardcoded values are:

- `#1a1a2e` in a gradient — wait, that's in ThankYouScreen. PrintScreen's remaining values are RGB glow rings (`rgba(74, 144, 217, 0.15)` and `0.35`), shadow `rgba(0,0,0,0.3)`, and `var(--color-text-secondary, #aaa)` fallbacks that will never fire.

The `rgba(74, 144, 217, *)` glow hardcodes the blue accent — in the Art Deco gold theme this would look wrong. Change the `--color-accent` fallback path to use the token.

CSS doesn't allow `rgba(var(--color-accent), 0.15)` directly — we need a separate token for the glow color. Add it to `tokens.css` as `--color-accent-glow` (defaulted to `rgba(74, 144, 217, 0.25)` for the default theme) and have each theme override it.

Wait — the themes haven't been authored yet. For Phase 1 we just add the token to `tokens.css` with a value matching the current look; Phase 2's theme files will override it.

- [ ] **Step 1: Add --color-accent-glow token to tokens.css**

Edit `src/renderer/src/themes/tokens.css`. In the `/* ── Color tokens ── */` block, after `--color-accent-contrast: #ffffff;`, add:

```css
--color-accent-glow: rgba(74, 144, 217, 0.25);
```

- [ ] **Step 2: Replace PrintScreen.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 32px;
  background-color: var(--color-bg);
  gap: 24px;
}

/* Printing state — strip preview with floating + glow animation */
.stripPreview {
  max-width: 280px;
  max-height: 50vh;
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  animation:
    fadeIn 1s ease-out,
    float 3s ease-in-out 1s infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* Pulsing glow ring around the strip */
.glowRing {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--card-radius);
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 20px var(--color-accent-glow);
  }
  50% {
    box-shadow: 0 0 40px var(--color-accent-glow);
  }
}

.messageArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.message {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  color: var(--color-text);
  font-size: 1.5rem;
  text-align: center;
}

.dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: dotPulse 1.4s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.secondaryMessage {
  color: var(--color-text-muted);
  font-size: 1rem;
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

/* Success state */
.successIcon {
  font-size: 3rem;
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Error state */
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 500px;
  text-align: center;
}

.errorTitle {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  color: var(--color-error);
  font-size: 1.8rem;
  margin: 0;
}

.errorMessage {
  color: var(--color-text);
  font-size: 1.1rem;
  margin: 0;
}

.errorCta {
  color: var(--color-text-muted);
  font-size: 1rem;
  margin: 0;
}

.errorDetails {
  width: 100%;
  text-align: left;
}

.errorDetailsSummary {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 0;
}

.errorDetailsContent {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  background: var(--color-surface-light);
  padding: 12px;
  border-radius: var(--input-radius);
  margin-top: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.errorActions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.button {
  min-height: var(--touch-target-min);
  padding: 14px 40px;
  font-family: var(--font-body);
  font-size: 1.1rem;
  font-weight: 600;
  background-color: var(--color-accent);
  color: var(--color-accent-contrast);
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
  touch-action: manipulation;
}

.button:active {
  transform: scale(0.96);
  background-color: var(--color-accent-active);
}

.buttonSecondary {
  composes: button;
  background-color: var(--color-surface-light);
  color: var(--color-text);
}
```

Note: previous code referenced `--color-text-secondary` which doesn't exist in tokens.css. Replaced with `--color-text-muted` (which does). The guardrail will not flag this file after the change.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(theme): convert PrintScreen.module.css to themed tokens

Adds --color-accent-glow to tokens.css so the pulsing glow ring
can follow each theme's accent color in Phase 2.
```

---

## Task 1.19 — AppearanceSection.module.css (admin, 5 hexes)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.module.css`

- [ ] **Step 1: Replace the file**

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

.layout {
  display: flex;
  gap: 32px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
  flex: 1;
}

.logoPreview {
  padding: 8px;
  background: var(--admin-surface-hover);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-input-radius);
  display: flex;
  justify-content: center;
}

.logoImage {
  max-width: 200px;
  max-height: 80px;
  object-fit: contain;
}

.previewPanel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.previewTitle {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
  margin: 0;
}

.previewCanvas {
  width: 200px;
  height: 600px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-input-radius);
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert AppearanceSection.module.css to --admin-* tokens
```

---

## Task 1.20 — KioskSection and Toggle (admin, batch, 8 hexes total)

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/KioskSection/KioskSection.module.css`
- Modify: `src/renderer/src/components/admin/Toggle/Toggle.module.css`

- [ ] **Step 1: Replace KioskSection.module.css**

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

.warning {
  background: var(--admin-warning-bg);
  border: 1px solid var(--admin-warning-border);
  border-radius: var(--admin-input-radius);
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--admin-warning-text);
  line-height: 1.4;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
}
```

- [ ] **Step 2: Replace Toggle.module.css**

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

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--touch-target-min);
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-text-muted);
  cursor: pointer;
}

.track {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: var(--admin-border-input);
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background-color 0.2s ease;
}

.trackOn {
  background: var(--admin-accent);
}

.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--admin-surface);
  transition: transform 0.2s ease;
  box-shadow: var(--admin-shadow-sm);
}

.thumbOn {
  transform: translateX(20px);
}

.description {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
}
```

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert KioskSection + Toggle to --admin-* tokens
```

---

## Task 1.21 — Trivial admin files batch (4 files)

**Files:**

- Modify: `src/renderer/src/components/admin/SectionHeader/SectionHeader.module.css`
- Modify: `src/renderer/src/screens/AdminScreen/sections/PhotoSessionSection/PhotoSessionSection.module.css`
- Modify: `src/renderer/src/screens/AdminScreen/sections/LanguageSection/LanguageSection.module.css`
- Modify: `src/renderer/src/screens/AdminScreen/sections/FilterSection/FilterSection.module.css`

All four are nearly identical shells. Batched.

- [ ] **Step 1: Replace SectionHeader.module.css**

```css
.header {
  border-bottom: 1px solid var(--admin-border);
  padding-bottom: 8px;
  margin-top: 8px;
}

.title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--admin-text-strong);
  margin: 0;
}
```

- [ ] **Step 2: Replace PhotoSessionSection.module.css**

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

.note {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
  font-style: italic;
}
```

- [ ] **Step 3: Replace LanguageSection.module.css** (identical to PhotoSessionSection)

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

.note {
  font-size: 0.8rem;
  color: var(--admin-text-hint);
  margin: 0;
  line-height: 1.3;
  font-style: italic;
}
```

- [ ] **Step 4: Replace FilterSection.module.css**

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
```

- [ ] **Step 5: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(admin): convert trivial admin section modules to --admin-* tokens

Covers SectionHeader, PhotoSessionSection, LanguageSection, FilterSection.
```

---

## Task 1.22 — Trivial themed files batch + add --color-warning token

**Files:**

- Modify: `src/renderer/src/styles/variables.css` (add `--color-warning`)
- Modify: `src/renderer/src/screens/ThankYouScreen/ThankYouScreen.module.css`
- Modify: `src/renderer/src/screens/HomeScreen/HomeScreen.module.css`
- Modify: `src/renderer/src/screens/SessionScreen/SessionScreen.module.css`
- Modify: `src/renderer/src/screens/ErrorScreen/ErrorScreen.module.css`
- Modify: `src/renderer/src/components/PhotoProgress/PhotoProgress.module.css`
- Modify: `src/renderer/src/components/GetReadyOverlay/GetReadyOverlay.module.css`
- Modify: `src/renderer/src/components/CountdownOverlay/CountdownOverlay.module.css`
- Modify: `src/renderer/src/components/ThumbnailFeedback/ThumbnailFeedback.module.css`
- Modify: `src/renderer/src/styles/placeholder.module.css`

ErrorScreen uses `#f0ad4e` as a warning-icon color. That's a status color, not a theme palette color, so it belongs in `variables.css` alongside `--color-error` and `--color-success`.

- [ ] **Step 1: Add --color-warning to variables.css**

Edit `src/renderer/src/styles/variables.css`. Find the line:

```css
--color-success: #2ecc71;
```

Add immediately after it:

```css
--color-warning: #f0ad4e;
```

- [ ] **Step 2: Replace ThankYouScreen.module.css**

The previous gradient `linear-gradient(135deg, var(--color-bg) 0%, #1a1a2e 100%)` forced a blueish cast. Drop the hardcoded end stop — use `var(--color-surface)` so the gradient adapts per theme.

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 32px;
  background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%);
  gap: 20px;
}

.title {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  color: var(--color-text);
  font-size: 2.5rem;
  text-align: center;
  margin: 0;
  animation: popIn 0.6s ease-out;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.subtitle {
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: 1.2rem;
  text-align: center;
  margin: 0;
  animation: popIn 0.6s ease-out 0.2s both;
}

.stripPreview {
  max-width: 240px;
  max-height: 40vh;
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  animation: popIn 0.6s ease-out 0.4s both;
}

.doneButton {
  min-height: var(--touch-target-primary);
  min-width: 200px;
  padding: 18px 60px;
  font-family: var(--font-body);
  font-size: 1.3rem;
  font-weight: 700;
  background-color: var(--color-accent);
  color: var(--color-accent-contrast);
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
  touch-action: manipulation;
  animation: popIn 0.6s ease-out 0.6s both;
}

.doneButton:active {
  transform: scale(0.96);
  background-color: var(--color-accent-active);
}
```

- [ ] **Step 3: Replace HomeScreen.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: var(--color-bg);
}

.adminGestureTarget {
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  touch-action: manipulation;
}

.preview {
  flex: 1;
  min-height: 70%;
}

.buttonArea {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.takePhotosButton {
  min-height: 80px;
  min-width: 200px;
  padding: 16px 48px;
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 1.5rem;
  color: var(--color-accent-contrast);
  background-color: var(--color-accent);
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
  touch-action: manipulation;
}

.takePhotosButton:active {
  transform: scale(0.96);
  background-color: var(--color-accent-active);
}

.takePhotosButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  background-color: var(--color-surface-light);
}
```

- [ ] **Step 4: Replace SessionScreen.module.css**

The `#000` background sits behind the live camera preview — it's a functional letterbox color, but it is a themed file, so route it through `--color-bg` to follow the theme (most themes will still have near-black backgrounds; wedding will be ivory).

```css
.container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg);
}

.preview {
  position: absolute;
  inset: 0;
}
```

- [ ] **Step 5: Replace ErrorScreen.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px;
  text-align: center;
  gap: 24px;
  background: var(--color-bg);
}

.icon {
  width: 80px;
  height: 80px;
  color: var(--color-warning);
}

.title {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 32px;
  color: var(--color-text);
  margin: 0;
}

.message {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--color-text);
  opacity: 0.8;
  margin: 0;
  max-width: 600px;
  line-height: 1.5;
}

.cta {
  font-size: 16px;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

.details {
  width: 100%;
  max-width: 600px;
  text-align: left;
}

.detailsSummary {
  font-size: 14px;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
  padding: 8px 0;
  user-select: none;
}

.detailsSummary:hover {
  opacity: 0.8;
}

.detailsContent {
  margin-top: 8px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: var(--input-radius);
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.8;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 16px;
}

.actionButton {
  min-height: var(--touch-target-min);
  min-width: 160px;
  padding: 12px 32px;
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 600;
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  touch-action: manipulation;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
}

.actionButton:active {
  transform: scale(0.96);
  background-color: var(--color-accent-active);
}
```

- [ ] **Step 6: Replace PhotoProgress.module.css**

The `rgba(255,255,255,*)` overlays on dots and label text-shadow are functional overlays and stay hardcoded. The `#ffffff` label text and dot outline should theme — route through `--color-text`.

```css
.container {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.dots {
  display: flex;
  gap: 12px;
}

.dotUpcoming,
.dotCaptured,
.dotCurrent {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.dotUpcoming {
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: transparent;
}

.dotCaptured {
  border: 2px solid var(--color-accent);
  background: var(--color-accent);
}

.dotCurrent {
  border: 2px solid var(--color-text);
  background: rgba(255, 255, 255, 0.4);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}

.label {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}
```

The two `rgba(255,255,255,*)` values are semi-transparent highlights that read the same on dark themes; on the wedding (light) theme they'll be nearly invisible, which is actually the desired behavior — the live camera feed under them is bright and the captured/current dot indicator reads through `--color-text`. Add `PhotoProgress.module.css` to the guardrail whitelist since those two rgba highlights are intentional. Actually they aren't hex so the script won't flag them. Skip whitelisting.

- [ ] **Step 7: Replace GetReadyOverlay.module.css**

```css
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.text {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: var(--letter-spacing-display);
  font-size: clamp(60px, 12vw, 100px);
  color: var(--color-text);
  text-shadow:
    0 0 40px rgba(0, 0, 0, 0.6),
    0 4px 8px rgba(0, 0, 0, 0.4);
  animation: getReadyPulse 0.8s ease-in-out infinite alternate;
}

@keyframes getReadyPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.05);
    opacity: 1;
  }
}
```

- [ ] **Step 8: Replace CountdownOverlay.module.css**

```css
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.number {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: var(--letter-spacing-display);
  font-size: clamp(200px, 30vw, 300px);
  color: var(--color-text);
  text-shadow:
    0 0 40px rgba(0, 0, 0, 0.6),
    0 4px 8px rgba(0, 0, 0, 0.4);
  line-height: 1;
  animation: countdownPop 0.9s ease-out forwards;
}

@keyframes countdownPop {
  0% {
    transform: scale(1.5);
    opacity: 0;
  }
  15% {
    transform: scale(1);
    opacity: 1;
  }
  75% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}
```

Note for wedding theme: `--color-text` is a dark charcoal, which may read poorly over the bright camera feed. If the Phase 2 walkthrough flags it, add a stronger text-shadow override in `wedding.css` — don't fix it here.

- [ ] **Step 9: Replace ThumbnailFeedback.module.css**

```css
.thumbnail {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 55;
  width: 240px;
  height: 180px;
  border-radius: var(--card-radius);
  border: 3px solid var(--color-border);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: thumbnailFade 1000ms ease-out forwards;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@keyframes thumbnailFade {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  20% {
    opacity: 1;
    transform: scale(1);
  }
  70% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

- [ ] **Step 10: Replace placeholder.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  gap: 32px;
  background: var(--color-bg);
  color: var(--color-text);
}

.title {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 2rem;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.7;
}

.actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.button {
  min-height: var(--touch-target-min);
  min-width: 140px;
  padding: 12px 32px;
  font-family: var(--font-body);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-accent-contrast);
  background-color: var(--color-accent);
  border: var(--button-border-width) var(--button-border-style) var(--color-border);
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.1s ease;
  touch-action: manipulation;
}

.button:active {
  transform: scale(0.95);
  background-color: var(--color-accent-active);
}

.buttonSecondary {
  composes: button;
  background-color: var(--color-surface-light);
  color: var(--color-text);
}

.buttonSecondary:active {
  background-color: var(--color-surface);
}

.buttonDanger {
  composes: button;
  background-color: var(--color-error);
  color: #ffffff;
}

.buttonDanger:active {
  background-color: var(--color-error);
  opacity: 0.85;
}
```

Note: the `#ffffff` on `.buttonDanger` is the same pattern as ConfirmationDialog — white text on the red error color is a fixed convention. Add `src/renderer/src/styles/placeholder.module.css` to the guardrail WHITELIST.

- [ ] **Step 11: Update the guardrail whitelist again**

Edit `scripts/check-hardcoded-colors.sh`. The `WHITELIST` array should now contain:

```bash
WHITELIST=(
  "src/renderer/src/components/FlashOverlay/FlashOverlay.module.css"
  "src/renderer/src/components/ConfirmationDialog/ConfirmationDialog.module.css"
  "src/renderer/src/styles/placeholder.module.css"
)
```

- [ ] **Step 12: FlashOverlay.module.css — leave as-is, document why**

Open `src/renderer/src/components/FlashOverlay/FlashOverlay.module.css`. Add a comment at the top explaining the intentional hardcode:

```css
/*
 * FlashOverlay renders a pure-white fullscreen flash over the camera
 * feed during capture. #ffffff is intentional — this is a physical
 * flash effect, not a theme color. Whitelisted in
 * scripts/check-hardcoded-colors.sh.
 */
.flash {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: #ffffff;
  pointer-events: none;
  animation: flashPulse 150ms ease-out forwards;
}

@keyframes flashPulse {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
```

- [ ] **Step 13: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(theme): convert trivial themed modules to themed tokens

Covers ThankYouScreen, HomeScreen, SessionScreen, ErrorScreen,
PhotoProgress, GetReadyOverlay, CountdownOverlay, ThumbnailFeedback,
placeholder. Adds --color-warning to variables.css and whitelists
FlashOverlay + placeholder in the guardrail script.
```

---

## Task 1.23 — Phase 1 verification gate

**Goal:** prove that every themed value in every user-facing module resolves through the token system and that changing a single token value cascades everywhere.

- [ ] **Step 1: Run the guardrail script and expect green**

Run: `./scripts/check-hardcoded-colors.sh`

Expected: `✓ No hardcoded hex colors in themed modules.` with exit code 0.

If the script fails, go back and fix whatever file it names before proceeding.

- [ ] **Step 2: Change one token value in tokens.css and verify cascade**

Edit `src/renderer/src/themes/tokens.css`. Change:

```css
--color-accent: #4a90d9;
```

to a clearly different color:

```css
--color-accent: #e91e63; /* bright pink — temporary */
```

Run: `npm run dev`.

Walk every user-facing screen and verify the accent appears pink:

1. **HomeScreen** — "Take Photos" button is pink.
2. Tap admin gesture (top-right corner) — **PinDialog** dots/active state should reflect pink fill.
3. Cancel out of PIN, enter admin with correct PIN.
4. Exit admin, click Take Photos.
5. **SessionScreen** — photo progress dots show pink as captured markers.
6. Complete a session (or use `Ctrl+Shift+T` stress test mode if enabled).
7. **ReviewScreen / PrintScreen** — any accent-colored elements (dots, buttons) should be pink.
8. **ThankYouScreen** — Done button is pink.
9. Force an error (e.g. disconnect printer) — **ErrorScreen** action button is pink.

- [ ] **Step 3: Revert the token change**

Edit `src/renderer/src/themes/tokens.css` back to:

```css
--color-accent: #4a90d9;
```

Hot reload should restore the blue accent.

Stop the dev server.

- [ ] **Step 4: Run the guardrail script one more time**

Run: `./scripts/check-hardcoded-colors.sh`

Expected: still green.

- [ ] **Step 5: Commit (verification only — no code change)**

There is nothing to commit for this step — it's a verification gate. If Step 2 revealed a screen that didn't update, fix that file and commit that fix with a normal `refactor(theme): convert …` message. Otherwise, stop and tell the user:

```
Phase 1 foundation + cleanup complete. Ready to start Phase 2 (themes & fonts).
The guardrail script passes and the one-token cascade walkthrough succeeded.
```

Wait for user go-ahead before starting Phase 2.

---

Phase 1 complete. Proceed to [phase-2-themes.md](phase-2-themes.md).
