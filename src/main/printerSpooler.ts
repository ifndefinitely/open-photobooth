import { BrowserWindow, WebContentsPrintOptions } from 'electron'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { randomUUID } from 'crypto'
import * as loggingService from './loggingService'

export interface SpoolerSubmission {
  printerName: string
  imageDataUrl: string
  documentName: string
  copies: number
  colorMode: 'color' | 'grayscale'
  paperSize: string
  margins: { top: number; right: number; bottom: number; left: number }
}

export interface SpoolerResult {
  success: boolean
  reason?: string
}

const mediaSizes: Record<string, { width: number; height: number }> = {
  '4x6': { width: 101600, height: 152400 },
  '5x7': { width: 127000, height: 177800 },
  letter: { width: 215900, height: 279400 },
  a6: { width: 105000, height: 148000 }
}

export async function submitToSpooler(submission: SpoolerSubmission): Promise<SpoolerResult> {
  const { printerName, imageDataUrl, documentName, copies, colorMode, paperSize, margins } =
    submission

  let printWindow: BrowserWindow | null = null
  let tempHtmlPath: string | null = null

  try {
    printWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1800,
      webPreferences: {
        sandbox: true,
        contextIsolation: true
      }
    })

    // Strip everything except alphanumeric and hyphens before interpolating into HTML.
    const safeDocName = documentName.replace(/[^a-zA-Z0-9-]/g, '')

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeDocName}</title>
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
    // Writing to a temp file and using loadFile() avoids the limit; the base64
    // image inside the loaded document's <img src> is not subject to the cap.
    tempHtmlPath = path.join(os.tmpdir(), `open-photobooth-print-${randomUUID()}.html`)
    await fs.writeFile(tempHtmlPath, html, 'utf-8')
    await printWindow.loadFile(tempHtmlPath)

    await printWindow.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const img = document.querySelector('img');
        if (img.complete) { resolve(); return; }
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
        setTimeout(() => reject(new Error('Image load timeout')), 10000);
      })
    `)

    const printOptions: WebContentsPrintOptions = {
      silent: true,
      deviceName: printerName,
      copies,
      color: colorMode === 'color'
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

    return await new Promise<SpoolerResult>((resolve) => {
      printWindow!.webContents.print(printOptions, (success, failureReason) => {
        if (success) {
          resolve({ success: true })
        } else {
          const reason = failureReason || 'unknown_failure'
          loggingService.log(
            'ERROR',
            'Printer',
            `webContents.print failed on "${printerName}": ${reason}`
          )
          resolve({ success: false, reason })
        }
      })
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    loggingService.log('ERROR', 'Printer', `Spooler error: ${msg}`)
    return { success: false, reason: msg }
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
