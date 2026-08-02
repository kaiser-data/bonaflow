"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Disclaimer } from "@/components/disclaimer";
import { feedbackSummary } from "@/domain/operations";
import { useLiveState } from "@/hooks/use-live-state";

const reasonLabel = {
  portion_too_large: "Portion too large",
  not_tasty: "Not tasty",
  dietary_mismatch: "Dietary mismatch",
  other: "Other",
  unknown: "Unknown",
} as const;

export default function OperationsPage() {
  const { state, loading, stale } = useLiveState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading && !state) return <main className="app-shell centered-state"><p>Loading operations…</p></main>;
  if (!state) return <main className="app-shell centered-state"><p>Operations is temporarily unavailable.</p></main>;
  const openTasks = state.tasks.filter((task) => task.status === "open");
  const activeAlerts = state.alerts.filter((alert) => alert.active);
  const summary = feedbackSummary(state);

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Update failed.");
      setMessage("Operations state updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Reset all demo data to the original seed?")) return;
    setBusy(true);
    const response = await fetch("/api/state/reset", { method: "POST" });
    setMessage(response.ok ? "Demo data reset." : "Reset failed.");
    setBusy(false);
  }

  return (
    <>
      <main className="app-shell ops-page">
        <header className="page-hero">
          <div><span className="eyebrow">OPERATIONS BOARD</span><h1>See the whole room.</h1><p>{state.event.name}</p></div>
          <div className={`live-pill ${stale ? "is-stale" : ""}`}><span />{stale ? "Last known" : "Live"}</div>
        </header>

        <section className="feedback-summary-card" id="feedback-analytics">
          <span className="eyebrow">NEXT EVENT</span><h2>Ratings and real feedback</h2>
          <div className="feedback-kpis">
            <div><strong>{summary.averageRating?.toFixed(1) ?? "—"}</strong><span>Average rating</span></div>
            <div><strong>{summary.ratedTotal}</strong><span>Rated dishes</span></div>
            <div><strong>{summary.voiceResponses}</strong><span>Voice/text explanations</span></div>
          </div>
          <div className="summary-grid">
            <div><h3>Stars</h3>{([5, 4, 3, 2, 1] as const).map((rating) => <p key={rating}><span>{rating} stars</span><strong>{summary.ratings[rating]}</strong></p>)}</div>
            <div><h3>Leftovers</h3>{Object.entries(summary.leftovers).map(([key, value]) => <p key={key}><span>{key}</span><strong>{value}</strong></p>)}</div>
            <div><h3>Reasons</h3>{Object.entries(summary.reasons).map(([key, value]) => <p key={key}><span>{reasonLabel[key as keyof typeof reasonLabel]}</span><strong>{value}</strong></p>)}</div>
          </div>
        </section>

        <section className="ops-kpis">
          <div><strong>{state.staffUpdateCount}</strong><span>Staff updates</span></div>
          <div><strong>{activeAlerts.length}</strong><span>Active alerts</span></div>
          <div><strong>{openTasks.length}</strong><span>Open tasks</span></div>
        </section>

        <section>
          <div className="section-heading"><div><span className="eyebrow">LIVE FLOOR</span><h2>Stations</h2></div></div>
          <div className="ops-station-list">
            {state.stations.map((station) => (
              <article className="ops-station-card" key={station.id}>
                <div className="ops-station-title"><span className={`status-dot status-${station.status}`} /><div><h3>{station.name}</h3><p>{station.location}</p></div><span className="ops-queue">{station.queueLevel} queue</span></div>
                <div className="ops-dishes">
                  {station.dishes.map((placement) => {
                    const dish = state.dishes.find((item) => item.id === placement.dishId)!;
                    return <div key={dish.id}><span>{dish.name}</span><strong className={`availability availability-${placement.availability}`}>{placement.availability.replace("_", " ")}</strong></div>;
                  })}
                </div>
                <time>{new Date(station.lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="section-heading"><div><span className="eyebrow">NEWEST FIRST</span><h2>Active alerts</h2></div></div>
          <div className="ops-list">
            {activeAlerts.length === 0 ? <p className="empty-copy">No active alerts.</p> : activeAlerts.map((alert) => (
              <article className="alert-card" key={alert.id}><div><span className={`priority priority-${alert.priority}`}>{alert.priority}</span><time>{new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div><strong>{alert.message}</strong><p>{alert.recommendedAction}</p></article>
            ))}
          </div>
        </section>

        <section>
          <div className="section-heading"><div><span className="eyebrow">ACTION QUEUE</span><h2>Replenishment</h2></div></div>
          <div className="ops-list">
            {openTasks.length === 0 ? <p className="empty-copy">No open replenishment tasks.</p> : openTasks.map((task) => (
              <button className="task-card" disabled={busy} key={task.id} onClick={() => void mutate({ action: "complete_task", taskId: task.id })}><span><strong>{task.title}</strong><small>{state.stations.find((item) => item.id === task.stationId)?.name} · {task.priority}</small></span><span>Complete</span></button>
            ))}
          </div>
        </section>

        <section className="ops-control-card">
          <div><span className="eyebrow">REDIRECT INCENTIVE</span><h2>{state.incentive.text}</h2><p>Authorized by event organiser · expires 13:15</p></div>
          <label className="toggle"><input type="checkbox" checked={state.incentive.active} disabled={busy} onChange={(event) => void mutate({ action: "set_incentive", active: event.target.checked })} /><span /></label>
        </section>

        <button type="button" className="reset-button" disabled={busy} onClick={() => void reset()}>Reset demo data</button>
        {message && <div className="toast-message" role="status">{message}</div>}
        <Disclaimer />
      </main>
      <BottomNav />
    </>
  );
}
