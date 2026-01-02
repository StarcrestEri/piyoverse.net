<#
Usage: Run this from the repository root in PowerShell.
Ensure `ffmpeg` is installed and on PATH.

This script:
- Creates an `Audio` folder in the repo root if missing
- Finds all `.ogg` files under the repo
- Converts each to `.mp3` using `ffmpeg` (quality ~VBR 2)
- Copies the original `.ogg` into `Audio/`

Examples:
  pwsh ./convert-audio.ps1
  ./convert-audio.ps1
#>

Set-StrictMode -Version Latest

$root = Get-Location
$outDir = Join-Path $root 'Audio'
if(-not (Test-Path $outDir)){
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

if(-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)){
    Write-Error "ffmpeg not found. Please install ffmpeg and ensure it's on PATH. See https://ffmpeg.org/download.html"
    exit 1
}

$oggFiles = Get-ChildItem -Path $root -Recurse -Filter *.ogg -File -ErrorAction SilentlyContinue
if(-not $oggFiles){
    Write-Output "No .ogg files found under $root"
    exit 0
}

foreach($f in $oggFiles){
    try{
        $base = [IO.Path]::GetFileNameWithoutExtension($f.Name)
        $mp3Path = Join-Path $outDir ($base + '.mp3')
        $oggDest = Join-Path $outDir $f.Name

        Write-Output "Converting $($f.FullName) -> $mp3Path"
        & ffmpeg -y -hide_banner -loglevel error -i "$($f.FullName)" -vn -acodec libmp3lame -q:a 2 "$mp3Path"

        Write-Output "Copying original to $oggDest"
        Copy-Item -Path $f.FullName -Destination $oggDest -Force
    } catch{
        Write-Warning "Failed for $($f.FullName): $_"
    }
}

Write-Output "Done. Put the generated files in the Audio/ folder (already placed there)."
