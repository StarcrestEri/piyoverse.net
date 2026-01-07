$ErrorActionPreference = 'Stop'

# Minifies JS for deployment. Keeps a local readable copy in src-unminified/ (gitignored).
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$backupDir = Join-Path $root 'src-unminified'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$files = @(
  'anti-inspect.js',
  'bandcamp-popup.js',
  'ie-compat.js',
  'ie-fixes.js',
  'legacy-lowend.js',
  'market-audio.js',
  'pwa.js',

  'spa.js',
  'sw.js'
)

function Assert-File($path) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing file: $path"
  }
}

foreach ($f in $files) {
  $srcPath = Join-Path $root $f
  Assert-File $srcPath

  $backupPath = Join-Path $backupDir $f
  Copy-Item -LiteralPath $srcPath -Destination $backupPath -Force

  # Use terser (ES5 output for IE11 / older engines). Overwrite in-place.
  $tmpOut = Join-Path $root ($f + '.min.tmp')

  & npx --yes terser $srcPath `
    --compress ecma=5 `
    --mangle `
    --ecma 5 `
    --comments false `
    --output $tmpOut

  if (-not (Test-Path -LiteralPath $tmpOut)) {
    throw "Minify failed for: $f"
  }

  Move-Item -LiteralPath $tmpOut -Destination $srcPath -Force
  Write-Host "Minified: $f"
}

Write-Host "Done. Unminified backups are in src-unminified/ (not committed)."
