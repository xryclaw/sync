# SLS Log Analyzer - Stop Script
# Usage: .\stop.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stopping SLS Log Analyzer..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$pidFile = Join-Path $projectRoot ".pids"

# Function to kill processes on specific ports
function Stop-ProcessesOnPorts ($ports) {
    foreach ($port in $ports) {
        $listeningProcesses = (netstat -ano | Select-String ":$port" | Select-String "LISTENING")
        if ($listeningProcesses) {
            Write-Host "  Found processes listening on port $port. Attempting to terminate..." -ForegroundColor Yellow
            $listeningProcesses | ForEach-Object {
                $line = $_
                # Extract PID more robustly
                if ($line -match '\s+(\d+)\s*$') {
                    $processId = [int]$Matches[1]
                    try {
                        $proc = Get-Process -Id $processId -ErrorAction Stop
                        Write-Host "    Terminating process $($proc.ProcessName) (PID: $processId) on port $port." -ForegroundColor Gray
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    } catch {
                        Write-Host "    Process with PID $processId not found or already terminated. (Error: $_.Exception.Message)" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "    Could not extract PID from line: $line" -ForegroundColor Yellow
                }
            }
        }
    }
}

# Function to kill all node processes related to the project
function Stop-ProjectNodeProcesses ($projectPath) {
    Write-Host "  Searching for all Node.js processes related to project: $projectPath" -ForegroundColor Green
    $projectNodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        ($_.Path -like "*$projectPath*") -or ($_.CommandLine -like "*$projectPath*")
    }

    if ($projectNodeProcesses) {
        Write-Host "  Found $($projectNodeProcesses.Count) Node.js processes related to the project. Forcibly stopping them..." -ForegroundColor Yellow
        $projectNodeProcesses | ForEach-Object {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "    [OK] Stopped Node.js process PID: $($_.Id) (Name: $($_.ProcessName))" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No additional Node.js processes related to the project found." -ForegroundColor Gray
    }
}


# --- Main Logic ---

# 1. Always attempt to kill processes by port (more robust initial cleanup)
Stop-ProcessesOnPorts @(3000, 5173, 5000) # Include 5000 as a precaution

# 2. Attempt to kill processes based on PID file (if exists)
if (Test-Path $pidFile) {
    Write-Host ""
    Write-Host "Stopping services via PID file..." -ForegroundColor Green
    $pids = (Get-Content $pidFile).Split(',')
    $backendPid = [int]$pids[0]
    $frontendPid = [int]$pids[1]

    # Stop backend
    try {
        $backendProcess = Get-Process -Id $backendPid -ErrorAction Stop
        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Backend stopped (PID: $backendPid)" -ForegroundColor Gray
    } catch {
        Write-Host "  [WARN] Backend process not found (PID: $backendPid). (Error: $_.Exception.Message)" -ForegroundColor Yellow
    }

    # Stop frontend
    try {
        $frontendProcess = Get-Process -Id $frontendPid -ErrorAction Stop
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Frontend stopped (PID: $frontendPid)" -ForegroundColor Gray
    } catch {
        Write-Host "  [WARN] Frontend process not found (PID: $frontendPid). (Error: $_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "  [WARN] No PID file found. Skipping PID-based termination." -ForegroundColor Yellow
}

# 3. Aggressively kill any remaining Node.js processes related to this project
Write-Host ""
Stop-ProjectNodeProcesses $projectRoot

# 4. Clean up Vite related processes (sometimes left behind)
Write-Host ""
Write-Host "  Cleaning up Vite related processes..." -ForegroundColor Gray
$viteProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*vite*"
}
if ($viteProcesses) {
    $viteProcesses | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "    [OK] Stopped Vite-related process PID: $($_.Id)" -ForegroundColor Gray
    }
} else {
    Write-Host "    No Vite-related processes found." -ForegroundColor Gray
}

# 5. Clean up temporary batch files and PID file
Write-Host ""
Write-Host "  Cleaning up temporary files..." -ForegroundColor Gray
$backendBat = Join-Path $projectRoot ".start-backend.bat"
$frontendBat = Join-Path $projectRoot ".start-frontend.bat"
Remove-Item $backendBat -Force -ErrorAction SilentlyContinue
Remove-Item $frontendBat -Force -ErrorAction SilentlyContinue
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services stopped." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
