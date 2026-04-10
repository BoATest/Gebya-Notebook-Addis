import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LangContext';

const TOTAL_DURATION = 20;
const NUDGE_AT = 12;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const RECORDING_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  return RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

async function submitTranscript(transcript) {
  const resp = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  if (!resp.ok) {
    throw new Error('Transcript parsing failed');
  }

  return resp.json();
}

async function submitAudio(audioBlob, browserFallback = '') {
  const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
  const form = new FormData();
  form.append('audio', audioBlob, `voice-sale.${extension}`);
  if (browserFallback.trim()) {
    form.append('browserFallback', browserFallback.trim());
  }

  const resp = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    throw new Error('Audio transcription failed');
  }

  return resp.json();
}

function RecordingSession({ onTranscript, onTypeInstead, onNoInternet }) {
  const { t } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [error, setError] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef('');
  const finalChunksRef = useRef([]);
  const audioChunksRef = useRef([]);
  const elapsedRef = useRef(0);
  const stoppedRef = useRef(false);
  const processedRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cleanupRecognition();
    cleanupMedia();
  }, [cleanupMedia, cleanupRecognition]);

  const processVoiceResult = useCallback(async () => {
    const backupTranscript = transcriptRef.current.trim();
    const mimeType = mediaRecorderRef.current?.mimeType || pickRecordingMimeType() || 'audio/webm';
    const hasAudio = audioChunksRef.current.length > 0;

    if (!navigator.onLine) {
      onNoInternet();
      return;
    }

    setIsProcessing(true);

    try {
      let data = null;

      if (hasAudio) {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          data = await submitAudio(audioBlob, backupTranscript);
        } catch {
          data = null;
        }
      }

      const primaryTranscript = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
      if (primaryTranscript) {
        onTranscript(primaryTranscript, data.detected_total, data.confidence ?? null, data.draft ?? null, data.transcription_provider ?? null);
        return;
      }

      if (backupTranscript) {
        const fallbackData = await submitTranscript(backupTranscript);
        onTranscript(fallbackData.transcript, fallbackData.detected_total, fallbackData.confidence ?? null, fallbackData.draft ?? null, fallbackData.transcription_provider ?? null);
        return;
      }

      throw new Error('No transcript captured');
    } catch {
      if (!navigator.onLine) {
        onNoInternet();
      } else {
        stoppedRef.current = false;
        processedRef.current = false;
        stopRequestedRef.current = false;
        setIsProcessing(false);
        setIsStopped(false);
        setError(t.tryAgain);
      }
    }
  }, [onNoInternet, onTranscript, t]);

  const handleStop = useCallback(() => {
    if (stoppedRef.current || processedRef.current) return;
    stoppedRef.current = true;
    stopRequestedRef.current = true;
    processedRef.current = true;
    setIsStopped(true);
    setElapsed(elapsedRef.current);
    setShowNudge(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    cleanupRecognition();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        cleanupMedia();
        processVoiceResult();
      };

      try {
        mediaRecorderRef.current.stop();
        return;
      } catch {
        /* ignore */
      }
    }

    cleanupMedia();
    processVoiceResult();
  }, [cleanupMedia, cleanupRecognition, processVoiceResult]);

  useEffect(() => {
    let cancelled = false;

    stoppedRef.current = false;
    processedRef.current = false;
    stopRequestedRef.current = false;
    transcriptRef.current = '';
    finalChunksRef.current = [];
    audioChunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);
    setShowNudge(false);
    setIsStopped(false);
    setLiveTranscript('');
    setError(null);

    const startSession = async () => {
      const supportsAudioCapture = typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && typeof window.MediaRecorder !== 'undefined';
      const supportsSpeechFallback = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

      if (!supportsAudioCapture && !supportsSpeechFallback) {
        setError(t.voiceNotSupported);
        return;
      }

      if (supportsAudioCapture) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          mediaStreamRef.current = stream;
          const mimeType = pickRecordingMimeType();
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          mediaRecorderRef.current = recorder;
          recorder.start(250);
        } catch (captureError) {
          if (!supportsSpeechFallback) {
            if (captureError?.name === 'NotAllowedError') {
              setError(t.voiceMicBlocked || t.tryAgain);
            } else {
              setError(t.tryAgain);
            }
            return;
          }
        }
      }

      if (supportsSpeechFallback) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
          setLiveTranscript(transcriptRef.current);
        };

        recognition.onerror = (e) => {
          if (e.error === 'network' && !navigator.onLine) {
            onNoInternet();
          } else if ((e.error === 'not-allowed' || e.error === 'service-not-allowed') && !mediaRecorderRef.current) {
            setError(t.voiceMicBlocked || t.tryAgain);
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
              /* ignore */
            }
          }

          if (!stoppedRef.current && !mediaRecorderRef.current) {
            handleStop();
          }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch { /* ignore */ }
      }

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
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
    };

    startSession();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      stopRequestedRef.current = true;
      cleanupRecording();
    };
  }, [cleanupRecording, handleStop, onNoInternet, t]);

  const shownElapsed = isStopped ? elapsedRef.current : elapsed;
  const progress = Math.min((shownElapsed / TOTAL_DURATION) * 100, 100);
  const minutes = Math.floor(shownElapsed / 60);
  const seconds = shownElapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const statusLabel = isProcessing
    ? (t.voiceProcessingState || 'Processing')
    : isStopped
      ? (t.voiceStoppedState || 'Stopped')
      : (t.voiceListeningState || 'Listening');
  const liveTranscriptLabel = t.voiceLivePreview || 'What we hear';
  const liveTranscriptHint = t.voiceLivePreviewHint || 'You should see your words here before you save.';
  const transcriptPreview = liveTranscript.trim();

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

          <div className="mb-3 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white"
            style={{ background: isProcessing ? 'rgba(196,136,58,0.3)' : 'rgba(255,255,255,0.12)' }}>
            {statusLabel}
          </div>

          <div className="mb-5 text-center text-4xl font-black text-white font-mono sm:text-[2.5rem]">{timeStr}</div>

          <div className="w-full max-w-xs mb-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              <span>{isProcessing ? 'Check' : 'Live'}</span>
              <span>{Math.max(TOTAL_DURATION - shownElapsed, 0)}s</span>
            </div>
            <div className="h-2.5 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div
                className="h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%`, background: progress > 80 ? '#D4654A' : '#C4883A' }}
              />
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">{liveTranscriptLabel}</p>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white"
                style={{ background: transcriptPreview ? 'rgba(45,106,79,0.7)' : 'rgba(255,255,255,0.14)' }}>
                {transcriptPreview ? 'Live' : 'Waiting'}
              </span>
            </div>
            <div className="min-h-[72px] rounded-xl px-3 py-3"
              style={{ background: 'rgba(8,28,21,0.28)' }}>
              {transcriptPreview ? (
                <p className="text-sm leading-6 text-white font-sans">{transcriptPreview}</p>
              ) : (
                <p className="text-sm leading-6 text-white/60 font-sans">{liveTranscriptHint}</p>
              )}
            </div>
          </div>

          <div className="min-h-[24px]">
            {showNudge && !isProcessing && (
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
              style={{ background: isStopped ? '#DDE9E2' : '#fff', color: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}
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

function VoiceRecordScreenAudio({ onTranscript, onTypeInstead }) {
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
    setSessionKey((prev) => prev + 1);
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

export default VoiceRecordScreenAudio;

