# Downloads every YouTube video linked in the repo (yt-embed includes) to
# local storage. Requires `uv` `deno` and `ffmpeg` with a modern python version as uv's default.
# runnable via `uv tool run yt-dlp`.
#
# Usage:
#   .\_notes\scripts\download_youtube_videos.ps1 [-OutDir <path>]
#
# Defaults to downloading into .\downloads (relative to the current directory).

param(
    [string]$OutDir = (Join-Path (Get-Location) "downloads")
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv not found. Install it first: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Video IDs extracted from youtu.be / youtube.com links across the repo.
$VideoIds = @(
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

Write-Host "Downloading $($VideoIds.Count) videos to $OutDir ..."

foreach ($id in $VideoIds) {
    Write-Host "=== $id ==="
    $outputTemplate = Join-Path $OutDir "%(title)s [%(id)s].%(ext)s"
    & uv tool run yt-dlp -o $outputTemplate --no-overwrites --continue "https://youtu.be/$id"
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "FAILED: $id"
    }
}

Write-Host "Done."
