/**
 * Mirrors main-process log entries to the renderer DevTools console.
 * Enabled only in development — production devtools aren't available anyway,
 * and we don't want to pay the IPC cost at runtime.
 */
export function installLogMirror(): () => void {
  if (!import.meta.env.DEV) return () => {}

  const unsubscribe = window.api.logging.onMirror((entry) => {
    const prefix = `[MAIN] [${entry.level}] [${entry.source}]`
    switch (entry.level) {
      case 'ERROR':
        console.error(prefix, entry.message)
        break
      case 'WARN':
        console.warn(prefix, entry.message)
        break
      default:
        console.debug(prefix, entry.message)
    }
  })

  return unsubscribe
}
