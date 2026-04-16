import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, stat } from 'fs/promises'
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

describe('sanitizeFilename', () => {
  it('keeps safe characters as-is', () => {
    expect(musicLibraryService.sanitizeFilename('wedding-mix.mp3')).toBe('wedding-mix.mp3')
    expect(musicLibraryService.sanitizeFilename('Track_01.WAV')).toBe('Track_01.WAV')
  })

  it('replaces unsafe characters with dashes', () => {
    expect(musicLibraryService.sanitizeFilename('my music!.mp3')).toBe('my-music-.mp3')
    expect(musicLibraryService.sanitizeFilename('a@b#c.mp3')).toBe('a-b-c.mp3')
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
