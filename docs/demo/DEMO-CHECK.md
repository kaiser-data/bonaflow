# Acceptance check — run on phones, not in a preview

Works for both builds: the **Bilt** app and the **Codex PWA**. ~6 minutes. Anything failing in
block 1 is a stop-everything; blocks 2–4 are things you'd rather find now than at 16:31.

---

## Block 1 — the demo exists (do this first, always)

| # | Test | Pass looks like |
|---|---|---|
| 1 | **Guest on phone A, staff on phone B.** Tap *Item sold out* on the Vegan Chickpeas Quinoa Salad. **Do not touch phone A.** | Within ~3s the Atrium goes red on phone A, on its own |
| 2 | Vegan recommendation after that change | Moves to the Terrace |
| 3 | Reset demo data, then repeat test 1 | Board returns to seed, then changes again |

**If test 1 fails, nothing else on this page matters.** State isn't shared and you don't have a
demo — fix that before any polish, any AI, any styling.

---

## Block 2 — the things that silently break on stage

| # | Test | Why |
|---|---|---|
| 4 | **Flip the iPhone ring/silent switch ON. Play the announcement.** | Silent playback, no error, looks broken. The #1 iOS demo failure |
| 5 | Turn wifi **off** on the demo phone, fire the manual override | Your stage safety net must work with no network |
| 6 | Deny the microphone, then try to report | Falls through to pre-filled text. iOS never re-prompts |
| 7 | Airplane-mode the phone, open the guest view | Last known state stays visible. No blank screen, no infinite spinner |
| 8 | Every dish image renders with the network off | Bundled, not fetched |

---

## Block 3 — the content is right

| # | Test | Pass |
|---|---|---|
| 9 | Search the UI for "Future of Work" or "Summit" | Zero occurrences. Header says **8x Bella & Bona Mobile Hack** |
| 10 | Open the Thai Peanut Bowl | *"Allergens not recorded — ask the catering team."* Not a guessed list |
| 11 | Open any other dish | Declared allergens **and** "visible in the bowl" as two separate lines, with *Declared by the caterer, 1 Aug* |
| 12 | Filter to Halal | No match → *"No station currently has a halal option available."* Nothing softened, no alternative dish offered |
| 13 | Both disclaimers visible without hunting | Not buried in an about screen |
| 14 | Manual override + prepared staff text | Both name **Vegan Chickpeas Quinoa Salad**, not Vegan Thai Curry |

---

## Block 4 — the AI path (only once blocks 1–3 pass)

| # | Test | Pass |
|---|---|---|
| 15 | Speak the prepared sentence | Correct station, correct dish, availability low or sold out |
| 16 | Speak something awkward — *"we're nearly out of the vegan one over by the stairs"* | Either correct, or low confidence and editable. **Never a wrong dish stated confidently** |
| 17 | Say something with no number in it | `reportedGuestCount` is empty, not invented |
| 18 | Pull the Nebius key, submit text | Falls back to keyword path, labelled *offline interpretation* |
| 19 | Confirmation screen | Reported facts and AI inferences are visibly separate, inferences show confidence |

---

## Before you present

- [ ] **Reset demo data** — last action before rehearsal, and again before walking up
- [ ] iPhone silent switch **OFF**
- [ ] Mirroring tested on the actual projector (QuickTime for iPhone, `scrcpy` for Android)
- [ ] Phone hotspot on, and the demo run once on it
- [ ] Backup video recorded and **playable offline**
- [ ] QR for the guest view printed or on slide one, scanned once from across the room
- [ ] Both phones charged; power bank in your pocket

---

## Record as you go

Two lines, worth more than any feature you could add in the last hour:

1. **How many people used it** — the update counter since last reset
2. **Every sentence the model got wrong, verbatim** — this is your honest answer to
   *"what's your biggest unvalidated assumption?"*, and judges do ask
