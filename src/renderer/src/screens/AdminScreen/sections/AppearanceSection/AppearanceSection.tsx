import { useRef, useEffect, useCallback } from 'react'
import { useStripSettingsStore } from '@/stores/stripSettingsStore'
import {
  SectionHeader,
  FilePicker,
  TextInput,
  Toggle,
  Dropdown,
  ColorPicker,
  Slider
} from '@/components/admin'
import styles from './AppearanceSection.module.css'

const DATE_FORMAT_OPTIONS = [
  { label: 'February 13, 2026', value: 'MMMM D, YYYY' },
  { label: '13-02-2026', value: 'DD-MM-YYYY' },
  { label: '2026-02-13', value: 'YYYY-MM-DD' }
]

const BORDER_STYLE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Double', value: 'double' }
]

const IMAGE_ACCEPT = ['.png', '.jpg', '.jpeg', '.gif', '.svg']

function AppearanceSection(): React.JSX.Element {
  const logoPath = useStripSettingsStore((s) => s.logoPath)
  const eventName = useStripSettingsStore((s) => s.eventName)
  const dateStampEnabled = useStripSettingsStore((s) => s.dateStampEnabled)
  const dateStampFormat = useStripSettingsStore((s) => s.dateStampFormat)
  const borderColor = useStripSettingsStore((s) => s.borderColor)
  const borderStyle = useStripSettingsStore((s) => s.borderStyle)
  const borderWidth = useStripSettingsStore((s) => s.borderWidth)
  const backgroundColor = useStripSettingsStore((s) => s.backgroundColor)

  const setLogoPath = useStripSettingsStore((s) => s.setLogoPath)
  const setEventName = useStripSettingsStore((s) => s.setEventName)
  const setDateStampEnabled = useStripSettingsStore((s) => s.setDateStampEnabled)
  const setDateStampFormat = useStripSettingsStore((s) => s.setDateStampFormat)
  const setBorderColor = useStripSettingsStore((s) => s.setBorderColor)
  const setBorderStyle = useStripSettingsStore((s) => s.setBorderStyle)
  const setBorderWidth = useStripSettingsStore((s) => s.setBorderWidth)
  const setBackgroundColor = useStripSettingsStore((s) => s.setBackgroundColor)

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Appearance</h2>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <SectionHeader title="Branding" />

          <FilePicker
            label="Logo image"
            value={logoPath}
            onChange={setLogoPath}
            accept={IMAGE_ACCEPT}
            showRemove
          />

          {logoPath && (
            <div className={styles.logoPreview}>
              <img
                src={`file://${logoPath}`}
                alt="Logo preview"
                className={styles.logoImage}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}

          <TextInput
            label="Event name"
            value={eventName}
            onChange={setEventName}
            placeholder="e.g., Sam & Jamie's Wedding"
            maxLength={100}
          />

          <SectionHeader title="Date Stamp" />

          <Toggle
            label="Show date on strip"
            value={dateStampEnabled}
            onChange={setDateStampEnabled}
          />

          <Dropdown
            label="Date format"
            value={dateStampFormat}
            onChange={(v) => setDateStampFormat(v as typeof dateStampFormat)}
            options={DATE_FORMAT_OPTIONS}
            disabled={!dateStampEnabled}
          />

          <SectionHeader title="Border & Background" />

          <ColorPicker label="Border color" value={borderColor} onChange={setBorderColor} />

          <Dropdown
            label="Border style"
            value={borderStyle}
            onChange={(v) => setBorderStyle(v as typeof borderStyle)}
            options={BORDER_STYLE_OPTIONS}
          />

          <Slider
            label="Border width (px)"
            value={borderWidth}
            onChange={setBorderWidth}
            min={0}
            max={20}
          />

          <ColorPicker
            label="Background color"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />
        </div>

        <div className={styles.previewPanel}>
          <h3 className={styles.previewTitle}>Preview</h3>
          <StripPreviewCanvas
            backgroundColor={backgroundColor}
            borderColor={borderColor}
            borderStyle={borderStyle}
            borderWidth={borderWidth}
            eventName={eventName}
            dateStampEnabled={dateStampEnabled}
            dateStampFormat={dateStampFormat}
            logoPath={logoPath}
          />
        </div>
      </div>
    </div>
  )
}

// ── Simplified strip preview rendered to a canvas ──

interface StripPreviewCanvasProps {
  backgroundColor: string
  borderColor: string
  borderStyle: string
  borderWidth: number
  eventName: string
  dateStampEnabled: boolean
  dateStampFormat: string
  logoPath: string
}

function StripPreviewCanvas({
  backgroundColor,
  borderColor,
  borderStyle,
  borderWidth,
  eventName,
  dateStampEnabled,
  dateStampFormat
}: StripPreviewCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = 200
    const h = 600
    canvas.width = w
    canvas.height = h

    // Background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, w, h)

    // Photo placeholders (4 photos)
    const padding = 10
    const photoWidth = w - padding * 2
    const brandingSpace = 80
    const availableHeight = h - brandingSpace - padding
    const photoHeight = (availableHeight - padding * 4) / 4

    for (let i = 0; i < 4; i++) {
      const y = padding + i * (photoHeight + padding)
      // Border
      if (borderStyle !== 'none' && borderWidth > 0) {
        const bw = Math.min(borderWidth, 4) // Scale down for preview
        ctx.strokeStyle = borderColor
        ctx.lineWidth = bw
        if (borderStyle === 'dashed') {
          ctx.setLineDash([6, 3])
        } else {
          ctx.setLineDash([])
        }
        ctx.strokeRect(padding - bw / 2, y - bw / 2, photoWidth + bw, photoHeight + bw)
        ctx.setLineDash([])
      }
      // Photo placeholder
      ctx.fillStyle = '#d0d0d0'
      ctx.fillRect(padding, y, photoWidth, photoHeight)
      ctx.fillStyle = '#999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Photo ${i + 1}`, w / 2, y + photoHeight / 2)
    }

    // Branding area
    const brandingY = h - brandingSpace + 5
    const textColor = getContrastColor(backgroundColor)
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'

    let textY = brandingY

    if (eventName) {
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(eventName.length > 25 ? eventName.slice(0, 25) + '...' : eventName, w / 2, textY)
      textY += 18
    }

    if (dateStampEnabled) {
      ctx.font = '10px sans-serif'
      const dateStr = formatPreviewDate(dateStampFormat)
      ctx.fillText(dateStr, w / 2, textY)
    }
  }, [
    backgroundColor,
    borderColor,
    borderStyle,
    borderWidth,
    eventName,
    dateStampEnabled,
    dateStampFormat
  ])

  useEffect(() => {
    draw()
  }, [draw])

  return <canvas ref={canvasRef} className={styles.previewCanvas} />
}

function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 128 ? '#000000' : '#FFFFFF'
}

function formatPreviewDate(format: string): string {
  const now = new Date()
  const day = now.getDate()
  const month = now.getMonth()
  const year = now.getFullYear()
  const dd = String(day).padStart(2, '0')
  const mm = String(month + 1).padStart(2, '0')
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  switch (format) {
    case 'MMMM D, YYYY':
      return `${monthNames[month]} ${day}, ${year}`
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${year}`
    case 'YYYY-MM-DD':
      return `${year}-${mm}-${dd}`
    default:
      return `${monthNames[month]} ${day}, ${year}`
  }
}

export default AppearanceSection
