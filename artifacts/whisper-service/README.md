# Whisper Service

Hosted Amharic speech-to-text service for Gebya voice sales.

## What it does

- accepts `POST /transcribe` with multipart `audio`
- uses `faster-whisper`
- loads model `jimoh/whisper-medium-amharic`
- forces `language="am"`
- runs on CPU with `int8`
- enables VAD filtering
- returns:

```json
{
  "transcript": "....",
  "confidence": 0.82
}
```

The Gebya API server remains the source of truth for `detected_total` and `draft`.

## Local run

```powershell
cd D:\Gebya-Notebook-Addis\artifacts\whisper-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
$env:WHISPER_MODEL="jimoh/whisper-medium-amharic"
$env:WHISPER_CACHE_DIR="./models"
$env:WHISPER_HOST="0.0.0.0"
$env:WHISPER_PORT="8100"
uvicorn main:app --host 0.0.0.0 --port 8100
```

## Docker run

```powershell
cd D:\Gebya-Notebook-Addis\artifacts\whisper-service
docker build -t gebya-whisper .
docker run --rm -p 8100:8100 `
  -e WHISPER_MODEL=jimoh/whisper-medium-amharic `
  -e WHISPER_CACHE_DIR=/app/models `
  gebya-whisper
```

## Production hosting

Use any container host that supports a long-running Python service, for example:

- Railway
- Render
- Fly.io
- a VPS with Docker

After deployment, copy the public `/transcribe` URL into:

```env
WHISPER_SERVICE_URL=https://your-whisper-host.example.com/transcribe
```

for the Gebya API server.

## Health check

```powershell
curl.exe http://localhost:8100/health
```

## Direct transcription test

```powershell
curl.exe -X POST http://localhost:8100/transcribe `
  -F "audio=@D:\path\to\sample.webm"
```
