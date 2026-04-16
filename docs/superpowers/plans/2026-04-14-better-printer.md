# Better Printer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Open Photobooth print pipeline reliable enough for all-day events by querying the Windows print spooler directly via PowerShell — both pre-flight and post-submit — with a clear error-recovery UX for the operator.

**Architecture:** A new main-process module `printerStatusService` wraps PowerShell via `child_process.spawn` to query `Get-Printer` and `Get-PrintJob`. `printerService` delegates availability checks to it and wraps `webContents.print()` with post-submit job-queue polling so success means paper dispensed, not merely spooler-accepted. A renderer status store polls every 10s on HomeScreen/Admin, driving a subtle `PrinterHealthPill`, a HomeScreen offline banner, and degraded capture modes (halt vs captureOnly). `usePrintJob` becomes a state machine with one silent retry, then surfaces a `PrinterErrorDialog` with [Retry] / [Skip — save to gallery] / [Open admin] options.

**Tech Stack:** Electron 39, React 19, TypeScript 5.9, Zustand 5, Vitest 3 + jsdom, electron-vite.

**Design spec:** [docs/superpowers/specs/2026-04-14-better-printer-design.md](../specs/2026-04-14-better-printer-design.md)

---

## File Structure

### New files

| File                                                                                      | Responsibility                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/printerStatusService.ts`                                                        | PowerShell wrapper: `getStatus`, `getJobs`, `waitForJobCompletion`. Non-Windows stub. Status-code and JobStatus bit-field decoders. |
| `src/renderer/src/stores/printerStatusStore.ts`                                           | Live printer health state for the renderer (state, detail, lastChecked, recent errors).                                             |
| `src/renderer/src/hooks/usePrinterStatusPolling.ts`                                       | 10s poll of `api.printer.getStatus()` while on `home`/`admin` screens. Paused elsewhere.                                            |
| `src/renderer/src/hooks/useCaptureAvailability.ts`                                        | Derives `{ allowCaptures, bannerMode }` from status + `offlineBehaviour`.                                                           |
| `src/renderer/src/components/PrinterHealthPill/PrinterHealthPill.tsx` + `.module.css`     | Bottom-right corner badge on HomeScreen. Hidden when green. PIN → dialog.                                                           |
| `src/renderer/src/components/PrinterHealthDialog/PrinterHealthDialog.tsx` + `.module.css` | Operator-only modal: live status, raw detail JSON, recent Printer error logs, refresh, close.                                       |
| `src/renderer/src/components/PrinterErrorDialog/PrinterErrorDialog.tsx` + `.module.css`   | Post-failure modal: plain-language reason + technical detail + [Retry] / [Skip] / [Admin].                                          |
| `src/renderer/src/bootstrap/logMirror.ts`                                                 | Renderer listener that mirrors main-process log entries to `console.debug`.                                                         |
| `tests/main/printerStatusService.test.ts`                                                 | Unit tests for status service (JSON parsing, state mapping, bit-field, warming-up polling).                                         |
| `tests/main/printerService.test.ts`                                                       | Unit tests for the refactored `print()` verification state machine with mocked status service.                                      |
| `tests/hooks/usePrintJob.test.ts`                                                         | State-machine tests for the refactored hook.                                                                                        |
| `tests/hooks/useCaptureAvailability.test.ts`                                              | Capture-mode derivation tests.                                                                                                      |
| `tests/i18n/completeness.test.ts`                                                         | Asserts every key in en.json also exists in nl.json.                                                                                |
| `docs/superpowers/acceptance/2026-04-14-better-printer.md`                                | Manual hardware acceptance checklist.                                                                                               |

### Modified files

| File                                                                                              | Change                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main/printerService.ts`                                                                      | `checkPrinterAvailability` delegates to status service with patience window; `print()` adds verification polling and extended `PrintResult`.                                   |
| `src/main/loggingService.ts`                                                                      | Add ring buffer, `getRecent(filter)`, and main→renderer mirror emitter.                                                                                                        |
| `src/main/ipcHandlers.ts`                                                                         | New handlers: `printer:get-status`, `logging:get-recent`.                                                                                                                      |
| `src/preload/index.ts` + `src/preload/index.d.ts`                                                 | Expose `printer.getStatus`, `logging.getRecent`, `logging.onMirror`, `__dev.setMockPrinterStatus` (dev-only). Updated `PrintResult` shape.                                     |
| `src/main/settingsService.ts`                                                                     | Add `printer.preflightTimeout`, `verificationTimeout`, `verificationPollInterval`, `autoRetryOnce`, `offlineBehaviour`, `healthPollInterval` to `SettingsSchema` + `DEFAULTS`. |
| `src/renderer/src/stores/printerSettingsStore.ts`                                                 | Matching state + setters for new keys.                                                                                                                                         |
| `src/renderer/src/hooks/useSettingsPersistence.ts`                                                | Mappings for new settings keys.                                                                                                                                                |
| `src/renderer/src/hooks/usePrintJob.ts`                                                           | Full rewrite as a state machine (preflighting → submitting → verifying → …).                                                                                                   |
| `src/renderer/src/screens/HomeScreen/HomeScreen.tsx` + `.module.css`                              | Mount pill, offline banner, disable Start in halt mode.                                                                                                                        |
| `src/renderer/src/screens/PrintScreen/PrintScreen.tsx` + `.module.css`                            | Dynamic messaging keyed to state, long-wait pacing, surfaces PrinterErrorDialog.                                                                                               |
| `src/renderer/src/screens/ReviewScreen/ReviewScreen.tsx`                                          | Save-only button swap when red + captureOnly; removes pre-print availability probe (moved to usePrintJob).                                                                     |
| `src/renderer/src/screens/ThankYouScreen/ThankYouScreen.tsx`                                      | Conditional "saved, not printed" variant based on stripStore flag.                                                                                                             |
| `src/renderer/src/stores/stripStore.ts`                                                           | Add `wasPrinted: boolean` flag to distinguish printed vs saved-only thank-you.                                                                                                 |
| `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.tsx` + `.module.css` | New "Reliability" subgroup with inputs for all new settings + live "Current status" row.                                                                                       |
| `src/renderer/src/i18n/en.json` + `src/renderer/src/i18n/nl.json`                                 | New keys (listed in Task 13).                                                                                                                                                  |
| `src/renderer/src/App.tsx` (or equivalent bootstrap)                                              | Wire `useSettingsPersistence` and mount log mirror listener.                                                                                                                   |
| `tests/setup.ts`                                                                                  | Update `printer.print` mock to include `verified: true` default; add stubs for `getStatus`, `getRecent`, `onMirror`.                                                           |

---

## Ground rules

- **Test-first for every task** — write the failing test, run it red, implement, run it green, commit.
- **One commit per task.** Keep commits atomic and explicit.
- **Conventional commit prefixes:** `feat`, `fix`, `refactor`, `test`, `chore`.
- **Dutch translations** go in the same commit as the English keys — no split translation debt.
- **No new screens** — the error/health dialogs are React modals mounted above the current screen.
- **Electron main code has no path aliases.** In test files under `tests/main/`, import main modules via relative paths: `import { getStatus } from '../../src/main/printerStatusService'`.
- **`@` alias** = `src/renderer/src` — use it only from tests under `tests/hooks/`, `tests/i18n/`, `tests/stores/`.
- **i18n completeness** — every new `en` key must ship with a `nl` translation in the same task.
- **Type safety** — when changing `PrintResult`, update every consumer and the `tests/setup.ts` mock in the same commit so CI stays green.

---

## Task 1: `printerStatusService` — PowerShell wrapper & status decoders

**Why first:** Every other story leans on this. BP.1 in the spec. This task also validates the assumption that `Get-Printer` alone can wake a sleeping SELPHY — defer actual hardware validation to the manual acceptance task but prepare the machinery here.

**Files:**

- Create: `src/main/printerStatusService.ts`
- Test: `tests/main/printerStatusService.test.ts`

### - [ ] Step 1.1: Write the failing test for JSON parsing + state mapping

Create `tests/main/printerStatusService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseGetPrinterOutput,
  parseGetJobsOutput,
  mapStatusCode,
  decodeJobStatus,
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
```

- [ ] Step 1.2: Run the test to verify it fails

Run: `npx vitest run tests/main/printerStatusService.test.ts`
Expected: FAIL — "Cannot find module '../../src/main/printerStatusService'"

- [ ] Step 1.3: Implement `printerStatusService` (pure functions only — no child_process yet)

Create `src/main/printerStatusService.ts`:

```ts
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
    const killer = setTimeout(() => {
      ps.kill()
      reject(new Error(`PowerShell timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    ps.stdout.on('data', (chunk) => (stdout += chunk.toString('utf-8')))
    ps.stderr.on('data', (chunk) => (stderr += chunk.toString('utf-8')))
    ps.on('error', (err) => {
      clearTimeout(killer)
      reject(err)
    })
    ps.on('close', (code) => {
      clearTimeout(killer)
      if (code !== 0) {
        reject(new Error(`PowerShell exited ${code}: ${stderr.trim() || 'unknown error'}`))
        return
      }
      resolve(stdout)
    })
  })
}

function quotePsArg(arg: string): string {
  // Single-quote for PowerShell, escape embedded single quotes by doubling
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
    if (latest.state === 'ready' || latest.state === 'busy') return latest
    if (latest.state === 'offline' || latest.state === 'error') return latest
    // warmingUp → wait and retry
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
```

- [ ] Step 1.4: Run tests, verify they pass

Run: `npx vitest run tests/main/printerStatusService.test.ts`
Expected: all suites PASS. If any fail because a symbol isn't exported, add the export (types `PrinterState`, `PrintJob`, etc. are already exported above).

- [ ] Step 1.5: Commit

```bash
git add src/main/printerStatusService.ts tests/main/printerStatusService.test.ts
git commit -m "feat(printer): add printerStatusService with PowerShell-backed status query"
```

---

## Task 2: Settings schema additions

**Why next:** Pure additive change. No other code depends on it, but later tasks read from these settings.

**Files:**

- Modify: `src/main/settingsService.ts`
- Modify: `src/renderer/src/stores/printerSettingsStore.ts`
- Modify: `src/renderer/src/hooks/useSettingsPersistence.ts`

### - [ ] Step 2.1: Write a failing test for the store defaults + setters

Create `tests/stores/printerSettingsStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

describe('printerSettingsStore — reliability settings', () => {
  beforeEach(() => {
    // Reset store state
    usePrinterSettingsStore.setState({
      preflightTimeout: 10,
      verificationTimeout: 90,
      verificationPollInterval: 2,
      autoRetryOnce: true,
      offlineBehaviour: 'captureOnly',
      healthPollInterval: 10
    })
  })

  it('exposes defaults for the new reliability settings', () => {
    const s = usePrinterSettingsStore.getState()
    expect(s.preflightTimeout).toBe(10)
    expect(s.verificationTimeout).toBe(90)
    expect(s.verificationPollInterval).toBe(2)
    expect(s.autoRetryOnce).toBe(true)
    expect(s.offlineBehaviour).toBe('captureOnly')
    expect(s.healthPollInterval).toBe(10)
  })

  it('setters update the respective fields', () => {
    const s = usePrinterSettingsStore.getState()
    s.setPreflightTimeout(15)
    s.setVerificationTimeout(120)
    s.setVerificationPollInterval(3)
    s.setAutoRetryOnce(false)
    s.setOfflineBehaviour('halt')
    s.setHealthPollInterval(30)

    const after = usePrinterSettingsStore.getState()
    expect(after.preflightTimeout).toBe(15)
    expect(after.verificationTimeout).toBe(120)
    expect(after.verificationPollInterval).toBe(3)
    expect(after.autoRetryOnce).toBe(false)
    expect(after.offlineBehaviour).toBe('halt')
    expect(after.healthPollInterval).toBe(30)
  })
})
```

- [ ] Step 2.2: Run the test, verify it fails

Run: `npx vitest run tests/stores/printerSettingsStore.test.ts`
Expected: FAIL — properties/setters not defined.

- [ ] Step 2.3: Extend `printerSettingsStore`

Edit `src/renderer/src/stores/printerSettingsStore.ts` — replace the file contents:

```ts
import { create } from 'zustand'

export type PaperSize = '4x6' | '5x7' | 'letter' | 'a6'
export type PrintQuality = 'draft' | 'normal' | 'high'
export type ColorMode = 'color' | 'grayscale'
export type OfflineBehaviour = 'halt' | 'captureOnly'

export interface PrintMargins {
  top: number
  right: number
  bottom: number
  left: number
}

interface PrinterSettingsState {
  printerName: string
  paperSize: PaperSize
  quality: PrintQuality
  colorMode: ColorMode
  margins: PrintMargins
  copies: number

  // Reliability settings
  preflightTimeout: number
  verificationTimeout: number
  verificationPollInterval: number
  autoRetryOnce: boolean
  offlineBehaviour: OfflineBehaviour
  healthPollInterval: number

  setPrinterName: (name: string) => void
  setPaperSize: (size: PaperSize) => void
  setQuality: (quality: PrintQuality) => void
  setColorMode: (mode: ColorMode) => void
  setMargins: (margins: PrintMargins) => void
  setCopies: (copies: number) => void

  setPreflightTimeout: (seconds: number) => void
  setVerificationTimeout: (seconds: number) => void
  setVerificationPollInterval: (seconds: number) => void
  setAutoRetryOnce: (value: boolean) => void
  setOfflineBehaviour: (mode: OfflineBehaviour) => void
  setHealthPollInterval: (seconds: number) => void
}

export const usePrinterSettingsStore = create<PrinterSettingsState>((set) => ({
  printerName: '',
  paperSize: '4x6',
  quality: 'high',
  colorMode: 'color',
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  copies: 1,

  preflightTimeout: 10,
  verificationTimeout: 90,
  verificationPollInterval: 2,
  autoRetryOnce: true,
  offlineBehaviour: 'captureOnly',
  healthPollInterval: 10,

  setPrinterName: (printerName) => set({ printerName }),
  setPaperSize: (paperSize) => set({ paperSize }),
  setQuality: (quality) => set({ quality }),
  setColorMode: (colorMode) => set({ colorMode }),
  setMargins: (margins) => set({ margins }),
  setCopies: (copies) => set({ copies: Math.max(1, Math.min(5, copies)) }),

  setPreflightTimeout: (v) => set({ preflightTimeout: Math.max(5, Math.min(30, v)) }),
  setVerificationTimeout: (v) => set({ verificationTimeout: Math.max(30, Math.min(180, v)) }),
  setVerificationPollInterval: (v) =>
    set({ verificationPollInterval: Math.max(1, Math.min(10, v)) }),
  setAutoRetryOnce: (autoRetryOnce) => set({ autoRetryOnce }),
  setOfflineBehaviour: (offlineBehaviour) => set({ offlineBehaviour }),
  setHealthPollInterval: (v) => set({ healthPollInterval: Math.max(5, Math.min(60, v)) })
}))
```

- [ ] Step 2.4: Extend `SettingsSchema` and `DEFAULTS` in `settingsService`

Edit `src/main/settingsService.ts`. In the `SettingsSchema` interface, locate the `printer` section (lines 26-33) and replace it with:

```ts
printer: {
  printerName: string
  paperSize: string
  quality: string
  colorMode: string
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  copies: number
  preflightTimeout: number
  verificationTimeout: number
  verificationPollInterval: number
  autoRetryOnce: boolean
  offlineBehaviour: 'halt' | 'captureOnly'
  healthPollInterval: number
}
```

Then locate `DEFAULTS.printer` (lines 89-96) and replace with:

```ts
  printer: {
    printerName: '',
    paperSize: '4x6',
    quality: 'high',
    colorMode: 'color',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    copies: 1,
    preflightTimeout: 10,
    verificationTimeout: 90,
    verificationPollInterval: 2,
    autoRetryOnce: true,
    offlineBehaviour: 'captureOnly',
    healthPollInterval: 10
  },
```

- [ ] Step 2.5: Add persistence mappings

Edit `src/renderer/src/hooks/useSettingsPersistence.ts`. In the imports, extend the type import:

```ts
import type {
  PaperSize,
  PrintQuality,
  ColorMode,
  PrintMargins,
  OfflineBehaviour
} from '@/stores/printerSettingsStore'
```

Then after the existing `printer.copies` mapping (around line 234), insert the new mappings before the closing of the printer section:

```ts
    {
      key: 'printer.preflightTimeout',
      get: () => printer.getState().preflightTimeout,
      set: (v) => printer.getState().setPreflightTimeout(v as number),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.preflightTimeout !== prev.preflightTimeout) cb()
        })
    },
    {
      key: 'printer.verificationTimeout',
      get: () => printer.getState().verificationTimeout,
      set: (v) => printer.getState().setVerificationTimeout(v as number),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.verificationTimeout !== prev.verificationTimeout) cb()
        })
    },
    {
      key: 'printer.verificationPollInterval',
      get: () => printer.getState().verificationPollInterval,
      set: (v) => printer.getState().setVerificationPollInterval(v as number),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.verificationPollInterval !== prev.verificationPollInterval) cb()
        })
    },
    {
      key: 'printer.autoRetryOnce',
      get: () => printer.getState().autoRetryOnce,
      set: (v) => printer.getState().setAutoRetryOnce(v as boolean),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.autoRetryOnce !== prev.autoRetryOnce) cb()
        })
    },
    {
      key: 'printer.offlineBehaviour',
      get: () => printer.getState().offlineBehaviour,
      set: (v) => printer.getState().setOfflineBehaviour(v as OfflineBehaviour),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.offlineBehaviour !== prev.offlineBehaviour) cb()
        })
    },
    {
      key: 'printer.healthPollInterval',
      get: () => printer.getState().healthPollInterval,
      set: (v) => printer.getState().setHealthPollInterval(v as number),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.healthPollInterval !== prev.healthPollInterval) cb()
        })
    },
```

- [ ] Step 2.6: Run tests, verify pass

Run: `npx vitest run tests/stores/printerSettingsStore.test.ts && npm run typecheck`
Expected: tests PASS, typecheck PASS.

- [ ] Step 2.7: Commit

```bash
git add src/main/settingsService.ts src/renderer/src/stores/printerSettingsStore.ts src/renderer/src/hooks/useSettingsPersistence.ts tests/stores/printerSettingsStore.test.ts
git commit -m "feat(settings): add printer reliability settings with defaults"
```

---

## Task 3: Refactor `checkPrinterAvailability` to use status service

**Why next:** Small, contained refactor. Unblocks PrinterSection admin UI and usePrintJob preflight.

**Files:**

- Modify: `src/main/printerService.ts`
- Test: `tests/main/printerService.test.ts` (new)

### - [ ] Step 3.1: Write a failing test for the new preflight behaviour

Create `tests/main/printerService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the status service BEFORE importing printerService
vi.mock('../../src/main/printerStatusService', () => ({
  getStatus: vi.fn(),
  waitForReady: vi.fn(),
  getJobs: vi.fn(),
  waitForJobCompletion: vi.fn()
}))

vi.mock('../../src/main/loggingService', () => ({
  log: vi.fn(),
  init: vi.fn(),
  getLogPath: vi.fn()
}))

import * as statusService from '../../src/main/printerStatusService'
import { checkPrinterAvailability } from '../../src/main/printerService'

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
  })

  it('returns unavailable when printer is not in the OS list', async () => {
    ;(mockWindow.webContents.getPrintersAsync as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const result = await checkPrinterAvailability(mockWindow, 'Missing Printer', {
      preflightTimeoutMs: 10_000
    })

    expect(result.available).toBe(false)
    expect(result.status).toBe('not_found')
  })
})
```

- [ ] Step 3.2: Run the test, verify it fails

Run: `npx vitest run tests/main/printerService.test.ts`
Expected: FAIL — the old `checkPrinterAvailability` signature doesn't accept `{ preflightTimeoutMs }` and doesn't call `statusService.waitForReady`.

- [ ] Step 3.3: Refactor `checkPrinterAvailability`

Edit `src/main/printerService.ts`. Add the import at the top:

```ts
import * as statusService from './printerStatusService'
```

Replace the `PrinterAvailability` interface (lines 14-17):

```ts
export interface PrinterAvailability {
  available: boolean
  status: string // 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error' | 'not_found' | 'timeout'
  detail?: string
  rawStatusCode?: number
}

export interface CheckAvailabilityOptions {
  preflightTimeoutMs: number
  pollIntervalMs?: number
}
```

Replace the `checkPrinterAvailability` function (lines 47-78) with:

```ts
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
    rawStatusCode: status.rawStatusCode
  }
}
```

- [ ] Step 3.4: Update the IPC handler to pass the new option

Edit `src/main/ipcHandlers.ts`. Replace the `printer:check-availability` handler (around line 30) with:

```ts
ipcMain.handle('printer:check-availability', async (_event, printerName: string) => {
  const preflightSeconds = settingsService.get('printer.preflightTimeout')
  const timeoutSec = typeof preflightSeconds === 'number' ? preflightSeconds : 10
  return checkPrinterAvailability(mainWindow, printerName, {
    preflightTimeoutMs: timeoutSec * 1000
  })
})
```

- [ ] Step 3.5: Run tests, verify they pass

Run: `npx vitest run tests/main/printerService.test.ts && npm run typecheck`
Expected: tests PASS, typecheck PASS.

- [ ] Step 3.6: Commit

```bash
git add src/main/printerService.ts src/main/ipcHandlers.ts tests/main/printerService.test.ts
git commit -m "refactor(printer): delegate availability check to status service with patience window"
```

---

## Task 4: Post-submit verification in `print()`

**Why next:** Depends on Task 1 (status service) and Task 3 (preflight refactor). This is the core of the design — we cannot trust Electron's callback, so we verify via the spool queue.

**Files:**

- Modify: `src/main/printerService.ts`
- Modify: `src/preload/index.ts` + `src/preload/index.d.ts`
- Modify: `tests/setup.ts` (update printer.print mock shape)
- Test: extend `tests/main/printerService.test.ts`

### - [ ] Step 4.1: Write failing tests for the verification flow

Append to `tests/main/printerService.test.ts` (inside the top-level `describe`, or add a new describe):

```ts
describe('print() — verification', () => {
  const baseOptions = {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns verified success when queue diff finds job and it drains cleanly', async () => {
    // Queue before: one pre-existing job
    vi.mocked(statusService.getJobs)
      .mockResolvedValueOnce([
        {
          id: 41,
          documentName: 'old',
          submittedTime: '',
          jobStatus: 16,
          jobStatusLabels: ['Printing']
        }
      ])
      // Queue after submit: pre-existing + new
      .mockResolvedValueOnce([
        {
          id: 41,
          documentName: 'old',
          submittedTime: '',
          jobStatus: 16,
          jobStatusLabels: ['Printing']
        },
        {
          id: 42,
          documentName: 'openphotobooth-abc123',
          submittedTime: '',
          jobStatus: 16,
          jobStatusLabels: ['Printing']
        }
      ])
    vi.mocked(statusService.waitForJobCompletion).mockResolvedValue({ verified: true })

    // Mock the internal webContents.print success via a seam — see implementation step
    const { print } = await import('../../src/main/printerService')
    const result = await print({ ...baseOptions, __testOverrides: { spoolerSuccess: true } })

    expect(result.success).toBe(true)
    expect(result.verified).toBe(true)
    expect(result.jobId).toBe(42)
    expect(result.reason).toBeUndefined()
  })

  it('returns unverifiable when queue diff finds no new job', async () => {
    vi.mocked(statusService.getJobs).mockResolvedValue([])
    vi.mocked(statusService.waitForJobCompletion).mockResolvedValue({ verified: true })

    const { print } = await import('../../src/main/printerService')
    const result = await print({ ...baseOptions, __testOverrides: { spoolerSuccess: true } })

    expect(result.success).toBe(true)
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('unverifiable')
  })

  it('returns unverified failure when waitForJobCompletion reports paper out', async () => {
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

    const { print } = await import('../../src/main/printerService')
    const result = await print({ ...baseOptions, __testOverrides: { spoolerSuccess: true } })

    expect(result.success).toBe(false)
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('paper_out')
    expect(result.jobId).toBe(42)
  })

  it('returns spooler failure when webContents.print itself fails', async () => {
    vi.mocked(statusService.getJobs).mockResolvedValue([])

    const { print } = await import('../../src/main/printerService')
    const result = await print({
      ...baseOptions,
      __testOverrides: { spoolerSuccess: false, spoolerReason: 'driver_error' }
    })

    expect(result.success).toBe(false)
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('driver_error')
  })
})
```

- [ ] Step 4.2: Run tests, verify they fail

Run: `npx vitest run tests/main/printerService.test.ts`
Expected: FAIL — `__testOverrides` is not a valid field, new PrintResult fields don't exist.

- [ ] Step 4.3: Extend `print()` with verification and test seam

Edit `src/main/printerService.ts`. Replace the `PrintOptions` and `PrintResult` interfaces:

```ts
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
  /** Test-only seam. Must not be set in production callers. */
  __testOverrides?: {
    spoolerSuccess: boolean
    spoolerReason?: string
  }
}

export interface PrintResult {
  success: boolean
  verified: boolean
  jobId?: number
  reason?: string
  error?: string
}
```

Replace the `print` function body (lines 84-231) with:

```ts
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
    verificationPollIntervalMs = 2_000,
    __testOverrides
  } = options

  // Snapshot the queue before submitting, so we can diff to find our job.
  const queueBefore = await statusService.getJobs(printerName)
  const queueBeforeIds = new Set(queueBefore.map((j) => j.id))
  const documentName = `openphotobooth-${sessionId}`

  let printWindow: BrowserWindow | null = null
  let tempHtmlPath: string | null = null

  try {
    // In test mode, skip the window/loadFile dance.
    if (!__testOverrides) {
      printWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1800,
        webPreferences: {
          sandbox: true,
          contextIsolation: true
        }
      })

      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${documentName}</title>
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
    }

    // Build Electron print options
    const mediaSizes: Record<string, { width: number; height: number }> = {
      '4x6': { width: 101600, height: 152400 },
      '5x7': { width: 127000, height: 177800 },
      letter: { width: 215900, height: 279400 },
      a6: { width: 105000, height: 148000 }
    }

    const mediaSize = mediaSizes[paperSize]
    const printOptions: WebContentsPrintOptions = {
      silent: true,
      deviceName: printerName,
      copies,
      color: colorMode === 'color'
    }
    if (mediaSize) {
      printOptions.pageSize = { width: mediaSize.width, height: mediaSize.height }
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

    loggingService.log(
      'INFO',
      'Printer',
      `Sending print job to "${printerName}" (docName=${documentName}, copies=${copies})`
    )

    // Either call webContents.print() or honour the test override.
    const spoolerResult: { success: boolean; reason?: string } = __testOverrides
      ? { success: __testOverrides.spoolerSuccess, reason: __testOverrides.spoolerReason }
      : await new Promise((resolve) => {
          printWindow!.webContents.print(printOptions, (success, failureReason) => {
            resolve({ success, reason: failureReason })
          })
        })

    if (!spoolerResult.success) {
      loggingService.log(
        'ERROR',
        'Printer',
        `Spooler rejected job on "${printerName}": ${spoolerResult.reason || 'unknown'}`
      )
      return {
        success: false,
        verified: false,
        reason: spoolerResult.reason || 'spooler_rejected'
      }
    }

    // Queue-diff: poll for up to 500ms to find the new job.
    const jobId = await findNewJob(printerName, queueBeforeIds, documentName)

    if (jobId === null) {
      // Zero new jobs — spooler accepted it but we can't prove it. Treat as
      // "probably succeeded" and mark unverifiable so the UI still navigates
      // to ThankYou but we log a warning.
      loggingService.log(
        'WARN',
        'Printer',
        `No new job appeared in queue after submit; returning unverifiable success`
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

    loggingService.log('ERROR', 'Printer', `Job ${jobId} verification failed: ${waitResult.reason}`)
    return {
      success: false,
      verified: false,
      jobId,
      reason: waitResult.reason
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    loggingService.log('ERROR', 'Printer', `Print error: ${msg}`)
    return { success: false, verified: false, error: msg, reason: 'exception' }
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
    // 0 candidates → wait 100ms and retry
    await new Promise((r) => setTimeout(r, 100))
  }
  return null
}
```

- [ ] Step 4.4: Update IPC handler to pass new options

Edit `src/main/ipcHandlers.ts`. Replace the `printer:print` handler (around line 34) with:

```ts
ipcMain.handle('printer:print', async (_event, options: PrintOptions) => {
  const verifyTimeout = settingsService.get('printer.verificationTimeout')
  const verifyInterval = settingsService.get('printer.verificationPollInterval')
  return print({
    ...options,
    verificationTimeoutMs: (typeof verifyTimeout === 'number' ? verifyTimeout : 90) * 1000,
    verificationPollIntervalMs: (typeof verifyInterval === 'number' ? verifyInterval : 2) * 1000
  })
})
```

- [ ] Step 4.5: Update preload + type declarations

Edit `src/preload/index.d.ts`. Replace `PrintOptions` and `PrintResult`:

```ts
export interface PrintOptions {
  printerName: string
  imageDataUrl: string
  copies: number
  colorMode: 'color' | 'grayscale'
  paperSize: string
  margins: { top: number; right: number; bottom: number; left: number }
  sessionId?: string
}

export interface PrintResult {
  success: boolean
  verified: boolean
  jobId?: number
  reason?: string
  error?: string
}
```

And extend `PrinterAvailability`:

```ts
export interface PrinterAvailability {
  available: boolean
  status: string
  detail?: string
  rawStatusCode?: number
}
```

Edit `src/preload/index.ts`. The `printer.print` wrapper doesn't need a change (it still forwards `options`), but we're fine as-is.

- [ ] Step 4.6: Update the test setup mock

Edit `tests/setup.ts`. Change the `printer.print` default mock to include `verified: true`:

```ts
print: vi.fn().mockResolvedValue({ success: true, verified: true })
```

And update `checkAvailability`:

```ts
checkAvailability: vi.fn().mockResolvedValue({
  available: true,
  status: 'ready',
  detail: 'Ready (code 3)',
  rawStatusCode: 3
})
```

- [ ] Step 4.7: Run all tests, verify pass

Run: `npx vitest run && npm run typecheck`
Expected: all PASS. If any existing consumer of `PrintResult` breaks typecheck, that's expected — we will fix usePrintJob in Task 11. For now, if typecheck fails in `usePrintJob.ts` only, that's the intended breakage to defer. **If any OTHER file fails typecheck, fix it here.**

If `usePrintJob.ts` blocks the typecheck, add a `// @ts-expect-error — refactored in Task 11` comment on the specific line that now errors. This is the ONLY allowed ts-expect-error in this plan, and Task 11 must remove it.

- [ ] Step 4.8: Commit

```bash
git add src/main/printerService.ts src/main/ipcHandlers.ts src/preload/index.d.ts tests/setup.ts tests/main/printerService.test.ts
git commit -m "feat(printer): verify prints via post-submit spooler polling"
```

---

## Task 5: IPC — `printer:get-status` and `logging:get-recent`

**Why next:** Renderer polling and health dialog need these endpoints. Also adds the main→renderer log mirror infrastructure.

**Files:**

- Modify: `src/main/loggingService.ts` (ring buffer + getRecent + mirror emitter)
- Modify: `src/main/ipcHandlers.ts` (new handlers)
- Modify: `src/preload/index.ts` + `src/preload/index.d.ts` (expose endpoints)
- Modify: `src/main/index.ts` (wire the log mirror to the mainWindow)
- Create: `src/renderer/src/bootstrap/logMirror.ts`
- Modify: `src/renderer/src/App.tsx` or entry point to install the mirror listener
- Modify: `tests/setup.ts` (stub new APIs)

### - [ ] Step 5.1: Write a failing test for the logging ring buffer

Create `tests/main/loggingService.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { log, getRecent, _resetForTest } from '../../src/main/loggingService'

describe('loggingService — getRecent', () => {
  beforeEach(() => {
    _resetForTest()
  })

  it('returns an empty array when no logs have been written', () => {
    expect(getRecent({ limit: 5 })).toEqual([])
  })

  it('returns recent log entries in reverse chronological order', () => {
    log('INFO', 'Printer', 'one')
    log('INFO', 'Printer', 'two')
    log('INFO', 'Printer', 'three')

    const entries = getRecent({ limit: 5 })
    expect(entries).toHaveLength(3)
    expect(entries[0].message).toBe('three')
    expect(entries[2].message).toBe('one')
  })

  it('filters by source', () => {
    log('INFO', 'Printer', 'p1')
    log('INFO', 'Camera', 'c1')
    log('INFO', 'Printer', 'p2')

    const entries = getRecent({ source: 'Printer', limit: 5 })
    expect(entries.map((e) => e.message)).toEqual(['p2', 'p1'])
  })

  it('filters by level', () => {
    log('INFO', 'Printer', 'info1')
    log('ERROR', 'Printer', 'err1')
    log('WARN', 'Printer', 'warn1')

    const entries = getRecent({ level: 'ERROR', limit: 5 })
    expect(entries.map((e) => e.message)).toEqual(['err1'])
  })

  it('caps the buffer at a fixed size and evicts oldest', () => {
    for (let i = 0; i < 600; i++) {
      log('INFO', 'Printer', `msg-${i}`)
    }
    const entries = getRecent({ limit: 1000 })
    // Default buffer is 500
    expect(entries).toHaveLength(500)
    expect(entries[0].message).toBe('msg-599')
    expect(entries[499].message).toBe('msg-100')
  })
})
```

- [ ] Step 5.2: Run tests, verify they fail

Run: `npx vitest run tests/main/loggingService.test.ts`
Expected: FAIL — `getRecent` and `_resetForTest` not exported.

- [ ] Step 5.3: Extend `loggingService` with ring buffer, getRecent, mirror

Edit `src/main/loggingService.ts`. Add after the existing imports:

```ts
import type { WebContents } from 'electron'
```

After the existing module state block (around line 23), add:

```ts
// ── Ring buffer for recent logs (read by admin UI) + main→renderer mirror ──

export interface LogEntry {
  timestamp: string
  level: LogLevel
  source: string
  message: string
}

const BUFFER_SIZE = 500
const buffer: LogEntry[] = []
let mirrorTarget: WebContents | null = null
let mirrorBuffered: LogEntry[] = []

export interface GetRecentOptions {
  limit: number
  source?: string
  level?: LogLevel
}
```

Replace the `log` function (around line 147) with:

```ts
export function log(level: LogLevel, source: string, message: string): void {
  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] [${level}] [${source}] ${message}\n`
  const structured: LogEntry = { timestamp, level, source, message }

  // Append to in-memory ring buffer (O(1) at the front)
  buffer.unshift(structured)
  if (buffer.length > BUFFER_SIZE) buffer.length = BUFFER_SIZE

  // Mirror to renderer (console.debug) — buffer until renderer attaches
  if (mirrorTarget && !mirrorTarget.isDestroyed()) {
    try {
      mirrorTarget.send('log:mirror', structured)
    } catch {
      // swallow
    }
  } else {
    mirrorBuffered.push(structured)
    if (mirrorBuffered.length > BUFFER_SIZE) mirrorBuffered.shift()
  }

  // Queue disk writes
  writeQueue = writeQueue.then(async () => {
    try {
      await checkDateRotation()
      await rotateIfNeeded()
      await appendFile(currentFilePath, entry, 'utf-8')
      currentFileSize += Buffer.byteLength(entry, 'utf-8')
    } catch (err) {
      console.error('[Logging] Failed to write log entry:', err)
      console.error('[Logging] Original entry:', entry.trim())
    }
  })
}
```

After `getLogPath`, add:

```ts
/** Return recent log entries in reverse chronological order. */
export function getRecent(options: GetRecentOptions): LogEntry[] {
  const out: LogEntry[] = []
  for (const entry of buffer) {
    if (options.source && entry.source !== options.source) continue
    if (options.level && entry.level !== options.level) continue
    out.push(entry)
    if (out.length >= options.limit) break
  }
  return out
}

/** Attach a WebContents as the renderer mirror target. Flushes any buffered entries. */
export function attachRendererMirror(target: WebContents): void {
  mirrorTarget = target
  const flush = mirrorBuffered
  mirrorBuffered = []
  for (const entry of flush) {
    if (target.isDestroyed()) break
    try {
      target.send('log:mirror', entry)
    } catch {
      // swallow
    }
  }
}

/** Testing helper — clears the ring buffer between unit tests. */
export function _resetForTest(): void {
  buffer.length = 0
  mirrorBuffered.length = 0
  mirrorTarget = null
}
```

- [ ] Step 5.4: Run logging tests, verify pass

Run: `npx vitest run tests/main/loggingService.test.ts`
Expected: all tests PASS.

- [ ] Step 5.5: Register `printer:get-status` and `logging:get-recent` IPC handlers

Edit `src/main/ipcHandlers.ts`. Extend the imports:

```ts
import { getPrinters, checkPrinterAvailability, print } from './printerService'
import type { PrintOptions } from './printerService'
import * as statusService from './printerStatusService'
```

And `loggingService` is already imported. At the bottom of `registerIpcHandlers`, add:

```ts
ipcMain.handle('printer:get-status', async (_event, printerName: string) => {
  return statusService.getStatus(printerName)
})

ipcMain.handle(
  'logging:get-recent',
  (_event, options: { limit: number; source?: string; level?: LogLevel }) => {
    return loggingService.getRecent(options)
  }
)
```

- [ ] Step 5.6: Attach renderer mirror once the main window is ready

Edit `src/main/index.ts`. After `registerIpcHandlers(mainWindow)` (around line 81), add:

```ts
loggingService.attachRendererMirror(mainWindow.webContents)
```

- [ ] Step 5.7: Expose the new APIs from preload

Edit `src/preload/index.ts`. Replace the `printer` block with:

```ts
  printer: {
    getPrinters: (): Promise<unknown[]> => ipcRenderer.invoke('printer:get-list'),
    checkAvailability: (printerName: string): Promise<unknown> =>
      ipcRenderer.invoke('printer:check-availability', printerName),
    print: (options: unknown): Promise<unknown> => ipcRenderer.invoke('printer:print', options),
    getStatus: (printerName: string): Promise<unknown> =>
      ipcRenderer.invoke('printer:get-status', printerName)
  },
```

Replace the `logging` block with:

```ts
  logging: {
    log: (level: string, source: string, message: string): Promise<void> =>
      ipcRenderer.invoke('logging:log', level, source, message),
    getLogPath: (): Promise<string> => ipcRenderer.invoke('logging:getLogPath'),
    getRecent: (options: {
      limit: number
      source?: string
      level?: string
    }): Promise<unknown[]> => ipcRenderer.invoke('logging:get-recent', options),
    onMirror: (handler: (entry: unknown) => void): (() => void) => {
      const listener = (_event: unknown, entry: unknown): void => handler(entry)
      ipcRenderer.on('log:mirror', listener)
      return () => ipcRenderer.removeListener('log:mirror', listener)
    }
  },
```

- [ ] Step 5.8: Update preload type declarations

Edit `src/preload/index.d.ts`. Extend `PrinterAPI`:

```ts
export type PrinterState = 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error'

export interface PrinterStatus {
  name: string
  state: PrinterState
  rawStatusCode: number
  jobCount: number
  detail: string
  queriedAt: number
}

export interface PrinterAPI {
  getPrinters: () => Promise<PrinterInfo[]>
  checkAvailability: (printerName: string) => Promise<PrinterAvailability>
  print: (options: PrintOptions) => Promise<PrintResult>
  getStatus: (printerName: string) => Promise<PrinterStatus>
}
```

Extend `LoggingAPI`:

```ts
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  source: string
  message: string
}

export interface GetRecentOptions {
  limit: number
  source?: string
  level?: LogLevel
}

export interface LoggingAPI {
  log: (level: string, source: string, message: string) => Promise<void>
  getLogPath: () => Promise<string>
  getRecent: (options: GetRecentOptions) => Promise<LogEntry[]>
  onMirror: (handler: (entry: LogEntry) => void) => () => void
}
```

- [ ] Step 5.9: Create renderer log mirror listener

Create `src/renderer/src/bootstrap/logMirror.ts`:

```ts
import type { LogEntry } from '../../../preload'

/**
 * Mirrors main-process log entries to the renderer DevTools console.
 * Enabled only in development — production devtools aren't available anyway,
 * and we don't want to pay the IPC cost at runtime.
 */
export function installLogMirror(): () => void {
  if (!import.meta.env.DEV) return () => {}

  const unsubscribe = window.api.logging.onMirror((entry: LogEntry) => {
    const prefix = `[MAIN] [${entry.level}] [${entry.source}]`
    switch (entry.level) {
      case 'ERROR':
        console.error(prefix, entry.message)
        break
      case 'WARN':
        console.warn(prefix, entry.message)
        break
      default:
        console.debug(prefix, entry.message)
    }
  })

  return unsubscribe
}
```

- [ ] Step 5.10: Mount the mirror in the renderer entry point

Edit `src/renderer/src/App.tsx`. Find the top-level `App` function and add the mirror install effect. First, read the file to find the exact location.

Run: `cat src/renderer/src/App.tsx`

Then, in the `App` component, add after the existing hooks (or at the top of the function body):

```tsx
import { installLogMirror } from './bootstrap/logMirror'
// ... in the App function body:
useEffect(() => {
  return installLogMirror()
}, [])
```

If `useEffect` is not already imported, add it to the React import line.

- [ ] Step 5.11: Update `tests/setup.ts` with new API stubs

Edit `tests/setup.ts`. In the `mockApi.printer` block, add:

```ts
getStatus: vi.fn().mockResolvedValue({
  name: '',
  state: 'ready',
  rawStatusCode: 3,
  jobCount: 0,
  detail: 'Ready (code 3)',
  queriedAt: Date.now()
})
```

In the `mockApi.logging` block, add:

```ts
    getRecent: vi.fn().mockResolvedValue([]),
    onMirror: vi.fn().mockReturnValue(() => {})
```

- [ ] Step 5.12: Run full test suite and typecheck

Run: `npx vitest run && npm run typecheck`
Expected: all tests PASS, typecheck PASS.

- [ ] Step 5.13: Commit

```bash
git add src/main/loggingService.ts src/main/ipcHandlers.ts src/main/index.ts src/preload/index.ts src/preload/index.d.ts src/renderer/src/bootstrap/logMirror.ts src/renderer/src/App.tsx tests/setup.ts tests/main/loggingService.test.ts
git commit -m "feat(ipc): add printer status and log buffer endpoints with renderer mirror"
```

---

## Task 6: `printerStatusStore` + `usePrinterStatusPolling`

**Why next:** Gives the renderer a live picture of the printer. Used by pill, banner, admin live row, and useCaptureAvailability.

**Files:**

- Create: `src/renderer/src/stores/printerStatusStore.ts`
- Create: `src/renderer/src/hooks/usePrinterStatusPolling.ts`
- Test: `tests/hooks/usePrinterStatusPolling.test.ts`

### - [ ] Step 6.1: Write a failing test for the polling hook

Create `tests/hooks/usePrinterStatusPolling.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrinterStatusPolling } from '@/hooks/usePrinterStatusPolling'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useNavigationStore } from '@/stores/navigationStore'

describe('usePrinterStatusPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    usePrinterStatusStore.getState().reset()
    usePrinterSettingsStore.setState({
      printerName: 'Canon SELPHY CP1500',
      healthPollInterval: 10
    })
    useNavigationStore.setState({ currentScreen: 'home', previousScreen: null })
    vi.mocked(window.api.printer.getStatus).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'ready',
      rawStatusCode: 3,
      jobCount: 0,
      detail: 'Ready (code 3)',
      queriedAt: Date.now()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls on mount and stores the result', async () => {
    renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(window.api.printer.getStatus).toHaveBeenCalledWith('Canon SELPHY CP1500')
    expect(usePrinterStatusStore.getState().status?.state).toBe('ready')
  })

  it('polls again after healthPollInterval seconds', async () => {
    renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(window.api.printer.getStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(window.api.printer.getStatus).toHaveBeenCalledTimes(2)
  })

  it('does not poll while on a non-idle screen (e.g. session)', async () => {
    useNavigationStore.setState({ currentScreen: 'session', previousScreen: null })
    renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(window.api.printer.getStatus).not.toHaveBeenCalled()
  })

  it('does not call getStatus when no printer is configured', async () => {
    usePrinterSettingsStore.setState({ printerName: '' })
    renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(window.api.printer.getStatus).not.toHaveBeenCalled()
  })

  it('records a recent error when status is error-level', async () => {
    vi.mocked(window.api.printer.getStatus).mockResolvedValueOnce({
      name: 'Canon SELPHY CP1500',
      state: 'error',
      rawStatusCode: 9,
      jobCount: 0,
      detail: 'Paper out (code 9)',
      queriedAt: Date.now()
    })
    renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const store = usePrinterStatusStore.getState()
    expect(store.status?.state).toBe('error')
    expect(store.recentErrors).toHaveLength(1)
    expect(store.recentErrors[0].detail).toContain('Paper out')
  })
})
```

- [ ] Step 6.2: Run the test, verify it fails

Run: `npx vitest run tests/hooks/usePrinterStatusPolling.test.ts`
Expected: FAIL — module paths don't resolve yet.

- [ ] Step 6.3: Create the status store

Create `src/renderer/src/stores/printerStatusStore.ts`:

```ts
import { create } from 'zustand'
import type { PrinterStatus } from '../../../preload'

export interface RecentErrorEntry {
  detail: string
  rawStatusCode: number
  at: number
}

interface PrinterStatusState {
  status: PrinterStatus | null
  recentErrors: RecentErrorEntry[]
  lastCheckedAt: number | null

  setStatus: (status: PrinterStatus) => void
  reset: () => void
}

const MAX_RECENT_ERRORS = 5

export const usePrinterStatusStore = create<PrinterStatusState>((set) => ({
  status: null,
  recentErrors: [],
  lastCheckedAt: null,

  setStatus: (status) =>
    set((state) => {
      const isError = status.state === 'error' || status.state === 'offline'
      const recent = isError
        ? [
            { detail: status.detail, rawStatusCode: status.rawStatusCode, at: status.queriedAt },
            ...state.recentErrors
          ].slice(0, MAX_RECENT_ERRORS)
        : state.recentErrors
      return {
        status,
        recentErrors: recent,
        lastCheckedAt: status.queriedAt
      }
    }),

  reset: () => set({ status: null, recentErrors: [], lastCheckedAt: null })
}))
```

- [ ] Step 6.4: Create the polling hook

Create `src/renderer/src/hooks/usePrinterStatusPolling.ts`:

```ts
import { useEffect, useRef } from 'react'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useNavigationStore } from '@/stores/navigationStore'
import type { PrinterStatus } from '../../../preload'

const POLLING_SCREENS = new Set(['home', 'admin'])

/**
 * Polls the main-process printer status at `healthPollInterval` seconds while
 * the app is on the HomeScreen or AdminScreen. Pauses on all other screens
 * (session/review/print) so polling never interferes with an active print job.
 */
export function usePrinterStatusPolling(): void {
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const intervalSeconds = usePrinterSettingsStore((s) => s.healthPollInterval)
  const currentScreen = useNavigationStore((s) => s.currentScreen)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!POLLING_SCREENS.has(currentScreen)) {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    if (!printerName) return

    let cancelled = false
    const poll = async (): Promise<void> => {
      try {
        const status = (await window.api.printer.getStatus(printerName)) as PrinterStatus
        if (!cancelled) setStatus(status)
      } catch {
        // Swallow — next poll retries.
      }
    }

    poll()
    timerRef.current = setInterval(poll, intervalSeconds * 1000)

    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [printerName, intervalSeconds, currentScreen, setStatus])
}
```

- [ ] Step 6.5: Run the test, verify it passes

Run: `npx vitest run tests/hooks/usePrinterStatusPolling.test.ts`
Expected: all PASS.

- [ ] Step 6.6: Mount the polling hook in App.tsx

Edit `src/renderer/src/App.tsx`. Add the import and call the hook alongside existing top-level hooks (same place where `useSettingsPersistence` is called):

```tsx
import { usePrinterStatusPolling } from './hooks/usePrinterStatusPolling'
// ... inside App():
usePrinterStatusPolling()
```

- [ ] Step 6.7: Commit

```bash
git add src/renderer/src/stores/printerStatusStore.ts src/renderer/src/hooks/usePrinterStatusPolling.ts src/renderer/src/App.tsx tests/hooks/usePrinterStatusPolling.test.ts
git commit -m "feat(renderer): add printer status store and polling hook"
```

---

## Task 7: `useCaptureAvailability` hook

**Files:**

- Create: `src/renderer/src/hooks/useCaptureAvailability.ts`
- Test: `tests/hooks/useCaptureAvailability.test.ts`

### - [ ] Step 7.1: Write a failing test

Create `tests/hooks/useCaptureAvailability.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

const setStatus = (state: 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error'): void => {
  usePrinterStatusStore.setState({
    status: {
      name: 'test',
      state,
      rawStatusCode: 0,
      jobCount: 0,
      detail: 'test',
      queriedAt: Date.now()
    },
    recentErrors: [],
    lastCheckedAt: Date.now()
  })
}

describe('useCaptureAvailability', () => {
  beforeEach(() => {
    usePrinterStatusStore.getState().reset()
    usePrinterSettingsStore.setState({ offlineBehaviour: 'captureOnly' })
  })

  it('allows captures with no banner when status is ready', () => {
    setStatus('ready')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })

  it('allows captures with no banner when status is busy', () => {
    setStatus('busy')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })

  it('allows captures with no banner when status is warmingUp', () => {
    setStatus('warmingUp')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })

  it('blocks captures + red banner in halt mode when offline', () => {
    usePrinterSettingsStore.setState({ offlineBehaviour: 'halt' })
    setStatus('offline')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(false)
    expect(result.current.bannerMode).toBe('halt')
  })

  it('allows captures + amber banner in captureOnly mode when offline', () => {
    usePrinterSettingsStore.setState({ offlineBehaviour: 'captureOnly' })
    setStatus('offline')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('captureOnly')
  })

  it('allows captures + amber banner in captureOnly mode when error', () => {
    usePrinterSettingsStore.setState({ offlineBehaviour: 'captureOnly' })
    setStatus('error')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('captureOnly')
  })

  it('treats null status (never polled) as allow-no-banner', () => {
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })
})
```

- [ ] Step 7.2: Run the test, verify it fails

Run: `npx vitest run tests/hooks/useCaptureAvailability.test.ts`
Expected: FAIL — module not found.

- [ ] Step 7.3: Implement the hook

Create `src/renderer/src/hooks/useCaptureAvailability.ts`:

```ts
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

export type BannerMode = 'none' | 'halt' | 'captureOnly'

interface CaptureAvailability {
  allowCaptures: boolean
  bannerMode: BannerMode
}

/**
 * Derives whether new photo sessions are allowed and which (if any) banner to
 * show, based on current printer health and the admin's offlineBehaviour setting.
 *
 * Green/busy/warmingUp → captures allowed, no banner.
 * Red (offline/error):
 *   - halt mode → captures blocked, red banner
 *   - captureOnly mode → captures allowed, amber banner, save-only path
 */
export function useCaptureAvailability(): CaptureAvailability {
  const status = usePrinterStatusStore((s) => s.status)
  const offlineBehaviour = usePrinterSettingsStore((s) => s.offlineBehaviour)

  if (!status) {
    return { allowCaptures: true, bannerMode: 'none' }
  }

  const isRed = status.state === 'offline' || status.state === 'error'

  if (!isRed) {
    return { allowCaptures: true, bannerMode: 'none' }
  }

  if (offlineBehaviour === 'halt') {
    return { allowCaptures: false, bannerMode: 'halt' }
  }

  return { allowCaptures: true, bannerMode: 'captureOnly' }
}
```

- [ ] Step 7.4: Run tests, verify pass

Run: `npx vitest run tests/hooks/useCaptureAvailability.test.ts`
Expected: all PASS.

- [ ] Step 7.5: Commit

```bash
git add src/renderer/src/hooks/useCaptureAvailability.ts tests/hooks/useCaptureAvailability.test.ts
git commit -m "feat(renderer): add useCaptureAvailability hook for banner + start-button logic"
```

---

## Task 8: `PrinterHealthPill` + `PrinterHealthDialog`

**Files:**

- Create: `src/renderer/src/components/PrinterHealthPill/PrinterHealthPill.tsx`
- Create: `src/renderer/src/components/PrinterHealthPill/PrinterHealthPill.module.css`
- Create: `src/renderer/src/components/PrinterHealthDialog/PrinterHealthDialog.tsx`
- Create: `src/renderer/src/components/PrinterHealthDialog/PrinterHealthDialog.module.css`

### - [ ] Step 8.1: Create `PrinterHealthPill.tsx`

```tsx
import { useState } from 'react'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import PinDialog from '@/components/PinDialog/PinDialog'
import PrinterHealthDialog from '@/components/PrinterHealthDialog/PrinterHealthDialog'
import styles from './PrinterHealthPill.module.css'

type PillMode = 'hidden' | 'warmingUp' | 'red'

function PrinterHealthPill(): React.JSX.Element | null {
  const status = usePrinterStatusStore((s) => s.status)
  const [stage, setStage] = useState<'pill' | 'pin' | 'dialog'>('pill')

  const mode: PillMode =
    !status || status.state === 'ready' || status.state === 'busy'
      ? 'hidden'
      : status.state === 'warmingUp'
        ? 'warmingUp'
        : 'red'

  if (mode === 'hidden') return null

  return (
    <>
      <button
        className={`${styles.pill} ${mode === 'red' ? styles.red : styles.amber}`}
        onClick={() => setStage('pin')}
        aria-label="Printer status"
        type="button"
      >
        <span className={styles.icon} aria-hidden="true">
          {mode === 'red' ? '✕' : '!'}
        </span>
      </button>
      {stage === 'pin' && (
        <PinDialog onSuccess={() => setStage('dialog')} onCancel={() => setStage('pill')} />
      )}
      {stage === 'dialog' && <PrinterHealthDialog onClose={() => setStage('pill')} />}
    </>
  )
}

export default PrinterHealthPill
```

### - [ ] Step 8.2: Create `PrinterHealthPill.module.css`

```css
.pill {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.amber {
  background: #f59f00;
  color: #000;
}

.red {
  background: #d9534f;
  color: #fff;
}

.icon {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
```

### - [ ] Step 8.3: Create `PrinterHealthDialog.tsx`

```tsx
import { useEffect, useState, useCallback } from 'react'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import type { LogEntry, PrinterStatus } from '../../../../preload'
import styles from './PrinterHealthDialog.module.css'

interface Props {
  onClose: () => void
}

function PrinterHealthDialog({ onClose }: Props): React.JSX.Element {
  const status = usePrinterStatusStore((s) => s.status)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadLogs = useCallback(async () => {
    const entries = (await window.api.logging.getRecent({
      limit: 5,
      source: 'Printer',
      level: 'ERROR'
    })) as LogEntry[]
    setRecentLogs(entries)
  }, [])

  const refresh = useCallback(async () => {
    if (!printerName) return
    setRefreshing(true)
    try {
      const fresh = (await window.api.printer.getStatus(printerName)) as PrinterStatus
      setStatus(fresh)
      await loadLogs()
    } finally {
      setRefreshing(false)
    }
  }, [printerName, setStatus, loadLogs])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <h2 className={styles.title}>Printer Health</h2>

        <div className={styles.statusRow}>
          <span className={`${styles.badge} ${styles[`badge_${status?.state ?? 'unknown'}`]}`}>
            {status?.state ?? 'unknown'}
          </span>
          <span className={styles.detail}>{status?.detail ?? 'No data yet'}</span>
        </div>

        <h3 className={styles.subtitle}>Raw detail</h3>
        <pre className={styles.raw}>{JSON.stringify(status, null, 2)}</pre>

        <h3 className={styles.subtitle}>Recent errors (last 5)</h3>
        {recentLogs.length === 0 ? (
          <p className={styles.noLogs}>No recent printer errors logged.</p>
        ) : (
          <ul className={styles.logList}>
            {recentLogs.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`} className={styles.logEntry}>
                <span className={styles.logTimestamp}>{entry.timestamp}</span>
                <span className={styles.logMessage}>{entry.message}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <button className={styles.button} onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className={styles.buttonPrimary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrinterHealthDialog
```

### - [ ] Step 8.4: Create `PrinterHealthDialog.module.css`

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.dialog {
  background: #1a1a1a;
  color: #fff;
  width: min(720px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
}

.title {
  font-size: 24px;
  margin: 0 0 16px;
}

.subtitle {
  font-size: 16px;
  margin: 24px 0 8px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.statusRow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 14px;
}

.badge_ready {
  background: #2ea043;
  color: #fff;
}

.badge_busy {
  background: #2ea043;
  color: #fff;
}

.badge_warmingUp {
  background: #f59f00;
  color: #000;
}

.badge_offline {
  background: #d9534f;
  color: #fff;
}

.badge_error {
  background: #d9534f;
  color: #fff;
}

.badge_unknown {
  background: #555;
  color: #fff;
}

.detail {
  font-family: monospace;
  color: #ccc;
}

.raw {
  background: #000;
  color: #9fef00;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
}

.logList {
  list-style: none;
  padding: 0;
  margin: 0;
}

.logEntry {
  padding: 8px 0;
  border-bottom: 1px solid #333;
  font-family: monospace;
  font-size: 12px;
}

.logTimestamp {
  color: #888;
  margin-right: 12px;
}

.logMessage {
  color: #eee;
}

.noLogs {
  color: #888;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.button,
.buttonPrimary {
  min-height: 48px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
}

.button {
  background: #333;
  color: #fff;
}

.buttonPrimary {
  background: #2ea043;
  color: #fff;
}
```

- [ ] Step 8.5: Typecheck

Run: `npm run typecheck`
Expected: PASS. (No new tests for the pill/dialog — these are presentational. Acceptance is via manual test in Task 13.)

- [ ] Step 8.6: Commit

```bash
git add src/renderer/src/components/PrinterHealthPill src/renderer/src/components/PrinterHealthDialog
git commit -m "feat(ui): add PrinterHealthPill and PrinterHealthDialog"
```

---

## Task 9: HomeScreen — mount pill, offline banner, halt-mode Start button

**Files:**

- Modify: `src/renderer/src/screens/HomeScreen/HomeScreen.tsx`
- Modify: `src/renderer/src/screens/HomeScreen/HomeScreen.module.css`

### - [ ] Step 9.1: Update HomeScreen to mount pill, banner, and read useCaptureAvailability

Edit `src/renderer/src/screens/HomeScreen/HomeScreen.tsx`. Replace the entire file:

```tsx
import { useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'
import { useAdminGesture } from '@/hooks/useAdminGesture'
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
import { useT } from '@/i18n'
import PinDialog from '@/components/PinDialog/PinDialog'
import CameraPreview from '@/components/CameraPreview/CameraPreview'
import PrinterHealthPill from '@/components/PrinterHealthPill/PrinterHealthPill'
import styles from './HomeScreen.module.css'

function HomeScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const cameraError = useCameraStore((s) => s.error)
  const cameraStream = useCameraStore((s) => s.stream)
  const cameraReady = cameraStream !== null && !cameraError
  const { allowCaptures, bannerMode } = useCaptureAvailability()
  const [showPinDialog, setShowPinDialog] = useState(false)
  const { handleTap } = useAdminGesture(() => setShowPinDialog(true))
  const t = useT()

  const startDisabled = !cameraReady || !allowCaptures

  return (
    <div className={styles.container}>
      {bannerMode !== 'none' && (
        <div
          className={`${styles.banner} ${
            bannerMode === 'halt' ? styles.bannerHalt : styles.bannerCaptureOnly
          }`}
        >
          {bannerMode === 'halt'
            ? t('home.printer.unavailable.halt')
            : t('home.printer.unavailable.captureOnly')}
        </div>
      )}
      <div className={styles.adminGestureTarget} onClick={handleTap} aria-hidden="true" />
      <CameraPreview className={styles.preview} />
      <div className={styles.buttonArea}>
        <button
          className={styles.takePhotosButton}
          onClick={() => navigateTo('session')}
          disabled={startDisabled}
        >
          {t('home.takePhotos')}
        </button>
      </div>
      {bannerMode === 'none' ? null : null}
      <PrinterHealthPill />
      {showPinDialog && (
        <PinDialog
          onSuccess={() => {
            setShowPinDialog(false)
            navigateTo('admin')
          }}
          onCancel={() => setShowPinDialog(false)}
        />
      )}
    </div>
  )
}

export default HomeScreen
```

Note: the pill is hidden when it's not in a warning/error state, so mounting it unconditionally is fine. We hide the pill when the banner is visible by adding a conditional in the CSS — but simpler: the banner + pill are allowed to coexist since they communicate different things (banner = guest-facing message, pill = operator escape hatch). **Revisit: spec says pill is hidden when banner is visible.** To honour that, conditionally render:

Replace `<PrinterHealthPill />` with:

```tsx
{
  bannerMode === 'none' && <PrinterHealthPill />
}
```

- [ ] Step 9.2: Add banner styles

Edit `src/renderer/src/screens/HomeScreen/HomeScreen.module.css`. Append:

```css
.banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  z-index: 90;
  text-align: center;
  padding: 0 24px;
}

.bannerHalt {
  background: #d9534f;
  color: #fff;
}

.bannerCaptureOnly {
  background: #f59f00;
  color: #000;
}
```

- [ ] Step 9.3: Typecheck

Run: `npm run typecheck`
Expected: PASS.

- [ ] Step 9.4: Commit

```bash
git add src/renderer/src/screens/HomeScreen
git commit -m "feat(home): add offline banner, health pill, and halt-mode start disable"
```

---

## Task 10: ReviewScreen — save-only path when captureOnly+red

**Files:**

- Modify: `src/renderer/src/screens/ReviewScreen/ReviewScreen.tsx`
- Modify: `src/renderer/src/stores/stripStore.ts` (add `wasPrinted` flag)

### - [ ] Step 10.1: Add `wasPrinted` flag to stripStore

Edit `src/renderer/src/stores/stripStore.ts`. In the `StripState` interface, add:

```ts
  wasPrinted: boolean
  setWasPrinted: (value: boolean) => void
```

In the create body (around where other setters are defined), add:

```ts
  wasPrinted: true,
  setWasPrinted: (wasPrinted) => set({ wasPrinted }),
```

And in `resetStrip`, ensure it resets:

```ts
// inside resetStrip — existing reset block — add:
wasPrinted: true
```

Read the file first to make sure you insert the fields in the right place and don't break existing structure:

Run: `cat src/renderer/src/stores/stripStore.ts`

- [ ] Step 10.2: Update ReviewScreen

Edit `src/renderer/src/screens/ReviewScreen/ReviewScreen.tsx`. Add the imports:

```tsx
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
```

And add near the top of the component body (after other store reads):

```tsx
const { bannerMode } = useCaptureAvailability()
const setWasPrinted = useStripStore((s) => s.setWasPrinted)
```

Replace `handlePrintPress` with a simpler version that trusts the preflight check inside `usePrintJob` (the pre-print availability probe here is redundant with the new state-machine flow and will be removed in Task 11). For now, leave `handlePrintPress` alone but **add** a new `handleSavePress`:

```tsx
const handleSavePress = useCallback(() => {
  setWasPrinted(false)
  navigateTo('thankyou')
}, [navigateTo, setWasPrinted])
```

Add the button swap. Find the primary action button block and replace it with:

```tsx
{
  bannerMode === 'captureOnly' ? (
    <button
      className={styles.buttonPrimary}
      onClick={handleSavePress}
      disabled={isComposing || !!compositionError}
    >
      {t('review.button.saveOnly')}
    </button>
  ) : (
    <button
      className={styles.buttonPrimary}
      onClick={handlePrintPress}
      disabled={isComposing || !!compositionError || isCheckingPrinter}
    >
      {isCheckingPrinter ? t('review.checkingPrinter') : t('review.print')}
    </button>
  )
}
```

Also add `setWasPrinted(true)` to the "print" confirmation path, in the `onConfirm` of the `print` confirmation dialog:

```tsx
          onConfirm={() => {
            setConfirmAction(null)
            setWasPrinted(true)
            navigateTo('print')
          }}
```

- [ ] Step 10.3: Typecheck

Run: `npm run typecheck`
Expected: PASS.

- [ ] Step 10.4: Commit

```bash
git add src/renderer/src/stores/stripStore.ts src/renderer/src/screens/ReviewScreen/ReviewScreen.tsx
git commit -m "feat(review): save-only path for captureOnly offline mode"
```

---

## Task 11: `usePrintJob` state machine + `PrinterErrorDialog`

**Why this is big:** It's the heart of the retry/error UX and is the most complex renderer change. It replaces the old `usePrintJob` entirely and introduces the `PrinterErrorDialog`.

> **Hardware finding (2026-04-16):** The Canon SELPHY CP1500 reports `PrinterStatus: 0` ("ready")
> even when in deep sleep. The spec assumed code 21 (PowerSave) — that assumption was wrong.
> The pre-flight patience window for `warmingUp` is therefore useless for detecting sleep.
> Verification is the actual safety net: it catches phantom success via job-queue polling.
>
> An early-abort heuristic was added to `waitForJobCompletion`: if a job is stuck in
> `Spooling` for 20s without ever transitioning to `Printing`, it returns
> `reason: 'stalled_in_spooler'` instead of waiting the full 90s verification timeout.
> A healthy SELPHY transitions Spooling → Printing within a few seconds.
>
> **Operator guidance:** When the `PrinterErrorDialog` shows `stalled_in_spooler` or
> `verification_timeout`, the user-facing message should say something like
> "The printer may be asleep — press and hold the power button to wake it."
> This is more actionable than a generic timeout message. The i18n key
> `printer.error.stalledInSpooler` is added for this.

**Files:**

- Rewrite: `src/renderer/src/hooks/usePrintJob.ts`
- Create: `src/renderer/src/components/PrinterErrorDialog/PrinterErrorDialog.tsx` + `.module.css`
- Test: `tests/hooks/usePrintJob.test.ts`
- Modify: `src/renderer/src/screens/PrintScreen/PrintScreen.tsx` to wire the state and dialog
- Modify: `src/renderer/src/screens/PrintScreen/PrintScreen.module.css` for new visuals

### - [ ] Step 11.1: Write failing tests for the state machine

Create `tests/hooks/usePrintJob.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePrintJob } from '@/hooks/usePrintJob'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

const mockSheet = {
  dataUrl: 'data:image/png;base64,mock',
  blob: new Blob(['mock'], { type: 'image/png' }),
  width: 100,
  height: 100
}

function primeStores(): void {
  useStripStore.setState({
    selectedFilter: 'none',
    stripResult: mockSheet,
    printSheetResult: mockSheet,
    isComposing: false,
    compositionError: null,
    wasPrinted: true
  })
  usePrinterSettingsStore.setState({
    printerName: 'Canon SELPHY CP1500',
    paperSize: '4x6',
    quality: 'high',
    colorMode: 'color',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    copies: 1,
    preflightTimeout: 10,
    verificationTimeout: 90,
    verificationPollInterval: 2,
    autoRetryOnce: true,
    offlineBehaviour: 'captureOnly',
    healthPollInterval: 10
  })
}

describe('usePrintJob — state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    primeStores()
  })

  it('transitions idle → preflighting → submitting → verifying → succeeded on happy path', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: true,
      verified: true,
      jobId: 42
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('succeeded')
    })
    expect(window.api.printer.checkAvailability).toHaveBeenCalledWith('Canon SELPHY CP1500')
    expect(window.api.printer.print).toHaveBeenCalledTimes(1)
  })

  it('transitions to unverifiable and then succeeded when verification returns unverifiable', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: true,
      verified: false,
      reason: 'unverifiable'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      // Unverifiable is a terminal success — UI proceeds to ThankYou
      expect(result.current.state).toBe('succeeded')
    })
  })

  it('auto-retries once on verified failure when autoRetryOnce is true', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print)
      .mockResolvedValueOnce({ success: false, verified: false, reason: 'paper_out' })
      .mockResolvedValueOnce({ success: true, verified: true, jobId: 43 })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('succeeded')
    })
    expect(window.api.printer.print).toHaveBeenCalledTimes(2)
  })

  it('escalates to failed_hard after second verified failure', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: false,
      verified: false,
      reason: 'paper_out'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('failed_hard')
    })
    expect(result.current.error?.reason).toBe('paper_out')
    expect(window.api.printer.print).toHaveBeenCalledTimes(2)
  })

  it('does not auto-retry when autoRetryOnce is false', async () => {
    usePrinterSettingsStore.setState({ autoRetryOnce: false })
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: false,
      verified: false,
      reason: 'paper_out'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('failed_hard')
    })
    expect(window.api.printer.print).toHaveBeenCalledTimes(1)
  })

  it('moves to failed_hard when preflight says printer is offline', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: false,
      status: 'offline'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('failed_hard')
    })
    expect(result.current.error?.reason).toBe('offline')
    expect(window.api.printer.print).not.toHaveBeenCalled()
  })

  it('manual retry from failed_hard restarts the flow', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print)
      .mockResolvedValueOnce({ success: false, verified: false, reason: 'paper_out' })
      .mockResolvedValueOnce({ success: false, verified: false, reason: 'paper_out' })
      .mockResolvedValueOnce({ success: true, verified: true, jobId: 50 })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('failed_hard')
    })

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.state).toBe('succeeded')
    })
  })
})
```

- [ ] Step 11.2: Run the test to verify failure

Run: `npx vitest run tests/hooks/usePrintJob.test.ts`
Expected: FAIL — the current hook returns `{ status, error, retry }` not `{ state, error, retry }` and has no preflight.

- [ ] Step 11.3: Rewrite `usePrintJob`

Replace `src/renderer/src/hooks/usePrintJob.ts` entirely:

```ts
import { useReducer, useEffect, useCallback, useRef } from 'react'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { logger } from '@/services/loggerService'

export type PrintJobState =
  | 'preflighting'
  | 'submitting'
  | 'verifying'
  | 'retrying'
  | 'succeeded'
  | 'failed_hard'

export interface PrintJobError {
  reason: string
  detail?: string
  jobId?: number
}

interface State {
  state: PrintJobState
  error: PrintJobError | null
  attempt: number // 1 = first try, 2 = auto-retry
}

type Action =
  | { type: 'start_preflight' }
  | { type: 'start_submit' }
  | { type: 'start_verify' }
  | { type: 'succeed' }
  | { type: 'soft_fail'; error: PrintJobError }
  | { type: 'hard_fail'; error: PrintJobError }
  | { type: 'start_retry' }
  | { type: 'manual_retry' }

const initial: State = { state: 'preflighting', error: null, attempt: 1 }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start_preflight':
      return { ...state, state: 'preflighting', error: null }
    case 'start_submit':
      return { ...state, state: 'submitting' }
    case 'start_verify':
      return { ...state, state: 'verifying' }
    case 'succeed':
      return { ...state, state: 'succeeded', error: null }
    case 'soft_fail':
      return { ...state, state: 'retrying', error: action.error, attempt: state.attempt + 1 }
    case 'hard_fail':
      return { ...state, state: 'failed_hard', error: action.error }
    case 'start_retry':
      return { ...state, state: 'preflighting', error: null }
    case 'manual_retry':
      return { state: 'preflighting', error: null, attempt: 1 }
  }
}

export interface PrintJobResult {
  state: PrintJobState
  error: PrintJobError | null
  retry: () => void
}

export function usePrintJob(): PrintJobResult {
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const paperSize = usePrinterSettingsStore((s) => s.paperSize)
  const colorMode = usePrinterSettingsStore((s) => s.colorMode)
  const margins = usePrinterSettingsStore((s) => s.margins)
  const copies = usePrinterSettingsStore((s) => s.copies)
  const autoRetryOnce = usePrinterSettingsStore((s) => s.autoRetryOnce)

  const [state, dispatch] = useReducer(reducer, initial)
  const runningRef = useRef(false)
  const attemptRef = useRef(1)

  const runOnce = useCallback(
    async (currentAttempt: number): Promise<void> => {
      if (!printerName) {
        dispatch({
          type: 'hard_fail',
          error: { reason: 'no_printer', detail: 'No printer configured' }
        })
        return
      }
      if (!printSheetResult?.dataUrl) {
        dispatch({
          type: 'hard_fail',
          error: { reason: 'no_sheet', detail: 'Print sheet not ready' }
        })
        return
      }

      logger.info('Printer', `Print attempt ${currentAttempt} — preflight`)
      dispatch({ type: 'start_preflight' })
      const availability = await window.api.printer.checkAvailability(printerName)
      if (!availability.available) {
        const err: PrintJobError = {
          reason: availability.status,
          detail: availability.detail ?? `Printer status: ${availability.status}`
        }
        if (currentAttempt === 1 && autoRetryOnce) {
          logger.warn('Printer', `Preflight failed, auto-retrying: ${availability.status}`)
          dispatch({ type: 'soft_fail', error: err })
          return
        }
        logger.error('Printer', `Preflight failed (hard): ${availability.status}`)
        dispatch({ type: 'hard_fail', error: err })
        return
      }

      dispatch({ type: 'start_submit' })
      logger.info('Printer', `Preflight OK, submitting print job`)

      const sheet = printSheetResult.dataUrl
      const result = await window.api.printer.print({
        printerName,
        imageDataUrl: sheet,
        copies,
        colorMode,
        paperSize,
        margins
      })

      dispatch({ type: 'start_verify' })

      // Treat unverifiable as success — UI should still navigate away.
      if (result.success) {
        logger.info(
          'Printer',
          `Print verified=${result.verified}${result.jobId ? ` jobId=${result.jobId}` : ''}`
        )
        dispatch({ type: 'succeed' })
        return
      }

      const err: PrintJobError = {
        reason: result.reason ?? 'unknown',
        detail: result.error ?? result.reason ?? 'Print failed',
        jobId: result.jobId
      }
      if (currentAttempt === 1 && autoRetryOnce) {
        logger.warn('Printer', `Print failed (reason=${err.reason}), auto-retrying once`)
        dispatch({ type: 'soft_fail', error: err })
        return
      }
      logger.error('Printer', `Print failed (hard, reason=${err.reason})`)
      dispatch({ type: 'hard_fail', error: err })
    },
    [printerName, printSheetResult, paperSize, colorMode, margins, copies, autoRetryOnce]
  )

  const run = useCallback(async (): Promise<void> => {
    if (runningRef.current) return
    runningRef.current = true
    try {
      attemptRef.current = 1
      await runOnce(1)
      // Check the reducer outcome via a ref pattern is hard — instead, we chain
      // retries inline. If the first attempt soft-failed, runOnce dispatched
      // 'soft_fail' which already incremented attempt to 2. Drive retry here.
    } finally {
      runningRef.current = false
    }
  }, [runOnce])

  // Effect to drive auto-retry when state === 'retrying'
  useEffect(() => {
    if (state.state !== 'retrying') return
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      attemptRef.current = state.attempt
      dispatch({ type: 'start_retry' })
      await runOnce(state.attempt)
    }, 750) // brief overlay delay for the "retrying" UI
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state.state, state.attempt, runOnce])

  // Run once on mount
  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retry = useCallback(() => {
    dispatch({ type: 'manual_retry' })
    run()
  }, [run])

  return { state: state.state, error: state.error, retry }
}
```

- [ ] Step 11.4: Run the usePrintJob tests, verify pass

Run: `npx vitest run tests/hooks/usePrintJob.test.ts`
Expected: all PASS. If a test times out because the state machine took longer than expected, bump the waitFor timeout inside the test file, don't slow down the retry delay.

- [ ] Step 11.5: Create `PrinterErrorDialog`

Create `src/renderer/src/components/PrinterErrorDialog/PrinterErrorDialog.tsx`:

```tsx
import { useState } from 'react'
import { useT } from '@/i18n'
import { useNavigationStore } from '@/stores/navigationStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useStripStore } from '@/stores/stripStore'
import PinDialog from '@/components/PinDialog/PinDialog'
import type { PrintJobError } from '@/hooks/usePrintJob'
import styles from './PrinterErrorDialog.module.css'

interface Props {
  error: PrintJobError
  onRetry: () => void
}

const REASON_KEY_MAP: Record<string, string> = {
  paper_out: 'printer.error.paperOut',
  job_error: 'printer.error.needsAttention',
  needs_attention: 'printer.error.needsAttention',
  paused: 'printer.error.needsAttention',
  offline: 'printer.error.offline',
  error: 'printer.error.offline',
  not_found: 'printer.error.offline',
  verification_timeout: 'printer.error.verificationTimeout',
  stalled_in_spooler: 'printer.error.stalledInSpooler',
  no_printer: 'printer.error.offline'
}

function PrinterErrorDialog({ error, onRetry }: Props): React.JSX.Element {
  const t = useT()
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const setWasPrinted = useStripStore((s) => s.setWasPrinted)
  const [pinOpen, setPinOpen] = useState(false)

  const reasonKey = REASON_KEY_MAP[error.reason] ?? 'printer.error.needsAttention'
  const plainReason = t(reasonKey)

  const handleSkip = (): void => {
    setWasPrinted(false)
    navigateTo('thankyou')
  }

  return (
    <>
      <div className={styles.backdrop} role="dialog" aria-modal="true">
        <div className={styles.dialog}>
          <h1 className={styles.title}>{t('printer.error.title')}</h1>
          <p className={styles.reason}>{plainReason}</p>

          <details className={styles.details}>
            <summary className={styles.summary}>Technical detail</summary>
            <div className={styles.detailContent}>
              <div>Reason code: {error.reason}</div>
              {error.jobId !== undefined && <div>Job ID: {error.jobId}</div>}
              {error.detail && <div>Detail: {error.detail}</div>}
              {printerName && <div>Printer: {printerName}</div>}
              <div>Time: {new Date().toISOString()}</div>
            </div>
          </details>

          <div className={styles.actions}>
            <button className={styles.buttonPrimary} onClick={onRetry}>
              {t('printer.error.buttonRetry')}
            </button>
            <button className={styles.buttonSecondary} onClick={handleSkip}>
              {t('printer.error.buttonSkip')}
            </button>
            <button className={styles.buttonTertiary} onClick={() => setPinOpen(true)}>
              {t('printer.error.buttonAdmin')}
            </button>
          </div>
        </div>
      </div>
      {pinOpen && (
        <PinDialog
          onSuccess={() => {
            setPinOpen(false)
            navigateTo('admin')
          }}
          onCancel={() => setPinOpen(false)}
        />
      )}
    </>
  )
}

export default PrinterErrorDialog
```

- [ ] Step 11.6: Create `PrinterErrorDialog.module.css`

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.dialog {
  background: #1a1a1a;
  color: #fff;
  width: min(640px, 92vw);
  padding: 40px;
  border-radius: 12px;
  text-align: center;
}

.title {
  font-size: 32px;
  margin: 0 0 16px;
}

.reason {
  font-size: 22px;
  color: #ffd166;
  margin: 0 0 24px;
}

.details {
  text-align: left;
  background: #000;
  color: #9fef00;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  margin-bottom: 24px;
}

.summary {
  cursor: pointer;
  color: #9fef00;
}

.detailContent {
  margin-top: 8px;
}

.detailContent div {
  margin: 4px 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.buttonPrimary,
.buttonSecondary,
.buttonTertiary {
  min-height: 64px;
  font-size: 20px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.buttonPrimary {
  background: #2ea043;
  color: #fff;
}

.buttonSecondary {
  background: #f59f00;
  color: #000;
}

.buttonTertiary {
  background: #444;
  color: #fff;
}
```

- [ ] Step 11.7: Rewrite `PrintScreen` to render the new state machine and dialog

Edit `src/renderer/src/screens/PrintScreen/PrintScreen.tsx`. Replace the file:

```tsx
import { useEffect } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { usePrintJob } from '@/hooks/usePrintJob'
import PrinterErrorDialog from '@/components/PrinterErrorDialog/PrinterErrorDialog'
import { useT } from '@/i18n'
import styles from './PrintScreen.module.css'

function PrintScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const verificationTimeout = usePrinterSettingsStore((s) => s.verificationTimeout)

  const { state, error, retry } = usePrintJob()
  const t = useT()

  // Auto-advance to thank-you on success
  useEffect(() => {
    if (state !== 'succeeded') return
    const timer = setTimeout(() => navigateTo('thankyou'), 1500)
    return () => clearTimeout(timer)
  }, [state, navigateTo])

  const messageKey =
    state === 'preflighting'
      ? 'printer.status.warmingUp'
      : state === 'submitting'
        ? 'print.printing'
        : state === 'verifying'
          ? 'printer.status.printing'
          : state === 'retrying'
            ? 'printer.status.retrying'
            : state === 'succeeded'
              ? 'print.success'
              : 'printer.error.title'

  const progressPercent = Math.min(
    100,
    state === 'preflighting'
      ? 15
      : state === 'submitting'
        ? 35
        : state === 'verifying'
          ? 75
          : state === 'retrying'
            ? 25
            : state === 'succeeded'
              ? 100
              : 0
  )

  return (
    <div className={styles.container}>
      <div className={styles.glowRing}>
        {printSheetResult?.dataUrl && (
          <img
            className={styles.stripPreview}
            src={printSheetResult.dataUrl}
            alt="Your photo strip"
          />
        )}
      </div>

      <div className={styles.messageArea}>
        <p className={styles.message}>{t(messageKey)}</p>
        <div className={styles.progressBar} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <p className={styles.timingHint}>
          {t('print.stillPrinting')} ({verificationTimeout}s max)
        </p>
      </div>

      {state === 'failed_hard' && error && <PrinterErrorDialog error={error} onRetry={retry} />}
    </div>
  )
}

export default PrintScreen
```

- [ ] Step 11.8: Add new progress-bar styles

Append to `src/renderer/src/screens/PrintScreen/PrintScreen.module.css`:

```css
.progressBar {
  width: min(480px, 80vw);
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  overflow: hidden;
  margin: 16px auto 8px;
}

.progressFill {
  height: 100%;
  background: #2ea043;
  transition: width 0.4s ease;
}

.timingHint {
  font-size: 14px;
  color: #888;
  margin: 8px 0 0;
  text-align: center;
}
```

- [ ] Step 11.9: Remove the now-dead error branch from `PrintScreen`

The previous error branch used `t('error.title')` and friends. It's gone in the rewrite above. **Also remove** the old "error.printFailed" / "error.contactOwner" / "error.debugDetails" / "error.tryAgain" strings from translation files? No — other screens still reference them, so leave them alone. Just confirm with:

Run: `npx eslint src/renderer/src/screens/PrintScreen/PrintScreen.tsx`
Expected: clean.

- [ ] Step 11.10: Run all hook + screen tests

Run: `npx vitest run tests/hooks/usePrintJob.test.ts && npm run typecheck`
Expected: all PASS. If the ts-expect-error placeholder from Task 4 was added to usePrintJob, it's been removed by the full rewrite.

- [ ] Step 11.11: Commit

```bash
git add src/renderer/src/hooks/usePrintJob.ts src/renderer/src/components/PrinterErrorDialog src/renderer/src/screens/PrintScreen tests/hooks/usePrintJob.test.ts
git commit -m "feat(print): state machine with auto-retry and operator error dialog"
```

---

## Task 12: PrinterSection "Reliability" subgroup + live status row

**Files:**

- Modify: `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.tsx`
- Modify: `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.module.css`

### - [ ] Step 12.1: Add admin UI for the new settings + live status

Edit `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.tsx`. Add the imports at the top:

```ts
import { NumberStepper, Toggle, Dropdown } from '@/components/admin'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import type { OfflineBehaviour } from '@/stores/printerSettingsStore'
```

Inside the component body, after the existing store reads, add:

```tsx
const preflightTimeout = usePrinterSettingsStore((s) => s.preflightTimeout)
const verificationTimeout = usePrinterSettingsStore((s) => s.verificationTimeout)
const verificationPollInterval = usePrinterSettingsStore((s) => s.verificationPollInterval)
const autoRetryOnce = usePrinterSettingsStore((s) => s.autoRetryOnce)
const offlineBehaviour = usePrinterSettingsStore((s) => s.offlineBehaviour)
const healthPollInterval = usePrinterSettingsStore((s) => s.healthPollInterval)

const setPreflightTimeout = usePrinterSettingsStore((s) => s.setPreflightTimeout)
const setVerificationTimeout = usePrinterSettingsStore((s) => s.setVerificationTimeout)
const setVerificationPollInterval = usePrinterSettingsStore((s) => s.setVerificationPollInterval)
const setAutoRetryOnce = usePrinterSettingsStore((s) => s.setAutoRetryOnce)
const setOfflineBehaviour = usePrinterSettingsStore((s) => s.setOfflineBehaviour)
const setHealthPollInterval = usePrinterSettingsStore((s) => s.setHealthPollInterval)

const liveStatus = usePrinterStatusStore((s) => s.status)
const setStatus = usePrinterStatusStore((s) => s.setStatus)
const [refreshingStatus, setRefreshingStatus] = useState(false)

const refreshStatus = useCallback(async () => {
  if (!printerName) return
  setRefreshingStatus(true)
  try {
    const fresh = await window.api.printer.getStatus(printerName)
    setStatus(fresh)
  } finally {
    setRefreshingStatus(false)
  }
}, [printerName, setStatus])
```

Note: `useState` and `useCallback` are already imported at the top of the file — no new imports needed for React hooks.

Then, inside the JSX, after the existing "Number of copies" field and before the "Test print" button, insert the new Reliability subgroup:

```tsx
{
  /* Reliability subgroup */
}
;<div className={styles.subgroup}>
  <h3 className={styles.subgroupTitle}>Reliability</h3>

  <div className={styles.liveStatusRow}>
    <span className={styles.liveLabel}>Current status:</span>
    <span
      className={`${styles.liveBadge} ${liveStatus ? styles[`live_${liveStatus.state}`] : styles.live_unknown}`}
    >
      {liveStatus?.state ?? 'unknown'}
    </span>
    <span className={styles.liveDetail}>{liveStatus?.detail ?? '—'}</span>
    <button
      className={styles.refreshButton}
      onClick={refreshStatus}
      disabled={!printerName || refreshingStatus}
    >
      {refreshingStatus ? 'Checking...' : 'Refresh'}
    </button>
  </div>

  <NumberStepper
    label="Pre-flight timeout (seconds)"
    value={preflightTimeout}
    onChange={setPreflightTimeout}
    min={5}
    max={30}
  />
  <NumberStepper
    label="Verification timeout (seconds)"
    value={verificationTimeout}
    onChange={setVerificationTimeout}
    min={30}
    max={180}
  />
  <NumberStepper
    label="Verification poll interval (seconds)"
    value={verificationPollInterval}
    onChange={setVerificationPollInterval}
    min={1}
    max={10}
  />
  <Toggle
    label="Auto-retry once on verified failure"
    value={autoRetryOnce}
    onChange={setAutoRetryOnce}
  />
  <Dropdown
    label="Offline behaviour"
    value={offlineBehaviour}
    onChange={(v) => setOfflineBehaviour(v as OfflineBehaviour)}
    options={[
      { label: 'Halt captures (red banner)', value: 'halt' },
      { label: 'Capture only (amber banner, save for later)', value: 'captureOnly' }
    ]}
  />
  <NumberStepper
    label="Health check interval (seconds)"
    value={healthPollInterval}
    onChange={setHealthPollInterval}
    min={5}
    max={60}
  />
</div>
```

- [ ] Step 12.2: Add the subgroup + live-status styles

Append to `src/renderer/src/screens/AdminScreen/sections/PrinterSection/PrinterSection.module.css`:

```css
.subgroup {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.subgroupTitle {
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 12px;
  color: #aaa;
}

.liveStatusRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.liveLabel {
  font-weight: 700;
}

.liveBadge {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 12px;
}

.live_ready,
.live_busy {
  background: #2ea043;
  color: #fff;
}
.live_warmingUp {
  background: #f59f00;
  color: #000;
}
.live_offline,
.live_error {
  background: #d9534f;
  color: #fff;
}
.live_unknown {
  background: #555;
  color: #fff;
}

.liveDetail {
  flex: 1;
  color: #bbb;
  font-family: monospace;
  font-size: 13px;
}
```

- [ ] Step 12.3: Typecheck + eslint

Run: `npm run typecheck && npx eslint src/renderer/src/screens/AdminScreen/sections/PrinterSection`
Expected: PASS.

- [ ] Step 12.4: Commit

```bash
git add src/renderer/src/screens/AdminScreen/sections/PrinterSection
git commit -m "feat(admin): reliability subgroup with live status row"
```

---

## Task 13: i18n keys + completeness test + ThankYou "saved" variant

**Files:**

- Modify: `src/renderer/src/i18n/en.json`
- Modify: `src/renderer/src/i18n/nl.json`
- Modify: `src/renderer/src/screens/ThankYouScreen/ThankYouScreen.tsx`
- Create: `tests/i18n/completeness.test.ts`

### - [ ] Step 13.1: Write a failing completeness test

Create `tests/i18n/completeness.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import en from '@/i18n/en.json'
import nl from '@/i18n/nl.json'

describe('i18n completeness', () => {
  it('has every en.json key in nl.json', () => {
    const enKeys = Object.keys(en)
    const nlKeys = new Set(Object.keys(nl))
    const missing = enKeys.filter((k) => !nlKeys.has(k))
    expect(missing).toEqual([])
  })

  it('has every nl.json key in en.json (no orphans)', () => {
    const nlKeys = Object.keys(nl)
    const enKeys = new Set(Object.keys(en))
    const orphans = nlKeys.filter((k) => !enKeys.has(k))
    expect(orphans).toEqual([])
  })

  const requiredNewKeys = [
    'printer.status.warmingUp',
    'printer.status.printing',
    'printer.status.verifying',
    'printer.status.retrying',
    'printer.error.title',
    'printer.error.paperOut',
    'printer.error.paperJam',
    'printer.error.offline',
    'printer.error.needsAttention',
    'printer.error.verificationTimeout',
    'printer.error.stalledInSpooler',
    'printer.error.buttonRetry',
    'printer.error.buttonSkip',
    'printer.error.buttonAdmin',
    'home.printer.unavailable.halt',
    'home.printer.unavailable.captureOnly',
    'review.button.saveOnly',
    'thankyou.title.saved',
    'thankyou.subtitle.saved'
  ]

  it.each(requiredNewKeys)('en.json has key %s', (key) => {
    expect(en as Record<string, string>).toHaveProperty(key)
  })

  it.each(requiredNewKeys)('nl.json has key %s', (key) => {
    expect(nl as Record<string, string>).toHaveProperty(key)
  })
})
```

- [ ] Step 13.2: Run the test, verify it fails

Run: `npx vitest run tests/i18n/completeness.test.ts`
Expected: FAIL — keys don't exist yet.

- [ ] Step 13.3: Add the English keys

Edit `src/renderer/src/i18n/en.json`. Add these key-value pairs (insert before the closing `}` — or group near existing `print.*` / `error.*` keys):

```json
  "printer.status.warmingUp": "Printer warming up...",
  "printer.status.printing": "Printing your strip...",
  "printer.status.verifying": "Almost done...",
  "printer.status.retrying": "One moment, trying again...",
  "printer.error.title": "Print didn't finish",
  "printer.error.paperOut": "The printer needs more paper",
  "printer.error.paperJam": "There's a paper jam",
  "printer.error.offline": "The printer isn't responding",
  "printer.error.needsAttention": "The printer needs attention",
  "printer.error.verificationTimeout": "The print is taking longer than expected",
  "printer.error.stalledInSpooler": "The printer may be asleep — press and hold the power button to wake it",
  "printer.error.buttonRetry": "Try again",
  "printer.error.buttonSkip": "Save for later",
  "printer.error.buttonAdmin": "Admin",
  "home.printer.unavailable.halt": "Printer unavailable — please see the host",
  "home.printer.unavailable.captureOnly": "Printer offline — your strip will be saved for later",
  "review.button.saveOnly": "Save",
  "thankyou.title.saved": "Your strip has been saved!",
  "thankyou.subtitle.saved": "The host will print it for you later."
```

Ensure valid JSON (commas, no trailing comma before `}`).

- [ ] Step 13.4: Add the Dutch translations

Edit `src/renderer/src/i18n/nl.json`. Add the matching pairs:

```json
  "printer.status.warmingUp": "Printer warmt op...",
  "printer.status.printing": "Je strip wordt afgedrukt...",
  "printer.status.verifying": "Bijna klaar...",
  "printer.status.retrying": "Een moment, we proberen het opnieuw...",
  "printer.error.title": "Afdruk niet voltooid",
  "printer.error.paperOut": "De printer heeft meer papier nodig",
  "printer.error.paperJam": "Er zit een papierstoring",
  "printer.error.offline": "De printer reageert niet",
  "printer.error.needsAttention": "De printer heeft aandacht nodig",
  "printer.error.verificationTimeout": "De afdruk duurt langer dan verwacht",
  "printer.error.stalledInSpooler": "De printer slaapt mogelijk — houd de aan/uit-knop ingedrukt om hem te wekken",
  "printer.error.buttonRetry": "Opnieuw proberen",
  "printer.error.buttonSkip": "Later bewaren",
  "printer.error.buttonAdmin": "Beheer",
  "home.printer.unavailable.halt": "Printer niet beschikbaar — vraag de gastheer",
  "home.printer.unavailable.captureOnly": "Printer offline — je strip wordt bewaard voor later",
  "review.button.saveOnly": "Bewaren",
  "thankyou.title.saved": "Je strip is bewaard!",
  "thankyou.subtitle.saved": "De gastheer drukt hem later voor je af."
```

- [ ] Step 13.5: Update ThankYouScreen to show the saved variant

Edit `src/renderer/src/screens/ThankYouScreen/ThankYouScreen.tsx`. Replace the file:

```tsx
import { useNavigationStore } from '@/stores/navigationStore'
import { useStripStore } from '@/stores/stripStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { useT } from '@/i18n'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import styles from './ThankYouScreen.module.css'

function ThankYouScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const wasPrinted = useStripStore((s) => s.wasPrinted)
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })
  const t = useT()

  const titleKey = wasPrinted ? 'thankyou.title' : 'thankyou.title.saved'
  const subtitleKey = wasPrinted ? 'thankyou.subtitle' : 'thankyou.subtitle.saved'

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t(titleKey)}</h1>
      <p className={styles.subtitle}>{t(subtitleKey)}</p>

      {printSheetResult?.dataUrl && (
        <img
          className={styles.stripPreview}
          src={printSheetResult.dataUrl}
          alt="Your photo strip"
        />
      )}

      <button className={styles.doneButton} onClick={goHome}>
        {t('thankyou.done')}
      </button>

      {remainingSeconds !== null && <IdleCountdown remainingSeconds={remainingSeconds} />}
    </div>
  )
}

export default ThankYouScreen
```

- [ ] Step 13.6: Run the completeness test, verify pass

Run: `npx vitest run tests/i18n/completeness.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] Step 13.7: Commit

```bash
git add src/renderer/src/i18n src/renderer/src/screens/ThankYouScreen/ThankYouScreen.tsx tests/i18n/completeness.test.ts
git commit -m "feat(i18n): add printer reliability strings (en+nl) and ThankYou saved variant"
```

---

## Task 14: Dev-only mock printer status IPC

**Files:**

- Modify: `src/main/ipcHandlers.ts` (dev-only handler)
- Modify: `src/preload/index.ts` + `src/preload/index.d.ts` (`__dev` namespace)
- Modify: `src/renderer/src/hooks/usePrinterStatusPolling.ts` (respect mock override)

### - [ ] Step 14.1: Add dev-only mock handler in main

Edit `src/main/ipcHandlers.ts`. At the end of `registerIpcHandlers`, add:

```ts
// ── Dev-only mock status override (NODE_ENV === 'development') ──
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  let mockStatus: import('./printerStatusService').PrinterStatus | null = null

  ipcMain.handle(
    '__dev:set-mock-printer-status',
    (
      _event,
      override: null | {
        state: 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error'
        rawStatusCode: number
        detail: string
      }
    ) => {
      if (override === null) {
        mockStatus = null
        return
      }
      mockStatus = {
        name: 'MOCK',
        state: override.state,
        rawStatusCode: override.rawStatusCode,
        jobCount: 0,
        detail: override.detail,
        queriedAt: Date.now()
      }
    }
  )

  // Replace the real get-status handler when a mock is set
  ipcMain.removeHandler('printer:get-status')
  ipcMain.handle('printer:get-status', async (_event, printerName: string) => {
    if (mockStatus) return { ...mockStatus, name: printerName }
    return statusService.getStatus(printerName)
  })
}
```

Add `app` to the imports:

```ts
import { BrowserWindow, dialog, ipcMain, app } from 'electron'
```

- [ ] Step 14.2: Expose `__dev` namespace in preload

Edit `src/preload/index.ts`. In the `api` object, add (only in dev — but contextBridge exposure is a one-time setup, so we always expose the method and let the main side decide whether it has an effect):

```ts
__dev: {
  setMockPrinterStatus: (
    override: null | { state: string; rawStatusCode: number; detail: string }
  ): Promise<void> => ipcRenderer.invoke('__dev:set-mock-printer-status', override)
}
```

Edit `src/preload/index.d.ts`. Extend the `API` interface:

```ts
export interface DevAPI {
  setMockPrinterStatus: (
    override: null | { state: string; rawStatusCode: number; detail: string }
  ) => Promise<void>
}

export interface API {
  printer: PrinterAPI
  settings: SettingsAPI
  logging: LoggingAPI
  kiosk: KioskAPI
  gallery: GalleryAPI
  __dev: DevAPI
}
```

- [ ] Step 14.3: Update `tests/setup.ts` mock to stub `__dev`

Edit `tests/setup.ts`. In `mockApi`, add:

```ts
__dev: {
  setMockPrinterStatus: vi.fn().mockResolvedValue(undefined)
}
```

- [ ] Step 14.4: Run typecheck + full tests

Run: `npm run typecheck && npx vitest run`
Expected: all PASS.

- [ ] Step 14.5: Commit

```bash
git add src/main/ipcHandlers.ts src/preload/index.ts src/preload/index.d.ts tests/setup.ts
git commit -m "feat(dev): mock printer status override for testing without hardware"
```

---

## Task 15: Manual hardware acceptance checklist + PS7 perf measurement

**Goal:** Validate the design on the real Windows 11 tablet + SELPHY CP1500. Capture any surfaced issues as follow-up fixes within this task.

**Files:**

- Create: `docs/superpowers/acceptance/2026-04-14-better-printer.md`

### - [ ] Step 15.1: Write the acceptance checklist

Create `docs/superpowers/acceptance/2026-04-14-better-printer.md`:

```markdown
# Better Printer — Manual Hardware Acceptance

**Hardware:** Windows 11 tablet (kiosk target), Canon SELPHY CP1500 via USB.

**Pre-req:** `npm run package` or `npm run build && npm start` deployed build on the tablet. Printer configured via admin panel with `printerName = "Canon SELPHY CP1500"` (or whatever the OS reports).

## 1. PowerShell performance measurement

- [ ] Time a single `Get-Printer` invocation on the tablet:
      `powershell
Measure-Command { Get-Printer -Name "Canon SELPHY CP1500" | Select-Object Name,PrinterStatus,JobCount | ConvertTo-Json -Compress }
`
- [ ] Time it 10 times, record median.
- [ ] If median > 1 second: bump `printer.healthPollInterval` default from 10 to 30 seconds (edit `DEFAULTS.printer.healthPollInterval` in `settingsService.ts`). Record the measurement in this file.
- [ ] Check whether `pwsh` (PowerShell 7) is installed (`pwsh -Version`). If available and measurably faster, change the spawn in `printerStatusService.ts` from `'powershell.exe'` to prefer `pwsh.exe` when on PATH. Fall back to `powershell.exe` on ENOENT.

## 2. Happy path (cold start)

- [ ] Launch the app from cold.
- [ ] HomeScreen shows no pill, no banner.
- [ ] Press "Take Photos" → complete a normal session → reach ReviewScreen.
- [ ] Press "Print" → confirmation → PrintScreen.
- [ ] Observe: progress bar animates, messages transition (preparing → printing → almost done).
- [ ] Within ~90s: ThankYouScreen with "Enjoy your photos".
- [ ] Verify physical print came out.

## 3. Wake-from-sleep (Case D)

- [ ] Leave the printer idle for 10+ minutes until the SELPHY enters PowerSave (code 21).
- [ ] Launch a session and press "Print".
- [ ] Observe: pre-flight takes a few seconds (patience window) then proceeds to submit.
- [ ] Verify physical print.
- [ ] If Get-Printer alone didn't wake the printer, `printer.log` will show repeated warmingUp polls until timeout. **If this happens:** add a `Resume-PrintJob` spooler nudge inside `waitForReady` in `printerStatusService.ts` and retest.

## 4. Paper out mid-print

- [ ] Start a print. Mid-job, open the paper tray and remove the paper.
- [ ] Observe: auto-retry fires, dialog eventually appears with "The printer needs more paper" message.
- [ ] Technical detail shows `reason=paper_out`.
- [ ] Refill paper, press [Retry]. Verify the print completes.

## 5. Unplug mid-event (Case A)

- [ ] With the app idle on HomeScreen, unplug the USB cable.
- [ ] Within `healthPollInterval` seconds, the red health pill appears (since `offlineBehaviour=captureOnly` by default → amber banner instead).
- [ ] Press "Take Photos" → session works.
- [ ] ReviewScreen shows "Save" button instead of "Print".
- [ ] Press "Save" → ThankYouScreen with "Your strip has been saved!" subtitle.
- [ ] Replug cable. Within `healthPollInterval`, banner disappears.
- [ ] Go to the gallery (admin → gallery) and reprint the saved session.

## 6. Halt mode

- [ ] In admin, set `offlineBehaviour=halt`.
- [ ] Unplug printer.
- [ ] HomeScreen shows red banner "Printer unavailable — please see the host".
- [ ] "Take Photos" button is disabled.
- [ ] Replug → banner clears, button re-enables.

## 7. Operator skip path

- [ ] Cause a hard failure (e.g. no paper, no action on intervention).
- [ ] After auto-retry + dialog, press [Save for later].
- [ ] ThankYouScreen shows saved variant.
- [ ] Session is in the gallery and reprintable.

## 8. Operator admin path

- [ ] Cause a hard failure.
- [ ] Press [Admin] on the error dialog.
- [ ] PIN prompt → admin screen.
- [ ] Verify the Reliability subgroup "Current status" row reflects the error.

## 9. Stress

- [ ] Set up 10 consecutive print jobs back-to-back via the dev stress test (Ctrl+Shift+T) or manual triggering.
- [ ] Watch `logs/open-photobooth-YYYY-MM-DD.log`: verification times should be stable (~50-80s per SELPHY 4x6), not creeping up.
- [ ] No verification timeouts.

## 10. Fixes surfaced

Record any issues found here. Any fixes should ship as a follow-up commit _inside_ this task with a clear message referencing the acceptance item.

- [ ] …
```

- [ ] Step 15.2: Commit the checklist

```bash
git add docs/superpowers/acceptance/2026-04-14-better-printer.md
git commit -m "docs: add better-printer hardware acceptance checklist"
```

- [ ] Step 15.3: Run the checklist on the tablet

**Executed by the human on the physical hardware.** When issues surface, commit fixes individually. Example commit messages:

```bash
git commit -m "fix(printer): bump healthPollInterval default to 30s based on tablet perf measurement"
git commit -m "fix(printer): use Resume-PrintJob nudge when Get-Printer alone doesn't wake SELPHY"
```

Tick each item in the checklist file as you complete it and commit the updated checklist as the final acceptance commit:

```bash
git commit -m "docs: mark better-printer acceptance checklist complete"
```

---

## Self-Review

1. **Spec coverage check:**
   - Section 1 Architecture ✓ Tasks 1, 5, 6, 7, 8
   - Section 1 Queue-diff correlation ✓ Task 4
   - Section 2 PowerShell commands ✓ Task 1 Step 1.3
   - Section 2 Status code mapping ✓ Task 1 Step 1.1 + 1.3
   - Section 2 JobStatus bit field ✓ Task 1 Step 1.1 + 1.3
   - Section 2 Warming-up patience ✓ Task 1 (`waitForReady`) + Task 3 (plumbing)
   - Section 2 Verification polling detail ✓ Task 4
   - Section 2 Platform fallback ✓ Task 1 Step 1.3 (`stubStatus`)
   - Section 2 New settings ✓ Task 2
   - Section 3 State machine ✓ Task 11
   - Section 3 PrinterErrorDialog ✓ Task 11
   - Section 3 Capture-mode degradation ✓ Task 7, 9, 10
   - Section 3 errorStore cleanup ✓ Task 11 (new hook doesn't call errorStore at all)
   - Section 3 Main→renderer log bridge ✓ Task 5
   - Section 3 Logging at every decision point ✓ Task 11 (logger.info/warn/error inside usePrintJob)
   - Section 4 Admin Reliability subgroup + live status ✓ Task 12
   - Section 4 PrinterHealthPill ✓ Task 8
   - Section 4 PrinterHealthDialog ✓ Task 8
   - Section 4 HomeScreen offline banner ✓ Task 9
   - Section 4 ReviewScreen button swap ✓ Task 10
   - Section 4 PrintScreen progress visuals ✓ Task 11
   - Section 4 ThankYouScreen saved variant ✓ Task 13
   - Section 4 New i18n keys (en+nl) ✓ Task 13
   - Section 5 Unit tests ✓ Tasks 1, 2, 3, 4, 5, 6, 7, 11, 13
   - Section 5 Dev-only mock IPC ✓ Task 14
   - Section 5 Manual acceptance checklist ✓ Task 15
   - Section 5 Risks: PowerShell perf ✓ Task 15 Step 15.1; wake behaviour ✓ Task 15 Step 15.3; docName propagation ✓ Task 4 (hardware verification in Task 15); log bridge startup ✓ Task 5 (`mirrorBuffered` flushes on attach); PrintResult compat ✓ Task 4 Step 4.6 (tests/setup.ts updated)

2. **Placeholder scan:** No TBDs, no "implement later", no naked "handle edge cases." Each step has concrete code or a concrete command.

3. **Type consistency verified:**
   - `PrinterState` defined once in Task 1, imported from preload in renderer code.
   - `PrintResult` shape changed in Task 4 and updated in `tests/setup.ts` in the same task.
   - `PrintJobState` values (`preflighting`, `submitting`, `verifying`, `retrying`, `succeeded`, `failed_hard`) are consistent between Task 11's hook and Task 11's PrintScreen rewrite.
   - `OfflineBehaviour` defined in store (Task 2), reused in settings service (Task 2), admin UI (Task 12), and useCaptureAvailability (Task 7).
   - `waitForReady` vs `waitForJobCompletion` are distinct functions — used correctly in Task 3 (waitForReady) and Task 4 (waitForJobCompletion).
   - `LogEntry` shape defined in Task 5 (main) and imported in Task 5 (renderer) + Task 8 (PrinterHealthDialog).
   - `findNewJob` helper introduced in Task 4 only — name is consistent.

4. **Known tradeoffs for the reader:**
   - The `__testOverrides` seam on `print()` is ugly but alternatives (extracting a "renderPrintDocument" helper) were deemed larger-scope than this plan. Acceptable.
   - `useCaptureAvailability` reads stores synchronously without subscribing to updates — Zustand's selector pattern handles subscriptions implicitly so this is fine.
   - The ScheduleWakeup-less polling hook uses `setInterval` rather than the more React-y `setTimeout` recursion. Matches the existing `useIdleTimeout` pattern.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-better-printer.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
