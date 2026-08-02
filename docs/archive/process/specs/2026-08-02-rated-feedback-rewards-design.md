# Rated Voice Feedback and Demo Rewards Design

**Date:** 2 August 2026

**Status:** Approved for implementation

## Purpose

Reposition BonaFlow around the guest-facing promise **“RATE FOOD. GET REWARDS.”** and make that promise true in the prototype. Guests rate a selected dish from one to five stars, explain the rating by voice or text, confirm the interpreted feedback, and receive an instant demo voucher.

Voice remains the differentiator: stars provide a comparable signal, while the explanation captures why a dish worked or why food was left. The system keeps its existing trust rule—provider output can propose an interpretation, but application code validates and decides what is stored and whether a voucher is shown.

## Decision and Superseded Rules

This design intentionally supersedes the earlier feedback constraints that prohibited ratings and decoupled rewards from submission. Specifically, it replaces the relevant parts of `2026-08-02-readme-portfolio-design.md` and the earlier guest feedback design with:

- a required 1–5 star rating;
- a required substantive voice transcript or typed alternative;
- one instant demo voucher after a valid feedback record is persisted;
- rating analytics in Operations; and
- marketing copy that leads with rating and rewards.

All unrelated BonaFlow architecture and safety decisions remain in force. The rating/reward flow must not modify live station operations or let model output issue arbitrary rewards.

## Scope

### In scope

- Update the home and feedback marketing message to **“RATE FOOD. GET REWARDS.”**
- Add an accessible one-to-five star control to `/feedback`.
- Keep voice-first feedback with a permanently available typed alternative.
- Store the guest-selected rating with each new feedback record.
- Return and display a fixed instant demo voucher after successful persistence.
- Restore the voucher on refresh and limit the normal browser flow to one voucher per event.
- Add rating and response-volume analytics to Operations.
- Add a production QR image that opens `/feedback` while preserving the existing `/guest` QR.
- Update README content and affected committed screenshots/deck exports.
- Add focused domain and route-level tests for the new contracts.

### Out of scope

- Authentication, identity, accounts, points, balances, referral programs, or prize draws.
- Production-grade fraud prevention or secure voucher redemption.
- Unique voucher inventory, payment integration, or staff redemption tooling.
- Allowing Nebius or ElevenLabs to create, select, or modify rewards.
- Reusing the existing redirect incentive as the feedback voucher state.
- Changes to the staff operational-reporting flow or guest station recommendations.

## Guest Experience

### Entry points

- The home hero uses **“RATE FOOD. GET REWARDS.”** as the primary catchphrase.
- The home projector QR becomes a dedicated feedback QR targeting `https://bonaflow.vercel.app/feedback`.
- The existing Guest mode and `public/guest-qr.png` remain available for the live station-navigation use case.
- The feedback route uses the same catchphrase and explains the exchange plainly: rate a dish, explain the rating, receive one demo voucher.

### Feedback flow

1. Guest selects a dish from the closed dish list.
2. Guest selects an integer rating from one to five stars.
3. Guest records a voice explanation or types an alternative. The trimmed explanation must contain at least five characters.
4. ElevenLabs transcribes browser-native audio when configured. Text remains editable and available even when voice is unavailable.
5. Nebius returns the existing strict leftover interpretation—amount, reason, reported facts, inferences, and confidence—or deterministic keyword interpretation is used.
6. The confirmation view displays one plain sentence containing both the direct rating and the interpretation, for example: **“4 stars. Most of the Vegan Chickpeas Quinoa Salad left, portion too large.”**
7. Guest chooses **Confirm** or **Not right, let me retype**. The star rating remains directly guest-controlled and is never inferred by the model.
8. After the feedback API validates and persists the record, it returns the fixed demo voucher.
9. The completion view displays the voucher prominently with its code, terms, and a note that it is a hackathon demo reward.

If a voucher is already stored for the current event in this browser, `/feedback` restores the voucher instead of offering another reward claim. This is deliberately a prototype-level UX limit, not an anti-fraud guarantee.

### Accessibility and trust copy

- Stars are buttons or radios with labels such as “4 out of 5 stars”; selection cannot rely on color alone.
- The selected value is shown in text.
- Recording is optional because typing is always supported.
- The page states that feedback is submitted without an account and asks guests not to include personal information in their explanation.
- Errors keep the entered dish, rating, and text so guests can retry.

## Reward Contract

The prototype uses a fixed, code-owned voucher definition:

```ts
type DemoVoucher = {
  eventId: string;
  title: "Free coffee on the Terrace";
  code: "BONAFLOW-DEMO";
  terms: "One demo voucher per browser · Hackathon prototype";
};
```

Voucher eligibility is deterministic:

- the selected dish exists in current state;
- `rating` is an integer from 1 through 5;
- the transcript or typed explanation contains at least five non-whitespace characters;
- the structured leftover interpretation passes existing closed-set validation; and
- persistence succeeds.

The server response—not Nebius output—contains the voucher. No voucher is returned after validation or persistence failure. The browser stores it under an event-scoped key such as `bonaflow:voucher:<eventId>` and restores it on a later visit.

The API cannot reliably enforce one claim per person without identity. A user can clear browser storage or call the endpoint directly. The UI and README must label this as a demo voucher and disclose the browser-scoped limitation.

## Data Model

Introduce a closed rating type:

```ts
type DishRating = 1 | 2 | 3 | 4 | 5;
```

New submissions require `rating: DishRating`. New persisted `FeedbackRecord` values include the rating alongside the existing dish, leftover amount, reason, reported facts, inferences, confidence, transcript, and timestamp.

The live Supabase row may contain feedback records written before this feature. Read-side analytics must ignore records without a valid rating rather than fail the entire state. New API writes remain strict and always require a valid rating.

The fixed voucher is not stored in the shared state and is not added to the existing operations-controlled `incentive`. That separation prevents feedback from changing guest redirects or operational behavior.

## API and Data Flow

```text
Guest dish + direct stars + voice/text
                 │
                 ├─ audio → ElevenLabs server route → editable transcript
                 │
                 └─ text → Nebius server route → structured suggestion
                                           │
                                  closed-set validation
                                           │
                              guest confirms interpretation
                                           │
                      POST /api/feedback with rating + transcript
                                           │
                         deterministic eligibility validation
                                           │
                      append feedback record to Supabase state
                                           │
                   return fixed demo voucher after successful write
                                           │
                     render + cache voucher in browser storage
```

The feedback API continues its operational-isolation assertion: remove `feedback` from current and next state and verify every other field is byte-for-byte unchanged before persistence. Rating and reward work must not affect stations, alerts, tasks, recommendations, counters, or the redirect incentive.

## Operations Analytics

Extend the existing feedback summary with:

- valid rating count;
- average rating rounded for display;
- counts for one, two, three, four, and five stars;
- number of records containing a substantive transcript;
- existing leftover-amount distribution; and
- existing reason distribution.

Operations should present the average together with the distribution and reasons so a single score never replaces the explanation. Legacy records without ratings contribute to leftover/reason analytics but not rating averages.

No operational action is triggered automatically from a low rating or model inference.

## Marketing, QR, and Visual Assets

- Replace staff-led hero language in the README and home page with **“RATE FOOD. GET REWARDS.”**
- Preserve the deeper architecture story: staff reporting remains a capability, but it is not the primary marketing catchphrase.
- Generate `public/feedback-qr.png` at the same quality as the existing guest QR, targeting the canonical `/feedback` route.
- Use the feedback QR in the home projector section and add it to the README demo section alongside the Guest QR with unambiguous labels.
- Recapture the affected Feedback and Operations mobile screenshots.
- Re-render any slide and PDF exports that embed those screenshots or outdated no-rating/no-reward language.
- Do not fabricate a working production reward; all voucher copy must say demo or hackathon prototype.

## Failure Behavior

- **No voice credential or transcription failure:** keep text entry available and show a concise recoverable error.
- **No model credential or model failure:** label and use deterministic offline interpretation.
- **Invalid rating or short explanation:** reject before submission with field-specific guidance.
- **Unknown dish or invalid interpretation:** reject on the server; do not store feedback or return a voucher.
- **Supabase write failure:** preserve the form and show retry guidance; do not return or cache a voucher.
- **Browser storage failure:** show the voucher for the completed request and explain that it may not restore after refresh.
- **Legacy unrated feedback:** include it only in leftover/reason analytics.

## Testing Strategy

Use test-driven implementation and keep coverage focused on the new risk:

1. Rating validation accepts only integers 1–5 and requires a substantive explanation.
2. Appending rated feedback persists the direct rating and keeps every operational field unchanged.
3. Voucher eligibility is deterministic and a voucher is returned only after a valid successful feedback write.
4. Feedback analytics calculate valid-rating average/distribution while safely ignoring legacy unrated records.
5. The feedback UI preserves rating/text on recoverable failure and restores an event-scoped browser voucher.
6. Existing four domain tests, type checking, and production build remain green.

Manual acceptance uses two distinct QR paths:

- feedback QR opens `/feedback`, completes a star-plus-voice/text flow, and shows the demo voucher;
- guest QR still opens `/guest` and the existing cross-device station demo remains unaffected.

## Security and Privacy Boundaries

- Supabase service-role, ElevenLabs, and Nebius credentials remain server-only.
- Rating is a direct guest fact; the model cannot overwrite it.
- The voucher definition is owned by application code; model output cannot create reward text or codes.
- Feedback is account-free, not identity-verified. The product must use “without an account” rather than promise strong anonymity.
- Transcripts are stored as event feedback and must not contain personal information.
- Browser-scoped claim limiting is bypassable and must not be represented as production fraud prevention.

## Documentation and Migration

- Update the README so the headline, feature descriptions, analytics, demo flow, QR explanation, limitations, and roadmap match the implemented product.
- Remove final-product statements that say BonaFlow has no rating or reward.
- Retain the model-proposes/code-decides, closed-set validation, feedback isolation, and server-secret explanations.
- Update the previous portfolio spec only by referencing this newer superseding design; do not rewrite historical commits.
- No SQL migration is required because the prototype stores one JSON state blob. Existing records remain readable under the legacy compatibility rule.

## Acceptance Criteria

- The home page and README lead with **“RATE FOOD. GET REWARDS.”**
- A guest cannot reach confirmation without a dish, a 1–5 rating, and at least five characters of voice transcript or typed feedback.
- The rating displayed and stored is exactly the guest-selected value.
- A successful confirmed submission displays the fixed demo voucher and restores it on refresh in the same browser/event.
- Failed validation or persistence never displays or caches a voucher.
- Operations displays rating average, star distribution, response volume, leftovers, and reasons.
- The feedback write changes only the feedback collection in shared state.
- The model and voice providers cannot write state or choose reward content.
- The feedback QR opens `/feedback`; the existing guest QR still opens `/guest`.
- A direct endpoint caller or cleared browser storage can bypass the prototype claim limit, and documentation states this limitation.
- Existing Guest, Staff, Operations, redirect, and cross-device behavior remains functional.
