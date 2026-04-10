import logging
import os
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("whisper-service")

app = FastAPI(title="Gebya Whisper Service")
MODEL: Optional[WhisperModel] = None

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "jimoh/whisper-medium-amharic")
WHISPER_CACHE_DIR = os.getenv("WHISPER_CACHE_DIR", "./models")


def get_model() -> WhisperModel:
    global MODEL
    if MODEL is None:
        logger.info("Loading Whisper model '%s' into cache dir '%s'", WHISPER_MODEL, WHISPER_CACHE_DIR)
        MODEL = WhisperModel(
            WHISPER_MODEL,
            device="cpu",
            compute_type="int8",
            download_root=WHISPER_CACHE_DIR,
        )
        logger.info("Whisper model ready")
    return MODEL


def estimate_confidence(info, segments) -> Optional[float]:
    probabilities = []

    language_probability = getattr(info, "language_probability", None)
    if isinstance(language_probability, (int, float)):
        probabilities.append(float(language_probability))

    for segment in segments:
        avg_logprob = getattr(segment, "avg_logprob", None)
        if isinstance(avg_logprob, (int, float)):
            score = max(0.0, min(1.0, 1.0 + (float(avg_logprob) / 5.0)))
            probabilities.append(score)

    if not probabilities:
        return None

    return round(sum(probabilities) / len(probabilities), 3)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)) -> dict:
    if not (audio.content_type or "").startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are accepted")

    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    os.makedirs(WHISPER_CACHE_DIR, exist_ok=True)
    temp_path = os.path.join(WHISPER_CACHE_DIR, f"upload-{os.getpid()}-{audio.filename or 'voice.webm'}")

    try:
        with open(temp_path, "wb") as temp_file:
            temp_file.write(payload)

        model = get_model()
        segments_iter, info = model.transcribe(
            temp_path,
            language="am",
            vad_filter=True,
            beam_size=5,
            condition_on_previous_text=False,
        )
        segments = list(segments_iter)
        transcript = " ".join((segment.text or "").strip() for segment in segments).strip()
        confidence = estimate_confidence(info, segments)

        return {
            "transcript": transcript,
            "confidence": confidence,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Whisper transcription failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except OSError:
            logger.warning("Could not remove temp file %s", temp_path)
