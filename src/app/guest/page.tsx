"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { AnnouncementCard } from "@/components/announcement-card";
import { Disclaimer } from "@/components/disclaimer";
import {
  StationCard,
  stationHasAvailableMatch,
} from "@/components/station-card";
import type { DietFilter } from "@/domain/types";
import { useLiveState } from "@/hooks/use-live-state";

const filters: { value: DietFilter; label: string; emptyLabel: string }[] = [
  { value: "all", label: "All", emptyLabel: "food" },
  { value: "vegan", label: "Vegan", emptyLabel: "vegan" },
  { value: "vegetarian", label: "Vegetarian", emptyLabel: "vegetarian" },
  {
    value: "gluten_free",
    label: "Gluten-free",
    emptyLabel: "gluten-free",
  },
  { value: "halal", label: "Halal", emptyLabel: "halal" },
];

export default function GuestPage() {
  const [filter, setFilter] = useState<DietFilter>("all");
  const { state, loading, stale, error, lastSuccessAt } = useLiveState();

  if (loading && !state) {
    return (
      <main className="app-shell centered-state">
        <div className="brand-mark">B</div>
        <p>Loading today&apos;s stations…</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="app-shell centered-state">
        <h1>BonaFlow</h1>
        <p>{error ?? "Guest view is temporarily unavailable."}</p>
      </main>
    );
  }

  const visibleStations =
    filter === "all"
      ? state.stations
      : state.stations.filter((station) =>
          stationHasAvailableMatch(state, station, filter),
        );
  const recommendedId = filter === "all" ? null : state.recommendations[filter];
  const recommended = state.stations.find(
    (station) => station.id === recommendedId,
  );
  const filterCopy = filters.find((item) => item.value === filter)!;

  return (
    <>
      <main className="app-shell guest-page">
        <header className="page-hero">
          <div>
            <span className="eyebrow">LIVE LUNCH · 12:30–14:00</span>
            <h1>Find your food faster.</h1>
            <p>{state.event.name} · {state.event.venue}</p>
          </div>
          <div className={`live-pill ${stale ? "is-stale" : ""}`}>
            <span aria-hidden="true" />
            {stale ? "Last known" : "Live"}
          </div>
        </header>

        {stale && (
          <div className="stale-banner" role="status">
            {error} Showing the last update
            {lastSuccessAt
              ? ` from ${new Date(lastSuccessAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`
              : "."}
          </div>
        )}

        <section aria-labelledby="diet-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR PLATE</span>
              <h2 id="diet-heading">What works for you?</h2>
            </div>
          </div>
          <div className="filter-row" role="group" aria-label="Dietary filter">
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "filter-chip is-active" : "filter-chip"}
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {filter !== "all" && recommended && (
          <section className="recommendation-card">
            <span className="eyebrow">RECOMMENDED FOR YOU</span>
            <div className="recommendation-row">
              <div>
                <h2>{recommended.name}</h2>
                <p>{recommended.location} · {recommended.queueLevel} queue</p>
              </div>
              <span className="direction-arrow" aria-hidden="true">→</span>
            </div>
            {state.incentive.active &&
              state.incentive.appliesToStationId === recommended.id && (
                <div className="incentive-chip">
                  <strong>{state.incentive.text}</strong>
                  <span>Offered by the event organiser · until 13:15</span>
                </div>
              )}
          </section>
        )}

        {state.alerts.some((alert) => alert.active) && <AnnouncementCard />}

        {filter !== "all" && visibleStations.length === 0 ? (
          <section className="no-match">
            <h2>No station currently has a {filterCopy.emptyLabel} option available.</h2>
          </section>
        ) : (
          <section className="stations-section" aria-labelledby="stations-heading">
            <div className="section-heading">
              <div>
                <span className="eyebrow">4 STATIONS</span>
                <h2 id="stations-heading">Around the venue</h2>
              </div>
              <span className="updated-copy">Updates automatically</span>
            </div>
            <div className="station-list">
              {visibleStations.map((station) => (
                <StationCard
                  key={station.id}
                  state={state}
                  station={station}
                  filter={filter}
                />
              ))}
            </div>
          </section>
        )}
        <Disclaimer />
      </main>
      <BottomNav />
    </>
  );
}
