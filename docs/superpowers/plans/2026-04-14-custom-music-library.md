# Custom Music Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins import their own MP3/WAV background music files via a new admin panel; a non-empty custom library fully replaces the three bundled tracks, with automatic fallback when the library is empty or files are missing.

**Architecture:** Main process owns a new `musicLibraryService` that stores imported files in `<userData>/custom-music/`, validates extension/size/collisions, and exposes them to the renderer via a registered `custom-music://library/<filename>` privileged protocol. The renderer never touches filesystem paths: it gets fully-formed URLs from IPC and hands them to the existing (unchanged) `audioService.playMusic(tracks)`. Settings persist filenames only, keeping `settings.json` portable across machines. A thin `getActiveMusicTracks()` renderer helper chooses between custom URLs and the bundled `MUSIC_TRACKS` fallback on every playback start.

**Tech Stack:** Electron 39, TypeScript, React 19, Zustand, Vitest + jsdom + Testing Library, node `fs/promises`.

**Git note:** The human user handles all git writes personally. No task in this plan runs `git add`, `git commit`, `git push`, or any staging command. Human-managed checkpoints are called out in prose only — never as a shell step.

**Protocol decision (resolved):** Option 2 — register a `custom-music://` privileged scheme in main. Rejected option 1 (`file://` URLs from the renderer) because Chromium hard-blocks `http://` (dev) → `file://` subresource loads, silently breaking music in dev. Rejected option 3 (base64 data URLs) as wasteful.

**Scope note:** The existing `audioService` is unchanged. `MUSIC_TRACKS` stays exported from `src/renderer/src/services/audioService.ts` as the fallback. No changes to `storageService`, `printerService`, any Zustand store, or any other admin section.

---

## File Structure

### Created

- `src/main/musicLibraryService.ts` — file-system side of the music library: init, sanitize, import, delete, resolve, list, orphan detection.
- `src/renderer/src/services/musicLibraryService.ts` — tiny renderer helper (`getActiveMusicTracks()`).
- `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection.tsx` — admin panel section.
- `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection.module.css` — CSS module.
- `tests/main/musicLibraryService.test.ts` — vitest unit tests for the main service (real temp dir).
- `tests/services/musicLibraryService.test.ts` — vitest unit tests for the renderer helper.
- `tests/screens/AdminScreen/MusicLibrarySection.test.tsx` — Testing Library tests for the section.

### Modified

- `src/main/settingsService.ts` — add `audio.customMusicTracks: string[]` to `SettingsSchema` and `DEFAULTS`.
- `src/main/index.ts` — register `custom-music://` privileged scheme at module load; initialize `musicLibraryService`; install `protocol.handle` inside `whenReady`.
- `src/main/ipcHandlers.ts` — add 4 `musicLibrary:*` handlers.
- `src/preload/index.ts` — expose `musicLibrary` namespace on `api`.
- `src/preload/index.d.ts` — add `MusicLibraryAPI` interface and extend `API`.
- `src/renderer/src/hooks/useMusicLifecycle.ts` — make `reconcile()` async, swap `playMusic(MUSIC_TRACKS)` for `playMusic(await getActiveMusicTracks())`, re-check `isMusicPlaying()` after the await.
- `src/renderer/src/screens/AdminScreen/sections/AudioSection/AudioSection.tsx` — swap the preview button to use `getActiveMusicTracks()`.
- `src/renderer/src/screens/AdminScreen/adminSections.ts` — insert `MusicLibrarySection` after the audio entry.
- `tests/setup.ts` — extend `mockApi` with a `musicLibrary` namespace.
- `docs/07-epic-admin-settings.md` — Story 7.1 schema listing gains one line for `audio.customMusicTracks`.

---

## Key constants and types (used across multiple tasks)

These values are referenced by several tasks. Define them in the files where they first appear (as shown in the tasks below) — listed here only so you can cross-check type and name consistency as you work.

```ts
// In src/main/musicLibraryService.ts
const MUSIC_DIR_NAME = 'custom-music'
const MAX_TRACKS = 30
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'] as const
const PROTOCOL_SCHEME = 'custom-music'
const PROTOCOL_HOST = 'library'

export type ImportErrorReason = 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error'

export class MusicLibraryError extends Error {
  constructor(
    public readonly reason: ImportErrorReason,
    message: string
  ) {
    super(message)
    this.name = 'MusicLibraryError'
  }
}

export interface TrackInfo {
  filename: string
  url: string
  sizeBytes: number
}
```

```ts
// In src/preload/index.d.ts
export interface MusicLibraryTrack {
  filename: string
  url: string
  sizeBytes: number
}

export type PickAndImportResult =
  | { ok: true; track: MusicLibraryTrack }
  | {
      ok: false
      reason: 'cancelled' | 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error'
      message?: string
    }

export interface MusicLibraryAPI {
  pickAndImport: () => Promise<PickAndImportResult>
  remove: (filename: string) => Promise<void>
  resolveActive: () => Promise<string[]>
  list: () => Promise<MusicLibraryTrack[]>
}
```

Use these names verbatim everywhere — they appear in preload, IPC handlers, main service, renderer helper, section component, and tests.

---

### Task 1: Add `audio.customMusicTracks` to settings schema

**Files:**

- Modify: `src/main/settingsService.ts:44-50` (SettingsSchema.audio) and `src/main/settingsService.ts:107-113` (DEFAULTS.audio)
- Modify: `docs/07-epic-admin-settings.md:81` (audio block in Story 7.1)

- [ ] **Step 1: Add the field to the `SettingsSchema` interface**

In `src/main/settingsService.ts`, update the `audio` block in `SettingsSchema` (currently lines 44–50):

```ts
  audio: {
    musicMode: string
    musicVolume: number
    countdownBeep: boolean
    shutterSound: boolean
    flashEffect: boolean
    customMusicTracks: string[]
  }
```

- [ ] **Step 2: Add the default value**

In the same file, update `DEFAULTS.audio` (currently lines 107–113):

```ts
  audio: {
    musicMode: 'idle',
    musicVolume: 50,
    countdownBeep: true,
    shutterSound: true,
    flashEffect: true,
    customMusicTracks: []
  },
```

- [ ] **Step 3: Update the Story 7.1 schema doc**

In `docs/07-epic-admin-settings.md`, locate the `# Audio` block around line 77. Add this line immediately after the existing `audio.flashEffect` entry:

```
audio.customMusicTracks      : string[] = []          # Filenames in custom-music/, in playback order
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors.

---

### Task 2: Create `musicLibraryService` shell + `init()` (TDD)

**Files:**

- Create: `src/main/musicLibraryService.ts`
- Create: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write the failing test for `init()`**

Create `tests/main/musicLibraryService.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, stat, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

vi.mock('../../src/main/loggingService', () => ({
  log: vi.fn()
}))

import * as musicLibraryService from '../../src/main/musicLibraryService'

let userDataPath = ''

beforeEach(async () => {
  userDataPath = await mkdtemp(join(tmpdir(), 'music-lib-test-'))
})

afterEach(async () => {
  await rm(userDataPath, { recursive: true, force: true })
})

describe('init', () => {
  it('creates the custom-music directory if it does not exist', async () => {
    await musicLibraryService.init(userDataPath)
    const dirStat = await stat(join(userDataPath, 'custom-music'))
    expect(dirStat.isDirectory()).toBe(true)
  })

  it('is a no-op when the directory already exists', async () => {
    await musicLibraryService.init(userDataPath)
    await musicLibraryService.init(userDataPath)
    const dirStat = await stat(join(userDataPath, 'custom-music'))
    expect(dirStat.isDirectory()).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL with "Cannot find module '../../src/main/musicLibraryService'".

- [ ] **Step 3: Create the service shell with `init()`**

Create `src/main/musicLibraryService.ts`:

```ts
import { mkdir, copyFile, unlink, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, extname, join } from 'path'
import * as loggingService from './loggingService'

// ── Constants ──

const MUSIC_DIR_NAME = 'custom-music'
const MAX_TRACKS = 30
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'] as const

export const PROTOCOL_SCHEME = 'custom-music'
export const PROTOCOL_HOST = 'library'

// ── Types ──

export type ImportErrorReason = 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error'

export class MusicLibraryError extends Error {
  constructor(
    public readonly reason: ImportErrorReason,
    message: string
  ) {
    super(message)
    this.name = 'MusicLibraryError'
  }
}

export interface TrackInfo {
  filename: string
  url: string
  sizeBytes: number
}

// ── Module state ──

let musicDirPath = ''

// ── Public API ──

export async function init(userDataPath: string): Promise<void> {
  musicDirPath = join(userDataPath, MUSIC_DIR_NAME)
  try {
    await mkdir(musicDirPath, { recursive: true })
    loggingService.log('INFO', 'music-library', `Initialized at ${musicDirPath}`)
  } catch (err) {
    loggingService.log(
      'ERROR',
      'music-library',
      `Failed to create custom-music directory: ${(err as Error).message}`
    )
    // Don't rethrow: music is an enhancement, not a blocker for app startup.
  }
}

export function getMusicDirPath(): string {
  return musicDirPath
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for both `init` tests.

---

### Task 3: `sanitizeFilename` (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/main/musicLibraryService.test.ts` (inside the top-level `describe` scope — add a new `describe` block at file bottom before the last closing brace):

```ts
describe('sanitizeFilename', () => {
  it('keeps safe characters as-is', () => {
    expect(musicLibraryService.sanitizeFilename('wedding-mix.mp3')).toBe('wedding-mix.mp3')
    expect(musicLibraryService.sanitizeFilename('Track_01.WAV')).toBe('Track_01.WAV')
  })

  it('replaces unsafe characters with dashes', () => {
    expect(musicLibraryService.sanitizeFilename('my music!.mp3')).toBe('my-music-.mp3')
    expect(musicLibraryService.sanitizeFilename('a/b\\c.mp3')).toBe('a-b-c.mp3')
    expect(musicLibraryService.sanitizeFilename('café.mp3')).toBe('caf-.mp3')
  })

  it('strips any directory components from the input', () => {
    expect(musicLibraryService.sanitizeFilename('/path/to/track.mp3')).toBe('track.mp3')
    expect(musicLibraryService.sanitizeFilename('..\\..\\evil.mp3')).toBe('evil.mp3')
  })

  it('rejects empty or dot-only basenames by returning "track"', () => {
    expect(musicLibraryService.sanitizeFilename('.mp3')).toBe('track.mp3')
    expect(musicLibraryService.sanitizeFilename('')).toBe('track')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL with `musicLibraryService.sanitizeFilename is not a function`.

- [ ] **Step 3: Implement `sanitizeFilename`**

Add to `src/main/musicLibraryService.ts` in the `// ── Public API ──` section:

```ts
export function sanitizeFilename(input: string): string {
  const base = basename(input)
  const ext = extname(base)
  const stem = base.slice(0, base.length - ext.length)
  const safeStem = stem.replace(/[^a-zA-Z0-9._-]/g, '-')
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '')
  if (!safeStem || safeStem === '.' || safeStem === '..') {
    return safeExt ? `track${safeExt}` : 'track'
  }
  return `${safeStem}${safeExt}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for all four sanitizeFilename cases plus the earlier init cases.

---

### Task 4: `importTrackFile` — extension and size validation (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write failing tests for rejection cases**

Append to `tests/main/musicLibraryService.test.ts`:

```ts
describe('importTrackFile — validation', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('rejects unsupported extensions', async () => {
    const sourcePath = join(userDataPath, 'doc.pdf')
    await import('fs/promises').then((fs) => fs.writeFile(sourcePath, 'not-audio'))

    await expect(musicLibraryService.importTrackFile(sourcePath)).rejects.toMatchObject({
      reason: 'invalid-extension'
    })
  })

  it('accepts .MP3 and .WAV case-insensitively', async () => {
    const fs = await import('fs/promises')
    const source = join(userDataPath, 'Upper.MP3')
    await fs.writeFile(source, 'x')
    const result = await musicLibraryService.importTrackFile(source)
    expect(result.storedFilename).toBe('Upper.MP3')
  })

  it('rejects files larger than 50 MB', async () => {
    const fs = await import('fs/promises')
    const source = join(userDataPath, 'big.mp3')
    // Write a sparse large file
    const fh = await fs.open(source, 'w')
    await fh.truncate(51 * 1024 * 1024)
    await fh.close()

    await expect(musicLibraryService.importTrackFile(source)).rejects.toMatchObject({
      reason: 'file-too-large'
    })
  })

  it('rejects when the source file does not exist', async () => {
    await expect(
      musicLibraryService.importTrackFile(join(userDataPath, 'missing.mp3'))
    ).rejects.toMatchObject({ reason: 'io-error' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL with `importTrackFile is not a function`.

- [ ] **Step 3: Implement `importTrackFile` (validation only, no copy yet)**

Add to `src/main/musicLibraryService.ts`:

```ts
export async function importTrackFile(sourcePath: string): Promise<{ storedFilename: string }> {
  if (!musicDirPath) {
    throw new MusicLibraryError('io-error', 'Music library not initialized')
  }

  // Validate extension
  const ext = extname(sourcePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new MusicLibraryError(
      'invalid-extension',
      `Only ${ALLOWED_EXTENSIONS.join(', ')} are supported`
    )
  }

  // Stat source
  let sourceStat
  try {
    sourceStat = await stat(sourcePath)
  } catch (err) {
    throw new MusicLibraryError('io-error', `Cannot read source file: ${(err as Error).message}`)
  }

  if (sourceStat.size > MAX_FILE_SIZE_BYTES) {
    throw new MusicLibraryError(
      'file-too-large',
      `File is ${sourceStat.size} bytes, max is ${MAX_FILE_SIZE_BYTES}`
    )
  }

  // Intermediate: return the sanitized name without copying. Task 5 replaces
  // this body with the full copy + collision + cap implementation.
  const storedFilename = sanitizeFilename(basename(sourcePath))
  return { storedFilename }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for the four validation cases. The case-insensitive .MP3 test passes because we preserve original case.

---

### Task 5: `importTrackFile` — collision handling and copy (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/main/musicLibraryService.test.ts`:

```ts
describe('importTrackFile — copy and collisions', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('copies the source file into custom-music/', async () => {
    const fs = await import('fs/promises')
    const source = join(userDataPath, 'track.mp3')
    await fs.writeFile(source, 'content-a')

    const result = await musicLibraryService.importTrackFile(source)
    expect(result.storedFilename).toBe('track.mp3')

    const copied = await fs.readFile(join(userDataPath, 'custom-music', 'track.mp3'), 'utf-8')
    expect(copied).toBe('content-a')
  })

  it('appends -1, -2, ... on filename collisions', async () => {
    const fs = await import('fs/promises')
    const source1 = join(userDataPath, 'music.mp3')
    await fs.writeFile(source1, 'a')
    const first = await musicLibraryService.importTrackFile(source1)
    expect(first.storedFilename).toBe('music.mp3')

    const source2 = join(userDataPath, 'nested', 'music.mp3')
    await fs.mkdir(join(userDataPath, 'nested'), { recursive: true })
    await fs.writeFile(source2, 'b')
    const second = await musicLibraryService.importTrackFile(source2)
    expect(second.storedFilename).toBe('music-1.mp3')

    const source3 = join(userDataPath, 'nested2', 'music.mp3')
    await fs.mkdir(join(userDataPath, 'nested2'), { recursive: true })
    await fs.writeFile(source3, 'c')
    const third = await musicLibraryService.importTrackFile(source3)
    expect(third.storedFilename).toBe('music-2.mp3')
  })

  it('sanitizes the filename before copying', async () => {
    const fs = await import('fs/promises')
    const source = join(userDataPath, 'my music!.mp3')
    await fs.writeFile(source, 'x')
    const result = await musicLibraryService.importTrackFile(source)
    expect(result.storedFilename).toBe('my-music-.mp3')
  })

  it('throws library-full when MAX_TRACKS files already exist', async () => {
    const fs = await import('fs/promises')
    for (let i = 0; i < 30; i++) {
      await fs.writeFile(join(userDataPath, 'custom-music', `t-${i}.mp3`), 'x')
    }
    const source = join(userDataPath, 'extra.mp3')
    await fs.writeFile(source, 'x')
    await expect(musicLibraryService.importTrackFile(source)).rejects.toMatchObject({
      reason: 'library-full'
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL — the file isn't copied, collisions aren't handled, and `library-full` isn't thrown.

- [ ] **Step 3: Replace the body of `importTrackFile`**

In `src/main/musicLibraryService.ts`, replace the existing `importTrackFile` body with:

```ts
export async function importTrackFile(sourcePath: string): Promise<{ storedFilename: string }> {
  if (!musicDirPath) {
    throw new MusicLibraryError('io-error', 'Music library not initialized')
  }

  // Count existing tracks
  const existing = await readdir(musicDirPath).catch(() => [] as string[])
  if (existing.length >= MAX_TRACKS) {
    throw new MusicLibraryError('library-full', `Library already has ${MAX_TRACKS} tracks`)
  }

  // Validate extension
  const ext = extname(sourcePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new MusicLibraryError(
      'invalid-extension',
      `Only ${ALLOWED_EXTENSIONS.join(', ')} are supported`
    )
  }

  // Stat source
  let sourceStat
  try {
    sourceStat = await stat(sourcePath)
  } catch (err) {
    throw new MusicLibraryError('io-error', `Cannot read source file: ${(err as Error).message}`)
  }

  if (sourceStat.size > MAX_FILE_SIZE_BYTES) {
    throw new MusicLibraryError(
      'file-too-large',
      `File is ${sourceStat.size} bytes, max is ${MAX_FILE_SIZE_BYTES}`
    )
  }

  // Derive target filename with collision avoidance
  const safeName = sanitizeFilename(basename(sourcePath))
  const safeExt = extname(safeName)
  const safeStem = safeName.slice(0, safeName.length - safeExt.length)
  let targetFilename = safeName
  let counter = 1
  while (existsSync(join(musicDirPath, targetFilename))) {
    targetFilename = `${safeStem}-${counter}${safeExt}`
    counter += 1
  }

  // Copy
  try {
    await copyFile(sourcePath, join(musicDirPath, targetFilename))
  } catch (err) {
    throw new MusicLibraryError('io-error', `Failed to copy file: ${(err as Error).message}`)
  }

  loggingService.log('INFO', 'music-library', `Imported track: ${targetFilename}`)
  return { storedFilename: targetFilename }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for all `importTrackFile` cases (validation + copy + collisions + library-full).

---

### Task 6: `deleteTrackFile` (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```ts
describe('deleteTrackFile', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('removes an existing file', async () => {
    const fs = await import('fs/promises')
    const target = join(userDataPath, 'custom-music', 'gone.mp3')
    await fs.writeFile(target, 'x')

    await musicLibraryService.deleteTrackFile('gone.mp3')

    await expect(fs.stat(target)).rejects.toHaveProperty('code', 'ENOENT')
  })

  it('is a no-op for already-missing files', async () => {
    await expect(musicLibraryService.deleteTrackFile('never-existed.mp3')).resolves.toBeUndefined()
  })

  it('rejects filenames that try to escape the music directory', async () => {
    await expect(musicLibraryService.deleteTrackFile('../settings.json')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL with `deleteTrackFile is not a function`.

- [ ] **Step 3: Implement `deleteTrackFile`**

Add to `src/main/musicLibraryService.ts`:

```ts
function assertSafeFilename(filename: string): void {
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new MusicLibraryError('io-error', `Unsafe filename: ${filename}`)
  }
}

export async function deleteTrackFile(filename: string): Promise<void> {
  assertSafeFilename(filename)
  if (!musicDirPath) return

  const target = join(musicDirPath, filename)
  try {
    await unlink(target)
    loggingService.log('INFO', 'music-library', `Removed track: ${filename}`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
    loggingService.log(
      'ERROR',
      'music-library',
      `Failed to delete ${filename}: ${(err as Error).message}`
    )
    throw err
  }
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for all three delete cases.

---

### Task 7: `resolveFilename`, `resolveTrackPaths`, `buildTrackUrl` (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```ts
describe('resolveFilename', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('returns the absolute path when the file exists', async () => {
    const fs = await import('fs/promises')
    const target = join(userDataPath, 'custom-music', 'here.mp3')
    await fs.writeFile(target, 'x')
    expect(musicLibraryService.resolveFilename('here.mp3')).toBe(target)
  })

  it('returns null for missing files', () => {
    expect(musicLibraryService.resolveFilename('nope.mp3')).toBeNull()
  })

  it('returns null for unsafe filenames', () => {
    expect(musicLibraryService.resolveFilename('../settings.json')).toBeNull()
    expect(musicLibraryService.resolveFilename('a/b.mp3')).toBeNull()
  })
})

describe('resolveTrackPaths', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('returns absolute paths for existing files only', async () => {
    const fs = await import('fs/promises')
    await fs.writeFile(join(userDataPath, 'custom-music', 'a.mp3'), 'x')
    await fs.writeFile(join(userDataPath, 'custom-music', 'b.mp3'), 'x')

    const result = musicLibraryService.resolveTrackPaths(['a.mp3', 'missing.mp3', 'b.mp3'])
    expect(result).toEqual([
      join(userDataPath, 'custom-music', 'a.mp3'),
      join(userDataPath, 'custom-music', 'b.mp3')
    ])
  })

  it('returns an empty array when all files are missing', () => {
    expect(musicLibraryService.resolveTrackPaths(['x.mp3', 'y.mp3'])).toEqual([])
  })
})

describe('buildTrackUrl', () => {
  it('returns a custom-music:// URL with encoded filename', () => {
    expect(musicLibraryService.buildTrackUrl('wedding mix.mp3')).toBe(
      'custom-music://library/wedding%20mix.mp3'
    )
    expect(musicLibraryService.buildTrackUrl('track.mp3')).toBe('custom-music://library/track.mp3')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL — three functions missing.

- [ ] **Step 3: Implement the three helpers**

Add to `src/main/musicLibraryService.ts`:

```ts
export function resolveFilename(filename: string): string | null {
  if (!musicDirPath) return null
  try {
    assertSafeFilename(filename)
  } catch {
    return null
  }
  const absolute = join(musicDirPath, filename)
  if (!existsSync(absolute)) return null
  return absolute
}

export function resolveTrackPaths(filenames: string[]): string[] {
  const resolved: string[] = []
  for (const filename of filenames) {
    const absolute = resolveFilename(filename)
    if (absolute) {
      resolved.push(absolute)
    } else {
      loggingService.log('WARN', 'music-library', `Missing track file skipped: ${filename}`)
    }
  }
  return resolved
}

export function buildTrackUrl(filename: string): string {
  return `${PROTOCOL_SCHEME}://${PROTOCOL_HOST}/${encodeURIComponent(filename)}`
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for all resolve and buildTrackUrl cases.

---

### Task 8: `listTracks` (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```ts
describe('listTracks', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('returns TrackInfo entries in the order given, skipping missing files', async () => {
    const fs = await import('fs/promises')
    await fs.writeFile(join(userDataPath, 'custom-music', 'a.mp3'), 'hello')
    await fs.writeFile(join(userDataPath, 'custom-music', 'b.mp3'), 'world!')

    const result = await musicLibraryService.listTracks(['a.mp3', 'missing.mp3', 'b.mp3'])
    expect(result).toEqual([
      { filename: 'a.mp3', url: 'custom-music://library/a.mp3', sizeBytes: 5 },
      { filename: 'b.mp3', url: 'custom-music://library/b.mp3', sizeBytes: 6 }
    ])
  })

  it('returns an empty array when none exist', async () => {
    expect(await musicLibraryService.listTracks(['x.mp3'])).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL with `listTracks is not a function`.

- [ ] **Step 3: Implement `listTracks`**

Add to `src/main/musicLibraryService.ts`:

```ts
export async function listTracks(filenames: string[]): Promise<TrackInfo[]> {
  const result: TrackInfo[] = []
  for (const filename of filenames) {
    const absolute = resolveFilename(filename)
    if (!absolute) continue
    try {
      const fileStat = await stat(absolute)
      result.push({
        filename,
        url: buildTrackUrl(filename),
        sizeBytes: fileStat.size
      })
    } catch {
      // Skip files that vanish between resolveFilename and stat.
    }
  }
  return result
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS.

---

### Task 9: `listOrphanFiles` (TDD)

**Files:**

- Modify: `src/main/musicLibraryService.ts`
- Modify: `tests/main/musicLibraryService.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```ts
describe('listOrphanFiles', () => {
  beforeEach(async () => {
    await musicLibraryService.init(userDataPath)
  })

  it('returns files on disk that are not in the settings list', async () => {
    const fs = await import('fs/promises')
    await fs.writeFile(join(userDataPath, 'custom-music', 'tracked.mp3'), 'x')
    await fs.writeFile(join(userDataPath, 'custom-music', 'orphan.mp3'), 'x')

    const orphans = await musicLibraryService.listOrphanFiles(['tracked.mp3'])
    expect(orphans).toEqual(['orphan.mp3'])
  })

  it('returns an empty array when all disk files are tracked', async () => {
    const fs = await import('fs/promises')
    await fs.writeFile(join(userDataPath, 'custom-music', 'a.mp3'), 'x')
    expect(await musicLibraryService.listOrphanFiles(['a.mp3'])).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `listOrphanFiles`**

Add to `src/main/musicLibraryService.ts`:

```ts
export async function listOrphanFiles(settingsList: string[]): Promise<string[]> {
  if (!musicDirPath) return []
  const tracked = new Set(settingsList)
  const onDisk = await readdir(musicDirPath).catch(() => [] as string[])
  return onDisk.filter((f) => !tracked.has(f))
}
```

- [ ] **Step 4: Run the full service test file**

Run: `npx vitest run tests/main/musicLibraryService.test.ts`
Expected: PASS for every test in the file (init, sanitize, import validation, import copy, delete, resolveFilename, resolveTrackPaths, buildTrackUrl, listTracks, listOrphanFiles).

---

### Task 10: Initialize `musicLibraryService` at app startup

**Files:**

- Modify: `src/main/index.ts:1-8` (imports) and `src/main/index.ts:58-63` (whenReady body)

- [ ] **Step 1: Import the service**

In `src/main/index.ts`, add after the existing `import * as kioskService from './kioskService'` line:

```ts
import * as musicLibraryService from './musicLibraryService'
```

- [ ] **Step 2: Initialize it alongside the other services**

In the `app.whenReady().then(async () => {` block (around line 58), update the service init section so it reads:

```ts
// Initialize core services before anything else
const userDataPath = app.getPath('userData')
await loggingService.init(userDataPath)
await settingsService.init(userDataPath)
await musicLibraryService.init(userDataPath)
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 11: Register the `custom-music://` privileged protocol

**Files:**

- Modify: `src/main/index.ts` — add `protocol`, `net` imports; register scheme at module top-level; install handler inside `whenReady`.

- [ ] **Step 1: Extend the electron import**

In `src/main/index.ts`, replace the existing `import { app, BrowserWindow, globalShortcut } from 'electron'` line with:

```ts
import { app, BrowserWindow, globalShortcut, protocol, net } from 'electron'
import { pathToFileURL } from 'url'
```

- [ ] **Step 2: Register the scheme as privileged (module top-level)**

In `src/main/index.ts`, add this block immediately after the imports and before `function createWindow()`:

```ts
// Custom protocol for serving admin-imported music files. Must be registered
// before app 'ready' fires. Works identically in dev (renderer origin =
// http://localhost:<port>) and prod (renderer origin = file://) with
// webSecurity: true intact.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'custom-music',
    privileges: {
      standard: true,
      secure: true,
      supportsFetchAPI: true,
      stream: true,
      bypassCSP: false
    }
  }
])
```

- [ ] **Step 3: Install the protocol handler inside `whenReady`**

In `src/main/index.ts`, inside the `app.whenReady().then(async () => { ... })` body, add this block immediately after `await musicLibraryService.init(userDataPath)`:

```ts
// Resolve custom-music://library/<filename> URLs to files in userData/custom-music.
// The service owns all path semantics; the handler is a thin security-gate wrapper.
protocol.handle('custom-music', async (request) => {
  try {
    const url = new URL(request.url)
    if (url.hostname !== 'library') {
      return new Response('Not found', { status: 404 })
    }
    const rawFilename = decodeURIComponent(url.pathname.replace(/^\//, ''))
    const absolutePath = musicLibraryService.resolveFilename(rawFilename)
    if (!absolutePath) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(absolutePath).toString())
  } catch (err) {
    loggingService.log(
      'ERROR',
      'music-library',
      `Protocol handler error: ${(err as Error).message}`
    )
    return new Response('Internal error', { status: 500 })
  }
})
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS (this catches Electron type mismatches the standalone typecheck might miss).

---

### Task 12: IPC handlers for `musicLibrary:*`

**Files:**

- Modify: `src/main/ipcHandlers.ts` — add import; add 4 handlers.

- [ ] **Step 1: Add the imports**

In `src/main/ipcHandlers.ts`, add after the `import * as kioskService from './kioskService'` line:

```ts
import * as musicLibraryService from './musicLibraryService'
import { MusicLibraryError } from './musicLibraryService'
import type { ImportErrorReason } from './musicLibraryService'
```

- [ ] **Step 2: Add the four handlers**

In `src/main/ipcHandlers.ts`, add a new section immediately before the closing `}` of `registerIpcHandlers`:

```ts
// ── Music Library ──

ipcMain.handle('musicLibrary:pickAndImport', async () => {
  const dialogResult = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Import music file',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
  })
  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { ok: false, reason: 'cancelled' as const }
  }
  const sourcePath = dialogResult.filePaths[0]

  try {
    const { storedFilename } = await musicLibraryService.importTrackFile(sourcePath)

    // Append to settings
    const current = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
    settingsService.set('audio.customMusicTracks', [...current, storedFilename])

    // Build the track info payload
    const [track] = await musicLibraryService.listTracks([storedFilename])
    if (!track) {
      // Race: file vanished between import and list. Roll back.
      settingsService.set('audio.customMusicTracks', current)
      return { ok: false, reason: 'io-error' as const, message: 'Imported file disappeared' }
    }

    return { ok: true as const, track }
  } catch (err) {
    if (err instanceof MusicLibraryError) {
      return {
        ok: false as const,
        reason: err.reason as ImportErrorReason,
        message: err.message
      }
    }
    loggingService.log(
      'ERROR',
      'music-library',
      `pickAndImport unexpected error: ${(err as Error).message}`
    )
    return { ok: false as const, reason: 'io-error' as const, message: (err as Error).message }
  }
})

ipcMain.handle('musicLibrary:remove', async (_event, filename: string) => {
  await musicLibraryService.deleteTrackFile(filename)
  const current = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
  settingsService.set(
    'audio.customMusicTracks',
    current.filter((f) => f !== filename)
  )
})

ipcMain.handle('musicLibrary:resolveActive', async () => {
  const list = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
  const tracks = await musicLibraryService.listTracks(list)
  return tracks.map((t) => t.url)
})

ipcMain.handle('musicLibrary:list', async () => {
  const list = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
  return musicLibraryService.listTracks(list)
})
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 13: Preload bridge — expose `musicLibrary` namespace

**Files:**

- Modify: `src/preload/index.ts` — add `musicLibrary` block to the `api` object.
- Modify: `src/preload/index.d.ts` — add `MusicLibraryAPI` interface, extend `API`.

- [ ] **Step 1: Extend the `api` object in preload**

In `src/preload/index.ts`, the `api` object currently ends with the `gallery: { ... }` block followed by the outer `}`. Add a trailing comma after gallery's closing brace, then insert a new `musicLibrary` entry. The end of the `api` object should read:

```ts
  gallery: {
    // ...existing gallery handlers unchanged...
    getDefaultPath: (): Promise<string> => ipcRenderer.invoke('gallery:get-default-path')
  },
  musicLibrary: {
    pickAndImport: (): Promise<unknown> => ipcRenderer.invoke('musicLibrary:pickAndImport'),
    remove: (filename: string): Promise<void> =>
      ipcRenderer.invoke('musicLibrary:remove', filename),
    resolveActive: (): Promise<string[]> => ipcRenderer.invoke('musicLibrary:resolveActive'),
    list: (): Promise<unknown[]> => ipcRenderer.invoke('musicLibrary:list')
  }
}
```

Do not modify the body of `gallery` — only add the trailing comma and the new block. Step 4 below tightens the `unknown` return types once the preload type declarations exist.

- [ ] **Step 2: Add the type declarations**

In `src/preload/index.d.ts`, add these interfaces immediately before the `export interface API {` declaration:

```ts
export interface MusicLibraryTrack {
  filename: string
  url: string
  sizeBytes: number
}

export type PickAndImportResult =
  | { ok: true; track: MusicLibraryTrack }
  | {
      ok: false
      reason: 'cancelled' | 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error'
      message?: string
    }

export interface MusicLibraryAPI {
  pickAndImport: () => Promise<PickAndImportResult>
  remove: (filename: string) => Promise<void>
  resolveActive: () => Promise<string[]>
  list: () => Promise<MusicLibraryTrack[]>
}
```

- [ ] **Step 3: Extend the `API` interface**

In `src/preload/index.d.ts`, update the existing `API` interface to include the new namespace:

```ts
export interface API {
  printer: PrinterAPI
  settings: SettingsAPI
  logging: LoggingAPI
  kiosk: KioskAPI
  gallery: GalleryAPI
  musicLibrary: MusicLibraryAPI
}
```

- [ ] **Step 4: Tighten the preload return types**

Back in `src/preload/index.ts`, update the `musicLibrary` block to use the proper types by importing them. At the top of the file (under the existing imports), add:

```ts
import type { MusicLibraryTrack, PickAndImportResult } from './index.d'
```

Then replace the `musicLibrary` block body with:

```ts
  musicLibrary: {
    pickAndImport: (): Promise<PickAndImportResult> =>
      ipcRenderer.invoke('musicLibrary:pickAndImport'),
    remove: (filename: string): Promise<void> =>
      ipcRenderer.invoke('musicLibrary:remove', filename),
    resolveActive: (): Promise<string[]> => ipcRenderer.invoke('musicLibrary:resolveActive'),
    list: (): Promise<MusicLibraryTrack[]> => ipcRenderer.invoke('musicLibrary:list')
  }
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 14: Extend `tests/setup.ts` with `musicLibrary` mock

**Files:**

- Modify: `tests/setup.ts:7-42` (`mockApi` object)

- [ ] **Step 1: Add the `musicLibrary` namespace to the mock**

In `tests/setup.ts`, inside the `mockApi` object, the final namespace is `kiosk: { ... }`. Add a trailing comma after the `kiosk` block's closing brace, then insert a new `musicLibrary` block. The end of `mockApi` should read:

```ts
  kiosk: {
    setAdminPanelOpen: vi.fn().mockResolvedValue(undefined)
  },
  musicLibrary: {
    pickAndImport: vi.fn().mockResolvedValue({ ok: false, reason: 'cancelled' }),
    remove: vi.fn().mockResolvedValue(undefined),
    resolveActive: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([])
  }
}
```

- [ ] **Step 2: Run the whole test suite to confirm nothing regressed**

Run: `npm run test`
Expected: PASS for every existing test and every musicLibraryService test. No new failures.

---

### Task 15: Renderer helper `getActiveMusicTracks()` (TDD)

**Files:**

- Create: `src/renderer/src/services/musicLibraryService.ts`
- Create: `tests/services/musicLibraryService.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/services/musicLibraryService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getActiveMusicTracks } from '@/services/musicLibraryService'
import { MUSIC_TRACKS } from '@/services/audioService'

describe('getActiveMusicTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns bundled MUSIC_TRACKS when the custom list is empty', async () => {
    ;(window.api.musicLibrary.resolveActive as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
    const result = await getActiveMusicTracks()
    expect(result).toEqual(MUSIC_TRACKS)
  })

  it('returns the custom URLs verbatim when the list is non-empty', async () => {
    const urls = ['custom-music://library/a.mp3', 'custom-music://library/b.mp3']
    ;(window.api.musicLibrary.resolveActive as ReturnType<typeof vi.fn>).mockResolvedValueOnce(urls)
    const result = await getActiveMusicTracks()
    expect(result).toEqual(urls)
  })

  it('falls back to MUSIC_TRACKS if the IPC call rejects', async () => {
    ;(window.api.musicLibrary.resolveActive as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ipc failure')
    )
    const result = await getActiveMusicTracks()
    expect(result).toEqual(MUSIC_TRACKS)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/services/musicLibraryService.test.ts`
Expected: FAIL with `Cannot find module '@/services/musicLibraryService'`.

- [ ] **Step 3: Implement the helper**

Create `src/renderer/src/services/musicLibraryService.ts`:

```ts
import { MUSIC_TRACKS } from '@/services/audioService'

/**
 * Returns the playlist the audio service should use for music playback.
 * If the admin has imported any custom tracks, their custom-music:// URLs
 * are returned. Otherwise the bundled MUSIC_TRACKS array is returned.
 *
 * On IPC failure, falls back to the bundled tracks and logs a warning —
 * music is an enhancement, not a session blocker.
 */
export async function getActiveMusicTracks(): Promise<string[]> {
  try {
    const custom = await window.api.musicLibrary.resolveActive()
    if (custom.length > 0) return custom
  } catch (err) {
    console.warn('[musicLibraryService] resolveActive failed, using defaults:', err)
  }
  return MUSIC_TRACKS
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run tests/services/musicLibraryService.test.ts`
Expected: PASS for all three cases.

---

### Task 16: Update `useMusicLifecycle.reconcile()` to be async

**Files:**

- Modify: `src/renderer/src/hooks/useMusicLifecycle.ts:1-14` (imports) and `src/renderer/src/hooks/useMusicLifecycle.ts:85-104` (reconcile body)

- [ ] **Step 1: Swap the import**

In `src/renderer/src/hooks/useMusicLifecycle.ts`, remove `MUSIC_TRACKS` from the `@/services/audioService` import and add an import for `getActiveMusicTracks`. The top of the file should read:

```ts
import { useEffect, useRef } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import type { ScreenName } from '@/stores/types'
import {
  initAudio,
  playMusic,
  stopMusic,
  fadeInMusic,
  fadeOutMusic,
  setMusicVolume,
  isMusicPlaying
} from '@/services/audioService'
import { getActiveMusicTracks } from '@/services/musicLibraryService'
```

- [ ] **Step 2: Rewrite `reconcile()`**

Replace the existing `reconcile` function (currently at the bottom of the file, lines ~85–104) with:

```ts
/**
 * Compare desired state (should music play?) with actual state (is music playing?)
 * and fade in/out accordingly.
 *
 * Async because `getActiveMusicTracks()` resolves via IPC. The post-await
 * `isMusicPlaying()` re-check prevents a race where two back-to-back state
 * changes both start a playMusic() call.
 */
async function reconcile(): Promise<void> {
  const screen = useNavigationStore.getState().currentScreen
  const mode = useAppSettingsStore.getState().audioMusicMode
  const want = shouldPlayMusic(screen, mode)
  const playing = isMusicPlaying()

  if (want && !playing) {
    const tracks = await getActiveMusicTracks()
    // Re-check after the await: state may have changed (another reconcile
    // ran, or the user navigated away) while we were waiting on IPC.
    if (
      !isMusicPlaying() &&
      shouldPlayMusic(
        useNavigationStore.getState().currentScreen,
        useAppSettingsStore.getState().audioMusicMode
      )
    ) {
      playMusic(tracks)
      fadeInMusic()
    }
  } else if (!want && playing) {
    fadeOutMusic()
  }
}
```

- [ ] **Step 3: Update the call sites inside `useEffect`**

`reconcile()` is called from three places in the hook (line ~59 subscribe callback, line ~61 subscribe callback, line ~65 initial run). All three are fire-and-forget — no change needed. Verify the existing lines still read:

```ts
const unsubNav = useNavigationStore.subscribe(() => reconcile())
const unsubMode = useAppSettingsStore.subscribe((state, prev) => {
  if (state.audioMusicMode !== prev.audioMusicMode) reconcile()
})

// Run once immediately for the current state
reconcile()
```

If any call includes `await`, remove the await. The floating promise is intentional.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 17: Update `AudioSection` preview button

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/AudioSection/AudioSection.tsx:5` (import) and `src/renderer/src/screens/AdminScreen/sections/AudioSection/AudioSection.tsx:33-53` (handler)

- [ ] **Step 1: Swap the import**

In `src/renderer/src/screens/AdminScreen/sections/AudioSection/AudioSection.tsx`, remove `MUSIC_TRACKS` from the `@/services/audioService` import and add `getActiveMusicTracks`:

```ts
import { playMusic, stopMusic, playSFX, SFX } from '@/services/audioService'
import { getActiveMusicTracks } from '@/services/musicLibraryService'
```

- [ ] **Step 2: Make the handler async**

Replace `handlePreviewMusic` (currently lines 33–53) with:

```ts
async function handlePreviewMusic(): Promise<void> {
  if (musicPreviewing) {
    // Stop preview
    stopMusic(true)
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    setMusicPreviewing(false)
    return
  }

  const tracks = await getActiveMusicTracks()
  playMusic(tracks)
  setMusicPreviewing(true)

  previewTimerRef.current = setTimeout(() => {
    stopMusic(true)
    setMusicPreviewing(false)
    previewTimerRef.current = null
  }, PREVIEW_DURATION_MS)
}
```

- [ ] **Step 3: Typecheck and test**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run test`
Expected: PASS (existing tests should still pass — no behavioral change for the default case).

---

### Task 18: Create `MusicLibrarySection` component + CSS

**Files:**

- Create: `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection.tsx`
- Create: `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection.module.css`:

```css
.section {
  padding: 24px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 16px;
}

.intro {
  font-size: 14px;
  color: #555;
  margin: 0 0 16px;
  max-width: 560px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f6f6f6;
  border-radius: 6px;
  min-height: 56px;
}

.filename {
  flex: 1;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rowButton {
  min-width: 112px;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.rowButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.removeButton {
  min-width: 48px;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid #c33;
  background: #fff;
  color: #c33;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.addRow {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.addButton {
  min-height: 48px;
  padding: 0 20px;
  border: 1px solid #3366cc;
  background: #3366cc;
  color: #fff;
  border-radius: 4px;
  font-size: 15px;
  cursor: pointer;
}

.addButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.count {
  font-size: 14px;
  color: #555;
}

.note {
  font-size: 13px;
  color: #777;
  margin: 16px 0 0;
}

.emptyMessage {
  padding: 24px;
  background: #f6f6f6;
  border-radius: 6px;
  text-align: center;
  color: #555;
  font-size: 14px;
  margin-bottom: 20px;
}

.errorMessage {
  padding: 12px 16px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  font-size: 14px;
  margin-bottom: 16px;
}

.rowError {
  flex-basis: 100%;
  font-size: 12px;
  color: #c33;
}
```

- [ ] **Step 2: Create the component**

Create `src/renderer/src/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { playMusic, stopMusic } from '@/services/audioService'
import styles from './MusicLibrarySection.module.css'

// Duplicated from preload/index.d.ts for the same reason GallerySection inlines
// its types locally: cross-boundary imports between renderer src and preload
// declaration files are awkward, and the shape is stable.
interface MusicLibraryTrack {
  filename: string
  url: string
  sizeBytes: number
}

const PREVIEW_DURATION_MS = 10_000
const MAX_TRACKS = 30
const PLAYABILITY_TIMEOUT_MS = 3_000

function MusicLibrarySection(): React.JSX.Element {
  const [tracks, setTracks] = useState<MusicLibraryTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewingFilename, setPreviewingFilename] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ filename: string; message: string } | null>(null)

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadTracks = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await window.api.musicLibrary.list()
      setTracks(list)
    } catch (err) {
      console.error('[MusicLibrarySection] list failed:', err)
      setTracks([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTracks()
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
        previewTimerRef.current = null
      }
      stopMusic()
    }
  }, [loadTracks])

  function clearPreviewState(): void {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    setPreviewingFilename(null)
  }

  function handlePreview(track: MusicLibraryTrack): void {
    setRowError(null)
    if (previewingFilename === track.filename) {
      stopMusic(true)
      clearPreviewState()
      return
    }
    // Stop any existing preview first
    if (previewingFilename) {
      stopMusic()
      clearPreviewState()
    }
    playMusic([track.url])
    setPreviewingFilename(track.filename)
    previewTimerRef.current = setTimeout(() => {
      stopMusic(true)
      clearPreviewState()
    }, PREVIEW_DURATION_MS)
  }

  async function handleRemove(filename: string): Promise<void> {
    setRowError(null)
    if (previewingFilename === filename) {
      stopMusic()
      clearPreviewState()
    }
    try {
      await window.api.musicLibrary.remove(filename)
      await loadTracks()
    } catch (err) {
      setRowError({
        filename,
        message: `Could not remove track: ${(err as Error).message}`
      })
    }
  }

  async function verifyPlayability(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio()
      let settled = false
      const cleanup = (): void => {
        audio.removeEventListener('canplaythrough', onCanPlay)
        audio.removeEventListener('error', onError)
        audio.src = ''
      }
      const onCanPlay = (): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(true)
      }
      const onError = (): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(false)
      }
      audio.addEventListener('canplaythrough', onCanPlay)
      audio.addEventListener('error', onError)
      audio.src = url
      audio.load()
      setTimeout(() => {
        if (settled) return
        settled = true
        cleanup()
        resolve(false)
      }, PLAYABILITY_TIMEOUT_MS)
    })
  }

  async function handleAdd(): Promise<void> {
    setErrorMessage(null)
    setRowError(null)
    setImporting(true)
    try {
      const result = await window.api.musicLibrary.pickAndImport()

      if (!result.ok) {
        if (result.reason === 'cancelled') return
        setErrorMessage(messageForReason(result.reason, result.message))
        return
      }

      const playable = await verifyPlayability(result.track.url)
      if (!playable) {
        await window.api.musicLibrary.remove(result.track.filename).catch(() => {})
        setErrorMessage(
          'This file could not be played. It may be corrupt or in an unsupported codec.'
        )
        return
      }

      await loadTracks()
    } finally {
      setImporting(false)
    }
  }

  const isFull = tracks.length >= MAX_TRACKS

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Music Library</h2>

      <p className={styles.intro}>
        When your custom library is empty, the three default tracks bundled with the app will play.
      </p>

      {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

      {isLoading && <p>Loading tracks...</p>}

      {!isLoading && tracks.length === 0 && (
        <div className={styles.emptyMessage}>
          No custom tracks yet. Click <strong>Add music file</strong> to import one.
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <div className={styles.list}>
          {tracks.map((track) => (
            <div key={track.filename} className={styles.row}>
              <span className={styles.filename}>{track.filename}</span>
              <button
                type="button"
                className={styles.rowButton}
                onClick={() => handlePreview(track)}
                disabled={previewingFilename !== null && previewingFilename !== track.filename}
              >
                {previewingFilename === track.filename ? 'Stop Preview' : 'Preview'}
              </button>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleRemove(track.filename)}
                aria-label={`Remove ${track.filename}`}
              >
                Remove
              </button>
              {rowError && rowError.filename === track.filename && (
                <div className={styles.rowError}>{rowError.message}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.addRow}>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAdd}
          disabled={importing || isFull}
          title={isFull ? 'Remove a track to add another.' : undefined}
        >
          {importing ? 'Importing...' : '+ Add music file'}
        </button>
        <span className={styles.count}>
          {tracks.length} / {MAX_TRACKS} tracks
        </span>
      </div>

      <p className={styles.note}>Supported formats: MP3, WAV. Max 50 MB each.</p>
    </div>
  )
}

function messageForReason(reason: string, raw?: string): string {
  switch (reason) {
    case 'invalid-extension':
      return 'Only MP3 and WAV files are supported.'
    case 'file-too-large':
      return 'File is too large. Maximum size is 50 MB.'
    case 'library-full':
      return 'Library is full. Remove a track before adding another.'
    case 'io-error':
      return `Could not import file: ${raw ?? 'unknown error'}`
    default:
      return 'Could not import file.'
  }
}

export default MusicLibrarySection
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 19: `MusicLibrarySection` tests

**Files:**

- Create: `tests/screens/AdminScreen/MusicLibrarySection.test.tsx`

- [ ] **Step 1: Create the test file**

Create `tests/screens/AdminScreen/MusicLibrarySection.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MusicLibrarySection from '@/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection'

const mockApi = () => window.api.musicLibrary

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockApi().list as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockApi().remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(mockApi().pickAndImport as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    reason: 'cancelled'
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MusicLibrarySection', () => {
  it('renders the empty state when there are no tracks', async () => {
    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText(/No custom tracks yet/i)).toBeInTheDocument()
    })
    expect(screen.getByText('0 / 30 tracks')).toBeInTheDocument()
  })

  it('renders rows for each track returned by list()', async () => {
    ;(mockApi().list as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { filename: 'a.mp3', url: 'custom-music://library/a.mp3', sizeBytes: 100 },
      { filename: 'b.wav', url: 'custom-music://library/b.wav', sizeBytes: 200 }
    ])

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText('a.mp3')).toBeInTheDocument()
      expect(screen.getByText('b.wav')).toBeInTheDocument()
    })
    expect(screen.getByText('2 / 30 tracks')).toBeInTheDocument()
  })

  it('disables the Add button when 30 tracks are present', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      filename: `t${i}.mp3`,
      url: `custom-music://library/t${i}.mp3`,
      sizeBytes: 10
    }))
    ;(mockApi().list as ReturnType<typeof vi.fn>).mockResolvedValueOnce(many)

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText('30 / 30 tracks')).toBeInTheDocument()
    })
    const addButton = screen.getByRole('button', { name: /Add music file/ })
    expect(addButton).toBeDisabled()
  })

  it('removes a track and refetches the list', async () => {
    const listMock = mockApi().list as ReturnType<typeof vi.fn>
    listMock
      .mockResolvedValueOnce([
        { filename: 'a.mp3', url: 'custom-music://library/a.mp3', sizeBytes: 100 }
      ])
      .mockResolvedValueOnce([])

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText('a.mp3')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Remove a.mp3/ }))

    await waitFor(() => {
      expect(mockApi().remove).toHaveBeenCalledWith('a.mp3')
      expect(screen.getByText(/No custom tracks yet/i)).toBeInTheDocument()
    })
  })

  it('shows a friendly error message for invalid-extension on import', async () => {
    ;(mockApi().pickAndImport as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: 'invalid-extension',
      message: 'not supported'
    })

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText(/No custom tracks yet/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Add music file/ }))

    await waitFor(() => {
      expect(screen.getByText('Only MP3 and WAV files are supported.')).toBeInTheDocument()
    })
  })

  it('shows a file-too-large error message', async () => {
    ;(mockApi().pickAndImport as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: 'file-too-large'
    })

    render(<MusicLibrarySection />)
    await waitFor(() => screen.getByText(/No custom tracks yet/i))
    fireEvent.click(screen.getByRole('button', { name: /Add music file/ }))
    await waitFor(() => {
      expect(screen.getByText('File is too large. Maximum size is 50 MB.')).toBeInTheDocument()
    })
  })

  it('does nothing when the user cancels the file dialog', async () => {
    render(<MusicLibrarySection />)
    await waitFor(() => screen.getByText(/No custom tracks yet/i))
    fireEvent.click(screen.getByRole('button', { name: /Add music file/ }))
    // No error shown, button re-enables
    await waitFor(() => {
      expect(screen.queryByText(/Only MP3 and WAV/)).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run tests/screens/AdminScreen/MusicLibrarySection.test.tsx`
Expected: PASS for all seven cases.

Note: the happy-path import test is intentionally omitted because the renderer-side playability check (`HTMLAudioElement` with `custom-music://` URL) cannot be meaningfully exercised in jsdom — the globally-mocked `Audio` constructor in `tests/setup.ts` doesn't fire `canplaythrough`. The manual smoke test (Task 21) covers that path.

---

### Task 20: Wire `MusicLibrarySection` into the admin sidebar

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/adminSections.ts`

- [ ] **Step 1: Import the new section**

In `src/renderer/src/screens/AdminScreen/adminSections.ts`, add after the `import AudioSection from './sections/AudioSection/AudioSection'` line:

```ts
import MusicLibrarySection from './sections/MusicLibrarySection/MusicLibrarySection'
```

- [ ] **Step 2: Insert the section entry after audio**

Update the `ADMIN_SECTIONS` array (currently lines 19–30). Insert the new entry immediately after the `audio` entry:

```ts
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { id: 'appearance', label: 'Appearance', component: AppearanceSection },
  { id: 'webcam', label: 'Webcam', component: WebcamSection },
  { id: 'printer', label: 'Printer', component: PrinterSection },
  { id: 'photo-session', label: 'Photo Session', component: PhotoSessionSection },
  { id: 'filters', label: 'Filters', component: FilterSection },
  { id: 'audio', label: 'Audio', component: AudioSection },
  { id: 'music-library', label: 'Music Library', component: MusicLibrarySection },
  { id: 'pin', label: 'PIN', component: PinSection },
  { id: 'gallery', label: 'Gallery', component: GallerySection },
  { id: 'kiosk', label: 'Kiosk', component: KioskSection },
  { id: 'language', label: 'Language', component: LanguageSection }
] as const
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 21: Verification — test, lint, build, manual smoke

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS — all pre-existing tests, the 10 new `musicLibraryService` tests, the 3 `getActiveMusicTracks` tests, and the 7 `MusicLibrarySection` tests.

If any pre-existing test fails, inspect whether the `adminSections` import chain now pulls in `MusicLibrarySection`, which imports `audioService`. Re-run with `--reporter verbose` to isolate.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: PASS with no errors. Warnings about unused imports in files you didn't touch are allowed.

- [ ] **Step 3: Run a full build**

Run: `npm run build`
Expected: PASS. Build must succeed because `npm run build` runs typecheck + electron-vite build, which catches any protocol registration or preload-type mismatches that the standalone typecheck misses.

- [ ] **Step 4: Manual smoke test — happy path**

Run: `npm run dev`

Then in the app UI:

1. Open the admin panel (tap the home-screen gesture, enter the PIN).
2. Click **Music Library** in the sidebar — the empty state should render with the "bundled defaults" helper text.
3. Click **+ Add music file**. In the file dialog, pick a real `.mp3` file from disk.
4. The new row should appear within a few seconds. Click its **Preview** button — music should start playing audibly. Verify the button text changes to **Stop Preview**.
5. Wait 10 s — preview should auto-stop.
6. Click **Preview** on the same row again to confirm it restarts.
7. Click **Remove** on the row. The row should vanish; the count should read **0 / 30 tracks**.
8. Go back to **Audio** section, click **Preview Music**. The three bundled defaults should play (confirming the fallback works).

If any of these steps fail, debug before declaring the plan complete.

- [ ] **Step 5: Manual smoke test — error paths**

1. Click **+ Add music file** and pick a `.pdf`. The error message **"Only MP3 and WAV files are supported."** should appear.
2. Import two different files that share a basename (e.g. copy `track.mp3` to two different folders and import both). Both should appear; the second one should have `-1` appended.
3. Import one file. Restart the app (`Ctrl+Q`, then `npm run dev` again). The custom track should still be listed and playable — verifies settings persistence.
4. Import one file. Using your OS file manager, delete the file from `<userData>/custom-music/` while the app is running. Click **Preview** on the (now-stale) row — the audio should fail silently. Click **+ Add music file** and pick a fresh file; verify the library still works.

- [ ] **Step 6: Manual smoke test — integration with music lifecycle**

1. Import a custom MP3. Close the admin panel. On the home screen, confirm the custom track is playing (not the bundled one). The easiest check: use an audibly distinct MP3.
2. Remove all custom tracks via the admin panel, close admin, confirm bundled defaults resume on the home screen.

- [ ] **Step 7: Human checkpoint**

Notify the human that the plan is complete and all verification steps pass. The human will review the changes and create a commit themselves. **Do not run any git write commands.**

---

## Spec coverage cross-check

| Spec requirement                                                   | Covered by |
| ------------------------------------------------------------------ | ---------- |
| `audio.customMusicTracks` settings field with `[]` default         | Task 1     |
| Files stored in `<userData>/custom-music/`                         | Task 2     |
| `.mp3` and `.wav` only                                             | Task 4     |
| 50 MB size cap                                                     | Task 4     |
| 30 track cap                                                       | Task 5     |
| Filename sanitization                                              | Task 3     |
| Collision handling with `-1`, `-2`, ... suffix                     | Task 5     |
| `importTrackFile` throws typed errors                              | Tasks 4, 5 |
| `deleteTrackFile`                                                  | Task 6     |
| `resolveTrackPaths` skips missing files with warn log              | Task 7     |
| `listOrphanFiles` (not UI-wired)                                   | Task 9     |
| Service init from `main/index.ts`                                  | Task 10    |
| Custom protocol for serving music files                            | Task 11    |
| `musicLibrary:pickAndImport` atomic handler                        | Task 12    |
| `musicLibrary:remove`                                              | Task 12    |
| `musicLibrary:resolveActive` returns URLs                          | Task 12    |
| `musicLibrary:list` returns `MusicLibraryTrack[]`                  | Task 12    |
| Preload bridge exposes `musicLibrary`                              | Task 13    |
| `tests/setup.ts` mock covers musicLibrary                          | Task 14    |
| `getActiveMusicTracks()` helper with bundled fallback              | Task 15    |
| `useMusicLifecycle` uses the helper, async-safe                    | Task 16    |
| `AudioSection` preview uses the helper                             | Task 17    |
| New `MusicLibrarySection` component                                | Task 18    |
| Empty state + 30-track cap UI + count display                      | Task 18    |
| Per-row Preview (10 s timeout, single-preview lock)                | Task 18    |
| Per-row Remove (no confirmation)                                   | Task 18    |
| Add button with playability validation (3 s timeout)               | Task 18    |
| Inline row error for remove failures                               | Task 18    |
| Top-level error message for import failures                        | Task 18    |
| English-only admin strings (no i18n)                               | Task 18    |
| Sidebar placement after Audio                                      | Task 20    |
| Story 7.1 schema doc updated                                       | Task 1     |
| Unit tests for main service                                        | Tasks 2–9  |
| Unit tests for renderer helper                                     | Task 15    |
| Component tests for section                                        | Task 19    |
| Manual smoke test covers happy + error + persistence + integration | Task 21    |

All spec items accounted for. The out-of-scope items listed in the spec (custom SFX, reordering, renaming, per-track enable, bulk import, repair action, playback niceties) are intentionally absent.
