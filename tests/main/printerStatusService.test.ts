import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseGetPrinterOutput,
  parseGetJobsOutput,
  mapStatusCode,
  decodeJobStatus,
  statusDetail,
  waitForJobCompletion,
  type PrinterState,
  type PrintJob
} from '../../src/main/printerStatusService'

vi.mock('../../src/main/loggingService', () => ({
  log: vi.fn(),
  init: vi.fn(),
  getLogPath: vi.fn()
}))

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

describe('printerStatusService — mapStatusCode', () => {
  const cases: Array<[number, PrinterState]> = [
    [0, 'ready'],
    [3, 'ready'],
    [4, 'busy'],
    [6, 'busy'],
    [13, 'busy'],
    [14, 'busy'],
    [15, 'busy'],
    [19, 'busy'],
    [1, 'warmingUp'],
    [2, 'warmingUp'],
    [5, 'warmingUp'],
    [10, 'warmingUp'],
    [18, 'warmingUp'],
    [20, 'warmingUp'],
    [21, 'warmingUp'],
    [7, 'offline'],
    [12, 'offline'],
    [17, 'offline'],
    [8, 'error'],
    [9, 'error'],
    [11, 'error'],
    [16, 'error'],
    [22, 'error']
  ]
  it.each(cases)('maps PrinterStatus %d to %s', (code, expected) => {
    expect(mapStatusCode(code)).toBe(expected)
  })

  it('defaults unknown codes to error', () => {
    expect(mapStatusCode(999)).toBe('error')
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

describe('printerStatusService — statusDetail', () => {
  it('reports PowerSave specifically for warmingUp code 21', () => {
    expect(statusDetail('warmingUp', 21)).toBe('Warming up (PowerSave)')
  })
  it('falls back to a generic warming message for other warming codes', () => {
    expect(statusDetail('warmingUp', 5)).toBe('Warming up (code 5)')
  })
  it('formats ready/busy/offline/error with the code', () => {
    expect(statusDetail('ready', 3)).toBe('Ready (code 3)')
    expect(statusDetail('busy', 4)).toBe('Busy (code 4)')
    expect(statusDetail('offline', 7)).toBe('Offline (code 7)')
    expect(statusDetail('error', 9)).toBe('Error (code 9)')
  })
})

describe('waitForJobCompletion — stall detection', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(process, 'platform', { value: 'win32' })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

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

  it('aborts early when job is stuck in Spooling for 20s without Printing', async () => {
    const mockGetJobs = vi
      .fn<(name: string) => Promise<PrintJob[]>>()
      .mockResolvedValue([spoolingJob])

    const promise = waitForJobCompletion(
      'TestPrinter',
      42,
      {
        timeoutMs: 90_000,
        pollIntervalMs: 2_000
      },
      mockGetJobs
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
    // First 3 polls: Spooling. Then transitions to Printing. Then drains.
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
      {
        timeoutMs: 90_000,
        pollIntervalMs: 2_000
      },
      mockGetJobs
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
      {
        timeoutMs: 90_000,
        pollIntervalMs: 2_000
      },
      mockGetJobs
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
      {
        timeoutMs: 90_000,
        pollIntervalMs: 2_000
      },
      mockGetJobs
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
})
