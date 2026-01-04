param(
    [Parameter(Position = 0)]
    [string]$InputDir = ".\\icons",

    [Parameter(Position = 1)]
    [string]$OutputDir = ".\\icons-trimmed",

    [ValidateSet("Alpha", "Color")]
    [string]$Mode = "Alpha",

    # Used for Mode=Alpha: pixels with Alpha <= AlphaThreshold are treated as empty
    [ValidateRange(0, 255)]
    [int]$AlphaThreshold = 0,

    # Used for Mode=Color: background color to treat as "whitespace"
    [string]$Background = "#FFFFFF",

    # Used for Mode=Color: max per-channel difference from background that still counts as whitespace
    [ValidateRange(0, 255)]
    [int]$Tolerance = 8,

    # If set, overwrite original files in-place (dangerous)
    [switch]$InPlace
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertFrom-HexColor {
    param([Parameter(Mandatory)] [string]$Hex)

    $h = $Hex.Trim()
    if ($h.StartsWith("#")) { $h = $h.Substring(1) }
    if ($h.Length -eq 3) {
        $h = "{0}{0}{1}{1}{2}{2}" -f $h[0], $h[1], $h[2]
    }
    if ($h.Length -ne 6) {
        throw "Background must be #RRGGBB or #RGB (got: '$Hex')"
    }

    $r = [Convert]::ToInt32($h.Substring(0, 2), 16)
    $g = [Convert]::ToInt32($h.Substring(2, 2), 16)
    $b = [Convert]::ToInt32($h.Substring(4, 2), 16)

    return [pscustomobject]@{ R = $r; G = $g; B = $b }
}

# System.Drawing is built-in on Windows PowerShell 5.1
Add-Type -AssemblyName System.Drawing

$inputPath = (Resolve-Path -LiteralPath $InputDir).Path

if ($InPlace) {
    $outputPath = $inputPath
} else {
    $outputPath = (Resolve-Path -LiteralPath (New-Item -ItemType Directory -Force -Path $OutputDir)).Path
}

$bg = ConvertFrom-HexColor -Hex $Background

$extensions = @(".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff")
$files = Get-ChildItem -LiteralPath $inputPath -File | Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() }

if (-not $files) {
    Write-Host "No images found in: $inputPath"
    exit 0
}

function Test-ContentPixel {
    param(
        [Parameter(Mandatory)] [System.Drawing.Color]$Color,
        [Parameter(Mandatory)] [string]$Mode,
        [Parameter(Mandatory)] [int]$AlphaThreshold,
        [Parameter(Mandatory)] $Bg,
        [Parameter(Mandatory)] [int]$Tolerance
    )

    if ($Mode -eq "Alpha") {
        return ($Color.A -gt $AlphaThreshold)
    }

    # Mode=Color
    # If it has alpha and is transparent-ish, treat as whitespace anyway
    if ($Color.A -le $AlphaThreshold) { return $false }

    $dr = [Math]::Abs([int]$Color.R - [int]$Bg.R)
    $dg = [Math]::Abs([int]$Color.G - [int]$Bg.G)
    $db = [Math]::Abs([int]$Color.B - [int]$Bg.B)

    # If it's close to the background in all channels, consider it whitespace
    return -not (($dr -le $Tolerance) -and ($dg -le $Tolerance) -and ($db -le $Tolerance))
}

$written = 0
$skipped = 0

foreach ($f in $files) {
    $src = $f.FullName
    $dst = if ($InPlace) { $src } else { Join-Path $outputPath ($f.BaseName + ".png") }

    $bmp = $null
    $cropped = $null

    try {
        $bmp = New-Object System.Drawing.Bitmap($src)

        $minX = $bmp.Width
        $minY = $bmp.Height
        $maxX = -1
        $maxY = -1

        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $c = $bmp.GetPixel($x, $y)
                if (Test-ContentPixel -Color $c -Mode $Mode -AlphaThreshold $AlphaThreshold -Bg $bg -Tolerance $Tolerance) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }

        if ($maxX -lt 0 -or $maxY -lt 0) {
            # No content pixels detected — just copy/emit as-is
            if (-not $InPlace) {
                $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
            }
            Write-Host "[skip] $($f.Name) (no content detected)"
            $skipped++
            continue
        }

        $rect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
        $cropped = $bmp.Clone($rect, $bmp.PixelFormat)

        # Always write PNG so alpha is preserved when present
        $cropped.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "[ok]   $($f.Name) -> $(Split-Path -Leaf $dst)  ($($bmp.Width)x$($bmp.Height) -> $($rect.Width)x$($rect.Height))"
        $written++
    } catch {
        Write-Warning "Failed: $($f.Name) : $($_.Exception.Message)"
    } finally {
        if ($cropped) { $cropped.Dispose() }
        if ($bmp) { $bmp.Dispose() }
    }
}

Write-Host "Done. Wrote: $written, Skipped: $skipped"
