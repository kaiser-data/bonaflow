# BonaFlow comparison slides

The editable deck compares the Bilt rapid-prototype approach with the production React PWA and explains the React architecture.

## Files

- `bonaflow-build-approaches.html` — editable two-slide source
- `assets/bilt-screenshot.png` — user-supplied Bilt builder screenshot
- `assets/bilt-logo.svg` — user-supplied Bilt logo
- `assets/react-*.png` — reproducible captures from the live React PWA
- `exports/slide-1.png` and `exports/slide-2.png` — presentation-ready slides
- `exports/bonaflow-build-approaches.pdf` — two-page PDF deck

## Refresh the React screenshots

```bash
docs/slides/capture-react-screenshots.sh
```

The capture script reads only the four public production routes. Override Chrome or the deployment URL with `BONAFLOW_CHROME_BIN` or `BONAFLOW_CAPTURE_BASE_URL`.

## Replace the Bilt screenshot

Replace `docs/slides/assets/bilt-screenshot.png` with another PNG using the same filename. The HTML keeps a fallback placeholder if the file is unavailable. The source image is not edited; Slide 1 crops it through CSS around the QR and publishing workflow.

## View and export

```bash
open docs/slides/bonaflow-build-approaches.html
docs/slides/render-deck.sh
open docs/slides/exports/bonaflow-build-approaches.pdf
```

The export script creates two 1600×900 PNGs and a two-page 16:9 PDF using the locally installed Google Chrome.
