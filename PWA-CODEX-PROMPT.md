# BonaFlow PWA — Codex prompt

**What this is.** A standalone Next.js PWA running the same BonaFlow demo as the Bilt app. Not a
port — an independent implementation with its own state.

**Why build it.** Two reasons, both real:

1. **The room needs it.** The demo opens with a QR code on a slide and a hundred people scanning
   it. You cannot ask an audience to install Expo Go. A PWA opens in the phone's browser.
2. **It is the complete fallback.** If Bilt breaks at 15:30, this runs the whole demo on its own.

**Keep it uncoupled from Bilt.** Separate state, separate deploy. Two stacks sharing a backend
under time pressure means one failure takes down both.

**Scope rule if you're short of time:** build the **guest view first and deploy it**. That alone
covers the audience-facing job. Staff and ops are upside.

---

## Paste this into Codex

```
Build a mobile-first Next.js 15 PWA called BonaFlow. App Router, TypeScript,
Tailwind. Deploy target is Vercel. Portrait-first, phone-sized layouts.

It is a live catering navigator for one event: guests find food they can eat with
the shortest queue; staff report shortages; operations sees alerts. No auth, no
accounts, no payments, no ordering, no maps, no ratings, no push notifications.

=== STATE: one Supabase row holding the whole state as JSON ===

Do not design a relational schema. Create one table:

  create table bonaflow_state (
    id text primary key,
    state jsonb not null,
    updated_at timestamptz not null default now()
  );

One row, id = 'live'. The entire app state lives in that JSON blob. Reads fetch
the row; writes replace it. With three devices there is no concurrency to manage,
and this removes all migration and join work.

Server-side only: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env, used only in
route handlers. Never expose the service role key to the browser. If Supabase env
vars are missing, fall back to a module-level in-memory object so the app still
runs locally — and log a clear warning that state will not survive between
serverless invocations.

Routes:
  GET  /api/state              -> the state blob
  POST /api/state/reset        -> restore the seed exactly
  POST /api/staff-update       -> body { stationId, transcript?, quickAction?, dishId? }
                                  returns an extraction for confirmation, writes nothing
  POST /api/apply              -> body { extraction } applies it, returns new state

=== LIVE UPDATES: poll every 3 seconds ===

A useLiveState() hook polls GET /api/state every 3s and returns the state. No
websockets, no realtime subscriptions — polling is reliable on conference wifi and
reads as live to an audience. Never show a full-page spinner after first load, and
never blank the screen on a failed poll: keep the last known state and its
timestamps. No manual refresh button anywhere in the app.

=== PAGES ===

/                 mode selector: three big buttons, Guest / Staff / Operations
/guest            the guest navigator      (this is what the room scans)
/staff            staff reporting
/ops              operations board

/guest — the most important page, build it first:
  - dietary filter chips: All, Vegan, Vegetarian, Gluten-free, Halal
  - a card per station: name, location label, a large traffic-light status dot,
    queue level, and its dishes with name, diet pills, and availability
  - a "recommended for you" card at the top when a filter is active
  - when a filter matches nothing, render exactly:
      "No station currently has a vegan option available."
    with the correct diet word. Never soften it and never suggest a different dish.
  - tapping a dish opens its detail: declared allergens, "visible in the bowl",
    and the source line
  - the page must update on its own when staff submit something. Nobody taps.

/staff:
  - pick a station (four buttons, no login)
  - SIX QUICK ACTIONS that work with no AI and no model call:
      Stock running low / Item sold out / Replenishment arrived /
      Queue increasing / Queue cleared / Station temporarily closed
    Dish-scoped ones ask which dish; station-scoped ones apply to the station.
  - a free-text field
  - a hold-to-talk recorder using MediaRecorder. Do not hardcode a mime type:
    iOS Safari produces mp4/aac and Android Chrome produces webm. Feature-detect
    with MediaRecorder.isTypeSupported and send whatever the browser produced.
    If getUserMedia is unavailable or denied, fall back immediately to the text
    field, pre-filled with the prepared sentence below. Never dead-end the user.

  CONFIRMATION SCREEN, mandatory: after free text or voice, show what was
  understood in plain language — Station / Dish / Availability / Queue /
  Guests waiting (reported) / Action and priority — with every field editable and
  Confirm plus Cancel. NOTHING changes in shared state until Confirm.
  Quick actions bypass this by design: a button press cannot be misheard.

  On Confirm, in this order: save the update -> set dish availability -> set
  station status and lastUpdatedAt -> create an alert -> create a replenishment
  task -> recalculate the recommendation for every dietary filter.

/ops:
  - all four stations with status, queue, dishes, low-stock items, last update time
  - active alerts, newest first, with priority and recommended action
  - open replenishment tasks; tapping one completes it
  - an incentive toggle (below)
  - a "Reset demo data" button behind a confirm dialog, calling /api/state/reset
  - a counter of staff updates submitted since the last reset

=== THE LLM: Nebius, not OpenAI ===

There are no OpenAI credits. Nebius Token Factory is OpenAI-compatible, so use the
openai npm package with a different base URL. Server-side only, in the route
handler, never in the browser.

  baseURL: "https://api.tokenfactory.nebius.com/v1/"
  apiKey:  process.env.NEBIUS_API_KEY
  model:   process.env.LM_MODEL   // Qwen/Qwen3-235B-A22B-Instruct-2507

TEXT ONLY. Do not send images to the model. Send the transcript plus the exact
closed lists of station ids/names and dish ids/names for this event.

Use response_format { type: "json_schema" } with a strict schema:

  stationId        must be one of the supplied station ids, never invented
  stationName      string
  dishId           must be one of the supplied dish ids, never invented
  dishName         string
  availability     "available" | "low" | "sold_out" | "uncertain"
  queueLevel       "low" | "medium" | "high" | "unknown"
  reportedGuestCount  number | null
  issueType        "low_stock" | "sold_out" | "queue" | "closure" | "resolved" | "other"
  priority         "low" | "medium" | "high" | "urgent"
  reportedFacts    string[]
  aiInferences     string[]
  recommendedAction string
  recommendedAlternativeStationId  string | null
  guestAnnouncement string
  confidence       number

Rules:
- reportedFacts is what the person actually said. aiInferences is what the model
  concluded. They render as two visually distinct rows and never merge. Every
  inference shows its confidence.
- reportedGuestCount is null unless a human actually said a number. Never estimate
  counts, portions or wait times.
- Validate every field server-side against the closed lists. On invalid output,
  change nothing and show the correction UI.
- FALLBACK: also write a deterministic keyword interpreter. If the Nebius call
  fails, times out after 8 seconds, or fails validation, use the keyword path and
  label the confirmation screen "offline interpretation — please check the fields".
  The demo must never block on a network call.

=== REDIRECTION: the model proposes, code decides ===

recommendedAlternativeStationId is only a suggestion. Before showing it, verify in
plain TypeScript that the station really has a matching dish marked available:

  candidates = stations having a dish with the same dietTags and availability
               "available", excluding the current station
  rank by queueLevel (low < medium < high < unknown)
  if the model's suggestion is in candidates, use it
  else if candidates is non-empty, use the best candidate
  else return null and render "No station currently has this available."

Only code may return null. This keeps redirection auditable.

=== ELEVENLABS: announcements ===

Server-side route that returns audio for the guest announcement, English and
German, under 20 words each. Pre-generate the two demo clips and commit them to
/public/audio so the stage path never waits on a network call. If ElevenLabs fails
or the key is missing, render the announcement as text — never a silent failure.

=== INCENTIVE: an ops lever, never model output ===

On the event config:
  { active: true, text: "Free coffee on the Terrace",
    appliesToStationId: "station-c",
    authorizedBy: "event_organiser", expiresAt: "<iso>" }

When active, the guest's recommended station card shows it as a chip with
"Offered by the event organiser · until 13:15", and the announcement gets one
extra clause. The model must never produce an incentive; if it returns anything
resembling one, ignore it. No points, balances, streaks, wallet or redemption
history — there are no accounts. Redemption is showing the screen at the station.

=== SEED DATA: the real event and the real dishes ===

Event: "8x Bella & Bona Mobile Hack", Delta Campus Berlin, lunch 12:30-14:00.

Stations:
  station-a  Main Hall   "main hall, left"        queue medium, green
  station-b  Atrium      "by the stairs"          queue high,   orange
  station-c  Terrace     "back room"              queue low,    green
  station-d  Grab & Go   "near the entrance"      queue low,    green

Dishes. allergens are transcribed from the printed label on each bowl, so they are
caterer-declared. visible[] is what can be seen in the bowl and is descriptive
only — it is NOT a declaration.

  chicken-pasta-salad "Chicken Pasta Salad"
    allergens: [gluten, milk, mustard, sulphite]  dietTags: []
    visible: penne, chicken, mozzarella pearls, kalamata olives, sun-dried tomato,
             roasted red pepper, herb dressing
  mediterranean-cruise "Mediterranean Cruise"
    allergens: [milk, gluten, sulphite]  dietTags: [vegetarian]
    visible: rocket, feta, sun-dried tomato, roasted red pepper, balsamic
  high-protein-chicken-rice "High Protein Chicken and Rice"
    allergens: [celery]  dietTags: [high_protein]
    visible: grilled chicken, rice, cucumber, cherry tomato, pickled red cabbage,
             tomato sauce
  thai-peanut-tofu-bowl "High Protein Thai Peanut Bowl with Chickpea & Tofu"
    allergens: null   // NOT LEGIBLE ON THE LABEL - leave null
    dietTags: [vegan, high_protein]
    visible: tofu, chickpeas, sweetcorn, carrot, cucumber, pickled red cabbage,
             peanut sauce, sesame seeds
  vegan-chickpeas-quinoa-salad "Vegan Chickpeas Quinoa Salad"
    allergens: [mustard]  dietTags: [vegan]
    visible: chickpeas, quinoa, avocado, cherry tomato, roasted red pepper,
             pumpkin seeds, herb dressing

Placement:
  Main Hall:  Mediterranean Cruise, Chicken Pasta Salad
  Atrium:     Vegan Chickpeas Quinoa Salad (availability LOW), Thai Peanut Bowl
  Terrace:    Chicken Pasta Salad, Mediterranean Cruise
  Grab & Go:  High Protein Chicken and Rice

Prepared staff sentence, used to pre-fill the text field when the mic is denied:
  "Vegan Chickpeas Quinoa Salad is almost finished, and approximately 20 guests
   are waiting."

Announcements:
  EN "The Atrium is running low. Vegan options are available on the Terrace, with
      a free coffee if you go now."
  DE "Im Atrium gibt es nur noch wenige Portionen. Vegane Optionen gibt es auf der
      Terrasse, mit einem Gratis-Kaffee."

Dish images: download these into /public/dishes at build or setup time and
reference them locally. Never fetch them at runtime — every image must render with
the network off. Show a neutral grey box, never a broken-image icon, if one is
missing.
https://raw.githubusercontent.com/kaiser-data/bonaflow/main/assets/dishes/chicken-pasta-salad.jpg
https://raw.githubusercontent.com/kaiser-data/bonaflow/main/assets/dishes/mediterranean-cruise.jpg
https://raw.githubusercontent.com/kaiser-data/bonaflow/main/assets/dishes/high-protein-chicken-rice.jpg
https://raw.githubusercontent.com/kaiser-data/bonaflow/main/assets/dishes/thai-peanut-tofu-bowl.jpg
https://raw.githubusercontent.com/kaiser-data/bonaflow/main/assets/dishes/vegan-chickpeas-quinoa-salad.jpg

=== ALLERGEN DISPLAY: two separate lines, never merged ===

1. Declared allergens with the source line "Declared by the caterer, 1 Aug".
   Where allergens is null, render exactly:
     "Allergens not recorded — ask the catering team."
   Never infer an allergen from a dish name, a photo, or the visible list.
2. "Visible in the bowl", clearly secondary and less prominent.

Never render the words "safe" or "you can eat this". The app relays a caterer's
declaration; it does not certify a meal.

=== DESIGN ===

Warm off-white background (#FBF9F4), deep green primary (#0F766E). Rounded station
cards, large status dots, big tap targets, minimal text, bottom navigation.

Status colours are reserved and may not appear anywhere else in the UI:
  green  #0F766E available     orange #F08A4B low or busy
  red    #B4432B sold out/urgent   grey #D8DDD6 no recent update

Every status value and timestamp in a monospace face. No terracotta or rust — it
is the default AI-app look and it collides with the status palette.

=== PWA ===

Real manifest with name, short_name, theme colour, 192 and 512 icons, display
standalone. A service worker that caches the shell and the dish images so the
guest view opens with poor connectivity. Must be installable on Android Chrome and
add-to-home-screen on iOS Safari. Test that /guest loads fast on a phone over a
hotspot.

=== DISCLAIMERS: visible, not hidden in an about screen ===

  "Independent hackathon prototype. Not affiliated with Bella&Bona."
  "Dish names and allergens transcribed from bowl labels, 1 Aug. Station layout
   and availability are simulated for this demo. Confirm allergens with catering
   staff."

=== BUILD ORDER: do not start anything below the line until it works ===

1. Seed data and types
2. /api/state and /api/state/reset with the Supabase blob
3. /guest with filters, cards and the 3s poll
4. /staff with quick actions and the confirmation screen
5. /apply writing state end to end
   --- THE LINE: two phones, one on /guest and one on /staff, a quick action on
       one changes the other within ~3 seconds with nobody touching it ---
6. /ops with alerts, tasks, reset and the incentive toggle
7. Nebius extraction behind the keyword fallback
8. ElevenLabs audio
9. PWA manifest and service worker
10. Visual polish

Deploy to Vercel as soon as step 3 runs. A live URL early is worth more than a
polished one late.

Do not ask non-blocking questions. Make reasonable assumptions and continue.
```

---

## After it builds

**Env vars on Vercel:**

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEBIUS_API_KEY=...
LM_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507
ELEVENLABS_API_KEY=...
```

**The only test that matters:** open `/guest` on one phone and `/staff` on another. Tap
*Item sold out* for the Vegan Chickpeas Quinoa Salad. Within ~3 seconds the guest phone changes
on its own — Atrium goes red, the vegan recommendation moves to the Terrace. Nobody touches the
guest phone.

**Then generate the QR for `/guest`** — that is what goes on the first slide, and it is the
reason this build exists.
