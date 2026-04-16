import { appendFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import type { WebContents } from 'electron'

// ── Types ──

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  source: string
  message: string
}

export interface GetRecentOptions {
  limit: number
  source?: string
  level?: LogLevel
}

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

// ── Ring buffer for recent logs (read by admin UI) + main→renderer mirror ──

const BUFFER_SIZE = 500
const buffer: LogEntry[] = []
let mirrorTarget: WebContents | null = null
let mirrorBuffered: LogEntry[] = []

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
  const structured: LogEntry = { timestamp, level, source, message }

  // Append to in-memory ring buffer
  buffer.unshift(structured)
  if (buffer.length > BUFFER_SIZE) buffer.length = BUFFER_SIZE

  // Mirror to renderer (console.debug) — buffer until renderer attaches
  if (mirrorTarget && !mirrorTarget.isDestroyed()) {
    try {
      mirrorTarget.send('log:mirror', structured)
    } catch {
      // swallow
    }
  } else {
    mirrorBuffered.push(structured)
    if (mirrorBuffered.length > BUFFER_SIZE) mirrorBuffered.shift()
  }

  // Queue disk writes
  writeQueue = writeQueue.then(async () => {
    try {
      await checkDateRotation()
      await rotateIfNeeded()
      await appendFile(currentFilePath, entry, 'utf-8')
      currentFileSize += Buffer.byteLength(entry, 'utf-8')
    } catch (err) {
      console.error('[Logging] Failed to write log entry:', err)
      console.error('[Logging] Original entry:', entry.trim())
    }
  })
}

/** Return the log directory path (for display in admin panel). */
export function getLogPath(): string {
  return logDir
}

/** Return recent log entries in reverse chronological order. */
export function getRecent(options: GetRecentOptions): LogEntry[] {
  const out: LogEntry[] = []
  for (const entry of buffer) {
    if (options.source && entry.source !== options.source) continue
    if (options.level && entry.level !== options.level) continue
    out.push(entry)
    if (out.length >= options.limit) break
  }
  return out
}

/** Attach a WebContents as the renderer mirror target. Flushes any buffered entries. */
export function attachRendererMirror(target: WebContents): void {
  mirrorTarget = target
  const flush = mirrorBuffered
  mirrorBuffered = []
  for (const entry of flush) {
    if (target.isDestroyed()) break
    try {
      target.send('log:mirror', entry)
    } catch {
      // swallow
    }
  }
}

/** Testing helper — clears the ring buffer between unit tests. */
export function _resetForTest(): void {
  buffer.length = 0
  mirrorBuffered.length = 0
  mirrorTarget = null
}
