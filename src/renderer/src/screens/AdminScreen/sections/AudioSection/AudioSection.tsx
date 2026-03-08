import { useRef, useState } from 'react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import { Dropdown, Slider, Toggle } from '@/components/admin'
import { playMusic, stopMusic, playSFX, MUSIC_TRACKS, SFX } from '@/services/audioService'
import styles from './AudioSection.module.css'

const MUSIC_MODE_OPTIONS = [
  { label: 'Play during idle', value: 'idle' },
  { label: 'Play during photo session', value: 'session' },
  { label: 'Play always', value: 'always' },
  { label: 'Off', value: 'off' }
]

const PREVIEW_DURATION_MS = 10_000

function AudioSection(): React.JSX.Element {
  const audioMusicMode = useAppSettingsStore((s) => s.audioMusicMode)
  const audioMusicVolume = useAppSettingsStore((s) => s.audioMusicVolume)
  const audioCountdownBeep = useAppSettingsStore((s) => s.audioCountdownBeep)
  const audioShutterSound = useAppSettingsStore((s) => s.audioShutterSound)
  const setAudioMusicMode = useAppSettingsStore((s) => s.setAudioMusicMode)
  const setAudioMusicVolume = useAppSettingsStore((s) => s.setAudioMusicVolume)
  const setAudioCountdownBeep = useAppSettingsStore((s) => s.setAudioCountdownBeep)
  const setAudioShutterSound = useAppSettingsStore((s) => s.setAudioShutterSound)

  const flashEffect = useSessionSettingsStore((s) => s.flashEffect)
  const setFlashEffect = useSessionSettingsStore((s) => s.setFlashEffect)

  const [musicPreviewing, setMusicPreviewing] = useState(false)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePreviewMusic(): void {
    if (musicPreviewing) {
      // Stop preview
      stopMusic(true)
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
        previewTimerRef.current = null
      }
      setMusicPreviewing(false)
      return
    }

    playMusic(MUSIC_TRACKS)
    setMusicPreviewing(true)

    previewTimerRef.current = setTimeout(() => {
      stopMusic(true)
      setMusicPreviewing(false)
      previewTimerRef.current = null
    }, PREVIEW_DURATION_MS)
  }

  function handlePreviewBeep(): void {
    playSFX(SFX.BEEP)
    setTimeout(() => playSFX(SFX.BEEP_FINAL), 500)
  }

  function handlePreviewShutter(): void {
    playSFX(SFX.SHUTTER)
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Audio</h2>

      <div className={styles.controls}>
        <Dropdown
          label="Music mode"
          value={audioMusicMode}
          onChange={setAudioMusicMode}
          options={MUSIC_MODE_OPTIONS}
        />

        <Slider
          label="Music volume"
          value={audioMusicVolume}
          onChange={setAudioMusicVolume}
          min={0}
          max={100}
        />

        <button type="button" className={styles.previewButton} onClick={handlePreviewMusic}>
          {musicPreviewing ? 'Stop Preview' : 'Preview Music'}
        </button>

        <Toggle
          label="Countdown beep"
          value={audioCountdownBeep}
          onChange={setAudioCountdownBeep}
        />

        <button type="button" className={styles.previewButton} onClick={handlePreviewBeep}>
          Preview Beep
        </button>

        <Toggle label="Shutter sound" value={audioShutterSound} onChange={setAudioShutterSound} />

        <button type="button" className={styles.previewButton} onClick={handlePreviewShutter}>
          Preview Shutter
        </button>

        <Toggle label="Flash effect on capture" value={flashEffect} onChange={setFlashEffect} />

        <p className={styles.note}>
          Music mode and volume changes take effect immediately. Other settings apply to the next
          session.
        </p>
      </div>
    </div>
  )
}

export default AudioSection
