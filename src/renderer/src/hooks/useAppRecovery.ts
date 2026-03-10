import { useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useStripStore } from '@/stores/stripStore'
import { useErrorStore } from '@/stores/errorStore'
import { useCameraStore } from '@/stores/cameraStore'
import { useNavigationStore } from '@/stores/navigationStore'
import { stopMusic } from '@/services/audioService'
import { logger } from '@/services/loggerService'

/**
 * Returns a recovery function that cleanly resets all app state
 * and navigates to the home screen. Each step is wrapped in try/catch
 * so a failure in one does not block the others.
 *
 * @param onResetBoundary — optional callback to reset the ErrorBoundary's hasError state
 */
export function useAppRecovery(onResetBoundary?: () => void): () => void {
  return useCallback(() => {
    logger.info('Recovery', 'Starting app recovery...')

    // 1. Clear session state (photos, phase, countdown)
    try {
      useSessionStore.getState().resetSession()
    } catch (err) {
      logger.error('Recovery', `Failed to reset session: ${err}`)
    }

    // 2. Clear strip state (canvas, filter, composition)
    try {
      useStripStore.getState().resetStrip()
    } catch (err) {
      logger.error('Recovery', `Failed to reset strip: ${err}`)
    }

    // 3. Clear error state
    try {
      useErrorStore.getState().clearError()
    } catch (err) {
      logger.error('Recovery', `Failed to clear error: ${err}`)
    }

    // 4. Stop camera stream (useCameraLifecycle will restart it on home screen)
    try {
      useCameraStore.getState().stopCamera()
    } catch (err) {
      logger.error('Recovery', `Failed to stop camera: ${err}`)
    }

    // 5. Stop music (useMusicLifecycle will reconcile based on new screen)
    try {
      stopMusic()
    } catch (err) {
      logger.error('Recovery', `Failed to stop music: ${err}`)
    }

    // 6. Reset the error boundary so it can render children again
    try {
      onResetBoundary?.()
    } catch (err) {
      logger.error('Recovery', `Failed to reset error boundary: ${err}`)
    }

    // 7. Navigate to home
    try {
      useNavigationStore.getState().goHome()
    } catch (err) {
      logger.error('Recovery', `Failed to navigate home: ${err}`)
    }

    logger.info('Recovery', 'App recovery complete')
  }, [onResetBoundary])
}
