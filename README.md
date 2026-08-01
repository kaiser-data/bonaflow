# BonaFlow PWA

Mobile-first live catering navigator for the 8x Bella & Bona Mobile Hack demo.

## Live routes

- Guest: https://bonaflow.vercel.app/guest
- Staff: https://bonaflow.vercel.app/staff
- Operations: https://bonaflow.vercel.app/ops
- Anonymous leftover feedback: https://bonaflow.vercel.app/feedback

## Local setup

1. Run `supabase/setup.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env.local` and supply the server-only values.
3. Run `npm install` and `npm run dev`.

The state repository seeds the `bonaflow_state/live` JSON row on first read. Without both Supabase variables, local development uses a non-durable in-memory fallback.

## Verification

Run:

```bash
npm test
npm run typecheck
npm run build
```

The production acceptance path uses Guest on one phone and Staff on another. Select Atrium, choose **Item sold out**, then choose **Vegan Chickpeas Quinoa Salad**. Within one polling interval, the untouched Guest phone shows Atrium red and recommends Terrace. Use Operations → **Reset demo data** afterward.

## Production QR

`public/guest-qr.png` targets `https://bonaflow.vercel.app/guest`. Regenerate it after any canonical-domain change:

```bash
npx qrcode -o public/guest-qr.png -w 1200 -m 2 "https://bonaflow.vercel.app/guest"
```
