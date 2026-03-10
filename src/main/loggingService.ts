import { appendFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'

// ── Types ──

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

// ── Constants ──

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const RETENTION_DAYS = 7
const LOG_PREFIX = 'open-photobooth-'
const LOG_EXTENSION = '.log'

// ── Module state ──

let logDir = ''
let currentDate = '' // YYYY-MM-DD
let currentFilePath = ''
let currentFileSuffix = 1
let currentFileSize = 0
let writeQueue: Promise<void> = Promise.resolve()

// ── Helpers ──

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function buildFilePath(date: string, suffix: number): string {
  const suffixPart = suffix > 1 ? `-${suffix}` : ''
  return join(logDir, `${LOG_PREFIX}${date}${suffixPart}${LOG_EXTENSION}`)
}

/** Parse a date string from a log filename. Returns null if not a valid log file. */
function parseDateFromFilename(filename: string): string | null {
  if (!filename.startsWith(LOG_PREFIX) || !filename.endsWith(LOG_EXTENSION)) return null
  const withoutPrefix = filename.slice(LOG_PREFIX.length)
  const withoutExt = withoutPrefix.slice(0, -LOG_EXTENSION.length)
  // Extract YYYY-MM-DD (may have suffix like -2, -3)
  const match = withoutExt.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/** Delete log files older than RETENTION_DAYS. */
async function cleanOldLogs(): Promise<void> {
  try {
    const files = await readdir(logDir)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    for (const file of files) {
      const date = parseDateFromFilename(file)
      if (date && date < cutoffStr) {
        try {
          await unlink(join(logDir, file))
        } catch {
          // Ignore individual file deletion errors
        }
      }
    }
  } catch {
    // If we can't read the directory, skip cleanup silently
  }
}

/** Get the size of the current log file, or 0 if it doesn't exist. */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

/** Rotate to a new file if the current one exceeds MAX_FILE_SIZE. */
async function rotateIfNeeded(): Promise<void> {
  if (currentFileSize >= MAX_FILE_SIZE) {
    currentFileSuffix++
    currentFilePath = buildFilePath(currentDate, currentFileSuffix)
    currentFileSize = await getFileSize(currentFilePath)
  }
}

/** Switch to a new date's log file if the date has changed. */
async function checkDateRotation(): Promise<void> {
  const now = today()
  if (now !== currentDate) {
    currentDate = now
    currentFileSuffix = 1
    currentFilePath = buildFilePath(currentDate, currentFileSuffix)
    currentFileSize = await getFileSize(currentFilePath)
  }
}

// ── Public API ──

/**
 * Initialize the logging service. Call once at app startup.
 * @param userDataPath — The path from app.getPath('userData')
 */
export async function init(userDataPath: string): Promise<void> {
  logDir = join(userDataPath, 'logs')
  await mkdir(logDir, { recursive: true })

  currentDate = today()
  currentFileSuffix = 1
  currentFilePath = buildFilePath(currentDate, currentFileSuffix)
  currentFileSize = await getFileSize(currentFilePath)

  // Find the highest suffix for today if files already exist
  try {
    const files = await readdir(logDir)
    for (const file of files) {
      const date = parseDateFromFilename(file)
      if (date === currentDate) {
        const withoutPrefix = file.slice(LOG_PREFIX.length)
        const withoutExt = withoutPrefix.slice(0, -LOG_EXTENSION.length)
        const suffixMatch = withoutExt.match(/^\d{4}-\d{2}-\d{2}-(\d+)$/)
        const suffix = suffixMatch ? parseInt(suffixMatch[1], 10) : 1
        if (suffix >= currentFileSuffix) {
          currentFileSuffix = suffix
          currentFilePath = buildFilePath(currentDate, currentFileSuffix)
          currentFileSize = await getFileSize(currentFilePath)
        }
      }
    }
  } catch {
    // If we can't read the directory, just use the default file
  }

  // Check if we need to rotate the current file
  await rotateIfNeeded()

  // Clean old logs
  await cleanOldLogs()

  // Log the startup
  log('INFO', 'App', `Logging initialized. Log directory: ${logDir}`)
}

/**
 * Write a log entry. This is fire-and-forget — callers do not need to await.
 */
export function log(level: LogLevel, source: string, message: string): void {
  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] [${level}] [${source}] ${message}\n`

  // Queue writes to avoid concurrent appendFile calls
  writeQueue = writeQueue.then(async () => {
    try {
      await checkDateRotation()
      await rotateIfNeeded()
      await appendFile(currentFilePath, entry, 'utf-8')
      currentFileSize += Buffer.byteLength(entry, 'utf-8')
    } catch (err) {
      // Last resort: log to console if file write fails
      console.error('[Logging] Failed to write log entry:', err)
      console.error('[Logging] Original entry:', entry.trim())
    }
  })
}

/** Return the log directory path (for display in admin panel). */
export function getLogPath(): string {
  return logDir
}
