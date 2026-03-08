import { useState, useEffect, useCallback } from 'react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import ConfirmationDialog from '@/components/ConfirmationDialog/ConfirmationDialog'
import styles from './GallerySection.module.css'

// Matches the types from the preload GalleryAPI
interface SessionSummary {
  id: string
  folderPath: string
  timestamp: string
  photoCount: number
  hasStrip: boolean
  thumbnailDataUrl: string
}

interface SessionDetail {
  id: string
  folderPath: string
  timestamp: string
  photoCount: number
  filter: string
  photos: Array<{ filename: string; dataUrl: string }>
  stripDataUrl: string | null
  printSheetDataUrl: string | null
  metadata: Record<string, unknown>
}

const SESSIONS_PER_PAGE = 20

function GallerySection(): React.JSX.Element {
  const gallerySavePath = useAppSettingsStore((s) => s.gallerySavePath)
  const setGallerySavePath = useAppSettingsStore((s) => s.setGallerySavePath)

  // Path settings state
  const [defaultPath, setDefaultPath] = useState('')
  const [pathError, setPathError] = useState<string | null>(null)
  const [explorerError, setExplorerError] = useState<string | null>(null)

  // Gallery browser state
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PER_PAGE)

  // Detail view state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Deletion state
  const [confirmDelete, setConfirmDelete] = useState<'single' | 'all' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load default path on mount
  useEffect(() => {
    window.api.gallery
      .getDefaultPath()
      .then(setDefaultPath)
      .catch(() => {})
  }, [])

  // Load session list
  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await window.api.gallery.listSessions()
      setSessions(list)
    } catch {
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Browse for folder
  const handleBrowse = async (): Promise<void> => {
    setPathError(null)
    const selected = await window.api.settings.selectDirectory({
      title: 'Select Gallery Save Folder'
    })
    if (!selected) return

    const result = await window.api.gallery.validateDirectory(selected)
    if (result.valid) {
      setGallerySavePath(selected)
      setPathError(null)
      // Refresh sessions for new path
      loadSessions()
    } else {
      setPathError(
        result.error || 'This folder is not writable. Please choose a different location.'
      )
    }
  }

  // Reset to default path
  const handleResetPath = (): void => {
    setGallerySavePath('')
    setPathError(null)
    loadSessions()
  }

  // Open in file explorer
  const handleOpenExplorer = async (): Promise<void> => {
    setExplorerError(null)
    const result = await window.api.gallery.openInExplorer()
    if (!result.success) {
      setExplorerError(result.error || 'Could not open folder.')
    }
  }

  // Open session detail
  const handleSessionClick = async (sessionId: string): Promise<void> => {
    setSelectedSessionId(sessionId)
    setIsLoadingDetail(true)
    try {
      const detail = await window.api.gallery.getSessionDetail(sessionId)
      setSessionDetail(detail)
    } catch {
      setSessionDetail(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Delete single session
  const handleDeleteSession = async (): Promise<void> => {
    if (!selectedSessionId) return
    setIsDeleting(true)
    try {
      await window.api.gallery.deleteSession(selectedSessionId)
      setSelectedSessionId(null)
      setSessionDetail(null)
      setConfirmDelete(null)
      await loadSessions()
    } catch (err) {
      console.error('[Gallery] Failed to delete session:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Delete all sessions
  const handleDeleteAll = async (): Promise<void> => {
    setIsDeleting(true)
    try {
      await window.api.gallery.deleteAllSessions()
      setConfirmDelete(null)
      setSessions([])
      setVisibleCount(SESSIONS_PER_PAGE)
    } catch (err) {
      console.error('[Gallery] Failed to delete all sessions:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const displayPath = gallerySavePath || defaultPath

  // ── Detail View ──
  if (selectedSessionId) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Gallery</h2>
        <div className={styles.detailView}>
          <div className={styles.detailHeader}>
            <button
              className={styles.backButton}
              onClick={() => {
                setSelectedSessionId(null)
                setSessionDetail(null)
              }}
            >
              Back
            </button>
            <h3 className={styles.detailTitle}>{sessionDetail?.timestamp || selectedSessionId}</h3>
          </div>

          {isLoadingDetail && <p className={styles.loadingMessage}>Loading session...</p>}

          {sessionDetail && (
            <>
              <p className={styles.detailMeta}>
                {sessionDetail.photoCount} photo{sessionDetail.photoCount !== 1 ? 's' : ''}
                {sessionDetail.filter !== 'none' && ` \u00B7 Filter: ${sessionDetail.filter}`}
              </p>

              {sessionDetail.photos.length > 0 && (
                <div className={styles.detailPhotos}>
                  {sessionDetail.photos.map((photo) => (
                    <img
                      key={photo.filename}
                      src={photo.dataUrl}
                      alt={photo.filename}
                      className={styles.detailPhotoThumb}
                    />
                  ))}
                </div>
              )}

              {sessionDetail.stripDataUrl && (
                <img
                  src={sessionDetail.stripDataUrl}
                  alt="Photo strip"
                  className={styles.detailStrip}
                />
              )}

              <button
                className={styles.deleteSessionButton}
                onClick={() => setConfirmDelete('single')}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Session'}
              </button>
            </>
          )}

          {confirmDelete === 'single' && (
            <ConfirmationDialog
              title="Delete Session?"
              message="Delete this session? This cannot be undone."
              confirmLabel="Delete"
              cancelLabel="Cancel"
              variant="danger"
              onConfirm={handleDeleteSession}
              onCancel={() => setConfirmDelete(null)}
            />
          )}
        </div>
      </div>
    )
  }

  // ── List View ──
  const visibleSessions = sessions.slice(0, visibleCount)
  const hasMore = visibleCount < sessions.length

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Gallery</h2>

      {/* Save path settings */}
      <div className={styles.controls}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gallery-save-path">
            Save Folder
          </label>
          <div className={styles.pathRow}>
            <div className={styles.field}>
              <input
                id="gallery-save-path"
                className={styles.pathInput}
                type="text"
                value={displayPath}
                readOnly
                placeholder={defaultPath}
              />
            </div>
            <button className={styles.browseButton} onClick={handleBrowse}>
              Browse...
            </button>
          </div>
        </div>

        {pathError && <div className={styles.errorMessage}>{pathError}</div>}

        <div className={styles.buttonRow}>
          <button className={styles.explorerButton} onClick={handleOpenExplorer}>
            Open in File Explorer
          </button>
          {gallerySavePath && (
            <button className={styles.browseButton} onClick={handleResetPath}>
              Reset to Default
            </button>
          )}
        </div>

        {explorerError && <div className={styles.errorMessage}>{explorerError}</div>}

        <p className={styles.note}>
          Changing the save folder only affects future sessions. Existing photos remain in the
          previous location.
        </p>
      </div>

      <hr className={styles.divider} />

      {/* Gallery browser */}
      <div className={styles.galleryHeader}>
        <h3 className={styles.galleryTitle}>Saved Sessions</h3>
        {sessions.length > 0 && (
          <button
            className={styles.deleteAllButton}
            onClick={() => setConfirmDelete('all')}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete All Sessions'}
          </button>
        )}
      </div>

      {isLoading && <p className={styles.loadingMessage}>Loading sessions...</p>}

      {!isLoading && sessions.length === 0 && (
        <p className={styles.emptyMessage}>
          No photos yet. Sessions will appear here after guests take photos.
        </p>
      )}

      {!isLoading && sessions.length > 0 && (
        <>
          <div className={styles.sessionGrid}>
            {visibleSessions.map((session) => (
              <div
                key={session.id}
                className={styles.sessionCard}
                onClick={() => handleSessionClick(session.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSessionClick(session.id)
                  }
                }}
              >
                {session.thumbnailDataUrl ? (
                  <img
                    src={session.thumbnailDataUrl}
                    alt={`Session ${session.timestamp}`}
                    className={styles.sessionThumbnail}
                  />
                ) : (
                  <div className={styles.sessionThumbnailPlaceholder}>No preview</div>
                )}
                <div className={styles.sessionInfo}>
                  <p className={styles.sessionDate}>{session.timestamp}</p>
                  <p className={styles.sessionPhotoCount}>
                    {session.photoCount} photo{session.photoCount !== 1 ? 's' : ''}
                    {session.hasStrip ? ' \u00B7 Strip' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              className={styles.loadMoreButton}
              onClick={() => setVisibleCount((c) => c + SESSIONS_PER_PAGE)}
            >
              Load More ({sessions.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}

      {confirmDelete === 'all' && (
        <ConfirmationDialog
          title="Delete All Sessions?"
          message="Delete all sessions? This will permanently remove all saved photos. This cannot be undone."
          confirmLabel="Delete All"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDeleteAll}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

export default GallerySection
