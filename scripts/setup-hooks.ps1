# Ativa o build gate (pre-commit). Rode UMA vez por clone do repo:
#   pwsh scripts/setup-hooks.ps1   (ou: powershell scripts\setup-hooks.ps1)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

git config core.hooksPath .githooks
Write-Host "✅ core.hooksPath = .githooks (build gate ativo)" -ForegroundColor Green
Write-Host "   Commits que tocam apps/web ou o Dockerfile agora rodam 'docker compose build web' antes." -ForegroundColor DarkGray
Write-Host "   Docker Desktop precisa estar rodando. Para desativar: git config --unset core.hooksPath" -ForegroundColor DarkGray
