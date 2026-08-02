# LinkedIn Pictures Curation Design

**Date:** 2 August 2026

**Status:** Approved for implementation

## Purpose

Create a repository folder containing a concise, ordered set of BonaFlow visuals suitable for a LinkedIn carousel. The sequence should tell the project story from product promise through interface, operations value, build approach, and real event context.

## Output

Create `linkedin-pictures/` with exactly these six copied images:

| Order | Destination | Source | Role in the post |
| --- | --- | --- | --- |
| 1 | `01-rate-food-get-rewards-architecture.png` | `docs/slides/exports/slide-2.png` | Opening visual: marketing promise, architecture, trust boundary, and product screens |
| 2 | `02-voice-rating-feedback.png` | `docs/slides/assets/react-feedback.png` | Voice-first rating experience |
| 3 | `03-operations-rating-analytics.png` | `docs/slides/assets/react-ops.png` | Operational value: ratings, reasons, and leftovers |
| 4 | `04-prototype-to-pwa.png` | `docs/slides/exports/slide-1.png` | Build and distribution lesson: Bilt prototype to React PWA |
| 5 | `05-event-meal-branded.jpeg` | `Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (5).jpeg` | Real event context with Bella & Bona presentation |
| 6 | `06-event-meal-closeup.jpeg` | `Pictures-Delta-meals/WhatsApp Image 2026-08-01 at 12.49.59 (3).jpeg` | Strong clean meal close-up |

## Constraints

- Copy rather than move every source image.
- Preserve original bytes; do not crop, resize, compress, recolor, or generate variants.
- Use the numbered descriptive filenames exactly as specified.
- Add no non-image files to `linkedin-pictures/`.
- Leave application code, screenshots, slide exports, raw event photos, and deployment unchanged.
- Commit and push the folder to `main` after verification.

## Verification

- Confirm the destination contains exactly six files.
- Confirm every destination is recognized as a valid PNG or JPEG.
- Compare each source and destination with `cmp` to prove byte identity.
- Confirm Git records six additions and no source deletions or modifications.
- Confirm local `main` and `origin/main` match after push.

## Acceptance Criteria

- `linkedin-pictures/` exists on GitHub with the six approved assets in carousel order.
- The folder leads with **“Rate food. Explain why. Get rewards.”** and ends with two real-event food photographs.
- Every original remains at its existing path and is byte-identical to the copied file.
