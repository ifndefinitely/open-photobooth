import { execFile } from 'child_process'
import { promisify } from 'util'
import * as loggingService from './loggingService'

const execFileAsync = promisify(execFile)

const EXEC_OPTS = { windowsHide: true, timeout: 15_000 }

export interface ResetResult {
  success: boolean
  printerStatus?: string
  error?: string
}

/**
 * Resets the Canon SELPHY (or any named printer) by:
 * 1. Clearing stuck print jobs
 * 2. Stopping and restarting the Windows Print Spooler service
 * 3. Re-checking the printer status
 *
 * Requires the app to be running with administrator privileges.
 */
export async function resetPrinter(printerName: string): Promise<ResetResult> {
  loggingService.log('INFO', 'PrinterReset', `Starting reset for "${printerName}"`)

  // Step 1: Clear stuck jobs (best-effort, non-fatal)
  try {
    const safeName = printerName.replace(/'/g, "''")
    await execFileAsync(
      'powershell',
      [
        '-NonInteractive',
        '-NoProfile',
        '-Command',
        `Get-PrintJob -PrinterName '${safeName}' -ErrorAction SilentlyContinue | Remove-PrintJob`
      ],
      EXEC_OPTS
    )
    loggingService.log('INFO', 'PrinterReset', 'Cleared stuck print jobs')
  } catch (err) {
    loggingService.log('WARN', 'PrinterReset', `Clear jobs failed (non-fatal): ${err}`)
  }

  // Step 2: Stop the spooler
  try {
    await execFileAsync('net', ['stop', 'Spooler', '/y'], EXEC_OPTS)
    loggingService.log('INFO', 'PrinterReset', 'Spooler stopped')
  } catch (err) {
    loggingService.log('ERROR', 'PrinterReset', `Failed to stop spooler: ${err}`)
    return { success: false, error: 'spooler_stop_failed' }
  }

  // Step 3: Start the spooler
  try {
    await execFileAsync('net', ['start', 'Spooler'], EXEC_OPTS)
    loggingService.log('INFO', 'PrinterReset', 'Spooler started')
  } catch (err) {
    loggingService.log('ERROR', 'PrinterReset', `Failed to start spooler: ${err}`)
    return { success: false, error: 'spooler_start_failed' }
  }

  // Step 4: Check printer status (best-effort)
  try {
    const safeName = printerName.replace(/'/g, "''")
    const { stdout } = await execFileAsync(
      'powershell',
      [
        '-NonInteractive',
        '-NoProfile',
        '-Command',
        `(Get-Printer -Name '${safeName}' -ErrorAction SilentlyContinue).PrinterStatus`
      ],
      EXEC_OPTS
    )
    const printerStatus = stdout.trim()
    loggingService.log('INFO', 'PrinterReset', `Reset complete. Printer status: ${printerStatus}`)
    return { success: true, printerStatus }
  } catch (err) {
    loggingService.log(
      'WARN',
      'PrinterReset',
      `Status check after reset failed (non-fatal): ${err}`
    )
    return { success: true }
  }
}
