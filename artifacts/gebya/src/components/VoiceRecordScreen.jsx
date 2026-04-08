import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LangContext';

const TOTAL_DURATION = 30;
const NUDGE_AT = 15;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function RecordingSession({ onTranscript, onTypeInstead, onNoInternet }) {
  const { t, lang } = useLang();
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

  const recordingExamples = lang === 'am'
    ? ['ሁለት ዳቦ በ60', 'አንድ ኮካ በ35', 'ሶስት ወተት በ150']
    : ['two bread for 60', 'one Coca-Cola for 35', 'three milk for 150'];

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
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-4 sm:px-6" style={{ background: '#1B4332' }}>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-[28px] border border-white/15 bg-white/8 p-5 text-center shadow-lg backdrop-blur-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 font-sans">Gebya Voice</p>
          <h2 className="mt-2 text-2xl font-black text-white font-sans">{t.voiceRecordingTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-white/75 font-sans">
            {lang === 'am' ? 'የሸጡትን እቃ እና ጠቅላላ ዋጋ በቀላሉ ይናገሩ።' : 'Say what you sold and the total price in one short note.'}
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/55 font-sans">
              {lang === 'am' ? 'ምሳሌ' : 'Example'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recordingExamples.map((example) => (
                <span key={example} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 font-sans">
                  {example}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto mt-7 flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
            <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-2 rounded-full border border-white/15" />
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32"
              style={{ background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)' }}
            >
              <span className="text-5xl">🎤</span>
            </div>
          </div>

          <div className="mt-6 text-white text-3xl font-black font-mono">{timeStr}</div>

          <div className="mx-auto mt-4 w-full max-w-xs">
            <div className="h-2 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress}%`, background: progress > 80 ? '#D4654A' : '#C4883A' }}
              />
            </div>
          </div>

          {showNudge && (
            <p className="mt-4 text-sm font-semibold font-sans text-white/90">{t.voiceTryFinishSoon}</p>
          )}

          {error && (
            <p className="mt-4 text-sm font-semibold font-sans text-red-200">{error}</p>
          )}

          {isProcessing ? (
            <div className="mt-5 w-full rounded-2xl px-4 py-4 text-center text-base font-black text-white font-sans" style={{ background: 'rgba(255,255,255,0.15)' }}>
              {lang === 'am' ? 'የናገሩትን በማዘጋጀት ላይ…' : 'Preparing your note…'}
            </div>
          ) : (
            <button
              onClick={() => handleStop()}
              className="mt-5 w-full py-4 font-black text-base font-sans"
              style={{ background: '#fff', color: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}
            >
              ⏹ {t.voiceStop}
            </button>
          )}

          <button
            onClick={() => { stopRequestedRef.current = true; cleanupRecording(); onTypeInstead(); }}
            className="mt-4 min-h-[44px] text-sm font-semibold text-white/70 underline font-sans"
          >
            {t.voiceTypeInstead}
          </button>
        </div>
      </div>
    </div>
  );
}

function VoiceRecordScreen({ onTranscript, onTypeInstead }) {
  const { t, lang } = useLang();
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
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-4 sm:px-6" style={{ background: '#FAF8F5' }}>
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-6 text-center shadow-sm">
            <div className="text-5xl mb-4">📡</div>
            <h2 className="text-xl font-black text-gray-900 text-center mb-2 font-sans">{t.voiceNoInternet}</h2>
            <p className="text-sm leading-6 text-gray-500 text-center mb-6 font-sans">
              {lang === 'am' ? 'ድምጽ ለመተርጎም ኢንተርኔት ያስፈልጋል፤ ሽያጩን ግን አሁንም በእጅ መጻፍ ይችላሉ።' : 'Voice needs internet to understand your note, but you can still write the sale now.'}
            </p>
            <button
              onClick={onTypeInstead}
              className="w-full py-4 font-black text-white text-base mb-3 font-sans"
              style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1B4332' }}
            >
              {t.voiceTypeSaleInstead}
            </button>
            <button
              onClick={handleRetry}
              className="w-full py-4 font-bold text-gray-700 text-base font-sans"
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
