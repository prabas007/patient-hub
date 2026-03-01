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
    import whisper
    import tempfile
    import os
    import subprocess

    form = await request.form()
    audio_file = form.get("audio")

    if not audio_file:
        return {"error": "No audio field in form data"}

    audio_bytes = await audio_file.read()

    if not audio_bytes:
        return {"error": "Empty audio data"}

    model = whisper.load_model("base")

    # Write raw upload to a temp file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in_path = tmp_in.name

    # Re-mux to wav via ffmpeg — fixes Chrome MediaRecorder's malformed webm headers
    tmp_out_path = tmp_in_path.replace(".webm", ".wav")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",           # overwrite output
                "-i", tmp_in_path,        # input (possibly malformed webm)
                "-ar", "16000",           # 16kHz sample rate for Whisper
                "-ac", "1",               # mono
                "-f", "wav",              # force wav output
                tmp_out_path,
            ],
            capture_output=True,
            check=True,
        )
        transcribe_path = tmp_out_path
    except subprocess.CalledProcessError:
        # ffmpeg re-mux failed — try passing original directly as fallback
        transcribe_path = tmp_in_path

    try:
        result = model.transcribe(
            transcribe_path,
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
    except Exception as e:
        return {"error": f"Transcription failed: {str(e)}", "transcript": ""}
    finally:
        for path in [tmp_in_path, tmp_out_path]:
            try:
                os.unlink(path)
            except Exception:
                pass