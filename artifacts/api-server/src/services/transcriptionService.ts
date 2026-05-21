export interface TranscriptionResult {
  transcript: string;
  confidence: number | null;
  provider: "whisper" | "browser_fallback" | "unavailable";
}

export interface TranscriptionService {
  transcribeAudio(file: Express.Multer.File, browserFallback?: string | null): Promise<TranscriptionResult>;
}

class WhisperService implements TranscriptionService {
  private readonly serviceUrl: string | null;
  private readonly timeoutMs = 15_000;
  private readonly maxAttempts = 2;

  constructor() {
    this.serviceUrl = process.env.WHISPER_SERVICE_URL?.trim() || null;
  }

  private fallbackResult(browserFallback?: string | null): TranscriptionResult {
    const transcript = typeof browserFallback === "string" ? browserFallback.trim() : "";
    return {
      transcript,
      confidence: null,
      provider: transcript ? "browser_fallback" : "unavailable",
    };
  }

  private createAudioBlob(file: Express.Multer.File): Blob {
    const audioBytes = new Uint8Array(
      file.buffer.buffer as ArrayBuffer,
      file.buffer.byteOffset,
      file.buffer.byteLength,
    );

    return new Blob([audioBytes], {
      type: file.mimetype || "application/octet-stream",
    });
  }

  private async postAudio(audioBlob: Blob, filename: string): Promise<TranscriptionResult> {
    if (!this.serviceUrl) {
      throw new Error("WHISPER_SERVICE_URL is not configured");
    }

    const form = new FormData();
    form.append("audio", audioBlob, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.serviceUrl, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Whisper service failed: ${response.status} ${body}`);
      }

      const payload = await response.json() as {
        transcript?: string;
        confidence?: number | null;
      };

      return {
        transcript: typeof payload.transcript === "string" ? payload.transcript.trim() : "",
        confidence: typeof payload.confidence === "number" ? payload.confidence : null,
        provider: "whisper",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async transcribeAudio(file: Express.Multer.File, browserFallback?: string | null): Promise<TranscriptionResult> {
    let lastError: unknown = null;
    const audioBlob = this.createAudioBlob(file);
    const filename = file.originalname || "voice-recording.webm";

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const result = await this.postAudio(audioBlob, filename);
        if (result.transcript) {
          return result;
        }
        console.warn(`[transcribe] Whisper returned empty transcript on attempt ${attempt}`);
      } catch (error) {
        lastError = error;
        console.warn(`[transcribe] Whisper attempt ${attempt} failed`, error);
      }
    }

    if (lastError) {
      console.error("[transcribe] Whisper service failed after retry", lastError);
    }

    return this.fallbackResult(browserFallback);
  }
}

let service: TranscriptionService | null = null;

export function getTranscriptionService(): TranscriptionService {
  service ??= new WhisperService();
  return service;
}
