import { BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import * as loggingService from './loggingService'
import * as statusService from './printerStatusService'
import * as spooler from './printerSpooler'

export interface PrinterInfo {
  name: string
  displayName: string
  description: string
}

export interface PrinterAvailability {
  available: boolean
  status: string // 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error' | 'not_found'
  detail?: string
  rawStatusCode?: number
  specificReason?: string // e.g. 'paper_out', 'paper_jam', 'offline' — more actionable than status
}

export interface CheckAvailabilityOptions {
  preflightTimeoutMs: number
  pollIntervalMs?: number
}

export interface PrintOptions {
  printerName: string
  imageDataUrl: string
  copies: number
  colorMode: 'color' | 'grayscale'
  paperSize: string
  margins: { top: number; right: number; bottom: number; left: number }
  sessionId?: string
  verificationTimeoutMs?: number
  verificationPollIntervalMs?: number
}

export interface PrintResult {
  success: boolean
  verified: boolean
  jobId?: number
  reason?: string
  error?: string
}

/**
 * Get all printers installed on the OS.
 * Must be called from a window's webContents context.
 */
export async function getPrinters(mainWindow: BrowserWindow): Promise<PrinterInfo[]> {
  const printers = await mainWindow.webContents.getPrintersAsync()
  loggingService.log('INFO', 'Printer', `Enumerated ${printers.length} printer(s)`)
  return printers.map((p) => ({
    name: p.name,
    displayName: p.displayName || p.name,
    description: p.description || ''
  }))
}

/**
 * Check if a specific printer is available/online.
 * Uses the Windows print spooler via printerStatusService and applies a
 * warming-up patience window so sleeping USB printers get a chance to wake.
 */
export async function checkPrinterAvailability(
  mainWindow: BrowserWindow,
  printerName: string,
  options: CheckAvailabilityOptions
): Promise<PrinterAvailability> {
  // First verify the printer exists in the OS list at all.
  const printers = await mainWindow.webContents.getPrintersAsync()
  const printer = printers.find((p) => p.name === printerName)
  if (!printer) {
    loggingService.log('WARN', 'Printer', `Printer "${printerName}" not found`)
    return { available: false, status: 'not_found' }
  }

  // Delegate to the status service with the patience window.
  const status = await statusService.waitForReady(printerName, {
    timeoutMs: options.preflightTimeoutMs,
    pollIntervalMs: options.pollIntervalMs ?? 500
  })

  const available = status.state === 'ready' || status.state === 'busy'
  loggingService.log(
    available ? 'INFO' : 'WARN',
    'Printer',
    `checkAvailability("${printerName}") → ${status.state} (${status.detail})`
  )
  return {
    available,
    status: status.state,
    detail: status.detail,
    rawStatusCode: status.rawStatusCode,
    specificReason: statusService.printerStatusToAbortReason(status.rawStatusCode) ?? undefined
  }
}

export async function print(options: PrintOptions): Promise<PrintResult> {
  const {
    printerName,
    imageDataUrl,
    copies,
    colorMode,
    paperSize,
    margins,
    sessionId = randomUUID(),
    verificationTimeoutMs = 90_000,
    verificationPollIntervalMs = 2_000
  } = options

  try {
    const queueBefore = await statusService.getJobs(printerName)
    const queueBeforeIds = new Set(queueBefore.map((j) => j.id))

    const documentName = `openphotobooth-${sessionId}`
    loggingService.log(
      'INFO',
      'Printer',
      `Sending print job to "${printerName}" (docName=${documentName}, copies=${copies})`
    )

    const spoolerResult = await spooler.submitToSpooler({
      printerName,
      imageDataUrl,
      documentName,
      copies,
      colorMode,
      paperSize,
      margins
    })

    if (!spoolerResult.success) {
      loggingService.log(
        'ERROR',
        'Printer',
        `Spooler rejected job on "${printerName}": ${spoolerResult.reason}`
      )
      return { success: false, verified: false, reason: spoolerResult.reason || 'spooler_rejected' }
    }

    const jobId = await findNewJob(printerName, queueBeforeIds, documentName)

    if (jobId === null) {
      loggingService.log(
        'WARN',
        'Printer',
        'No new job appeared in queue after submit; returning unverifiable success'
      )
      return { success: true, verified: false, reason: 'unverifiable' }
    }

    loggingService.log('INFO', 'Printer', `Tracking job ${jobId} for verification`)

    const waitResult = await statusService.waitForJobCompletion(printerName, jobId, {
      timeoutMs: verificationTimeoutMs,
      pollIntervalMs: verificationPollIntervalMs
    })

    if (waitResult.verified) {
      loggingService.log('INFO', 'Printer', `Job ${jobId} verified complete`)
      return { success: true, verified: true, jobId }
    }

    const reason = waitResult.verified === false ? waitResult.reason : 'unknown'
    loggingService.log('ERROR', 'Printer', `Job ${jobId} verification failed: ${reason}`)
    return { success: false, verified: false, jobId, reason }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    loggingService.log('ERROR', 'Printer', `Print error: ${msg}`)
    return { success: false, verified: false, error: msg, reason: 'exception' }
  }
}

async function findNewJob(
  printerName: string,
  queueBeforeIds: Set<number>,
  documentName: string
): Promise<number | null> {
  const deadline = Date.now() + 500
  while (Date.now() < deadline) {
    const jobs = await statusService.getJobs(printerName)
    const candidates = jobs.filter((j) => !queueBeforeIds.has(j.id))
    if (candidates.length === 1) return candidates[0].id
    if (candidates.length > 1) {
      const byName = candidates.find((j) => j.documentName === documentName)
      if (byName) {
        loggingService.log(
          'WARN',
          'Printer',
          `findNewJob: multiple new jobs (${candidates.length}), matched by docName → ${byName.id}`
        )
        return byName.id
      }
      loggingService.log(
        'WARN',
        'Printer',
        `findNewJob: multiple new jobs and no docName match, taking first`
      )
      return candidates[0].id
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  return null
}
