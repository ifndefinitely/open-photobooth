import { mkdir, copyFile, unlink, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, extname, join } from 'path'
import * as loggingService from './loggingService'

const MUSIC_DIR_NAME = 'custom-music'
const MAX_TRACKS = 30
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'] as const

export const PROTOCOL_SCHEME = 'custom-music'
export const PROTOCOL_HOST = 'library'

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

let musicDirPath = ''

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
  }
}

export function getMusicDirPath(): string {
  return musicDirPath
}

export async function importTrackFile(sourcePath: string): Promise<{ storedFilename: string }> {
  if (!musicDirPath) {
    throw new MusicLibraryError('io-error', 'Music library not initialized')
  }

  const existing = await readdir(musicDirPath).catch(() => [] as string[])
  if (existing.length >= MAX_TRACKS) {
    throw new MusicLibraryError('library-full', `Library already has ${MAX_TRACKS} tracks`)
  }

  const ext = extname(sourcePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new MusicLibraryError(
      'invalid-extension',
      `Only ${ALLOWED_EXTENSIONS.join(', ')} are supported`
    )
  }

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

  const safeName = sanitizeFilename(basename(sourcePath))
  const safeExt = extname(safeName)
  const safeStem = safeName.slice(0, safeName.length - safeExt.length)
  let targetFilename = safeName
  let counter = 1
  while (existsSync(join(musicDirPath, targetFilename))) {
    targetFilename = `${safeStem}-${counter}${safeExt}`
    counter += 1
  }

  try {
    await copyFile(sourcePath, join(musicDirPath, targetFilename))
  } catch (err) {
    throw new MusicLibraryError('io-error', `Failed to copy file: ${(err as Error).message}`)
  }

  loggingService.log('INFO', 'music-library', `Imported track: ${targetFilename}`)
  return { storedFilename: targetFilename }
}

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

export async function listOrphanFiles(settingsList: string[]): Promise<string[]> {
  if (!musicDirPath) return []
  const tracked = new Set(settingsList)
  const onDisk = await readdir(musicDirPath).catch(() => [] as string[])
  return onDisk.filter((f) => !tracked.has(f))
}

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

export function sanitizeFilename(input: string): string {
  // Strip directory components for both POSIX and Windows separators so the
  // function is safe regardless of the platform that produced the path.
  const lastSep = Math.max(input.lastIndexOf('/'), input.lastIndexOf('\\'))
  const base = lastSep >= 0 ? input.slice(lastSep + 1) : input

  // Detect dotfile-style basenames ("hidden file" with no extension) and
  // treat the leading-dot suffix as the extension instead of the stem.
  let ext: string
  let stem: string
  if (base.startsWith('.') && base.indexOf('.', 1) === -1) {
    ext = base
    stem = ''
  } else {
    ext = extname(base)
    stem = base.slice(0, base.length - ext.length)
  }

  const safeStem = stem.replace(/[^a-zA-Z0-9._-]/g, '-')
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '')
  if (!safeStem || safeStem === '.' || safeStem === '..') {
    return safeExt ? `track${safeExt}` : 'track'
  }
  return `${safeStem}${safeExt}`
}
