# Rated Voice Feedback and Demo Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BonaFlow’s “RATE FOOD. GET REWARDS.” promise real with direct 1–5 star ratings, substantive voice/text explanations, deterministic demo-voucher issuance, rating analytics, and a dedicated feedback QR.

**Architecture:** Extend the existing isolated feedback path rather than the operational mutation loop. Guest-selected ratings and transcripts are validated by code, Nebius continues to suggest only leftover interpretation, a server service persists the feedback before returning a fixed code-owned voucher, and browser storage restores one demo voucher per event. The existing redirect incentive remains separate and unchanged.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Supabase JSON state repository, Nebius OpenAI-compatible API, ElevenLabs transcription, QRCode, GitHub/Vercel, repository-native screenshots and slide exports.

## Global Constraints

- Primary marketing catchphrase: **“RATE FOOD. GET REWARDS.”**
- A new submission requires one closed-list dish, an integer rating from `1` through `5`, and at least five trimmed explanation characters.
- Voice is the preferred explanation path; editable text is always available.
- Rating is direct guest input and must never be inferred or changed by Nebius.
- The fixed voucher is code-owned and returned only after successful validation and persistence.
- Use `Free coffee on the Terrace`, code `BONAFLOW-DEMO`, and terms `One demo voucher per browser · Hackathon prototype`.
- Browser storage provides an event-scoped prototype limit, not fraud prevention; disclose that it is bypassable.
- Feedback may change only the `feedback` collection in the shared state blob.
- Do not change staff reports, station recommendations, alerts, tasks, counters, or the operations-controlled redirect incentive.
- Keep Supabase and provider credentials server-only.
- Do not mutate production state while testing, capturing screenshots, or validating deployment.
- Preserve legacy feedback records that do not contain a rating.
- Use existing dependencies; do not add a component-test or browser-test framework.

---

## File Map

- Modify `src/domain/types.ts`: rating, voucher, and backward-compatible feedback record types.
- Modify `src/domain/feedback.ts`: rating/explanation validation and rated record append.
- Create `src/domain/rewards.ts`: fixed voucher construction and browser-storage helpers.
- Create `src/domain/feedback.test.ts`: rating, persistence isolation, reward, and storage tests.
- Modify `src/domain/operations.ts`: rating and response-volume analytics.
- Create `src/domain/operations.test.ts`: analytics tests including legacy records.
- Create `src/server/feedback-service.ts`: validate → isolate → persist → return voucher orchestration.
- Create `src/server/feedback-service.test.ts`: successful write, rejected write, and no-voucher-on-failure tests.
- Modify `src/app/api/feedback/route.ts`: delegate to the service and return its result.
- Modify `src/app/feedback/page.tsx`: stars, voice/text gating, confirmation, voucher, and restore UX.
- Modify `src/app/ops/page.tsx`: rating average, distribution, and voice-response metrics.
- Modify `src/app/page.tsx`: guest-facing marketing catchphrase, feedback CTA, and feedback QR.
- Modify `src/app/globals.css`: star selector, reward CTA, voucher, and analytics presentation.
- Create `public/feedback-qr.png`: canonical `/feedback` QR.
- Modify `README.md`: new positioning, feedback/reward architecture, demo flows, two QRs, tests, and limitation.
- Modify `docs/slides/bonaflow-build-approaches.html`: rated-feedback labels and current positioning.
- Modify `docs/slides/assets/react-feedback.png`: current Feedback screen capture.
- Modify `docs/slides/assets/react-ops.png`: current Operations analytics capture.
- Modify `docs/slides/exports/slide-2.png`: refreshed architecture slide.
- Modify `docs/slides/exports/bonaflow-build-approaches.pdf`: refreshed two-slide PDF.

---

### Task 1: Add the closed rating and voucher domain contracts

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/feedback.ts`
- Create: `src/domain/rewards.ts`
- Create: `src/domain/feedback.test.ts`
- Modify: `src/app/api/feedback/route.ts`

**Interfaces:**
- Consumes: existing `FeedbackExtraction`, `FeedbackRecord`, `BonaFlowState`, and `appendFeedback` behavior.
- Produces: `DishRating`, `DemoVoucher`, `validateDishRating(value)`, `validateFeedbackExplanation(value)`, `buildDemoVoucher(eventId)`, `voucherStorageKey(eventId)`, `loadStoredVoucher(storage, eventId)`, `storeVoucher(storage, voucher)`, and rated `appendFeedback(...)`.

- [ ] **Step 1: Write failing rating, append, and voucher tests**

Create `src/domain/feedback.test.ts` with these cases:

```ts
import { describe, expect, it } from "vitest";
import {
  appendFeedback,
  validateDishRating,
  validateFeedbackExplanation,
} from "./feedback";
import {
  buildDemoVoucher,
  loadStoredVoucher,
  storeVoucher,
  voucherStorageKey,
} from "./rewards";
import { SEED_STATE } from "./seed";

const extraction = {
  dishId: "vegan-chickpeas-quinoa-salad",
  leftoverAmount: "most",
  reason: "portion_too_large",
  reportedFacts: ["Most was left because the portion was too large."],
  aiInferences: [],
  confidence: 0.96,
} as const;

describe("rated feedback", () => {
  it("accepts only integer ratings from one through five", () => {
    expect(validateDishRating(1)).toBe(1);
    expect(validateDishRating(5)).toBe(5);
    for (const value of [0, 6, 2.5, "5", null]) {
      expect(() => validateDishRating(value)).toThrow(/rating/i);
    }
  });

  it("requires at least five trimmed explanation characters", () => {
    expect(validateFeedbackExplanation("  bland  ")).toBe("bland");
    expect(() => validateFeedbackExplanation("bad")).toThrow(/explanation/i);
  });

  it("stores the direct rating and changes only feedback", () => {
    const next = appendFeedback(
      SEED_STATE,
      extraction,
      4,
      extraction.reportedFacts[0],
      "feedback-1",
      "2026-08-02T12:00:00.000Z",
    );
    const { feedback: beforeFeedback, ...beforeOps } = SEED_STATE;
    const { feedback: afterFeedback, ...afterOps } = next;
    expect(beforeFeedback).toHaveLength(0);
    expect(afterFeedback[0]).toMatchObject({ rating: 4, id: "feedback-1" });
    expect(afterOps).toEqual(beforeOps);
  });

  it("builds and restores the event-scoped fixed demo voucher", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    const voucher = buildDemoVoucher("live");
    expect(voucher).toEqual({
      eventId: "live",
      title: "Free coffee on the Terrace",
      code: "BONAFLOW-DEMO",
      terms: "One demo voucher per browser · Hackathon prototype",
    });
    expect(voucherStorageKey("live")).toBe("bonaflow:voucher:live");
    expect(storeVoucher(storage, voucher)).toBe(true);
    expect(loadStoredVoucher(storage, "live")).toEqual(voucher);
    expect(loadStoredVoucher(storage, "another-event")).toBeNull();
  });

  it("survives unavailable or malformed browser storage", () => {
    const failing = {
      getItem: () => "not-json",
      setItem: () => { throw new Error("blocked"); },
    };
    const voucher = buildDemoVoucher("live");
    expect(loadStoredVoucher(failing, "live")).toBeNull();
    expect(storeVoucher(failing, voucher)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new test to prove the contracts are missing**

Run:

```bash
npx vitest run src/domain/feedback.test.ts
```

Expected: FAIL because `DishRating`, reward helpers, validators, and the rated append signature do not exist.

- [ ] **Step 3: Add the minimal types**

In `src/domain/types.ts`, add:

```ts
export type DishRating = 1 | 2 | 3 | 4 | 5;

export type DemoVoucher = {
  eventId: string;
  title: "Free coffee on the Terrace";
  code: "BONAFLOW-DEMO";
  terms: "One demo voucher per browser · Hackathon prototype";
};
```

Add `rating?: DishRating` to `FeedbackRecord`. The optional persisted field is read compatibility for existing JSON records; all new API writes require it.

- [ ] **Step 4: Implement strict direct-input validation and rated append**

In `src/domain/feedback.ts`, export:

```ts
export function validateDishRating(value: unknown): DishRating {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
    throw new Error("Rating must be an integer from 1 to 5.");
  }
  return value as DishRating;
}

export function validateFeedbackExplanation(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 5) {
    throw new Error("Feedback explanation must contain at least five characters.");
  }
  return value.trim();
}
```

Change `appendFeedback` to accept `rating: DishRating` between `extraction` and `transcript`, validate it again, and set `rating` on the new record. Keep its `structuredClone` and append-only behavior.

Update the existing feedback route in the same step so the tree remains type-safe: add `rating?: unknown` to the parsed body, call `validateDishRating(body.rating)` and `validateFeedbackExplanation(body.transcript)`, and pass those validated values to the new `appendFeedback` signature. The route still returns only `{ ok, feedbackCount }` until Task 2 adds the persistence-before-voucher service.

- [ ] **Step 5: Implement fixed reward and storage helpers**

Create `src/domain/rewards.ts` with a narrow storage interface so it remains testable without a browser environment:

```ts
import type { DemoVoucher } from "./types";

type VoucherStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function buildDemoVoucher(eventId: string): DemoVoucher {
  return {
    eventId,
    title: "Free coffee on the Terrace",
    code: "BONAFLOW-DEMO",
    terms: "One demo voucher per browser · Hackathon prototype",
  };
}

export function voucherStorageKey(eventId: string): string {
  return `bonaflow:voucher:${eventId}`;
}

export function loadStoredVoucher(
  storage: Pick<VoucherStorage, "getItem">,
  eventId: string,
): DemoVoucher | null {
  try {
    const raw = storage.getItem(voucherStorageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoVoucher>;
    const expected = buildDemoVoucher(eventId);
    return JSON.stringify(parsed) === JSON.stringify(expected) ? expected : null;
  } catch {
    return null;
  }
}

export function storeVoucher(
  storage: Pick<VoucherStorage, "setItem">,
  voucher: DemoVoucher,
): boolean {
  try {
    storage.setItem(voucherStorageKey(voucher.eventId), JSON.stringify(voucher));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 6: Run the focused and existing tests**

Run:

```bash
npx vitest run src/domain/feedback.test.ts src/domain/bonaflow.test.ts
npm run typecheck
```

Expected: both test files and type checking pass.

- [ ] **Step 7: Commit the domain contract**

```bash
git add src/domain/types.ts src/domain/feedback.ts src/domain/rewards.ts src/domain/feedback.test.ts src/app/api/feedback/route.ts
git commit -m "feat: add rated feedback reward contract"
```

---

### Task 2: Persist feedback before issuing the voucher

**Files:**
- Create: `src/server/feedback-service.ts`
- Create: `src/server/feedback-service.test.ts`
- Modify: `src/app/api/feedback/route.ts`

**Interfaces:**
- Consumes: Task 1 validators, rated `appendFeedback`, `buildDemoVoucher`, and a repository exposing `get()` and `replace(state)`.
- Produces: `submitRatedFeedback(repository, input, id, now)` returning `{ feedbackCount, voucher }` only after `replace` resolves.

- [ ] **Step 1: Write failing service tests**

Create `src/server/feedback-service.test.ts` with a valid input containing `rating: 4`, the Task 1 extraction, and a substantive transcript. Use this stateful in-memory repository double so the test observes real state rather than asserting on a mock:

```ts
class TestRepository {
  state = structuredClone(SEED_STATE);
  replaced: BonaFlowState | null = null;

  async get() {
    return structuredClone(this.state);
  }

  async replace(state: BonaFlowState) {
    this.replaced = structuredClone(state);
    this.state = structuredClone(state);
    return structuredClone(state);
  }
}

const repository = new TestRepository();
const result = await submitRatedFeedback(repository, input, "feedback-1", now);
expect(result.voucher.code).toBe("BONAFLOW-DEMO");
expect(result.feedbackCount).toBe(1);
expect(repository.replaced?.feedback[0].rating).toBe(4);
```

Add two failure cases:

```ts
await expect(
  submitRatedFeedback(repository, { ...input, rating: 0 }, "feedback-1", now),
).rejects.toThrow(/rating/i);
expect(repository.replaced).toBeNull();
```

and a repository whose `replace` rejects with `new Error("write failed")`; assert the returned promise rejects and therefore exposes no voucher result.

- [ ] **Step 2: Run the service test and confirm RED**

Run:

```bash
npx vitest run src/server/feedback-service.test.ts
```

Expected: FAIL because `submitRatedFeedback` does not exist.

- [ ] **Step 3: Implement the orchestration service**

Create `src/server/feedback-service.ts`:

```ts
import { appendFeedback, validateDishRating, validateFeedbackExplanation, validateFeedbackExtraction } from "@/domain/feedback";
import { buildDemoVoucher } from "@/domain/rewards";
import type { BonaFlowState } from "@/domain/types";

type FeedbackRepository = {
  get(): Promise<BonaFlowState>;
  replace(state: BonaFlowState): Promise<BonaFlowState>;
};

type RatedFeedbackInput = {
  extraction?: unknown;
  transcript?: unknown;
  rating?: unknown;
};

export async function submitRatedFeedback(
  repository: FeedbackRepository,
  input: RatedFeedbackInput,
  id: string,
  now: string,
) {
  const current = await repository.get();
  const extraction = validateFeedbackExtraction(input.extraction, current);
  const rating = validateDishRating(input.rating);
  const transcript = validateFeedbackExplanation(input.transcript);
  const next = appendFeedback(current, extraction, rating, transcript, id, now);
  const { feedback: currentFeedback, ...currentOperational } = current;
  const { feedback: nextFeedback, ...nextOperational } = next;
  if (JSON.stringify(currentOperational) !== JSON.stringify(nextOperational)) {
    throw new Error("Feedback isolation check failed.");
  }
  await repository.replace(next);
  return {
    feedbackCount: nextFeedback.length,
    voucher: buildDemoVoucher(current.event.id),
  };
}
```

- [ ] **Step 4: Make the API route a thin adapter**

In `src/app/api/feedback/route.ts`, parse the request JSON, call:

```ts
const result = await submitRatedFeedback(
  getStateRepository(),
  body,
  `feedback-${crypto.randomUUID()}`,
  new Date().toISOString(),
);
return NextResponse.json({ ok: true, ...result });
```

Retain the existing `503` mapping for Supabase errors and `400` for invalid input. Remove the duplicated append/isolation logic now owned by the service.

- [ ] **Step 5: Run service, domain, and type checks**

Run:

```bash
npx vitest run src/server/feedback-service.test.ts src/domain/feedback.test.ts
npm run typecheck
```

Expected: all tests and type checking pass.

- [ ] **Step 6: Commit persistence-before-reward behavior**

```bash
git add src/server/feedback-service.ts src/server/feedback-service.test.ts src/app/api/feedback/route.ts
git commit -m "feat: issue voucher after feedback persistence"
```

---

### Task 3: Add rating and explanation analytics

**Files:**
- Modify: `src/domain/operations.ts`
- Create: `src/domain/operations.test.ts`
- Modify: `src/app/ops/page.tsx`

**Interfaces:**
- Consumes: `FeedbackRecord.rating?: DishRating` and existing leftover/reason summary.
- Produces: `feedbackSummary(state)` with `ratedTotal`, `averageRating`, `ratings`, and `voiceResponses` in addition to existing fields.

- [ ] **Step 1: Write the failing analytics test**

Create `src/domain/operations.test.ts`. Build a cloned seed with three feedback records: ratings `5` and `3`, plus one legacy record with no rating. Give two records transcripts of at least five trimmed characters. Assert:

```ts
expect(feedbackSummary(state)).toMatchObject({
  total: 3,
  ratedTotal: 2,
  averageRating: 4,
  ratings: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
  voiceResponses: 2,
});
```

Also assert all three records contribute to leftover and reason counts.

- [ ] **Step 2: Run the analytics test and confirm RED**

```bash
npx vitest run src/domain/operations.test.ts
```

Expected: FAIL because the rating metrics do not exist.

- [ ] **Step 3: Implement backward-compatible analytics**

Initialize `ratings` as `{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }`, count only integer values from one through five, calculate `averageRating` as `null` when `ratedTotal === 0`, and count `voiceResponses` when `transcript.trim().length >= 5`. Preserve the current leftover and reason loops.

- [ ] **Step 4: Render the complete signal in Operations**

Change the feedback card heading to **“Ratings and real feedback”**. Above the existing distributions, render:

- `{summary.averageRating?.toFixed(1) ?? "—"}` with “average rating”;
- `{summary.ratedTotal}` with “rated dishes”;
- `{summary.voiceResponses}` with “voice/text explanations”; and
- a five-row star distribution using `summary.ratings`.

Keep leftover and reason distributions visible beside or below the rating data. Do not trigger any operational mutation from a rating.

- [ ] **Step 5: Run analytics tests and type checking**

```bash
npx vitest run src/domain/operations.test.ts src/domain/bonaflow.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit analytics**

```bash
git add src/domain/operations.ts src/domain/operations.test.ts src/app/ops/page.tsx
git commit -m "feat: show rated feedback analytics"
```

---

### Task 4: Build the star-plus-voice feedback and voucher UI

**Files:**
- Modify: `src/app/feedback/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `/api/feedback/interpret`, Task 2 `/api/feedback` response, `DishRating`, `DemoVoucher`, `loadStoredVoucher`, and `storeVoucher`.
- Produces: accessible feedback form, plain-sentence confirmation, recoverable errors, and restorable voucher view.

- [ ] **Step 1: Add direct UI state and voucher restoration**

Add state for `rating: DishRating | null`, `voucher: DemoVoucher | null`, and `storageWarning`. Derive `const eventId = state?.event.id` before the loading returns. Once live state supplies it, call:

```ts
useEffect(() => {
  if (!eventId) return;
  setVoucher(loadStoredVoucher(window.localStorage, eventId));
}, [eventId]);
```

Do not clear dish, rating, or text in any error branch.

- [ ] **Step 2: Add the accessible star selector**

Render five buttons with `aria-label={`${value} out of 5 stars`}`, `aria-pressed={rating === value}`, and visible star glyphs. Show `rating ? `${rating} out of 5` : "Choose a rating"` in an `aria-live="polite"` element.

The review button remains disabled until `dishId`, `rating`, and `text.trim().length >= 5` are all present.

- [ ] **Step 3: Keep voice central and text accessible**

Use this feedback hero:

```tsx
<span className="eyebrow">RATE FOOD. GET REWARDS.</span>
<h1>Tell us what you really thought.</h1>
<p>Choose stars, then use your voice to explain why. Typing always works too.</p>
```

Label the recorder section **“Explain with your voice”**, retain `VoiceRecorder`, label the textarea **“Or type your explanation”**, and show **“Submitted without an account. Please do not include personal information.”**

- [ ] **Step 4: Include the direct rating in confirmation**

Do not send rating to the interpretation endpoint. Prefix the returned summary in the confirmation blockquote with `${rating} stars. ` and keep the existing Confirm / Not right flow. Retyping keeps the selected star value.

- [ ] **Step 5: Persist and display the voucher**

Send `{ extraction, transcript: text, rating }` to `/api/feedback`. Parse `{ voucher?: DemoVoucher; error?: string }`. If no voucher is returned, treat the response as failed. After success:

```ts
setVoucher(data.voucher);
if (!storeVoucher(window.localStorage, data.voucher)) {
  setStorageWarning("Voucher issued, but this browser may not restore it after refresh.");
}
```

The voucher view must display title, code, terms, “Hackathon demo reward,” storage warning when present, and a Back to Guest link.

- [ ] **Step 6: Style the new controls**

Add focused CSS classes for `.rating-field`, `.star-row`, `.star-button`, `.star-button.is-selected`, `.privacy-note`, `.voucher-card`, `.voucher-code`, and `.voucher-terms`. Ensure a minimum 44-pixel star-button target, visible focus state, non-color selected label, and responsive layout within the current `app-shell`.

- [ ] **Step 7: Run focused tests, type checking, and build**

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 8: Commit the guest experience**

```bash
git add src/app/feedback/page.tsx src/app/globals.css
git commit -m "feat: add voice-first ratings and demo voucher"
```

---

### Task 5: Lead with the marketing promise and add the feedback QR

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `public/feedback-qr.png`

**Interfaces:**
- Consumes: canonical production URL `https://bonaflow.vercel.app/feedback`.
- Produces: feedback-first home CTA and a dedicated QR while preserving `public/guest-qr.png`.

- [ ] **Step 1: Update the home positioning**

Change the home hero paragraph to **“RATE FOOD. GET REWARDS.”** and add a primary `/feedback` CTA labeled **“Rate your meal”** with supporting text **“Stars + real voice feedback → instant demo voucher.”** Keep Guest, Staff, and Operations mode cards available below as the complete product demo.

- [ ] **Step 2: Generate the feedback QR**

Run:

```bash
npx qrcode -o public/feedback-qr.png -w 1200 -m 2 "https://bonaflow.vercel.app/feedback"
```

Verify:

```bash
file public/feedback-qr.png
```

Expected: a valid 1200 × 1200 PNG.

- [ ] **Step 3: Point the projector card at Feedback**

Use `/feedback-qr.png`, alt text **“QR code for the BonaFlow rated feedback and demo reward flow”**, heading **“Rate food. Get your demo reward.”**, and canonical feedback URL. Do not delete or repurpose `public/guest-qr.png`.

- [ ] **Step 4: Style the reward CTA and verify both QR targets**

Add `.reward-cta` styles consistent with the existing dark-green primary action. Run:

```bash
rg -n "feedback-qr|bonaflow\.vercel\.app/feedback|guest-qr|bonaflow\.vercel\.app/guest" src/app/page.tsx README.md public
```

Expected: the home page uses the feedback pair and the existing guest QR remains in the repository/README.

- [ ] **Step 5: Commit marketing and QR**

```bash
git add src/app/page.tsx src/app/globals.css public/feedback-qr.png
git commit -m "feat: lead with rated feedback rewards"
```

---

### Task 6: Update portfolio documentation and visuals

**Files:**
- Modify: `README.md`
- Modify: `docs/slides/bonaflow-build-approaches.html`
- Modify: `docs/slides/assets/react-feedback.png`
- Modify: `docs/slides/assets/react-ops.png`
- Modify: `docs/slides/exports/slide-2.png`
- Modify: `docs/slides/exports/bonaflow-build-approaches.pdf`

**Interfaces:**
- Consumes: completed UI, rating analytics, fixed voucher terms, both canonical QR assets.
- Produces: an accurate portfolio story and refreshed repository-native screenshots/deck.

- [ ] **Step 1: Rewrite contradictory README copy**

Update the README hero to lead with **“RATE FOOD. GET REWARDS.”** and explain that stars give a comparable measure while voice/text explains why. Replace every final-product claim saying there is no rating/reward or that feedback is decoupled from vouchers.

Preserve and clarify:

- model proposes/code decides;
- rating is direct input, never inferred;
- feedback cannot change operational fields;
- fixed voucher appears only after persistence;
- browser-scoped limit is bypassable prototype behavior;
- existing redirect incentive is separate; and
- text/deterministic fallbacks remain available.

- [ ] **Step 2: Add both QR journeys to README**

Display `public/feedback-qr.png` labeled **Rate + reward** and `public/guest-qr.png` labeled **Live station guide**, each about 180 pixels wide. Add a rated-feedback acceptance flow and retain the cross-device station acceptance flow.

- [ ] **Step 3: Update tests, analytics, limitations, and roadmap copy**

Document the expanded test suite, rating distribution plus reasons, fixed demo voucher, and the lack of production fraud prevention. Do not describe the demo voucher as redeemable commerce.

- [ ] **Step 4: Update the slide source**

In `docs/slides/bonaflow-build-approaches.html`, change “Anonymous feedback view” to “Rated voice feedback,” update the shared-loop copy to mention the guest reward path without implying that AI controls the voucher, and retain **“Model proposes. Code decides.”**

- [ ] **Step 5: Start a local memory-only capture server**

Run the development server with explicit empty Supabase values so Next.js does not use credentials from `.env.local`:

```bash
SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= npm run dev
```

Confirm `/api/state` returns seed state locally. Never send the following mutation to `bonaflow.vercel.app`.

- [ ] **Step 6: Seed one local rated record for the Operations screenshot**

POST to local `/api/feedback` with rating `4`, transcript **“Most was left because the portion was too large.”**, and this closed-set extraction:

```bash
curl -fsS -X POST http://127.0.0.1:3000/api/feedback \
  -H 'Content-Type: application/json' \
  --data '{"rating":4,"transcript":"Most was left because the portion was too large.","extraction":{"dishId":"vegan-chickpeas-quinoa-salad","leftoverAmount":"most","reason":"portion_too_large","reportedFacts":["Most was left because the portion was too large."],"aiInferences":[],"confidence":0.96}}'
```

Expected response: `ok: true`, `feedbackCount: 1`, and voucher code `BONAFLOW-DEMO`.

- [ ] **Step 7: Capture only the affected mobile screens**

Use headless Chrome at `480 × 932`, two-times device scale, and the local base URL to overwrite only:

```text
docs/slides/assets/react-ops.png
docs/slides/assets/react-feedback.png
```

Run:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=480,932 \
  --virtual-time-budget=6000 \
  --screenshot="docs/slides/assets/react-ops.png" \
  "http://127.0.0.1:3000/ops"

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=480,932 \
  --virtual-time-budget=6000 \
  --screenshot="docs/slides/assets/react-feedback.png" \
  "http://127.0.0.1:3000/feedback"
```

Do not recapture unchanged Guest or Staff screens. Inspect both PNGs before continuing; Feedback must show the star/voice form and Operations must show rating analytics.

- [ ] **Step 8: Re-render the affected deck exports**

Run:

```bash
./docs/slides/render-deck.sh
```

Keep `slide-1.png` only if byte-identical or unchanged in content; stage `slide-2.png` and the PDF because they embed the refreshed screens. Inspect `slide-2.png` and confirm the provider arrows still terminate at Next.js/code rather than Supabase.

- [ ] **Step 9: Validate visual and documentation consistency**

Run:

```bash
rg -n -i "RATE FOOD|GET REWARDS|rating|voice|BONAFLOW-DEMO|browser|feedback-qr|guest-qr|model proposes|code decides" README.md docs/slides/bonaflow-build-approaches.html
rg -n -i "no rating|no reward|feedback.*never unlocks" README.md docs/slides/bonaflow-build-approaches.html
file public/feedback-qr.png docs/slides/assets/react-feedback.png docs/slides/assets/react-ops.png docs/slides/exports/slide-2.png docs/slides/exports/bonaflow-build-approaches.pdf
git diff --check
```

Expected: current marketing/safety terms exist; obsolete final-product language has no matches; all assets are valid; whitespace passes.

- [ ] **Step 10: Commit documentation and refreshed visuals**

```bash
git add README.md docs/slides/bonaflow-build-approaches.html docs/slides/assets/react-feedback.png docs/slides/assets/react-ops.png docs/slides/exports/slide-2.png docs/slides/exports/bonaflow-build-approaches.pdf
git commit -m "docs: present rated voice feedback rewards"
```

---

### Task 7: Run final acceptance and prepare deployment

**Files:**
- Verify: all files changed in Tasks 1–6
- Do not modify: Supabase production state or credentials

**Interfaces:**
- Consumes: complete rated feedback/reward feature and documentation.
- Produces: evidence for integration and deployment decision.

- [ ] **Step 1: Run the complete automated verification**

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all tests pass, TypeScript reports no errors, the production build succeeds, and Git reports no whitespace errors.

- [ ] **Step 2: Verify implementation safety terms and boundaries**

```bash
rg -n "validateDishRating|validateFeedbackExplanation|submitRatedFeedback|buildDemoVoucher|BONAFLOW-DEMO|loadStoredVoucher|feedbackSummary" src
rg -n "NEBIUS_API_KEY|ELEVENLABS_API_KEY|SUPABASE_SERVICE_ROLE_KEY" src/server src/app/api
if rg -n 'rating\s*:|"rating"' src/server/nebius-feedback.ts; then exit 1; fi
rg -n "Do not produce a rating" src/server/nebius-feedback.ts
```

Expected: direct rating/reward logic exists in application code; secrets remain server-side; the Nebius feedback schema does not gain a rating field, and its prompt still forbids inferred ratings.

- [ ] **Step 3: Perform local manual acceptance**

With Supabase variables explicitly empty, verify:

1. `/feedback` requires a dish, stars, and at least five explanation characters.
2. Voice or typed feedback reaches the plain-sentence confirmation containing the selected stars.
3. Confirmation returns and displays `BONAFLOW-DEMO`.
4. Refresh restores the voucher in the same browser.
5. Clearing site storage demonstrates the documented prototype limitation.
6. `/ops` shows rating, star distribution, explanation count, leftovers, and reasons.
7. `/guest` and `/staff` retain their existing cross-device behavior.

- [ ] **Step 4: Verify the remote branch and live endpoint read-only**

```bash
git status --short --branch
git log --oneline --decorate -8
git rev-parse origin/archive/bilt-app
curl -fsS https://bonaflow.vercel.app/api/state
```

Expected: clean feature tree, Bilt archive unchanged, and production read endpoint healthy. Never invoke a production mutation during this check.

- [ ] **Step 5: Hand off integration**

Use `superpowers:verification-before-completion` and `superpowers:finishing-a-development-branch`. Because this repository has an explicitly approved direct-`main` workflow, present the actual available choice: push verified commits to `origin/main` for Vercel deployment or keep them local. After a push, confirm `HEAD == origin/main` and verify the four live routes plus both QR targets without submitting production feedback.
