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

// Windows PRINTER_STATUS bit flags (winspool.h / PrintManagement module).
// These are a bit-field, not a sequential enum — multiple flags can be set at once.
export const PRINTER_STATUS = {
  PAUSED: 0x1,
  ERROR: 0x2,
  PENDING_DELETION: 0x4,
  PAPER_JAM: 0x8,
  PAPER_OUT: 0x10,
  MANUAL_FEED: 0x20,
  PAPER_PROBLEM: 0x40,
  OFFLINE: 0x80,
  IO_ACTIVE: 0x100,
  BUSY: 0x200,
  PRINTING: 0x400,
  OUTPUT_BIN_FULL: 0x800,
  NOT_AVAILABLE: 0x1000,
  WAITING: 0x2000,
  PROCESSING: 0x4000,
  INITIALIZING: 0x8000,
  WARMING_UP: 0x10000,
  TONER_LOW: 0x20000,
  NO_TONER: 0x40000,
  PAGE_PUNT: 0x80000,
  USER_INTERVENTION: 0x100000,
  OUT_OF_MEMORY: 0x200000,
  DOOR_OPEN: 0x400000,
  SERVER_UNKNOWN: 0x800000,
  POWER_SAVE: 0x1000000
} as const

const PS = PRINTER_STATUS

/** Flags that indicate a hard error requiring human intervention. */
const ERROR_FLAGS =
  PS.PAPER_JAM |
  PS.PAPER_OUT |
  PS.PAPER_PROBLEM |
  PS.OUTPUT_BIN_FULL |
  PS.OUT_OF_MEMORY |
  PS.DOOR_OPEN |
  PS.USER_INTERVENTION |
  PS.NO_TONER |
  PS.ERROR

/** Flags that indicate the printer is unreachable. */
const OFFLINE_FLAGS = PS.OFFLINE | PS.NOT_AVAILABLE | PS.SERVER_UNKNOWN

/** Flags that indicate a transient warm-up / initialization state. */
const WARMING_FLAGS =
  PS.WARMING_UP | PS.INITIALIZING | PS.POWER_SAVE | PS.PAUSED | PS.PENDING_DELETION

/** Flags that indicate the printer is busy but functional. */
const BUSY_FLAGS =
  PS.BUSY |
  PS.PRINTING |
  PS.IO_ACTIVE |
  PS.PROCESSING |
  PS.MANUAL_FEED |
  PS.WAITING |
  PS.TONER_LOW |
  PS.PAGE_PUNT

/**
 * Map a Windows PrinterStatus bit-field to a simplified state.
 * Priority: error > offline > warmingUp > busy > ready.
 */
export function mapStatusCode(code: number): PrinterState {
  if (code === 0) return 'ready'
  if (code & ERROR_FLAGS) return 'error'
  if (code & OFFLINE_FLAGS) return 'offline'
  if (code & WARMING_FLAGS) return 'warmingUp'
  if (code & BUSY_FLAGS) return 'busy'
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

const PRINTER_STATUS_LABELS: Array<[number, string]> = [
  [PS.PAUSED, 'Paused'],
  [PS.ERROR, 'Error'],
  [PS.PENDING_DELETION, 'PendingDeletion'],
  [PS.PAPER_JAM, 'PaperJam'],
  [PS.PAPER_OUT, 'PaperOut'],
  [PS.MANUAL_FEED, 'ManualFeed'],
  [PS.PAPER_PROBLEM, 'PaperProblem'],
  [PS.OFFLINE, 'Offline'],
  [PS.IO_ACTIVE, 'IOActive'],
  [PS.BUSY, 'Busy'],
  [PS.PRINTING, 'Printing'],
  [PS.OUTPUT_BIN_FULL, 'OutputBinFull'],
  [PS.NOT_AVAILABLE, 'NotAvailable'],
  [PS.WAITING, 'Waiting'],
  [PS.PROCESSING, 'Processing'],
  [PS.INITIALIZING, 'Initializing'],
  [PS.WARMING_UP, 'WarmingUp'],
  [PS.TONER_LOW, 'TonerLow'],
  [PS.NO_TONER, 'NoToner'],
  [PS.PAGE_PUNT, 'PagePunt'],
  [PS.USER_INTERVENTION, 'UserIntervention'],
  [PS.OUT_OF_MEMORY, 'OutOfMemory'],
  [PS.DOOR_OPEN, 'DoorOpen'],
  [PS.SERVER_UNKNOWN, 'ServerUnknown'],
  [PS.POWER_SAVE, 'PowerSave']
]

/** Decode a bit-field printer status code into human-readable flag labels. */
export function decodePrinterStatus(code: number): string[] {
  if (code === 0) return ['Normal']
  return PRINTER_STATUS_LABELS.filter(([bit]) => (code & bit) !== 0).map(([, label]) => label)
}

export function statusDetail(_state: PrinterState, code: number): string {
  const labels = decodePrinterStatus(code)
  return `${labels.join(', ')} (code ${code})`
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

  // When PrinterStatus is 0 (Normal/Ready) and the port is a USB port with no active
  // jobs, probe the port directly. The Windows print spooler caches PrinterStatus and
  // does not update it on USB disconnect — the cached "ready" value can persist
  // indefinitely. Opening the port via FileStream forces an OS-level check: if the
  // USB device is gone the open fails and we report the printer as offline immediately.
  // The probe is skipped when jobs are queued (printer is clearly in use).
  const safeName = quotePsArg(printerName)
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$p = Get-Printer -Name ${safeName} -ErrorAction SilentlyContinue
if ($null -eq $p) {
  [PSCustomObject]@{Name=${safeName};PrinterStatus=128;JobCount=0} | ConvertTo-Json -Compress
} else {
  $sc = [int]$p.PrinterStatus
  $jc = if ($null -ne $p.JobCount) { [int]$p.JobCount } else { 0 }
  $forceOffline = $false
  if ($sc -eq 0 -and $p.PortName -match '^USB\\d+$' -and $jc -eq 0) {
    try {
      $bs = [char]92
      $portPath = "$bs$bs.$bs" + $p.PortName
      $fs = New-Object System.IO.FileStream($portPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
      $fs.Dispose()
    } catch { $forceOffline = $true }
  }
  $finalSc = if ($forceOffline) { 128 } else { $sc }
  [PSCustomObject]@{Name=$p.Name;PrinterStatus=$finalSc;JobCount=$jc} | ConvertTo-Json -Compress
}
`
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

/**
 * If the printer status bit-field indicates a condition that should abort job
 * verification, return a specific reason string. Returns null if verification
 * should continue (printer is fine or in a transient state).
 */
export function printerStatusToAbortReason(code: number): string | null {
  if (code & PS.PAPER_OUT) return 'paper_out'
  if (code & PS.PAPER_JAM) return 'paper_jam'
  if (code & PS.DOOR_OPEN) return 'needs_attention'
  if (code & PS.OUT_OF_MEMORY) return 'needs_attention'
  if (code & PS.NO_TONER) return 'needs_attention'
  if (code & PS.USER_INTERVENTION) return 'needs_attention'
  if (code & PS.OFFLINE) return 'offline'
  if (code & PS.NOT_AVAILABLE) return 'offline'
  // Generic ERROR flag without a more specific one doesn't abort —
  // the job status bits are more authoritative for generic errors.
  return null
}

const BAD_JOB_LABELS = new Set(['Error', 'PaperOut', 'UserIntervention', 'Paused', 'Offline'])

// A job that never reaches Printing state within this window is considered stalled.
// Covers sleep, power-off, and driver zombie states — the job may show any status
// (Spooling, Normal/0, or nothing) depending on when Windows detects the disconnect.
const STALLED_IN_SPOOLER_MS = 20_000

export async function waitForJobCompletion(
  printerName: string,
  jobId: number,
  options: WaitForJobOptions,
  getJobsFn: (name: string) => Promise<PrintJob[]> = getJobs,
  getStatusFn: (name: string) => Promise<PrinterStatus> = getStatus
): Promise<JobWaitResult> {
  if (!isWindows()) return { verified: true }

  const deadline = Date.now() + options.timeoutMs
  let lastLabels: string[] = []
  let firstSeenAt: number | null = null
  let everSeenPrinting = false

  while (Date.now() < deadline) {
    const jobs = await getJobsFn(printerName)
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

    // Check printer-level status for conditions the job bits may not reflect
    // (e.g. Canon SELPHY reports paper-out via PrinterStatus, not job status).
    const printerStatus = await getStatusFn(printerName)
    const printerReason = printerStatusToAbortReason(printerStatus.rawStatusCode)
    if (printerReason) {
      loggingService.log(
        'WARN',
        'Printer',
        `Job ${jobId}: printer reports ${printerReason} (status code ${printerStatus.rawStatusCode}), aborting verification`
      )
      return { verified: false, reason: printerReason, lastLabels }
    }

    // Track whether the job has ever reached Printing state.
    if (lastLabels.includes('Printing')) {
      everSeenPrinting = true
    }

    // Early abort: job exists but has never reached Printing within the stall window.
    // Triggers regardless of what status bits are set — covers Spooling, Normal (0),
    // and any other non-Printing state (e.g. printer powered off after job submission).
    if (!everSeenPrinting) {
      if (firstSeenAt === null) {
        firstSeenAt = Date.now()
      } else if (Date.now() - firstSeenAt >= STALLED_IN_SPOOLER_MS) {
        loggingService.log(
          'WARN',
          'Printer',
          `Job ${jobId} stalled for ${STALLED_IN_SPOOLER_MS / 1000}s without reaching Printing (labels: [${lastLabels.join(', ')}]) — aborting early`
        )
        return { verified: false, reason: 'stalled_in_spooler', lastLabels }
      }
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
