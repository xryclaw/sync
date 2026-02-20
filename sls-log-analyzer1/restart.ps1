# SLS 日志分析平台 - 一键重启脚本
# 使用方法: .\restart.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SLS 日志分析平台 - 重启中..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# 停止服务
Write-Host "🛑 停止现有服务..." -ForegroundColor Yellow
& (Join-Path $projectRoot "stop.ps1")

Write-Host ""
Write-Host "⏳ 等待 2 秒..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# 启动服务
Write-Host ""
Write-Host "🚀 重新启动服务..." -ForegroundColor Yellow
& (Join-Path $projectRoot "start.ps1")
