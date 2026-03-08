import { mkdir, writeFile, readdir, readFile, rm, access, constants } from 'fs/promises'
import { join } from 'path'
import { app, nativeImage, shell } from 'electron'
import * as settingsService from './settingsService'

// ── Types ──

export interface SaveSessionData {
  /** Base64-encoded PNG photo data (without the data URL prefix) */
  photos: string[]
  /** ISO timestamp string */
  timestamp: string
  /** Number of photos in the session */
  photoCount: number
  /** Filter applied (e.g., 'none', 'bw', 'sepia', 'vintage') */
  filter: string
}

export interface SaveSessionResult {
  success: boolean
  /** Absolute path to the created session folder */
  sessionFolder: string
  error?: string
}

export interface SessionSummary {
  /** Folder name (timestamp-based) */
  id: string
  /** Absolute path to the session folder */
  folderPath: string
  /** Display-friendly timestamp parsed from folder name */
  timestamp: string
  /** Number of photos in the session */
  photoCount: number
  /** Whether a strip image exists */
  hasStrip: boolean
  /** Small thumbnail as a base64 data URL */
  thumbnailDataUrl: string
}

export interface SessionDetail {
  id: string
  folderPath: string
  timestamp: string
  photoCount: number
  filter: string
  /** Individual photos as base64 data URLs */
  photos: Array<{ filename: string; dataUrl: string }>
  /** Strip image as base64 data URL, or null if not yet saved */
  stripDataUrl: string | null
  /** Print sheet image as base64 data URL, or null if not yet saved */
  printSheetDataUrl: string | null
  metadata: Record<string, unknown>
}

export interface ValidateDirectoryResult {
  valid: boolean
  error?: string
}

export interface DeleteAllResult {
  deleted: number
  errors: string[]
}

// ── Helpers ──

/**
 * Get the platform default gallery path.
 * Uses Electron's app.getPath('pictures') which resolves to:
 *   - Windows: %USERPROFILE%\Pictures
 *   - macOS: ~/Pictures
 *   - Linux: ~/Pictures
 */
function getDefaultGalleryPath(): string {
  return join(app.getPath('pictures'), 'OpenPhotobooth')
}

/**
 * Get the effective gallery path — configured path or platform default.
 */
export function getGalleryPath(): string {
  const configured = settingsService.get('gallery.savePath') as string
  if (configured && configured.trim() !== '') {
    return configured
  }
  return getDefaultGalleryPath()
}

/**
 * Format a Date as a folder-safe timestamp: YYYY-MM-DD_HH-mm-ss
 */
function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  )
}

/**
 * Find a unique folder name by appending _2, _3, etc. if the base name already exists.
 */
async function resolveUniqueFolderName(parentDir: string, baseName: string): Promise<string> {
  let candidate = baseName
  let suffix = 2

  while (true) {
    try {
      await access(join(parentDir, candidate), constants.F_OK)
      // Exists — try next suffix
      candidate = `${baseName}_${suffix}`
      suffix++
    } catch {
      // Does not exist — use this name
      return candidate
    }
  }
}

/**
 * Convert a base64-encoded PNG to a JPEG buffer at the given quality.
 */
function pngBase64ToJpeg(base64Png: string, quality: number): Buffer {
  const pngBuffer = Buffer.from(base64Png, 'base64')
  const image = nativeImage.createFromBuffer(pngBuffer)
  return image.toJPEG(quality)
}

/**
 * Convert a base64 string to a Buffer (no format conversion).
 */
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}

/**
 * Generate a thumbnail data URL from an image file on disk.
 * Returns a small JPEG as a base64 data URL.
 */
async function generateThumbnail(imagePath: string, maxWidth: number): Promise<string> {
  const buffer = await readFile(imagePath)
  const image = nativeImage.createFromBuffer(buffer)
  const resized = image.resize({ width: maxWidth })
  const jpegBuffer = resized.toJPEG(80)
  return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`
}

/**
 * Read an image file and return it as a base64 data URL.
 */
async function imageFileToDataUrl(imagePath: string): Promise<string> {
  const buffer = await readFile(imagePath)
  const ext = imagePath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
  return `data:image/${ext};base64,${buffer.toString('base64')}`
}

/**
 * Parse a session folder name into a display-friendly timestamp.
 * Input: "2026-02-13_14-30-45" → Output: "2026-02-13 14:30:45"
 */
function parseFolderTimestamp(folderName: string): string {
  // Strip any _N duplicate suffix
  const base = folderName.replace(/_\d+$/, '')
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return folderName
  return `${match[1]} ${match[2]}:${match[3]}:${match[4]}`
}

/**
 * Check if a directory looks like a valid session folder (contains photo files or metadata).
 */
async function isSessionFolder(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath)
    return entries.some((e) => e === 'metadata.json' || e.startsWith('photo-') || e === 'strip.png')
  } catch {
    return false
  }
}

// ── Public API ──

/**
 * Get the platform default gallery path (for display in admin UI).
 */
export function getDefaultPath(): string {
  return getDefaultGalleryPath()
}

/**
 * Validate that a directory path is usable for saving photos.
 * Checks that the directory exists (or can be created) and is writable.
 */
export async function validateDirectory(dirPath: string): Promise<ValidateDirectoryResult> {
  if (!dirPath || dirPath.trim() === '') {
    return { valid: false, error: 'Path cannot be empty.' }
  }

  try {
    // Try to create the directory (no-op if it already exists)
    await mkdir(dirPath, { recursive: true })

    // Check write permission by attempting to write and delete a test file
    const testFile = join(dirPath, '.open-photobooth-write-test')
    await writeFile(testFile, 'test', 'utf-8')
    await rm(testFile)

    return { valid: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { valid: false, error: `This folder is not writable: ${message}` }
  }
}

/**
 * Save a photo session to disk.
 * Creates a timestamped subfolder and writes individual photos as JPEG + metadata.json.
 */
export async function saveSession(data: SaveSessionData): Promise<SaveSessionResult> {
  const galleryPath = getGalleryPath()

  try {
    // Ensure the gallery root exists
    await mkdir(galleryPath, { recursive: true })

    // Create a unique session folder
    const date = new Date(data.timestamp)
    const baseName = formatTimestamp(date)
    const folderName = await resolveUniqueFolderName(galleryPath, baseName)
    const sessionFolder = join(galleryPath, folderName)
    await mkdir(sessionFolder, { recursive: true })

    // Save individual photos as JPEG
    for (let i = 0; i < data.photos.length; i++) {
      const jpegBuffer = pngBase64ToJpeg(data.photos[i], 95)
      await writeFile(join(sessionFolder, `photo-${i + 1}.jpg`), jpegBuffer)
    }

    // Save metadata
    const metadata = {
      timestamp: data.timestamp,
      photoCount: data.photoCount,
      filter: data.filter,
      savedAt: new Date().toISOString()
    }
    await writeFile(
      join(sessionFolder, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    )

    console.log(`[Storage] Session saved: ${sessionFolder}`)
    return { success: true, sessionFolder }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Storage] Failed to save session: ${message}`)
    return { success: false, sessionFolder: '', error: message }
  }
}

/**
 * Save the strip and print sheet images to an existing session folder.
 * Called after strip composition completes.
 */
export async function saveStrip(
  sessionFolder: string,
  stripBase64: string,
  printSheetBase64: string
): Promise<void> {
  try {
    const stripBuffer = base64ToBuffer(stripBase64)
    await writeFile(join(sessionFolder, 'strip.png'), stripBuffer)

    const printSheetBuffer = base64ToBuffer(printSheetBase64)
    await writeFile(join(sessionFolder, 'print-sheet.png'), printSheetBuffer)

    console.log(`[Storage] Strip saved to: ${sessionFolder}`)
  } catch (err) {
    console.error(`[Storage] Failed to save strip: ${err instanceof Error ? err.message : err}`)
  }
}

/**
 * List all sessions in the gallery folder.
 * Returns lightweight summaries with thumbnails, sorted newest first.
 */
export async function listSessions(): Promise<SessionSummary[]> {
  const galleryPath = getGalleryPath()

  try {
    await access(galleryPath, constants.F_OK)
  } catch {
    // Gallery folder doesn't exist yet — no sessions
    return []
  }

  const entries = await readdir(galleryPath, { withFileTypes: true })
  const sessions: SessionSummary[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const folderPath = join(galleryPath, entry.name)
    if (!(await isSessionFolder(folderPath))) continue

    try {
      // Read metadata if available
      let photoCount = 0
      let hasStrip = false

      const files = await readdir(folderPath)
      const photoFiles = files.filter((f) => f.startsWith('photo-') && f.endsWith('.jpg'))
      photoCount = photoFiles.length
      hasStrip = files.includes('strip.png')

      // Try to read metadata for more accurate photo count
      try {
        const metaRaw = await readFile(join(folderPath, 'metadata.json'), 'utf-8')
        const meta = JSON.parse(metaRaw)
        if (typeof meta.photoCount === 'number') {
          photoCount = meta.photoCount
        }
      } catch {
        // Metadata missing or corrupt — use file count
      }

      // Generate thumbnail from strip (preferred) or first photo
      let thumbnailDataUrl = ''
      const thumbnailSource = hasStrip
        ? join(folderPath, 'strip.png')
        : photoFiles.length > 0
          ? join(folderPath, photoFiles[0])
          : null

      if (thumbnailSource) {
        try {
          thumbnailDataUrl = await generateThumbnail(thumbnailSource, 200)
        } catch {
          // Thumbnail generation failed — leave empty
        }
      }

      sessions.push({
        id: entry.name,
        folderPath,
        timestamp: parseFolderTimestamp(entry.name),
        photoCount,
        hasStrip,
        thumbnailDataUrl
      })
    } catch {
      // Skip folders that can't be read
      continue
    }
  }

  // Sort newest first
  sessions.sort((a, b) => b.id.localeCompare(a.id))

  return sessions
}

/**
 * Get full details for a single session, including all images.
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const galleryPath = getGalleryPath()
  const folderPath = join(galleryPath, sessionId)

  try {
    await access(folderPath, constants.F_OK)
  } catch {
    return null
  }

  const files = await readdir(folderPath)

  // Read metadata
  let metadata: Record<string, unknown> = {}
  try {
    const metaRaw = await readFile(join(folderPath, 'metadata.json'), 'utf-8')
    metadata = JSON.parse(metaRaw)
  } catch {
    // Metadata missing or corrupt
  }

  // Read photos
  const photoFiles = files.filter((f) => f.startsWith('photo-') && f.endsWith('.jpg')).sort() // photo-1.jpg, photo-2.jpg, etc.

  const photos: Array<{ filename: string; dataUrl: string }> = []
  for (const filename of photoFiles) {
    try {
      const dataUrl = await imageFileToDataUrl(join(folderPath, filename))
      photos.push({ filename, dataUrl })
    } catch {
      // Skip unreadable photos
    }
  }

  // Read strip and print sheet
  let stripDataUrl: string | null = null
  let printSheetDataUrl: string | null = null

  if (files.includes('strip.png')) {
    try {
      stripDataUrl = await imageFileToDataUrl(join(folderPath, 'strip.png'))
    } catch {
      // Strip unreadable
    }
  }

  if (files.includes('print-sheet.png')) {
    try {
      printSheetDataUrl = await imageFileToDataUrl(join(folderPath, 'print-sheet.png'))
    } catch {
      // Print sheet unreadable
    }
  }

  return {
    id: sessionId,
    folderPath,
    timestamp: parseFolderTimestamp(sessionId),
    photoCount: photos.length,
    filter: (metadata.filter as string) || 'none',
    photos,
    stripDataUrl,
    printSheetDataUrl,
    metadata
  }
}

/**
 * Delete a single session folder and all its contents.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const galleryPath = getGalleryPath()
  const folderPath = join(galleryPath, sessionId)

  // Safety check: only delete folders inside the gallery path
  if (!folderPath.startsWith(galleryPath)) {
    throw new Error('Invalid session path')
  }

  await rm(folderPath, { recursive: true, force: true })
  console.log(`[Storage] Deleted session: ${sessionId}`)
}

/**
 * Delete all sessions in the gallery folder.
 * Returns the count of deleted sessions and any errors encountered.
 */
export async function deleteAllSessions(): Promise<DeleteAllResult> {
  const galleryPath = getGalleryPath()
  let deleted = 0
  const errors: string[] = []

  try {
    await access(galleryPath, constants.F_OK)
  } catch {
    return { deleted: 0, errors: [] }
  }

  const entries = await readdir(galleryPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const folderPath = join(galleryPath, entry.name)
    if (!(await isSessionFolder(folderPath))) continue

    try {
      await rm(folderPath, { recursive: true, force: true })
      deleted++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${entry.name}: ${message}`)
    }
  }

  console.log(`[Storage] Deleted all sessions: ${deleted} removed, ${errors.length} errors`)
  return { deleted, errors }
}

/**
 * Open the gallery folder in the OS file manager.
 */
export async function openInFileExplorer(): Promise<{ success: boolean; error?: string }> {
  const galleryPath = getGalleryPath()

  try {
    // Create the folder if it doesn't exist yet
    await mkdir(galleryPath, { recursive: true })

    const errorMessage = await shell.openPath(galleryPath)
    if (errorMessage) {
      return { success: false, error: errorMessage }
    }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
