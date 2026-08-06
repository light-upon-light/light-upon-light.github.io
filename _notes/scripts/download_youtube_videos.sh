#!/usr/bin/env bash
# Downloads every YouTube video linked in the repo (yt-embed includes) to
# local storage. Run inside WSL. Requires `uv` `deno` and `ffmpeg` with a modern python version as uv's default.
#
# Usage:
#   bash _notes/scripts/download_youtube_videos.sh [output_dir]
#
# Defaults to downloading into ./_notes/downloads/youtube

set -euo pipefail

OUT_DIR="${1:-_notes/downloads/youtube}"
mkdir -p "$OUT_DIR"

if ! command -v uv >/dev/null 2>&1; then
    echo "uv not found. Install it first: https://docs.astral.sh/uv/getting-started/installation/" >&2
    exit 1
fi

# Video IDs extracted from youtu.be / youtube.com links across the repo.
VIDEO_IDS=(
    0PX2t0Baq8U
    11dDOBdQobQ
    2iiGZlyDOXk
    4l7pbX5J8Lg
    5fyF-35naDE
    9gJWIGLJhHM
    AHOH_t03sIc
    DoP6Ft-VE70
    EGZ2RibrJtc
    G5nSm73o4bw
    J_Dllu42eEA
    KQFrovc_1G0
    OED98p4bpx0
    OzSyIla5Z-Q
    Q1epfvZ04DQ
    QC3sDbVcAbw
    RRlhH3_iedU
    TD3jqd-YWec
    VjIL0Gio4yA
    WKlSJa-ZnJQ
    WL2hDhkYoao
    Z4pm2fSYhCI
    ZdsFKC50zm4
    _DnP0wxvnH4
    _HlpfgaDATU
    _mZgSIlX20U
    abzZL_3Av2E
    b5Y5gMc_XZo
    c2ovILc_sKY
    ezvPEwizqRc
    i0vl0vAyeoo
    lEc_ilaHim8
    n281Zyywyn4
    rk1S_Ovt5Ms
    s3WIOc2fHc0
    vVGiHoPZa0A
    vady0SQGHCU
    wA4v8MrBHHc
    xZIqd_-1Zus
    zbM7qpBe5DM
)

echo "Downloading ${#VIDEO_IDS[@]} videos to $OUT_DIR ..."

for id in "${VIDEO_IDS[@]}"; do
    echo "=== $id ==="
    uv tool run yt-dlp \
        -o "${OUT_DIR}/%(title)s [%(id)s].%(ext)s" \
        --no-overwrites \
        --continue \
        "https://youtu.be/${id}" || echo "FAILED: $id" >&2
done

echo "Done."
