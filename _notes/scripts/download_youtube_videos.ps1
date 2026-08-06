# Downloads YouTube videos to local storage.
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
# The ID file must contain one YouTube video ID per line. Blank lines and
# lines beginning with # are ignored.
#
# Defaults:
#   Downloads: .\downloads
#   Report:    <OutDir>\download_results.txt

[CmdletBinding()]
param(
    [string]$OutDir = (Join-Path (Get-Location) "downloads"),

    [string]$IdFile,

    [string]$ResultsFile
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv not found. Install it first: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
}

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if ([string]::IsNullOrWhiteSpace($ResultsFile)) {
    $ResultsFile = Join-Path $OutDir "download_results.txt"
}
else {
    $ResultsFile = [System.IO.Path]::GetFullPath($ResultsFile)
    $resultsDirectory = Split-Path -Parent $ResultsFile

    if ($resultsDirectory) {
        New-Item -ItemType Directory -Force -Path $resultsDirectory | Out-Null
    }
}

# Default IDs extracted from youtu.be / youtube.com links across the repo.
$DefaultVideoIds = @(
    "0PX2t0Baq8U",
    "11dDOBdQobQ",
    "2iiGZlyDOXk",
    "4l7pbX5J8Lg",
    "5fyF-35naDE",
    "9gJWIGLJhHM",
    "AHOH_t03sIc",
    "DoP6Ft-VE70",
    "EGZ2RibrJtc",
    "G5nSm73o4bw",
    "J_Dllu42eEA",
    "KQFrovc_1G0",
    "OED98p4bpx0",
    "OzSyIla5Z-Q",
    "Q1epfvZ04DQ",
    "QC3sDbVcAbw",
    "RRlhH3_iedU",
    "TD3jqd-YWec",
    "VjIL0Gio4yA",
    "WKlSJa-ZnJQ",
    "WL2hDhkYoao",
    "Z4pm2fSYhCI",
    "ZdsFKC50zm4",
    "_DnP0wxvnH4",
    "_HlpfgaDATU",
    "_mZgSIlX20U",
    "abzZL_3Av2E",
    "b5Y5gMc_XZo",
    "c2ovILc_sKY",
    "ezvPEwizqRc",
    "i0vl0vAyeoo",
    "lEc_ilaHim8",
    "n281Zyywyn4",
    "rk1S_Ovt5Ms",
    "s3WIOc2fHc0",
    "vVGiHoPZa0A",
    "vady0SQGHCU",
    "wA4v8MrBHHc",
    "xZIqd_-1Zus",
    "zbM7qpBe5DM"
)

if (-not [string]::IsNullOrWhiteSpace($IdFile)) {
    $IdFile = [System.IO.Path]::GetFullPath($IdFile)

    if (-not (Test-Path -LiteralPath $IdFile -PathType Leaf)) {
        Write-Error "ID file not found: $IdFile"
        exit 1
    }

    $VideoIds = @(
        Get-Content -LiteralPath $IdFile |
            ForEach-Object { $_.Trim() } |
            Where-Object {
                $_ -and
                -not $_.StartsWith("#")
            }
    )
}
else {
    $VideoIds = $DefaultVideoIds
}

# Remove duplicate IDs while preserving their original order.
$seenIds = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)
$VideoIds = @($VideoIds | Where-Object { $seenIds.Add($_) })

if ($VideoIds.Count -eq 0) {
    Write-Error "No video IDs were found."
    exit 1
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

Write-Host "Downloading $($VideoIds.Count) videos to $OutDir ..."
Write-Host "Results will be written to $ResultsFile"
Write-Host ""

foreach ($id in $VideoIds) {
    Write-Host "=== $id ==="

    # Capture output for reporting while continuing to display it live.
    $commandOutput = @(
        & uv tool run yt-dlp `
            --remote-components ejs:github `
            --no-overwrites `
            --continue `
            -o $outputTemplate `
            "https://youtu.be/$id" 2>&1 |
                ForEach-Object {
                    $line = $_.ToString()
                    Write-Host $line
                    $line
                }
    )

    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        $successes.Add([pscustomobject]@{
            Id = $id
        })

        Write-Host "SUCCESS: $id"
    }
    else {
        $reason = Get-FailureReason -OutputLines $commandOutput

        $failures.Add([pscustomobject]@{
            Id       = $id
            ExitCode = $exitCode
            Reason   = $reason
        })

        Write-Warning "FAILED: $id - $reason"
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
$reportLines.Add("Output:     $OutDir")
$reportLines.Add("Total:      $($VideoIds.Count)")
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
$reportLines.Add("FAILURES")
$reportLines.Add("--------")

if ($failures.Count -eq 0) {
    $reportLines.Add("None")
}
else {
    # One failed video per line, as requested.
    foreach ($failure in $failures) {
        $reportLines.Add(
            "$($failure.Id) | Exit code $($failure.ExitCode) | $($failure.Reason)"
        )
    }
}

$reportLines.Add("")
$reportLines.Add("SUCCESSES")
$reportLines.Add("---------")

if ($successes.Count -eq 0) {
    $reportLines.Add("None")
}
else {
    # One successful video ID per line.
    foreach ($success in $successes) {
        $reportLines.Add($success.Id)
    }
}

$reportLines | Set-Content -LiteralPath $ResultsFile -Encoding utf8

Write-Host "Done."
Write-Host "Successful: $($successes.Count)"
Write-Host "Failed:     $($failures.Count)"
Write-Host "Report:     $ResultsFile"

if ($failures.Count -gt 0) {
    exit 2
}

exit 0
