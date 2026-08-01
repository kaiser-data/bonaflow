"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ConfirmationForm } from "@/components/confirmation-form";
import { Disclaimer } from "@/components/disclaimer";
import { VoiceRecorder } from "@/components/voice-recorder";
import type { QuickAction } from "@/domain/interpretation";
import type { Extraction } from "@/domain/types";
import { useLiveState } from "@/hooks/use-live-state";

const preparedSentence =
  "Vegan Chickpeas Quinoa Salad is almost finished, and approximately 20 guests are waiting.";

const actions: { value: QuickAction; label: string; dishScoped: boolean }[] = [
  { value: "stock_low", label: "Stock running low", dishScoped: true },
  { value: "sold_out", label: "Item sold out", dishScoped: true },
  { value: "replenished", label: "Replenishment arrived", dishScoped: true },
  { value: "queue_increasing", label: "Queue increasing", dishScoped: false },
  { value: "queue_cleared", label: "Queue cleared", dishScoped: false },
  { value: "station_closed", label: "Station temporarily closed", dishScoped: false },
];

export default function StaffPage() {
  const { state, loading } = useLiveState();
  const [stationId, setStationId] = useState("station-b");
  const [transcript, setTranscript] = useState("");
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);
  const [confirmation, setConfirmation] = useState<Extraction | null>(null);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && !state) return <main className="app-shell centered-state"><p>Loading stations…</p></main>;
  if (!state) return <main className="app-shell centered-state"><p>Staff view is temporarily unavailable.</p></main>;
  const station = state.stations.find((item) => item.id === stationId) ?? state.stations[0];

  async function requestExtraction(body: Record<string, unknown>) {
    const response = await fetch("/api/staff-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as {
      extraction?: Extraction;
      interpretationMode?: string;
      error?: string;
    };
    if (!response.ok || !data.extraction) throw new Error(data.error ?? "Update could not be understood.");
    return data;
  }

  async function applyQuickAction(action: QuickAction, dishId?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const parsed = await requestExtraction({ stationId, quickAction: action, dishId });
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction: parsed.extraction }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Update could not be saved.");
      setMessage("Shared state updated.");
      setPendingAction(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function interpretText() {
    setBusy(true);
    setMessage(null);
    try {
      const parsed = await requestExtraction({ stationId, transcript });
      setConfirmation(parsed.extraction!);
      setOffline(parsed.interpretationMode === "offline");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  function chooseAction(action: (typeof actions)[number]) {
    if (action.dishScoped) setPendingAction(action.value);
    else void applyQuickAction(action.value);
  }

  return (
    <>
      <main className="app-shell staff-page">
        <header className="page-hero">
          <div><span className="eyebrow">STAFF REPORTING</span><h1>Keep the room moving.</h1><p>One tap updates every view.</p></div>
        </header>

        {confirmation ? (
          <ConfirmationForm
            initial={confirmation}
            state={state}
            offline={offline}
            onCancel={() => setConfirmation(null)}
            onConfirmed={() => { setConfirmation(null); setTranscript(""); setMessage("Shared state updated."); }}
          />
        ) : (
          <>
            <section>
              <div className="section-heading"><div><span className="eyebrow">STEP 1</span><h2>Choose your station</h2></div></div>
              <div className="station-picker">
                {state.stations.map((item) => (
                  <button type="button" className={stationId === item.id ? "station-button is-active" : "station-button"} key={item.id} onClick={() => { setStationId(item.id); setPendingAction(null); }}>
                    <span className={`status-dot status-${item.status}`} />{item.name}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="section-heading"><div><span className="eyebrow">QUICK UPDATE</span><h2>No AI, one tap</h2></div></div>
              <div className="quick-grid">
                {actions.map((action) => (
                  <button type="button" disabled={busy} key={action.value} onClick={() => chooseAction(action)}>{action.label}<span>→</span></button>
                ))}
              </div>
              {pendingAction && (
                <div className="dish-picker-panel">
                  <strong>Which dish?</strong>
                  {station.dishes.map((item) => {
                    const dish = state.dishes.find((candidate) => candidate.id === item.dishId)!;
                    return <button type="button" key={dish.id} onClick={() => void applyQuickAction(pendingAction, dish.id)}>{dish.name}</button>;
                  })}
                  <button type="button" className="text-button" onClick={() => setPendingAction(null)}>Cancel</button>
                </div>
              )}
            </section>

            <section className="report-card">
              <span className="eyebrow">VOICE OR TEXT</span>
              <h2>Tell us what changed</h2>
              <VoiceRecorder onTranscript={setTranscript} onFallback={() => setTranscript(preparedSentence)} />
              <label className="text-report-label">Text update<textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="What is running low? How is the queue?" /></label>
              <button className="primary-button full-button" type="button" disabled={busy || !transcript.trim()} onClick={() => void interpretText()}>{busy ? "Interpreting…" : "Review update"}</button>
            </section>
          </>
        )}
        {message && <div className="toast-message" role="status">{message}</div>}
        <Disclaimer />
      </main>
      <BottomNav />
    </>
  );
}
