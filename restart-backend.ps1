param(
    [switch] $ValidateOnly,
    [switch] $Elevated
)

$ErrorActionPreference = "Stop"

function Get-ZhText([string] $Base64) {
    [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64))
}

function Write-Bilingual(
    [string] $ChineseBase64,
    [string] $English,
    [ConsoleColor] $Color = [ConsoleColor]::Gray
) {
    $chinese = Get-ZhText $ChineseBase64
    Write-Host "[OpenClassBook] $chinese / $English" -ForegroundColor $Color
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Request-ElevatedRestart {
    Write-Bilingual `
        "5qOA5rWL5Yiw5Y+X5L+d5oqk55qE5ZCO56uv6L+b56iL77yM5q2j5Zyo6K+35rGC566h55CG5ZGY5p2D6ZmQ4oCm4oCm" `
        "A protected backend process was detected. Requesting administrator access..." `
        Yellow
    Write-Bilingual `
        "6K+35Zyo55So5oi36LSm5oi35o6n5Yi256qX5Y+j5Lit5YWB6K645pys6ISa5pys6L+Q6KGM44CC" `
        "Allow this script in the User Account Control window." `
        Yellow

    $arguments = (
        "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Elevated"
    )
    try {
        $elevatedProcess = Start-Process `
            -FilePath "powershell.exe" `
            -ArgumentList $arguments `
            -Verb RunAs `
            -Wait `
            -PassThru
        exit $elevatedProcess.ExitCode
    }
    catch {
        Write-Bilingual `
            "566h55CG5ZGY5p2D6ZmQ6K+35rGC6KKr5Y+W5raI44CC" `
            "The administrator request was cancelled." `
            Red
        exit 1
    }
}

$backendDirectory = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path -LiteralPath $backendDirectory -PathType Container)) {
    Write-Bilingual `
        "5pyq5om+5YiwIGJhY2tlbmQg55uu5b2V44CC" `
        "The backend directory was not found." `
        Red
    exit 1
}

if ($ValidateOnly) {
    Write-Bilingual `
        "6ISa5pys6aqM6K+B6YCa6L+H44CC" `
        "Script validation passed." `
        Green
    exit 0
}

Write-Bilingual `
    "5q2j5Zyo5qOA5p+l5ZCO56uv6L+b56iL4oCm4oCm" `
    "Checking the backend process..." `
    Cyan

$listeners = @(
    Get-NetTCPConnection `
        -LocalPort 8000 `
        -State Listen `
        -ErrorAction SilentlyContinue
)

foreach ($processId in ($listeners.OwningProcess | Select-Object -Unique)) {
    $process = Get-CimInstance `
        Win32_Process `
        -Filter "ProcessId=$processId" `
        -ErrorAction SilentlyContinue

    if (-not $process) {
        if (-not (Test-Administrator)) {
            Request-ElevatedRestart
        }

        & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
        Start-Sleep -Milliseconds 500
        continue
    }

    $isOpenClassBookBackend = (
        $process -and
        $process.Name -match "^python(w)?\.exe$" -and
        $process.CommandLine -match "uvicorn.+app\.main:app"
    )

    if (-not $isOpenClassBookBackend) {
        $chinese = Get-ZhText `
            "ODAwMCDnq6/lj6Pooqvlhbbku5bnqIvluo/ljaDnlKjvvIzor7flhYjlhbPpl63vvJo="
        $processName = if ($process) { $process.Name } else { "PID $processId" }
        Write-Host `
            "[OpenClassBook] $chinese $processName / Port 8000 is used by another process: $processName" `
            -ForegroundColor Red
        exit 1
    }

    try {
        Stop-Process -Id $processId -Force
    }
    catch {
        if (-not (Test-Administrator)) {
            Request-ElevatedRestart
        }
        throw
    }
    Write-Bilingual `
        "5bey5YGc5q2i5pen5ZCO56uv44CC" `
        "Previous backend stopped." `
        Yellow
}

Start-Sleep -Milliseconds 300
$remainingListeners = @(
    Get-NetTCPConnection `
        -LocalPort 8000 `
        -State Listen `
        -ErrorAction SilentlyContinue
)
if ($remainingListeners) {
    if (-not (Test-Administrator)) {
        Request-ElevatedRestart
    }
    Write-Bilingual `
        "5peg5rOV6YeK5pS+IDgwMDAg56uv5Y+j77yM6K+36YeN5ZCvIFdpbmRvd3Mg5ZCO5YaN6K+V44CC" `
        "Port 8000 could not be released. Restart Windows and try again." `
        Red
    exit 1
}

if ($listeners) {
    Write-Bilingual `
        "ODAwMCDnq6/lj6Plt7Lph4rmlL7jgII=" `
        "Port 8000 was released." `
        Green
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Bilingual `
        "5pyq5om+5YiwIFB5dGhvbu+8jOivt+WFiOWuieijheW5tuWKoOWFpSBQQVRI44CC" `
        "Python was not found. Install it and add it to PATH." `
        Red
    exit 1
}

Set-Location -LiteralPath $backendDirectory
Write-Host ""
Write-Bilingual `
    "5q2j5Zyo5ZCv5Yqo5ZCO56uv77ya" `
    "Starting backend:" `
    Green
Write-Host "http://localhost:8000" -ForegroundColor Green
Write-Bilingual `
    "5oyJIEN0cmwrQyDlj6/lgZzmraLjgII=" `
    "Press Ctrl+C to stop." `
    DarkGray
Write-Host ""

& $python.Source -m uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
$backendExitCode = $LASTEXITCODE

if ($backendExitCode -ne 0) {
    Write-Host ""
    Write-Bilingual `
        "5ZCO56uv5ZCv5Yqo5aSx6LSl44CC" `
        "Backend failed to start." `
        Red
    exit $backendExitCode
}
