"use client";

import { useState } from "react";
import type { BonaFlowState, Extraction } from "@/domain/types";

export function ConfirmationForm({
  initial,
  state,
  offline,
  onCancel,
  onConfirmed,
}: {
  initial: Extraction;
  state: BonaFlowState;
  offline: boolean;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const [extraction, setExtraction] = useState<Extraction>({
    ...initial,
    reportedFacts: [...initial.reportedFacts],
    aiInferences: [...initial.aiInferences],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Extraction>(key: K, value: Extraction[K]) {
    setExtraction((current) => ({ ...current, [key]: value }));
  }

  function chooseStation(stationId: string) {
    const station = state.stations.find((item) => item.id === stationId)!;
    const dishId = station.dishes[0].dishId;
    const dish = state.dishes.find((item) => item.id === dishId)!;
    setExtraction((current) => ({
      ...current,
      stationId,
      stationName: station.name,
      dishId,
      dishName: dish.name,
    }));
  }

  function chooseDish(dishId: string) {
    const dish = state.dishes.find((item) => item.id === dishId)!;
    setExtraction((current) => ({
      ...current,
      dishId,
      dishName: dish.name,
    }));
  }

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Update could not be saved.");
      onConfirmed();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const station = state.stations.find((item) => item.id === extraction.stationId)!;

  return (
    <section className="confirmation-card">
      <span className="eyebrow">CHECK BEFORE SHARING</span>
      <h2>What we understood</h2>
      {offline && (
        <div className="offline-label">offline interpretation — please check the fields</div>
      )}
      <div className="confirmation-grid">
        <label>
          Station
          <select value={extraction.stationId} onChange={(event) => chooseStation(event.target.value)}>
            {state.stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          Dish
          <select value={extraction.dishId} onChange={(event) => chooseDish(event.target.value)}>
            {station.dishes.map((item) => {
              const dish = state.dishes.find((candidate) => candidate.id === item.dishId)!;
              return <option key={dish.id} value={dish.id}>{dish.name}</option>;
            })}
          </select>
        </label>
        <label>
          Availability
          <select value={extraction.availability} onChange={(event) => update("availability", event.target.value as Extraction["availability"])}>
            <option value="available">Available</option><option value="low">Low</option><option value="sold_out">Sold out</option><option value="uncertain">Uncertain</option>
          </select>
        </label>
        <label>
          Queue
          <select value={extraction.queueLevel} onChange={(event) => update("queueLevel", event.target.value as Extraction["queueLevel"])}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Guests waiting (reported)
          <input type="number" min="0" value={extraction.reportedGuestCount ?? ""} onChange={(event) => update("reportedGuestCount", event.target.value ? Number(event.target.value) : null)} />
        </label>
        <label>
          Priority
          <select value={extraction.priority} onChange={(event) => update("priority", event.target.value as Extraction["priority"])}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="field-wide">
          Action
          <input value={extraction.recommendedAction} onChange={(event) => update("recommendedAction", event.target.value)} />
        </label>
      </div>
      <div className="evidence-row reported-row">
        <strong>Reported facts</strong>
        <textarea value={extraction.reportedFacts.join("\n")} onChange={(event) => update("reportedFacts", event.target.value.split("\n").filter(Boolean))} />
      </div>
      <div className="evidence-row inference-row">
        <strong>AI inferences · confidence {Math.round(extraction.confidence * 100)}%</strong>
        <textarea value={extraction.aiInferences.join("\n")} onChange={(event) => update("aiInferences", event.target.value.split("\n").filter(Boolean))} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="confirmation-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-button" disabled={saving} onClick={() => void confirm()}>{saving ? "Saving…" : "Confirm"}</button>
      </div>
    </section>
  );
}
