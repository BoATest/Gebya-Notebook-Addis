# Whisper Service Wiring

Gebya API server expects a hosted Whisper endpoint in:

```env
WHISPER_SERVICE_URL=https://your-whisper-host.example.com/transcribe
```

## Local development

```powershell
cd D:\Gebya-Notebook-Addis\artifacts\api-server
Copy-Item .env.example .env
$env:WHISPER_SERVICE_URL="http://localhost:8100/transcribe"
pnpm dev
```

## Live deployment

Set `WHISPER_SERVICE_URL` in your deployed API server environment to the public URL of the Python service.

Example:

```env
WHISPER_SERVICE_URL=https://gebya-whisper.onrender.com/transcribe
```

The frontend still talks only to the API server. The API server talks to Whisper.
