import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LangContext';

const TOTAL_DURATION = 30;
const NUDGE_AT = 15;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TRANSCRIBE_TIMEOUT_MS = 10000;

function RecordingSession({ onTranscript, onTypeInstead, onNoInternet }) {
  const { t } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef('');
  const finalTranscriptRef = useRef('');
  const stoppedRef = useRef(false);
  const processedRef = useRef(false);

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

  const handleStop = useCallback(async () => {
    if (stoppedRef.current || processedRef.current) return;
    stoppedRef.current = true;
    processedRef.current = true;
    cleanupRecording();

    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      stoppedRef.current = false;
      processedRef.current = false;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
      try {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ transcript }),
        });
        if (!resp.ok) throw new Error('Server error');
        const data = await resp.json();
        onTranscript(data.transcript, data.detected_total, data.confidence ?? null, data.draft ?? null);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (!navigator.onLine) {
        onNoInternet();
      } else {
        stoppedRef.current = false;
        processedRef.current = false;
        setIsProcessing(false);
        setError(error?.name === 'AbortError' ? (t.voiceSlowNetwork || t.tryAgain) : t.tryAgain);
      }
    }
  }, [cleanupRecording, onTranscript, onNoInternet, t]);

  useEffect(() => {
    stoppedRef.current = false;
    processedRef.current = false;
    transcriptRef.current = '';
    finalTranscriptRef.current = '';

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
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const nextChunk = event.results[i][0]?.transcript?.trim();
        if (!nextChunk) continue;

        if (event.results[i].isFinal) {
          const existingFinal = finalTranscriptRef.current.trim();
          if (!existingFinal.endsWith(nextChunk)) {
            finalTranscriptRef.current = `${existingFinal} ${nextChunk}`.trim();
          }
        } else {
          interim = `${interim} ${nextChunk}`.trim();
        }
      }

      transcriptRef.current = `${finalTranscriptRef.current} ${interim}`.trim();
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
      if (!stoppedRef.current) {
        handleStop();
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* ignore */ }

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= NUDGE_AT) setShowNudge(true);
        if (next >= TOTAL_DURATION) {
          handleStop();
          return prev;
        }
        return next;
      });
    }, 1000);

    return () => {
      stoppedRef.current = true;
      cleanupRecording();
    };
  }, [cleanupRecording, handleStop, onNoInternet, t]);

  const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: '#1B4332' }}>
      <h2 className="text-white text-xl font-black mb-2 font-sans">{t.voiceRecordingTitle}</h2>
      <p className="text-white opacity-70 text-sm mb-8 font-sans">{t.voiceRecordingHint}</p>

      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute inset-0 rounded-full bg-white opacity-5" />
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)' }}
        >
          <span className="text-5xl">🎤</span>
        </div>
      </div>

      <div className="text-white text-3xl font-black font-mono mb-6">{timeStr}</div>

      <div className="w-full max-w-xs mb-4">
        <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${progress}%`, background: progress > 80 ? '#D4654A' : '#C4883A' }}
          />
        </div>
      </div>

      {showNudge && (
        <p className="text-white text-sm font-semibold mb-4 font-sans opacity-90">{t.voiceTryFinishSoon}</p>
      )}

      {error && (
        <p className="text-red-300 text-sm mb-4 font-sans">{error}</p>
      )}

      {isProcessing ? (
        <div className="w-full max-w-xs py-4 font-black text-white text-base text-center font-sans"
          style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)' }}>
          {t.saving}
        </div>
      ) : (
        <button
          onClick={handleStop}
          className="w-full max-w-xs py-4 font-black text-base font-sans"
          style={{ background: '#fff', color: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}
        >
          ⏹ {t.voiceStop}
        </button>
      )}

      <button
        onClick={() => { cleanupRecording(); onTypeInstead(); }}
        className="mt-5 text-white opacity-60 text-sm underline font-sans min-h-[44px] flex items-center"
      >
        {t.voiceTypeInstead}
      </button>
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl mb-4">📡</div>
        <h2 className="text-xl font-black text-gray-900 text-center mb-2 font-sans">{t.voiceNoInternet}</h2>
        <p className="text-sm text-gray-500 text-center mb-8 font-sans" style={{ color: 'var(--color-text-muted)' }}>{t.voiceNoInternetHint}</p>
        <button
          onClick={onTypeInstead}
          className="w-full max-w-xs py-4 font-black text-white text-base mb-3 font-sans"
          style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1B4332' }}
        >
          {t.voiceTypeSaleInstead}
        </button>
        <button
          onClick={handleRetry}
          className="w-full max-w-xs py-4 font-bold text-gray-700 text-base font-sans"
          style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text)', borderRadius: 'var(--radius-md)' }}
        >
          {t.voiceRetry}
        </button>
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
