# LinkedIn Pictures Curation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and publish an ordered six-image `linkedin-pictures/` carousel set from approved BonaFlow visuals and event photos.

**Architecture:** Copy six existing binary assets into one presentation-only folder using descriptive numbered names. Preserve all sources and bytes, verify each mapping with `cmp`, then commit and push only the new folder and this plan.

**Tech Stack:** Git, POSIX shell file operations, ImageMagick `identify`, byte comparison with `cmp`.

## Global Constraints

- Create exactly six images in `linkedin-pictures/`.
- Copy; never move, crop, resize, compress, recolor, or regenerate source assets.
- Use the six destination names approved in `docs/archive/process/specs/2026-08-02-linkedin-pictures-design.md`.
- Add no non-image files to the destination.
- Leave application code, source visuals, raw event photographs, and deployment unchanged.
- Commit and push to `main`.

---

### Task 1: Create, verify, commit, and publish the carousel folder

**Files:**
- Create: `linkedin-pictures/01-rate-food-get-rewards-architecture.png`
- Create: `linkedin-pictures/02-voice-rating-feedback.png`
- Create: `linkedin-pictures/03-operations-rating-analytics.png`
- Create: `linkedin-pictures/04-prototype-to-pwa.png`
- Create: `linkedin-pictures/05-event-meal-branded.jpeg`
- Create: `linkedin-pictures/06-event-meal-closeup.jpeg`

**Interfaces:**
- Consumes: six committed image source paths from the approved design specification.
- Produces: an image-only GitHub folder whose numeric filenames are the LinkedIn carousel order.

- [ ] **Step 1: Verify the destination is safe and every source exists**

Run:

```bash
test ! -e linkedin-pictures
test -f docs/slides/exports/slide-2.png
test -f docs/slides/assets/react-feedback.png
test -f docs/slides/assets/react-ops.png
test -f docs/slides/exports/slide-1.png
test -f 'Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (5).jpeg'
test -f 'Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (3).jpeg'
```

Expected: exit `0`; no existing destination can be overwritten.

- [ ] **Step 2: Create the folder and copy the approved originals**

Run:

```bash
mkdir linkedin-pictures
cp docs/slides/exports/slide-2.png linkedin-pictures/01-rate-food-get-rewards-architecture.png
cp docs/slides/assets/react-feedback.png linkedin-pictures/02-voice-rating-feedback.png
cp docs/slides/assets/react-ops.png linkedin-pictures/03-operations-rating-analytics.png
cp docs/slides/exports/slide-1.png linkedin-pictures/04-prototype-to-pwa.png
cp 'Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (5).jpeg' linkedin-pictures/05-event-meal-branded.jpeg
cp 'Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (3).jpeg' linkedin-pictures/06-event-meal-closeup.jpeg
```

- [ ] **Step 3: Verify exact contents, formats, and byte identity**

Run:

```bash
test "$(find linkedin-pictures -maxdepth 1 -type f | wc -l | tr -d ' ')" = 6
identify -format '%f %wx%h %m\n' linkedin-pictures/*
cmp docs/slides/exports/slide-2.png linkedin-pictures/01-rate-food-get-rewards-architecture.png
cmp docs/slides/assets/react-feedback.png linkedin-pictures/02-voice-rating-feedback.png
cmp docs/slides/assets/react-ops.png linkedin-pictures/03-operations-rating-analytics.png
cmp docs/slides/exports/slide-1.png linkedin-pictures/04-prototype-to-pwa.png
cmp 'Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (5).jpeg' linkedin-pictures/05-event-meal-branded.jpeg
cmp 'Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (3).jpeg' linkedin-pictures/06-event-meal-closeup.jpeg
```

Expected dimensions: slides `1600x900`, mobile screens `960x1864`, branded meal `3840x5120`, close-up meal `3024x4032`; every `cmp` exits `0`.

- [ ] **Step 4: Verify Git isolation**

Run:

```bash
git status --short
git diff --check
```

Expected: only six untracked files under `linkedin-pictures/` plus this plan before its plan commit; no source deletion or modification.

- [ ] **Step 5: Commit the image set**

```bash
git add linkedin-pictures
git commit -m "assets: add LinkedIn carousel pictures"
```

- [ ] **Step 6: Push and verify GitHub synchronization**

```bash
git push origin main
git status --short --branch
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
```

Expected: `main...origin/main` with no ahead/behind marker and a clean working tree.
