# BILT PROMPT — paste-ready, iOS + Android

**How to use.** Everything inside a fenced block is the prompt. Paste **Phase 0**, then **1**, run
it, see it on a phone. Then 2, then 3. **Never paste the whole file as one request** — a single
giant prompt is how you get a broken app you cannot debug at 15:00.

---

## Device plan — you have three phones and two platforms

| Device | Role in the demo |
|---|---|
| **Vijay iPhone #1** | **Guest** — the one that changes untouched at step 11. Mirrored to the projector. |
| **Vijay iPhone #2** | **Staff** — records the voice update. Held in hand, off-screen. |
| **Martin Android** | **Operations** board, and your cross-platform proof |

**Test on both platforms from the start.** Cross-platform bugs surface in minutes and cost an
hour if you find them at 15:30. Three ways to see the app:

- **Bilt's streamed simulator** — iOS-only, so this is your fast iOS loop
- **Expo Go on the iPhone** — the real thing, via QR
- **Expo Go on the Android** — the real thing, via QR

> **The go/no-go, unchanged: Phase 1 must render on a real phone by 12:45.** If Bilt fights back
> before then, drop it, say nothing about it on stage, and build the Next.js PWA instead. Bilt is
> worth exactly one thing here: the partner prize.

**Mirroring to the projector — set this up at 15:00, not 16:20:**
- **iPhone → Mac: QuickTime Player → File → New Movie Recording → click the arrow next to the
  record button → choose the iPhone as camera source.** Requires a Lightning/USB-C cable and
  tapping **Trust** on the phone. Rock solid, no wifi involved.
- **Android → Mac: `scrcpy` over USB**, with Developer options → USB debugging ON.
- Both need a **data-capable cable** — charge-only cables are common and fail silently.

---

## PHASE 0 — platform config, paste this first

```
This app must run correctly on BOTH iOS and Android. Configure the project properly
before building any screens.

app.json / app.config:
- orientation: "portrait", userInterfaceStyle: "light"
- ios.supportsTablet: false
- ios.infoPlist:
    NSMicrophoneUsageDescription:
      "BonaFlow uses the microphone so catering staff can report station updates by voice."
    NSCameraUsageDescription:
      "BonaFlow uses the camera so catering staff can photograph a serving tray."
    NSPhotoLibraryUsageDescription:
      "BonaFlow lets staff attach an existing photo of a serving tray."
- android.permissions: ["RECORD_AUDIO", "CAMERA"]

Cross-platform rules that apply to EVERY screen you build from here on:

1. SAFE AREAS. Use react-native-safe-area-context with useSafeAreaInsets, not
   hardcoded padding. The iPhone has a notch or Dynamic Island at the top and a
   home indicator at the bottom; Android has a status bar and possibly gesture
   navigation. The bottom tab bar must add the bottom inset to its height or it
   will sit under the iPhone home indicator.

2. SHADOWS. iOS uses shadowColor / shadowOffset / shadowOpacity / shadowRadius;
   Android uses elevation. Set both on every card, via Platform.select. A card
   with only iOS shadow props looks flat on Android and vice versa.

3. MONOSPACE FONT. Use Platform.select({ ios: "Menlo", android: "monospace" }).
   "monospace" alone does not resolve on iOS and silently falls back.

4. KEYBOARD. Wrap any screen with a text input in KeyboardAvoidingView with
   behavior={Platform.OS === "ios" ? "padding" : "height"}.

5. STATUS BAR. Use expo-status-bar with a style that stays legible on the warm
   off-white background on both platforms.

6. TOUCH TARGETS. Minimum 44x44 points. Use Pressable with a visible pressed
   state — the default press feedback differs between platforms, so make it
   explicit rather than relying on the platform default.

Do not use any library that is iOS-only or Android-only. If you need a native
capability, use the Expo module that covers both.
```

---

## PHASE 1 — the guest view, seeded, no backend

```
Build a mobile-first React Native app called BonaFlow for a catering event.
Tagline: "Find food faster. Keep every station flowing."
No authentication, no login, no sign-up. Large tap targets, minimal text,
bottom tab navigation. Apply every cross-platform rule from the previous message.

Start screen: a simple mode selector with three large buttons — Guest, Staff,
Operations. No passwords, no roles, it just switches views.

Build the GUEST view now. Bottom tabs: Stations, For You, Updates.

STATIONS TAB — a scrollable list of rounded station cards. Each card shows:
- station name and a location label (e.g. "by the stairs")
- a large traffic-light status dot: green = available, orange = running low or
  busy, red = sold out or closed, grey = no recent update
- queue level as text: low / medium / high / unknown
- its dishes, each with a name, dietary tags as small pills, and an availability
  label (available / low / sold out / uncertain)
- the timestamp of the last update, in the monospace font

At the top, dietary filter chips: All, Vegan, Vegetarian, Gluten-free, Halal.
Tapping one filters the list to stations that have at least one matching dish.
When a filter is active and nothing matches, show exactly:
"No station currently has a vegan option available." (with the right diet word)
Never soften this and never suggest an alternative dish.

FOR YOU TAB — one recommended station for the active dietary filter, chosen by
this rule in plain code, not by any AI:
  candidates = stations with a matching dish whose availability is "available"
  rank by queue level (low < medium < high < unknown)
  show the top one with a one-line reason: "Vegan · available · short queue"
If there are no candidates, say so plainly.

UPDATES TAB — reverse-chronological announcements with timestamps. Empty for now.

Seeded data — use exactly this. It is demo data for "Future of Work Summit
Berlin", Delta Campus, 250 guests, lunch 12:30-14:00.

Station A — Mediterranean Kitchen — "main hall, left"
  queue: medium, status: green
  - Mediterranean Chicken Bowl — tags: halal — available
  - Roasted Vegetable Couscous — tags: vegetarian — available

Station B — Green Kitchen — "by the stairs"
  queue: high, status: orange
  - Vegan Thai Curry — tags: vegan, gluten_free — LOW
  - Tofu Rice Bowl — tags: vegan — available

Station C — Pasta Corner — "back room"
  queue: low, status: green
  - Seasonal Vegetable Pasta — tags: vegan, vegetarian — available
  - Tomato Basil Pasta — tags: vegetarian — available

Station D — Grab & Go — "near the entrance"
  queue: low, status: green
  - Sandwiches — no tags — available
  - Fruit — tags: vegan, vegetarian — available
  - Salads — tags: vegan, vegetarian — available
  - Drinks — no tags — available

Design: warm off-white background, deep green primary, soft coral or orange for
warnings, red only for urgent states. Rounded cards, generous spacing, premium
but friendly. Every status value and timestamp in the monospace font. Colour
carries meaning ONLY in the station status dot — keep the rest neutral so
green/amber/red reads instantly from across a room. Do not imitate any real
catering brand's visual identity.

Permanently at the bottom of the Stations tab, small grey type:
"Demonstration data. Confirm allergens and ingredients with catering staff.
Independent hackathon prototype."

Keep all state in a single in-memory store I can later swap for an API.
Do not add payments, ordering, accounts, maps, GPS, ratings or push notifications.
```

**Check before moving on:** it renders on **an iPhone and the Android**, four stations show, the
vegan chip filters to B and C, and the bottom tabs are not under the iPhone home indicator.

---

## PHASE 2 — staff view, permissions, and the live state change

```
Now add the STAFF view. Bottom tabs: Stations, Report, Tasks.

REPORT TAB:
1. Station picker — four large buttons. No login.
2. Six QUICK ACTION buttons that work with NO AI and NO network:
   "Stock running low", "Item sold out", "Replenishment arrived",
   "Queue increasing", "Queue cleared", "Station temporarily closed".
   Tap one, pick the dish it applies to, and the shared store updates immediately.
3. A text field for a free-text update, and a hold-to-talk microphone button.
4. An optional "add tray photo" button offering camera or photo library.

AUDIO — this is the most common cross-platform failure, get it right:
- Request microphone permission with the Expo audio module before recording.
- On iOS you MUST set the audio mode with allowsRecordingIOS: true AND
  playsInSilentModeIOS: true. Without playsInSilentModeIOS, playback is COMPLETELY
  SILENT whenever the iPhone's ring/silent switch is set to silent — the app looks
  broken and there is no error. This will happen on stage if you skip it.
- After recording finishes, set the audio mode back so playback is loud on both
  platforms.
- Use a high-quality recording preset. iOS produces .m4a and Android produces .m4a
  or .3gp depending on device — do NOT hardcode a file extension or mime type.
  Read the actual URI and its type from the recording object and send that.
- The server must accept whatever container arrives from either platform.

CAMERA AND LIBRARY — use expo-image-picker for both camera capture and library
selection so one code path covers iOS and Android. Request permissions separately
for camera and library.

PERMISSION DENIAL — required on both platforms. If the user denies microphone or
camera, iOS will not prompt again from inside the app. So:
- Never leave the user on an error screen.
- Fall back immediately to the text field, PRE-FILLED with:
  "Vegan Thai Curry is almost finished, and approximately 20 guests are waiting."
- Show a small "Open Settings" link using Linking.openSettings().
The demo must be completable with the microphone permanently denied.

CONFIRMATION SCREEN — required, never skipped. After any voice or text update,
show what was understood, in plain language, before anything changes:
   Station: Green Kitchen
   Dish: Vegan Thai Curry
   Availability: sold out
   Queue: high
   Guests waiting: 20 (reported)
   Action: replenish — priority high
with "Confirm" and "Cancel", and every field editable.
NOTHING in the shared store changes until the staff member taps Confirm.

WHEN CONFIRMED, in this order:
1. save the update
2. change that dish's availability
3. change the station's status and lastUpdatedAt if warranted
4. create an alert (station, dish, priority, message, recommended action)
5. create a replenishment task (station, dish, priority, status: open)
6. recalculate the recommended station for each dietary filter
7. update the Guest view
8. update the Operations view

The Guest view must reflect this WITHOUT anyone touching it — on another device or
another tab, it updates on its own. If real-time sync is unavailable, poll the
shared store every 3 seconds. No manual refresh button anywhere.

TASKS TAB — open replenishment tasks, newest first, with station, dish, priority
and age. Tapping one marks it done.

INCENTIVES — an operational lever, NOT a rewards programme. An incentive object
lives on the event config, set by operations, and NEVER produced by any AI:
  { "active": true,
    "text": "Free coffee at Station C",
    "appliesToStationId": "station-c",
    "authorizedBy": "event_organiser",
    "expiresAt": "<iso8601>" }
When active, the guest's recommended station card shows it as a small chip below
the station name, together with a line showing who authorised it and when it
expires — e.g. "Offered by the event organiser · until 13:15". It appears with the
redirect that is already happening. Do not add a screen, a step, or a claim flow.
Redemption is simply showing this screen at the station.
Do NOT build points, balances, streaks, tiers, a wallet, redemption history, or
one-time-use codes. There are no accounts in this app and there is no currency.
For now, hardcode one incentive in the seed data; the ops toggle comes later.

Also add a hidden MANUAL OVERRIDE for the demo: long-press the Report tab title to
open a small panel that forces the scripted state change (Vegan Thai Curry at Green
Kitchen -> sold out, station -> red, alert + task created). It must work with no
network at all, on both platforms.
```

**Check before moving on:** a quick action on the iPhone changes the Android guest view **with
nothing tapped**, and the reverse. Then **flip the iPhone's silent switch on and confirm audio
still plays.**

---

## PHASE 3 — Operations view, OpenAI extraction, ElevenLabs

```
Add the OPERATIONS view. Bottom tabs: Overview, Alerts, Activity.

OVERVIEW — all four stations with status dot, queue level, available dishes,
low-stock items, and the timestamp of the last update. Highlight the most crowded
station and show the current recommended guest redirection. Grey status means "no
recent update" — show it honestly; never default a silent station to green.

ALERTS — active alerts newest first, each with priority, message and recommended
action. ACTIVITY — recent staff updates with transcripts and timestamps.

Wire free-text and voice updates to a server-side endpoint calling OpenAI with
Structured Outputs (strict). Never call OpenAI from the client and never embed the
API key in the app. Send the transcript, the optional photo, and THE EXACT LIST of
this event's station ids/names and dish ids/names.

Return exactly this schema:
{
  "stationId": "station-b", "stationName": "Green Kitchen",
  "dishId": "vegan-thai-curry", "dishName": "Vegan Thai Curry",
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

Rules, all mandatory:
- stationId and dishId MUST be ids from the supplied lists. Never invent one.
- reportedFacts = what the staff member said or the photo plainly shows.
  aiInferences = what the model concluded. Render them as two visually distinct
  rows on the confirmation screen and on the alert. They never merge.
- Every inference shows its confidence value.
- reportedGuestCount is only ever a number a human actually said. If they did not
  say one, it is null. Never estimate counts, portions or wait times.
- If the staff statement and the photo disagree, follow the statement and show
  "photo suggested available; staff reported low — using staff."
- Validate every field server-side. On invalid or partial output, keep the raw
  transcript visible, change nothing automatically, show the correction UI.
- recommendedAlternativeStationId is only a SUGGESTION. Before showing it, verify
  in plain code that the station actually has a matching dish marked "available".
  If the model's suggestion fails that check, use the deterministic rule from the
  For You tab. Code wins.

Add an INCENTIVE TOGGLE to the Operations Overview: a switch that activates the
incentive from the event config and shows which station it applies to. Turning it
on updates the guest view like any other state change. Operations controls this —
the OpenAI response must never contain an incentive field and must never invent
an offer. If the model returns anything resembling one, ignore it.

Then add ElevenLabs: transcribe the staff voice note, and speak the guest
announcement in the Updates tab, in English and German, under 20 words each. When
an incentive is active, append its text as one short clause:
  EN: "Station B is running low. Vegan options are available at Station C, with a
       free coffee if you go now."
  DE: "Station B hat nur noch wenige Portionen. Vegane Optionen gibt es an
       Station C, mit einem Gratis-Kaffee."
Pre-generate and BUNDLE these two clips so the stage path never waits on a network
call. Confirm the audio mode is set for loud playback on iOS before playing — the
silent-switch rule from the previous message applies to playback too. If ElevenLabs
fails, show the announcement as text. Never a silent failure.

FALLBACKS, all required and all tested on both platforms:
- QR scan fails -> a button "Enter Demo Event"
- microphone denied -> pre-filled text input plus Open Settings
- ElevenLabs fails -> bundled audio, or text
- OpenAI fails -> a clearly labelled cached result ("cached demo result")
- backend fails -> local seeded state, simulated in-session

Never claim a dish is allergy-safe. Never render the words "safe" or "you can eat
this". Dietary filtering matches declared tags only — the model must never decide
what a dish contains.
```

---

## Platform parity check — 5 minutes, run it at 15:00

| # | Check | Why it bites |
|---|---|---|
| 1 | **Flip the iPhone silent switch ON. Play the announcement.** | The classic. Silent playback, no error, looks broken on stage |
| 2 | Bottom tabs clear of the iPhone home indicator and the Android gesture bar | Unreachable tab = dead demo |
| 3 | Cards have shadow on iOS **and** elevation on Android | Flat cards on one platform read as unfinished |
| 4 | Timestamps render monospace on **both** | `"monospace"` silently falls back on iOS |
| 5 | Deny the mic on both, confirm the pre-filled text path still completes the demo | iOS never re-prompts after a denial |
| 6 | Record on iPhone **and** Android, confirm the server accepts both files | Different containers, one hardcoded extension breaks one platform |
| 7 | Keyboard doesn't cover the text field on either | iOS needs `padding`, Android needs `height` |
| 8 | Manual override works with **wifi off**, both phones | Your stage safety net |

---

## If Bilt doesn't get there

**Drop it at 12:45 and build the Next.js PWA.** Say nothing about it on stage. Note that a PWA
also gets you cross-platform for free — Android Chrome and iOS Safari both give camera and mic —
though **iOS Safari records to mp4/aac rather than webm**, so the same "don't hardcode the mime
type" rule applies there too.

Full spec and demo script: `BONAFLOW-MASTER-PROMPT.md`.
