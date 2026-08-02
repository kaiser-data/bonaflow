# BonaFlow Comparison Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a projector-ready, two-slide BonaFlow deck using screenshots captured only from the live React PWA, while leaving the Bilt implementation unchanged and reserving a replaceable space for a user-supplied Bilt screenshot.

**Architecture:** Keep the deliverable isolated under `docs/slides/`. A deterministic shell script captures four identically sized mobile screenshots from the canonical Vercel deployment with the already-installed local Google Chrome; a self-contained HTML file renders two 1600×900 slides without runtime dependencies; a second script exports the deck to two PNGs and a two-page PDF. No application source, state, dependency, or deployment configuration changes.

**Tech Stack:** HTML5, CSS, minimal inline JavaScript, headless Google Chrome, ImageMagick `identify`, Poppler `pdfinfo`, Git.

## Global Constraints

- Create exactly two 16:9 slides.
- Capture only `https://bonaflow.vercel.app/{guest,staff,ops,feedback}`; do not capture the Bilt application.
- Keep `archive/bilt-app` unchanged and do not copy Bilt code or assets into `main`.
- The user supplied `Bilt_App.png`; move it unchanged to `assets/bilt-screenshot.png`, crop it only through CSS around Bilt's preview/QR/publishing controls, and fall back automatically to `assets/bilt-placeholder.svg` if it is later removed.
- Do not mutate or reset production data for screenshots.
- Use the current production state after waiting six virtual seconds for each page to load.
- Use identical 480×932 CSS-pixel mobile viewports and 2× device scale for every React screenshot; 480 pixels preserves the production app's two-column controls without horizontal cropping.
- Do not add npm dependencies, Playwright browsers, application routes, or build configuration.
- Do not introduce ratings, rewards, feedback vouchers, or claims that Bilt code was merged into the PWA.
- Use BonaFlow's existing warm off-white, deep green, pink accent, rounded cards, and high-contrast projector typography.
- Do not commit credentials, browser profiles, caches, or developer-tool output.

---

## File Map

- Create `docs/slides/capture-react-screenshots.sh`: repeatable live React screenshot capture and dimension verification.
- Create `docs/slides/render-deck.sh`: repeatable HTML-to-PNG/PDF export and output verification.
- Create `docs/slides/bonaflow-build-approaches.html`: self-contained two-slide source of truth.
- Create `docs/slides/README.md`: capture, replacement, viewing, and export instructions.
- Create `docs/slides/assets/bilt-placeholder.svg`: visual fallback for the user's Bilt screenshot.
- Move `Bilt_App.png` to `docs/slides/assets/bilt-screenshot.png`: unchanged user-supplied Bilt builder capture.
- Move `bilt_logo.svg` to `docs/slides/assets/bilt-logo.svg`: unchanged user-supplied Bilt logo.
- Generate `docs/slides/assets/react-guest.png`: production Guest view.
- Generate `docs/slides/assets/react-staff.png`: production Staff view.
- Generate `docs/slides/assets/react-ops.png`: production Operations view.
- Generate `docs/slides/assets/react-feedback.png`: production Feedback view.
- Generate `docs/slides/exports/slide-1.png`: presentation-ready approach-comparison slide.
- Generate `docs/slides/exports/slide-2.png`: presentation-ready architecture slide.
- Generate `docs/slides/exports/bonaflow-build-approaches.pdf`: two-page presentation PDF.

---

### Task 1: Capture the live React application consistently

**Files:**
- Create: `docs/slides/capture-react-screenshots.sh`
- Generate: `docs/slides/assets/react-guest.png`
- Generate: `docs/slides/assets/react-staff.png`
- Generate: `docs/slides/assets/react-ops.png`
- Generate: `docs/slides/assets/react-feedback.png`

**Interfaces:**
- Consumes: canonical deployment base URL `https://bonaflow.vercel.app`; local Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, overridable with `BONAFLOW_CHROME_BIN`.
- Produces: four PNG files with identical dimensions for direct use by `bonaflow-build-approaches.html`.

- [ ] **Step 1: Add the deterministic capture script**

Create the executable script with this behavior:

```bash
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
```

- [ ] **Step 2: Make the capture script executable**

Run:

```bash
chmod +x docs/slides/capture-react-screenshots.sh
```

Expected: `test -x docs/slides/capture-react-screenshots.sh` exits `0`.

- [ ] **Step 3: Capture the four production routes**

Run with network access:

```bash
docs/slides/capture-react-screenshots.sh
```

Expected: all four commands complete without browser errors and print four identical dimensions.

- [ ] **Step 4: Verify the screenshot artifacts**

Run:

```bash
file docs/slides/assets/react-*.png
identify -format '%f %wx%h %[channels]\n' docs/slides/assets/react-*.png
```

Expected: four valid PNG files, all the same width and height, with RGB or RGBA channels.

- [ ] **Step 5: Inspect every screenshot visually**

Open each PNG with the image-inspection tool. Confirm the route loaded, the app contains no browser chrome or credentials, and no image is blank, clipped horizontally, or stuck on its initial loading state. Re-run only the affected route after increasing `--virtual-time-budget` to `9000` if a capture is still loading.

- [ ] **Step 6: Commit the capture source and React screenshots**

```bash
git add docs/slides/capture-react-screenshots.sh docs/slides/assets/react-guest.png docs/slides/assets/react-staff.png docs/slides/assets/react-ops.png docs/slides/assets/react-feedback.png
git commit -m "docs: capture BonaFlow React screens"
```

---

### Task 2: Build the editable two-slide HTML deck

**Files:**
- Create: `docs/slides/bonaflow-build-approaches.html`
- Move: `Bilt_App.png` → `docs/slides/assets/bilt-screenshot.png`
- Create: `docs/slides/assets/bilt-placeholder.svg`
- Create: `docs/slides/README.md`

**Interfaces:**
- Consumes: the four `react-*.png` files from Task 1 and the user-supplied root file `Bilt_App.png`.
- Produces: a dependency-free HTML deck; `?slide=1` and `?slide=2` each render exactly one 1600×900 slide for Task 3.

- [ ] **Step 1: Place the user-supplied Bilt capture in the slide assets**

Move the already-inspected 1806×1304 RGBA PNG without modifying or recompressing it:

```bash
mkdir -p docs/slides/assets
mv Bilt_App.png docs/slides/assets/bilt-screenshot.png
identify -format '%f %wx%h %[channels]\n' docs/slides/assets/bilt-screenshot.png
```

Expected: `bilt-screenshot.png 1806x1304 srgba`. Use a narrow, right-aligned `object-fit: cover` CSS frame so the visible slide composition emphasizes Bilt's QR, `Deploy & Share`, and publishing workflow instead of the early prototype's discarded rating/reward headline. Do not edit the PNG pixels.

- [ ] **Step 2: Create the replaceable Bilt screenshot fallback**

Create an SVG with `viewBox="0 0 430 932"`, a warm background, dashed green frame, `BILT SCREENSHOT`, and the instruction `Add assets/bilt-screenshot.png`. Do not include a recreation of the Bilt UI.

The image element in Slide 1 must use this exact fallback behavior:

```html
<img
  src="assets/bilt-screenshot.png"
  onerror="this.onerror=null;this.src='assets/bilt-placeholder.svg'"
  alt="User-supplied screenshot of the Bilt prototype"
>
```

- [ ] **Step 3: Create the slide canvas and presentation behavior**

Create one self-contained HTML document with:

```html
<main class="deck">
  <section class="slide slide-one" data-slide="1" aria-label="Two paths from prototype to distribution">
    <!-- Slide 1 content -->
  </section>
  <section class="slide slide-two" data-slide="2" aria-label="How the React PWA is built">
    <!-- Slide 2 content -->
  </section>
</main>
<script>
  const requested = new URLSearchParams(window.location.search).get('slide');
  if (requested) {
    document.documentElement.dataset.singleSlide = requested;
  }
</script>
```

Use a fixed `1600px × 900px` `.slide`, `overflow: hidden`, `@page { size: 16in 9in; margin: 0; }`, and print page breaks. When `data-single-slide` is `1` or `2`, hide the other section and remove deck spacing.

- [ ] **Step 4: Implement Slide 1 copy and layout**

Use a two-column comparison with the exact framing below:

```text
BUILD FAST. DISTRIBUTE FASTER.
Two useful paths, at different product stages.

BILT — PROTOTYPE QUICKLY
Beginner-friendly building
Integrated backend workflow
Native-quality mobile experience
Guided QR sharing and publishing
Trade-off: preview users still need Expo Go

REACT PWA — OPEN INSTANTLY
QR opens directly in the browser
Installable without an app-store release
Full control of validation and integrations
GitHub-to-Vercel deployment
Best fit for event-wide distribution

Bilt proves the experience. The PWA removes the distribution barrier.
```

Place the right-side publishing/QR crop of the Bilt image in a browser-preview frame and `assets/react-guest.png` in the right device frame. Use the labels `RAPID PROTOTYPE` and `LIVE REACT PWA`; do not label either approach as a failure. The crop must not visibly feature the discarded rating/reward headline.

- [ ] **Step 5: Implement Slide 2 architecture and copy**

Use this exact architecture sequence:

```text
QR + PHONES
Guest, staff and operations views

NEXT.JS + VERCEL
PWA interface and server API routes

CODE DECIDES
Closed IDs, validation, deterministic mutations and redirects

SUPABASE
Shared event state across every device
```

Show Nebius and ElevenLabs as supporting services pointing into the Next.js/API layer, not directly into Supabase. Add `Model proposes → validation checks → code applies` beneath Nebius. Add `Speech-to-text + bilingual announcements` beneath ElevenLabs. Add `Keyword and visible-text fallbacks` as the failure path.

Place compact masked views of `react-staff.png`, `react-ops.png`, and `react-feedback.png` along the lower right. Finish with:

```text
Prototype fast, validate with users, then choose PWA or app-store distribution based on reach.
```

- [ ] **Step 6: Add deck instructions**

Document these commands in `docs/slides/README.md`:

```bash
docs/slides/capture-react-screenshots.sh
docs/slides/render-deck.sh
open docs/slides/bonaflow-build-approaches.html
open docs/slides/exports/bonaflow-build-approaches.pdf
```

Explain that the user replaces the Bilt fallback by adding `docs/slides/assets/bilt-screenshot.png` and re-running `render-deck.sh`; no HTML edit is required.

- [ ] **Step 7: Validate HTML content and isolation**

Run:

```bash
rg -n "data-slide=|Bilt proves the experience|CODE DECIDES|Model proposes|Expo Go|bilt-screenshot.png" docs/slides/bonaflow-build-approaches.html
git diff --check
git rev-parse origin/archive/bilt-app
```

Expected: two slide sections; every required claim is present; whitespace check passes; `origin/archive/bilt-app` still resolves to `c14c57357773feca070924661ac4ad85dc9ae4b4`.

- [ ] **Step 8: Commit the editable deck**

```bash
git add docs/slides/bonaflow-build-approaches.html docs/slides/assets/bilt-screenshot.png docs/slides/assets/bilt-placeholder.svg docs/slides/README.md
git commit -m "docs: add BonaFlow build comparison deck"
```

---

### Task 3: Export presentation-ready PNG and PDF files

**Files:**
- Create: `docs/slides/render-deck.sh`
- Generate: `docs/slides/exports/slide-1.png`
- Generate: `docs/slides/exports/slide-2.png`
- Generate: `docs/slides/exports/bonaflow-build-approaches.pdf`

**Interfaces:**
- Consumes: `bonaflow-build-approaches.html`, all referenced slide assets, Chrome, `identify`, and `pdfinfo`.
- Produces: two 1600×900 PNG slides and one two-page PDF.

- [ ] **Step 1: Add the deterministic export script**

Create the executable script with this behavior:

```bash
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
```

- [ ] **Step 2: Make the export script executable**

Run:

```bash
chmod +x docs/slides/render-deck.sh
```

Expected: `test -x docs/slides/render-deck.sh` exits `0`.

- [ ] **Step 3: Render all presentation outputs**

Run:

```bash
docs/slides/render-deck.sh
```

Expected output includes `slide-1.png 1600x900`, `slide-2.png 1600x900`, and `Pages: 2`.

- [ ] **Step 4: Inspect both exported slides visually**

Open `slide-1.png` and `slide-2.png` with the image-inspection tool. Check:

- every line fits without clipping;
- text is legible at full-slide view;
- React screenshots are recognizable and not stretched;
- Slide 1's Bilt fallback is visibly replaceable;
- Slide 2 arrows connect phones → Next.js/Vercel → code decision → Supabase;
- Nebius and ElevenLabs are supporting services, not state owners;
- no credential, developer-tool, reward, rating, or voucher content appears.

Adjust only the HTML/CSS, then re-run `render-deck.sh` until both images pass.

- [ ] **Step 5: Verify generated files**

Run:

```bash
file docs/slides/exports/slide-1.png docs/slides/exports/slide-2.png docs/slides/exports/bonaflow-build-approaches.pdf
identify -format '%f %wx%h\n' docs/slides/exports/slide-*.png
pdfinfo docs/slides/exports/bonaflow-build-approaches.pdf | rg '^(Pages|Page size):'
```

Expected: two valid 1600×900 PNGs and one two-page, 16:9 PDF.

- [ ] **Step 6: Commit the exporter and rendered deck**

```bash
git add docs/slides/render-deck.sh docs/slides/exports/slide-1.png docs/slides/exports/slide-2.png docs/slides/exports/bonaflow-build-approaches.pdf
git commit -m "docs: render BonaFlow comparison slides"
```

---

### Task 4: Final requirements and repository verification

**Files:**
- Verify: all `docs/slides/` source and generated assets
- Verify unchanged: `src/`, `public/`, `package.json`, `package-lock.json`, and `archive/bilt-app`

**Interfaces:**
- Consumes: all Task 1–3 outputs and the approved design specification.
- Produces: evidence that the deck is complete, reproducible, isolated, and presentation-ready.

- [ ] **Step 1: Verify the complete artifact inventory**

Run:

```bash
find docs/slides -maxdepth 2 -type f -print | sort
```

Expected: capture script, render script, HTML, README, Bilt fallback, four React screenshots, two slide PNGs, and one PDF.

- [ ] **Step 2: Verify no application or Bilt branch content changed**

Run:

```bash
git diff --name-only e6065f3..HEAD
git rev-parse origin/archive/bilt-app
git status --short
```

Expected: changes after the design commit are confined to `docs/slides/` plus this implementation plan at `docs/superpowers/plans/2026-08-02-bonaflow-comparison-slides.md`; the Bilt branch remains at `c14c57357773feca070924661ac4ad85dc9ae4b4`; the working tree is clean.

- [ ] **Step 3: Run final artifact checks**

Run:

```bash
git diff --check e6065f3..HEAD
identify -format '%f %wx%h\n' docs/slides/assets/react-*.png docs/slides/exports/slide-*.png
pdfinfo docs/slides/exports/bonaflow-build-approaches.pdf | rg '^(Pages|Page size):'
```

Expected: no whitespace errors; four identically sized React captures; two 1600×900 slide PNGs; two PDF pages at 16:9 dimensions.

- [ ] **Step 4: Confirm the current application still responds without mutation**

Run:

```bash
curl -fsS https://bonaflow.vercel.app/api/state
```

Expected: HTTP success with the current event-state JSON. Do not call any mutation or reset endpoint.

- [ ] **Step 5: Record the handoff paths**

The final response must link directly to:

```text
docs/slides/exports/slide-1.png
docs/slides/exports/slide-2.png
docs/slides/exports/bonaflow-build-approaches.pdf
docs/slides/bonaflow-build-approaches.html
docs/slides/README.md
```

State that the user can add `docs/slides/assets/bilt-screenshot.png` and run `docs/slides/render-deck.sh` to replace the fallback.
