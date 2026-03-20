export interface TranscriptionResult {
  transcript: string;
  confidence: number | null;
}

export interface TranscriptionService {
  transcribeAudio(file: Express.Multer.File): Promise<TranscriptionResult>;
}

class StubTranscriptionService implements TranscriptionService {
  async transcribeAudio(_file: Express.Multer.File): Promise<TranscriptionResult> {
    return {
      transcript: '',
      confidence: null,
    };
  }
}

export function getTranscriptionService(): TranscriptionService {
  return new StubTranscriptionService();
}
