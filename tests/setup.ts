import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock window.api (IPC bridge) — covers all namespaces from preload/index.d.ts
// ---------------------------------------------------------------------------
const mockApi = {
  printer: {
    getPrinters: vi.fn().mockResolvedValue([]),
    checkAvailability: vi.fn().mockResolvedValue({ available: true, status: 'ready' }),
    print: vi.fn().mockResolvedValue({ success: true })
  },
  settings: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue({}),
    reset: vi.fn().mockResolvedValue(undefined),
    resetAll: vi.fn().mockResolvedValue(undefined),
    selectFile: vi.fn().mockResolvedValue(null),
    selectDirectory: vi.fn().mockResolvedValue(null)
  },
  gallery: {
    saveSession: vi
      .fn()
      .mockResolvedValue({ success: true, sessionFolder: '/tmp/test-session', error: undefined }),
    saveStrip: vi.fn().mockResolvedValue(undefined),
    listSessions: vi.fn().mockResolvedValue([]),
    getSessionDetail: vi.fn().mockResolvedValue(null),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    deleteAllSessions: vi.fn().mockResolvedValue({ deleted: 0, errors: [] }),
    validateDirectory: vi.fn().mockResolvedValue({ valid: true }),
    openInExplorer: vi.fn().mockResolvedValue({ success: true }),
    getDefaultPath: vi.fn().mockResolvedValue('/tmp/gallery')
  },
  logging: {
    log: vi.fn().mockResolvedValue(undefined),
    getLogPath: vi.fn().mockResolvedValue('/tmp/logs')
  },
  kiosk: {
    setAdminPanelOpen: vi.fn().mockResolvedValue(undefined)
  }
}

Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true,
  configurable: true
})

// ---------------------------------------------------------------------------
// Mock HTMLCanvasElement.prototype.getContext (jsdom does not implement it)
// ---------------------------------------------------------------------------
const mockContext2d = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createPattern: vi.fn(),
  canvas: { width: 300, height: 150 },
  filter: '',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  shadowBlur: 0,
  shadowColor: 'rgba(0,0,0,0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  roundRect: vi.fn()
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext2d) as never
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock')
HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb: BlobCallback) => {
  cb(new Blob(['mock'], { type: 'image/png' }))
})

// ---------------------------------------------------------------------------
// Mock createImageBitmap (not available in jsdom)
// ---------------------------------------------------------------------------
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = vi.fn().mockResolvedValue({
    width: 300,
    height: 150,
    close: vi.fn()
  })
}

// ---------------------------------------------------------------------------
// Mock Audio (used by audioService)
// ---------------------------------------------------------------------------
globalThis.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  volume: 1,
  currentTime: 0,
  paused: true,
  src: ''
})) as unknown as typeof Audio

// ---------------------------------------------------------------------------
// Mock URL.createObjectURL / revokeObjectURL (not in jsdom)
// ---------------------------------------------------------------------------
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn()
}
