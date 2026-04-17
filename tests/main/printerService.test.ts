import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the status service BEFORE importing printerService
vi.mock('../../src/main/printerStatusService', () => ({
  getStatus: vi.fn(),
  waitForReady: vi.fn(),
  getJobs: vi.fn(),
  waitForJobCompletion: vi.fn(),
  printerStatusToAbortReason: vi.fn().mockReturnValue(null)
}))

vi.mock('../../src/main/loggingService', () => ({
  log: vi.fn(),
  init: vi.fn(),
  getLogPath: vi.fn()
}))

vi.mock('../../src/main/printerSpooler', () => ({
  submitToSpooler: vi.fn()
}))

import * as statusService from '../../src/main/printerStatusService'
import * as spooler from '../../src/main/printerSpooler'
import { checkPrinterAvailability, print } from '../../src/main/printerService'

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

  it('includes specificReason when printerStatusToAbortReason returns one', async () => {
    vi.mocked(statusService.waitForReady).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'error',
      rawStatusCode: 16,
      jobCount: 0,
      detail: 'PaperOut (code 16)',
      queriedAt: Date.now()
    })
    vi.mocked(statusService.printerStatusToAbortReason).mockReturnValue('paper_out')

    const result = await checkPrinterAvailability(mockWindow, 'Canon SELPHY CP1500', {
      preflightTimeoutMs: 10_000
    })

    expect(result.available).toBe(false)
    expect(result.status).toBe('error')
    expect(result.specificReason).toBe('paper_out')
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

const printOptions = {
  printerName: 'Canon SELPHY CP1500',
  imageDataUrl: 'data:image/png;base64,mockmock',
  copies: 1,
  colorMode: 'color' as const,
  paperSize: '4x6',
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  sessionId: 'abc123',
  verificationTimeoutMs: 90_000,
  verificationPollIntervalMs: 2_000
}

describe('print() — verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verified success — queue diff finds job, drains cleanly', async () => {
    vi.mocked(spooler.submitToSpooler).mockResolvedValue({ success: true })

    const jobBefore = {
      id: 41,
      documentName: 'old',
      submittedTime: '',
      jobStatus: 16,
      jobStatusLabels: ['Printing']
    }
    const jobNew = {
      id: 42,
      documentName: 'openphotobooth-abc123',
      submittedTime: '',
      jobStatus: 16,
      jobStatusLabels: ['Printing']
    }
    vi.mocked(statusService.getJobs)
      .mockResolvedValueOnce([jobBefore])
      .mockResolvedValueOnce([jobBefore, jobNew])

    vi.mocked(statusService.waitForJobCompletion).mockResolvedValue({ verified: true })

    const result = await print(printOptions)

    expect(result.success).toBe(true)
    expect(result.verified).toBe(true)
    expect(result.jobId).toBe(42)
    expect(result.reason).toBeUndefined()
    expect(vi.mocked(spooler.submitToSpooler)).toHaveBeenCalledWith(
      expect.objectContaining({
        documentName: 'openphotobooth-abc123',
        printerName: 'Canon SELPHY CP1500'
      })
    )
  })

  it('unverifiable — queue diff finds no new job', async () => {
    vi.mocked(spooler.submitToSpooler).mockResolvedValue({ success: true })
    vi.mocked(statusService.getJobs).mockResolvedValue([])

    const result = await print(printOptions)

    expect(result.success).toBe(true)
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('unverifiable')
  }, 10_000)

  it('paper_out — waitForJobCompletion reports failure', async () => {
    vi.mocked(spooler.submitToSpooler).mockResolvedValue({ success: true })

    vi.mocked(statusService.getJobs)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 42,
          documentName: 'openphotobooth-abc123',
          submittedTime: '',
          jobStatus: 16,
          jobStatusLabels: ['Printing']
        }
      ])

    vi.mocked(statusService.waitForJobCompletion).mockResolvedValue({
      verified: false,
      reason: 'paper_out',
      lastLabels: ['PaperOut']
    })

    const result = await print(printOptions)

    expect(result.success).toBe(false)
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('paper_out')
    expect(result.jobId).toBe(42)
  })

  it('spooler failure — webContents.print itself fails', async () => {
    vi.mocked(spooler.submitToSpooler).mockResolvedValue({ success: false, reason: 'driver_error' })
    vi.mocked(statusService.getJobs).mockResolvedValue([])

    const result = await print(printOptions)

    expect(result.success).toBe(false)
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('driver_error')
    expect(vi.mocked(statusService.waitForJobCompletion)).not.toHaveBeenCalled()
  })
})
