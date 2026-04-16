# Shell Launcher Kiosk Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two PowerShell scripts (`kiosk-setup.ps1` and `kiosk-teardown.ps1`) that automate Windows Shell Launcher v2 kiosk configuration for Open Photobooth, and bundle them with the installer.

**Architecture:** Shell Launcher replaces `explorer.exe` with `open-photobooth.exe` for a dedicated "Photobooth" local user account. Auto-logon boots straight into the app. The admin breaks out via Ctrl+Alt+Del → Sign out → log into their own account. The teardown script reverses everything. Both scripts are idempotent — safe to run multiple times.

**Tech Stack:** PowerShell 5.1+ (ships with Windows 10/11), Shell Launcher WMI (`WESL_UserSetting`), DISM, Windows local user management.

---

## Context

### Two-Tier Kiosk Architecture

| Tier | Name       | Mechanism                  | When to use                                                |
| ---- | ---------- | -------------------------- | ---------------------------------------------------------- |
| 1    | Hard Kiosk | Shell Launcher (this plan) | Production deployments on Windows Pro/Enterprise/Education |
| 2    | Soft Kiosk | In-app `kioskService.ts`   | Development, demos, Windows Home, quick setups             |

### Breakout Flow (Hard Kiosk)

1. Press **Ctrl+Alt+Del** (OS-level, cannot be blocked)
2. Click **Sign out**
3. Login screen appears
4. Select admin account → enter password → full Windows desktop
5. When done: sign out of admin account → auto-logon brings kiosk user back

### Key Facts

- App executable: `open-photobooth.exe` (from `electron-builder.yml` `win.executableName`)
- Default install paths: `%LOCALAPPDATA%\Programs\Open Photobooth\` (per-user) or `%ProgramFiles%\Open Photobooth\` (per-machine)
- Default admin PIN: `0000` (from `settingsService.ts` defaults)
- Shell Launcher WMI class: `WESL_UserSetting` in `root\standardcimv2\embedded`
- Shell Launcher feature name: `Client-ShellLauncher`
- Requires: Windows Pro/Enterprise/Education, Administrator privileges

---

## File Structure

```
scripts/
├── kiosk-setup.ps1          # NEW — Automated Shell Launcher setup
└── kiosk-teardown.ps1       # NEW — Automated Shell Launcher teardown

electron-builder.yml          # MODIFY — Add extraFiles to bundle scripts
```

No application code changes. The existing `kioskService.ts` soft-kiosk features complement (and don't conflict with) Shell Launcher.

---

## Task 1: Create `scripts/kiosk-setup.ps1`

**Files:**

- Create: `scripts/kiosk-setup.ps1`

This is the main setup script. It is idempotent — if the Shell Launcher feature was just enabled and needs a reboot before WMI is available, the admin reboots and runs it again. Steps 1–3 persist across reboot.

- [ ] **Step 1: Create the complete setup script**

```powershell
#Requires -RunAsAdministrator
#Requires -Version 5.1
<#
.SYNOPSIS
    Sets up Windows Shell Launcher kiosk mode for Open Photobooth.

.DESCRIPTION
    Automates the full kiosk setup:
    - Enables the Shell Launcher Windows feature (requires Windows Pro/Enterprise/Education)
    - Creates a dedicated local user account for the kiosk
    - Configures Shell Launcher to run Open Photobooth as the shell for that user
    - Configures auto-logon so the kiosk user logs in automatically on boot

    Run as Administrator. If the Shell Launcher feature was just enabled, a reboot
    may be required before the WMI provider becomes available. In that case, reboot
    and run this script again — it is idempotent.

    To break out of kiosk mode:
      1. Press Ctrl+Alt+Del
      2. Click "Sign out"
      3. Log in with your admin account

    To undo this setup: run kiosk-teardown.ps1 as Administrator.

.PARAMETER AppPath
    Full path to open-photobooth.exe. If omitted, auto-detected from standard
    install locations or the script's own directory (when bundled with the app).

.PARAMETER KioskUser
    Name of the local user account to create for kiosk mode. Default: "Photobooth"

.PARAMETER KioskPassword
    Password for the kiosk user. If omitted, a random 16-character password is
    generated. The password is displayed at the end of setup for reference, but
    you do not need to remember it — auto-logon handles authentication.

.EXAMPLE
    .\kiosk-setup.ps1
    # Auto-detects app path, creates "Photobooth" user with random password.

.EXAMPLE
    .\kiosk-setup.ps1 -AppPath "D:\Photobooth\open-photobooth.exe" -KioskUser "Booth"
    # Uses explicit app path and custom kiosk username.
#>
[CmdletBinding()]
param(
    [string]$AppPath,
    [string]$KioskUser = "Photobooth",
    [string]$KioskPassword
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Output Helpers ──────────────────────────────────────────────────────────

function Write-Banner {
    param([string]$Text)
    $line = "=" * 60
    Write-Host ""
    Write-Host $line -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host $line -ForegroundColor Cyan
    Write-Host ""
}

function Write-Check {
    param([string]$Label, [string]$Value, [bool]$Ok)
    $status = if ($Ok) { "[OK]" } else { "[FAIL]" }
    $color = if ($Ok) { "Green" } else { "Red" }
    Write-Host "  $status " -ForegroundColor $color -NoNewline
    Write-Host "$Label " -NoNewline
    Write-Host $Value -ForegroundColor Yellow
}

function Write-StepHeader {
    param([int]$Number, [int]$Total, [string]$Description)
    Write-Host ""
    Write-Host "  [$Number/$Total] $Description" -ForegroundColor White
}

# ── Prerequisite Checks ────────────────────────────────────────────────────

function Assert-WindowsEdition {
    $edition = (Get-CimInstance Win32_OperatingSystem).Caption
    $isSupported = $edition -match "Pro|Enterprise|Education"
    Write-Check "Windows edition:" $edition $isSupported
    if (-not $isSupported) {
        throw "Shell Launcher requires Windows Pro, Enterprise, or Education. Found: $edition"
    }
}

function Test-ShellLauncherFeatureEnabled {
    $feature = Get-WindowsOptionalFeature -Online -FeatureName "Client-ShellLauncher" -ErrorAction SilentlyContinue
    return ($null -ne $feature -and $feature.State -eq "Enabled")
}

function Test-ShellLauncherWmiAvailable {
    try {
        $null = [wmiclass]"\\localhost\root\standardcimv2\embedded:WESL_UserSetting"
        return $true
    } catch {
        return $false
    }
}

function Find-AppExecutable {
    param([string]$Hint)

    # 1. Explicit parameter
    if ($Hint -and (Test-Path $Hint)) {
        return (Resolve-Path $Hint).Path
    }

    # 2. Bundled with app (script at <install>/scripts/kiosk-setup.ps1,
    #    exe at <install>/open-photobooth.exe)
    $bundled = Join-Path (Split-Path $PSScriptRoot) "open-photobooth.exe"
    if (Test-Path $bundled) {
        return (Resolve-Path $bundled).Path
    }

    # 3. Standard install locations
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Open Photobooth\open-photobooth.exe"
        "$env:ProgramFiles\Open Photobooth\open-photobooth.exe"
        "${env:ProgramFiles(x86)}\Open Photobooth\open-photobooth.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return (Resolve-Path $path).Path
        }
    }

    # 4. Registry — NSIS uninstaller records the install location
    $uninstallRoots = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
    )
    foreach ($root in $uninstallRoots) {
        $keys = Get-ChildItem $root -ErrorAction SilentlyContinue
        foreach ($key in $keys) {
            if ($key.GetValue("DisplayName") -eq "Open Photobooth") {
                $loc = $key.GetValue("InstallLocation")
                if ($loc) {
                    $candidate = Join-Path $loc "open-photobooth.exe"
                    if (Test-Path $candidate) {
                        return (Resolve-Path $candidate).Path
                    }
                }
            }
        }
    }

    return $null
}

# ── User Management ─────────────────────────────────────────────────────────

function Initialize-KioskUser {
    param([string]$Username, [securestring]$SecurePassword)

    $existing = Get-LocalUser -Name $Username -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "    User '$Username' already exists — updating password" -ForegroundColor Yellow
        Set-LocalUser -Name $Username -Password $SecurePassword
        return
    }

    New-LocalUser -Name $Username `
        -Password $SecurePassword `
        -FullName "Open Photobooth Kiosk" `
        -Description "Kiosk mode account for Open Photobooth" `
        -PasswordNeverExpires `
        -UserMayNotChangePassword | Out-Null

    Write-Host "    Created local user '$Username'" -ForegroundColor Green
}

# ── Shell Launcher ──────────────────────────────────────────────────────────

function Set-ShellLauncherForUser {
    param([string]$Username, [string]$ShellPath)

    $ShellLauncherClass = [wmiclass]"\\localhost\root\standardcimv2\embedded:WESL_UserSetting"

    # Enable Shell Launcher globally
    $ShellLauncherClass.SetEnabled($true) | Out-Null
    Write-Host "    Shell Launcher enabled" -ForegroundColor Green

    # Resolve the kiosk user's SID
    $account = New-Object System.Security.Principal.NTAccount($Username)
    $sid = $account.Translate([System.Security.Principal.SecurityIdentifier]).Value

    # Set custom shell. DefaultAction = 0 means "restart shell" on any exit,
    # which provides automatic crash recovery.
    $ShellLauncherClass.SetCustomShell($sid, $ShellPath, 0) | Out-Null
    Write-Host "    Custom shell configured:" -ForegroundColor Green
    Write-Host "      User:   $Username (SID: $sid)"
    Write-Host "      Shell:  $ShellPath"
    Write-Host "      On exit: Restart shell (crash recovery)"
}

# ── Auto-Logon ──────────────────────────────────────────────────────────────

function Set-AutoLogon {
    param([string]$Username, [string]$Password)

    $regPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
    Set-ItemProperty -Path $regPath -Name "AutoAdminLogon" -Value "1"
    Set-ItemProperty -Path $regPath -Name "DefaultUserName" -Value $Username
    Set-ItemProperty -Path $regPath -Name "DefaultPassword" -Value $Password
    Set-ItemProperty -Path $regPath -Name "DefaultDomainName" -Value $env:COMPUTERNAME

    Write-Host "    Auto-logon configured for '$Username'" -ForegroundColor Green
}

# ── Main ────────────────────────────────────────────────────────────────────

Write-Banner "Open Photobooth - Kiosk Setup"

# ── Prerequisites ──

Write-Host "  Checking prerequisites..." -ForegroundColor White
Write-Host ""

Assert-WindowsEdition

$appExe = Find-AppExecutable -Hint $AppPath
if (-not $appExe) {
    Write-Host ""
    Write-Host "  [FAIL] Could not find open-photobooth.exe" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install the app first, or pass the path explicitly:" -ForegroundColor Yellow
    Write-Host "    .\kiosk-setup.ps1 -AppPath ""C:\path\to\open-photobooth.exe""" -ForegroundColor Yellow
    exit 1
}
Write-Check "App executable:" $appExe $true

# Generate password if not provided
if (-not $KioskPassword) {
    $KioskPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
}
$securePassword = ConvertTo-SecureString $KioskPassword -AsPlainText -Force

# ── Step 1: Shell Launcher Feature ──

$totalSteps = 4
Write-StepHeader 1 $totalSteps "Shell Launcher feature"

if (Test-ShellLauncherFeatureEnabled) {
    Write-Host "    Already enabled" -ForegroundColor Yellow
} else {
    Write-Host "    Enabling via DISM (this may take a moment)..."
    $result = Enable-WindowsOptionalFeature -Online -FeatureName "Client-ShellLauncher" -All -NoRestart
    if ($result.RestartNeeded) {
        Write-Host "    Feature enabled — reboot required before WMI is available" -ForegroundColor Yellow
    } else {
        Write-Host "    Feature enabled" -ForegroundColor Green
    }
}

# ── Step 2: Kiosk User Account ──

Write-StepHeader 2 $totalSteps "Kiosk user account"
Initialize-KioskUser -Username $KioskUser -SecurePassword $securePassword

# ── Step 3: Auto-Logon ──

Write-StepHeader 3 $totalSteps "Auto-logon"
Set-AutoLogon -Username $KioskUser -Password $KioskPassword

# ── Step 4: Shell Launcher Configuration ──

Write-StepHeader 4 $totalSteps "Shell Launcher configuration"

if (Test-ShellLauncherWmiAvailable) {
    Set-ShellLauncherForUser -Username $KioskUser -ShellPath $appExe
} else {
    Write-Host ""
    Write-Host "    Shell Launcher WMI is not yet available." -ForegroundColor Yellow
    Write-Host "    This is normal when the feature was just enabled." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Steps 1-3 are complete and will persist across reboot." -ForegroundColor Green
    Write-Host ""
    Write-Host "    Next:" -ForegroundColor White
    Write-Host "      1. Reboot this computer" -ForegroundColor White
    Write-Host "      2. Run this script again to finish step 4" -ForegroundColor White
    Write-Host ""
    exit 0
}

# ── Summary ──

Write-Banner "Setup Complete!"
Write-Host "  Kiosk user:    $KioskUser"
Write-Host "  Password:      $KioskPassword"
Write-Host "  App shell:     $appExe"
Write-Host "  Default PIN:   0000  (change via in-app admin panel)"
Write-Host ""
Write-Host "  Next: Reboot this computer to activate kiosk mode." -ForegroundColor Green
Write-Host ""
Write-Host "  After reboot, the app launches automatically." -ForegroundColor White
Write-Host "  Use the in-app admin panel (tap corner 5x, enter PIN)" -ForegroundColor White
Write-Host "  to configure camera, printer, appearance, etc." -ForegroundColor White
Write-Host ""
Write-Host "  To access Windows desktop:" -ForegroundColor Yellow
Write-Host "    1. Press Ctrl+Alt+Del"
Write-Host "    2. Click 'Sign out'"
Write-Host "    3. Log in with your admin account"
Write-Host ""
Write-Host "  To undo: run kiosk-teardown.ps1 as Administrator" -ForegroundColor Yellow
Write-Host ""
```

- [ ] **Step 2: Verify the script parses without syntax errors**

Run (on Windows, or with `pwsh` if available):

```
pwsh -NoExecute -File scripts/kiosk-setup.ps1
```

If `pwsh` is not available, verify manually that all braces, quotes, and param blocks are balanced.

- [ ] **Step 3: Commit**

```bash
git add scripts/kiosk-setup.ps1
git commit -m "feat: add Shell Launcher kiosk setup script (Tier 1 hard kiosk)"
```

---

## Task 2: Create `scripts/kiosk-teardown.ps1`

**Files:**

- Create: `scripts/kiosk-teardown.ps1`

- [ ] **Step 1: Create the complete teardown script**

```powershell
#Requires -RunAsAdministrator
#Requires -Version 5.1
<#
.SYNOPSIS
    Removes Windows Shell Launcher kiosk mode for Open Photobooth.

.DESCRIPTION
    Reverses the setup performed by kiosk-setup.ps1:
    - Removes the Shell Launcher custom shell configuration
    - Disables Shell Launcher
    - Removes auto-logon
    - Deletes the kiosk user account (unless -KeepUser is specified)
    - Disables the Shell Launcher Windows feature

    Run as Administrator. Reboot after running to complete the teardown.

.PARAMETER KioskUser
    Name of the kiosk user account to remove. Default: "Photobooth"

.PARAMETER KeepUser
    If specified, the kiosk user account is preserved. Only Shell Launcher
    configuration and auto-logon are removed.

.EXAMPLE
    .\kiosk-teardown.ps1
    # Removes "Photobooth" user and all kiosk configuration.

.EXAMPLE
    .\kiosk-teardown.ps1 -KeepUser
    # Removes kiosk config but keeps the "Photobooth" user account.
#>
[CmdletBinding()]
param(
    [string]$KioskUser = "Photobooth",
    [switch]$KeepUser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Output Helpers ──────────────────────────────────────────────────────────

function Write-Banner {
    param([string]$Text)
    $line = "=" * 60
    Write-Host ""
    Write-Host $line -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host $line -ForegroundColor Cyan
    Write-Host ""
}

function Write-StepHeader {
    param([int]$Number, [int]$Total, [string]$Description)
    Write-Host ""
    Write-Host "  [$Number/$Total] $Description" -ForegroundColor White
}

# ── Main ────────────────────────────────────────────────────────────────────

Write-Banner "Open Photobooth - Kiosk Teardown"

$totalSteps = if ($KeepUser) { 3 } else { 4 }
$step = 0

# ── Step 1: Remove Shell Launcher Configuration ──

$step++
Write-StepHeader $step $totalSteps "Removing Shell Launcher configuration"

try {
    $ShellLauncherClass = [wmiclass]"\\localhost\root\standardcimv2\embedded:WESL_UserSetting"

    # Remove custom shell for the kiosk user
    $userExists = Get-LocalUser -Name $KioskUser -ErrorAction SilentlyContinue
    if ($userExists) {
        try {
            $account = New-Object System.Security.Principal.NTAccount($KioskUser)
            $sid = $account.Translate([System.Security.Principal.SecurityIdentifier]).Value
            $ShellLauncherClass.RemoveCustomShell($sid) | Out-Null
            Write-Host "    Removed custom shell for '$KioskUser'" -ForegroundColor Green
        } catch {
            Write-Host "    No custom shell was configured for '$KioskUser' — skipping" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    User '$KioskUser' does not exist — skipping shell removal" -ForegroundColor Yellow
    }

    # Disable Shell Launcher
    $ShellLauncherClass.SetEnabled($false) | Out-Null
    Write-Host "    Shell Launcher disabled" -ForegroundColor Green
} catch {
    Write-Host "    Shell Launcher WMI not available — may already be disabled" -ForegroundColor Yellow
}

# ── Step 2: Remove Auto-Logon ──

$step++
Write-StepHeader $step $totalSteps "Removing auto-logon"

$regPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty -Path $regPath -Name "AutoAdminLogon" -Value "0"
Remove-ItemProperty -Path $regPath -Name "DefaultPassword" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $regPath -Name "DefaultUserName" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $regPath -Name "DefaultDomainName" -ErrorAction SilentlyContinue
Write-Host "    Auto-logon removed" -ForegroundColor Green

# ── Step 3 (optional): Remove Kiosk User Account ──

if (-not $KeepUser) {
    $step++
    Write-StepHeader $step $totalSteps "Removing kiosk user account"

    $existing = Get-LocalUser -Name $KioskUser -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-LocalUser -Name $KioskUser
        Write-Host "    User '$KioskUser' removed" -ForegroundColor Green

        $profilePath = Join-Path "C:\Users" $KioskUser
        if (Test-Path $profilePath) {
            Write-Host "    Note: Profile directory at $profilePath remains." -ForegroundColor Yellow
            Write-Host "    It contains the app's settings and gallery for that account." -ForegroundColor Yellow
            Write-Host "    Delete it manually if no longer needed." -ForegroundColor Yellow
        }
    } else {
        Write-Host "    User '$KioskUser' not found — skipping" -ForegroundColor Yellow
    }
}

# ── Step N: Disable Shell Launcher Feature ──

$step++
Write-StepHeader $step $totalSteps "Disabling Shell Launcher feature"

$feature = Get-WindowsOptionalFeature -Online -FeatureName "Client-ShellLauncher" -ErrorAction SilentlyContinue
if ($null -ne $feature -and $feature.State -eq "Enabled") {
    Disable-WindowsOptionalFeature -Online -FeatureName "Client-ShellLauncher" -NoRestart | Out-Null
    Write-Host "    Shell Launcher feature disabled" -ForegroundColor Green
} else {
    Write-Host "    Shell Launcher feature already disabled — skipping" -ForegroundColor Yellow
}

# ── Summary ──

Write-Banner "Teardown Complete!"
Write-Host "  Reboot this computer to restore normal Windows behavior." -ForegroundColor Green
Write-Host ""
if (-not $KeepUser) {
    Write-Host "  The '$KioskUser' account has been removed." -ForegroundColor Yellow
    Write-Host "  Gallery data in that account's AppData is still on disk" -ForegroundColor Yellow
    Write-Host "  (at C:\Users\$KioskUser) — delete manually if not needed." -ForegroundColor Yellow
} else {
    Write-Host "  The '$KioskUser' account was preserved." -ForegroundColor Yellow
}
Write-Host ""
```

- [ ] **Step 2: Verify the script parses without syntax errors**

Run (on Windows, or with `pwsh` if available):

```
pwsh -NoExecute -File scripts/kiosk-teardown.ps1
```

- [ ] **Step 3: Commit**

```bash
git add scripts/kiosk-teardown.ps1
git commit -m "feat: add Shell Launcher kiosk teardown script"
```

---

## Task 3: Bundle Scripts with Windows Installer

**Files:**

- Modify: `electron-builder.yml`

The scripts need to ship alongside the installed app so the admin can find them easily. Using `extraFiles` places them at `<install-dir>/scripts/`.

- [ ] **Step 1: Add `extraFiles` entry to `electron-builder.yml`**

Add the following block after the `asarUnpack` section (before the `win:` section):

```yaml
extraFiles:
  - from: scripts/kiosk-setup.ps1
    to: scripts/kiosk-setup.ps1
  - from: scripts/kiosk-teardown.ps1
    to: scripts/kiosk-teardown.ps1
```

- [ ] **Step 2: Verify the build config is valid**

Run:

```bash
npm run build
```

Expected: TypeScript check and Vite bundle succeed. The `extraFiles` directive is consumed at packaging time (`npm run package`), not build time, so this just verifies we didn't break the YAML.

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "build: bundle kiosk scripts with Windows installer"
```

---

## Task 4: Manual Test Procedure

This task is a checklist for verifying the scripts on a Windows 11 Pro machine (or VM). It is not automated — Shell Launcher configuration requires a real Windows environment with admin privileges.

- [ ] **Step 1: Verify setup script — first run (feature enablement)**

On a Windows 11 Pro machine with Open Photobooth installed:

```powershell
# Open PowerShell as Administrator
cd "C:\Program Files\Open Photobooth\scripts"  # or wherever installed
.\kiosk-setup.ps1
```

Expected output:

- Windows edition check passes
- App executable found
- Shell Launcher feature gets enabled (or was already enabled)
- Photobooth user created
- Auto-logon configured
- If WMI not available: message saying "reboot and run again"
- If WMI available: Shell Launcher configured, summary printed

- [ ] **Step 2: Reboot and verify setup script — second run (if needed)**

If the first run said "reboot and run again":

```powershell
# After reboot, open PowerShell as Administrator
.\kiosk-setup.ps1
```

Expected: Shell Launcher configuration completes. Summary printed with kiosk user, password, and app path.

- [ ] **Step 3: Reboot and verify kiosk mode is active**

After final reboot:

- Windows should auto-login as "Photobooth" user
- Open Photobooth should launch as the shell (no desktop, no taskbar, no notification center)
- Swiping from screen edges should do nothing (no shell UI to swipe into)
- The app should be fullscreen

- [ ] **Step 4: Verify admin breakout**

1. Press Ctrl+Alt+Del
2. Click "Sign out"
3. Login screen should appear
4. Log in with admin account
5. Full Windows desktop should be available
6. Sign out of admin account → auto-logon should bring kiosk back

- [ ] **Step 5: Verify in-app admin access**

While in kiosk mode:

1. Tap the admin gesture zone (corner) 5 times
2. Enter PIN (default: 0000)
3. Admin panel should open
4. Change a setting, verify it persists after restarting the app (Ctrl+Shift+Q triggers restart via Shell Launcher)

- [ ] **Step 6: Verify teardown**

From the admin Windows account:

```powershell
# Open PowerShell as Administrator
.\kiosk-teardown.ps1
```

Expected:

- Shell Launcher configuration removed
- Auto-logon removed
- Photobooth user removed
- Shell Launcher feature disabled

After reboot:

- Normal Windows login screen (no auto-logon)
- Normal desktop behavior restored

- [ ] **Step 7: Verify idempotency**

Run `kiosk-setup.ps1` twice in a row without rebooting. Expected: second run succeeds with "already exists/enabled" messages for completed steps. No errors.

Run `kiosk-teardown.ps1` twice in a row. Expected: second run succeeds with "not found/already disabled" messages. No errors.
