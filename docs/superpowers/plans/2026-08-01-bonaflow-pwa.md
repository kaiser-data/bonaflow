# BonaFlow PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a phone-first BonaFlow PWA whose Supabase-backed staff updates change an untouched guest view within one three-second polling interval.

**Architecture:** Next.js 15 App Router clients call server-only route handlers backed by a `StateRepository`; Supabase stores the entire live state in one JSONB row and an in-memory repository keeps local development usable. Pure TypeScript functions validate closed IDs, mutate state, and select recommendations; Nebius and ElevenLabs are isolated behind later server routes with deterministic/text fallbacks.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase JS, OpenAI-compatible Nebius API, ElevenLabs HTTP API, Vitest, Vercel.

## Global Constraints

- Start at 14:35 and feature-freeze at 16:00; favor the earliest working public URL.
- Deploy immediately after the guest view works, then redeploy after each later task.
- Automated tests are limited to the four domain tests named in Task 2; do not install Testing Library or Playwright.
- Run TypeScript checking and `next build`; manually verify UI and live-device behavior.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `NEBIUS_API_KEY`, and `ELEVENLABS_API_KEY` server-side.
- Store prototype state in one `bonaflow_state` row with id `live`; do not normalize tables during this build.
- Poll `/api/state` every 3 seconds, preserve last-known state on failed polls, and provide no manual refresh button.
- Never render the words “safe” or “you can eat this”; never infer allergens.
- Status colors are reserved for status: green `#0F766E`, orange `#F08A4B`, red `#B4432B`, grey `#D8DDD6`.
- Use the real committed images locally; never fetch dish images at runtime.
- Quick actions never call a model; interpreted voice/text never writes before confirmation.
- The model proposes alternatives; deterministic code verifies eligibility and decides.
- Feedback contains no rating, score, average, reward, or voucher and can only append to `state.feedback`.
- Commit a production `/guest` QR PNG and render it large on `/` after the first deployment URL exists.

---

### Task 1: Supabase-first project foundation

**Files:**
- Create: `supabase/setup.sql`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `public/dishes/chicken-pasta-salad.jpg`
- Create: `public/dishes/mediterranean-cruise.jpg`
- Create: `public/dishes/high-protein-chicken-rice.jpg`
- Create: `public/dishes/thai-peanut-tofu-bowl.jpg`
- Create: `public/dishes/vegan-chickpeas-quinoa-salad.jpg`

**Interfaces:**
- Consumes: the existing five matching files under `assets/dishes/`.
- Produces: a Next.js application shell and the `public.bonaflow_state` table required by `StateRepository`.

- [ ] **Step 1: Emit the Supabase setup SQL before application work**

```sql
create table if not exists public.bonaflow_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bonaflow_state enable row level security;
revoke all on public.bonaflow_state from anon, authenticated;
```

Send the path `supabase/setup.sql` to the user immediately so it can be run in the existing Supabase project's SQL editor while the build continues.

- [ ] **Step 2: Scaffold the package and TypeScript configuration**

Use these scripts and dependencies in `package.json`:

```json
{
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "next": "^15.0.0",
    "openai": "^5.0.0",
    "qrcode": "^1.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

Configure `@/*` to map to `src/*`, enable strict mode, and import Tailwind from `src/app/globals.css`. The root layout sets title `BonaFlow`, description `Find food faster. Keep every station flowing.`, background `#FBF9F4`, and viewport suitable for standalone mobile use.

- [ ] **Step 3: Copy the five real dish images into the runtime public directory**

Run:

```bash
mkdir -p public/dishes
cp assets/dishes/chicken-pasta-salad.jpg public/dishes/
cp assets/dishes/mediterranean-cruise.jpg public/dishes/
cp assets/dishes/high-protein-chicken-rice.jpg public/dishes/
cp assets/dishes/thai-peanut-tofu-bowl.jpg public/dishes/
cp assets/dishes/vegan-chickpeas-quinoa-salad.jpg public/dishes/
```

- [ ] **Step 4: Install dependencies and verify the empty shell compiles**

Run:

```bash
npm install
npm run typecheck
```

Expected: dependencies install and TypeScript exits 0.

- [ ] **Step 5: Commit the foundation**

```bash
git add supabase/setup.sql package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs src/app/globals.css src/app/layout.tsx .env.example .gitignore public/dishes
git commit -m "feat: scaffold BonaFlow PWA and Supabase state"
```

---

### Task 2: Seed, validation, mutation, and recommendation domain

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/seed.ts`
- Create: `src/domain/validation.ts`
- Create: `src/domain/mutations.ts`
- Create: `src/domain/recommendations.ts`
- Create: `src/domain/bonaflow.test.ts`

**Interfaces:**
- Consumes: no server or UI modules.
- Produces: `BonaFlowState`, `Extraction`, `SEED_STATE`, `validateExtraction(value, state)`, `applyExtraction(state, extraction, now)`, `resetState()`, and `recommendStation(state, diet, excludeStationId?)`.

- [ ] **Step 1: Define the desired public domain contracts in the failing test**

Create `src/domain/bonaflow.test.ts` with exactly four tests:

```ts
import { describe, expect, it } from "vitest";
import { applyExtraction, resetState } from "./mutations";
import { recommendStation } from "./recommendations";
import { SEED_STATE } from "./seed";
import { validateExtraction } from "./validation";

const soldOut = {
  stationId: "station-b",
  stationName: "Atrium",
  dishId: "vegan-chickpeas-quinoa-salad",
  dishName: "Vegan Chickpeas Quinoa Salad",
  availability: "sold_out",
  queueLevel: "high",
  reportedGuestCount: null,
  issueType: "sold_out",
  priority: "urgent",
  reportedFacts: ["The item is sold out."],
  aiInferences: [],
  recommendedAction: "Replenish the salad.",
  recommendedAlternativeStationId: null,
  guestAnnouncement: "The Atrium salad is sold out.",
  confidence: 1
} as const;

describe("BonaFlow domain", () => {
  it("rejects invented station and dish identifiers", () => {
    expect(() => validateExtraction({ ...soldOut, stationId: "station-x" }, SEED_STATE)).toThrow(/station/i);
    expect(() => validateExtraction({ ...soldOut, dishId: "dish-x" }, SEED_STATE)).toThrow(/dish/i);
  });

  it("applies availability, status, alert, task, and counter in sequence", () => {
    const next = applyExtraction(SEED_STATE, soldOut, "2026-08-01T14:40:00.000Z");
    const atrium = next.stations.find((station) => station.id === "station-b")!;
    expect(atrium.dishes.find((dish) => dish.dishId === soldOut.dishId)?.availability).toBe("sold_out");
    expect(atrium.status).toBe("red");
    expect(next.alerts[0]).toMatchObject({ stationId: "station-b", priority: "urgent" });
    expect(next.tasks[0]).toMatchObject({ stationId: "station-b", status: "open" });
    expect(next.staffUpdateCount).toBe(1);
  });

  it("resets to the exact seed", () => {
    const changed = applyExtraction(SEED_STATE, soldOut, "2026-08-01T14:40:00.000Z");
    expect(resetState()).toEqual(SEED_STATE);
    expect(resetState()).not.toBe(changed);
  });

  it("ranks by queue and excludes the current station", () => {
    const state = structuredClone(SEED_STATE);
    state.stations.find((station) => station.id === "station-a")!.dishes.push({ dishId: "vegan-chickpeas-quinoa-salad", availability: "available" });
    state.stations.find((station) => station.id === "station-a")!.queueLevel = "medium";
    state.stations.find((station) => station.id === "station-c")!.dishes.push({ dishId: "vegan-chickpeas-quinoa-salad", availability: "available" });
    state.stations.find((station) => station.id === "station-c")!.queueLevel = "low";
    expect(recommendStation(state, "vegan", "station-b")?.id).toBe("station-c");
  });
});
```

- [ ] **Step 2: Run the four tests and verify RED**

Run:

```bash
npm test -- src/domain/bonaflow.test.ts
```

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement the typed seed and minimal pure functions**

`types.ts` defines the exact enums from the design and prompt, including `DietFilter = "all" | "vegan" | "vegetarian" | "gluten_free" | "halal"`, station dish placements, alerts, tasks, incentives, the operational extraction schema, `FeedbackExtraction`, and `FeedbackRecord`. `BonaFlowState.feedback` is an initially empty array. `seed.ts` transcribes the four stations and five dishes from `PWA-CODEX-PROMPT.md` and exports a deeply immutable `SEED_STATE` value.

`validateExtraction` checks all enums, confidence range, exact station/dish membership, and that the selected dish is placed at the selected station. `applyExtraction` starts from `structuredClone(state)`, performs the mandated update order, creates deterministic ids from the supplied timestamp plus collection length, strips any incentive-like model content, and recomputes `recommendations`. `resetState` returns `structuredClone(SEED_STATE)`. `recommendStation` filters to available matching placements, excludes `excludeStationId`, and sorts with `low < medium < high < unknown`.

- [ ] **Step 4: Run the four tests and typecheck to verify GREEN**

Run:

```bash
npm test -- src/domain/bonaflow.test.ts
npm run typecheck
```

Expected: four tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit the domain**

```bash
git add src/domain
git commit -m "feat: add BonaFlow state domain"
```

---

### Task 3: Supabase repository and state APIs

**Files:**
- Create: `src/server/state-repository.ts`
- Create: `src/app/api/state/route.ts`
- Create: `src/app/api/state/reset/route.ts`
- Create: `src/app/api/apply/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `BonaFlowState`, `Extraction`, `SEED_STATE`, `resetState`, `validateExtraction`, and `applyExtraction` from Task 2.
- Produces: `StateRepository { get(): Promise<BonaFlowState>; replace(state): Promise<BonaFlowState> }`, `getStateRepository()`, `GET /api/state`, `POST /api/state/reset`, and `POST /api/apply`.

- [ ] **Step 1: Implement the repository boundary**

`MemoryStateRepository` stores a module-level deep clone and logs this exact warning once:

```text
BonaFlow: Supabase env vars missing; using non-durable in-memory state that may reset between serverless invocations.
```

`SupabaseStateRepository` creates a server-only Supabase client, selects `state` from id `live`, inserts `SEED_STATE` when no row exists, and upserts replacements with a fresh `updated_at`. `getStateRepository()` selects Supabase only when both required variables exist.

- [ ] **Step 2: Implement the state, reset, and apply handlers**

Use Node route runtime. Return JSON state from GET. Reset calls `repository.replace(resetState())`. Apply parses `{ extraction }`, validates against current state, applies with `new Date().toISOString()`, persists, and returns `{ ok: true, state }`. Validation errors return status 400 with `{ ok: false, error }`; repository errors return status 503 and never report success.

- [ ] **Step 3: Add server environment documentation**

`.env.example` contains only names and safe defaults:

```dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEBIUS_API_KEY=
LM_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

- [ ] **Step 4: Verify routes compile and exercise memory fallback**

Run:

```bash
npm run typecheck
npm run build
```

Then start `npm run dev`, request `/api/state`, call `/api/state/reset`, and confirm both return a state object with four stations.

- [ ] **Step 5: Commit the API layer**

```bash
git add src/server src/app/api .env.example
git commit -m "feat: add Supabase-backed state API"
```

---

### Task 4: Guest experience and first Vercel deployment

**Files:**
- Create: `src/hooks/use-live-state.ts`
- Create: `src/components/bottom-nav.tsx`
- Create: `src/components/disclaimer.tsx`
- Create: `src/components/dish-card.tsx`
- Create: `src/components/station-card.tsx`
- Create: `src/app/guest/page.tsx`
- Create: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `GET /api/state`, domain types, and recommendation state from Tasks 2–3.
- Produces: `useLiveState(): { state; loading; stale; error; lastSuccessAt }`, `/guest`, and the initial `/` mode selector.

- [ ] **Step 1: Implement last-known-state polling**

The client hook fetches immediately, installs a 3000ms interval, aborts in-flight work on unmount, replaces state only on valid successful responses, and preserves state while setting `stale` after any failed poll. Only the first request may show a page-level loading state.

- [ ] **Step 2: Implement the guest UI**

Render filters `All`, `Vegan`, `Vegetarian`, `Gluten-free`, and `Halal`. An active filter shows the recommendation card or exact no-match copy `No station currently has a {diet} option available.` Station cards show name, location, status dot, monospace queue/timestamp, dishes, local images, diet pills, and availability. Tapping a dish expands two distinct lines: declared allergens plus `Declared by the caterer, 1 Aug`, then a secondary `Visible in the bowl` line. Null allergens render exactly `Allergens not recorded — ask the catering team.`

Render both visible disclaimers from the prompt at the bottom. Use neutral grey blocks on image errors. Use bottom navigation without a refresh control.

- [ ] **Step 3: Implement the mode selector shell**

Render three large links for Guest, Staff, Operations, a secondary `Share meal feedback` link, and reserve a projector section for the QR that will be populated in Task 9.

- [ ] **Step 4: Verify guest locally**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Open `/guest` at a narrow viewport, activate Vegan, open a dish detail, and verify no network image requests occur.

- [ ] **Step 5: Create and deploy the new Vercel project**

Run `vercel link` with a new project named `bonaflow`, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Production and Preview, then run:

```bash
vercel --prod
```

Open the production `/guest` URL and verify it renders from the Supabase `live` row.

- [ ] **Step 6: Commit the guest experience**

```bash
git add src/hooks src/components src/app/guest src/app/page.tsx src/app/globals.css
git commit -m "feat: ship live guest navigator"
```

---

### Task 5: Staff quick actions, interpretation, and shared-state gate

**Files:**
- Create: `src/domain/interpretation.ts`
- Create: `src/app/api/staff-update/route.ts`
- Create: `src/components/confirmation-form.tsx`
- Create: `src/components/voice-recorder.tsx`
- Create: `src/app/staff/page.tsx`

**Interfaces:**
- Consumes: `Extraction`, seed closed lists, `POST /api/apply`, and `GET /api/state`.
- Produces: `interpretKeywords(transcript, stationId, state): Extraction`, `quickActionExtraction(action, stationId, dishId?, state): Extraction`, `POST /api/staff-update`, and `/staff`.

- [ ] **Step 1: Implement deterministic quick actions and keyword interpretation**

Map all six actions to the exact availability, queue, issue, priority, alert, and task semantics. Dish-scoped `low`, `sold_out`, and `replenishment` require `dishId`; queue and closure actions do not. The prepared sentence maps to station B, the vegan salad, `availability: "low"`, `queueLevel: "high"`, `reportedGuestCount: 20`, and a high-priority replenishment action. Unknown text produces editable `uncertain`/`unknown` fields and never guesses a guest count.

- [ ] **Step 2: Add `/api/staff-update` with deterministic behavior first**

Accept `{ stationId, transcript?, quickAction?, dishId? }`. Quick actions return their trusted extraction without a model call. Text invokes `interpretKeywords` and returns `{ extraction, interpretationMode: "offline" }`; invalid requests return 400.

- [ ] **Step 3: Build station selection and quick-action UI**

Render four station buttons and six large actions. Dish actions open a dish chooser, then post the deterministic extraction directly to `/api/apply`. Station actions apply directly. Display success/failure without optimistic local mutation.

- [ ] **Step 4: Build text, microphone, and editable confirmation**

Feature-detect `navigator.mediaDevices`, `MediaRecorder`, and candidate MIME types via `MediaRecorder.isTypeSupported`. Hold-to-talk records with the browser-selected supported type. Because speech-to-text is not yet configured, retain the recording for the later ElevenLabs path and expose the text fallback immediately. On unavailable/denied microphone, prefill the exact prepared sentence.

Text submits to `/api/staff-update`; render editable Station, Dish, Availability, Queue, Guests waiting, Action, Priority, Reported Facts, AI Inferences, Recommended Action, and Confidence. Label fallback results `offline interpretation — please check the fields`. Confirm posts `/api/apply`; Cancel writes nothing.

- [ ] **Step 5: Prove the shared-state hard gate**

On two browser clients, open production `/guest?diet=vegan` and `/staff`. From Staff select Atrium, `Item sold out`, and Vegan Chickpeas Quinoa Salad. Confirm the Supabase row updates and Guest changes within about three seconds without interaction. Do not begin Operations until this passes.

- [ ] **Step 6: Redeploy and commit**

```bash
vercel --prod
git add src/domain/interpretation.ts src/app/api/staff-update src/components/confirmation-form.tsx src/components/voice-recorder.tsx src/app/staff
git commit -m "feat: complete staff-to-guest live loop"
```

---

### Task 6: Operations board

**Files:**
- Create: `src/domain/operations.ts`
- Create: `src/app/api/ops/route.ts`
- Create: `src/app/ops/page.tsx`

**Interfaces:**
- Consumes: `BonaFlowState`, `StateRepository`, `resetState`, and `useLiveState`.
- Produces: `completeTask(state, taskId, now)`, `setIncentiveActive(state, active)`, `POST /api/ops`, and `/ops`.

- [ ] **Step 1: Implement deterministic operations mutations and route**

Accept discriminated bodies `{ action: "complete_task", taskId }` and `{ action: "set_incentive", active }`. Complete only an existing open task. Toggle only the seeded organiser-authorized incentive; ignore all model-derived incentive content. Persist through the repository and return the new state.

- [ ] **Step 2: Build the live operations board**

Render all stations with statuses, queues, dishes, low stock, and timestamps; active alerts newest first; open tasks with completion buttons; update count; incentive toggle; and a reset button behind a native confirm dialog calling `/api/state/reset`. In a visually separate `Next event` panel, derive leftover distribution and reason counts from `state.feedback`; render no average, score, or rating.

- [ ] **Step 3: Verify, redeploy, and commit**

Run `npm run typecheck && npm run build`, exercise task completion, incentive toggle, and reset against Supabase, then:

```bash
vercel --prod
git add src/domain/operations.ts src/app/api/ops src/app/ops
git commit -m "feat: add live operations board"
```

---

### Task 7: Nebius extraction and ElevenLabs announcements

**Files:**
- Create: `src/server/nebius.ts`
- Modify: `src/app/api/staff-update/route.ts`
- Create: `src/app/api/transcribe/route.ts`
- Create: `src/app/api/announcements/route.ts`
- Create: `public/audio/announcement-en.mp3`
- Create: `public/audio/announcement-de.mp3`
- Modify: `src/components/voice-recorder.tsx`
- Modify: `src/app/staff/page.tsx`
- Modify: `src/app/guest/page.tsx`

**Interfaces:**
- Consumes: exact domain enums, closed station/dish lists, `validateExtraction`, keyword fallback, and environment variables.
- Produces: `extractStaffUpdate(transcript, stationId, state, signal): Promise<Extraction>`, voice transcription and announcement POST routes, committed demo clips, and guest announcement playback with text fallback.

- [ ] **Step 1: Add strict Nebius structured extraction**

Create an OpenAI client with base URL `https://api.tokenfactory.nebius.com/v1/`, `NEBIUS_API_KEY`, and `LM_MODEL`. Supply transcript plus exact station/dish ids and names. Request strict JSON schema for every extraction property, race the call against an eight-second abort, validate its result server-side, and discard any incentive-like text. On absent key, timeout, API error, or validation failure, return the deterministic interpretation with offline labeling.

- [ ] **Step 2: Add ElevenLabs announcement generation**

Accept `{ language: "en" | "de", text }`, enforce fewer than 20 words, and call ElevenLabs server-side using the configured voice id. On missing key or failure return `{ fallbackText: text, audioUrl: "/audio/announcement-{language}.mp3" }` when the committed clip exists, otherwise text only.

Add `/api/transcribe` as a multipart route that accepts the recorder's original `Blob` and filename without rewriting or hardcoding its MIME type. Send it to ElevenLabs speech-to-text server-side and return `{ transcript }`. On an absent key, unsupported response, or transcription failure, return status 503 so the staff client immediately reveals and pre-fills the prepared text fallback rather than dead-ending.

Update the shared recorder to post its native `Blob` to `/api/transcribe` and return the transcript to Staff. Staff then sends that text through the existing confirmation flow. Preserve the exact prepared sentence as the immediate fallback when transcription is unavailable.

- [ ] **Step 3: Generate and commit the two demo clips when the key is available**

Generate the exact English and German prompt announcements, save MP3 bytes to the two declared paths, and verify both play locally. If the key is unavailable by feature freeze, commit no fake audio bytes and keep the visible text fallback.

- [ ] **Step 4: Verify, redeploy, and commit**

Exercise a valid prepared sentence, one iOS-compatible audio upload, one Android-compatible audio upload, and a forced missing-key fallback; run `npm run typecheck && npm run build`, then:

```bash
vercel --prod
git add src/server/nebius.ts src/app/api/staff-update/route.ts src/app/api/transcribe src/app/api/announcements src/components/voice-recorder.tsx src/app/staff/page.tsx src/app/guest/page.tsx public/audio
git commit -m "feat: add resilient AI interpretation and announcements"
```

---

### Task 8: Isolated voice-first leftover feedback

**Files:**
- Create: `src/domain/feedback.ts`
- Create: `src/server/nebius-feedback.ts`
- Create: `src/app/api/feedback/interpret/route.ts`
- Create: `src/app/api/feedback/route.ts`
- Create: `src/app/feedback/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `BonaFlowState.feedback`, exact dish ids/names, `/api/transcribe`, `StateRepository`, and Nebius credentials.
- Produces: `interpretFeedbackKeywords(text, selectedDishId): FeedbackExtraction`, `formatFeedbackSummary(extraction, state): string`, `POST /api/feedback/interpret`, append-only `POST /api/feedback`, and `/feedback`.

- [ ] **Step 1: Implement the isolated feedback domain**

Define the exact closed values:

```ts
type LeftoverAmount = "none" | "some" | "most" | "unknown";
type FeedbackReason =
  | "portion_too_large"
  | "not_tasty"
  | "dietary_mismatch"
  | "other"
  | "unknown";

type FeedbackExtraction = {
  dishId: DishId;
  leftoverAmount: LeftoverAmount;
  reason: FeedbackReason;
  reportedFacts: string[];
  aiInferences: string[];
  confidence: number;
};
```

The keyword interpreter recognizes explicit phrases such as `most left`, `some left`, `finished it`, `portion too large`, `too much`, `not tasty`, and `wrong for my diet`. It never invents a dish: `selectedDishId` must be in the seed's closed list. `formatFeedbackSummary` returns sentences in the pattern `Most of the Vegan Chickpeas Quinoa Salad left, portion too large` with human-readable enum labels.

- [ ] **Step 2: Implement strict Nebius feedback interpretation**

`nebius-feedback.ts` is separate from staff extraction. It sends the transcript, selected dish, and exact closed dish list to Nebius with an eight-second timeout and strict JSON schema containing only `dishId`, `leftoverAmount`, `reason`, `reportedFacts`, `aiInferences`, and `confidence`. Validate the closed dish id, enums, and confidence server-side. On missing credentials, timeout, invalid JSON, invented ids, or API error, return `interpretFeedbackKeywords` with `interpretationMode: "offline"`.

`POST /api/feedback/interpret` accepts `{ selectedDishId, text }`, invokes the strict interpreter, and returns `{ extraction, summary, interpretationMode }`. It never persists state.

- [ ] **Step 3: Implement the append-only feedback endpoint**

`POST /api/feedback` accepts `{ extraction, transcript }`, validates the extraction again, loads current state, and creates a deep clone. It assigns only:

```ts
next.feedback = [
  ...current.feedback,
  {
    id: `feedback-${crypto.randomUUID()}`,
    ...extraction,
    transcript,
    createdAt: new Date().toISOString()
  }
];
```

Before persistence, assert that every top-level field other than `feedback` remains deeply equal to the current state. Return 400 for validation errors and 503 for repository errors. The endpoint does not import or call operational mutation, recommendation, alert, task, counter, or incentive functions.

- [ ] **Step 4: Build the voice-first feedback page**

Render dish selection followed by a large hold-to-talk control. Reuse the native-format recorder and `/api/transcribe`; on transcription failure reveal the optional text field without losing the selected dish. Text is visible at all times as `Prefer to type?`.

After interpretation, show only the plain summary sentence, an `offline interpretation` label when applicable, `Confirm`, and `Not right, let me retype`. Do not render field editors. Confirm posts to `/api/feedback`, then shows `Thank you — your feedback will help plan the next event.` Retype writes nothing and focuses the populated text field. Do not show or change an incentive, reward, voucher, points, rating, score, or average.

- [ ] **Step 5: Verify isolation manually**

Capture `GET /api/state` before submission. Exercise native voice, optional text, forced offline interpretation, and the retype path. Confirm one record, fetch state again, and compare every top-level property except `feedback` for deep equality. Verify Operations shows updated leftover/reason counts while Guest stations, Staff flow, alerts, tasks, recommendations, counters, and incentive remain unchanged.

- [ ] **Step 6: Redeploy and commit**

Run `npm test && npm run typecheck && npm run build`, then:

```bash
vercel --prod
git add src/domain/feedback.ts src/server/nebius-feedback.ts src/app/api/feedback src/app/feedback src/app/page.tsx
git commit -m "feat: add isolated voice leftover feedback"
```

---

### Task 9: Installable PWA, production QR, and release verification

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/sw.js`
- Create: `src/components/service-worker-registration.tsx`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `public/guest-qr.png`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: the stable production Vercel URL and local shell/image assets.
- Produces: installable PWA metadata, offline shell/image cache, projector-size production QR, and operator setup documentation.

- [ ] **Step 1: Add manifest, icons, and minimal service worker**

Manifest fields are `name: "BonaFlow"`, `short_name: "BonaFlow"`, `start_url: "/guest"`, `display: "standalone"`, `background_color: "#FBF9F4"`, and `theme_color: "#0F766E"`, with 192 and 512 PNG icons. The service worker precaches `/`, `/guest`, `/feedback`, manifest/icons, and all five dish images, serves cached assets on fetch failure, and does not cache API responses.

- [ ] **Step 2: Generate and render the production QR**

The project is deliberately named `bonaflow`, so generate the first QR against its canonical Vercel production domain:

```bash
npx qrcode -o public/guest-qr.png -w 1200 -m 2 "https://bonaflow.vercel.app/guest"
```

If Vercel assigns a different canonical project domain, rerun the same command with the exact URL printed by the Task 4 production deployment before committing. Render `/guest-qr.png` on `/` at up to 70vmin inside a white quiet-zone card with the caption `Scan to open Guest View` and a visible text URL.

- [ ] **Step 3: Document setup and operator checks**

README includes Supabase SQL path, environment variable names, local commands, production URL, QR regeneration command using the real domain, reset instructions, and the two-phone acceptance script.

- [ ] **Step 4: Run final automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: exactly four unit tests pass; typecheck, production build, and diff check exit 0.

- [ ] **Step 5: Run real-device release verification**

On iPhone Safari and Android Chrome verify `/guest` loads, filters and dish details work, add-to-home-screen metadata is present, cached guest shell reopens with poor connectivity, and QR scans from a projected or distant screen. Repeat the untouched guest acceptance test while Staff marks the Atrium vegan salad sold out. Reset state afterward.

- [ ] **Step 6: Final deploy and commit**

```bash
vercel --prod
git add src/app/manifest.ts public/sw.js src/components/service-worker-registration.tsx public/icon-192.png public/icon-512.png public/guest-qr.png src/app/layout.tsx src/app/page.tsx README.md
git commit -m "feat: make BonaFlow installable and demo ready"
```
