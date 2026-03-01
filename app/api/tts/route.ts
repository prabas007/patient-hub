/**
 * POST /api/tts
 *
 * Converts text to speech using ElevenLabs and streams the audio back.
 *
 * Body:
 *   { text: string, voiceId?: string }
 *
 * Response:
 *   audio/mpeg stream
 */

import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

// Default voice: "Rachel" — calm, warm, clear. Swap voiceId for any ElevenLabs voice.
// Full list: https://api.elevenlabs.io/v1/voices
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId = DEFAULT_VOICE_ID } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2", // fastest, lowest latency
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs error:", err);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${res.status}` },
        { status: res.status }
      );
    }

    // Stream the audio directly back to the client
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("TTS route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
