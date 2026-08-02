#!/usr/bin/env bash
set -euo pipefail

slide_dir="$(cd "$(dirname "$0")" && pwd)"
asset_dir="$slide_dir/assets"
chrome_bin="${BONAFLOW_CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
capture_base_url="${BONAFLOW_CAPTURE_BASE_URL:-https://bonaflow.vercel.app}"

if [[ ! -x "$chrome_bin" ]]; then
  echo "Google Chrome was not found at: $chrome_bin" >&2
  exit 1
fi

mkdir -p "$asset_dir"

capture() {
  local route="$1"
  local output="$2"
  "$chrome_bin" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size=480,932 \
    --virtual-time-budget=6000 \
    --screenshot="$asset_dir/$output" \
    "$capture_base_url$route"
}

capture "/guest" "react-guest.png"
capture "/staff" "react-staff.png"
capture "/ops" "react-ops.png"
capture "/feedback" "react-feedback.png"

identify -format '%f %wx%h\n' \
  "$asset_dir/react-guest.png" \
  "$asset_dir/react-staff.png" \
  "$asset_dir/react-ops.png" \
  "$asset_dir/react-feedback.png"
