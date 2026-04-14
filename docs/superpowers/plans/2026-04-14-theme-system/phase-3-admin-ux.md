# Phase 3 — Admin UX & Settings Integration

Goal: make the theme user-selectable. Add the `appearance.theme` setting, expose it in the Appearance section via a thumbnail picker + live preview pane, and add the "Apply theme to strip" button. By the end of this phase the spec's Definition of Done (§11) is fully met.

Read [README.md](README.md) first for the full picture and git policy. Phase 2 must be complete and both verification gates passing.

---

## Task 3.1 — Add `appearance.theme` to settings schema

**Files:**

- Modify: `src/main/settingsService.ts`
- Modify: `docs/07-epic-admin-settings.md`

The settings service is the source of truth for persisted settings. The `theme` field goes under the `appearance` namespace alongside the existing strip-branding fields.

- [ ] **Step 1: Update the TypeScript schema**

Open `src/main/settingsService.ts`. Find the `SettingsSchema` interface (starts around line 6) and the `appearance` block. Change:

```ts
interface SettingsSchema {
  appearance: {
    logoPath: string
    eventName: string
    dateStampEnabled: boolean
    dateStampFormat: string
    borderColor: string
    borderStyle: string
    borderWidth: number
    backgroundColor: string
  }
```

to:

```ts
interface SettingsSchema {
  appearance: {
    theme: string
    logoPath: string
    eventName: string
    dateStampEnabled: boolean
    dateStampFormat: string
    borderColor: string
    borderStyle: string
    borderWidth: number
    backgroundColor: string
  }
```

- [ ] **Step 2: Update the DEFAULTS object**

In the same file, find the `DEFAULTS` object (around line 69). Change:

```ts
  appearance: {
    logoPath: '',
    eventName: '',
    dateStampEnabled: true,
    dateStampFormat: 'MMMM D, YYYY',
    borderColor: '#000000',
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: '#FFFFFF'
  },
```

to:

```ts
  appearance: {
    theme: 'drugstore',
    logoPath: '',
    eventName: '',
    dateStampEnabled: true,
    dateStampFormat: 'MMMM D, YYYY',
    borderColor: '#000000',
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: '#FFFFFF'
  },
```

Drugstore is the default because it matches the current visual direction (bold, loud, event-appropriate) and is the lowest-risk pick — it's a dark theme, so leftover hardcoded `#fff` text (which the cleanup should have removed) would still be visible even in a regression. The only theme that would expose such bugs catastrophically is wedding.

- [ ] **Step 3: Update the schema doc**

Open `docs/07-epic-admin-settings.md`. Find the `# Appearance` block inside the "Complete Settings Schema" fenced code block (around line 37–45). Insert a new line at the top of the Appearance block. The block should now read:

```
# Appearance
appearance.theme             : string  = "drugstore"   # drugstore | artDeco | wedding
appearance.logoPath          : string  = ""           # Path to logo image file
appearance.eventName         : string  = ""           # Event name text on strip
appearance.dateStampEnabled  : boolean = true          # Show date on strip
appearance.dateStampFormat   : string  = "MMMM D, YYYY" # Date format string
appearance.borderColor       : string  = "#000000"     # Photo border color
appearance.borderStyle       : string  = "none"        # none | solid | dashed | double
appearance.borderWidth       : number  = 0             # Border width in pixels (0-20)
appearance.backgroundColor   : string  = "#FFFFFF"     # Strip background color
```

Touch nothing else in this doc.

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(settings): add appearance.theme to settings schema

Adds a persisted `appearance.theme` field (default: drugstore) to
settingsService and documents it in docs/07-epic-admin-settings.md
Story 7.1. The admin UX in the upcoming tasks will drive this field.
```

Wait for confirmation.

---

## Task 3.2 — Add `theme` to appSettingsStore

**Files:**

- Modify: `src/renderer/src/stores/appSettingsStore.ts`

`appSettingsStore` is the renderer-side mirror of cross-cutting settings. Add a `theme` string field and a `setTheme` action. The useSettingsPersistence hook (Task 3.3) will wire this store entry to the settings service so it auto-persists like every other field.

- [ ] **Step 1: Edit the store**

Open `src/renderer/src/stores/appSettingsStore.ts`. Insert a `theme` field alongside the other cross-cutting fields. The full new file contents:

```ts
import { create } from 'zustand'

interface AppSettingsState {
  // Appearance (theme only — strip-branding fields live in stripSettingsStore)
  theme: string // "drugstore" | "artDeco" | "wedding"

  // PIN
  pinCode: string

  // Kiosk
  kioskAutoStart: boolean
  kioskPreventSleep: boolean
  kioskPreventAltTab: boolean
  kioskFullscreenLock: boolean
  kioskIdleTimeout: number // seconds (0 = disabled)

  // Language
  userLocale: string // "en" or "nl"

  // Gallery
  gallerySavePath: string

  // Audio
  audioMusicMode: string // "idle" | "session" | "always" | "off"
  audioMusicVolume: number // 0-100
  audioCountdownBeep: boolean
  audioShutterSound: boolean

  // Actions
  setTheme: (theme: string) => void
  setPinCode: (code: string) => void
  setKioskAutoStart: (enabled: boolean) => void
  setKioskPreventSleep: (enabled: boolean) => void
  setKioskPreventAltTab: (enabled: boolean) => void
  setKioskFullscreenLock: (enabled: boolean) => void
  setKioskIdleTimeout: (seconds: number) => void
  setUserLocale: (locale: string) => void
  setGallerySavePath: (path: string) => void
  setAudioMusicMode: (mode: string) => void
  setAudioMusicVolume: (volume: number) => void
  setAudioCountdownBeep: (enabled: boolean) => void
  setAudioShutterSound: (enabled: boolean) => void
}

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  theme: 'drugstore',
  pinCode: '0000',
  kioskAutoStart: false,
  kioskPreventSleep: true,
  kioskPreventAltTab: true,
  kioskFullscreenLock: true,
  kioskIdleTimeout: 60,
  userLocale: 'en',
  gallerySavePath: '',
  audioMusicMode: 'idle',
  audioMusicVolume: 50,
  audioCountdownBeep: true,
  audioShutterSound: true,

  setTheme: (theme) => set({ theme }),
  setPinCode: (code) => set({ pinCode: code }),
  setKioskAutoStart: (enabled) => set({ kioskAutoStart: enabled }),
  setKioskPreventSleep: (enabled) => set({ kioskPreventSleep: enabled }),
  setKioskPreventAltTab: (enabled) => set({ kioskPreventAltTab: enabled }),
  setKioskFullscreenLock: (enabled) => set({ kioskFullscreenLock: enabled }),
  setKioskIdleTimeout: (seconds) => set({ kioskIdleTimeout: seconds }),
  setUserLocale: (locale) => set({ userLocale: locale }),
  setGallerySavePath: (path) => set({ gallerySavePath: path }),
  setAudioMusicMode: (mode) => set({ audioMusicMode: mode }),
  setAudioMusicVolume: (volume) => set({ audioMusicVolume: Math.max(0, Math.min(100, volume)) }),
  setAudioCountdownBeep: (enabled) => set({ audioCountdownBeep: enabled }),
  setAudioShutterSound: (enabled) => set({ audioShutterSound: enabled })
}))
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add theme field + setTheme action to appSettingsStore

Adds a `theme` string state and a `setTheme` setter to the
cross-cutting renderer store. Default: 'drugstore'. Wiring to
the persistence hook happens in the next task.
```

Wait for confirmation.

---

## Task 3.3 — Add `appearance.theme` to useSettingsPersistence

**Files:**

- Modify: `src/renderer/src/hooks/useSettingsPersistence.ts`

`useSettingsPersistence` owns the mapping table from settings-service keys to Zustand-store reads/writes. Every persisted field has exactly one entry here. Adding `appearance.theme` bridges the store field to the settings service so it's auto-persisted on change and auto-hydrated on boot.

- [ ] **Step 1: Add the mapping entry**

Open `src/renderer/src/hooks/useSettingsPersistence.ts`. Find the `// ── Appearance ──` comment inside `buildMappings()` (around line 34). Immediately after the comment, before the existing `appearance.logoPath` entry, insert:

```ts
    {
      key: 'appearance.theme',
      get: () => app.getState().theme,
      set: (v) => app.getState().setTheme(v as string),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.theme !== prev.theme) cb()
        })
    },
```

The `app` alias is already defined earlier in `buildMappings()` (it's `useAppSettingsStore`). Nothing else in this file needs to change.

- [ ] **Step 2: Verify persistence**

Run: `npm run dev`

Open the app. In DevTools console:

```js
// Read the settings cache
window.api.settings.getAll().then(console.log)
```

Expected: the returned object contains `appearance.theme: "drugstore"`.

Then manually flip the store in DevTools:

```js
// Simulate a theme change
window.dispatchEvent(new Event('test'))
// (Actually easier: open the React DevTools, find useAppSettingsStore's value,
//  or just trust that Task 3.9's picker will exercise the path)
```

The more reliable smoke test: in DevTools Console, execute the following, then close and reopen the app:

```js
// Persist drugstore → artDeco directly via IPC, bypassing the store
await window.api.settings.set('appearance.theme', 'artDeco')
```

Kill the dev server, run `npm run dev` again, and in the new session run:

```js
window.api.settings.get('appearance.theme').then(console.log)
```

Expected: `"artDeco"`. Then reset it:

```js
await window.api.settings.set('appearance.theme', 'drugstore')
```

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): wire appearance.theme through useSettingsPersistence

Adds an entry to the settings-service ↔ store mapping table so
appearance.theme auto-hydrates from disk at boot and auto-persists
when the store changes. Verified survival across an app restart.
```

Wait for confirmation.

---

## Task 3.4 — Create themes/index.ts registry

**Files:**

- Create: `src/renderer/src/themes/index.ts`

A tiny TypeScript registry that components import to get the list of themes (id, display name) and to read the raw palette values of a theme without inspecting the DOM. The registry is the single source of truth for theme metadata in the renderer.

- [ ] **Step 1: Write the file**

Write `src/renderer/src/themes/index.ts`:

```ts
/**
 * Theme registry.
 *
 * Single source of truth for:
 *  - The set of available themes (id + human display name).
 *  - A palette snapshot for each theme, used by non-CSS consumers
 *    like `Apply theme to strip` (which copies colors into
 *    stripSettingsStore) and thumbnail generation.
 *
 * The actual token values still live in the theme CSS files
 * (drugstore.css / artDeco.css / wedding.css). This file is a
 * typed mirror of the subset that non-CSS code needs. When a value
 * changes in a CSS file, mirror the change here by hand.
 */

export type ThemeId = 'drugstore' | 'artDeco' | 'wedding'

export interface ThemeMetadata {
  id: ThemeId
  displayName: string
  /** Hex colors mirrored from the matching .css file. */
  palette: {
    bg: string
    surface: string
    text: string
    accent: string
    accentContrast: string
    border: string
  }
}

export const THEMES: readonly ThemeMetadata[] = [
  {
    id: 'drugstore',
    displayName: 'Drugstore',
    palette: {
      bg: '#1a1210',
      surface: '#2a1a15',
      text: '#faf3e7',
      accent: '#d32f2f',
      accentContrast: '#faf3e7',
      border: '#faf3e7'
    }
  },
  {
    id: 'artDeco',
    displayName: 'Art Deco',
    palette: {
      bg: '#0a0908',
      surface: '#141210',
      text: '#f6f0e4',
      accent: '#c9a646',
      accentContrast: '#0a0908',
      border: '#c9a646'
    }
  },
  {
    id: 'wedding',
    displayName: 'Elegant Wedding',
    palette: {
      bg: '#f4efe6',
      surface: '#ffffff',
      text: '#2a2622',
      accent: '#3a3532',
      accentContrast: '#ffffff',
      border: '#d4c9b8'
    }
  }
] as const

export function getTheme(id: string): ThemeMetadata | undefined {
  return THEMES.find((t) => t.id === id)
}

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add themes/index.ts registry

Introduces a typed registry with { id, displayName, palette } for
each theme. Mirrors the CSS-file values so non-CSS consumers
(ThemePicker, Apply-to-strip button) can read palettes without
parsing the DOM.
```

Wait for confirmation.

---

## Task 3.5 — Create useThemeApplication hook

**Files:**

- Create: `src/renderer/src/hooks/useThemeApplication.ts`

The hook that subscribes to `appSettingsStore.theme` and mirrors its value onto `<html data-theme="...">`. It's mounted once in `App.tsx` (Task 3.6). Everything else in the app — every CSS module — picks up the change automatically via the cascade. No React re-renders for non-admin UI, no context gymnastics.

- [ ] **Step 1: Write the file**

Write `src/renderer/src/hooks/useThemeApplication.ts`:

```ts
import { useEffect } from 'react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { isThemeId } from '@/themes'

/**
 * Mirrors appSettingsStore.theme onto <html data-theme="...">.
 *
 * Mount once at the app root. The CSS cascade handles everything else:
 * per-theme :root[data-theme="X"] rules in themes/*.css win over the
 * defaults in tokens.css, instantly restyling the entire user-facing UI.
 *
 * If the stored value is not a recognized theme id (e.g., the settings
 * file was hand-edited with garbage), falls back to the default theme
 * (drugstore) rather than letting every token revert to its :root
 * default — which on a first-boot could look worse than the wrong theme.
 */
export function useThemeApplication(): void {
  const theme = useAppSettingsStore((s) => s.theme)

  useEffect(() => {
    const effectiveTheme = isThemeId(theme) ? theme : 'drugstore'
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [theme])
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add useThemeApplication hook

Subscribes to appSettingsStore.theme and mirrors the value onto
<html data-theme="...">. Invalid stored values fall back to the
default theme rather than unsetting the attribute. Mounted in
App.tsx in the next task.
```

Wait for confirmation.

---

## Task 3.6 — Mount useThemeApplication in App.tsx

**Files:**

- Modify: `src/renderer/src/App.tsx`

The hook needs to run after `useSettingsPersistence` has hydrated the store from disk — otherwise its first pass would run against the store's in-memory default (drugstore) and miss the persisted value for ~100ms. In practice `useSettingsPersistence` already gates rendering with a `ready` flag, so mounting the hook inside the `ready`-gated return path is enough — but we mount it unconditionally alongside the other lifecycle hooks because it's cheap and React will re-run its effect once the store hydrates.

- [ ] **Step 1: Edit App.tsx**

Open `src/renderer/src/App.tsx`. Add the import and the hook call. The new full file:

```tsx
import Layout from '@/components/Layout/Layout'
import ScreenRouter from '@/components/ScreenRouter/ScreenRouter'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import { useCameraLifecycle } from '@/hooks/useCameraLifecycle'
import { useMusicLifecycle } from '@/hooks/useMusicLifecycle'
import { useSettingsPersistence } from '@/hooks/useSettingsPersistence'
import { useStressTest } from '@/hooks/useStressTest'
import { useThemeApplication } from '@/hooks/useThemeApplication'

function App(): React.JSX.Element {
  const { ready } = useSettingsPersistence()
  useCameraLifecycle()
  useMusicLifecycle()
  useStressTest()
  useThemeApplication()

  if (!ready) {
    return <div />
  }

  return (
    <Layout>
      <ErrorBoundary>
        <ScreenRouter />
      </ErrorBoundary>
    </Layout>
  )
}

export default App
```

- [ ] **Step 2: Verify the attribute is applied**

Run: `npm run dev`

Open DevTools → Elements. Inspect `<html>`. Expected: `<html data-theme="drugstore">` (assuming the settings file has the default value).

In DevTools Console, simulate a change the way the picker will:

```js
// Reach into Zustand to change theme without the picker UI existing yet
const store = window.__ZUSTAND_APP_SETTINGS__ // if exposed
// If not exposed (normal case), just edit the settings file directly:
await window.api.settings.set('appearance.theme', 'artDeco')
// The mapping subscription will update the store → the hook → the attribute
```

Expected: `<html>`'s `data-theme` flips to `artDeco` within a frame, and the whole visible UI restyles accordingly. Visit Home, Session (mock a session or skip), Review — confirm the Art Deco look applies. Set it back to drugstore:

```js
await window.api.settings.set('appearance.theme', 'drugstore')
```

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): mount useThemeApplication at app root

Wires the hook in App.tsx so <html data-theme="..."> stays in sync
with the persisted appearance.theme setting. Verified in DevTools:
toggling the value live restyles every user-facing screen.
```

Wait for confirmation.

---

## Task 3.7 — Create ThemePreviewPane component

**Files:**

- Create: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePreviewPane.tsx`
- Create: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePreviewPane.module.css`

A scoped, subtree-themed mini preview of the home screen. Because CSS variables cascade, wrapping a subtree in `<div data-theme={id}>` re-scopes every `var(--color-*)` lookup inside that subtree to the given theme, while the admin UI around it keeps its own neutral style.

The implementation shows a mock "home-screen-ish" layout (heading + button + secondary text) rather than rendering the real `HomeScreen` component. Rationale: real `HomeScreen` depends on navigation, idle-timeout hooks, and camera state — coupling the admin preview to all that is fragile. A dedicated mock that replicates the essential visual elements (background, heading, primary button, muted secondary text) is enough to convey what each theme feels like.

- [ ] **Step 1: Write the component**

Write `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePreviewPane.tsx`:

```tsx
import type { ThemeId } from '@/themes'
import styles from './ThemePreviewPane.module.css'

interface ThemePreviewPaneProps {
  themeId: ThemeId
}

/**
 * Scoped live preview of a theme.
 *
 * Wraps the mock content in <div data-theme={themeId}>, which re-scopes
 * every var(--color-*) / var(--font-*) / var(--button-radius) lookup
 * inside it to that theme. The admin UI around this div keeps its own
 * neutral --admin-* palette.
 *
 * The mock intentionally does NOT reuse the real HomeScreen component —
 * HomeScreen depends on navigation, camera state, and the idle-timeout
 * hook, none of which belong in an admin preview pane. Instead it shows
 * the essential visual ingredients: background, heading in --font-display,
 * a primary button, and muted supporting text. That's enough to convey
 * what each theme feels like without the coupling risk.
 */
function ThemePreviewPane({ themeId }: ThemePreviewPaneProps): React.JSX.Element {
  return (
    <div className={styles.frame}>
      <div className={styles.scope} data-theme={themeId}>
        <div className={styles.stage}>
          <h1 className={styles.heading}>Take Your Photos</h1>
          <p className={styles.subheading}>Tap the button to start</p>
          <button type="button" className={styles.primaryButton}>
            START
          </button>
          <p className={styles.footer}>Powered by Open Photobooth</p>
        </div>
      </div>
    </div>
  )
}

export default ThemePreviewPane
```

- [ ] **Step 2: Write the CSS**

Write `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePreviewPane.module.css`:

```css
/*
 * ThemePreviewPane styles.
 *
 * `.frame` lives in the admin UI and stays neutral (--admin-* tokens).
 * `.scope` and everything inside it lives inside a data-theme subtree —
 * it references themed tokens (--color-*, --font-*, shape tokens) so the
 * cascade picks up the correct theme's values.
 */

.frame {
  width: 100%;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-input-radius);
  overflow: hidden;
  background: var(--admin-surface);
}

.scope {
  /* Intentionally references themed tokens — this subtree is re-scoped
     by data-theme on this element. */
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  padding: 32px 24px;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 320px;
}

.heading {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 28px;
  color: var(--color-text);
  margin: 0;
  text-align: center;
}

.subheading {
  font-family: var(--font-body);
  color: var(--color-text-muted);
  font-size: 14px;
  margin: 0;
  text-align: center;
}

.primaryButton {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 20px;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-radius: var(--button-radius);
  border-width: var(--button-border-width);
  border-style: var(--button-border-style);
  border-color: var(--color-border);
  box-shadow: var(--button-shadow);
  padding: 14px 36px;
  margin-top: 8px;
  cursor: pointer;
  /* Admin preview is not an actual touch target — pointer-events disabled
     via pointer-events: none would block hover too, so instead we keep it
     clickable but it has no onClick handler. */
}

.footer {
  font-family: var(--font-body);
  color: var(--color-text-muted);
  font-size: 11px;
  margin: 12px 0 0 0;
  opacity: 0.7;
}
```

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add ThemePreviewPane component

Scoped live preview of a theme — wraps a mock home-screen layout
in <div data-theme={id}> so CSS variables re-resolve to that theme
inside the subtree while the admin UI around it stays neutral.
Not yet mounted in AppearanceSection — that happens in Task 3.9.
```

Wait for confirmation.

---

## Task 3.8 — Create ThemePicker component

**Files:**

- Create: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePicker.tsx`
- Create: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePicker.module.css`

The picker is three side-by-side tiles — one per theme — each showing that theme's name rendered in its own palette and fonts, with a selection ring around the current choice. Clicking a tile calls `setTheme` on the store; persistence happens automatically via the mapping table.

**Design decision:** Instead of static PNG thumbnails (which the spec mentions as an option in §6.1), each tile is rendered with the same `data-theme` scoping technique used in `ThemePreviewPane`. This means there's nothing to generate, nothing to commit to `assets/theme-thumbnails/`, and adding a new theme in the future is a one-line registry change. The tile is a mini ThemePreviewPane without the body text.

- [ ] **Step 1: Write the component**

Write `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePicker.tsx`:

```tsx
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { THEMES, type ThemeId } from '@/themes'
import styles from './ThemePicker.module.css'

/**
 * Horizontal row of theme tiles. Clicking a tile persists the selection
 * via the appSettingsStore → useSettingsPersistence → settingsService path.
 *
 * Each tile is rendered inside a data-theme scope so it shows the actual
 * theme — no PNG thumbnails to maintain. Adding a new theme later is a
 * one-line registry change; the picker picks it up automatically.
 */
function ThemePicker(): React.JSX.Element {
  const selectedTheme = useAppSettingsStore((s) => s.theme)
  const setTheme = useAppSettingsStore((s) => s.setTheme)

  return (
    <div className={styles.wrapper}>
      <div className={styles.tileRow}>
        {THEMES.map((theme) => {
          const isSelected = theme.id === selectedTheme
          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.tile} ${isSelected ? styles.tileSelected : ''}`}
              onClick={() => setTheme(theme.id)}
              aria-pressed={isSelected}
              aria-label={`Select ${theme.displayName} theme`}
            >
              <div className={styles.tilePreview} data-theme={theme.id}>
                <div className={styles.tileStage}>
                  <div className={styles.tileHeading}>Aa</div>
                  <div className={styles.tileChip} />
                </div>
              </div>
              <div className={styles.tileLabel}>{theme.displayName}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ThemePicker

export type { ThemeId }
```

- [ ] **Step 2: Write the CSS**

Write `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/ThemePicker.module.css`:

```css
/*
 * ThemePicker styles.
 *
 * The outer button + label are admin UI — they reference --admin-* tokens.
 * The .tilePreview div is inside a data-theme scope and references themed
 * tokens (--color-*, --font-*, shape tokens).
 */

.wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tileRow {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 4px;
  border: 2px solid var(--admin-border);
  border-radius: var(--admin-button-radius);
  background: var(--admin-surface);
  cursor: pointer;
  min-width: 140px;
  min-height: var(--touch-target-admin);
  transition:
    border-color 120ms ease,
    transform 120ms ease;
}

.tile:hover {
  border-color: var(--admin-accent);
}

.tile:active {
  transform: scale(0.98);
}

.tileSelected {
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 2px var(--admin-accent-bg-subtle);
}

.tilePreview {
  /* Themed subtree — re-scoped by data-theme on this element. */
  background: var(--color-bg);
  color: var(--color-text);
  border-radius: var(--admin-input-radius);
  padding: 16px 12px;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tileStage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.tileHeading {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  font-size: 32px;
  line-height: 1;
  color: var(--color-text);
}

.tileChip {
  width: 60px;
  height: 12px;
  background: var(--color-accent);
  border-radius: var(--button-radius);
  border-width: var(--button-border-width);
  border-style: var(--button-border-style);
  border-color: var(--color-border);
  box-shadow: var(--button-shadow);
}

.tileLabel {
  /* Back in admin-land — neutral. */
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--admin-text-strong);
  text-align: center;
  padding: 4px 0;
}
```

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add ThemePicker component

Three tiles (one per registered theme), each rendered inside its
own data-theme subtree so it shows the actual palette and fonts
without maintained PNG thumbnails. Clicking a tile sets the theme
via appSettingsStore, which auto-persists through the settings
service. Not yet mounted in AppearanceSection — Task 3.9.
```

Wait for confirmation.

---

## Task 3.9 — Wire ThemePicker + ThemePreviewPane into AppearanceSection

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.tsx`
- Modify: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.module.css`

Place the theme controls at the top of the Appearance section, above the Branding block. The picker is full-width; the preview pane sits below it (also full-width) so the admin sees the theme live as they browse the section.

- [ ] **Step 1: Add the imports and render the new blocks**

Open `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.tsx`. Add imports at the top alongside the existing ones:

```tsx
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { isThemeId, type ThemeId } from '@/themes'
import ThemePicker from './ThemePicker'
import ThemePreviewPane from './ThemePreviewPane'
```

Inside the `AppearanceSection` function, read the current theme from the store alongside the existing strip-settings reads:

```tsx
const themeValue = useAppSettingsStore((s) => s.theme)
const themeId: ThemeId = isThemeId(themeValue) ? themeValue : 'drugstore'
```

Then find the JSX that starts with `<div className={styles.section}>` and its inner `<div className={styles.layout}>` → `<div className={styles.controls}>` block. Immediately after `<SectionHeader title="Branding" />` currently exists — but we want the theme controls **before** the Branding group. Replace the existing layout opening:

```tsx
      <div className={styles.layout}>
        <div className={styles.controls}>
          <SectionHeader title="Branding" />
```

with:

```tsx
      <div className={styles.themeBlock}>
        <SectionHeader title="Theme" />
        <ThemePicker />
        <ThemePreviewPane themeId={themeId} />
      </div>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <SectionHeader title="Branding" />
```

The rest of the component body (FilePicker, TextInput, date stamp block, border/background block, and the StripPreviewCanvas on the right) is unchanged.

- [ ] **Step 2: Add .themeBlock to the stylesheet**

Open `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.module.css`. At the top of the file (or anywhere among the existing rules), add:

```css
.themeBlock {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--admin-border);
}
```

Leave all other rules in this stylesheet alone — they were cleaned up in Task 1.17 and should not be touched now.

- [ ] **Step 3: Verify live**

Run: `npm run dev`

Open admin via the gesture → Appearance section. Expected:

- "Theme" heading at the top, above "Branding".
- Three tiles in a row: Drugstore (currently bordered in the admin accent as the selected one), Art Deco, Elegant Wedding. Each tile renders in its own palette.
- Below the tiles, a preview pane showing a mock home screen rendered in the currently selected theme.
- Clicking a different tile:
  - Moves the selection ring to that tile.
  - Updates the preview pane to that theme immediately.
  - Flips `<html data-theme="...">` — which re-themes the **entire user-facing UI**, including the idle-timeout countdown if it fires. The admin UI itself stays neutral (the admin layout uses `--admin-*` tokens, not `--color-*`).
- Close admin, return to Home — the home screen is now in the selected theme.
- Re-open admin → Appearance — the correct tile is still selected.
- Fully restart the app (`Ctrl+C` + `npm run dev`) → the selection persists.

If the admin UI itself visibly re-themes (e.g., buttons take on the drugstore shadow), that means Phase 1 cleanup missed an admin module. Find the leaked `var(--color-*)` or `var(--button-*)` reference and convert it to the `--admin-*` equivalent.

Stop the dev server.

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): surface theme picker in admin Appearance section

Adds a "Theme" block above "Branding" containing the ThemePicker
and ThemePreviewPane. Selection persists via appSettingsStore and
the user-facing UI restyles live as the admin taps through tiles.
Admin UI itself stays neutral because it references --admin-* tokens.
```

Wait for confirmation.

---

## Task 3.10 — Add "Apply theme to strip" button

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.tsx`
- Modify: `src/renderer/src/screens/AdminScreen/sections/AppearanceSection/AppearanceSection.module.css`

A button at the bottom of the Border & Background group that, when clicked, copies the active theme's palette into the strip settings (`borderColor`, `backgroundColor`). Shows an "Applied ✓" confirmation for ~1.5s, then reverts.

**Mapping decision (spec §6.3):**

- `stripSettings.backgroundColor` ← `theme.palette.bg` (page background, the strip's outer color)
- `stripSettings.borderColor` ← `theme.palette.border` (border color token)
- `borderWidth` / `borderStyle` are **not** touched — shape is admin-tunable per taste. If the admin wants a bordered strip, they already set the width manually; if they set it to 0 they don't want one.

- [ ] **Step 1: Add the imports and state**

Open `AppearanceSection.tsx`. Add two more React imports alongside the existing `useRef, useEffect, useCallback`:

```tsx
import { useRef, useEffect, useCallback, useState } from 'react'
```

Add the import for the theme registry helper (it may already be imported from Task 3.9, but add it if not):

```tsx
import { getTheme } from '@/themes'
```

Inside `AppearanceSection`, add a feedback state near the top of the component, after the other store hooks:

```tsx
const [appliedFeedback, setAppliedFeedback] = useState(false)

const handleApplyThemeToStrip = useCallback(() => {
  const theme = getTheme(themeId)
  if (!theme) return
  setBackgroundColor(theme.palette.bg)
  setBorderColor(theme.palette.border)
  setAppliedFeedback(true)
  setTimeout(() => setAppliedFeedback(false), 1500)
}, [themeId, setBackgroundColor, setBorderColor])
```

- [ ] **Step 2: Render the button**

Inside the Border & Background group, after the existing `<ColorPicker label="Background color" ... />` line, add the button:

```tsx
          <ColorPicker
            label="Background color"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />

          <button
            type="button"
            className={styles.applyThemeButton}
            onClick={handleApplyThemeToStrip}
          >
            {appliedFeedback ? 'Applied ✓' : 'Apply current theme to strip'}
          </button>
```

- [ ] **Step 3: Add the button style**

Open `AppearanceSection.module.css`. Add:

```css
.applyThemeButton {
  margin-top: 8px;
  padding: 12px 16px;
  min-height: var(--touch-target-admin);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-input-radius);
  background: var(--admin-button-bg);
  color: var(--admin-text-strong);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.applyThemeButton:hover {
  background: var(--admin-button-hover-bg);
  border-color: var(--admin-accent);
}

.applyThemeButton:active {
  background: var(--admin-button-active-bg);
}
```

- [ ] **Step 4: Verify the round-trip**

Run: `npm run dev`

1. Open admin → Appearance.
2. Select the Art Deco theme via ThemePicker.
3. Click "Apply current theme to strip". Expected: button label flips to "Applied ✓" for ~1.5s, then reverts. Strip preview canvas on the right redraws with black background + gold border.
4. Exit admin. Run a real photo session (or dry-run if no camera — use the stress test hotkey `Ctrl+Shift+T` from `useStressTest`). Review screen should show the strip in black + gold.
5. Re-open admin → Appearance. Switch to Elegant Wedding. Click Apply. Expected: feedback state shows, strip preview redraws with ivory background + warm neutral hairline border.
6. Manually tweak the `borderColor` picker to red. Then switch theme (but DON'T click Apply). Expected: `borderColor` stays red — theme selection does not silently overwrite strip settings. Only the explicit button applies the copy.

Stop the dev server.

- [ ] **Step 5: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add "Apply current theme to strip" button

Copies the active theme's bg and border colors into stripSettings
on click. Shows "Applied ✓" feedback for 1.5s. One-shot copy, not
a live binding — admin tweaks to strip settings are not overwritten
by future theme changes unless the button is clicked again.
```

Wait for confirmation.

---

## Task 3.11 — Phase 3 functional verification gate

**Files:** none (manual verification only)

This is the Definition of Done walkthrough. Every bullet in spec §11 must be checked off.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Leave it running. Open DevTools.

- [ ] **Step 2: Walk the Definition of Done**

Go through each bullet from spec §11 and tick it off only after verifying on-screen.

- [ ] A new admin setting `appearance.theme` exists with values `drugstore | artDeco | wedding` and default `drugstore`.

Verify: `await window.api.settings.get('appearance.theme')` returns `'drugstore'` on a fresh config. The ThemePicker in Appearance shows three tiles matching those three ids (the tile's displayName is the prettified version).

- [ ] Setting persists via settingsService and survives app restart.

Verify: pick Art Deco. Kill the dev server with Ctrl+C. Run `npm run dev` again. The tile for Art Deco is still selected when you re-open Appearance, and `<html data-theme="artDeco">` is set immediately on first render after hydration.

- [ ] The Appearance section has a theme picker with three thumbnails and a live preview pane.

Verify visually. All three tiles render in their own palettes. The preview pane below shows the mock home screen in the currently selected theme. Taps on any tile immediately update both the selection ring and the preview pane.

- [ ] Clicking a thumbnail updates the preview instantly and persists the choice.

Verify: click each tile in turn. The preview pane must update on the same frame (no 200ms JS delay, no flash). Between clicks, check DevTools → Elements → `<html>` and confirm `data-theme` attribute is in sync.

- [ ] After admin exits, all user-facing screens reflect the selected theme.

Verify: select Elegant Wedding. Close admin (swipe/escape). You should land on HomeScreen in the wedding theme — ivory background, Playfair heading, Lato body, pill button. Trigger a session (real or stress test) — Session, Review, Print, ThankYou all themed. If the strip preview on Review shows the strip in its previous colors, that's expected (it reflects stripSettings, not the theme — the Apply button is the bridge).

- [ ] All three themes have been verified on every user-facing screen with no missing colors, invisible text, or font fallback.

This was covered by the Phase 2 gate (Task 2.7). Spot-check it again now: while themed admin is open, click each tile, exit admin, walk the three screens you didn't touch during Phase 2 (anything you skipped). If a new regression appears, fix it the same way.

- [ ] The "Apply theme to strip" button copies theme colors into strip settings and shows feedback.

Verify: switch to Drugstore, click Apply, see "Applied ✓" for 1.5s, see strip preview canvas update to warm-dark background with cream border. Repeat for Art Deco and Wedding.

- [ ] The Inter-font bug in `global.css` is fixed.

Verify: set `data-theme` to an unknown value (e.g., `setTheme('doesNotExist')` — the hook should fall back to drugstore, which uses Roboto Slab as body, not Inter). Clear the attribute: `document.documentElement.removeAttribute('data-theme')`. With no attribute, `:root` defaults in `tokens.css` apply, so `--font-body: 'Inter', sans-serif`. Verify in DevTools → Computed that `body` has `font-family: "Inter", sans-serif` resolved. Task 1.3 fixed this originally, and this step just confirms no later task undid it.

- [ ] No user-facing CSS module file contains a hardcoded color that should be a token.

Verify: run `./scripts/check-hardcoded-colors.sh`. Expected: `✓ No hardcoded hex colors in themed modules.` — exit code 0. If it fails, Phase 1 cleanup missed something; fix it with the same pattern as Tasks 1.11–1.22.

- [ ] Font files bundled with LICENSES.md documenting SIL OFL terms.

Verify: `ls src/renderer/src/assets/fonts/` shows all 12 `.ttf` files plus `LICENSES.md`. The `LICENSES.md` lists every family with its copyright line and upstream link (Task 2.1 Step 3).

- [ ] **Step 3: Stop the dev server**

Only after all bullets above are ticked off.

- [ ] **Step 4: Final commit (usually empty)**

Like the Phase 2 gate, this task usually produces no file changes. If the walkthrough surfaced a bug, fix it as a small separate commit, then tell the user:

```
fix(theme): <specific fix surfaced by Phase 3 DoD walkthrough>
```

If the walkthrough passed clean, tell the user:

```
Phase 3 verification gate passed. Theme system is complete and
meets every bullet in docs/superpowers/specs/2026-04-14-theme-system-design.md §11
(Definition of Done). Ready to merge.
```

---

Theme system implementation plan complete. 🎭
