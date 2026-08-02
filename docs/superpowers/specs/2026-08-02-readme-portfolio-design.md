# BonaFlow Portfolio README Design

**Date:** 2 August 2026

**Status:** Approved for specification

## Purpose

Turn the repository README from a minimal setup note into a polished engineering portfolio case study. A visitor should understand the product, see it working, follow its cross-device data flow, recognize the important technical decisions, and find the live demo or local setup within a few minutes.

The primary audience is portfolio visitors and technical recruiters. The README should remain useful to developers, but it should lead with outcomes and engineering judgment rather than installation commands.

## Scope

- Rewrite only `README.md`.
- Reuse the committed React screenshots, slide exports, QR image, and existing project documentation.
- Do not modify application source, dependencies, production state, deployment configuration, or Supabase schema.
- Do not modify `archive/bilt-app`.
- Present Bilt briefly as a prototyping lesson, not as part of the production architecture.
- Keep ratings and rewards out of the final-product description.
- Do not expose credentials or imply that missing optional AI/voice credentials are active.

## Content Strategy

The README is a visual engineering case study with three levels of detail:

1. **Immediate scan:** title, pitch, live links, screenshots, and core outcome.
2. **Engineering review:** workflow, architecture, trust boundary, resilience, and stack.
3. **Developer handoff:** setup, environment, verification, deployment, repository map, and limitations.

Sections must be short enough to scan on GitHub. Prefer short paragraphs, tables, diagrams, and concrete bullets over long narrative blocks.

## README Structure

### 1. Hero

Include:

- `BonaFlow` title.
- Pitch: a mobile-first live catering navigator that turns staff reports into guest guidance and operations actions.
- Event/demo context: 8x × Bella & Bona Mobile Hack, Delta Campus Berlin.
- Prominent links to the live Guest, Staff, Operations, and Feedback routes.
- Links to the two-slide PDF and editable HTML presentation.
- Compact text badges using Markdown inline-code styling for Next.js, React, TypeScript, Supabase, Vercel, PWA, Nebius, and ElevenLabs. Do not use externally hosted badge images, claim passing CI, or imply active credentials.
- A visual row using the committed React Guest and Operations screenshots. Use HTML `<img>` elements with explicit widths so the tall mobile captures remain legible and do not dominate the page.

### 2. Problem and Product

Explain the problem in portfolio language:

- Guests cannot see which station has suitable food or the shorter queue.
- Staff observations stay local unless there is a fast shared reporting path.
- Operations needs alerts, tasks, and redirect controls rather than a passive dashboard.
- Leftover observations should inform the next event without introducing ambiguous ratings or paid-feedback bias.

Then state the product outcome: one shared event state connects Guest, Staff, Operations, and anonymous Feedback views.

### 3. One Shared Operational Loop

Show the lifecycle as five numbered steps:

1. Staff chooses a station and submits a quick action, text report, or voice note.
2. Server-side interpretation produces a structured suggestion or deterministic fallback.
3. Validation rejects unknown station/dish identifiers and invalid enum values.
4. Pure mutation logic updates station state, alerts, tasks, counters, and eligible recommendations in Supabase.
5. Guest and Operations screens see the shared state on the next three-second poll.

Add the independent feedback path: anonymous leftover records append to the feedback array and cannot change operational state or incentives.

### 4. Architecture and Infrastructure

Embed `docs/slides/exports/slide-2.png` as the main architecture visual and provide a compact Mermaid diagram beneath it for GitHub readers who want the system boundaries:

```text
Guest / Staff / Ops / Feedback
              ↓
        Next.js on Vercel
              ↓
Server routes → validation → pure mutations
              ↓
     Supabase shared state
```

Nebius and ElevenLabs connect only through Next.js server routes. Nebius proposes structured interpretations; code validates and decides. ElevenLabs handles transcription and announcement audio. Both have visible text or deterministic fallbacks.

The diagram must not show Nebius or ElevenLabs writing directly to Supabase.

### 5. Key Engineering Decisions

Use concise decision cards or a table:

- **Model proposes; code decides:** model output cannot bypass eligibility checks.
- **Closed-set validation:** station IDs, dish IDs, and enums are validated against current state.
- **Pure mutations:** state transitions remain deterministic and independently testable.
- **Repository boundary:** Supabase persistence has an in-memory development fallback.
- **Polling over sockets:** three-second polling recovers naturally on unreliable event Wi-Fi.
- **Graceful degradation:** voice/model failures reveal text or deterministic interpretation.
- **Feedback isolation:** feedback only appends anonymous records and never unlocks incentives.
- **Server-only secrets:** browser code never receives service-role or provider keys.

### 6. Product Screens

Create a four-column HTML table or responsive visual row using:

- `docs/slides/assets/react-guest.png`
- `docs/slides/assets/react-staff.png`
- `docs/slides/assets/react-ops.png`
- `docs/slides/assets/react-feedback.png`

Each image gets a one-line description:

- **Guest:** dietary filtering, availability, queues, recommendations, and announcements.
- **Staff:** deterministic quick actions plus editable voice/text confirmation.
- **Operations:** station overview, alerts, replenishment tasks, incentive control, and leftover signals.
- **Feedback:** anonymous voice-first leftover amount and reason capture with no rating or reward.

### 7. From Prototype to Distribution

Keep this section brief and positive. Embed `docs/slides/exports/slide-1.png`, then state:

- Bilt was valuable for beginner-friendly natural-language prototyping, integrated backend work, and native-quality experience.
- The preview still required Expo Go, which blocked immediate audience access.
- React PWA required more engineering but enabled QR-to-browser distribution and Vercel deployment.
- The Bilt implementation remains preserved on `archive/bilt-app`; no Bilt runtime code is merged into `main`.

Do not repeat or endorse the early Bilt rating/reward behavior visible in its source history.

### 8. Technology Stack

Use a responsibility table:

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Interface | Next.js 15, React 19, TypeScript, Tailwind CSS | Mobile-first routes and components |
| Server | Next.js route handlers, Zod | Secret-safe provider calls and validation |
| State | Pure TypeScript domain functions | Deterministic mutations and recommendations |
| Persistence | Supabase Postgres JSON state | Cross-device event state |
| AI interpretation | Nebius OpenAI-compatible API | Strict structured suggestions |
| Voice | ElevenLabs | Speech-to-text and bilingual announcement audio |
| Delivery | GitHub, Vercel, PWA manifest/service worker | Deployment, browser access, installation, and offline shell |
| Verification | Vitest, TypeScript, Next.js production build | Domain tests and build gates |

Use actual package versions only where they are already stable and visible in `package.json`; avoid unnecessary badge/version duplication.

### 9. Live Demo and QR

Present a route table with role, URL, and purpose. Display `public/guest-qr.png` at approximately 180 pixels wide and explain that it targets the canonical `/guest` route.

Include the exact acceptance flow:

1. Open Guest on one phone and Staff on another.
2. In Staff, select Atrium → Item sold out → Vegan Chickpeas Quinoa Salad.
3. Within one polling interval, Guest shows Atrium red and recommends Terrace.
4. Operations shows the alert and replenishment task.
5. Reset demo state from Operations when finished.

### 10. Local Development

Keep setup direct:

1. Run `supabase/setup.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env.local`.
3. Supply the required Supabase values and optional provider keys.
4. Run `npm install` and `npm run dev`.

Document environment variables by name and responsibility without example secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEBIUS_API_KEY` (optional; deterministic fallback without it)
- `LM_MODEL` (optional; defaults to the configured Qwen model)
- `ELEVENLABS_API_KEY` (optional; text fallback without it)
- `ELEVENLABS_VOICE_ID` (optional)

State that missing Supabase variables invoke the non-durable in-memory development repository.

### 11. Verification and Deployment

Show:

```bash
npm test
npm run typecheck
npm run build
```

Explain the deliberately small four-test domain suite:

- rejects invented station/dish IDs;
- applies the status/alert/task/counter sequence;
- resets the seed exactly;
- ranks recommendations by queue and excludes the current station.

Deployment copy should describe GitHub → Vercel and Supabase environment configuration without publishing CLI tokens or provider credentials.

### 12. Repository Map, Limitations, and Roadmap

Repository map:

- `src/app/` — routes and server handlers
- `src/domain/` — types, validation, recommendations, mutations, seed
- `src/server/` — persistence and provider adapters
- `src/components/` — reusable interface units
- `supabase/setup.sql` — database bootstrap
- `docs/slides/` — presentation source, screenshots, and exports
- `archive/bilt-app` — separate Git branch containing the Bilt prototype

Limitations must be honest:

- Hackathon prototype with one shared event state and no authentication.
- Station layout and availability are simulated demo data.
- Provider features depend on optional credentials and fall back safely.
- Not affiliated with Bella & Bona; allergens must be confirmed with catering staff.

Roadmap should stay compact: authenticated multi-event operations, audit history, richer analytics, and optional native-store packaging after PWA validation.

## Visual Rules

- Use only repository-relative image links so GitHub renders them.
- Give every image meaningful alt text.
- Keep raw mobile screenshots between 180 and 230 pixels wide.
- Use the slide exports at full README width because they are 16:9 and designed for distance readability.
- Avoid animated GIFs, external image hosting, and new generated artwork.
- Do not duplicate the same screenshot more than once outside the two comparison slides.

## Verification

- Confirm every relative image path exists with `test -f` or `rg --files`.
- Confirm all live links use `https://bonaflow.vercel.app`.
- Confirm environment variable names match `.env.example` and server code.
- Confirm architecture claims against `src/domain/`, `src/server/`, and route handlers.
- Confirm package/stack claims against `package.json` and `next.config.ts`.
- Confirm no rating, score, reward, or voucher is described as part of final feedback.
- Run `git diff --check`.
- Because implementation changes only `README.md`, application tests and build are not required solely for this documentation edit; run the existing tests if any application file changes unexpectedly.

## Acceptance Criteria

- A portfolio visitor can identify the problem, product, live demo, architecture, and principal engineering decisions without opening source files.
- The README uses the committed screenshots, architecture slide, comparison slide, and production QR.
- The README presents Bilt as a brief prototyping lesson and the React PWA as the final distribution approach.
- Infrastructure boundaries and provider fallbacks are technically accurate.
- Setup, verification, deployment, limitations, and roadmap remain useful to developers.
- Only `README.md` changes during implementation.
