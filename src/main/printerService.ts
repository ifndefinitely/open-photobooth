import { BrowserWindow, WebContentsPrintOptions } from 'electron'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { randomUUID } from 'crypto'
import * as loggingService from './loggingService'

export interface PrinterInfo {
  name: string
  displayName: string
  description: string
}

export interface PrinterAvailability {
  available: boolean
  status: string
}

export interface PrintOptions {
  printerName: string
  imageDataUrl: string
  copies: number
  colorMode: 'color' | 'grayscale'
  paperSize: string
  margins: { top: number; right: number; bottom: number; left: number }
}

export interface PrintResult {
  success: boolean
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
 * Returns within 3 seconds (or times out).
 */
export async function checkPrinterAvailability(
  mainWindow: BrowserWindow,
  printerName: string
): Promise<PrinterAvailability> {
  const timeoutMs = 3000

  const check = async (): Promise<PrinterAvailability> => {
    const printers = await mainWindow.webContents.getPrintersAsync()
    const printer = printers.find((p) => p.name === printerName)

    if (!printer) {
      loggingService.log('WARN', 'Printer', `Printer "${printerName}" not found`)
      return { available: false, status: 'not_found' }
    }

    // Electron doesn't expose a reliable status field — if the printer is in
    // the list, its drivers are loaded and it should be reachable.
    loggingService.log('INFO', 'Printer', `Printer "${printerName}" is available`)
    return { available: true, status: 'ready' }
  }

  return Promise.race([
    check(),
    new Promise<PrinterAvailability>((resolve) =>
      setTimeout(() => resolve({ available: false, status: 'timeout' }), timeoutMs)
    )
  ])
}

/**
 * Send a silent print job using a hidden BrowserWindow.
 * The image data URL is rendered in the hidden window, then printed.
 */
export async function print(options: PrintOptions): Promise<PrintResult> {
  const { printerName, imageDataUrl, copies, colorMode, paperSize, margins } = options

  let printWindow: BrowserWindow | null = null
  let tempHtmlPath: string | null = null

  try {
    // Create a hidden window to render the image for printing
    printWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1800,
      webPreferences: {
        sandbox: true,
        contextIsolation: true
      }
    })

    // Build HTML with the image sized to fill the page
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; }
      @media print {
        @page {
          margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        }
      }
      body {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <img src="${imageDataUrl}" />
  </body>
</html>`

    // Chromium rejects top-level data: URLs above ~2 MB with ERR_INVALID_URL.
    // A print-resolution strip image, base64-encoded and then URL-encoded,
    // easily exceeds that. Writing to a temp file and using loadFile() avoids
    // the limit; the base64 image inside the loaded document's <img src> is
    // not subject to the top-level navigation URL cap.
    tempHtmlPath = path.join(os.tmpdir(), `open-photobooth-print-${randomUUID()}.html`)
    await fs.writeFile(tempHtmlPath, html, 'utf-8')
    await printWindow.loadFile(tempHtmlPath)

    // Wait for image to load
    await printWindow.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const img = document.querySelector('img');
        if (img.complete) { resolve(); return; }
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
        setTimeout(() => reject(new Error('Image load timeout')), 10000);
      })
    `)

    // Build Electron print options
    const printOptions: WebContentsPrintOptions = {
      silent: true,
      deviceName: printerName,
      copies,
      color: colorMode === 'color'
    }

    // Map paper size strings to Electron media size format
    const mediaSizes: Record<string, { width: number; height: number }> = {
      '4x6': { width: 101600, height: 152400 }, // microns
      '5x7': { width: 127000, height: 177800 },
      letter: { width: 215900, height: 279400 },
      a6: { width: 105000, height: 148000 }
    }

    const mediaSize = mediaSizes[paperSize]
    if (mediaSize) {
      printOptions.pageSize = {
        width: mediaSize.width,
        height: mediaSize.height
      }
    }

    if (margins.top === 0 && margins.right === 0 && margins.bottom === 0 && margins.left === 0) {
      printOptions.margins = { marginType: 'none' }
    } else {
      printOptions.margins = {
        marginType: 'custom',
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right
      }
    }

    // Send the print job
    loggingService.log(
      'INFO',
      'Printer',
      `Sending print job to "${printerName}" (paper: ${paperSize}, copies: ${copies})`
    )
    const result = await new Promise<PrintResult>((resolve) => {
      printWindow!.webContents.print(printOptions, (success, failureReason) => {
        if (success) {
          loggingService.log('INFO', 'Printer', `Print job completed on "${printerName}"`)
          resolve({ success: true })
        } else {
          loggingService.log(
            'ERROR',
            'Printer',
            `Print job failed on "${printerName}": ${failureReason || 'Unknown'}`
          )
          resolve({ success: false, error: failureReason || 'Unknown print error' })
        }
      })
    })

    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    loggingService.log('ERROR', 'Printer', `Print error: ${msg}`)
    return {
      success: false,
      error: msg
    }
  } finally {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.close()
    }
    if (tempHtmlPath) {
      try {
        await fs.unlink(tempHtmlPath)
      } catch (cleanupError) {
        const msg = cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        loggingService.log('WARN', 'Printer', `Failed to clean up temp print file: ${msg}`)
      }
    }
  }
}
