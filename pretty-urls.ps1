<#
Pretty URLs helper for static site

What it does:
- Finds all `.html` files in the repository root (non-recursive) except `index.html`.
- Creates a folder for each (e.g. `marketplace.html` -> `marketplace/index.html`).
- Updates references across the repo that point to `NAME.html` and rewrites them to `NAME/` (keeps query/hash intact).

Usage (from repo root):
  pwsh .\pretty-urls.ps1

Notes:
- This updates files in-place. Commit or back up your repo first.
- It only handles filenames at the repository root. If page files are in subfolders, run from that folder instead.
#>

Set-StrictMode -Version Latest

$root = Get-Location
Write-Output "Repo root: $root"

# collect html files at root (non-recursive)
$htmlFiles = Get-ChildItem -Path $root -Filter *.html -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'index.html' }
if(-not $htmlFiles){ Write-Output "No root .html files found (except index.html). Nothing to do."; exit 0 }

Write-Output "Found HTML files to convert:"; $htmlFiles | ForEach-Object { Write-Output " - $($_.Name)" }

# build replacement map: key = original filename, value = dirname with trailing slash
$map = @{}
foreach($f in $htmlFiles){
  $base = [IO.Path]::GetFileNameWithoutExtension($f.Name)
  $map[$f.Name] = "$base/"
}

# replace occurrences across all text files (skip common binary extensions)
Write-Output "Updating references across repository..."
$skipExt = @('.exe','.dll','.png','.jpg','.jpeg','.gif','.ico','.woff','.woff2','.ttf','.map')
$allFiles = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $skipExt -notcontains $_.Extension }

foreach($file in $allFiles){
  try{
    $text = Get-Content -Raw -LiteralPath $file.FullName -ErrorAction Stop
    $orig = $text
    foreach($origName in $map.Keys){
      # simple, safe global replace of the filename with the folder/ URL
      $escaped = [regex]::Escape($origName)
      $replacement = $map[$origName]
      $text = [regex]::Replace($text, $escaped, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase, [ref]$null) -replace $escaped, $replacement
      # fallback using -replace if previous didn't change (some file encodings)
      if($text -eq $orig){ $text = $text -replace $escaped, $replacement }
    }
    if($text -ne $orig){
      Set-Content -LiteralPath $file.FullName -Value $text -Force
      Write-Output "Updated: $($file.FullName)"
    }
  } catch{
    Write-Warning "Skipped $($file.FullName): $_"
  }
}

# move root html files into folders with index.html
Write-Output "Moving HTML files into folder/index.html..."
foreach($f in $htmlFiles){
  try{
    $base = [IO.Path]::GetFileNameWithoutExtension($f.Name)
    $newDir = Join-Path $root $base
    if(-not (Test-Path $newDir)) { New-Item -ItemType Directory -Path $newDir | Out-Null }
    $dest = Join-Path $newDir 'index.html'
    Write-Output "Moving $($f.FullName) -> $dest"
    Move-Item -LiteralPath $f.FullName -Destination $dest -Force
  } catch{
    Write-Warning "Failed to move $($f.FullName): $_"
  }
}

Write-Output "Done. Review changes and commit them if correct."
