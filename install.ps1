# Installs the machine_asylum YT Tool CEP panel for the current Windows user and
# enables unsigned-extension debug mode (no Adobe signing cert assumed).
# Run this, restart Premiere Pro, then open Window > Extensions > machine_asylum YT Tool.

$ErrorActionPreference = "Stop"

$sourceDir = $PSScriptRoot
$destRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$destDir = Join-Path $destRoot "machine_asylum_YT_Tool"

Write-Host "Installing machine_asylum YT Tool panel..."
Write-Host "  Source: $sourceDir"
Write-Host "  Target: $destDir"

if (-not (Test-Path $destRoot)) {
    New-Item -ItemType Directory -Path $destRoot -Force | Out-Null
}

if (Test-Path $destDir) {
    Write-Host "  Removing previous install at that path..."
    Remove-Item -Path $destDir -Recurse -Force
}
New-Item -ItemType Directory -Path $destDir -Force | Out-Null

$exclude = @(".claude", ".git", "install.ps1")
Get-ChildItem -Path $sourceDir -Force |
    Where-Object { $exclude -notcontains $_.Name } |
    ForEach-Object { Copy-Item -Path $_.FullName -Destination $destDir -Recurse -Force }

Write-Host "Enabling unsigned-extension debug mode (PlayerDebugMode)..."
foreach ($v in 6..20) {
    $key = "HKCU:\Software\Adobe\CSXS.$v"
    if (-not (Test-Path $key)) {
        New-Item -Path $key -Force | Out-Null
    }
    New-ItemProperty -Path $key -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
}

Write-Host ""
Write-Host "Done. Restart Premiere Pro, then open:"
Write-Host "  Window > Extensions > machine_asylum YT Tool"
