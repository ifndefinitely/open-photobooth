import { useState, useMemo } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useStripStore } from '@/stores/stripStore'
import { useStripSettingsStore } from '@/stores/stripSettingsStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { useStripComposition } from '@/hooks/useStripComposition'
import ConfirmationDialog from '@/components/ConfirmationDialog/ConfirmationDialog'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import StripPreview from '@/components/StripPreview/StripPreview'
import FilterSelector from '@/components/FilterSelector/FilterSelector'
import type { FilterType } from '@/stores/stripStore'
import styles from './ReviewScreen.module.css'

type ConfirmAction = 'redo' | 'abort' | null

function ReviewScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const goHome = useNavigationStore((s) => s.goHome)
  const photos = useSessionStore((s) => s.photos)

  const stripResult = useStripStore((s) => s.stripResult)
  const isComposing = useStripStore((s) => s.isComposing)
  const compositionError = useStripStore((s) => s.compositionError)
  const selectedFilter = useStripStore((s) => s.selectedFilter)
  const setSelectedFilter = useStripStore((s) => s.setSelectedFilter)

  const filtersEnabled = useStripSettingsStore((s) => s.filtersEnabled)
  const filterBlackAndWhite = useStripSettingsStore((s) => s.filterBlackAndWhite)
  const filterSepia = useStripSettingsStore((s) => s.filterSepia)
  const filterVintage = useStripSettingsStore((s) => s.filterVintage)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })

  // Orchestrate the composition pipeline
  useStripComposition()

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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Review Your Photos</h1>

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
          <StripPreview dataUrl={stripResult?.dataUrl ?? null} isLoading={isComposing} />
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={() => navigateTo('print')}
          disabled={isComposing || !!compositionError}
        >
          Print
        </button>
        <button className={styles.buttonSecondary} onClick={() => setConfirmAction('redo')}>
          Redo
        </button>
        <button className={styles.buttonDanger} onClick={() => setConfirmAction('abort')}>
          Start Over
        </button>
      </div>

      {confirmAction === 'redo' && (
        <ConfirmationDialog
          title="Redo Photos?"
          message="This will discard your current photos. Are you sure?"
          confirmLabel="Redo"
          cancelLabel="Cancel"
          onConfirm={() => navigateTo('session')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'abort' && (
        <ConfirmationDialog
          title="Start Over?"
          message="This will discard your photos and return to the home screen. Are you sure?"
          confirmLabel="Start Over"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => navigateTo('home')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {remainingSeconds !== null && <IdleCountdown remainingSeconds={remainingSeconds} />}
    </div>
  )
}

export default ReviewScreen
