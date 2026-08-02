# BONAFLOW — MOBILE HACKATHON MASTER PROMPT

**Paste-ready build spec.** v2, integrated 12:00 · 8x × Bella&Bona Mobile Hackathon, Berlin.
Feature freeze 16:00 · Demos 16:30 · Pitches 17:15.

> Companion files: **`docs/prompts/BILT-PROMPT.md`** (phased paste prompts) ·
> **`docs/field-guide/BonaFlow-Field-Guide.pdf`** (printed reference) ·
> **`docs/demo/HANDOFF.md`** (execution only).

---

## YOUR ROLE

You are a Senior Mobile Product Designer, AI Product Architect, Full-Stack Engineer and Hackathon
Pitch Strategist. Design and build a polished mobile-first application called **BonaFlow**.

Stack:
- **Mobile-first web app (Next.js + Tailwind, installable PWA)** — see §7 for why, and when to use
  Bilt/React Native instead
- **OpenAI** — multimodal operational extraction, Structured Outputs
- **ElevenLabs** — transcription and multilingual voice announcements
- **Supabase** — shared real-time state, *if* setup is fast
- **Seeded local state** — the moment backend setup threatens the deadline

**Do not stop after planning. Build and test the working product.**
**Do not ask non-blocking questions. Make reasonable assumptions and continue.**

---

## 1. PRODUCT

**Name:** BonaFlow
**Tagline:** *Find food faster. Keep every station flowing.*

**One line:** BonaFlow is a live AI catering navigator that helps event guests find suitable food
with shorter queues, while helping catering teams spot shortages and coordinate replenishment.

### The core transformation — this must be visible on stage

A catering team converts this:

> *"Vegan Thai Curry is almost finished, and around 20 guests are waiting."*

into all of this:

- Station B dish availability → **low / sold out**
- A **high-priority replenishment task** created
- Operations dashboard updated
- Guests **redirected to Station C**
- A **multilingual voice announcement** generated

### The insight to lead with

**The gap is not sensing. The gap is distribution.** The person behind Station B already knows
the vegan curry is nearly gone. That fact is worth a great deal to 250 guests and to the kitchen,
and today it travels no further than the two metres in front of them.

> **Three seconds of a staff member's voice becomes a live redirect for every guest in the room,
> in their own language.**

---

## 2. PROBLEM

Large corporate events, conferences and pop-up restaurants repeatedly hit:

- Long queues at popular stations while another station stands quiet
- Food running out without operations knowing immediately
- Guests unable to locate vegan or vegetarian choices
- Catering staff coordinating through fragmented conversations
- Delayed replenishment; surplus at one station, shortage at another
- International guests missing announcements entirely

**Static signs and printed menus cannot respond to live conditions.** BonaFlow creates one shared
real-time view for guests and catering teams.

---

## 3. TARGET USERS

| | |
|---|---|
| **Guest** | An attendee trying to find suitable food with the shortest reasonable wait |
| **Catering staff** | A team member reporting availability, queues or operational problems |
| **Event operations manager** | Monitoring stations, alerts and replenishment tasks |

---

## 4. PRODUCT MODES

One application, one simple **demo-mode selector**: **Guest · Staff · Operations**.

**No authentication. None.** Not a login screen, not a role picker with passwords, nothing.

> **Why a mode selector and not three apps:** it is the reliability path. If the second device
> fails on stage you switch modes on one phone and the demo still runs. **But run the demo on two
> devices when you can** — the guest view changing *untouched* while you hold the staff phone is
> the single strongest moment in the pitch (§13).

---

## 5. GUEST EXPERIENCE

Guest scans an event QR code and can:

- View all catering stations
- See current queue status and food availability
- Filter by dietary preference
- Get a **recommended station**
- Read and hear live announcements
- View simple directions (a location label — *"by the stairs"* — not a map route)
- Mark that they are joining a station queue

### Dietary filters — support only these

`All` · `Vegan` · `Vegetarian` · `Gluten-free option` · `Halal option`

**Always display, non-negotiable:**

> *Dietary labels are demonstration data. Guests must confirm allergens and ingredients with
> catering staff.*

**Hard rules:**
- **Never claim a dish is allergy-safe.** Never render the words "safe" or "you can eat this."
- Filter on **declared `dietaryTags` only.** The model never decides what a dish contains from
  its name, its photo, or its own knowledge. It filters a list.
- **No match → say so flatly:** *"No station currently has a vegan option available."* Never
  soften it, never offer a "probably fine" alternative.

### Station recommendation

Rank on: dietary match → dish availability → reported queue level → station status.
**No route optimisation. No indoor positioning.**

---

## 6. STAFF EXPERIENCE

Staff select their station, then submit an update by **voice**, **text**, **optional tray
photograph**, or **quick-action button**.

### Quick actions (one tap, no AI call)

`Stock running low` · `Item sold out` · `Replenishment arrived` · `Queue increasing` ·
`Queue cleared` · `Station temporarily closed`

> These are your latency insurance and your fallback. Build them early — they exercise the entire
> downstream state machine without OpenAI in the loop.

### Confirm before apply — mandatory

**The staff member reviews the extracted update and confirms it before shared data changes.**
Show the parse in plain language with an edit affordance and a Cancel.

> This is not friction, it is the product being honest — and it *helps the demo*, because the
> judges get to see the extraction land before it takes effect.

### When the photo and the human disagree, the human wins

A tray can look full because it was just re-stacked with something else; the person standing
there knows. Rule: a staff statement outranks photo analysis, and the UI says so —
*"photo suggested available; staff reported low — using staff."* That one line is worth more than
any accuracy claim you could make.

---

## 7. ARCHITECTURE

### Surface decision

**Two viable surfaces, and the choice is about the clock, not the hardware.**

The team has **two iPhones and one Android**, so you can demo and test cross-platform properly,
and Bilt's iOS-only streamed simulator becomes an asset rather than a liability. **Build on both
platforms from the first screen** — cross-platform bugs cost minutes now and an hour at 15:30.

- **Bilt / React Native** — the partner prize, and real native camera/mic. Use the phased prompts
  in `docs/prompts/BILT-PROMPT.md`. *Generate a real React Native application, not a website wrapper.*
- **Next.js PWA** — no build step, no install friction for the room scanning your QR. Also
  cross-platform: Android Chrome and iOS Safari both give camera and mic.

**Gate: Phase 1 rendering on a real phone by 12:45.** If Bilt fights back before then, drop it,
say nothing about it on stage, and go all-in on the PWA.

> **The one iOS trap that will bite you on stage:** with the iPhone's ring/silent switch on
> silent, audio playback is **completely silent with no error** unless the app explicitly sets
> `playsInSilentModeIOS`. Set it, and also check the physical switch before you present.
> On the web path, note iOS Safari records **mp4/aac, not webm** — never hardcode the mime type.

### Routes

| Surface | Route |
|---|---|
| Guest navigator | `/e/[eventId]` |
| Staff update | `/staff` |
| Operations dashboard | `/ops` |
| Mode selector | `/` |

### State

**Supabase** — `stations`, `dishes`, `staff_updates`, `alerts`, `replenishment_tasks` + one photo
bucket. Realtime subscription if it's free; **otherwise poll every 3 seconds and stop thinking
about it.** Polling is the reliable choice in a room with bad wifi, not a compromise.

**Never in-memory** — serverless drops it between requests, the phone writes, the laptop reads
nothing, and you lose twenty minutes finding out why. If Supabase costs more than 25 minutes,
fall back to **seeded local state in one session** and simulate the sync reliably (§12).

### The sequencing rule that unblocks everything

**Ship a stub `POST /api/staff-update` returning hardcoded valid JSON within twenty minutes.** The
UI wires against the stub immediately and never waits. Swap the real OpenAI call in behind the
same shape.

```
GET  /api/event/:eventId    → { event, stations[], dishes[], alerts[], tasks[] }
POST /api/staff-update      → { stationId, transcript?, imageBase64?, quickAction? } → extraction
POST /api/apply             → { extraction } → writes state, returns { ok, changed[] }
GET  /api/guest?diet=vegan  → filtered + ranked stations/dishes
```

---

## 8. THE AI CONTRACT

One server-side call per staff update. **Structured Outputs, `strict: true`. Keys stay
server-side.**

**Inputs:** staff transcript · optional tray photo · **the closed list of this event's station
ids/names and dish ids/names**.

```json
{
  "stationId": "station-b",
  "stationName": "Green Kitchen",
  "dishId": "vegan-thai-curry",
  "dishName": "Vegan Thai Curry",
  "availability": "available | low | sold_out | uncertain",
  "queueLevel": "low | medium | high | unknown",
  "reportedGuestCount": 20,
  "issueType": "low_stock | sold_out | queue | closure | resolved | other",
  "priority": "low | medium | high | urgent",
  "reportedFacts": ["string"],
  "aiInferences": ["string"],
  "recommendedAction": "string",
  "recommendedAlternativeStationId": "station-c",
  "guestAnnouncement": "string",
  "confidence": 0.0
}
```

### Rules that make this survive contact with a live demo

- **Closed sets.** `stationId` and `dishId` **must** be ids from the supplied lists. The model may
  never invent one. This single constraint removes most of the hallucination class you would
  otherwise spend the afternoon debugging.
- **Separate reported facts from AI inferences.** `reportedFacts` = what the staff member said or
  the photo shows. `aiInferences` = what the model concluded. **They render as visually distinct
  rows and never merge.** Every inference carries `confidence`.
- **Never present uncertain visual analysis as fact.** If the photo is the only source and the
  model is unsure, it goes in `aiInferences`, not `reportedFacts`.
- **Never invent a count.** `reportedGuestCount` is only ever what a human said. If they didn't
  say a number, it is `null`. No portion counts, no grams, no percentages, no wait-time predictions.
- **`recommendedAlternativeStationId` is a proposal, not a decision** — see §9.
- Validate every field server-side. On invalid or partial output: keep the raw transcript visible,
  **apply nothing automatically**, show the correction UI. **Never invent certainty.**

### Prompt the model explicitly

> *You are given a sentence from a catering staff member, optionally a photo of a serving tray,
> and the exact list of stations and dishes at this event. Identify which station and which dish
> are referred to — you may only use ids from the supplied lists. Report availability and queue
> level. Put anything the staff member said or the photo plainly shows in reportedFacts; put
> everything you concluded in aiInferences with a confidence value. If the staff statement and the
> photo disagree, follow the statement. Do not estimate portions, counts or wait times. If you
> cannot match a station or dish confidently, set confidence below 0.5 and issueType "other"
> rather than guessing. Write guestAnnouncement as one sentence under 20 words naming where a
> guest should go instead.*

---

## 9. REDIRECTION — the model proposes, code decides

The model returns `recommendedAlternativeStationId`. **Validate it before you ever show it:**

```
resolveRedirect(dish, fromStation, modelSuggestion):
  candidates = stations having a dish with the same dietaryTags AND availability == "available"
  drop fromStation
  rank by queueLevel (low < medium < high < unknown), then by locationLabel proximity
  best = candidates[0] or null

  if modelSuggestion is in candidates: return modelSuggestion   // agreement
  if best exists:                      return best              // code overrides, log it
  return null → "No station currently has this available."
```

**Deterministic code wins on disagreement, and it is the only thing that can return `null`.**
Say it on stage: *"the model reads, the rules decide — that's why it's auditable."* A caterer
who has to explain a decision to a client hears that clearly.

---

## 9a. INCENTIVES — the lever that makes redirection actually work

A redirect on its own is **advice**, and advice moves maybe a third of a queue. An incentive moves
most of it:

> *"Station C has vegan options and a shorter queue — **and a free coffee if you head over
> now.**"*

This is the beat that turns BonaFlow from a dashboard that *observes* into an operations tool that
*acts*. Caterers already do this by hand with a staff member shouting; you're making it targeted,
timed and measurable. **It is also the answer to "so what?" on the ops side** — the manager isn't
just watching Station B go red, they have a lever to rebalance the room.

Offer only what a caterer can actually absorb: **free coffee · free dessert · a drink upgrade ·
skip-the-queue at a quieter station.** Low marginal cost, high perceived value, no kitchen work.

### The boundaries — read these before building it

- **The model NEVER offers an incentive.** It is not in the extraction schema and never comes out
  of OpenAI. An LLM inventing free dessert is your app promising something the caterer did not
  authorise. **Ops sets it. Full stop.**
- **One-off, attached to a specific redirect. Not a points economy.** No balances, no history, no
  leaderboard, no streaks, no accounts — auth is banned anyway (§4), and a currency invites *"what
  redemption rate do you expect?"*, a question you cannot answer.
- **Redemption is: show this screen at Station C.** No payment, no scan validation, no
  integration, no one-time-use enforcement. If a judge asks about abuse, the honest answer is
  *"it's a coffee, and the alternative is a 20-minute queue — the caterer decides the risk."*
- **`authorizedBy` and an expiry are mandatory and both render.** An incentive with no visible
  authority and no end time is a promise nobody owns.
- **Label it as demonstration data** like everything else (§13).

### Shape — event/ops config, never model output

```json
{
  "incentive": {
    "active": true,
    "text": "Free coffee at Station C",
    "appliesToStationId": "station-c",
    "authorizedBy": "event_organiser | caterer | us_for_demo",
    "expiresAt": "2026-08-01T13:15:00Z"
  }
}
```

Ops toggles it from the Operations view. When active, it rides along with the redirect that is
already firing — **no extra screen, no extra demo step** — as a chip under the recommended
station and one clause appended to the announcement.

**If you are behind, cut the ops toggle and hardcode one incentive in the seed data.** The pitch
line survives intact; only the control surface goes.

---

## 10. OPERATIONS EXPERIENCE

Dashboard shows: all stations · current status · queue level · available dishes · low-stock items
· active alerts · replenishment tasks · most crowded station · recommended guest redirection ·
recent staff updates · **timestamp of the last update**.

**Traffic-light status:**

| | |
|---|---|
| 🟢 **Green** | Available |
| 🟠 **Orange** | Running low or busy |
| 🔴 **Red** | Sold out, closed or urgent |
| ⚪ **Grey** | **No recent update** |

**Grey is the honest one — build it.** A station nobody has reported on is not "fine", it is
unknown, and showing that distinction is more credible than a board that is green everywhere by
default. Every status carries a timestamp; **stale is shown as stale.**

---

## 11. DATA MODEL

```
Event               id · name · venue · guestCount · lunchStart · lunchEnd
Station             id · name · locationLabel · queueLevel · status · lastUpdatedAt
Dish                id · stationId · name · dietaryTags[] · availability
StaffUpdate         id · stationId · transcript · imageUrl · extractedData ·
                    confirmed · createdAt
Alert               id · stationId · dishId · priority · message · recommendedAction ·
                    status · createdAt
ReplenishmentTask   id · stationId · dishId · priority · status · assignedTo · createdAt
```

---

## 12. REAL-TIME BEHAVIOUR

On staff confirmation, in this order:

1. Save the `StaffUpdate` with `confirmed: true`
2. Update the `Dish.availability`
3. Update `Station.status` and `Station.lastUpdatedAt` if warranted
4. Create the `Alert`
5. Create the `ReplenishmentTask`
6. **Recalculate the recommended guest station** (§9)
7. Update Guest View
8. Update Operations View
9. Generate the ElevenLabs announcement

**If true real-time sync is unavailable, simulate it reliably within one application session** —
and label it. Polling at 3s reads as real-time to an audience and never fails mysteriously.

**Build the manual override at 15:00.** A hidden control that forces the state change. If the
parse hangs on stage, tap it and say *"the parse is real, I'm firing the cached one."* Honest,
and the demo continues.

---

## 13. DEMO EVENT — seeded, and clearly labelled

**Future of Work Summit Berlin** · Delta Campus · 250 guests · lunch 12:30–14:00

| Station | Dishes | Dietary | Initial state |
|---|---|---|---|
| **A — Mediterranean Kitchen** | Mediterranean Chicken Bowl · Roasted Vegetable Couscous | vegetarian option, halal option | queue **medium**, availability good |
| **B — Green Kitchen** | Vegan Thai Curry · Tofu Rice Bowl | vegan, gluten-free option | queue **high**, **Vegan Thai Curry low** |
| **C — Pasta Corner** | Seasonal Vegetable Pasta · Tomato Basil Pasta | vegetarian, vegan option | queue **low**, availability good |
| **D — Grab & Go** | Sandwiches · Fruit · Salads · Drinks | — | queue **low**, availability good |

**Label all event, menu and operational information as demonstration data.**

> ### On real data — the deliberate call
> The seeded event is the **demo path**, because a scripted two-minute demo needs guaranteed
> initial state and you cannot script on data you have not collected yet.
> **If you get ahead**, capture today's actual hackathon lunch — real station names, real dish
> names, three tray photos (full / half / nearly empty) — and add it as a **second seed record**
> with an event switcher. Then you get to say on stage: *"and we ran this on your actual lunch
> today."* The judges ate that food; it is the strongest credibility line available to you.
> **This is opportunistic, not a dependency. Never let it block §17.**

---

## 14. WINNING DEMO SCENARIO — implement exactly this

1. Guest opens BonaFlow. **QR on your first slide — ask the room to scan it.**
2. Guest taps the **Vegan** filter.
3. **Station B** appears as the closest dietary match — but queue is **high**.
4. **Station C** is shown as the recommended alternative.
5. Switch to **Staff View**. Select **Station B**.
6. Staff records: *"Vegan Thai Curry is almost finished, and approximately 20 guests are waiting."*
7. OpenAI extracts the operational update.
8. Staff **reviews and confirms**.
9. **Station B changes orange → red.**
10. A **high-priority replenishment task** appears.
11. **Guest View updates.** *Do not touch the guest device. Let it change by itself.*
12. Vegan guests are redirected to **Station C**.
13. ElevenLabs announces: *"Station B is running low. Vegan options are available at Station C —
    **and a free coffee if you head over now.**"*
14. Operations View shows the new alert and the latest update.

> **The line to say over step 13:** *"And it doesn't just tell them to move — it gives the caterer
> a lever to actually move them. That's the difference between a dashboard and an operations
> tool."* The incentive chip appears with the redirect; it costs no extra demo step (§9a).

**Under two minutes.** Step 11 is the entire pitch — protect it above everything else.

---

## 15. ELEVENLABS

- Staff voice **transcription**
- Spoken **guest announcements**
- **English and German** options
- Optional spoken confirmation for staff

**Under 20 words.** Pre-generate the demo announcements at 15:00 so the stage path never waits on
a network call.

> EN: *"Station B is running low. Vegan options are available at Station C."*
> DE: *"Station B hat nur noch wenige Portionen. Vegane Optionen gibt es an Station C."*

*(Use whichever transcription key authenticates first — ElevenLabs Scribe or OpenAI Whisper. Do
not spend ten minutes on the preference.)*

---

## 16. DESIGN DIRECTION

Premium but friendly food-event interface. It should feel **live, clear, fresh, operational,
trustworthy, and immediately understandable.**

- Warm off-white background · **deep green** primary · soft coral/orange for warning · **red only
  for urgent**
- Rounded station cards · **large status indicators** · simple food icons · clear dietary tags
- Large tap targets · minimal text · bottom navigation · portrait-first

**Two refinements that cost nothing and read as operational:** put every **status value and
timestamp in a monospace face** — monospace-for-data is an honesty signal; and let **colour carry
meaning only in station status**, so green/amber/red reads instantly from the back of the room.

**Bottom navigation**

| Guest | Staff | Operations |
|---|---|---|
| Stations · For You · Updates | Stations · Report · Tasks | Overview · Alerts · Activity |

**Do not copy Bella&Bona's visual identity.** Include, visibly:

> *Independent hackathon prototype created for demonstration purposes.*

---

## 17. BUILD PRIORITY

**Do not start secondary features until the complete simulated journey works.**

1. Guest station list
2. Dietary filtering
3. Staff update form
4. **Confirmation screen**
5. **Shared station-state update** ← the journey is real once this works
6. Operations dashboard
7. OpenAI extraction
8. ElevenLabs announcement
9. Camera input
10. Visual polish

**Gate: by 14:15 the loop must run end to end on quick-actions alone, with no OpenAI in the
path.** If it doesn't, you are behind — go to the floor (§20).

---

## 18. MOBILE REQUIREMENTS

Runs on **a physical iPhone and a physical Android** · microphone access · image capture or
upload · portrait · responsive loading states · **permission-denied recovery** · one-hand
reachability · **text alternative to voice always** · demo station selection if QR scanning fails.

**Cross-platform musts** (full detail and the parity checklist in `docs/prompts/BILT-PROMPT.md`): safe-area
insets so tabs clear the iPhone home indicator · shadow *and* elevation on cards · monospace via
`Platform.select` (`"monospace"` silently falls back on iOS) · `KeyboardAvoidingView` behaviour
per platform · never hardcode an audio mime type, iOS and Android produce different containers ·
iOS never re-prompts after a permission denial, so always fall through to the pre-filled text
path plus an Open Settings link.

**Device plan:** iPhone #1 = guest (mirrored, the screen that changes untouched) · iPhone #2 =
staff (in hand, off-screen) · Android = operations board and cross-platform proof.

**Projector mirroring — set up at 15:00, not 16:20:**
- **iPhone → Mac: QuickTime → File → New Movie Recording → arrow beside record → select the
  iPhone.** Needs a cable and tapping **Trust**. No wifi involved.
- **Android → Mac: `scrcpy` over USB**, Developer options → USB debugging ON.
- Both need a **data-capable cable** — charge-only cables are common and fail silently.

---

## 19. DO NOT BUILD

Payments · food ordering · user accounts · real GPS navigation · precise indoor positioning ·
camera-based crowd counting · facial recognition · exact tray-volume measurement · exact wait-time
prediction · real Bella&Bona integration · production inventory management · delivery logistics ·
complex menus · push-notification infrastructure · multi-event management · App Store deployment
· ratings or gamification of any kind.

**Not a complaint box** — guests report availability, not grievances. No ticketing, no support
inbox. **Not a nutrition tracker** — dietary tags render and stop. **No allergen or calorie
estimation from a photo, ever.**

**Not a rewards programme.** The incentive in §9a is a one-off operational lever attached to a
redirect. **Do not build** points, balances, streaks, tiers, a wallet, redemption history,
one-time-use codes, or anything a guest could "collect". The moment it becomes a currency it needs
accounts, it invites *"what redemption rate?"*, and you are demoing a loyalty app.

---

## 20. FALLBACKS

| Fails | Do this |
|---|---|
| **QR scanning** | A button: **Enter Demo Event** |
| **Microphone** | Text input, **pre-filled with the prepared staff update** |
| **ElevenLabs** | Pre-generated audio, or display the announcement as text |
| **OpenAI** | A **clearly labelled** cached demonstration result |
| **Supabase** | Local seeded state, simulated update within the session |
| **The live update doesn't fire** | The manual override (§12). Say it's cached. |
| **The live build** | Tested backup build **and a recorded screen capture** |

### Feature-cut order

1. German announcements
2. Tray-image analysis
3. QR scanner
4. Replenishment assignment
5. Persistent Supabase storage
6. Dynamic AI recommendation *(fall back to the deterministic rule in §9 — it stands alone)*

**Never remove:** guest station view · dietary filter · staff update · status change · alert ·
guest redirection · operations dashboard · **the manual override** · **the backup recording**.

### The floor — the smallest demo that still wins

One laptop, two browser windows side by side. Staff window: quick-action **"Item sold out."**
Guest window: watch it turn red, re-rank, and hear the announcement. Say plainly: *"Two windows,
one laptop — the loop is real, the transport is simple."* **A working loop beats a beautiful app
with a broken one.** Know this floor so you don't panic at 15:00.

---

## 21. SUCCESS CRITERIA

- [ ] A judge understands the problem within 15 seconds
- [ ] Guest View shows four stations
- [ ] Dietary filtering works, driven by **declared** tags
- [ ] The app recommends an alternative station
- [ ] Staff can submit a voice or text update
- [ ] OpenAI converts it into validated structured data against the **closed** id lists
- [ ] Staff **confirms** before anything changes
- [ ] Station B changes status
- [ ] A replenishment alert and task appear
- [ ] **Guest View reflects the change without being touched**
- [ ] `reportedFacts` and `aiInferences` are visibly separate, with confidence
- [ ] ElevenLabs plays the announcement (EN, and DE if kept)
- [ ] Grey "no recent update" state exists and timestamps are visible
- [ ] Manual override tested
- [ ] **Backup video recorded**
- [ ] Disclaimers visible: *demonstration data* · *confirm allergens with catering staff* ·
      *independent hackathon prototype*
- [ ] Full demonstration under two minutes, with a complete fallback path

---

## 22. THREE-MINUTE PITCH

1. **Hook** — *"At large events, the problem is rarely that there is no food. The problem is that
   guests and catering teams don't know what's happening across every station."*
2. **Problem** — queues, shortages, dietary confusion, fragmented staff communication.
3. **Product** — BonaFlow.
4. **Live demonstration** — the Station B scenario (§14).
5. **Business value** — better guest experience · faster operational response · better
   distribution between stations · fewer avoidable shortages · directional waste reduction ·
   structured event data · **a targeted lever to rebalance the room, not just observe it** (§9a).
   *Do not put a euro figure on any of these. You cannot substantiate one, and a sharp founder
   will ask.*
6. **Technology** — OpenAI, ElevenLabs, Bilt/PWA, Supabase. One sentence each. **Then the line
   that lands:** *"The model reads. The rules decide. That's why it's auditable."*
7. **Expansion** — conferences · corporate campuses · festivals · stadiums · universities ·
   trade fairs.
8. **Close** — *"BonaFlow turns every catering station into a connected, responsive part of the
   event."*

**Have ready for Q&A:**
- *"Do you detect queues?"* → **"No, and we don't claim to. Your staff already know. We move what
  they know to everyone who needs it, in three seconds."** Stronger than a fake sensor, and true.
- *"Is this only for events?"* → B&B sell event catering explicitly ("meetings to all-day
  events"). **Ask a B&B person at lunch how big that line is** and use their number, don't guess.
- *"What's next?"* → §23.

---

## 23. WHAT'S NEXT — one sentence, then stop

BonaFlow reads the **supply** side live during the event. The natural extension reads the
**demand** side after it: what guests left behind, and why. Same loop, two moments.

> *"Today BonaFlow keeps the event flowing. The same stations know what ran out and what didn't —
> after the event, that becomes what to cook more of next time."*

**Say the sentence and stop.** Do not sketch a second product on stage, and do not build any part
of it today. It exists to show you know where this goes, nothing more.

---

## FINAL IMPLEMENTATION INSTRUCTIONS

1. Inspect the current project.
2. Choose the fastest reliable implementation.
3. **Build the complete simulated journey first** — quick-actions only, no AI.
4. Add external API integrations only after the core flow works.
5. Keep all API keys server-side.
6. Add demonstration data (§13).
7. Test on a physical phone.
8. Test microphone and image permissions, **and the denied path**.
9. Test every fallback in §20.
10. Prepare the two-minute demonstration.
11. **Record a backup demo.**
12. Stop adding features once the critical journey is polished.

**Do not ask non-blocking questions. Make reasonable assumptions and continue.**

At completion, report: what works · what is simulated · which API keys are required · how to run
it · how to open it on a phone · known limitations · the exact demo sequence · the final pitch ·
**the biggest unvalidated assumption**.

**Begin building BonaFlow now.**
