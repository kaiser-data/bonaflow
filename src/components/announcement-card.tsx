"use client";

import { useState } from "react";

const announcements = {
  en: "Atrium is running low. Vegan options are on the Terrace, with free coffee available.",
  de: "Im Atrium wird es knapp. Vegane Optionen gibt es auf der Terrasse, mit Gratis-Kaffee.",
} as const;

export function AnnouncementCard() {
  const [fallback, setFallback] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  async function play(language: keyof typeof announcements) {
    setPlaying(language);
    setFallback(null);
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, text: announcements[language] }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("audio/")) {
        const url = URL.createObjectURL(await response.blob());
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      } else {
        const data = (await response.json()) as { fallbackText?: string };
        setFallback(data.fallbackText ?? announcements[language]);
      }
    } catch {
      setFallback(announcements[language]);
    } finally {
      setPlaying(null);
    }
  }

  return (
    <section className="announcement-card">
      <div><span className="eyebrow">LIVE ANNOUNCEMENT</span><h2>A quieter vegan option is available.</h2><p>{announcements.en}</p></div>
      <div className="announcement-actions">
        <button type="button" disabled={playing !== null} onClick={() => void play("en")}>{playing === "en" ? "Loading…" : "▶ English"}</button>
        <button type="button" disabled={playing !== null} onClick={() => void play("de")}>{playing === "de" ? "Loading…" : "▶ Deutsch"}</button>
      </div>
      {fallback && <p className="announcement-fallback" role="status">{fallback}</p>}
    </section>
  );
}
