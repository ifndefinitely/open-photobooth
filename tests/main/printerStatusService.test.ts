import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseGetPrinterOutput,
  parseGetJobsOutput,
  mapStatusCode,
  decodeJobStatus,
  decodePrinterStatus,
  statusDetail,
  printerStatusToAbortReason,
  waitForJobCompletion,
  PRINTER_STATUS,
  type PrinterStatus,
  type PrintJob
} from '../../src/main/printerStatusService'

vi.mock('../../src/main/loggingService', () => ({
  log: vi.fn(),
  init: vi.fn(),
  getLogPath: vi.fn()
}))

// ── Shared helpers for waitForJobCompletion tests ──

const readyStatus: PrinterStatus = {
  name: 'TestPrinter',
  state: 'ready',
  rawStatusCode: 0,
  jobCount: 0,
  detail: 'Normal (code 0)',
  queriedAt: Date.now()
}

describe('printerStatusService — parseGetPrinterOutput', () => {
  it('parses a compressed JSON status payload from PowerShell', () => {
    const stdout = '{"Name":"Canon SELPHY CP1500","PrinterStatus":3,"JobCount":0}'
    const result = parseGetPrinterOutput(stdout)
    expect(result).toEqual({ name: 'Canon SELPHY CP1500', statusCode: 3, jobCount: 0 })
  })

  it('returns null for empty stdout', () => {
    expect(parseGetPrinterOutput('')).toBeNull()
    expect(parseGetPrinterOutput('   \n')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(parseGetPrinterOutput('not json')).toBeNull()
  })
})

describe('printerStatusService — parseGetJobsOutput', () => {
  it('parses an array of jobs', () => {
    const stdout =
      '[{"Id":42,"DocumentName":"openphotobooth-abc","SubmittedTime":"2026-04-14T12:00:00Z","JobStatus":16},{"Id":43,"DocumentName":"foo","SubmittedTime":"2026-04-14T12:01:00Z","JobStatus":8}]'
    const jobs = parseGetJobsOutput(stdout)
    expect(jobs).toHaveLength(2)
    expect(jobs[0].id).toBe(42)
    expect(jobs[0].documentName).toBe('openphotobooth-abc')
    expect(jobs[0].jobStatus).toBe(16)
    expect(jobs[0].jobStatusLabels).toContain('Printing') // 16 = Printing
  })

  it('parses a single job object (PowerShell collapses single-element arrays)', () => {
    const stdout =
      '{"Id":42,"DocumentName":"openphotobooth-abc","SubmittedTime":"2026-04-14T12:00:00Z","JobStatus":16}'
    const jobs = parseGetJobsOutput(stdout)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].id).toBe(42)
  })

  it('returns an empty array for empty stdout', () => {
    expect(parseGetJobsOutput('')).toEqual([])
    expect(parseGetJobsOutput('   ')).toEqual([])
  })

  it('returns an empty array for malformed JSON', () => {
    expect(parseGetJobsOutput('not json')).toEqual([])
  })
})

describe('printerStatusService — mapStatusCode (bit flags)', () => {
  const PS = PRINTER_STATUS

  it('maps code 0 (no flags) to ready', () => {
    expect(mapStatusCode(0)).toBe('ready')
  })

  it.each([
    [PS.ERROR, 'ERROR'],
    [PS.PAPER_JAM, 'PAPER_JAM'],
    [PS.PAPER_OUT, 'PAPER_OUT'],
    [PS.PAPER_PROBLEM, 'PAPER_PROBLEM'],
    [PS.OUTPUT_BIN_FULL, 'OUTPUT_BIN_FULL'],
    [PS.NO_TONER, 'NO_TONER'],
    [PS.USER_INTERVENTION, 'USER_INTERVENTION'],
    [PS.OUT_OF_MEMORY, 'OUT_OF_MEMORY'],
    [PS.DOOR_OPEN, 'DOOR_OPEN']
  ])('maps error flag 0x%x (%s) to error', (code) => {
    expect(mapStatusCode(code)).toBe('error')
  })

  it.each([
    [PS.OFFLINE, 'OFFLINE'],
    [PS.NOT_AVAILABLE, 'NOT_AVAILABLE'],
    [PS.SERVER_UNKNOWN, 'SERVER_UNKNOWN']
  ])('maps offline flag 0x%x (%s) to offline', (code) => {
    expect(mapStatusCode(code)).toBe('offline')
  })

  it.each([
    [PS.PAUSED, 'PAUSED'],
    [PS.PENDING_DELETION, 'PENDING_DELETION'],
    [PS.INITIALIZING, 'INITIALIZING'],
    [PS.WARMING_UP, 'WARMING_UP'],
    [PS.POWER_SAVE, 'POWER_SAVE']
  ])('maps warming flag 0x%x (%s) to warmingUp', (code) => {
    expect(mapStatusCode(code)).toBe('warmingUp')
  })

  it.each([
    [PS.MANUAL_FEED, 'MANUAL_FEED'],
    [PS.IO_ACTIVE, 'IO_ACTIVE'],
    [PS.BUSY, 'BUSY'],
    [PS.PRINTING, 'PRINTING'],
    [PS.WAITING, 'WAITING'],
    [PS.PROCESSING, 'PROCESSING'],
    [PS.TONER_LOW, 'TONER_LOW'],
    [PS.PAGE_PUNT, 'PAGE_PUNT']
  ])('maps busy flag 0x%x (%s) to busy', (code) => {
    expect(mapStatusCode(code)).toBe('busy')
  })

  it('error flags take priority over other flags', () => {
    expect(mapStatusCode(PS.PAPER_OUT | PS.PRINTING)).toBe('error')
    expect(mapStatusCode(PS.ERROR | PS.PAUSED)).toBe('error')
    expect(mapStatusCode(PS.PAPER_JAM | PS.OFFLINE)).toBe('error')
  })

  it('offline flags take priority over warming and busy', () => {
    expect(mapStatusCode(PS.OFFLINE | PS.PAUSED)).toBe('offline')
    expect(mapStatusCode(PS.OFFLINE | PS.BUSY)).toBe('offline')
  })

  it('warming flags take priority over busy', () => {
    expect(mapStatusCode(PS.WARMING_UP | PS.BUSY)).toBe('warmingUp')
  })

  it('defaults unknown flags to error', () => {
    expect(mapStatusCode(0x2000000)).toBe('error')
  })
})

describe('printerStatusService — decodeJobStatus', () => {
  it('decodes single-bit statuses', () => {
    expect(decodeJobStatus(16)).toContain('Printing')
    expect(decodeJobStatus(64)).toContain('PaperOut')
    expect(decodeJobStatus(1024)).toContain('Paused')
  })

  it('decodes combined bit fields', () => {
    // Normal (1) + Printing (16) = 17
    const labels = decodeJobStatus(17)
    expect(labels).toContain('Normal')
    expect(labels).toContain('Printing')
  })

  it('returns an empty array for 0', () => {
    expect(decodeJobStatus(0)).toEqual([])
  })
})

describe('printerStatusService — decodePrinterStatus', () => {
  it('returns Normal for code 0', () => {
    expect(decodePrinterStatus(0)).toEqual(['Normal'])
  })

  it('decodes a single flag', () => {
    expect(decodePrinterStatus(PRINTER_STATUS.PAPER_OUT)).toEqual(['PaperOut'])
  })

  it('decodes combined flags in bit order', () => {
    // PAUSED (0x1) + PAPER_OUT (0x10) = 0x11
    expect(decodePrinterStatus(0x11)).toEqual(['Paused', 'PaperOut'])
  })

  it('decodes all error-class flags', () => {
    const labels = decodePrinterStatus(PRINTER_STATUS.PAPER_JAM | PRINTER_STATUS.DOOR_OPEN)
    expect(labels).toContain('PaperJam')
    expect(labels).toContain('DoorOpen')
  })
})

describe('printerStatusService — statusDetail', () => {
  it('formats code 0 with Normal label', () => {
    expect(statusDetail('ready', 0)).toBe('Normal (code 0)')
  })

  it('formats code 16 (PAPER_OUT) with decoded label', () => {
    expect(statusDetail('error', 16)).toBe('PaperOut (code 16)')
  })

  it('formats combined flags', () => {
    // PAUSED (0x1) + PAPER_OUT (0x10) = 17
    expect(statusDetail('error', 17)).toBe('Paused, PaperOut (code 17)')
  })
})

describe('printerStatusService — printerStatusToAbortReason', () => {
  const PS = PRINTER_STATUS

  it('returns paper_out for PAPER_OUT flag', () => {
    expect(printerStatusToAbortReason(PS.PAPER_OUT)).toBe('paper_out')
  })

  it('returns paper_jam for PAPER_JAM flag', () => {
    expect(printerStatusToAbortReason(PS.PAPER_JAM)).toBe('paper_jam')
  })

  it('returns needs_attention for USER_INTERVENTION', () => {
    expect(printerStatusToAbortReason(PS.USER_INTERVENTION)).toBe('needs_attention')
  })

  it('returns needs_attention for DOOR_OPEN', () => {
    expect(printerStatusToAbortReason(PS.DOOR_OPEN)).toBe('needs_attention')
  })

  it('returns offline for OFFLINE flag', () => {
    expect(printerStatusToAbortReason(PS.OFFLINE)).toBe('offline')
  })

  it('returns offline for NOT_AVAILABLE flag', () => {
    expect(printerStatusToAbortReason(PS.NOT_AVAILABLE)).toBe('offline')
  })

  it('returns null for code 0 (ready)', () => {
    expect(printerStatusToAbortReason(0)).toBeNull()
  })

  it('returns null for BUSY flag', () => {
    expect(printerStatusToAbortReason(PS.BUSY)).toBeNull()
  })

  it('returns null for generic ERROR flag alone', () => {
    expect(printerStatusToAbortReason(PS.ERROR)).toBeNull()
  })

  it('paper_out takes priority over offline in combined flags', () => {
    expect(printerStatusToAbortReason(PS.PAPER_OUT | PS.OFFLINE)).toBe('paper_out')
  })
})

describe('waitForJobCompletion', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(process, 'platform', { value: 'win32' })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  const mockGetStatus = vi
    .fn<(name: string) => Promise<PrinterStatus>>()
    .mockResolvedValue(readyStatus)

  const spoolingJob: PrintJob = {
    id: 42,
    documentName: 'openphotobooth-test',
    submittedTime: '',
    jobStatus: 8,
    jobStatusLabels: ['Spooling']
  }

  const printingJob: PrintJob = {
    id: 42,
    documentName: 'openphotobooth-test',
    submittedTime: '',
    jobStatus: 16,
    jobStatusLabels: ['Printing']
  }

  beforeEach(() => {
    mockGetStatus.mockClear()
    mockGetStatus.mockResolvedValue(readyStatus)
  })

  it('aborts early when job is stuck in Spooling for 20s without Printing', async () => {
    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValue([spoolingJob])

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      mockGetStatus
    )

    // Advance past the 20s stall threshold (11 polls at 2s each = 22s)
    for (let i = 0; i < 11; i++) {
      await vi.advanceTimersByTimeAsync(2_000)
    }

    const result = await promise
    expect(result.verified).toBe(false)
    if (!result.verified) {
      expect(result.reason).toBe('stalled_in_spooler')
      expect(result.lastLabels).toContain('Spooling')
    }
  })

  it('does not stall-abort if job transitions to Printing', async () => {
    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValueOnce([spoolingJob])
      .mockResolvedValueOnce([spoolingJob])
      .mockResolvedValueOnce([spoolingJob])
      .mockResolvedValueOnce([printingJob])
      .mockResolvedValueOnce([printingJob])
      .mockResolvedValue([]) // job drained

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      mockGetStatus
    )

    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(2_000)
    }

    const result = await promise
    expect(result.verified).toBe(true)
  })

  it('returns verified true when job drains from queue', async () => {
    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValueOnce([printingJob])
      .mockResolvedValueOnce([printingJob])
      .mockResolvedValue([]) // job drained

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      mockGetStatus
    )

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(2_000)
    }

    const result = await promise
    expect(result.verified).toBe(true)
  })

  it('detects bad job status even while tracking spooling stall', async () => {
    const paperOutJob: PrintJob = {
      id: 42,
      documentName: 'openphotobooth-test',
      submittedTime: '',
      jobStatus: 64,
      jobStatusLabels: ['PaperOut']
    }

    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValueOnce([spoolingJob])
      .mockResolvedValueOnce([paperOutJob])

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      mockGetStatus
    )

    for (let i = 0; i < 2; i++) {
      await vi.advanceTimersByTimeAsync(2_000)
    }

    const result = await promise
    expect(result.verified).toBe(false)
    if (!result.verified) {
      expect(result.reason).toBe('paper_out')
    }
  })

  it('aborts early when printer reports paper_out during verification', async () => {
    const paperOutPrinterStatus: PrinterStatus = {
      ...readyStatus,
      state: 'error',
      rawStatusCode: PRINTER_STATUS.PAPER_OUT,
      detail: 'PaperOut (code 16)'
    }

    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValue([printingJob])

    const localMockGetStatus = vi
      .fn<(name: string) => Promise<PrinterStatus>>()
      .mockResolvedValue(paperOutPrinterStatus)

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      localMockGetStatus
    )

    // First poll should detect the printer status and abort
    await vi.advanceTimersByTimeAsync(2_000)

    const result = await promise
    expect(result.verified).toBe(false)
    if (!result.verified) {
      expect(result.reason).toBe('paper_out')
      expect(result.lastLabels).toContain('Printing')
    }
  })

  it('aborts early when printer goes offline during verification', async () => {
    const offlinePrinterStatus: PrinterStatus = {
      ...readyStatus,
      state: 'offline',
      rawStatusCode: PRINTER_STATUS.OFFLINE,
      detail: 'Offline (code 128)'
    }

    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValue([printingJob])

    const localMockGetStatus = vi
      .fn<(name: string) => Promise<PrinterStatus>>()
      .mockResolvedValue(offlinePrinterStatus)

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      localMockGetStatus
    )

    await vi.advanceTimersByTimeAsync(2_000)

    const result = await promise
    expect(result.verified).toBe(false)
    if (!result.verified) {
      expect(result.reason).toBe('offline')
    }
  })

  it('does not abort when printer status is healthy', async () => {
    // Printer stays ready, job eventually drains
    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValueOnce([printingJob])
      .mockResolvedValueOnce([printingJob])
      .mockResolvedValue([])

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      { timeoutMs: 90_000, pollIntervalMs: 2_000 },
      mockGetJobs,
      mockGetStatus
    )

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(2_000)
    }

    const result = await promise
    expect(result.verified).toBe(true)
    // getStatus should have been called on each iteration where job was present
    expect(mockGetStatus).toHaveBeenCalled()
  })
})
