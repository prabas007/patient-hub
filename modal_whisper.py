"""
CareLink — Modal Whisper Transcription Endpoint
================================================
Deploy:  modal deploy modal_whisper.py
"""

import modal
from fastapi import Request

app = modal.App("carelink-whisper")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("openai-whisper", "torch", "numpy", "fastapi[standard]", "python-multipart")
)


@app.function(image=image, gpu="T4", timeout=120)
@modal.fastapi_endpoint(method="POST", label="transcribe-form")
async def transcribe_form(request: Request) -> dict:
    import  whisper
    import tempfile
    import os

    form = await request.form()
    audio_file = form.get("audio")

    if not audio_file:
        return {"error": "No audio field in form data"}

    audio_bytes = await audio_file.read()

    content_type = getattr(audio_file, "content_type", "audio/webm")
    ext_map = {
        "audio/webm":  ".webm",
        "audio/wav":   ".wav",
        "audio/mp3":   ".mp3",
        "audio/mpeg":  ".mp3",
        "audio/ogg":   ".ogg",
        "audio/mp4":   ".mp4",
    }
    ext = ext_map.get(content_type, ".webm")

    model = whisper.load_model("base")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = model.transcribe(
            tmp_path,
            language=None,
            task="transcribe",
            fp16=True,
            verbose=False,
        )
        return {
            "transcript": result["text"].strip(),
            "language": result.get("language", "en"),
            "duration_seconds": round(
                sum(s["end"] - s["start"] for s in result.get("segments", [])), 2
            ),
        }
    finally:
        os.unlink(tmp_path)