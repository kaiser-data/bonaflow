# BonaFlow PWA Design

## Objective

Build and deploy a mobile-first Next.js 15 PWA for the BonaFlow hackathon demo. The first release must prove the core cross-device loop: a staff action changes shared Supabase state and an untouched guest view reflects the change within roughly three seconds.

Implementation begins at 14:35 with a hard feature freeze at 16:00. Decisions prioritize a working public URL and real-phone verification within that 85-minute window.

The PWA is independent from the Bilt application. It has its own deployment and state. A new Vercel project will be created from this GitHub repository and connected to the user's existing Supabase project.

## Delivery Priorities

Supabase setup begins immediately rather than waiting for the local UI. The setup SQL is the first implementation artifact so the user can create the table while the application is being written.

The implementation then follows this order and does not advance past the shared-state gate until it works:

1. Supabase setup SQL, typed event seed, and deterministic state logic.
2. Supabase-backed state routes, wired to credentials as soon as they are supplied.
3. Guest view with dietary filters, recommendations, images, and polling, followed immediately by the first Vercel deployment.
4. Staff quick actions and confirmation workflow.
5. End-to-end staff-to-guest shared-state update.
6. Operations view.
7. Nebius extraction with deterministic fallback.
8. ElevenLabs announcements with committed fallback audio.
9. PWA offline support and final visual polish.

Deploy again after every completed step from step 4 onward. A working early URL takes priority over later polish.

The initial prototype uses the real dish images already under `assets/dishes/`. They are copied into `public/dishes/` at build time and never fetched at runtime.

## Architecture

The application uses Next.js 15 App Router, TypeScript, Tailwind CSS, and Vercel. Browser code calls only same-origin Next.js route handlers. Supabase credentials, Nebius credentials, and ElevenLabs credentials remain server-side.

Supabase stores all live application state in one row:

```sql
create table if not exists bonaflow_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
```

The row id is `live`. Route handlers read and replace the JSON blob. This is deliberately simpler than normalized tables for the prototype. Normalization can be introduced later behind the same repository interface without changing the UI contracts.

The data layer has two implementations behind one interface:

- `SupabaseStateRepository` when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist.
- `MemoryStateRepository` for local development when they do not, with a prominent server warning that state is not durable across serverless invocations.

## State and Mutation Boundaries

The seed contains event metadata, four stations, five real dishes, alerts, replenishment tasks, the incentive configuration, and a staff-update counter. Dish placements are station-specific so availability can change at one station without changing every copy of that dish.

All state changes pass through pure TypeScript functions before persistence. The mutation engine:

1. validates station and dish identifiers against the seed's closed sets;
2. updates dish availability when relevant;
3. updates station status, queue level, and timestamp;
4. creates an alert when the issue requires one;
5. creates or resolves a replenishment task;
6. increments the staff-update counter; and
7. recalculates recommendations for every supported dietary filter.

Quick actions generate trusted deterministic extractions and can apply immediately after any required dish selection. Text and voice updates must pass through the editable confirmation screen before `/api/apply` persists anything.

## Live Data Flow

`useLiveState()` performs an initial `GET /api/state`, then polls every three seconds. It retains the last valid state and timestamp if later polls fail, exposes a non-blocking stale/error indicator, and never blanks the page after initial load.

The critical flow is:

```text
Staff quick action -> POST /api/apply -> validate and mutate -> replace Supabase row
                                                   |
Guest poll <- GET /api/state <- read Supabase row <-+
```

The guest recommendation is computed in code. Eligible alternatives must contain an available dish matching the active dietary filter, must not be the current station, and are ranked by queue level. A model suggestion is accepted only if it remains eligible.

## User Experience

### Mode selector

`/` presents three large phone-friendly links: Guest, Staff, and Operations. A compact bottom navigation remains available throughout the three role views so one device can cover the entire demo.

### Guest

`/guest` is the primary surface and ships first. It includes the five dietary filters, an active-filter recommendation, four station cards, traffic-light status, queue values, locations, dish availability, and local dish images. Dish details separate caterer-declared allergens from the visibly observed ingredients and always display the mandated source and disclaimer language.

When no available station matches a filter, the exact no-match sentence is shown with the corresponding diet word. The UI never claims a dish is safe or tells a guest they can eat it.

### Staff

`/staff` begins with four station buttons. Six quick actions operate without AI. Dish-scoped actions require a dish choice; station-scoped actions do not.

Free text and microphone recordings use `/api/staff-update`. MediaRecorder support and MIME type are feature-detected. Microphone denial immediately reveals and pre-fills the prepared text sentence.

The confirmation view shows editable Station, Dish, Availability, Queue, Reported guests, Action, Priority, Reported facts, AI inferences, confidence, and recommended action. Cancel discards the extraction. Confirm is the only path that persists interpreted input.

### Operations

`/ops` shows all station states, active alerts newest first, open replenishment tasks, last-update timestamps, and the update counter. Tasks can be completed. The incentive can be toggled by operations and never originates from model output. Reset requires confirmation and restores the seed exactly.

## External Services and Failure Handling

Supabase is the only required hosted dependency for the cross-device prototype. A setup SQL file is emitted first and committed so the schema and seed can be installed immediately and reproducibly. Supabase credentials are supplied and wired in parallel with the local build rather than after it.

Nebius uses the OpenAI-compatible SDK only inside `/api/staff-update`, with an eight-second timeout and strict JSON-schema output. Server-side validation rejects invented identifiers or invalid enums. Any timeout, API error, or invalid result invokes the deterministic keyword interpreter and labels the result as an offline interpretation.

ElevenLabs is a later-stage enhancement. Its route generates short English and German announcements server-side. The two stage-demo clips are committed under `public/audio/`; missing credentials or service failures fall back to those assets and then to visible text.

Missing dish images render a neutral grey placeholder. Poll failures retain the last known state. Apply failures make no local optimistic mutation and keep the confirmation available for retry.

## PWA and Visual System

The app uses an installable manifest, 192px and 512px icons, standalone display mode, an offline shell, and cached local dish images. It is portrait-first and tested on the available iPhone and Android devices.

Once the first production URL exists, the build generates a QR code whose target is the deployed `/guest` URL. The QR is committed as a PNG and rendered at a large, high-contrast size on the home page so it can be scanned from a projected slide. It is regenerated if the production domain changes.

The visual system follows the supplied palette: warm off-white background, deep green primary, rounded cards, large tap targets, and monospace state values and timestamps. Status colours are reserved exclusively for status communication. Disclaimers remain visible in the role views rather than being hidden in an about screen.

## Testing and Verification

The automated test budget is intentionally limited to four high-value Vitest unit tests for the demo's deterministic core:

- closed-set validation rejects an invented `stationId` or `dishId`;
- apply sequencing updates dish availability, station status, alert, replenishment task, and counter;
- reset restores the exact seed; and
- recommendation ranking prefers the shorter queue and excludes the current station.

No browser-testing dependency or browser binary is installed during the build window. Type checking and a production build still run. UI, microphone, polling, PWA installation, and cross-device behavior are verified manually on the available real phones.

After the first and subsequent deployments, the Vercel URL is tested with one guest client and one staff client against the Supabase row. The acceptance test is an `Item sold out` update for the Vegan Chickpeas Quinoa Salad causing Atrium to change status and the vegan recommendation to move within one polling interval without touching the guest client.

## Deployment and Secrets

The repository is connected to a newly created Vercel project. These server-only variables are configured in Vercel rather than committed:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEBIUS_API_KEY`
- `LM_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507`
- `ELEVENLABS_API_KEY`

The prototype can deploy once Supabase is connected and the guest route is ready. Nebius and ElevenLabs variables may be added later without blocking the core deployment.
