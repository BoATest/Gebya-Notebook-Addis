import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LangContext';

const TOTAL_DURATION = 30;
const NUDGE_AT = 15;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function RecordingSession({ onTranscript, onTypeInstead, onNoInternet }) {
  const { t } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef('');
  const finalChunksRef = useRef([]);
  const elapsedRef = useRef(0);
  const stoppedRef = useRef(false);
  const processedRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const handleStop = useCallback(async ({ forceProcess = true } = {}) => {
    if (stoppedRef.current || processedRef.current) return;
    stoppedRef.current = true;
    stopRequestedRef.current = true;
    processedRef.current = forceProcess;
    cleanupRecording();

    if (!forceProcess) {
      return;
    }

    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      stoppedRef.current = false;
      processedRef.current = false;
      stopRequestedRef.current = false;
      setError(t.tryAgain);
      return;
    }

    if (!navigator.onLine) {
      onNoInternet();
      return;
    }

    setIsProcessing(true);
    try {
      const apiUrl = `${API_BASE_URL}/api/transcribe`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      onTranscript(data.transcript, data.detected_total, data.confidence ?? null, data.draft ?? null);
    } catch {
      if (!navigator.onLine) {
        onNoInternet();
      } else {
        stoppedRef.current = false;
        processedRef.current = false;
        stopRequestedRef.current = false;
        setIsProcessing(false);
        setError(t.tryAgain);
      }
    }
  }, [cleanupRecording, onTranscript, onNoInternet, t]);

  useEffect(() => {
    stoppedRef.current = false;
    processedRef.current = false;
    stopRequestedRef.current = false;
    transcriptRef.current = '';
    finalChunksRef.current = [];
    elapsedRef.current = 0;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(t.voiceNotSupported);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'am-ET';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const finalChunks = [...finalChunksRef.current];
      const interimChunks = [];

      for (let i = 0; i < event.results.length; i++) {
        const nextChunk = event.results[i][0]?.transcript?.trim();
        if (!nextChunk) continue;

        if (event.results[i].isFinal) {
          finalChunks[i] = nextChunk;
        } else {
          interimChunks.push(nextChunk);
        }
      }

      finalChunksRef.current = finalChunks;
      transcriptRef.current = [...finalChunks.filter(Boolean), ...interimChunks].join(' ').trim();
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError(t.voiceMicBlocked || t.tryAgain);
        cleanupRecording();
        return;
      }
      if (e.error === 'network') {
        onNoInternet();
        cleanupRecording();
      } else if (e.error !== 'aborted') {
        setError(t.tryAgain);
        cleanupRecording();
      }
    };

    recognition.onend = () => {
      if (stopRequestedRef.current || processedRef.current) {
        return;
      }

      if (elapsedRef.current < TOTAL_DURATION) {
        try {
          recognition.start();
          return;
        } catch {
          // Fall through and process the captured transcript.
        }
      }

      if (!stoppedRef.current) {
        handleStop();
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* ignore */ }

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        elapsedRef.current = next;
        if (next >= NUDGE_AT) setShowNudge(true);
        if (next >= TOTAL_DURATION) {
          handleStop();
          return TOTAL_DURATION;
        }
        return next;
      });
    }, 1000);

    return () => {
      stoppedRef.current = true;
      stopRequestedRef.current = true;
      cleanupRecording();
    };
  }, [cleanupRecording, handleStop, onNoInternet, t]);

  const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
      style={{ background: '#1B4332' }}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-between">
        <div className="w-full pt-6 text-center sm:pt-8">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <span className="text-xl">🎤</span>
          </div>
          <h2 className="mb-2 text-xl font-black text-white font-sans sm:text-2xl">{t.voiceRecordingTitle}</h2>
          <p className="mx-auto max-w-xs text-sm font-sans leading-6 text-white/70">{t.voiceRecordingHint}</p>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center py-6">
          <div className="relative mb-6 flex h-44 w-44 items-center justify-center sm:h-48 sm:w-48">
            <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-3 rounded-full border border-white/10" />
            <div className="absolute inset-0 rounded-full bg-white opacity-5" />
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full sm:h-36 sm:w-36"
              style={{ background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)' }}
            >
              <span className="text-5xl sm:text-6xl">🎤</span>
            </div>
          </div>

          <div className="mb-5 text-center text-4xl font-black text-white font-mono sm:text-[2.5rem]">{timeStr}</div>

          <div className="w-full max-w-xs mb-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              <span>Live</span>
              <span>{Math.max(TOTAL_DURATION - elapsed, 0)}s</span>
            </div>
            <div className="h-2.5 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div
                className="h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%`, background: progress > 80 ? '#D4654A' : '#C4883A' }}
              />
            </div>
          </div>

          <div className="min-h-[24px]">
            {showNudge && (
              <p className="text-center text-sm font-semibold font-sans text-white/90">{t.voiceTryFinishSoon}</p>
            )}
          </div>

          <div className="mt-2 min-h-[24px]">
            {error && (
              <p className="text-center text-sm font-sans text-red-300">{error}</p>
            )}
          </div>
        </div>

        <div className="w-full pb-1">
          {isProcessing ? (
            <div className="w-full py-4 text-center text-base font-black text-white font-sans"
              style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)' }}>
              {t.saving}
            </div>
          ) : (
            <button
              onClick={() => handleStop()}
              className="w-full py-4 text-base font-black font-sans"
              style={{ background: '#fff', color: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}
            >
              ⏹ {t.voiceStop}
            </button>
          )}

          <button
            onClick={() => { stopRequestedRef.current = true; cleanupRecording(); onTypeInstead(); }}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center text-sm font-sans text-white/70 underline"
          >
            {t.voiceTypeInstead}
          </button>
        </div>
      </div>
    </div>
  );
}

function VoiceRecordScreen({ onTranscript, onTypeInstead }) {
  const { t } = useLang();
  const [sessionKey, setSessionKey] = useState(0);
  const [noInternet, setNoInternet] = useState(() => !navigator.onLine);

  const handleNoInternet = useCallback(() => {
    setNoInternet(true);
  }, []);

  const handleRetry = () => {
    if (!navigator.onLine) {
      return;
    }
    setNoInternet(false);
    setSessionKey(prev => prev + 1);
  };

  if (noInternet) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
        style={{ background: '#FAF8F5' }}>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-between">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 text-5xl">📡</div>
            <h2 className="mb-2 text-xl font-black text-gray-900 font-sans sm:text-2xl">{t.voiceNoInternet}</h2>
            <p className="max-w-xs text-sm leading-6 text-gray-500 font-sans">{t.voiceNoInternetHint}</p>
          </div>
          <div className="w-full pb-1">
            <button
              onClick={onTypeInstead}
              className="mb-3 w-full py-4 text-base font-black text-white font-sans"
              style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1B4332' }}
            >
              {t.voiceTypeSaleInstead}
            </button>
            <button
              onClick={handleRetry}
              className="w-full py-4 text-base font-bold text-gray-700 font-sans"
              style={{ background: '#f5f5f5', borderRadius: 'var(--radius-md)' }}
            >
              {t.voiceRetry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RecordingSession
      key={sessionKey}
      onTranscript={onTranscript}
      onTypeInstead={onTypeInstead}
      onNoInternet={handleNoInternet}
    />
  );
}

export default VoiceRecordScreen;
