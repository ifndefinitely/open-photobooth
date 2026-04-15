# Better Printer — Design Spec

**Branch:** `feature/better-printer`
**Date:** 2026-04-14
**Status:** Design approved, pending spec review before plan writing

---

## Problem Statement

The current print pipeline in [src/main/printerService.ts](../../../src/main/printerService.ts) uses Electron's `webContents.getPrintersAsync()` for enumeration and `webContents.print()` for silent printing. It has two weaknesses that bite during real 8-hour events on a Windows 11 kiosk with a Canon SELPHY CP1500:

1. **Availability check is superficial.** "Is the printer in the list?" says nothing about whether it can actually print. A driver-zombie state (printer listed, spooler hangs) or sleep state looks identical to "ready."
2. **Print submission is unverified.** Electron's `webContents.print()` callback reports success when the spooler accepts the job — not when paper physically emerges. A failed job silently leaves the guest staring at a "thank you" screen holding nothing.

We are redesigning the pipeline to be reliable for all-day events. Scope is deliberately narrowed to the failure modes we have actually seen:

- **Case A — Driver zombie:** printer appears in OS list, prints silently fail or hang in the spooler.
- **Case D — Wake-from-sleep:** first print after idle is slow or times out.
- **Case E — Phantom success:** Electron reports the print succeeded but no paper comes out.

All three have the same root cause: **we cannot trust Electron's print callback.** The solution is to query the Windows print spooler directly via PowerShell from the main process, both before and after submitting the job.

Explicit non-goals (YAGNI): persistent cross-restart job tracking, WiFi-specific code paths, ICMP network printer reachability, automatic driver reset, queue depth auto-pause, CUPS/Linux status, cross-printer failover, print preview preflight.

---

## Decisions Recap (Clarifying Questions)

| #   | Question                        | Decision                                                                                                                                                                                                                           |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Which failure modes to target?  | A + D + E. Query spooler directly — don't trust Electron's callback.                                                                                                                                                               |
| Q2  | How hard to verify?             | Level 2: pre-flight status query + post-submit job-queue polling. 90s default verification timeout (SELPHY 4x6 typical 60s, worst 80s).                                                                                            |
| Q3  | Retry policy?                   | One silent auto-retry with brief overlay, then operator-decision modal with [Retry] / [Skip — save to gallery] / [Open admin]. Configurable via `printer.autoRetryOnce`.                                                           |
| Q4  | Mid-event disconnect behaviour? | Admin-configurable via `printer.offlineBehaviour`: `halt` (block Start button) or `captureOnly` (allow captures, save only, skip PrintScreen). Default `captureOnly`.                                                              |
| Q5  | Operator visibility?            | `PrinterHealthPill` on HomeScreen bottom-right, hidden when green so guests don't see it. Tap → PIN → `PrinterHealthDialog` with live status + raw detail + recent logs. Polls every 10s while idle, paused during active session. |

---

## Section 1 — Architecture

### New main-process module: `src/main/printerStatusService.ts`

Single source of truth for "what is the printer actually doing." Wraps PowerShell via `child_process.spawn`, parses `ConvertTo-Json -Compress` output.

Public surface:

```ts
type PrinterState = 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error';

interface PrinterStatus {
  name: string;
  state: PrinterState;
  rawStatusCode: number;
  jobCount: number;
  detail: string; // human-readable, English
  queriedAt: number; // epoch ms
}

interface PrintJob {
  id: number;
  documentName: string;
  submittedTime: string;
  jobStatus: number; // raw bit field
  jobStatusLabels: string[]; // decoded, e.g. ["Printing", "Spooling"]
}

getStatus(printerName: string): Promise<PrinterStatus>;
getJobs(printerName: string): Promise<PrintJob[]>;
waitForJobCompletion(
  printerName: string,
  jobId: number,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<{ verified: boolean; reason?: string }>;
```

Platform detection: `process.platform !== 'win32'` → stub that returns `state: 'ready'` and empty queue. Dev on Linux/Mac works, verification becomes a no-op, warning logged so it is obvious in logs.

### Refactored `src/main/printerService.ts`

- `checkPrinterAvailability` delegates to `printerStatusService.getStatus()` and adds a **warming-up patience window** (default 10s, poll every 500ms). Warming-up is not a rejection — it is "wait, this might wake."
- `print` gains **post-submit verification**:
  1. Snapshot queue (`getJobs`) before print.
  2. Call `webContents.print()`.
  3. Poll `getJobs` for up to 500ms to find the new `jobId` (diff by ID, confirm by document name).
  4. `waitForJobCompletion` until the job disappears from the queue (verified) or enters a bad state / times out.
  5. Return: `{ success, verified, reason?, jobId? }`.

**Backward compatibility:** `PrintResult` gains `verified`, `jobId`, `reason` fields. All existing consumers and test mocks must continue to work with the new shape — verified in BP.1.

### Renderer additions

| File                                                                                                            | Purpose                                                                          |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [src/renderer/src/stores/printerStatusStore.ts](../../../src/renderer/src/stores/printerStatusStore.ts)         | Live status (green/amber/red), last checked, raw details, last N errors          |
| [src/renderer/src/hooks/usePrinterStatusPolling.ts](../../../src/renderer/src/hooks/usePrinterStatusPolling.ts) | 10s poll of `api.printer.getStatus()` while idle; paused during active session   |
| [src/renderer/src/components/PrinterHealthPill/](../../../src/renderer/src/components/PrinterHealthPill/)       | Corner badge on HomeScreen, hidden when green                                    |
| [src/renderer/src/components/PrinterHealthDialog/](../../../src/renderer/src/components/PrinterHealthDialog/)   | Operator view of live status + logs                                              |
| [src/renderer/src/components/PrinterErrorDialog/](../../../src/renderer/src/components/PrinterErrorDialog/)     | Operator decision modal: [Retry] [Skip] [Admin]                                  |
| [src/renderer/src/hooks/useCaptureAvailability.ts](../../../src/renderer/src/hooks/useCaptureAvailability.ts)   | Computes `{ allowCaptures, showOfflineBanner }` from status + `offlineBehaviour` |

### Refactored consumers

- [src/renderer/src/hooks/usePrintJob.ts](../../../src/renderer/src/hooks/usePrintJob.ts) becomes a state machine (see Section 3).
- [src/renderer/src/screens/HomeScreen/](../../../src/renderer/src/screens/HomeScreen/) mounts the pill + banner.
- [src/renderer/src/screens/PrintScreen/](../../../src/renderer/src/screens/PrintScreen/) shows dynamic progress messaging and surfaces `PrinterErrorDialog`.

### Happy path

```
HomeScreen → SessionScreen → ReviewScreen → PrintScreen
  → pre-flight getStatus (wait up to 10s if warmingUp)
  → snapshot queue
  → webContents.print (unique <title>openphotobooth-<sessionId></title>)
  → spooler ack
  → queue diff finds new jobId
  → waitForJobCompletion polls 2s until job drains
  → ThankYouScreen
```

### Sad path

```
verification fails → auto-retry once (brief overlay)
  → fails again → PrinterErrorDialog modal overlays PrintScreen
  → operator picks [Retry] | [Skip — save to gallery] | [Open admin]
```

### Queue-diff correlation (belt-and-braces)

Set a unique `<title>openphotobooth-<sessionId></title>` on the hidden print window's HTML so the Windows spool job name is unique and greppable.

- **1 new job after print:** track it by ID. Happy case.
- **0 new jobs after 500ms of polling:** return `verified: false, reason: 'unverifiable'`, log warning, still navigate to ThankYouScreen. Assumes print went through but we couldn't prove it — better UX than rejecting a probably-successful print.
- **>1 new jobs:** match by document name, log anomaly.

---

## Section 2 — Core Mechanism

### PowerShell commands

```powershell
Get-Printer -Name "Canon SELPHY CP1500" |
  Select-Object Name, PrinterStatus, JobCount |
  ConvertTo-Json -Compress

Get-PrintJob -PrinterName "Canon SELPHY CP1500" |
  Select-Object Id, DocumentName, SubmittedTime, JobStatus |
  ConvertTo-Json -Compress
```

Spawned via `child_process.spawn('powershell.exe', [...])`. Prefer `pwsh` (PowerShell 7) if detected — measurably faster startup — fall back to Windows PowerShell 5.

### PrinterStatus code mapping

Sourced from Microsoft's `PrintManagement` module. Groupings:

| Codes                     | State                   | Notes                                                                     |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `0, 3`                    | `ready` (green)         | Idle                                                                      |
| `4, 6, 13, 14, 15, 19`    | `busy` (green, healthy) | Printing/processing                                                       |
| `1, 2, 5, 10, 18, 20, 21` | `warmingUp` (amber)     | **Code 21 = PowerSave = SELPHY sleep — Case D.** Patience window applies. |
| `7, 12, 17`               | `offline` (red)         | Unplugged / driver gone                                                   |
| `8, 9, 11, 16, 22`        | `error` (red)           | Paper jam, paper out, etc.                                                |

### JobStatus bit field

Microsoft docs: `Normal=1, Spooling=8, Printing=16, Processing=…, Error=2, Paused=1024, PaperOut=64, Deleting=4, UserIntervention=32`.

During verification:

- **Continue polling:** `Normal, Spooling, Printing, Processing`
- **Reject:** `Error, PaperOut, UserIntervention, Paused`

Map each rejection to a human-readable `reason` for the error dialog.

### Warming-up patience window

On `warmingUp`, don't reject. Poll every 500ms up to `printer.preflightTimeout` (default 10s). **Assumption under test in BP.1:** querying `Get-Printer` often wakes a USB printer via the driver handshake, so the query itself may be the nudge that wakes the SELPHY from PowerSave.

**Fallback if the query alone isn't enough:** send `Resume-PrintJob` against a phantom job, or use a spooler nudge. We will learn which early.

### Verification polling detail

1. Snapshot queue before print.
2. `webContents.print()` callback fires.
3. Poll `getJobs` every 100ms for up to 500ms to find new `jobId` (diff by ID, confirm by documentName).
4. Loop every `verificationPollInterval` (default 2s) up to `verificationTimeout` (default 90s):
   - Job absent from queue → **resolved, verified.**
   - Job in bad state → reject with reason.
   - Job in good state → continue.
   - Elapsed > timeout → reject with `verification_timeout`.

### Platform fallback

On non-Windows: stub returns `state: 'ready'`, empty queue, logs once per process "printerStatusService: non-Windows platform, verification disabled." Dev works, verification becomes a no-op.

### New settings (exposed in admin)

| Key                                | Type       | Default         | Range                       |
| ---------------------------------- | ---------- | --------------- | --------------------------- |
| `printer.preflightTimeout`         | number (s) | 10              | 5–30                        |
| `printer.verificationTimeout`      | number (s) | 90              | 30–180                      |
| `printer.verificationPollInterval` | number (s) | 2               | 1–10                        |
| `printer.autoRetryOnce`            | boolean    | `true`          | —                           |
| `printer.offlineBehaviour`         | enum       | `"captureOnly"` | `"halt"` \| `"captureOnly"` |
| `printer.healthPollInterval`       | number (s) | 10              | 5–60                        |

All go into the schema in [src/main/settingsService.ts](../../../src/main/settingsService.ts) and are documented in [docs/07-epic-admin-settings.md](../../07-epic-admin-settings.md) Story 7.1.

---

## Section 3 — Error Handling & State Machine

### PrintScreen state machine

```
idle
  → preflighting
    → submitting
      → verifying
        → succeeded
        → unverifiable   (queue-diff found 0 new jobs; proceed to ThankYou anyway)
        → failed_soft    (first failure, auto-retry enabled)
          → retrying
            → preflighting ...
        → failed_hard    (second failure or auto-retry disabled)
```

`failed_hard` surfaces `PrinterErrorDialog`. `succeeded` and `unverifiable` both navigate to ThankYouScreen — `unverifiable` logs a warning but does not block the guest.

### `PrinterErrorDialog`

Full-screen modal, **not a new screen** — keeps navigation stack clean and recovery simple.

Content:

- Headline: i18n `printer.error.title` ("Print didn't finish")
- Plain-language reason (i18n, mapped from JobStatus) — guest-friendly: "the printer needs more paper," not "paper out error"
- **Technical detail visible in plain sight** (English, untranslated) — raw reason string, job ID, last PowerShell status snapshot. Visibility wins over PIN-gating for event-debugging speed.
- Three buttons:
  - **[Retry]** — back to `preflighting`
  - **[Skip — save to gallery]** — force-save via existing gallery auto-save, navigate to `ThankYouScreen` "saved, not printed" variant
  - **[Open admin]** — PIN prompt → `AdminScreen`. Failed PIN returns to dialog, not HomeScreen.

### Capture-mode degradation (`useCaptureAvailability`)

| Status                | `halt` mode              | `captureOnly` mode                                                   |
| --------------------- | ------------------------ | -------------------------------------------------------------------- |
| green / busy          | allow                    | allow                                                                |
| warmingUp (amber)     | allow                    | allow                                                                |
| offline / error (red) | block Start + red banner | allow + amber banner + ReviewScreen "Save" button + skip PrintScreen |

### `errorStore` cleanup (in scope)

`usePrintJob` currently routes print failures through global `errorStore.showError()`, which sends the user to `ErrorScreen` — a dead-end. Refactor: print failures go through the new `PrinterErrorDialog` domain dialog. Only genuine code explosions (IPC missing, unhandled exceptions) still fall through to `errorStore` → `ErrorScreen`.

### Main → renderer log bridge (in scope)

Main process currently logs to terminal, not devtools. Add a small IPC bridge that forwards debug log lines to renderer `console.debug` so devtools shows them. Buffer up to ~500 lines in main before renderer-ready, then flush on first renderer connection. This makes live debugging a photobooth in the field dramatically easier.

### Logging at every decision point

`loggingService.log('Printer', ...)` on every state transition. Mirror to console in dev. An example sad-path print leaves a trace like:

```
preflight: getStatus → warmingUp (code 21)
preflight: patience poll 1/20 → warmingUp
preflight: patience poll 4/20 → ready
submit: queue snapshot = [ids: 42, 43]
submit: webContents.print callback success
verify: queue diff → new job id 44 (docName openphotobooth-abc123)
verify: poll 1 → Printing
verify: poll 2 → PaperOut
verify: reject reason=paper_out
retry: auto-retry 1/1
preflight: getStatus → error (code 9, paper out)
preflight: reject → failed_hard
ui: showing PrinterErrorDialog reason=paper_out
```

---

## Section 4 — Settings, UI, i18n

### Admin PrinterSection — new "Reliability" subgroup

Lives inside the existing Printer section in [src/renderer/src/screens/AdminScreen/](../../../src/renderer/src/screens/AdminScreen/). One collapsible subgroup.

- Live "Current status" read-only row at top (reuses `printerStatusStore`, tap-to-refresh)
- Pre-flight timeout (NumberStepper 5–30s)
- Verification timeout (NumberStepper 30–180s)
- Verification poll interval (NumberStepper 1–10s)
- Auto-retry on failure (Toggle)
- Offline behaviour (Dropdown: `halt` / `captureOnly`)
- Health check interval (NumberStepper 5–60s)

Admin UI text remains English-only — no i18n needed here.

### `PrinterHealthPill` on HomeScreen

- Bottom-right corner, 48px touch target (meets project touch minimum)
- **Hidden when green/busy** — guests never see it
- Amber (warning icon) when `warmingUp`
- Red (error icon) when `offline` / `error`
- Icon-only, no label text (no i18n needed on the pill itself)
- Tap → PIN prompt → `PrinterHealthDialog`

### `PrinterHealthDialog`

Full-screen modal. English-only (admin surface).

- Live status pill (mirrors current store state)
- Raw PowerShell detail JSON
- **Last 5 ERROR-level logs from `loggingService`** filtered to `category=Printer`
- Manual refresh button
- Close button

Requires new IPC endpoint: `logging:getRecent(category, level, limit)`.

### HomeScreen offline banner

- 64px strip across the top of HomeScreen
- `halt` mode: red, "Printer unavailable — please see the host"
- `captureOnly` mode: amber, "Printer offline — your strip will be saved for later"
- When banner visible, pill is **hidden** — one visual surface, not two

### ReviewScreen button swap

When status is red AND `offlineBehaviour === 'captureOnly'`:

- Replace "Print" button with "Save" (i18n key `review.button.saveOnly`)
- On tap: run auto-save, navigate to ThankYou "saved" variant, **skip PrintScreen entirely**

### PrintScreen progress visuals

- Progress bar paced to `verificationTimeout`
- Dynamic message based on state:
  - `preflighting` → "Preparing printer..."
  - `submitting` → "Sending to printer..."
  - `verifying` → "Printing your strip..."
  - `retrying` overlay → "One moment, trying again..."
  - ~80% of timeout → "Almost done..."
- **No cancel button.** Guests can't abort mid-print.

### ThankYouScreen "saved, not printed" variant

Add conditional prop `printed: boolean` (default `true`). When `false`:

- Title: "Your strip has been saved!"
- Subtitle: "The host will print it for you later."

### New i18n keys (en + nl)

```
printer.status.warmingUp       → "Printer warming up..."
printer.status.printing        → "Printing your strip..."
printer.status.verifying       → "Almost done..."
printer.status.retrying        → "One moment, trying again..."
printer.error.title            → "Print didn't finish"
printer.error.paperOut         → "The printer needs more paper"
printer.error.paperJam         → "There's a paper jam"
printer.error.offline          → "The printer isn't responding"
printer.error.needsAttention   → "The printer needs attention"
printer.error.verificationTimeout → "The print is taking longer than expected"
printer.error.buttonRetry      → "Try again"
printer.error.buttonSkip       → "Save for later"
printer.error.buttonAdmin      → "Admin"
home.printer.unavailable.halt  → "Printer unavailable — please see the host"
home.printer.unavailable.captureOnly → "Printer offline — your strip will be saved for later"
review.button.saveOnly         → "Save"
thankyou.title.saved           → "Your strip has been saved!"
thankyou.subtitle.saved        → "The host will print it for you later."
```

Both `en.json` and `nl.json` required. Completeness test (see Section 5) asserts every key exists in both.

---

## Section 5 — Testing, Stories, Risks

### Unit tests (Vitest)

- `printerStatusService` PowerShell JSON parsing (fixtures), status code → state mapping, JobStatus bit-field decoding, warming-up polling with injected fake time
- `printerService.print` verification state machine with mocked `printerStatusService`, all paths: happy / warming / error / timeout / unverifiable
- `usePrintJob` retry state machine via `renderHook` with mocked `window.api.printer.*`
- `useCaptureAvailability` store-reader
- i18n completeness test asserting every new key exists in both `en.json` and `nl.json`

### Dev-only mock IPC

`window.api.__dev.setMockPrinterStatus(state)` behind `NODE_ENV === 'development'` guard — same pattern as existing `useStressTest`. Lets us drive the renderer through every state (green/amber/red, error reasons) without real hardware.

### Manual hardware acceptance checklist

On the Windows tablet with the real SELPHY CP1500:

1. **Happy path cold:** prints + verifies + ThankYou.
2. **Wake-from-sleep (Case D):** SELPHY sleeping → pre-flight waits and succeeds.
3. **Paper out mid-print:** dialog shows "the printer needs more paper."
4. **Unplug mid-event:** pill red + banner + `captureOnly` mode works.
5. **Replug:** pill green + banner disappears within poll interval.
6. **Operator retry after fix:** [Retry] succeeds on second attempt.
7. **Operator skip:** strip saved in gallery, reprint from gallery works (uses existing flow from commit `9439c88`).
8. **Stress:** 10 consecutive prints back-to-back — no verification lag accumulation.

### Story breakdown (rough — `writing-plans` will refine)

| #     | Story                                                                                                                                               | Deps       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| BP.1  | `printerStatusService` + PowerShell integration + unit tests + main→renderer log IPC bridge + **validate SELPHY wake-from-status-query assumption** | —          |
| BP.2  | Refactor `printerService.checkAvailability` + pre-flight patience window                                                                            | BP.1       |
| BP.3  | Post-submit verification polling + queue diff + unique document name correlation                                                                    | BP.2       |
| BP.4  | Settings schema additions + PrinterSection "Reliability" subgroup + live status row                                                                 | —          |
| BP.5  | `printerStatusStore` + `usePrinterStatusPolling` + IPC `getStatus` wiring                                                                           | BP.1, BP.4 |
| BP.6  | `PrinterHealthPill` + `PrinterHealthDialog` + `logging:getRecent` IPC                                                                               | BP.5       |
| BP.7  | `useCaptureAvailability` + HomeScreen offline banner + ReviewScreen button swap                                                                     | BP.5, BP.4 |
| BP.8  | `usePrintJob` refactor to state machine + `PrinterErrorDialog` + `errorStore` cleanup                                                               | BP.3, BP.4 |
| BP.9  | PrintScreen progress visuals + dynamic messages + ThankYouScreen "saved" variant                                                                    | BP.8       |
| BP.10 | i18n keys (en + nl) + completeness test                                                                                                             | —          |
| BP.11 | Dev-only mock status IPC for testing BP.6–BP.9 without hardware                                                                                     | BP.1       |
| BP.12 | Manual hardware acceptance test + fix anything surfaced                                                                                             | BP.1–BP.11 |

~12 stories, 6–10 sessions depending on how aggressively adjacent stories collapse.

### Risks

1. **PowerShell spawn cost on low-spec tablet.** Assumption: ~200ms per invocation. Could be 1–2s on the target hardware. Mitigation: measure in BP.1; use `pwsh` (PS7) if installed; bump `healthPollInterval` default to 30s if needed.
2. **PowerSave wake behaviour (code 21).** The biggest unknown. Does `Get-Printer` alone wake the SELPHY? Validate early in BP.1. Fallback: `Resume-PrintJob` or spooler nudge.
3. **Document name propagation.** Verify in BP.3 that `<title>` on the print document HTML actually propagates to the spool job `DocumentName`. Queue diff by ID is primary correlation; doc name is belt-and-braces fallback.
4. **IPC log bridge startup ordering.** Main-process logs before renderer ready. Buffer ~500 lines, flush on first renderer connection.
5. **`PrintResult` shape change backward compatibility.** Existing test mocks on `window.api.printer.*` must still work with added `verified` / `jobId` / `reason` fields. Check in BP.1 before merging.

### Explicit YAGNI (not in scope)

- Persistent cross-restart job tracking
- WiFi-specific code paths
- ICMP network printer reachability
- Automatic driver reset
- Queue depth auto-pause
- CUPS / Linux status querying
- Cross-printer failover
- Print preview preflight

---

## Open Questions for Spec Review

None currently — all 5 clarifying questions were resolved before this spec was written. If the user spots something during review, log it here before invoking `writing-plans`.
