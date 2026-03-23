param(
    [switch]$install,
    [switch]$migrate,
    [switch]$dev
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=== WeOrder Start Script ===" -ForegroundColor Cyan
Write-Host ""

if ($install) {
    Write-Host "[1/2] Installing Server Packages..." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\server"
    npm install
    
    Write-Host "[2/2] Installing Client Packages..." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\client"
    npm install
    
    Set-Location $PSScriptRoot
    Write-Host "Packages Installation Completed!" -ForegroundColor Green
}

if ($migrate) {
    Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\server"
    
    $env:DATABASE_URL = "postgresql://weorder:weorder_pass@localhost:5432/weorder"
    npx prisma migrate dev --name init
    
    Set-Location $PSScriptRoot
    Write-Host "DB Migration Completed!" -ForegroundColor Green
}

if ($dev) {
    Write-Host "Starting Development Server..." -ForegroundColor Yellow
    Write-Host "  Backend: http://localhost:4000" -ForegroundColor Cyan
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Open http://localhost:5173 in your browser!" -ForegroundColor Green
    Write-Host "(Press Ctrl+C to terminate)" -ForegroundColor Gray
    Write-Host ""
    
    npx -y concurrently "cd server && npm run dev" "cd client && npm run dev"
}

if (-not ($install -or $migrate -or $dev)) {
    Write-Host "Usage:"
    Write-Host "  .\start.ps1 -install    # Install Packages"
    Write-Host "  .\start.ps1 -migrate    # DB Migration (Requires PostgreSQL)"
    Write-Host "  .\start.ps1 -dev        # Start Development Server"
    Write-Host ""
    Write-Host "Full Setup (First Run):"
    Write-Host "  1. Install Docker Desktop and run: docker compose up -d"
    Write-Host "  2. .\start.ps1 -install"
    Write-Host "  3. .\start.ps1 -migrate"
    Write-Host "  4. .\start.ps1 -dev"
}
