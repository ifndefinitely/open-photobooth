# Theme System — Design Spec

**Date:** 2026-04-14
**Status:** Approved, ready for implementation planning
**Scope:** Introduce an admin-selectable visual theme system with three bundled presets (Drugstore, Art Deco, Elegant Wedding).

---

## 1. Motivation

The app is feature-complete (Epics 1–13) but visually undifferentiated: a single neutral dark theme with a muted blue accent. It doesn't feel like a photobooth, and it doesn't match the variety of events (casual parties, weddings, corporate) the app is intended to run at.

Rather than picking one new look, we introduce a theme system so the event host can match the app's appearance to the event itself — party, wedding, or fancy — by selecting a preset from admin settings.

Three bundled themes ship in this project:

- **Drugstore** (1950s carnival photobooth — warm, loud, default)
- **Art Deco** (1920s Gatsby glamour — formal, elegant)
- **Elegant Wedding** (refined, timeless — _light_ theme)

An incidental but real benefit: the cleanup required to make theming possible also fixes several latent CSS hygiene issues (e.g. Inter is declared but never applied in [global.css](../../../src/renderer/src/styles/global.css), 228 hardcoded hex colors across 33 CSS modules).

---

## 2. Goals & Non-goals

### Goals

- Admin can switch the app's visual theme via a setting in the Appearance section.
- Three themes ship: Drugstore, Art Deco, Elegant Wedding.
- Themes differ in palette, typography, **and shape** (button radii, borders, shadows) — not just recolors.
- Theme changes apply live to all user-facing screens with no reload.
- Admin sees an accurate live preview of the selected theme before committing.
- Admin can optionally apply the current theme's colors to the printed strip settings as a starting point.
- Works fully offline (no CDN fonts, no network assets).

### Non-goals

- Admin UI does not re-theme. It stays in the current neutral dark style for clarity and ease of work. Only the theme picker + preview pane reflect the selected theme.
- Themes do not silently override strip settings. "Apply theme to strip" is an explicit, one-shot button.
- Per-theme decorative SVG assets (corner ornaments, banner badges, etc.) are **out of scope**. We can add these in a later pass.
- Custom/user-defined themes are out of scope. Only the three presets.
- i18n for theme names is not required (admin is English-only by design).
- The printed strip's font and decorative elements do not change with the theme (only the optional color copy via the explicit button).

---

## 3. Architecture

### 3.1 Mechanism: CSS custom properties + `data-theme` attribute

Themes are implemented as sets of CSS custom property values, applied via a `data-theme` attribute on the document root. This matches the existing [variables.css](../../../src/renderer/src/styles/variables.css) pattern — we're letting existing `:root` variables vary per theme rather than holding fixed values.

```css
/* Default contract (tokens.css) */
:root {
  --color-bg: #000;
  --color-accent: #4a90d9;
  --font-display: sans-serif;
  --button-radius: 12px;
  /* ...etc */
}

/* Theme override (themes/drugstore.css) */
[data-theme='drugstore'] {
  --color-bg: #1a1210;
  --color-accent: #d32f2f;
  --font-display: 'Alfa Slab One', serif;
  --button-radius: 8px;
}
```

Switching themes = setting one attribute on `<html>`. No React re-renders, no JS gymnastics, no new dependencies. Works identically for scoped previews by setting `data-theme` on any subtree.

### 3.2 File structure

```
src/renderer/src/
├── themes/
│   ├── index.ts              # Theme registry (ids, display names, strip-extraction helper)
│   ├── tokens.css            # :root default token values (the contract)
│   ├── drugstore.css         # [data-theme="drugstore"] overrides
│   ├── artDeco.css           # [data-theme="artDeco"] overrides
│   └── wedding.css           # [data-theme="wedding"] overrides
├── assets/fonts/
│   ├── AlfaSlabOne-Regular.ttf
│   ├── RobotoSlab-Regular.ttf
│   ├── RobotoSlab-Bold.ttf
│   ├── Limelight-Regular.ttf
│   ├── Jost-Regular.ttf
│   ├── Jost-Bold.ttf
│   ├── PlayfairDisplay-Regular.ttf
│   ├── PlayfairDisplay-Bold.ttf
│   ├── Lato-Regular.ttf
│   ├── Lato-Bold.ttf
│   └── LICENSES.md           # SIL OFL license texts
├── hooks/
│   └── useThemeApplication.ts    # Reads appSettingsStore.theme, sets data-theme on document.documentElement
└── screens/AdminScreen/sections/AppearanceSection/
    ├── ThemePicker.tsx + .module.css       # Thumbnail picker
    └── ThemePreviewPane.tsx + .module.css  # Live preview (scoped data-theme)
```

### 3.3 Theme loading strategy

All three themes' CSS and all six font files are bundled and loaded upfront at app start. Rationale:

- Offline-first constraint means lazy fetching is unnecessary.
- Instant swap in the admin preview pane requires fonts to already be resolved (FOUT on every hover would look awful).
- Total font budget estimate: ~1.2–1.8 MB across all themes. Acceptable for a bundled desktop app.

`@font-face` declarations live in [global.css](../../../src/renderer/src/styles/global.css) (where `Inter` currently is). Theme CSS files are `@import`ed from `global.css` in a fixed order: `tokens.css` first, then the three theme files.

### 3.4 Persistence & application flow

```
settingsService (main) ──IPC──> appSettingsStore (renderer)
                                        │
                                        ▼
                              useThemeApplication hook
                                        │
                                        ▼
                 document.documentElement.setAttribute('data-theme', value)
                                        │
                                        ▼
                        CSS cascade re-applies — instant visual swap
```

The hook is mounted once at the root of the renderer app (`App.tsx` or wherever settings load). It subscribes to the `theme` field and reapplies on change.

---

## 4. Token contract

The set of CSS custom properties each theme defines. Kept minimal — tokens only for values that actually vary between themes. Anything constant (touch targets, z-indices, error/success colors) stays in [variables.css](../../../src/renderer/src/styles/variables.css) and is **not** themed.

### 4.1 Color tokens

| Token                     | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `--color-bg`              | Page background                              |
| `--color-surface`         | Cards, dialogs, elevated panels              |
| `--color-surface-light`   | Further-elevated / hover surfaces            |
| `--color-text`            | Primary text                                 |
| `--color-text-muted`      | Secondary text, labels                       |
| `--color-accent`          | Primary action color (buttons, selected)     |
| `--color-accent-active`   | Pressed state                                |
| `--color-accent-contrast` | Text color that sits _on_ accent backgrounds |
| `--color-border`          | Dividers, input borders                      |

### 4.2 Typography tokens

| Token                      | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `--font-display`           | Headings, button labels (personality font) |
| `--font-body`              | General UI text                            |
| `--font-weight-display`    | Varies 400–900 between themes              |
| `--letter-spacing-display` | Wide for deco, tight for drugstore         |

### 4.3 Shape tokens

| Token                   | Purpose                         |
| ----------------------- | ------------------------------- |
| `--button-radius`       | 0 (deco) → 999px (wedding)      |
| `--button-border-width` | 0 → 3px                         |
| `--button-border-style` | `none` or `solid`               |
| `--button-shadow`       | Hard offset, soft drop, or none |
| `--card-radius`         |                                 |
| `--card-shadow`         |                                 |
| `--input-radius`        |                                 |

### 4.4 Non-themed (stays in variables.css)

`--touch-target-min`, `--touch-target-dialog`, `--touch-target-primary`, `--touch-target-admin`, `--z-index-modal`, `--z-index-dialog`, `--color-error`, `--color-success`.

---

## 5. Theme specifications

All fonts below are SIL OFL licensed and redistributable under AGPL-3.0. All accent-contrast combos clear WCAG AA contrast for large text.

### 5.1 Drugstore (default)

1950s carnival photobooth. Warm, loud, poster-y.

**Palette**

```
--color-bg:               #1a1210   /* warm near-black */
--color-surface:          #2a1a15
--color-surface-light:    #3a241f
--color-text:             #faf3e7   /* cream */
--color-text-muted:       #c4b098
--color-accent:           #d32f2f   /* carnival red */
--color-accent-active:    #a82323
--color-accent-contrast:  #faf3e7
--color-border:           #faf3e7   /* cream borders */
```

**Typography**

```
--font-display:           'Alfa Slab One', serif
--font-body:              'Roboto Slab', serif
--font-weight-display:    400
--letter-spacing-display: -0.01em
```

**Shape**

```
--button-radius:          8px
--button-border-width:    3px
--button-border-style:    solid
--button-shadow:          4px 4px 0 rgba(0,0,0,0.5)   /* hard offset retro poster */
--card-radius:            4px
--card-shadow:            6px 6px 0 rgba(0,0,0,0.4)
--input-radius:           4px
```

Contrast: cream on red ≈ 4.8:1 ✓

### 5.2 Art Deco

1920s Gatsby glamour. Sharp, architectural, gold and black.

**Palette**

```
--color-bg:               #0a0908   /* rich black */
--color-surface:          #141210
--color-surface-light:    #1f1b15
--color-text:             #f6f0e4   /* ivory */
--color-text-muted:       #9b8c6e   /* muted gold */
--color-accent:           #c9a646   /* antique gold */
--color-accent-active:    #a68734
--color-accent-contrast:  #0a0908   /* black on gold */
--color-border:           #c9a646   /* thin gold lines */
```

**Typography**

```
--font-display:           'Limelight', serif
--font-body:              'Jost', sans-serif
--font-weight-display:    400
--letter-spacing-display: 0.15em    /* wide tracking, very deco */
```

**Shape**

```
--button-radius:          0          /* sharp rectangles */
--button-border-width:    2px
--button-border-style:    solid
--button-shadow:          none       /* deco is flat, gold line does the work */
--card-radius:            0
--card-shadow:            none
--input-radius:           0
```

Contrast: black on gold ≈ 9:1 ✓

### 5.3 Elegant Wedding

Refined, timeless. **The only light theme.**

**Palette**

```
--color-bg:               #f4efe6   /* warm ivory */
--color-surface:          #ffffff
--color-surface-light:    #faf7f0
--color-text:             #2a2622   /* soft charcoal, not pure black */
--color-text-muted:       #6e6760
--color-accent:           #3a3532   /* deep charcoal as accent */
--color-accent-active:    #1a1614
--color-accent-contrast:  #ffffff
--color-border:           #d4c9b8   /* warm neutral hairline */
```

**Typography**

```
--font-display:           'Playfair Display', serif
--font-body:              'Lato', sans-serif
--font-weight-display:    700
--letter-spacing-display: 0
```

**Shape**

```
--button-radius:          999px      /* pill */
--button-border-width:    0
--button-border-style:    none
--button-shadow:          0 4px 12px rgba(42,38,34,0.15)
--card-radius:            12px
--card-shadow:            0 2px 8px rgba(42,38,34,0.08)
--input-radius:           8px
```

Contrast: white on charcoal ≈ 11:1 ✓

**Special note for the light theme:** any hardcoded `#fff` text in a CSS module will render white-on-ivory (invisible). The cleanup audit (Section 7) must be thorough, and the verification walkthrough (Section 8) must visit every screen in this theme specifically.

---

## 6. Admin UX

### 6.1 Theme picker

A new control added at the top of the Appearance section in [AdminScreen](../../../src/renderer/src/screens/AdminScreen/sections/AppearanceSection/).

Three thumbnails in a horizontal row:

```
┌─ Theme ──────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ [thumb] │  │ [thumb] │  │ [thumb] │               │
│  │Drugstore│  │Art Deco │  │ Wedding │               │
│  └─────────┘  └─────────┘  └─────────┘               │
│   ● selected                                          │
└───────────────────────────────────────────────────────┘
```

**Thumbnails:** Static PNG (or inline SVG) previews, ~120×160px, committed to the repo under `src/renderer/src/assets/theme-thumbnails/`. Each one shows a stylized mini "take photos" button + heading rendered in that theme's palette and font. Generated manually once, not dynamic.

**Selection behavior:** Click a thumbnail → sets `appSettingsStore.theme` via the existing [useSettingsPersistence](../../../src/renderer/src/hooks/useSettingsPersistence.ts) pattern, which immediately persists via IPC. Consistent with every other admin setting (no "Save" button).

### 6.2 Live preview pane

Below the thumbnails, a preview pane shows what the home screen will look like with the currently-selected theme:

```
┌─ Preview ─────────────────────────────────┐
│                                           │
│         [Mock HomeScreen]                 │
│      (scaled, data-theme scoped)          │
│                                           │
└───────────────────────────────────────────┘
```

**Implementation:** The preview renders a mock of the home screen (heading + take-photos button + background) inside a `<div data-theme={selectedTheme}>` wrapper. Because CSS variables cascade from the `data-theme` attribute, this scopes the theme entirely to that subtree — the admin UI around it keeps its own neutral style. No JS theming logic needed.

It must match what the user will actually see. Easiest path: render the actual `HomeScreen` component inside the scoped div, in a scaled-down container. If coupling the admin screen to `HomeScreen` is problematic, a dedicated `ThemePreviewPane` component that replicates the essential visual structure (background, heading, button) is acceptable — but the implementation plan should try the reuse path first.

### 6.3 "Apply theme to strip" button

In the same Appearance section, below the existing strip settings (border color, background color, etc.), add:

```
[ Apply current theme to strip ]
```

On click: copies the active theme's colors into `stripSettings`:

- `theme.border` → `stripSettings.borderColor`
- `theme.bg` (or `theme.surface`) → `stripSettings.backgroundColor`
- `theme.border` shape width → `stripSettings.borderWidth` (where applicable)

One-shot copy, not a live binding. The admin can freely tweak strip settings afterwards; their tweaks won't be overwritten unless they click the button again.

**Feedback state:** After click, the button shows "Applied ✓" for ~1.5s then reverts. This is critical because the strip-settings fields update silently below the button; without feedback the admin may not realize anything happened.

---

## 7. Cleanup audit (prerequisite)

The existing codebase has **228 hardcoded hex colors across 33 CSS module files**, plus **23 `rgba()` calls across 15 files**. Theming cannot work until these are replaced with token references.

### 7.1 Audit process

For each `.module.css` file, every hardcoded color value is evaluated:

1. **If it maps to an existing token** (e.g., `#ffffff` → `var(--color-text)`, `#4a90d9` → `var(--color-accent)`): replace directly.
2. **If it's an intentional per-component color that should theme** (e.g., a "delete danger" pill in GallerySection): introduce a new token if one recurs, or accept it as a one-off that remains constant across themes.
3. **If it's a functional color that shouldn't theme** (e.g., pure-white FlashOverlay during photo capture, the overlay gradient on CameraPreview): leave it hardcoded but comment why.

### 7.2 Known heavy files

These files have the most hardcoded colors and will need the most attention:

- [GallerySection.module.css](../../../src/renderer/src/screens/AdminScreen/sections/GallerySection/GallerySection.module.css) (53 occurrences)
- [PrinterSection.module.css](../../../src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.module.css) (18)
- [ReprintDialog.module.css](../../../src/renderer/src/screens/AdminScreen/sections/GallerySection/ReprintDialog.module.css) (18)
- [AdminScreen.module.css](../../../src/renderer/src/screens/AdminScreen/AdminScreen.module.css) (14)
- [PinSection.module.css](../../../src/renderer/src/screens/AdminScreen/sections/PinSection/PinSection.module.css) (13)
- [NumberStepper.module.css](../../../src/renderer/src/components/admin/NumberStepper/NumberStepper.module.css) (11)

Many of these are admin-only files. **Admin UI is not themed** (see Non-goals §2), but the cleanup still applies: admin CSS should still reference tokens from `variables.css` for consistency, even if its values don't vary by theme. The practical rule is: admin files reference `variables.css` tokens; user-facing files reference both `variables.css` _and_ the themed tokens from `tokens.css`. Both sets are available globally.

### 7.3 Font bug fix

[global.css](../../../src/renderer/src/styles/global.css:37) currently declares `body { font-family: sans-serif }` despite loading Inter. As part of the foundation phase, `body` will be set to `var(--font-body)` so each theme's body font takes effect.

---

## 8. Verification strategy

### 8.1 Phase-gated verification

Each implementation phase (Section 9) has its own verification gate:

**Phase 1 (Foundation):** Pick one token (e.g., `--color-accent`) and change its value in `tokens.css`. Walk every user-facing screen (Home, Session, Review, Print, ThankYou, Error) and confirm the color updates everywhere. No hardcoded references leaked through.

**Phase 2 (Themes):** Manually set `data-theme="drugstore"`, `"artDeco"`, `"wedding"` in DevTools. Walk every user-facing screen in each theme. Specifically check in the wedding theme that no text is invisible (no white-on-ivory bugs).

**Phase 3 (Admin UX):** Functional test — select each theme from the picker, confirm live preview matches, confirm setting persists across app restart. Test "Apply theme to strip" button: pick a theme, click apply, verify strip settings update, verify feedback state shows, verify the actual printed strip reflects the new colors on next capture.

### 8.2 Light-theme stress walkthrough

Because wedding is the only light theme and is most at risk from stale hardcoded values, a dedicated final walkthrough goes through every screen in wedding specifically before calling the work done. Screens to check: Home, Session (including countdown, flash, thumbnails, progress), Review (including filter selector and strip preview), Print, ThankYou, Error, PinDialog, ConfirmationDialog, IdleCountdown.

### 8.3 No automated tests required for this spec

Theming is primarily visual work. Snapshot tests for CSS variable values would be brittle and low-value. Verification is manual walkthrough. Unit tests for `useThemeApplication` (does it read the right store field, does it set the attribute) are optional — that hook is small enough that visual verification catches regressions faster than unit tests would.

---

## 9. Implementation phasing

The spec lives as one document but implementation happens in three ordered phases:

### Phase 1 — Foundation

- Create `src/renderer/src/themes/` scaffold (tokens.css, empty theme files, registry stub)
- Rename/move existing token values from `variables.css` into `tokens.css` where appropriate
- Fix the Inter font bug in global.css (`body { font-family: var(--font-body) }`)
- Cleanup audit: replace hardcoded colors in all 33 CSS module files with token references
- Verification gate: change one token value, confirm visual update everywhere

**No user-visible change at the end of this phase.** The app still looks identical; it's just theme-ready.

### Phase 2 — Themes

- Add `@font-face` declarations and bundle all 6 font files
- Author drugstore.css, artDeco.css, wedding.css with full token values from §5
- Bundle LICENSES.md with font license texts
- `@import` theme files from global.css
- Verification gate: DevTools-based walkthrough of all 3 themes across all user-facing screens

### Phase 3 — Admin UX & settings integration

- Add `theme` field to settings schema ([settingsService.ts](../../../src/main/settingsService.ts)), document in [docs/07-epic-admin-settings.md](../../07-epic-admin-settings.md) Story 7.1
- Add `theme` field to `appSettingsStore`
- Create `useThemeApplication` hook and mount at app root
- Create `ThemePicker` component with thumbnail assets
- Create `ThemePreviewPane` component
- Add both to `AppearanceSection`
- Add "Apply theme to strip" button and wire the copy logic
- Verification gate: full functional test per §8.1 Phase 3

---

## 10. Open questions / deferred

- **Decorative assets per theme** (deco corner ornaments, drugstore starburst badges, wedding hairline frames): deferred. Can be added later by extending each theme CSS file and adding SVG assets under `themes/`, without changing the architecture.
- **Dark/light toggle within a theme:** not needed. Each theme has a fixed mode (drugstore/deco dark, wedding light).
- **Strip typography matching the theme:** the strip's event name and date stamp still use their current rendering. Matching the theme's display font on the strip is a nice-to-have and can happen in a follow-up if the printed output looks disconnected.
- **Custom user themes:** out of scope. If requested later, the `src/renderer/src/themes/` directory is already structured to accept new themes as new CSS files + registry entries.

---

## 11. Definition of Done

- [ ] A new admin setting `appearance.theme` exists with values `drugstore | artDeco | wedding` and default `drugstore`.
- [ ] Setting persists via settingsService and survives app restart.
- [ ] The Appearance section has a theme picker with three thumbnails and a live preview pane.
- [ ] Clicking a thumbnail updates the preview instantly and persists the choice.
- [ ] After admin exits, all user-facing screens reflect the selected theme.
- [ ] All three themes have been verified on every user-facing screen with no missing colors, invisible text, or font fallback.
- [ ] The "Apply theme to strip" button copies theme colors into strip settings and shows feedback.
- [ ] The Inter-font bug in `global.css` is fixed.
- [ ] No user-facing CSS module file contains a hardcoded color that should be a token.
- [ ] Font files bundled with LICENSES.md documenting SIL OFL terms.
