/**
 * POST /api/transcribe
 *
 * Proxies audio blob from the browser to the Modal Whisper endpoint.
 * Returns transcript + detected language.
 *
 * Body: FormData with field "audio" (Blob, webm/wav/ogg)
 *
 * Response:
 *   { transcript: string, language: string, duration_seconds: number }
 */

import { NextRequest, NextResponse } from "next/server";

const MODAL_WHISPER_URL = process.env.MODAL_WHISPER_URL!;

export async function POST(req: NextRequest) {
  try {
    if (!MODAL_WHISPER_URL) {
      return NextResponse.json(
        { error: "MODAL_WHISPER_URL not configured" },
        { status: 503 }
      );
    }

    // Forward the multipart form data directly to Modal
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob | null;

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio field in request" },
        { status: 400 }
      );
    }

    // Forward to Modal
    const modalForm = new FormData();
    modalForm.append("audio", audioBlob, "recording.webm");

    const modalRes = await fetch(MODAL_WHISPER_URL, {
      method: "POST",
      body: modalForm,
    });

    if (!modalRes.ok) {
      const err = await modalRes.text();
      console.error("Modal Whisper error:", err);
      return NextResponse.json(
        { error: `Whisper transcription failed: ${err}` },
        { status: 502 }
      );
    }

    const data = await modalRes.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 502 });
    }

    return NextResponse.json({
      transcript: data.transcript ?? "",
      language: data.language ?? "en",
      duration_seconds: data.duration_seconds ?? 0,
    });
  } catch (err: any) {
    console.error("Transcribe route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
