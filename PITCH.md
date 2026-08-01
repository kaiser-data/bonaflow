# BonaFlow — what we're building today

**Find food faster. Keep every station flowing.**

---

## The 20-second version — use this all day

> **"At a catered event, guests can't find the food they can actually eat — and the one person
> who knows the vegan bowls are nearly gone is the only person who knows it. BonaFlow turns three
> seconds of staff voice into a live redirect for the whole room."**

If someone only hears one more sentence:

> *"The gap isn't sensing. It's distribution. The information already exists in a human's head —
> we just move it to everyone who needs it."*

---

## The 60-second version — for judges, mentors, the B&B team

**The problem, both halves.** At any event with more than one station, guests walk the room
looking for something they can eat, and join the wrong queue. Meanwhile the staff behind Station B
know the vegan option is nearly finished — and that fact travels two metres, until someone
complains. Static signs can't respond to live conditions.

**What we built.** One app, three modes, no logins.
- **Guests** scan a QR, see every station live, filter to vegan / vegetarian / gluten-free /
  halal, and get sent to the station that actually has their food with the shortest queue.
- **Staff** tap a quick action or say one sentence — *"the vegan salad is almost finished, about
  twenty people waiting."*
- **Operations** get the alert, the replenishment task, and the priority, already routed.

**What happens in between.** The sentence becomes structured operational data — station, dish,
availability, queue, priority, recommended action. The staff member confirms it. Then every guest
phone in the room updates on its own, and an announcement plays in English and German.

**And it doesn't just advise — it acts.** The redirect can carry an incentive the caterer sets:
*"free coffee at the Terrace if you head over now."* That's the difference between a dashboard
that watches a queue and a tool that moves one.

---

## The line that earns trust — say it before anyone asks

> **"We don't count people with a camera. We don't guess queue length. Your staff already know —
> we make what they know visible to everyone in three seconds."**

That's a stronger claim than a fake sensor, and it's true.

Two more, ready to go:
- **"The model reads. The rules decide."** The AI turns speech into structured data; a
  deterministic rule picks the station. That's why it's auditable.
- **"Declared, not detected."** Allergens come from the caterer's printed label with the source
  and date on screen. We never infer an allergen from a photo or a dish name.

---

## Why today's build is real, not a mockup

We ran it on **the actual lunch** — the real Bella&Bona dishes served at Delta Campus, with the
allergens transcribed from the printed bowl labels. Chicken Pasta Salad, Mediterranean Cruise,
Vegan Chickpeas Quinoa Salad. **The judges ate that food.**

One thing we noticed while photographing it: **every bowl lid already carries a QR code**, and the
bowls are Vytal reusables that Bella&Bona scan out and scan back in. Bowl identity already exists
— nobody has to invent it.

---

## The stack, one line each

- **Bilt** — the React Native app, one codebase, iOS and Android
- **Nebius Token Factory** — turns the spoken sentence into strict structured JSON
- **ElevenLabs** — transcribes staff voice, speaks the guest announcement in EN and DE
- **Bilt backend** — shared live state across every device in the room

---

## Where it goes

Conferences · corporate campuses · festivals · stadiums · universities · trade fairs. Anywhere
food is served at more than one point to more than a hundred people.

And after the event: *"the same stations know what ran out and what didn't — that becomes what to
cook more of next time."*

---

## Close

> **"BonaFlow turns every catering station into a connected, responsive part of the event."**

---

### Answers to have ready

| They ask | You say |
|---|---|
| *"Do you detect queues?"* | "No, and we don't claim to. Staff report it. That's the honest version and it's instant." |
| *"Is the AI necessary?"* | "The quick-action path needs no model at all. The AI is what lets a busy staff member just talk instead of tapping through a form." |
| *"Is this only for events?"* | Use the number you got from the B&B team at lunch. Don't guess it. |
| *"Is this affiliated with Bella&Bona?"* | "No. Independent prototype. The dish names and allergens are transcribed from today's bowl labels; the station layout is simulated." |
| *"What if it's wrong?"* | "Nothing changes until the staff member confirms it. And reported facts stay separate from AI inferences, each with a confidence value." |

**Do not put a euro figure on any of the business value.** You can't substantiate one, and a
sharp founder will ask.
