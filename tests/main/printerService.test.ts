import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the status service BEFORE importing printerService
vi.mock('../../src/main/printerStatusService', () => ({
  getStatus: vi.fn(),
  waitForReady: vi.fn(),
  getJobs: vi.fn(),
  waitForJobCompletion: vi.fn()
}))

vi.mock('../../src/main/loggingService', () => ({
  log: vi.fn(),
  init: vi.fn(),
  getLogPath: vi.fn()
}))

import * as statusService from '../../src/main/printerStatusService'
import { checkPrinterAvailability } from '../../src/main/printerService'

const mockWindow = {
  webContents: {
    getPrintersAsync: vi.fn().mockResolvedValue([{ name: 'Canon SELPHY CP1500' }])
  }
} as unknown as Electron.BrowserWindow

describe('checkPrinterAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns available when status service reports ready', async () => {
    vi.mocked(statusService.waitForReady).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'ready',
      rawStatusCode: 3,
      jobCount: 0,
      detail: 'Ready (code 3)',
      queriedAt: Date.now()
    })

    const result = await checkPrinterAvailability(mockWindow, 'Canon SELPHY CP1500', {
      preflightTimeoutMs: 10_000
    })

    expect(result.available).toBe(true)
    expect(result.status).toBe('ready')
    expect(vi.mocked(statusService.waitForReady)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(statusService.waitForReady)).toHaveBeenCalledWith('Canon SELPHY CP1500', {
      timeoutMs: 10_000,
      pollIntervalMs: 500
    })
  })

  it('returns available when status service reports busy (already printing)', async () => {
    vi.mocked(statusService.waitForReady).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'busy',
      rawStatusCode: 4,
      jobCount: 1,
      detail: 'Busy (code 4)',
      queriedAt: Date.now()
    })

    const result = await checkPrinterAvailability(mockWindow, 'Canon SELPHY CP1500', {
      preflightTimeoutMs: 10_000
    })

    expect(result.available).toBe(true)
    expect(result.status).toBe('busy')
    expect(vi.mocked(statusService.waitForReady)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(statusService.waitForReady)).toHaveBeenCalledWith('Canon SELPHY CP1500', {
      timeoutMs: 10_000,
      pollIntervalMs: 500
    })
  })

  it('returns unavailable when status service reports offline after patience window', async () => {
    vi.mocked(statusService.waitForReady).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'offline',
      rawStatusCode: 7,
      jobCount: 0,
      detail: 'Offline (code 7)',
      queriedAt: Date.now()
    })

    const result = await checkPrinterAvailability(mockWindow, 'Canon SELPHY CP1500', {
      preflightTimeoutMs: 10_000
    })

    expect(result.available).toBe(false)
    expect(result.status).toBe('offline')
    expect(vi.mocked(statusService.waitForReady)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(statusService.waitForReady)).toHaveBeenCalledWith('Canon SELPHY CP1500', {
      timeoutMs: 10_000,
      pollIntervalMs: 500
    })
  })

  it('returns unavailable when printer is not in the OS list', async () => {
    ;(mockWindow.webContents.getPrintersAsync as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const result = await checkPrinterAvailability(mockWindow, 'Missing Printer', {
      preflightTimeoutMs: 10_000
    })

    expect(result.available).toBe(false)
    expect(result.status).toBe('not_found')
    expect(vi.mocked(statusService.waitForReady)).not.toHaveBeenCalled()
  })
})
