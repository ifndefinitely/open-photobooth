import { describe, it, expect } from 'vitest'
import {
  parseGetPrinterOutput,
  parseGetJobsOutput,
  mapStatusCode,
  decodeJobStatus,
  statusDetail,
  type PrinterState
} from '../../src/main/printerStatusService'

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
