# HANDOFF — BonaFlow build day

**Read §1–§4, then build. Do not re-derive strategy.**

Sat 1 Aug 2026 · 8x × Bella&Bona Mobile Hackathon · Delta Campus, Donaustraße 44, Berlin
Martin (kaiser-data) + Vijay · **Demos 16:30** · Pitches 17:15 · **Feature freeze 16:00**

> **Files.** Spec of record: **`docs/prompts/BONAFLOW-MASTER-PROMPT.md`** — paste from there,
> never from the PDF. Bilt phases: **`docs/prompts/BILT-PROMPT.md`**. Printed reference:
> **`docs/field-guide/BonaFlow-Field-Guide.pdf`**.
> *(The earlier BonaLoop concept was deleted. Its only surviving use is the one roadmap sentence
> in §10 — you need nothing else from it.)*

---

## 1. Sixty-second context

**BonaFlow** — *find food faster, keep every station flowing.* A live AI catering navigator:
guests find suitable food with shorter queues; catering teams spot shortages and coordinate
replenishment.

**The core transformation, visible on stage:**

> *"Vegan Thai Curry is almost finished, and around 20 guests are waiting."*
> → Station B goes red · high-priority replenishment task · ops dashboard updates · **guests
> redirected to Station C** · multilingual announcement.

**The insight:** the gap is not sensing, **it's distribution.** The person behind Station B
already knows. That fact reaches nobody in time. *Three seconds of staff voice becomes a live
redirect for every guest in the room, in their own language.*

---

## 2. Decided — do not relitigate

- **BonaFlow is locked.** Pivoted from BonaLoop at 11:35 with zero code written.
- **One app, three modes** — Guest / Staff / Operations, via a plain mode selector. **No auth.**
- **Mobile-first, cross-platform, and you have the devices for it** — Vijay's two iPhones +
  Martin's Android. **Test on both platforms from the first screen**; cross-platform bugs cost
  minutes now and an hour at 15:30.
- **Bilt is genuinely viable now** (its streamed simulator is iOS-only, which is an asset with
  iPhones in the room). **Still gated: Phase 1 on a real phone by 12:45, or drop it silently**
  and build the Next.js PWA. The gate is about the clock, not the hardware.
- **Model proposes, code decides.** OpenAI extracts; the redirect is validated against actual
  availability by a deterministic rule, and **code wins on disagreement** (MASTER §9).
- **Closed sets.** `stationId` / `dishId` must come from the event record. Never invented.
- **Staff confirm before anything changes.** Not friction — it's the honesty, and judges get to
  watch the extraction land before it applies.
- **`reportedFacts` and `aiInferences` never merge**, and every inference carries confidence.
- **We do not detect queues.** Reported by staff. Say so — stronger than a fake sensor, and true.
- **Never claim a dish is allergy-safe.** Filter declared tags only; always show *"demonstration
  data — confirm allergens with catering staff."*
- **Seeded demo event is the demo path** (§5). Real lunch data is opportunistic, never a blocker.
- **Incentives are in scope. A rewards programme is not** (MASTER §9a). A redirect can carry
  *"free coffee at Station C"* — that's what turns advice into movement, and it's the ops team's
  lever, not a guest feature. **Ops sets it; the model never offers one** (an LLM inventing free
  dessert promises something the caterer never authorised). No points, balances, streaks, wallet
  or redemption history — those need accounts and invite *"what redemption rate?"*. Redemption is
  **"show this screen at Station C."** `authorizedBy` + expiry always visible.

---

## 3. First 20 minutes — the rule that unblocks everything

**Ship a stub `POST /api/staff-update` returning hardcoded valid JSON.** The UI wires against it
immediately and never waits. Real OpenAI swaps in behind the same shape.

**Agree the data model together, on paper, ten minutes, before either of you types.** Cheapest
ten minutes of the day.

```
GET  /api/event/:id       → { event, stations[], dishes[], alerts[], tasks[] }
POST /api/staff-update    → { stationId, transcript?, imageBase64?, quickAction? } → extraction
POST /api/apply           → { extraction } → writes state, returns { ok, changed[] }
GET  /api/guest?diet=vegan → filtered + ranked
```

Entities: `Event · Station · Dish · StaffUpdate · Alert · ReplenishmentTask` (MASTER §11).

**Store: Supabase**, or **seeded local state** the moment it costs more than 25 minutes.
Realtime if free, **otherwise poll at 3s and stop thinking about it.** **Never in-memory.**

---

## 4. Build order — do not start anything below the line until the line works

| # | | Owner |
|---|---|---|
| 1 | Guest station list | A |
| 2 | Dietary filtering | A |
| 3 | Staff update form + **quick actions** | A |
| 4 | Confirmation screen | A |
| 5 | **Shared station-state update** ← *the journey is real here* | B |
| 6 | Operations dashboard | B |
| — | **14:15 GATE — full loop runs on quick-actions alone, no OpenAI in the path** | — |
| 7 | OpenAI extraction | B |
| 8 | ElevenLabs announcement (EN, then DE) | B |
| 9 | Camera input | A |
| 10 | Visual polish | both |

**Quick actions first** (`stock low` · `sold out` · `replenishment arrived` · `queue up` ·
`queue cleared` · `station closed`) — they exercise the whole state machine with no AI, and they
are your latency insurance *and* your fallback.

### Clock

| | |
|---|---|
| **12:20** | Stub shipped, deployed to Vercel, live URL exists |
| **14:15** | **HARD GATE** — staff action → guest view changes untouched. Ugly is fine. |
| **15:00** | Freeze the hero path · **build the manual override** · pre-generate the announcements · test scrcpy |
| **15:30** | **Record the backup video** |
| **16:00** | **FREEZE.** Rehearse the two-device dance twice. Test audio in the room. |

---

## 5. Demo event — seeded and labelled

**Future of Work Summit Berlin** · Delta Campus · 250 guests · 12:30–14:00

| Station | Dishes | Dietary | Start |
|---|---|---|---|
| **A · Mediterranean Kitchen** | Med. Chicken Bowl · Roasted Veg Couscous | vegetarian, halal opt | queue medium, good |
| **B · Green Kitchen** | **Vegan Thai Curry** · Tofu Rice Bowl | vegan, GF opt | **queue high, curry LOW** |
| **C · Pasta Corner** | Seasonal Veg Pasta · Tomato Basil Pasta | vegetarian, vegan opt | queue low, good |
| **D · Grab & Go** | Sandwiches · Fruit · Salads · Drinks | — | queue low, good |

**Label everything as demonstration data.**

**If you get ahead:** capture today's real lunch as a *second* seed with an event switcher —
real station and dish names, three tray photos (full/half/empty). Then on stage: *"and we ran
this on your actual lunch today."* The judges ate that food. **Opportunistic only. Never let it
block the build.** Ask before photographing anyone; quote people exactly.

**Also ask one B&B person:** *"How much of your business is event and buffet catering versus
daily office delivery?"* Their number goes in your Q&A. Don't guess it.

---

## 6. The demo — under two minutes, protect step 11

1. Guest opens BonaFlow. **QR on slide one — ask the room to scan.**
2. Tap **Vegan**.
3. Station B = best dietary match, **but queue high**.
4. Station C shown as recommended alternative.
5. Switch to **Staff View** → Station B.
6. *"Vegan Thai Curry is almost finished, and approximately 20 guests are waiting."*
7. OpenAI extracts.
8. Staff **reviews and confirms**.
9. Station B **orange → red**.
10. High-priority **replenishment task** appears.
11. **Guest View updates — do not touch the guest device. Count to two out loud.**
12. Vegan guests redirected to **Station C**.
13. ElevenLabs: *"Station B is running low. Vegan options are available at Station C — **and a
    free coffee if you head over now.**"*
14. Ops View shows the alert and the latest update.

**Say this over step 13:** *"And it doesn't just tell them to move — it gives the caterer a lever
to actually move them. That's the difference between a dashboard and an operations tool."*
The incentive chip rides along with the redirect; **it costs no extra demo step.**

**Step 11 is the entire pitch.** The mode selector saves you if a device dies.

**Devices:** iPhone #1 = **guest** (mirrored, the one that changes untouched) · iPhone #2 =
**staff** (in hand, off-screen) · Android = **ops board** and your cross-platform proof.

**Mirroring, set up at 15:00 — not 16:20:**
- **iPhone → Mac: QuickTime → File → New Movie Recording → arrow next to record → pick the
  iPhone.** Needs a cable and tapping **Trust**. Rock solid, no wifi.
- **Android → Mac: `scrcpy` over USB**, USB debugging ON.
- Both need a **data-capable cable** — charge-only cables are common and fail silently.

**⚠ Before you go on stage: flip the iPhone's ring/silent switch OFF.** With it on silent, audio
playback is completely silent with no error unless the app sets `playsInSilentModeIOS`. It is the
single most common iOS demo failure.

---

## 7. If it breaks

| Fails | Do this |
|---|---|
| **QR** | Button: **Enter Demo Event** |
| **Mic** | Text input, **pre-filled with the staff line** |
| **ElevenLabs** | Pre-generated audio, or show the text |
| **OpenAI** | **Clearly labelled** cached result |
| **Supabase** | Local seeded state, simulate within the session |
| **Live update doesn't fire** | The **manual override**. *"The parse is real, I'm firing the cached one."* |
| **Everything** | Backup video. Then §8. |

**Cut order:** German → tray-image analysis → QR scanner → replenishment assignment → persistent
Supabase → dynamic AI recommendation *(the deterministic rule in MASTER §9 stands alone)*.

**Never cut:** guest station view · dietary filter · staff update · status change · alert · guest
redirection · ops dashboard · manual override · backup recording.

---

## 8. The floor — the smallest demo that still wins

One laptop, two browser windows. Staff window: quick-action **"Item sold out."** Guest window:
watch it turn red, re-rank, and hear the announcement.

*"Two windows, one laptop — the loop is real, the transport is simple."*
**A working loop beats a beautiful app with a broken one.** Know this floor so you don't panic
at 15:00.

---

## 9. Must be true at 16:00

- [ ] Runs on **a real iPhone and a real Android**, portrait, no login
- [ ] Announcement plays with the **iPhone silent switch ON** (or the switch is off and checked)
- [ ] Four stations · dietary filter works on **declared** tags
- [ ] Staff submits voice or text; **quick actions** work with no AI
- [ ] Validated structured extraction against the **closed** id lists
- [ ] Staff **confirms** before state changes
- [ ] **Guest view changes without being touched**
- [ ] `reportedFacts` / `aiInferences` visibly separate, with confidence
- [ ] Redirect names a real station, chosen by code
- [ ] Alert + replenishment task appear; ops board shows priority, grey state, timestamps
- [ ] ElevenLabs announces (EN, DE if kept)
- [ ] Manual override tested · **backup video recorded**
- [ ] Disclaimers visible: *demonstration data* · *confirm allergens with catering staff* ·
      *independent hackathon prototype*
- [ ] Full flow under two minutes with a complete fallback path

---

## 10. Q&A pocket

- **"Do you detect queues?"** → *"No, and we don't claim to. Your staff already know. We move
  what they know to everyone who needs it, in three seconds."*
- **"Is this only for events?"** → B&B sell event catering explicitly. Use the number you got at
  lunch (§5).
- **"What's next?"** → *"Today BonaFlow keeps the event flowing. The same stations know what ran
  out and what didn't — after the event, that becomes what to cook more of next time."*
  **Say the sentence and stop.** Don't sketch a second product on stage.
- **No euro figures on business value.** You cannot substantiate one and a sharp founder will ask.

---

## 11. Notes for the assistant

- **Don't re-plan.** Execute, unblock, keep the clock visible.
- **State the time and the next gate in every reply.** Gates: **12:20** (stub + deploy),
  **14:15** (loop on quick-actions), **15:00** (freeze + override), **16:00** (feature freeze).
- **Push back on scope.** Any new feature after 14:15 is a threat, not a contribution.
- **Never claim something works without seeing it work.** Ask for the screenshot or the output.
- Martin: physics PhD, 4+ yrs LLM/document processing, ~15 hackathons this year. Knows Supabase,
  Next.js, FastAPI, LangGraph, MCP. Skip the basics.
- **Honesty is the differentiator.** Cached, seeded or overridden must be labelled in the UI and
  said out loud. Do not let that drift.
