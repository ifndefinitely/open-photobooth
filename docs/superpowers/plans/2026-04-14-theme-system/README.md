# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce an admin-selectable visual theme system with three bundled presets (Drugstore, Art Deco, Elegant Wedding) that retheme all user-facing screens via CSS custom properties, while leaving the admin UI in a static neutral palette.

**Architecture:** Themes are sets of CSS custom property values applied via a `data-theme` attribute on `<html>`. A contract file ([tokens.css](../../../src/renderer/src/themes/tokens.css)) defines the default token values; three theme files override them under `:root[data-theme="X"]` selectors. A hook reads the `appearance.theme` setting from the settings service and mirrors it onto `document.documentElement`. The admin UI references a separate, fixed `--admin-*` token set in [variables.css](../../../src/renderer/src/styles/variables.css) that never varies.

**Tech Stack:** CSS custom properties, Electron + React 18 + TypeScript, Zustand, existing settings-service IPC bridge, six SIL-OFL-licensed Google Fonts bundled locally (Alfa Slab One, Roboto Slab, Limelight, Jost, Playfair Display, Lato).

**Spec:** [docs/superpowers/specs/2026-04-14-theme-system-design.md](../../specs/2026-04-14-theme-system-design.md)

---

## Git policy (important)

**Do NOT run `git add`, `git commit`, or any other git write command.** The project owner handles all staging and commits personally. At the end of each "Commit" step, **stop and tell the user the work is ready to commit with the suggested message** — then wait for confirmation before moving on.

---

## File structure

### Files to create

```
src/renderer/src/themes/
├── tokens.css           # :root default themed token values (the contract)
├── drugstore.css        # :root[data-theme="drugstore"] overrides
├── artDeco.css          # :root[data-theme="artDeco"] overrides
├── wedding.css          # :root[data-theme="wedding"] overrides
└── index.ts             # Theme registry (ids, display names, getThemeColors helper)

src/renderer/src/assets/fonts/
├── AlfaSlabOne-Regular.ttf
├── RobotoSlab-Regular.ttf
├── RobotoSlab-Bold.ttf
├── Limelight-Regular.ttf
├── Jost-Regular.ttf
├── Jost-Bold.ttf
├── PlayfairDisplay-Regular.ttf
├── PlayfairDisplay-Bold.ttf
├── Lato-Regular.ttf
├── Lato-Bold.ttf
└── LICENSES.md

src/renderer/src/hooks/
└── useThemeApplication.ts

src/renderer/src/screens/AdminScreen/sections/AppearanceSection/
├── ThemePicker.tsx + ThemePicker.module.css
└── ThemePreviewPane.tsx + ThemePreviewPane.module.css

scripts/
└── check-hardcoded-colors.sh
```

### Files to modify

| Path                                                                                                                                                                                    | Change                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [src/renderer/src/styles/variables.css](../../../src/renderer/src/styles/variables.css)                                                                                                 | Remove themed tokens; add full `--admin-*` token set.                                    |
| [src/renderer/src/styles/global.css](../../../src/renderer/src/styles/global.css)                                                                                                       | Fix Inter body bug; `@import` tokens + theme files; add 6 new `@font-face` declarations. |
| [src/main/settingsService.ts](../../../src/main/settingsService.ts)                                                                                                                     | Add `theme` field to `SettingsSchema.appearance` and `DEFAULTS.appearance`.              |
| [src/renderer/src/stores/appSettingsStore.ts](../../../src/renderer/src/stores/appSettingsStore.ts)                                                                                     | Add `theme` state + `setTheme` action.                                                   |
| [src/renderer/src/hooks/useSettingsPersistence.ts](../../../src/renderer/src/hooks/useSettingsPersistence.ts)                                                                           | Add `appearance.theme` mapping in `buildMappings()`.                                     |
| [src/renderer/src/App.tsx](../../../src/renderer/src/App.tsx)                                                                                                                           | Call `useThemeApplication()`.                                                            |
| [src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.tsx](../../../src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.tsx) | Add `<ThemePicker>` above Branding; add "Apply theme to strip" button.                   |
| [docs/07-epic-admin-settings.md](../../../docs/07-epic-admin-settings.md)                                                                                                               | Document `appearance.theme` in Story 7.1 schema.                                         |
| All 33 user/admin `.module.css` files                                                                                                                                                   | Replace hardcoded hex values with token references (per task groupings in Phase 1).      |

---

## Themed vs admin classification

Every CSS module file in the cleanup audit is classified as **themed** (user-facing, references `--color-*` / `--font-*` / shape tokens from `tokens.css`) or **admin** (static, references `--admin-*` tokens from `variables.css`).

**Themed files** — reference the themed token set:

- All files under `src/renderer/src/screens/HomeScreen/`, `SessionScreen/`, `ReviewScreen/`, `PrintScreen/`, `ThankYouScreen/`, `ErrorScreen/`
- All files under `src/renderer/src/components/` **except** anything under `components/admin/`. This includes:
  - `PinDialog/` (shown over user-facing screens → themed)
  - `ConfirmationDialog/` (shown over user-facing screens → themed)
  - `PhotoProgress/`, `CountdownOverlay/`, `GetReadyOverlay/`, `FlashOverlay/`, `ThumbnailFeedback/`
  - `Layout/`, `ScreenRouter/`, `ErrorBoundary/`, `FilterSelector/`, `StripPreview/`
- `src/renderer/src/styles/placeholder.module.css` (unused dev leftover, treat as themed)

**Admin files** — reference the `--admin-*` token set:

- Everything under `src/renderer/src/screens/AdminScreen/` (the shell, all sections, ReprintDialog — ReprintDialog is inside the admin gallery section and only ever appears while admin is open)
- Everything under `src/renderer/src/components/admin/` (NumberStepper, FilePicker, TextInput, ColorPicker, Dropdown, Slider, Toggle, SectionHeader)

---

## Phase overview

| Phase                       | File                                                   | Tasks     | Produces                                                                                                        |
| --------------------------- | ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------- |
| Phase 1 — Foundation        | [phase-1a-foundation.md](phase-1a-foundation.md)       | 1.1–1.4   | `variables.css` rewrite, `tokens.css` scaffold, Inter fix, guardrail script                                     |
| Phase 1 — Heavy cleanup     | [phase-1b-cleanup-heavy.md](phase-1b-cleanup-heavy.md) | 1.5–1.10  | 6 heavy files converted (GallerySection, PrinterSection, ReprintDialog, AdminScreen, PinSection, NumberStepper) |
| Phase 1 — Remaining cleanup | [phase-1c-cleanup-rest.md](phase-1c-cleanup-rest.md)   | 1.11–1.23 | Medium + trivial files converted, Phase 1 verification gate                                                     |
| Phase 2 — Themes            | [phase-2-themes.md](phase-2-themes.md)                 | 2.1–2.7   | Font bundling, 3 theme files, Phase 2 verification gate                                                         |
| Phase 3 — Admin UX          | [phase-3-admin-ux.md](phase-3-admin-ux.md)             | 3.1–3.11  | Settings schema, store, hook, registry, ThemePicker/ThemePreviewPane, Apply-to-strip button, final DoD gate     |

Total: 41 tasks (4 + 6 + 13 + 7 + 11). Each task is bite-sized (2–15 minutes).

---

## Non-negotiables

- **No network.** Every font file comes from a local download committed to the repo. Never `@import` from a CDN.
- **Admin UI is not themed.** Admin files reference `--admin-*` tokens only. If an admin file currently references `var(--color-accent)` / `var(--button-radius)`, it must be changed to `var(--admin-accent)` / `var(--admin-button-radius)` in this plan.
- **Settings go through `settingsService`.** The `appearance.theme` field is documented in `docs/07-epic-admin-settings.md` Story 7.1.
- **No i18n for theme names.** Theme names are admin-only (`"Drugstore"`, `"Art Deco"`, `"Elegant Wedding"`) — the admin UI is English-only.
- **User handles all git writes.** Commit steps end with "Stop. Tell the user this is ready to commit with suggested message: …".

---

## Start here

Execute phases in order. Start with [phase-1a-foundation.md](phase-1a-foundation.md).
