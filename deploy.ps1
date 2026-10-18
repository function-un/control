# Strict Windows automation error handling constraints
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "STARTING AUTOMATED SYSTEM ADMINISTRATION LIFECYCLE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Environment System Verification Check
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "CRITICAL ERROR: Node.js or npm environment paths are missing." -ForegroundColor Red
    Write-Host "Please install Node.js (https://nodejs.org) before running this script." -ForegroundColor Yellow
    Exit 1
}

# 2. PORT AUDITING & RESOLUTION: Force close any application blocking Port 3000
Write-Host "STEP 1: Auditing system network ports for conflicts..." -ForegroundColor Yellow
$PortConflict = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($PortConflict) {
    # Extract unique process IDs actively holding onto Port 3000
    $PIDsToKill = $PortConflict | Select-Object -ExpandProperty OwningProcess -Unique
    
    # FIXED: Replaced reserved system variable $PID with $TargetPID to prevent collision errors
    foreach ($TargetPID in $PIDsToKill) {
        Write-Host "Conflict identified: Process ID $TargetPID is holding Port 3000." -ForegroundColor Gray
        Write-Host "Forcefully terminating zombie process $TargetPID..." -ForegroundColor Yellow
        Stop-Process -Id $TargetPID -Force -ErrorAction SilentlyContinue
    }
    # Allow the Windows networking subsystem stack a brief window to completely recycle the port allocation
    Start-Sleep -Seconds 2
    Write-Host "Port 3000 cleared cleanly." -ForegroundColor Green
} else {
    Write-Host "Port 3000 is clear. No conflicts identified." -ForegroundColor Green
}

# 3. Synchronize Underlying Production Dependencies
Write-Host "STEP 2: Verifying node framework dependencies..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -NoNewWindow -Wait

# 4. Spin up the Background Network Relay Server
Write-Host "STEP 3: Initializing ConnectWise relay server..." -ForegroundColor Yellow
$ServerProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start" -NoNewWindow -PassThru

# Give the backend server process 2 seconds to bind securely to the freshly cleared socket
Start-Sleep -Seconds 2

# 5. Launch Automated Chrome Endpoint (Silent Bypassing Flags)
Write-Host "STEP 4: Launching automated browser console window..." -ForegroundColor Green
# These flags instruct Chrome to auto-approve the 'Entire screen' request from our client UI
Start-Process "chrome.exe" -ArgumentList "http://localhost:3000 --auto-select-desktop-capture-source=Entire --enable-usermedia-screen-capturing --use-fake-ui-for-media-stream"

Write-Host "==================================================" -ForegroundColor Green
Write-Host "SUCCESS: ConnectWise Clone deployed and tracking." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
