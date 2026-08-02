# BonaFlow Build-Approach Comparison Slides

**Date:** 2 August 2026  
**Status:** Approved for specification  
**Format:** Two 16:9 HTML slides, exportable to PDF and PNG

## Purpose

Explain how the two BonaFlow builds served different stages of product development:

- Bilt made it unusually easy for a beginner to create a polished, mobile-style prototype with an integrated backend and publishing workflow.
- The React PWA required more development skill, but removed the Expo Go installation barrier and gave event guests an immediate QR-to-browser experience.

The presentation should frame the approaches as complementary rather than as a contest. Bilt is the rapid-prototyping path; the React PWA is the distribution and production path. A future native app distributed through Google Play or the Apple App Store remains a credible later step.

## Source Boundaries

- The live React PWA is the only source for screenshots produced in this repository.
- The Bilt implementation remains unchanged on `archive/bilt-app` and is used only as a factual reference.
- The user supplied `Bilt_App.png`. Preserve the pixels unchanged, move it into the slide asset folder as `bilt-screenshot.png`, and frame it through CSS around Bilt's preview, QR, and publishing controls. The composition must crop out the early prototype's rating/reward message so it does not contradict the final product direction.
- The deck must retain a clearly labelled fallback placeholder so the Bilt image can be removed or replaced without redesigning the slide.
- No Bilt component, Expo dependency, rating system, reward system, or backend code is merged into `main` for this deliverable.
- No production application behavior changes are part of the slide task.

## Visual Direction

Use BonaFlow's existing warm off-white, deep green, pink accent, rounded-card language, and typography. Slides must remain readable on a projector: large type, short claims, strong contrast, and no dense implementation screenshots.

React screenshots should be captured from the canonical production deployment at desktop dimensions while emulating a wide modern mobile viewport. Use 480 CSS pixels so the production interface's two-column staff and operations controls are not horizontally cropped. Each screenshot must show the app itself without browser chrome and use current production data. Sensitive configuration and developer tooling must never appear.

## Slide 1 — Two Paths: Prototype and Distribution

### Message

Both approaches are useful, but at different stages.

### Layout

A balanced two-column comparison:

- **Bilt — prototype quickly**
  - Beginner-friendly natural-language building
  - Integrated database/backend workflow
  - Native-quality mobile experience out of the box
  - QR sharing and guided publishing workflow
  - Constraint: recipients still need Expo Go for the preview
  - User-supplied Bilt screenshot placeholder

- **React PWA — distribute instantly**
  - QR opens directly in the phone browser
  - Installable without an app-store release
  - Full control over validation, hosting, and integrations
  - Better fit for event-wide distribution and iterative deployment
  - React Guest screenshot from `/guest`

Footer conclusion: **Bilt proves the experience. The PWA removes the distribution barrier.**

## Slide 2 — How the React PWA Is Built

### Message

BonaFlow turns a staff report into a validated, shared operational update visible across guest and operations phones.

### Architecture flow

Show a compact left-to-right flow:

1. **Guest and staff phones** — QR entry, voice or text, installable PWA
2. **Next.js on Vercel** — routes, UI, server APIs, fallback behavior
3. **Code decides** — strict identifiers, enums, deterministic mutations and recommendations
4. **Supabase** — one shared event-state record for cross-device synchronization

Supporting integrations appear below the server layer:

- **Nebius:** proposes structured interpretations; invalid output is rejected
- **ElevenLabs:** speech transcription and bilingual announcement audio
- **Fallbacks:** deterministic keyword interpretation and visible text
- **GitHub → Vercel:** committed source and repeatable production deployment

Use three compact React screenshots from:

- `/staff` — voice/text reporting and quick actions
- `/ops` — live stations, alerts, tasks, and feedback signals
- `/feedback` — anonymous leftover feedback

Footer conclusion: **Prototype fast, validate with users, then choose PWA or app-store distribution based on reach.**

## Screenshot Requirements

- Capture `/guest`, `/staff`, `/ops`, and `/feedback` from `https://bonaflow.vercel.app`.
- Use a consistent mobile viewport and device scale across all four captures.
- Wait for live state to load before capture.
- Prefer stable seeded content; do not mutate or reset production data solely for screenshots without explicit confirmation.
- Crop only through slide layout masks; preserve original captures as standalone PNG files.
- Store captures under `docs/slides/assets/` with descriptive filenames.

## Deliverables

- `docs/slides/bonaflow-build-approaches.html` — editable two-slide deck
- `docs/slides/assets/react-guest.png`
- `docs/slides/assets/react-staff.png`
- `docs/slides/assets/react-ops.png`
- `docs/slides/assets/react-feedback.png`
- `docs/slides/assets/bilt-screenshot.png` — the unchanged user-supplied Bilt capture
- `docs/slides/assets/bilt-logo.svg` — the unchanged user-supplied Bilt logo
- `docs/slides/assets/bilt-placeholder.svg` — replaceable user-supplied screenshot placeholder
- A short export note describing how to print the HTML deck to PDF or capture individual slides as PNGs

## Acceptance Criteria

- Exactly two 16:9 slides.
- Only the React application is captured by Codex.
- The Bilt screenshot is clearly marked as user-supplied and visually framed around the integrated preview, QR, and publishing workflow.
- Bilt is presented positively as a rapid-prototyping tool, with Expo Go identified as the preview-distribution blocker.
- The React PWA is presented as the direct QR-to-browser distribution path.
- The architecture accurately reflects the current repository: Next.js, React, Vercel, Supabase, Nebius, ElevenLabs, deterministic fallbacks, GitHub, and PWA assets.
- Slides contain no ratings, reward programme, voucher-for-feedback claim, or suggestion that Bilt code was merged into the PWA.
- The deck remains legible at presentation distance and contains no credentials or private data.

## Verification

- Confirm the four screenshot files are valid PNGs with identical viewport dimensions.
- Open the HTML deck at 16:9 and inspect both slides at desktop and projector-scale widths.
- Verify all text against the current implementation and deployment configuration.
- Run the existing application tests, typecheck, and production build only if application source is touched; slide-only changes do not require an application rebuild.
- Run `git diff --check` before commit.
