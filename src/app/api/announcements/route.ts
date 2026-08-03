import { NextResponse } from "next/server";

export const runtime = "nodejs";

// A native voice per language. One English voice reading German wrecks the demo,
// so the language picks the speaker instead of relying on a single default.
const VOICES = {
  en: "EXAVITQu4vr4xnSDxMaL", // Sarah — mature, reassuring
  de: "iFSsEDGbm0FiEd2IVH4w", // Mary K. — klar und mitreissend
} as const;

const MAX_WORDS = 20;

export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { language?: string; text?: string };
    text = body.text?.trim() ?? "";
    const language = body.language;
    if (!text || (language !== "en" && language !== "de")) {
      return NextResponse.json(
        { error: "A text and a language of 'en' or 'de' are required." },
        { status: 400 },
      );
    }
    if (text.split(/\s+/).length >= MAX_WORDS) {
      return NextResponse.json(
        { error: `Announcements must be under ${MAX_WORDS} words.` },
        { status: 400 },
      );
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ fallbackText: text });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICES[language]}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          // Pinned so a short announcement is never detected as the other language.
          language_code: language,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      throw new Error(`ElevenLabs speech failed (${response.status}).`);
    }
    return new NextResponse(await response.arrayBuffer(), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("BonaFlow announcement failed", error);
    // Show the announcement itself rather than an error, so the demo stays readable.
    return NextResponse.json({
      fallbackText: text || "Announcement audio is unavailable.",
    });
  }
}
