"use client";

import Link from "next/link";
import { useState } from "react";
import { Disclaimer } from "@/components/disclaimer";
import { VoiceRecorder } from "@/components/voice-recorder";
import type { FeedbackExtraction } from "@/domain/types";
import { useLiveState } from "@/hooks/use-live-state";

export default function FeedbackPage() {
  const { state, loading } = useLiveState();
  const [dishId, setDishId] = useState("");
  const [text, setText] = useState("");
  const [extraction, setExtraction] = useState<FeedbackExtraction | null>(null);
  const [summary, setSummary] = useState("");
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading && !state) return <main className="app-shell centered-state"><p>Loading dishes…</p></main>;
  if (!state) return <main className="app-shell centered-state"><p>Feedback is temporarily unavailable.</p></main>;

  async function interpret() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDishId: dishId, text }),
      });
      const data = (await response.json()) as {
        extraction?: FeedbackExtraction;
        summary?: string;
        interpretationMode?: string;
        error?: string;
      };
      if (!response.ok || !data.extraction || !data.summary) {
        throw new Error(data.error ?? "Feedback could not be understood.");
      }
      setExtraction(data.extraction);
      setSummary(data.summary);
      setOffline(data.interpretationMode === "offline");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Feedback could not be understood.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!extraction) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction, transcript: text }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Feedback could not be saved.");
      setComplete(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Feedback could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function retype() {
    setExtraction(null);
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>("#feedback-text")?.focus(), 0);
  }

  return (
    <main className="app-shell feedback-page">
      <Link href="/guest" className="back-link">← Guest view</Link>
      <header className="page-hero"><div><span className="eyebrow">AFTER YOUR MEAL</span><h1>What was left?</h1><p>Your anonymous voice helps plan the next event.</p></div></header>

      {complete ? (
        <section className="feedback-thanks"><span aria-hidden="true">✓</span><h2>Thank you.</h2><p>Your feedback will help plan the next event.</p><Link href="/guest" className="primary-button">Back to guest view</Link></section>
      ) : extraction ? (
        <section className="feedback-confirm">
          <span className="eyebrow">WHAT WE UNDERSTOOD</span>
          {offline && <div className="offline-label">offline interpretation</div>}
          <blockquote>{summary}</blockquote>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="primary-button full-button" disabled={busy} onClick={() => void confirm()}>{busy ? "Saving…" : "Confirm"}</button>
          <button type="button" className="secondary-button full-button" onClick={retype}>Not right, let me retype</button>
        </section>
      ) : (
        <section className="feedback-form">
          <label>Which dish?<select value={dishId} onChange={(event) => setDishId(event.target.value)}><option value="">Select a dish</option>{state.dishes.map((dish) => <option key={dish.id} value={dish.id}>{dish.name}</option>)}</select></label>
          <VoiceRecorder onTranscript={setText} onFallback={() => undefined} />
          <label>Prefer to type?<textarea id="feedback-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Most of it was left because the portion was too large." /></label>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="primary-button full-button" disabled={busy || !dishId || !text.trim()} onClick={() => void interpret()}>{busy ? "Understanding…" : "Review feedback"}</button>
        </section>
      )}
      <Disclaimer />
    </main>
  );
}
