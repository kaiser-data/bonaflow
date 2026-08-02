"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Disclaimer } from "@/components/disclaimer";
import { VoiceRecorder } from "@/components/voice-recorder";
import { loadStoredVoucher, storeVoucher } from "@/domain/rewards";
import type {
  DemoVoucher,
  DishRating,
  FeedbackExtraction,
} from "@/domain/types";
import { useLiveState } from "@/hooks/use-live-state";

const ratings = [1, 2, 3, 4, 5] as const;

export default function FeedbackPage() {
  const { state, loading } = useLiveState();
  const [dishId, setDishId] = useState("");
  const [rating, setRating] = useState<DishRating | null>(null);
  const [text, setText] = useState("");
  const [extraction, setExtraction] = useState<FeedbackExtraction | null>(null);
  const [summary, setSummary] = useState("");
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState<DemoVoucher | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventId = state?.event.id;

  useEffect(() => {
    if (!eventId) return;
    setVoucher(loadStoredVoucher(window.localStorage, eventId));
  }, [eventId]);

  if (loading && !state) {
    return <main className="app-shell centered-state"><p>Loading dishes…</p></main>;
  }
  if (!state) {
    return <main className="app-shell centered-state"><p>Feedback is temporarily unavailable.</p></main>;
  }

  async function interpret() {
    if (!rating || text.trim().length < 5) return;
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
      setError(
        failure instanceof Error
          ? failure.message
          : "Feedback could not be understood.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!extraction || !rating) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction, transcript: text, rating }),
      });
      const data = (await response.json()) as {
        voucher?: DemoVoucher;
        error?: string;
      };
      if (!response.ok || !data.voucher) {
        throw new Error(data.error ?? "Feedback could not be saved.");
      }
      setVoucher(data.voucher);
      if (!storeVoucher(window.localStorage, data.voucher)) {
        setStorageWarning(
          "Voucher issued, but this browser may not restore it after refresh.",
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Feedback could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  function retype() {
    setExtraction(null);
    window.setTimeout(
      () => document.querySelector<HTMLTextAreaElement>("#feedback-text")?.focus(),
      0,
    );
  }

  return (
    <main className="app-shell feedback-page">
      <Link href="/guest" className="back-link">← Guest view</Link>
      <header className="page-hero">
        <div>
          <span className="eyebrow">RATE FOOD. GET REWARDS.</span>
          <h1>Tell us what you really thought.</h1>
          <p>Choose stars, then use your voice to explain why. Typing always works too.</p>
        </div>
      </header>

      {voucher ? (
        <section className="voucher-card" aria-labelledby="voucher-title">
          <span className="voucher-icon" aria-hidden="true">✓</span>
          <span className="eyebrow">HACKATHON DEMO REWARD</span>
          <h2 id="voucher-title">{voucher.title}</h2>
          <p>Show this demo code at the Terrace:</p>
          <strong className="voucher-code">{voucher.code}</strong>
          <p className="voucher-terms">{voucher.terms}</p>
          {storageWarning && <p className="form-error" role="status">{storageWarning}</p>}
          <Link href="/guest" className="primary-button">Back to guest view</Link>
        </section>
      ) : extraction ? (
        <section className="feedback-confirm">
          <span className="eyebrow">WHAT WE UNDERSTOOD</span>
          {offline && <div className="offline-label">offline interpretation</div>}
          <blockquote>{rating} stars. {summary}</blockquote>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="primary-button full-button" disabled={busy} onClick={() => void confirm()}>{busy ? "Saving…" : "Confirm and get reward"}</button>
          <button type="button" className="secondary-button full-button" onClick={retype}>Not right, let me retype</button>
        </section>
      ) : (
        <section className="feedback-form">
          <label>Which dish?<select value={dishId} onChange={(event) => setDishId(event.target.value)}><option value="">Select a dish</option>{state.dishes.map((dish) => <option key={dish.id} value={dish.id}>{dish.name}</option>)}</select></label>

          <fieldset className="rating-field">
            <legend>How many stars?</legend>
            <div className="star-row">
              {ratings.map((value) => (
                <button
                  type="button"
                  className={rating === value ? "star-button is-selected" : "star-button"}
                  aria-label={`${value} out of 5 stars`}
                  aria-pressed={rating === value}
                  key={value}
                  onClick={() => setRating(value)}
                >
                  <span aria-hidden="true">★</span>
                </button>
              ))}
            </div>
            <p aria-live="polite">{rating ? `${rating} out of 5` : "Choose a rating"}</p>
          </fieldset>

          <div className="voice-feedback-field">
            <strong>Explain with your voice</strong>
            <VoiceRecorder onTranscript={setText} onFallback={() => undefined} />
          </div>
          <label>Or type your explanation<textarea id="feedback-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Most of it was left because the portion was too large." /></label>
          <p className="privacy-note">Submitted without an account. Please do not include personal information.</p>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="primary-button full-button" disabled={busy || !dishId || !rating || text.trim().length < 5} onClick={() => void interpret()}>{busy ? "Understanding…" : "Review feedback"}</button>
        </section>
      )}
      <Disclaimer />
    </main>
  );
}
