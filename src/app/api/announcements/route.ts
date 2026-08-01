import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { language?: "en" | "de"; text?: string };
    const text = body.text?.trim();
    if (!text || !body.language) {
      return NextResponse.json({ error: "Language and text are required." }, { status: 400 });
    }
    if (text.split(/\s+/).length >= 20) {
      return NextResponse.json({ error: "Announcements must be under 20 words." }, { status: 400 });
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ fallbackText: text });
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          output_format: "mp3_22050_32",
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error(`ElevenLabs speech failed (${response.status}).`);
    return new NextResponse(await response.arrayBuffer(), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("BonaFlow announcement failed", error);
    return NextResponse.json(
      { fallbackText: "Announcement audio is unavailable." },
      { status: 200 },
    );
  }
}
