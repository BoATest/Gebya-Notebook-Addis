export interface TranscriptionResult {
  transcript: string;
  confidence: number | null;
  provider: string | null;
}

type OpenAICompatibleTranscriptionPayload = {
  text?: string;
  transcript?: string;
};

export interface TranscriptionService {
  transcribeAudio(file: Express.Multer.File, options?: { prompt?: string | null }): Promise<TranscriptionResult>;
}

class StubTranscriptionService implements TranscriptionService {
  async transcribeAudio(_file: Express.Multer.File, _options?: { prompt?: string | null }): Promise<TranscriptionResult> {
    return {
      transcript: '',
      confidence: null,
      provider: null,
    };
  }
}

class OpenAICompatibleTranscriptionService implements TranscriptionService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly providerName: string;
  private readonly prompt: string;

  constructor({ apiKey, model, baseUrl, providerName, prompt }: { apiKey: string; model: string; baseUrl: string; providerName: string; prompt: string }) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.providerName = providerName;
    this.prompt = prompt;
  }

  async transcribeAudio(file: Express.Multer.File, options?: { prompt?: string | null }): Promise<TranscriptionResult> {
    const form = new FormData();
    const bytes = new Uint8Array(file.buffer);
    const blob = new Blob([bytes], { type: file.mimetype || "application/octet-stream" });

    form.append("file", blob, file.originalname || "voice-note.webm");
    form.append("model", this.model);
    const effectivePrompt = options?.prompt?.trim() || this.prompt;
    if (effectivePrompt) {
      form.append("prompt", effectivePrompt);
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`${this.providerName} transcription failed (${response.status}): ${details}`.trim());
    }

    const payload = await response.json().catch(() => ({})) as OpenAICompatibleTranscriptionPayload;
    const transcript = typeof payload.text === "string"
      ? payload.text.trim()
      : (typeof payload.transcript === "string" ? payload.transcript.trim() : "");

    if (!transcript) {
      throw new Error(`${this.providerName} transcription returned an empty transcript`);
    }

    return {
      transcript,
      confidence: null,
      provider: `${this.providerName}:${this.model}`,
    };
  }
}

const DEFAULT_TRANSCRIPTION_PROMPT = [
  "Amharic and English mixed retail speech.",
  "Common terms include Addis, Telebirr, CBE, Awash, birr, cash, dubie, payment, transfer, bread, sugar, oil, soap.",
  "Prefer likely Ethiopian names, payment providers, and shop vocabulary.",
].join(" ");

export function getTranscriptionService(): TranscriptionService {
  if (process.env.GROQ_API_KEY) {
    return new OpenAICompatibleTranscriptionService({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3",
      baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      providerName: "groq",
      prompt: process.env.GROQ_TRANSCRIPTION_PROMPT || DEFAULT_TRANSCRIPTION_PROMPT,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAICompatibleTranscriptionService({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      providerName: "openai",
      prompt: process.env.OPENAI_TRANSCRIPTION_PROMPT || DEFAULT_TRANSCRIPTION_PROMPT,
    });
  }

  return new StubTranscriptionService();
}
