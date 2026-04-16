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

- [ ] ...
