"use client";

import Link from "next/link";
import { useState } from "react";
import type { Availability, Dish } from "@/domain/types";

const availabilityLabel: Record<Availability, string> = {
  available: "Available",
  low: "Running low",
  sold_out: "Sold out",
  uncertain: "No recent update",
};

const dietLabel: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  gluten_free: "Gluten-free",
  halal: "Halal",
  high_protein: "High protein",
};

export function DishCard({
  dish,
  availability,
}: {
  dish: Dish;
  availability: Availability;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);

  return (
    <article className="dish-card">
      <button
        className="dish-summary"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="dish-image-wrap">
          {imageMissing ? (
            <span className="dish-image-placeholder" aria-hidden="true" />
          ) : (
            // Local runtime asset; a missing file swaps to a neutral block.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dish.image}
              alt=""
              className="dish-image"
              onError={() => setImageMissing(true)}
            />
          )}
        </span>
        <span className="dish-copy">
          <strong>{dish.name}</strong>
          <span className={`availability availability-${availability}`}>
            {availabilityLabel[availability]}
          </span>
          {dish.dietTags.length > 0 && (
            <span className="diet-pills">
              {dish.dietTags.map((tag) => (
                <span className="diet-pill" key={tag}>
                  {dietLabel[tag] ?? tag}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="expand-mark" aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div className="dish-detail">
          <div>
            <span className="detail-label">Declared allergens</span>
            <p>
              {dish.allergens?.join(", ") ??
                "Allergens not recorded — ask the catering team."}
            </p>
            <small>Declared by the caterer, 1 Aug</small>
          </div>
          <div className="visible-detail">
            <span className="detail-label">Visible in the bowl</span>
            <p>{dish.visible.join(", ")}</p>
          </div>
          <Link className="rate-cta" href={`/feedback?dish=${dish.id}`}>
            <span className="rate-cta-stars" aria-hidden="true">★★★★★</span>
            <span className="rate-cta-copy">
              <strong>Rate this dish</strong>
              <small>Takes 30 seconds · free coffee</small>
            </span>
            <span className="rate-cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </article>
  );
}
