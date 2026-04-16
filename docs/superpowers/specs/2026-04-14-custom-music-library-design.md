# Custom Music Library — Design Spec

**Date:** 2026-04-14
**Branch:** `feature/better-music`
**Status:** Design approved, pending implementation plan

## Problem

The photobooth ships with three bundled background music tracks (`track-upbeat.mp3`, `track-lounge.mp3`, `track-retro.mp3`), resolved to URLs at Vite build time. Admins have no way to supply their own music. For a wedding, corporate party, or themed event, the default tracks are rarely on-brand.

We want a new admin panel that lets the event host bring their own MP3/WAV files and have them play during sessions instead of the defaults, without requiring a rebuild or network access.

## Scope

**In scope (v1):**

- Admin UI to import, preview, and remove custom background music files.
- Override model: any non-empty custom library fully replaces the bundled tracks.
- Files stored inside the OS `userData` directory; app owns its copies.
- MP3 and WAV formats.
- Up to 30 tracks, 50 MB each.
- Automatic fallback to bundled tracks when the custom library is empty or all files are unplayable.

**Out of scope (explicit YAGNI):**

- Custom SFX (countdown beep, shutter click) — separate future feature.
- Track reordering, renaming, per-track enable/disable.
- Bulk import (zip, folder pick).
- "Repair library" admin action.
- Preview offset, crossfade, or other playback niceties.

## Key design decisions

1. **Override, not slot replacement.** A non-empty custom list fully replaces the defaults. Partial mixing was rejected as confusing — no wedding host wants half the default lounge tracks sneaking into their playlist.
2. **Files are copied into `userData/custom-music/`, not referenced.** The app owns its copies so that unplugging a USB stick or deleting the source file doesn't silently break music mid-event.
3. **Settings stores filenames, not absolute paths.** `userData` paths differ per OS/user; storing filenames keeps `settings.json` portable.
4. **Changes apply on next `playMusic()` call, not mid-playback.** Simpler mental model, avoids edge cases around "admin removed the currently-playing track", and aligns with the existing rule that music never plays in the admin panel.
5. **New dedicated admin section (`MusicLibrarySection`), not an extension of `AudioSection`.** File management UI would make the existing AudioSection too crowded.
6. **Per-track controls are Preview + Remove only.** Reorder, rename, and enable/disable were cut as YAGNI.
7. **Playability validation happens in the renderer, not main.** Main has no audio decoding stack; the renderer already has `HTMLAudioElement`. Main only validates extension + size.
8. **Remove is immediate (no confirmation dialog).** User preference — trust the admin.

## Architecture & data flow

### Storage layout

```
<userData>/
├── settings.json              (existing — new field added)
├── gallery/                   (existing)
└── custom-music/              (NEW — created lazily on first import)
    ├── wedding-mix.mp3
    ├── slow-dance.wav
    └── ...
```

### Settings schema addition

In `src/main/settingsService.ts`, the `audio` namespace gains one field:

```ts
audio: {
  musicMode: 'idle' | 'session' | 'always' | 'off'   // existing
  musicVolume: number                                // existing
  countdownBeep: boolean                             // existing
  shutterSound: boolean                              // existing
  customMusicTracks: string[]                        // NEW — filenames only, in playback order
}
```

Default value: `[]`. An empty array means "play bundled defaults."

### Data flow

**Import:**

```
Admin clicks [+ Add music file]
  → api.musicLibrary.pickAndImport()
  → Main: open file dialog
  → Main: validate extension (.mp3 | .wav), size (≤50 MB), count (<30)
  → Main: copy file → userData/custom-music/<sanitized-filename>
  → Main: append filename to audio.customMusicTracks
  → Returns { filename, url, sizeBytes } to renderer
  → Renderer: playability check on the returned url via temp HTMLAudioElement (3 s timeout)
  → On failure: call api.musicLibrary.remove(filename), show error
  → On success: refetch list, render row
```

**Playback resolution:**

```
Something needs to start music (hook or preview button)
  → getActiveMusicTracks() helper
  → api.musicLibrary.resolveActive() returns absolute paths
  → if empty → fall back to bundled MUSIC_TRACKS
  → else → map to file:// URLs
  → audioService.playMusic(tracks)
```

### Architectural rule

`audioService` stays dumb. It takes `tracks: string[]` and plays them. It has no concept of "custom" vs "default." All override logic lives in the thin `getActiveMusicTracks` helper that call sites use in place of the current `MUSIC_TRACKS` constant.

## Main process

### New file: `src/main/musicLibraryService.ts`

```ts
async function init(userDataPath: string): Promise<void>

// Copy a file into custom-music/, handle collisions, validate extension + size.
// Does NOT write settings — caller decides whether to persist.
// Throws typed errors: InvalidExtension | FileTooLarge | LibraryFull | IOError
async function importTrackFile(sourcePath: string): Promise<{ storedFilename: string }>

async function deleteTrackFile(filename: string): Promise<void>

// Return absolute paths for filenames, in order.
// Silently skips any file that no longer exists on disk (with a warn log).
function resolveTrackPaths(filenames: string[]): string[]

// For a future "repair library" action; not wired into UI in v1.
async function listOrphanFiles(settingsList: string[]): Promise<string[]>
```

**Why a dedicated service:** `storageService.ts` owns the photo gallery and has different semantics (timestamped session folders, date-keyed listing). Music library is append-only, filename-unique, and format-validated. Keeping them separate follows the one-service-one-responsibility pattern already established in this codebase.

### Import flow

```
importTrackFile(sourcePath):
  1. Validate extension (.mp3 or .wav, case-insensitive) → else InvalidExtension
  2. fs.stat the source → fail fast if unreadable
  3. Size ≤ 50 MB → else FileTooLarge
  4. Derive safe filename:
       - strip path, keep basename
       - sanitize: replace [^a-zA-Z0-9._-] with '-'
       - if target exists: append "-1", "-2"... until free
  5. Copy source → custom-music/<safeFilename>
  6. Return { storedFilename }
```

### IPC endpoints

Added to `src/main/ipcHandlers.ts` and exposed via `src/preload/index.ts`:

```ts
musicLibrary: {
  // Single atomic operation: dialog + import + settings append.
  // Keeps the renderer from holding stale paths mid-flow.
  // Returns the new track's info directly so the renderer can run its
  // playability check without a follow-up list() call.
  pickAndImport(): Promise<
    | { ok: true; track: { filename: string; url: string; sizeBytes: number } }
    | { ok: false; reason: 'cancelled' | 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error'; message?: string }
  >

  // Delete file + remove from settings in one call.
  remove(filename: string): Promise<void>

  // Returns absolute paths for the active playlist in order.
  // Empty array means "no custom library — use bundled defaults."
  resolveActive(): Promise<string[]>

  // Return list data for the admin UI, with file:// URLs pre-formatted.
  list(): Promise<Array<{ filename: string; url: string; sizeBytes: number }>>
}
```

**Why `pickAndImport` is a single call instead of separate `selectFile` + `importFile`:** prevents the renderer from holding a stale source path if something fails or races between the two steps. The dialog, file copy, and settings append are one atomic operation from the renderer's perspective.

**Why `list` returns pre-formatted `url`:** the admin UI shouldn't need to know about `file://` path construction. Encapsulate the path semantics in the main process.

**Why `resolveActive` returns empty for "use defaults":** explicit over magic sentinel. An empty array naturally falls through to the bundled fallback in `getActiveMusicTracks`.

**Concurrency:** IPC handlers serialize per-channel in Electron, so back-to-back `pickAndImport` calls cannot interleave. No explicit locks needed.

## Renderer

### Active-playlist helper

New file: `src/renderer/src/services/musicLibraryService.ts`

```ts
import { MUSIC_TRACKS } from '@/services/audioService'

export async function getActiveMusicTracks(): Promise<string[]> {
  const customPaths = await window.api.musicLibrary.resolveActive()
  if (customPaths.length > 0) {
    return customPaths.map((p) => `file://${p}`)
  }
  return MUSIC_TRACKS
}
```

### Call-site updates

Every place that currently passes `MUSIC_TRACKS` directly to `playMusic()` becomes:

```ts
playMusic(await getActiveMusicTracks())
```

Known call sites to update (to be confirmed exactly during implementation):

- The music-lifecycle hook that drives mode-based playback.
- The existing "Preview Music" button in `AudioSection`.

The `async` helper adds a micro-delay (one settings read) before playback starts — imperceptible in practice.

### New section: `MusicLibrarySection`

Location: `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/`

Files:

- `MusicLibrarySection.tsx`
- `MusicLibrarySection.module.css`

Sidebar ordering: placed immediately **after** `AudioSection`, so audio config and audio content are adjacent in the admin navigation.

### UI layout

```
┌─────────────────────────────────────────────────┐
│  Music Library                                  │
│                                                 │
│  When your custom library is empty, the three   │
│  default tracks bundled with the app will play. │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  wedding-mix.mp3        [▶ Preview] [✕]   │  │
│  │  slow-dance.wav         [▶ Preview] [✕]   │  │
│  │  upbeat-pop.mp3         [▶ Preview] [✕]   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [ + Add music file ]           3 / 30 tracks   │
│                                                 │
│  Supported formats: MP3, WAV. Max 50 MB each.   │
└─────────────────────────────────────────────────┘
```

### State

Local `useState` only. No new Zustand store — this data is only needed inside the section, and active-playlist resolution talks to main directly on demand.

- `tracks: TrackInfo[]` — loaded via `api.musicLibrary.list()` on mount and after every mutation.
- `previewingFilename: string | null` — which row is currently previewing.
- `importing: boolean` — disables the `+ Add` button during an import.

### Row behavior

**Preview button:**

- Calls `playMusic([row.url])`.
- Button toggles to "Stop Preview" while active; other rows' preview buttons become disabled.
- Auto-stops after 10 s (matches the existing `PREVIEW_DURATION_MS` pattern in `AudioSection`).
- Starting a new preview stops the current one first.

**Remove button:**

- No confirmation dialog (per user preference).
- `await api.musicLibrary.remove(filename)` → refetch list.
- On failure, show an inline error on the row.
- If the removed track was currently previewing, the preview stops automatically as part of the refetch (the row vanishes).

### Add button

1. Disabled while an import is in flight.
2. Calls `api.musicLibrary.pickAndImport()`.
3. On `{ ok: true }`: renderer runs a playability check using the returned `track.url` via a short-lived `HTMLAudioElement`:
   - Attach `canplaythrough` and `error` listeners.
   - 3-second timeout.
   - On failure, call `api.musicLibrary.remove(track.filename)` to clean up and show an error dialog via `errorStore.showError()`.
   - On success, refetch the list and render the new row.
4. On `{ ok: false, reason: 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error' }`: show an error dialog with a clear message.
5. On `{ ok: false, reason: 'cancelled' }`: no-op, button re-enables.

### 30-track cap

The `+ Add music file` button is disabled when the list has 30 entries, with a tooltip: "Remove a track to add another." Main process also enforces the cap as a belt-and-braces check.

### Existing AudioSection

The existing `AudioSection` requires only a one-line change: its "Preview Music" button swaps from `playMusic(MUSIC_TRACKS)` to `playMusic(await getActiveMusicTracks())`. No UI changes. This means admins can verify from the audio panel that their library swap "took effect."

## Error handling

| Case                                                        | Handling                                                                                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-audio file picked (e.g. `.pdf`)                         | Main throws `InvalidExtension` → renderer shows "Only MP3 and WAV files are supported."                                                                        |
| File over 50 MB                                             | Main throws `FileTooLarge` → renderer shows "File is too large. Maximum size is 50 MB."                                                                        |
| File copy fails (disk full, permission)                     | Main throws `IOError` → renderer shows "Could not import file: <reason>."                                                                                      |
| 30-track cap reached                                        | UI disables the Add button; main throws `LibraryFull` as a backstop.                                                                                           |
| File has audio extension but isn't decodable                | Renderer-side playability check fails → auto-delete via `remove` → error dialog "This file could not be played. It may be corrupt or in an unsupported codec." |
| File on disk missing at playback (manual tampering)         | `resolveTrackPaths` silently skips missing files with a warn log. If _all_ are missing, `resolveActive` returns empty → defaults play. Never crashes.          |
| Admin removes the currently-previewing track                | Preview stops as part of remove flow (refetch → row vanishes → state cleared). No crash — `stopMusicImmediate()` runs first.                                   |
| Double-click on Add button                                  | Prevented at UI layer (`importing` flag).                                                                                                                      |
| Settings/disk desync (file missing, filename still in list) | Handled as "missing at playback" above. No proactive repair in v1.                                                                                             |
| All custom files become unplayable                          | `getActiveMusicTracks` falls back to bundled defaults. Warn logged.                                                                                            |

### Crash safety

All new code paths are wrapped so that a broken music library cannot prevent app startup or session runtime. If `musicLibraryService.init` fails (e.g. cannot create `custom-music/`), the error is logged and app startup continues with bundled tracks as the only option. Music is an enhancement, not a blocker.

### Logging

All via `loggingService.ts`:

- **Info** — `music-library`: track imported, track removed, playlist resolved (filename count only).
- **Warn** — `music-library`: file missing at resolve, playability check failed.
- **Error** — `music-library`: import failure, IO failure.

## Testing

### Unit tests

1. **`musicLibraryService.test.ts`** (main, Vitest, temp directory):
   - Import happy path → file exists in target, filename returned.
   - Extension rejection (`.pdf`, `.PDF`, no extension).
   - Size rejection (mock `fs.stat` > 50 MB).
   - Collision handling (`music.mp3` → `music-1.mp3` → `music-2.mp3`).
   - Filename sanitization (`my music!.mp3` → `my-music-.mp3`).
   - `resolveTrackPaths` filters missing files.
   - `deleteTrackFile` is a no-op for already-missing files.
   - `init` tolerates a pre-existing directory.

2. **`getActiveMusicTracks.test.ts`** (renderer, Vitest, mocked `window.api`):
   - Empty custom list → returns bundled `MUSIC_TRACKS`.
   - Non-empty custom list → returns those with `file://` prefixes.
   - Partial-missing (main already filtered) → returns what main returned.

3. **`MusicLibrarySection.test.tsx`** (renderer, Testing Library, mocked `window.api`):
   - Empty state renders the "bundled defaults" helper text.
   - Rows render filename + Preview + Remove.
   - `+ Add` disabled at 30 tracks.
   - Remove → calls api + refetches.
   - Preview → calls `playMusic` with the row's URL.
   - Import error path → error dialog shown.

The `audioService` itself is out of scope for new tests — it is unchanged.

### Manual smoke test

Per CLAUDE.md's "start the dev server and use the feature in a browser" rule:

1. Import an MP3, verify it plays via "Preview Music" in `AudioSection`.
2. Remove all custom tracks, verify bundled defaults return.
3. Attempt to import a `.pdf` → error dialog.
4. Import two files with the same basename → both coexist with `-1` suffix.
5. Restart app → custom list persists.

## Settings schema documentation

Per CLAUDE.md, `docs/07-epic-admin-settings.md` Story 7.1 must be updated to reflect the new `audio.customMusicTracks` field. This will be listed as a plan task.

## i18n

The new section's user-facing strings are part of the **admin UI**, which is English-only per the existing project convention (CLAUDE.md: "Admin UI text does not need to be in translation files"). No new keys required in `en.json` / `nl.json`.

## Open questions for implementation

These are small enough to resolve during implementation rather than revisiting the spec:

- Exact hook name / file that currently drives music playback by screen mode (to locate all `playMusic(MUSIC_TRACKS)` call sites).
- Exact file that wires admin section navigation (to add `MusicLibrarySection` to the sidebar).
- Whether to use an existing error-dialog component or reuse `errorStore.showError()` directly.
