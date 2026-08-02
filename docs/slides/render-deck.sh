#!/usr/bin/env bash
set -euo pipefail

slide_dir="$(cd "$(dirname "$0")" && pwd)"
export_dir="$slide_dir/exports"
chrome_bin="${BONAFLOW_CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
deck_url="file://$slide_dir/bonaflow-build-approaches.html"

if [[ ! -x "$chrome_bin" ]]; then
  echo "Google Chrome was not found at: $chrome_bin" >&2
  exit 1
fi

mkdir -p "$export_dir"

render_slide() {
  local number="$1"
  "$chrome_bin" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --allow-file-access-from-files \
    --force-device-scale-factor=1 \
    --window-size=1600,900 \
    --screenshot="$export_dir/slide-$number.png" \
    "$deck_url?slide=$number"
}

render_slide 1
render_slide 2

"$chrome_bin" \
  --headless=new \
  --disable-gpu \
  --allow-file-access-from-files \
  --print-to-pdf="$export_dir/bonaflow-build-approaches.pdf" \
  --no-pdf-header-footer \
  "$deck_url"

identify -format '%f %wx%h\n' "$export_dir/slide-1.png" "$export_dir/slide-2.png"
pdfinfo "$export_dir/bonaflow-build-approaches.pdf" | rg '^Pages:'
