# SLS 日志分析平台 - 状态检查脚本
# 使用方法: .\status.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SLS 日志分析平台 - 状态检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$pidFile = Join-Path $projectRoot ".pids"

# 检查 PID 文件
if (-not (Test-Path $pidFile)) {
    Write-Host "❌ 服务未运行" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 使用 .\start.ps1 启动服务" -ForegroundColor Gray
    exit 0
}

# 读取 PID
$pids = (Get-Content $pidFile).Split(',')
$backendPid = [int]$pids[0]
$frontendPid = [int]$pids[1]

Write-Host "📊 进程状态:" -ForegroundColor Green
Write-Host ""

# 检查后端
$backendRunning = $false
try {
    $backendProcess = Get-Process -Id $backendPid -ErrorAction Stop
    $backendRunning = $true
    Write-Host "   ✅ 后端: 运行中" -ForegroundColor Green
    Write-Host "      PID: $backendPid" -ForegroundColor Gray
    Write-Host "      内存: $([math]::Round($backendProcess.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "      CPU: $($backendProcess.CPU)s" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 后端: 已停止" -ForegroundColor Red
}

Write-Host ""

# 检查前端
$frontendRunning = $false
try {
    $frontendProcess = Get-Process -Id $frontendPid -ErrorAction Stop
    $frontendRunning = $true
    Write-Host "   ✅ 前端: 运行中" -ForegroundColor Green
    Write-Host "      PID: $frontendPid" -ForegroundColor Gray
    Write-Host "      内存: $([math]::Round($frontendProcess.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "      CPU: $($frontendProcess.CPU)s" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 前端: 已停止" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# 检查端口
Write-Host ""
Write-Host "🌐 端口检查:" -ForegroundColor Green
Write-Host ""

$backendPort = netstat -ano | Select-String ":3000" | Select-String "LISTENING"
$frontendPort = netstat -ano | Select-String ":5173" | Select-String "LISTENING"

if ($backendPort) {
    Write-Host "   ✅ 后端端口 3000: 监听中" -ForegroundColor Green
} else {
    Write-Host "   ❌ 后端端口 3000: 未监听" -ForegroundColor Red
}

if ($frontendPort) {
    Write-Host "   ✅ 前端端口 5173: 监听中" -ForegroundColor Green
} else {
    Write-Host "   ❌ 前端端口 5173: 未监听" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# 访问地址
if ($backendRunning -and $frontendRunning) {
    Write-Host ""
    Write-Host "📍 访问地址:" -ForegroundColor White
    Write-Host "   前端: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "   后端: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
}
