import { Router, type NextFunction, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { analyzeTranscript } from "../lib/voicePhase0.js";

const router = Router();

interface VoiceAnalyzeRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only audio files are accepted"));
  },
});

function handleMulterError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof MulterError) {
    res.status(400).json({
      ok: false,
      error: err.message,
      transcript: null,
      parsed: null,
    });
    return;
  }

  if (err instanceof Error && err.message === "Only audio files are accepted") {
    res.status(400).json({
      ok: false,
      error: err.message,
      transcript: null,
      parsed: null,
    });
    return;
  }

  next(err);
}

function renderTestPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gebya Voice Phase 0 Test</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5efe4;
        --panel: #fffaf2;
        --ink: #1f1b16;
        --muted: #6d6457;
        --accent: #0f766e;
        --accent-2: #d97706;
        --border: #e7dac2;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: radial-gradient(circle at top, #fff7e7 0%, var(--bg) 52%, #efe5d3 100%);
        color: var(--ink);
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 24px 16px 40px;
      }
      .card {
        background: color-mix(in srgb, var(--panel) 92%, white 8%);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 18px;
        box-shadow: 0 18px 45px rgba(80, 54, 18, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 1.6rem;
      }
      p {
        margin: 0 0 16px;
        color: var(--muted);
        line-height: 1.45;
      }
      form {
        display: grid;
        gap: 12px;
      }
      input[type="file"] {
        width: 100%;
        border: 1px dashed var(--border);
        border-radius: 14px;
        padding: 14px;
        background: white;
      }
      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 14px 18px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--accent) 0%, #155e75 100%);
        color: white;
        cursor: pointer;
      }
      button[disabled] {
        opacity: 0.6;
        cursor: wait;
      }
      .status {
        margin-top: 14px;
        font-size: 0.95rem;
        color: var(--accent-2);
        min-height: 1.2em;
      }
      pre {
        margin: 18px 0 0;
        padding: 16px;
        overflow: auto;
        background: #1d1f21;
        color: #f2f2f2;
        border-radius: 16px;
        min-height: 240px;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>Voice Phase 0 Analyzer</h1>
        <p>Upload one real shop audio file and compare what Whisper heard with what Gebya's rule-based parser understood.</p>
        <form id="analyze-form">
          <input id="audio" name="audio" type="file" accept="audio/*" required />
          <button id="submit" type="submit">Analyze Audio</button>
        </form>
        <div class="status" id="status"></div>
        <pre id="result">{\n  "message": "Choose an audio file to start."\n}</pre>
      </section>
    </main>
    <script>
      const form = document.getElementById("analyze-form");
      const audioInput = document.getElementById("audio");
      const submit = document.getElementById("submit");
      const result = document.getElementById("result");
      const status = document.getElementById("status");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const file = audioInput.files && audioInput.files[0];
        if (!file) {
          status.textContent = "Choose an audio file first.";
          return;
        }

        submit.disabled = true;
        status.textContent = "Uploading, transcribing, and parsing...";
        result.textContent = "{\\n  \\"message\\": \\"Working...\\"\\n}";

        try {
          const formData = new FormData();
          formData.append("audio", file, file.name);

          const response = await fetch("/api/voice/analyze", {
            method: "POST",
            body: formData,
          });

          const json = await response.json();
          result.textContent = JSON.stringify(json, null, 2);
          status.textContent = response.ok ? "Done." : "Request finished with an error.";
        } catch (error) {
          result.textContent = JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }, null, 2);
          status.textContent = "Request failed.";
        } finally {
          submit.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
}

async function transcribeWithGroq(file: Express.Multer.File): Promise<{
  transcript: string;
  confidence: null;
  provider: "groq_whisper";
}> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const audioBuffer = new ArrayBuffer(file.buffer.byteLength);
  new Uint8Array(audioBuffer).set(file.buffer);
  const audioBlob = new Blob([audioBuffer], {
    type: file.mimetype || "application/octet-stream",
  });

  const form = new FormData();
  form.append("file", audioBlob, file.originalname || "voice-sample.webm");
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "am");
  form.append("temperature", "0");
  form.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq transcription failed: ${response.status} ${body}`);
  }

  const payload = await response.json() as { text?: string };

  return {
    transcript: typeof payload.text === "string" ? payload.text.trim() : "",
    confidence: null,
    provider: "groq_whisper",
  };
}

router.get("/", (_req, res) => {
  res.type("html").send(renderTestPage());
});

router.post(
  "/",
  upload.single("audio"),
  handleMulterError,
  async (req: VoiceAnalyzeRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "audio file is required",
        transcript: null,
        parsed: null,
      });
    }

    try {
      const transcription = await transcribeWithGroq(req.file);
      const transcript = transcription.transcript.trim();

      if (!transcript) {
        return res.status(200).json({
          ok: false,
          error: "transcription_failed",
          raw_transcript: null,
          normalized_transcript: null,
          parsed: null,
          transcription: {
            provider: transcription.provider,
            language: "am",
            confidence: transcription.confidence,
          },
        });
      }

      const analysis = analyzeTranscript(transcript);

      return res.json({
        ok: true,
        raw_transcript: analysis.raw_transcript,
        normalized_transcript: analysis.normalized_transcript,
        transcription: {
          provider: transcription.provider,
          language: "am",
          confidence: transcription.confidence,
        },
        parsed: analysis.parsed,
      });
    } catch (error) {
      console.error("[voice-analyze] failed", error);
      return res.status(500).json({
        ok: false,
        error: "analysis_failed",
        raw_transcript: null,
        normalized_transcript: null,
        parsed: null,
      });
    }
  },
);

export default router;
