import { useState, useEffect, useCallback } from 'react'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import type {
  PaperSize,
  PrintQuality,
  ColorMode,
  OfflineBehaviour
} from '@/stores/printerSettingsStore'
import { NumberStepper, Toggle, Dropdown } from '@/components/admin'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import styles from './PrinterSection.module.css'

// Matches the PrinterInfo shape from the preload API
interface PrinterInfo {
  name: string
  displayName: string
  description: string
}

function PrinterSection(): React.JSX.Element {
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const paperSize = usePrinterSettingsStore((s) => s.paperSize)
  const quality = usePrinterSettingsStore((s) => s.quality)
  const colorMode = usePrinterSettingsStore((s) => s.colorMode)
  const margins = usePrinterSettingsStore((s) => s.margins)
  const copies = usePrinterSettingsStore((s) => s.copies)

  const setPrinterName = usePrinterSettingsStore((s) => s.setPrinterName)
  const setPaperSize = usePrinterSettingsStore((s) => s.setPaperSize)
  const setQuality = usePrinterSettingsStore((s) => s.setQuality)
  const setColorMode = usePrinterSettingsStore((s) => s.setColorMode)
  const setMargins = usePrinterSettingsStore((s) => s.setMargins)
  const setCopies = usePrinterSettingsStore((s) => s.setCopies)

  const preflightTimeout = usePrinterSettingsStore((s) => s.preflightTimeout)
  const verificationTimeout = usePrinterSettingsStore((s) => s.verificationTimeout)
  const verificationPollInterval = usePrinterSettingsStore((s) => s.verificationPollInterval)
  const autoRetryOnce = usePrinterSettingsStore((s) => s.autoRetryOnce)
  const offlineBehaviour = usePrinterSettingsStore((s) => s.offlineBehaviour)
  const healthPollInterval = usePrinterSettingsStore((s) => s.healthPollInterval)

  const setPreflightTimeout = usePrinterSettingsStore((s) => s.setPreflightTimeout)
  const setVerificationTimeout = usePrinterSettingsStore((s) => s.setVerificationTimeout)
  const setVerificationPollInterval = usePrinterSettingsStore((s) => s.setVerificationPollInterval)
  const setAutoRetryOnce = usePrinterSettingsStore((s) => s.setAutoRetryOnce)
  const setOfflineBehaviour = usePrinterSettingsStore((s) => s.setOfflineBehaviour)
  const setHealthPollInterval = usePrinterSettingsStore((s) => s.setHealthPollInterval)

  const liveStatus = usePrinterStatusStore((s) => s.status)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (!printerName) return
    setRefreshingStatus(true)
    try {
      const fresh = await window.api.printer.getStatus(printerName)
      setStatus(fresh)
    } finally {
      setRefreshingStatus(false)
    }
  }, [printerName, setStatus])

  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false)
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [resetStatus, setResetStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const loadPrinters = useCallback(async () => {
    setIsLoadingPrinters(true)
    try {
      const list = await window.api.printer.getPrinters()
      setPrinters(list)
    } catch {
      setPrinters([])
    } finally {
      setIsLoadingPrinters(false)
    }
  }, [])

  useEffect(() => {
    loadPrinters()
  }, [loadPrinters])

  const handleResetPrinter = async (): Promise<void> => {
    if (!printerName) return
    setIsResetting(true)
    setResetStatus(null)
    try {
      const result = await window.api.printer.resetPrinter(printerName)
      if (result.success) {
        const statusNote = result.printerStatus ? ` Printer status: ${result.printerStatus}.` : ''
        setResetStatus({ success: true, message: `Printer reset successfully.${statusNote}` })
      } else {
        setResetStatus({
          success: false,
          message: `Reset failed (${result.error ?? 'unknown'}). Try unplugging and replugging the USB cable.`
        })
      }
    } catch (error) {
      setResetStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsResetting(false)
      refreshStatus()
    }
  }

  const handleTestPrint = async (): Promise<void> => {
    if (!printerName) return
    setIsTesting(true)
    setTestStatus(null)

    try {
      // Create a simple test image using canvas
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 400
      const ctx = canvas.getContext('2d')!

      // Color gradient background
      const gradient = ctx.createLinearGradient(0, 0, 600, 400)
      gradient.addColorStop(0, '#ff6b6b')
      gradient.addColorStop(0.5, '#4ecdc4')
      gradient.addColorStop(1, '#45b7d1')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 600, 400)

      // Text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Test Print', 300, 180)
      ctx.font = '18px sans-serif'
      ctx.fillText('Open Photobooth', 300, 220)
      ctx.font = '14px sans-serif'
      ctx.fillText(new Date().toLocaleString(), 300, 260)

      const imageDataUrl = canvas.toDataURL('image/png')

      const result = await window.api.printer.print({
        printerName,
        imageDataUrl,
        copies: 1,
        colorMode,
        paperSize,
        margins
      })

      if (result.success) {
        setTestStatus({ success: true, message: 'Test page sent to printer.' })
      } else {
        setTestStatus({ success: false, message: result.error || 'Print failed.' })
      }
    } catch (error) {
      setTestStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Printer</h2>

      <div className={styles.controls}>
        {/* Printer selection */}
        <div className={styles.printerRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="printer-name">
              Printer
            </label>
            <select
              id="printer-name"
              className={styles.select}
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
            >
              <option value="">
                {isLoadingPrinters
                  ? 'Loading...'
                  : printers.length === 0
                    ? '(No printers found)'
                    : '— Select a printer —'}
              </option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
          <button
            className={styles.refreshButton}
            onClick={loadPrinters}
            disabled={isLoadingPrinters}
          >
            Refresh
          </button>
        </div>

        {/* Paper size */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="printer-paper-size">
            Paper size
          </label>
          <select
            id="printer-paper-size"
            className={styles.select}
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
          >
            <option value="4x6">4x6&quot; (Postcard)</option>
            <option value="5x7">5x7&quot;</option>
            <option value="letter">Letter</option>
            <option value="a6">A6</option>
          </select>
        </div>

        {/* Print quality */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="printer-quality">
            Print quality
          </label>
          <select
            id="printer-quality"
            className={styles.select}
            value={quality}
            onChange={(e) => setQuality(e.target.value as PrintQuality)}
          >
            <option value="draft">Draft</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Color mode */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="printer-color-mode">
            Color mode
          </label>
          <select
            id="printer-color-mode"
            className={styles.select}
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
          >
            <option value="color">Color</option>
            <option value="grayscale">Grayscale</option>
          </select>
        </div>

        {/* Margins */}
        <div className={styles.field}>
          <label className={styles.label}>Margins (mm) — set all to 0 for borderless</label>
          <div className={styles.marginsGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="margin-top">
                Top
              </label>
              <input
                id="margin-top"
                type="number"
                className={styles.numberInput}
                value={margins.top}
                min={0}
                onChange={(e) => setMargins({ ...margins, top: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="margin-right">
                Right
              </label>
              <input
                id="margin-right"
                type="number"
                className={styles.numberInput}
                value={margins.right}
                min={0}
                onChange={(e) => setMargins({ ...margins, right: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="margin-bottom">
                Bottom
              </label>
              <input
                id="margin-bottom"
                type="number"
                className={styles.numberInput}
                value={margins.bottom}
                min={0}
                onChange={(e) => setMargins({ ...margins, bottom: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="margin-left">
                Left
              </label>
              <input
                id="margin-left"
                type="number"
                className={styles.numberInput}
                value={margins.left}
                min={0}
                onChange={(e) => setMargins({ ...margins, left: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Number of copies */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="printer-copies">
            Number of copies
          </label>
          <input
            id="printer-copies"
            type="number"
            className={styles.numberInput}
            value={copies}
            min={1}
            max={5}
            onChange={(e) => setCopies(Number(e.target.value))}
          />
        </div>

        {/* Reliability subgroup */}
        <div className={styles.subgroup}>
          <h3 className={styles.subgroupTitle}>Reliability</h3>

          <div className={styles.liveStatusRow}>
            <span className={styles.liveLabel}>Current status:</span>
            <span
              className={`${styles.liveBadge} ${liveStatus ? styles[`live_${liveStatus.state}`] : styles.live_unknown}`}
            >
              {liveStatus?.state ?? 'unknown'}
            </span>
            <span className={styles.liveDetail}>{liveStatus?.detail ?? '—'}</span>
            <button
              className={styles.refreshButton}
              onClick={refreshStatus}
              disabled={!printerName || refreshingStatus}
            >
              {refreshingStatus ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          <NumberStepper
            label="Pre-flight timeout (seconds)"
            value={preflightTimeout}
            onChange={setPreflightTimeout}
            min={5}
            max={30}
          />
          <NumberStepper
            label="Verification timeout (seconds)"
            value={verificationTimeout}
            onChange={setVerificationTimeout}
            min={30}
            max={180}
          />
          <NumberStepper
            label="Verification poll interval (seconds)"
            value={verificationPollInterval}
            onChange={setVerificationPollInterval}
            min={1}
            max={10}
          />
          <Toggle
            label="Auto-retry once on verified failure"
            value={autoRetryOnce}
            onChange={setAutoRetryOnce}
          />
          <Dropdown
            label="Offline behaviour"
            value={offlineBehaviour}
            onChange={(v) => setOfflineBehaviour(v as OfflineBehaviour)}
            options={[
              { label: 'Halt captures (red banner)', value: 'halt' },
              { label: 'Capture only (amber banner, save for later)', value: 'captureOnly' }
            ]}
          />
          <NumberStepper
            label="Health check interval (seconds)"
            value={healthPollInterval}
            onChange={setHealthPollInterval}
            min={5}
            max={60}
          />
        </div>

        {/* Reset printer */}
        <button
          className={styles.testButton}
          onClick={handleResetPrinter}
          disabled={!printerName || isResetting}
        >
          {isResetting ? 'Resetting...' : 'Reset Printer'}
        </button>

        {resetStatus && (
          <div
            className={`${styles.testStatus} ${resetStatus.success ? styles.testStatusSuccess : styles.testStatusError}`}
          >
            {resetStatus.message}
          </div>
        )}

        {/* Test print */}
        <button
          className={styles.testButton}
          onClick={handleTestPrint}
          disabled={!printerName || isTesting}
        >
          {isTesting ? 'Printing...' : 'Print Test Page'}
        </button>

        {testStatus && (
          <div
            className={`${styles.testStatus} ${testStatus.success ? styles.testStatusSuccess : styles.testStatusError}`}
          >
            {testStatus.message}
          </div>
        )}

        <p className={styles.note}>
          Make sure your printer drivers are installed and the printer is connected via USB.
        </p>
      </div>
    </div>
  )
}

export default PrinterSection
