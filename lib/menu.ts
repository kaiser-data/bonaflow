import type { Allergen, Dish } from '@/lib/store';

/**
 * Today's menu, as it was actually recorded.
 *
 * Dish names and allergens were transcribed from the printed Bella&Bona label on
 * each bowl lid at Delta Campus on 1 August 2026, around 12:50. Everything in
 * this file exists to keep three kinds of information visibly separate, because
 * confusing them is how a food app hurts somebody:
 *
 *   1. DECLARED — the dish name, the allergen list and the dietary tags printed
 *      on the label. Only these are used for filtering, and only these are ever
 *      presented as the caterer's statement.
 *   2. OBSERVED — what could be seen in the open bowl. Descriptive only. It is
 *      always captioned as such and is never treated as an allergen or dietary
 *      guarantee.
 *   3. NOT RECORDED — the Thai peanut bowl's label was not legible in the photo.
 *      That gap is shown as a gap. Nothing is inferred from the dish name, even
 *      though the word "peanut" is in it.
 *
 * The app never says a dish is safe, allergy-free or that someone can eat it.
 */

/** Public photo set for this event: filenames are the contract, as in the repo. */
const IMAGE_BASE = 'https://raw.githubusercontent.com/kaiser-data/bonaflow/main/assets/dishes';

/** Where the names and allergens on these cards come from. */
export const MENU_SOURCE_LINE =
  'Names and allergens transcribed from the printed bowl labels · Delta Campus, 1 Aug 2026';

/** Shown wherever an allergen list is missing rather than empty. */
export const ALLERGENS_NOT_RECORDED = 'Allergens not recorded — ask the catering team';

/** Caption that keeps the observed contents from reading as a declaration. */
export const OBSERVED_CAPTION = 'seen in the bowl · description only, not a declaration';

/** The 14 allergens EU labels declare. The bowl labels are printed in English. */
const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'gluten',
  crustaceans: 'crustaceans',
  egg: 'egg',
  fish: 'fish',
  peanut: 'peanut',
  soy: 'soy',
  milk: 'milk',
  nuts: 'nuts',
  celery: 'celery',
  mustard: 'mustard',
  sesame: 'sesame',
  sulphite: 'sulphite',
  lupin: 'lupin',
  mollusc: 'mollusc',
};

export function allergenLabel(allergen: Allergen): string {
  return ALLERGEN_LABELS[allergen];
}

/** Absolute URL of a dish photo, from the filename stored with the dish. */
export function dishImageUrl(file: string): string | null {
  if (file.length === 0) return null;
  return `${IMAGE_BASE}/${file}`;
}

/**
 * The allergen line for a dish. A null list means the label could not be read,
 * which is said plainly instead of being left blank or filled in by guesswork.
 */
export function allergenLine(dish: Dish): string {
  if (dish.allergens === null) return ALLERGENS_NOT_RECORDED;
  if (dish.allergens.length === 0) return 'No allergens printed on the label';
  return `Label lists: ${dish.allergens.map(allergenLabel).join(', ')}`;
}

/** True when the allergen list is missing, so the UI can mark it as a gap. */
export function allergensMissing(dish: Dish): boolean {
  return dish.allergens === null;
}

/** The observed contents as one short line, or null when nothing was recorded. */
export function observedLine(dish: Dish): string | null {
  if (dish.ingredients.length === 0) return null;
  return dish.ingredients.join(' · ');
}
