import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice transcription is unavailable; use text." },
      { status: 503 },
    );
  }
  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "An audio file is required." }, { status: 400 });
    }
    const payload = new FormData();
    payload.append("file", audio, audio.name);
    payload.append("model_id", "scribe_v2");
    payload.append("tag_audio_events", "false");
    payload.append("diarize", "false");
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`ElevenLabs transcription failed (${response.status}).`);
    const data = (await response.json()) as { text?: string };
    if (!data.text?.trim()) throw new Error("ElevenLabs returned an empty transcript.");
    return NextResponse.json({ transcript: data.text.trim() });
  } catch (error) {
    console.error("BonaFlow transcription failed", error);
    return NextResponse.json(
      { error: "Voice transcription is unavailable; use text." },
      { status: 503 },
    );
  }
}
