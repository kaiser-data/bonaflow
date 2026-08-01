# Dish images — placeholders until lunch

**These are placeholders.** Ten CC-licensed photos from Wikimedia Commons, resized to 900px,
1.4 MB total. They exist so the app never renders an empty image slot while you build, and so you
have a working demo if the lunch shoot goes badly.

**The real plan: photograph the actual dishes at lunch and overwrite these files.**

---

## The swap-in contract — filenames are the API

Reference images in code by **filename only**. Then swapping a placeholder for a real photo is
`mv`, not a code change:

```
assets/dishes/vegan-thai-curry.jpg          ← overwrite this
assets/dishes/mediterranean-chicken-bowl.jpg
assets/dishes/roasted-vegetable-couscous.jpg
assets/dishes/tofu-rice-bowl.jpg
assets/dishes/seasonal-vegetable-pasta.jpg
assets/dishes/tomato-basil-pasta.jpg
assets/dishes/sandwiches.jpg
assets/dishes/fruit.jpg
assets/dishes/salads.jpg
assets/dishes/drinks.jpg
```

**Never rename a file to match a real dish.** If the lunch has a dish these ids don't cover, add
a new id in the seed data and a new file — don't repurpose `tomato-basil-pasta.jpg` for a laksa.

> **In Bilt:** upload the whole `assets/dishes/` folder and tell it to reference images by these
> exact filenames. Then at 13:00 you re-upload only the files you replaced.

---

## Shooting at lunch — 8 minutes, and the constraints that matter

**Get `vegan-thai-curry.jpg` first.** It's the demo's hero — the dish that goes from low to sold
out at step 10. If you only get one real photo, get that one.

- **Portrait orientation**, shot from slightly above, dish filling most of the frame
- **One dish per frame.** No hands, no faces, no name badges — you claim "photos of food, not
  people" and it should be true
- Shoot against the least cluttered surface you can find; don't style it
- **Ask before photographing anyone's food or any station.** Three seconds each
- Same phone, same spot, same light for all of them if you can — consistency reads as designed

**Then resize before committing**, or you'll ship 4 MB per image and the guest view will crawl on
conference wifi:

```bash
sips -Z 900 assets/dishes/*.jpg      # macOS, in place, ~150 KB each
```

**Also shoot, separately from these:** one tray at three states — full, half, nearly empty. Those
are not dish cards; they're your test inputs for the staff photo path and, if you get ahead, the
proof that the pipeline reads a real tray.

---

## Licensing

Every placeholder is free-licensed from Wikimedia Commons — CC0, CC BY, or CC BY-SA. Per-file
licence and author are recorded in `CREDITS.tsv` (tab-separated: id · licence · author · source
file).

**CC BY-SA requires attribution**, so if any placeholder survives to the demo, put a single line
in the README or an about screen: *"Placeholder dish images from Wikimedia Commons, CC BY-SA —
see CREDITS.tsv."* One line covers all of them.

**Every placeholder you replace with a real photo is one less attribution obligation and one more
thing that's actually true.** After lunch, delete the rows from `CREDITS.tsv` for the files you
overwrote.

**Do not substitute Bella&Bona's product photography.** It's copyrighted, and attaching their real
dish photos to fictional stations while the app says "independent prototype, not affiliated" is a
contradiction a judge can spot from the front row.
