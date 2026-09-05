param(
  [string]$Root = "C:\Yongin_test",
  [string]$Repository = "https://github.com/simulacre-8/Yongin.git"
)

$ErrorActionPreference = "Stop"

Write-Host "[Yongin] Preparing local workspace: $Root"
New-Item -ItemType Directory -Force -Path $Root | Out-Null

if (Test-Path (Join-Path $Root ".git")) {
  Write-Host "[Yongin] Existing repository found. Pulling main..."
  git -C $Root fetch origin main
  git -C $Root checkout main
  git -C $Root pull --ff-only origin main
} else {
  $existing = Get-ChildItem -Force -Path $Root
  if ($existing.Count -gt 0) {
    throw "$Root is not empty and is not a Git repository. Move or remove existing files first."
  }
  Write-Host "[Yongin] Cloning repository..."
  git clone $Repository $Root
}

$directories = @(
  "data\source",
  "data\approved",
  "data\projection\rdb",
  "data\projection\graph",
  "exports",
  "logs",
  "tmp"
)

foreach ($directory in $directories) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Root $directory) | Out-Null
}

$envExample = Join-Path $Root "client\.env.example"
$envLocal = Join-Path $Root "client\.env.local"
if ((Test-Path $envExample) -and -not (Test-Path $envLocal)) {
  Copy-Item $envExample $envLocal
  Write-Host "[Yongin] Created client\.env.local. Enter the Supabase public values."
}

Write-Host "[Yongin] Installing dependencies..."
Push-Location $Root
try {
  corepack enable
  pnpm install --frozen-lockfile
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "[Yongin] Workspace ready."
Write-Host "  Project:     $Root"
Write-Host "  Source data: $(Join-Path $Root 'data\source')"
Write-Host "  Approved:    $(Join-Path $Root 'data\approved')"
Write-Host "  Projection:  $(Join-Path $Root 'data\projection')"
Write-Host "  Logs:        $(Join-Path $Root 'logs')"
Write-Host ""
Write-Host "Run: cd $Root; pnpm dev"
