import { spawn } from 'child_process'
import * as loggingService from './loggingService'

// ── Types ──

export type PrinterState = 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error'

export interface PrinterStatus {
  name: string
  state: PrinterState
  rawStatusCode: number
  jobCount: number
  detail: string
  queriedAt: number
}

export interface PrintJob {
  id: number
  documentName: string
  submittedTime: string
  jobStatus: number
  jobStatusLabels: string[]
}

// ── Pure decoders (exported for unit tests) ──

interface RawGetPrinterJson {
  Name: string
  PrinterStatus: number
  JobCount: number
}

interface RawGetJobJson {
  Id: number
  DocumentName: string
  SubmittedTime: string
  JobStatus: number
}

export function parseGetPrinterOutput(
  stdout: string
): { name: string; statusCode: number; jobCount: number } | null {
  const trimmed = stdout.trim()
  if (trimmed.length === 0) return null
  try {
    const raw = JSON.parse(trimmed) as RawGetPrinterJson
    if (!raw || typeof raw.Name !== 'string' || typeof raw.PrinterStatus !== 'number') {
      return null
    }
    return {
      name: raw.Name,
      statusCode: raw.PrinterStatus,
      jobCount: typeof raw.JobCount === 'number' ? raw.JobCount : 0
    }
  } catch {
    return null
  }
}

export function parseGetJobsOutput(stdout: string): PrintJob[] {
  const trimmed = stdout.trim()
  if (trimmed.length === 0) return []
  try {
    const raw = JSON.parse(trimmed) as RawGetJobJson | RawGetJobJson[]
    const rawArray = Array.isArray(raw) ? raw : [raw]
    return rawArray
      .filter((j) => j && typeof j.Id === 'number')
      .map((j) => ({
        id: j.Id,
        documentName: j.DocumentName ?? '',
        submittedTime: j.SubmittedTime ?? '',
        jobStatus: j.JobStatus ?? 0,
        jobStatusLabels: decodeJobStatus(j.JobStatus ?? 0)
      }))
  } catch {
    return []
  }
}

// PrinterStatus codes from Microsoft PrintManagement module.
const READY_CODES = new Set([0, 3])
const BUSY_CODES = new Set([4, 6, 13, 14, 15, 19])
const WARMING_CODES = new Set([1, 2, 5, 10, 18, 20, 21])
const OFFLINE_CODES = new Set([7, 12, 17])
const ERROR_CODES = new Set([8, 9, 11, 16, 22])

export function mapStatusCode(code: number): PrinterState {
  if (READY_CODES.has(code)) return 'ready'
  if (BUSY_CODES.has(code)) return 'busy'
  if (WARMING_CODES.has(code)) return 'warmingUp'
  if (OFFLINE_CODES.has(code)) return 'offline'
  if (ERROR_CODES.has(code)) return 'error'
  return 'error'
}

// JobStatus bit field — Microsoft spec.
const JOB_STATUS_BITS: Array<[number, string]> = [
  [1, 'Normal'],
  [2, 'Error'],
  [4, 'Deleting'],
  [8, 'Spooling'],
  [16, 'Printing'],
  [32, 'UserIntervention'],
  [64, 'PaperOut'],
  [128, 'Offline'],
  [256, 'Printed'],
  [512, 'Restart'],
  [1024, 'Paused'],
  [2048, 'Complete']
]

export function decodeJobStatus(value: number): string[] {
  return JOB_STATUS_BITS.filter(([bit]) => (value & bit) !== 0).map(([, label]) => label)
}

export function statusDetail(state: PrinterState, code: number): string {
  switch (state) {
    case 'ready':
      return `Ready (code ${code})`
    case 'busy':
      return `Busy (code ${code})`
    case 'warmingUp':
      return code === 21 ? 'Warming up (PowerSave)' : `Warming up (code ${code})`
    case 'offline':
      return `Offline (code ${code})`
    case 'error':
      return `Error (code ${code})`
    default: {
      const _exhaustive: never = state
      return _exhaustive
    }
  }
}

// ── Non-Windows stub ──

function isWindows(): boolean {
  return process.platform === 'win32'
}

let stubWarned = false
function stubStatus(name: string): PrinterStatus {
  if (!stubWarned) {
    loggingService.log(
      'WARN',
      'Printer',
      'printerStatusService: non-Windows platform, verification disabled'
    )
    stubWarned = true
  }
  // Stub returns 'ready' so dev flows on non-Windows don't stall in waitForReady.
  return {
    name,
    state: 'ready',
    rawStatusCode: 0,
    jobCount: 0,
    detail: 'Stub (non-Windows)',
    queriedAt: Date.now()
  }
}

// ── PowerShell runner ──

function runPowerShell(script: string, timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true }
    )
    let stdout = ''
    let stderr = ''
    let settled = false
    const killer = setTimeout(() => {
      if (settled) return
      settled = true
      ps.kill()
      reject(new Error(`PowerShell timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(killer)
      fn()
    }
    ps.stdout.on('data', (chunk) => (stdout += chunk.toString('utf-8')))
    ps.stderr.on('data', (chunk) => (stderr += chunk.toString('utf-8')))
    ps.on('error', (err) => finish(() => reject(err)))
    ps.on('close', (code) => {
      finish(() => {
        if (code !== 0) {
          reject(new Error(`PowerShell exited ${code}: ${stderr.trim() || 'unknown error'}`))
          return
        }
        resolve(stdout)
      })
    })
  })
}

function quotePsArg(arg: string): string {
  return `'${arg.replace(/'/g, "''")}'`
}

// ── Public API ──

export async function getStatus(printerName: string): Promise<PrinterStatus> {
  if (!isWindows()) return stubStatus(printerName)

  const script = `Get-Printer -Name ${quotePsArg(printerName)} | Select-Object Name,PrinterStatus,JobCount | ConvertTo-Json -Compress`
  try {
    const stdout = await runPowerShell(script)
    const parsed = parseGetPrinterOutput(stdout)
    if (!parsed) {
      loggingService.log(
        'WARN',
        'Printer',
        `getStatus: empty or malformed PowerShell output for "${printerName}"`
      )
      return {
        name: printerName,
        state: 'offline',
        rawStatusCode: -1,
        jobCount: 0,
        detail: 'No response from Get-Printer',
        queriedAt: Date.now()
      }
    }
    const state = mapStatusCode(parsed.statusCode)
    return {
      name: parsed.name,
      state,
      rawStatusCode: parsed.statusCode,
      jobCount: parsed.jobCount,
      detail: statusDetail(state, parsed.statusCode),
      queriedAt: Date.now()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    loggingService.log('ERROR', 'Printer', `getStatus failed: ${msg}`)
    return {
      name: printerName,
      state: 'offline',
      rawStatusCode: -1,
      jobCount: 0,
      detail: `Query failed: ${msg}`,
      queriedAt: Date.now()
    }
  }
}

export async function getJobs(printerName: string): Promise<PrintJob[]> {
  if (!isWindows()) return []

  const script = `$ErrorActionPreference='SilentlyContinue'; $jobs = Get-PrintJob -PrinterName ${quotePsArg(printerName)} | Select-Object Id,DocumentName,SubmittedTime,JobStatus; if ($null -eq $jobs) { '' } else { $jobs | ConvertTo-Json -Compress }`
  try {
    const stdout = await runPowerShell(script)
    return parseGetJobsOutput(stdout)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    loggingService.log('WARN', 'Printer', `getJobs failed: ${msg}`)
    return []
  }
}

// ── Warming-up patience polling ──

export interface WaitForReadyOptions {
  timeoutMs: number
  pollIntervalMs: number
}

/**
 * Poll getStatus until the printer is ready/busy or time runs out.
 * Used for the pre-flight patience window when a SELPHY is warming up.
 */
export async function waitForReady(
  printerName: string,
  options: WaitForReadyOptions
): Promise<PrinterStatus> {
  const deadline = Date.now() + options.timeoutMs
  let latest = await getStatus(printerName)
  while (Date.now() < deadline) {
    // 'busy' = printer is actively printing (not warming up) — pre-flight passes.
    if (latest.state === 'ready' || latest.state === 'busy') return latest
    if (latest.state === 'offline' || latest.state === 'error') return latest
    await sleep(options.pollIntervalMs)
    latest = await getStatus(printerName)
  }
  return latest
}

// ── Verification polling ──

export interface WaitForJobOptions {
  timeoutMs: number
  pollIntervalMs: number
}

export type JobWaitResult =
  | { verified: true }
  | { verified: false; reason: string; lastLabels: string[] }

const BAD_JOB_LABELS = new Set(['Error', 'PaperOut', 'UserIntervention', 'Paused'])

export async function waitForJobCompletion(
  printerName: string,
  jobId: number,
  options: WaitForJobOptions
): Promise<JobWaitResult> {
  if (!isWindows()) return { verified: true }

  const deadline = Date.now() + options.timeoutMs
  let lastLabels: string[] = []

  while (Date.now() < deadline) {
    const jobs = await getJobs(printerName)
    const job = jobs.find((j) => j.id === jobId)

    if (!job) {
      // Job drained from the queue → success.
      return { verified: true }
    }

    lastLabels = job.jobStatusLabels
    const bad = lastLabels.find((l) => BAD_JOB_LABELS.has(l))
    if (bad) {
      return { verified: false, reason: labelToReason(bad), lastLabels }
    }

    await sleep(options.pollIntervalMs)
  }

  return {
    verified: false,
    reason: 'verification_timeout',
    lastLabels
  }
}

function labelToReason(label: string): string {
  switch (label) {
    case 'PaperOut':
      return 'paper_out'
    case 'Error':
      return 'job_error'
    case 'UserIntervention':
      return 'needs_attention'
    case 'Paused':
      return 'paused'
    default:
      return label.toLowerCase()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
