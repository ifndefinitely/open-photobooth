import { useCallback, useEffect, useRef, useState } from 'react'
import { playMusic, stopMusic } from '@/services/audioService'
import styles from './MusicLibrarySection.module.css'

interface MusicLibraryTrack {
  filename: string
  url: string
  sizeBytes: number
}

const PREVIEW_DURATION_MS = 10_000
const MAX_TRACKS = 30
const PLAYABILITY_TIMEOUT_MS = 3_000

function MusicLibrarySection(): React.JSX.Element {
  const [tracks, setTracks] = useState<MusicLibraryTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewingFilename, setPreviewingFilename] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ filename: string; message: string } | null>(null)

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadTracks = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await window.api.musicLibrary.list()
      setTracks(list)
    } catch (err) {
      console.error('[MusicLibrarySection] list failed:', err)
      setTracks([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTracks()
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
        previewTimerRef.current = null
      }
      stopMusic()
    }
  }, [loadTracks])

  function clearPreviewState(): void {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    setPreviewingFilename(null)
  }

  function handlePreview(track: MusicLibraryTrack): void {
    setRowError(null)
    if (previewingFilename === track.filename) {
      stopMusic(true)
      clearPreviewState()
      return
    }
    if (previewingFilename) {
      stopMusic()
      clearPreviewState()
    }
    playMusic([track.url])
    setPreviewingFilename(track.filename)
    previewTimerRef.current = setTimeout(() => {
      stopMusic(true)
      clearPreviewState()
    }, PREVIEW_DURATION_MS)
  }

  async function handleRemove(filename: string): Promise<void> {
    setRowError(null)
    if (previewingFilename === filename) {
      stopMusic()
      clearPreviewState()
    }
    try {
      await window.api.musicLibrary.remove(filename)
      await loadTracks()
    } catch (err) {
      setRowError({
        filename,
        message: `Could not remove track: ${(err as Error).message}`
      })
    }
  }

  async function verifyPlayability(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio()
      let settled = false
      const cleanup = (): void => {
        audio.removeEventListener('canplaythrough', onCanPlay)
        audio.removeEventListener('error', onError)
        audio.src = ''
      }
      const onCanPlay = (): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(true)
      }
      const onError = (): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(false)
      }
      audio.addEventListener('canplaythrough', onCanPlay)
      audio.addEventListener('error', onError)
      audio.src = url
      audio.load()
      setTimeout(() => {
        if (settled) return
        settled = true
        cleanup()
        resolve(false)
      }, PLAYABILITY_TIMEOUT_MS)
    })
  }

  async function handleAdd(): Promise<void> {
    setErrorMessage(null)
    setRowError(null)
    setImporting(true)
    try {
      const result = await window.api.musicLibrary.pickAndImport()

      if (!result.ok) {
        if (result.reason === 'cancelled') return
        setErrorMessage(messageForReason(result.reason, result.message))
        return
      }

      const playable = await verifyPlayability(result.track.url)
      if (!playable) {
        await window.api.musicLibrary.remove(result.track.filename).catch(() => {})
        setErrorMessage(
          'This file could not be played. It may be corrupt or in an unsupported codec.'
        )
        return
      }

      await loadTracks()
    } finally {
      setImporting(false)
    }
  }

  const isFull = tracks.length >= MAX_TRACKS

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Music Library</h2>

      <p className={styles.intro}>
        When your custom library is empty, the three default tracks bundled with the app will play.
      </p>

      {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

      {isLoading && <p>Loading tracks...</p>}

      {!isLoading && tracks.length === 0 && (
        <div className={styles.emptyMessage}>
          No custom tracks yet. Click <strong>Add music file</strong> to import one.
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <div className={styles.list}>
          {tracks.map((track) => (
            <div key={track.filename} className={styles.row}>
              <span className={styles.filename}>{track.filename}</span>
              <button
                type="button"
                className={styles.rowButton}
                onClick={() => handlePreview(track)}
                disabled={previewingFilename !== null && previewingFilename !== track.filename}
              >
                {previewingFilename === track.filename ? 'Stop Preview' : 'Preview'}
              </button>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleRemove(track.filename)}
                aria-label={`Remove ${track.filename}`}
              >
                Remove
              </button>
              {rowError && rowError.filename === track.filename && (
                <div className={styles.rowError}>{rowError.message}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.addRow}>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAdd}
          disabled={importing || isFull}
          title={isFull ? 'Remove a track to add another.' : undefined}
        >
          {importing ? 'Importing...' : '+ Add music file'}
        </button>
        <span className={styles.count}>
          {tracks.length} / {MAX_TRACKS} tracks
        </span>
      </div>

      <p className={styles.note}>Supported formats: MP3, WAV. Max 50 MB each.</p>
    </div>
  )
}

function messageForReason(reason: string, raw?: string): string {
  switch (reason) {
    case 'invalid-extension':
      return 'Only MP3 and WAV files are supported.'
    case 'file-too-large':
      return 'File is too large. Maximum size is 50 MB.'
    case 'library-full':
      return 'Library is full. Remove a track before adding another.'
    case 'io-error':
      return `Could not import file: ${raw ?? 'unknown error'}`
    default:
      return 'Could not import file.'
  }
}

export default MusicLibrarySection
