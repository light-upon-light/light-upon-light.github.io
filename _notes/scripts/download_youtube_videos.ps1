# Downloads YouTube videos and playlists to local storage.
# Requires `uv`, `deno`, and `ffmpeg`, with a modern Python version as uv's default.
# Runs yt-dlp through `uv tool run yt-dlp`.
#
# Usage:
#   .\_notes\scripts\download_youtube_videos.ps1
#   .\_notes\scripts\download_youtube_videos.ps1 -OutDir .\downloads
#   .\_notes\scripts\download_youtube_videos.ps1 -IdFile .\video_ids.txt
#   .\_notes\scripts\download_youtube_videos.ps1 `
#       -IdFile .\video_ids.txt `
#       -OutDir .\downloads `
#       -ResultsFile .\download_results.txt
#
# The input file may contain one of the following per line:
#   - YouTube video ID
#   - YouTube playlist ID
#   - list=<playlist ID>
#   - Full YouTube video or playlist URL
#
# Blank lines and lines beginning with # are ignored.
#
# Defaults:
#   Input:     .\video_ids.txt
#   Downloads: .\downloads
#   Archive:   <OutDir>\download_archive.txt
#   Report:    <OutDir>\download_results_yyyy-MM-dd_HH-mm-ss.txt

[CmdletBinding()]
param(
    [string]$OutDir = (Join-Path (Get-Location) "downloads"),

    [string]$IdFile = (Join-Path (Get-Location) "video_ids.txt"),

    [string]$ResultsFile
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv not found. Install it first: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
}

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

if ([string]::IsNullOrWhiteSpace($ResultsFile)) {
    $ResultsFile = Join-Path $OutDir "download_results_$timestamp.txt"
}
else {
    $ResultsFile = [System.IO.Path]::GetFullPath($ResultsFile)
    $resultsDirectory = Split-Path -Parent $ResultsFile

    if ($resultsDirectory) {
        New-Item -ItemType Directory -Force -Path $resultsDirectory | Out-Null
    }
}

$ArchiveFile = Join-Path $OutDir "download_archive.txt"

$IdFile = [System.IO.Path]::GetFullPath($IdFile)

if (-not (Test-Path -LiteralPath $IdFile -PathType Leaf)) {
    Write-Error "Input file not found: $IdFile"
    exit 1
}

$Inputs = @(
    Get-Content -LiteralPath $IdFile |
        ForEach-Object { $_.Trim() } |
        Where-Object {
            $_ -and
            -not $_.StartsWith("#")
        }
)

# Remove duplicate inputs while preserving their original order.
$seenInputs = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)

$Inputs = @(
    $Inputs |
        Where-Object { $seenInputs.Add($_) }
)

if ($Inputs.Count -eq 0) {
    Write-Error "No YouTube videos or playlists were found in $IdFile."
    exit 1
}

function ConvertTo-YouTubeUrl {
    param(
        [Parameter(Mandatory)]
        [string]$InputValue
    )

    # Already a full URL.
    if ($InputValue -match "^https?://") {
        return $InputValue
    }

    # list=PL...
    if ($InputValue -match "^list=(.+)$") {
        return "https://www.youtube.com/playlist?list=$($Matches[1])"
    }

    # Common YouTube playlist ID formats.
    if ($InputValue -match "^(PL|UU|LL|FL|RD|OLAK5uy_)[A-Za-z0-9_-]+$") {
        return "https://www.youtube.com/playlist?list=$InputValue"
    }

    # Otherwise treat the value as a video ID.
    return "https://youtu.be/$InputValue"
}

function Get-FailureReason {
    param(
        [Parameter(Mandatory)]
        [string[]]$OutputLines
    )

    $text = $OutputLines -join "`n"

    if ($text -match "(?im)private video") {
        return "Private video; authentication and permission are required."
    }

    if ($text -match "(?im)members[- ]only|join this channel") {
        return "Members-only video; an authorized account is required."
    }

    if ($text -match "(?im)sign in to confirm your age|age.restricted") {
        return "Age-restricted video; browser cookies may be required."
    }

    if ($text -match "(?im)sign in to confirm you.?re not a bot") {
        return "YouTube requested sign-in to confirm the request is not automated; browser cookies may be required."
    }

    if ($text -match "(?im)video unavailable|this video is unavailable") {
        return "Video unavailable, removed, or blocked."
    }

    if ($text -match "(?im)not available in your country|geo.?restricted") {
        return "Video is unavailable in the current region."
    }

    if ($text -match "(?im)HTTP Error 403|403 Forbidden") {
        return "HTTP 403 Forbidden; YouTube rejected the media request."
    }

    if ($text -match "(?im)HTTP Error 429|too many requests") {
        return "HTTP 429 Too Many Requests; YouTube rate-limited the request."
    }

    if ($text -match "(?im)n challenge solving failed|challenge solver") {
        return "YouTube JavaScript challenge solving failed."
    }

    if ($text -match "(?im)unable to download webpage") {
        return "Could not download the YouTube webpage."
    }

    if ($text -match "(?im)unable to download video data") {
        return "Could not download the video data."
    }

    if ($text -match "(?im)ffmpeg.*not found|ffprobe.*not found") {
        return "ffmpeg or ffprobe was not found."
    }

    if ($text -match "(?im)no space left on device|disk full") {
        return "Insufficient disk space."
    }

    # Prefer the final yt-dlp ERROR line when no known category matched.
    $errorLine = $OutputLines |
        Where-Object { $_ -match "(?i)\bERROR:" } |
        Select-Object -Last 1

    if ($errorLine) {
        return ($errorLine -replace "^\s*ERROR:\s*", "").Trim()
    }

    return "Unknown yt-dlp failure. Review the console output for details."
}

$successes = [System.Collections.Generic.List[object]]::new()
$failures = [System.Collections.Generic.List[object]]::new()

$startedAt = Get-Date
$outputTemplate = Join-Path $OutDir "%(title)s [%(id)s].%(ext)s"

Write-Host "Processing $($Inputs.Count) YouTube inputs..."
Write-Host "Input file: $IdFile"
Write-Host "Downloads:  $OutDir"
Write-Host "Archive:    $ArchiveFile"
Write-Host "Report:     $ResultsFile"
Write-Host ""

foreach ($inputValue in $Inputs) {
    $url = ConvertTo-YouTubeUrl -InputValue $inputValue

    Write-Host "=== $inputValue ==="
    Write-Host $url

    # Capture yt-dlp output for reporting while also displaying it live.
    $commandOutput = @(
        & uv tool run yt-dlp `
            --remote-components ejs:github `
            --download-archive $ArchiveFile `
            --no-overwrites `
            --continue `
            -o $outputTemplate `
            $url 2>&1 |
                ForEach-Object {
                    $line = $_.ToString()
                    Write-Host $line
                    $line
                }
    )

    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        $successes.Add(
            [pscustomobject]@{
                Input = $inputValue
            }
        )

        Write-Host "SUCCESS: $inputValue"
    }
    else {
        $reason = Get-FailureReason -OutputLines $commandOutput

        $failures.Add(
            [pscustomobject]@{
                Input    = $inputValue
                ExitCode = $exitCode
                Reason   = $reason
            }
        )

        Write-Warning "FAILED: $inputValue - $reason"
    }

    Write-Host ""
}

$finishedAt = Get-Date
$duration = $finishedAt - $startedAt

$reasonSummary = @(
    $failures |
        Group-Object -Property Reason |
        Sort-Object -Property Count -Descending |
        ForEach-Object {
            [pscustomobject]@{
                Count  = $_.Count
                Reason = $_.Name
            }
        }
)

$reportLines = [System.Collections.Generic.List[string]]::new()

$reportLines.Add("YouTube download results")
$reportLines.Add("========================")
$reportLines.Add("Started:    $($startedAt.ToString('yyyy-MM-dd HH:mm:ss'))")
$reportLines.Add("Finished:   $($finishedAt.ToString('yyyy-MM-dd HH:mm:ss'))")
$reportLines.Add("Duration:   $($duration.ToString())")
$reportLines.Add("Input file: $IdFile")
$reportLines.Add("Output:     $OutDir")
$reportLines.Add("Archive:    $ArchiveFile")
$reportLines.Add("Total:      $($Inputs.Count)")
$reportLines.Add("Successful: $($successes.Count)")
$reportLines.Add("Failed:     $($failures.Count)")
$reportLines.Add("")

$reportLines.Add("FAILURE REASONS SUMMARY")
$reportLines.Add("-----------------------")

if ($reasonSummary.Count -eq 0) {
    $reportLines.Add("No failures.")
}
else {
    foreach ($item in $reasonSummary) {
        $reportLines.Add("$($item.Count) - $($item.Reason)")
    }
}

$reportLines.Add("")
$reportLines.Add("FAILURES BY REASON")
$reportLines.Add("==================")
$reportLines.Add("")

if ($failures.Count -eq 0) {
    $reportLines.Add("None")
}
else {
    $failureGroups = $failures |
        Group-Object -Property Reason |
        Sort-Object -Property Count -Descending

    foreach ($group in $failureGroups) {
        # Headers are comments so the entire group can be copied
        # directly into video_ids.txt.
        $reportLines.Add("# $($group.Name)")
        $reportLines.Add("# $($group.Count) failure(s)")

        foreach ($failure in $group.Group) {
            $reportLines.Add($failure.Input)
        }

        $reportLines.Add("")
    }
}

$reportLines.Add("SUCCESSES")
$reportLines.Add("=========")

if ($successes.Count -eq 0) {
    $reportLines.Add("None")
}
else {
    foreach ($success in $successes) {
        $reportLines.Add($success.Input)
    }
}

$reportLines | Set-Content -LiteralPath $ResultsFile -Encoding utf8

Write-Host "Done."
Write-Host "Successful: $($successes.Count)"
Write-Host "Failed:     $($failures.Count)"
Write-Host "Archive:    $ArchiveFile"
Write-Host "Report:     $ResultsFile"

if ($failures.Count -gt 0) {
    exit 2
}

exit 0
