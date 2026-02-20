# SLS Log Analyzer - Start Script
# Usage: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting SLS Log Analyzer..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$pidFile = Join-Path $projectRoot ".pids"

# Clean up existing PID file
if (Test-Path $pidFile) {
    Write-Host "Cleaning up existing PID file..." -ForegroundColor Yellow
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Check Node.js
Write-Host "Checking environment..." -ForegroundColor Green
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  [ERROR] Node.js not found. Please install Node.js (v18+) and ensure it's in your PATH." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Gray

# Check dependencies
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Green

function Install-NpmDependencies ($path) {
    Write-Host "  Installing dependencies for $path..." -ForegroundColor Yellow
    Push-Location $path
    npm install --silent
    Pop-Location
}

if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Install-NpmDependencies $backendPath
}

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Install-NpmDependencies $frontendPath
}

Write-Host "  [OK] Dependencies ready" -ForegroundColor Gray

# Create temp batch files for background execution
$backendBat = Join-Path $projectRoot ".start-backend.bat"
$frontendBat = Join-Path $projectRoot ".start-frontend.bat"

# Backend start script content
$backendScriptContent = @"
@echo off
cd /d "%backendPath%"
node src/app.js
"@ -replace '%backendPath%', $backendPath # Replace placeholder
[System.IO.File]::WriteAllText($backendBat, $backendScriptContent)

# Frontend start script content
$frontendScriptContent = @"
@echo off
cd /d "%frontendPath%"
npm run dev
"@ -replace '%frontendPath%', $frontendPath # Replace placeholder
[System.IO.File]::WriteAllText($frontendBat, $frontendScriptContent)

# Start backend
Write-Host ""
Write-Host "Starting backend service..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath $backendBat -PassThru -WindowStyle Hidden -ErrorAction Stop

if ($backendProcess) {
    Write-Host "  [OK] Backend started (PID: $($backendProcess.Id))" -ForegroundColor Gray
    Write-Host "  [URL] http://localhost:3000" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Backend failed to start." -ForegroundColor Red
    Remove-Item $backendBat -Force -ErrorAction SilentlyContinue
    Remove-Item $frontendBat -Force -ErrorAction SilentlyContinue
    exit 1
}

# Wait for backend to be ready and perform a basic health check
Write-Host "  Waiting for backend readiness (10s + health check)..." -ForegroundColor Gray
Start-Sleep -Seconds 10
try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSeconds 5 -ErrorAction Stop
    if ($backendHealth.StatusCode -eq 200) {
        Write-Host "  [OK] Backend health check passed." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Backend health check failed (Status Code: $($backendHealth.StatusCode))." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARN] Backend health check failed (could not connect to http://localhost:3000). Error: $_.Exception.Message" -ForegroundColor Yellow
}




# Start frontend
Write-Host ""
Write-Host "Starting frontend service..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath $frontendBat -PassThru -WindowStyle Hidden -ErrorAction Stop

if ($frontendProcess) {
    Write-Host "  [OK] Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Gray
    Write-Host "  [URL] http://localhost:5173" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Frontend failed to start." -ForegroundColor Red
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $backendBat -Force -ErrorAction SilentlyContinue
    Remove-Item $frontendBat -Force -ErrorAction SilentlyContinue
    exit 1
}

# Save PIDs
"$($backendProcess.Id),$($frontendProcess.Id)" | Out-File -FilePath $pidFile -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services started successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commands:" -ForegroundColor White
Write-Host "  .\stop.ps1    - Stop services" -ForegroundColor Gray
Write-Host "  .\status.ps1  - Check status" -ForegroundColor Gray
Write-Host ""
