/**
 * Renderer-side logger. Sends log entries to the main process via IPC.
 * Falls back to console in development or if IPC is unavailable.
 */

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

function send(level: LogLevel, source: string, message: string): void {
  try {
    window.api.logging.log(level, source, message)
  } catch {
    // Fallback to console if IPC is not available (e.g., during tests)
  }

  // Also log to console in development for convenience
  if (import.meta.env.DEV) {
    const consoleFn =
      level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log
    consoleFn(`[${level}] [${source}] ${message}`)
  }
}

export const logger = {
  error: (source: string, message: string): void => send('ERROR', source, message),
  warn: (source: string, message: string): void => send('WARN', source, message),
  info: (source: string, message: string): void => send('INFO', source, message),
  debug: (source: string, message: string): void => send('DEBUG', source, message)
}
