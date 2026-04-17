import { useState, useMemo, useCallback } from 'react'
import { logger } from '@/services/loggerService'
import { useNavigationStore } from '@/stores/navigationStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useStripStore } from '@/stores/stripStore'
import { useStripSettingsStore } from '@/stores/stripSettingsStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import type { PrinterStatus } from '@/stores/printerStatusStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { useStripComposition } from '@/hooks/useStripComposition'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
import { useT } from '@/i18n'
import ConfirmationDialog from '@/components/ConfirmationDialog/ConfirmationDialog'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import StripPreview from '@/components/StripPreview/StripPreview'
import FilterSelector from '@/components/FilterSelector/FilterSelector'
import type { FilterType } from '@/stores/stripStore'
import styles from './ReviewScreen.module.css'

type ConfirmAction = 'abort' | 'printerError' | null
type ResetState = 'idle' | 'inProgress' | 'success' | 'failed'

function ReviewScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const goHome = useNavigationStore((s) => s.goHome)
  const photos = useSessionStore((s) => s.photos)

  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const isComposing = useStripStore((s) => s.isComposing)
  const compositionError = useStripStore((s) => s.compositionError)
  const selectedFilter = useStripStore((s) => s.selectedFilter)
  const setSelectedFilter = useStripStore((s) => s.setSelectedFilter)

  const filtersEnabled = useStripSettingsStore((s) => s.filtersEnabled)
  const filterBlackAndWhite = useStripSettingsStore((s) => s.filterBlackAndWhite)
  const filterSepia = useStripSettingsStore((s) => s.filterSepia)
  const filterVintage = useStripSettingsStore((s) => s.filterVintage)

  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)
  const { bannerMode } = useCaptureAvailability()
  const setWasPrinted = useStripStore((s) => s.setWasPrinted)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [isCheckingPrinter, setIsCheckingPrinter] = useState(false)
  const [printerErrorDetail, setPrinterErrorDetail] = useState('')
  const [resetState, setResetState] = useState<ResetState>('idle')
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })
  const t = useT()

  const handleSavePress = useCallback(() => {
    setWasPrinted(false)
    navigateTo('thankyou')
  }, [navigateTo, setWasPrinted])

  const handlePrintPress = useCallback(async () => {
    if (!printerName) {
      const detail = 'No printer selected. Please configure a printer in Admin Settings.'
      logger.error('Printer', detail)
      setPrinterErrorDetail(detail)
      setConfirmAction('printerError')
      return
    }

    setIsCheckingPrinter(true)
    try {
      const result = await window.api.printer.checkAvailability(printerName)
      if (result.available) {
        navigateTo('print')
      } else {
        const detail = `Printer "${printerName}" is not available (status: ${result.status}).`
        logger.error('Printer', detail)
        setPrinterErrorDetail(detail)
        setConfirmAction('printerError')
      }
    } catch {
      const detail = 'Could not check printer status.'
      logger.error('Printer', detail)
      setPrinterErrorDetail(detail)
      setConfirmAction('printerError')
    } finally {
      setIsCheckingPrinter(false)
    }
  }, [printerName, navigateTo])

  const handleResetPrinter = async (): Promise<void> => {
    if (!printerName || resetState === 'inProgress') return
    setResetState('inProgress')
    try {
      const result = await window.api.printer.resetPrinter(printerName)
      if (result.success) {
        const fresh = await window.api.printer.getStatus(printerName)
        setStatus(fresh as PrinterStatus)
      }
      setResetState(result.success ? 'success' : 'failed')
    } catch {
      setResetState('failed')
    }
  }

  const handleTryAgainAfterError = useCallback(async (): Promise<void> => {
    setConfirmAction(null)
    if (printerName) {
      try {
        const result = await window.api.printer.resetPrinter(printerName)
        if (result.success) {
          const fresh = await window.api.printer.getStatus(printerName)
          setStatus(fresh as PrinterStatus)
        }
      } catch {
        // proceed to availability check regardless
      }
    }
    void handlePrintPress()
  }, [printerName, setStatus, handlePrintPress])

  // Orchestrate the composition pipeline
  useStripComposition()

  // Auto-save photos and strips to disk (fire-and-forget)
  useAutoSave()

  // Build list of available filters based on admin settings
  const availableFilters = useMemo(() => {
    if (!filtersEnabled) return []
    const filters: FilterType[] = ['none']
    if (filterBlackAndWhite) filters.push('bw')
    if (filterSepia) filters.push('sepia')
    if (filterVintage) filters.push('vintage')
    return filters
  }, [filtersEnabled, filterBlackAndWhite, filterSepia, filterVintage])

  const showFilters = availableFilters.length > 1

  const isActionDisabled = isComposing || !!compositionError

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('review.title')}</h1>

      {showFilters && photos.length > 0 && (
        <FilterSelector
          previewPhoto={photos[0]}
          selectedFilter={selectedFilter}
          onFilterSelect={setSelectedFilter}
          availableFilters={availableFilters}
        />
      )}

      <div className={styles.previewArea}>
        {compositionError ? (
          <p className={styles.errorMessage}>{compositionError}</p>
        ) : (
          <StripPreview dataUrl={printSheetResult?.dataUrl ?? null} isLoading={isComposing} />
        )}
      </div>

      {bannerMode === 'captureOnly' && resetState === 'success' && (
        <p className={styles.resetMessage}>{t('review.reset.success')}</p>
      )}
      {bannerMode === 'captureOnly' && resetState === 'failed' && (
        <p className={styles.resetMessageFailed}>{t('printer.reset.failed')}</p>
      )}

      <div className={styles.actions}>
        {bannerMode === 'captureOnly' ? (
          <>
            <button
              className={styles.buttonSecondary}
              onClick={handleSavePress}
              disabled={isActionDisabled}
            >
              {t('review.button.saveOnly')}
            </button>
            <button
              className={styles.buttonSecondary}
              onClick={handleResetPrinter}
              disabled={isActionDisabled || resetState === 'inProgress'}
            >
              {resetState === 'inProgress'
                ? t('printer.reset.inProgress')
                : t('printer.error.buttonReset')}
            </button>
            {resetState === 'success' && (
              <button
                className={styles.buttonPrimary}
                onClick={handlePrintPress}
                disabled={isActionDisabled || isCheckingPrinter}
              >
                {isCheckingPrinter ? t('review.checkingPrinter') : t('review.print')}
              </button>
            )}
          </>
        ) : (
          <button
            className={styles.buttonPrimary}
            onClick={handlePrintPress}
            disabled={isActionDisabled || isCheckingPrinter}
          >
            {isCheckingPrinter ? t('review.checkingPrinter') : t('review.print')}
          </button>
        )}
        <button className={styles.buttonDanger} onClick={() => setConfirmAction('abort')}>
          {t('review.abort')}
        </button>
      </div>

      {remainingSeconds !== null && (
        <IdleCountdown remainingSeconds={remainingSeconds} variant="inline" />
      )}

      {confirmAction === 'abort' && (
        <ConfirmationDialog
          title={t('review.confirmAbort.title')}
          message={t('review.confirmAbort.message')}
          confirmLabel={t('review.confirmAbort.confirm')}
          cancelLabel={t('review.confirmAbort.cancel')}
          variant="danger"
          onConfirm={() => navigateTo('home')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'printerError' && (
        <ConfirmationDialog
          title={t('error.printerNotFound')}
          message={`${printerErrorDetail || t('error.printerNotFound')}\n\n${t('error.contactOwner')}`}
          confirmLabel={t('error.tryAgain')}
          cancelLabel={t('common.back')}
          variant="danger"
          onConfirm={() => void handleTryAgainAfterError()}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

export default ReviewScreen
