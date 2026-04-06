import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, History, LoaderCircle, Mic, Square, UserRound, WifiOff } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { getRecognitionLanguage, mapRecognitionError, useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { fmt } from '../utils/numformat';

const TOTAL_DURATION = 30;
const NUDGE_AT = 15;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TRANSCRIBE_TIMEOUT_MS = 10000;

function getAudioExtension(mimeType) {
  if (mimeType?.includes('webm')) return 'webm';
  if (mimeType?.includes('ogg')) return 'ogg';
  if (mimeType?.includes('mp4')) return 'mp4';
  if (mimeType?.includes('mpeg')) return 'mp3';
  return 'webm';
}

function buildAudioFile(blob, mimeType) {
  const safeMimeType = mimeType || blob?.type || 'audio/webm';
  const extension = getAudioExtension(safeMimeType);
  return new File([blob], `voice-note.${extension}`, { type: safeMimeType });
}

function formatVoiceTime(createdAt) {
  if (!createdAt) return '';
  const diffMinutes = Math.max(0, Math.round((Date.now() - createdAt) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(createdAt).toLocaleDateString();
}

function VoiceWorkspace({
  t,
  workspace,
  onStartRecording,
  onTypeInstead,
  onRepeatSale,
  onUseItem,
  onUseCustomer,
}) {
  const recentSales = workspace?.recentSales || [];
  const commonItems = workspace?.commonItems || [];
  const recentCustomers = workspace?.recentCustomers || [];
  const lastSavedSnapshot = workspace?.lastSavedSnapshot || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-5" style={{ background: 'linear-gradient(180deg, #133127 0%, #1B4332 38%, #F7F3EC 38%, #F7F3EC 100%)' }}>
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-[28px] px-5 pt-5 pb-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)]" style={{ background: 'linear-gradient(135deg, rgba(27,67,50,0.98), rgba(56,110,88,0.96))' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/60 font-bold">Voice counter</p>
              <h2 className="mt-2 text-2xl font-black leading-tight font-sans">Record the sale your way. We will help fill the gaps.</h2>
              <p className="mt-2 text-sm text-white/75 font-sans">Say only what matters: item, amount, customer, or payment. Repeated shop patterns are right below.</p>
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/15 bg-white/10">
              <Mic className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={onStartRecording}
              className="col-span-2 rounded-2xl px-4 py-4 text-left min-h-[64px]"
              style={{ background: '#F6C85F', color: '#1B4332', boxShadow: '0 10px 24px rgba(0,0,0,0.16)' }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-base font-black">Start voice recording</span>
                  <span className="block text-xs font-semibold opacity-75 mt-1">Best for fast sales, mixed language, and mid-rush notes</span>
                </span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </span>
            </button>
            <button
              onClick={onTypeInstead}
              className="rounded-2xl px-4 py-3 text-sm font-bold min-h-[52px] border border-white/15 bg-white/10"
            >
              {t.voiceTypeSaleInstead}
            </button>
            <div className="rounded-2xl px-4 py-3 border border-white/15 bg-white/10">
              <p className="text-[11px] uppercase tracking-wide text-white/55 font-bold">Shortcut idea</p>
              <p className="text-sm font-semibold mt-1">Repeat a recent sale or tap a common item below.</p>
            </div>
          </div>
        </div>

        {lastSavedSnapshot && (
          <div className="rounded-[24px] border px-4 py-4" style={{ background: '#fffdf8', borderColor: '#eadfce', boxShadow: '0 10px 24px rgba(27,67,50,0.06)' }}>
            <p className="text-[11px] uppercase tracking-wide font-bold" style={{ color: '#7c5f32' }}>Last saved</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-gray-900 truncate">{lastSavedSnapshot.label || 'Saved sale'}</p>
                <p className="text-xs text-gray-500 mt-1">Latest confirmed record from this phone</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black" style={{ color: '#1B4332' }}>{fmt(lastSavedSnapshot.amount || 0)}</p>
                <p className="text-xs text-gray-400">{t.birr}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <section className="rounded-[24px] border px-4 py-4" style={{ background: '#fff', borderColor: '#eadfce' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide font-bold text-gray-400">Recent sales</p>
                <h3 className="text-base font-black text-gray-900 mt-1">Tap once to repeat or adjust</h3>
              </div>
              <History className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3 space-y-2">
              {recentSales.length === 0 && (
                <p className="text-sm text-gray-400">Recent voice-friendly sale patterns will appear here.</p>
              )}
              {recentSales.map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => onRepeatSale(sale)}
                  className="w-full rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.99]"
                  style={{ background: '#FAF8F5', borderColor: '#e8e2d8' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{sale.label}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
                        {sale.customerName && <span>{sale.customerName}</span>}
                        <span>{formatVoiceTime(sale.createdAt)}</span>
                        <span>{sale.paymentProvider || sale.paymentType}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black" style={{ color: '#1B4332' }}>{fmt(sale.amount)}</p>
                      <p className="text-[11px] text-gray-400">{t.birr}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border px-4 py-4" style={{ background: '#fff', borderColor: '#eadfce' }}>
            <p className="text-[11px] uppercase tracking-wide font-bold text-gray-400">Common items</p>
            <h3 className="text-base font-black text-gray-900 mt-1">Start with what this shop sells every day</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {commonItems.length === 0 && <p className="text-sm text-gray-400">As sales build up, repeated items will show here.</p>}
              {commonItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onUseItem(item)}
                  className="rounded-full px-3 py-2 text-sm font-bold"
                  style={{ background: '#eef6f1', color: '#1B4332', border: '1px solid #cfe1d7' }}
                >
                  {item.name} {item.uses > 1 ? `· ${item.uses}` : ''}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border px-4 py-4" style={{ background: '#fff', borderColor: '#eadfce' }}>
            <div className="flex items-center gap-2">
              <UserRound className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[11px] uppercase tracking-wide font-bold text-gray-400">Recent customers</p>
                <h3 className="text-base font-black text-gray-900 mt-1">Skip retyping familiar names</h3>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentCustomers.length === 0 && <p className="text-sm text-gray-400">Frequent customer shortcuts will show here once you record named sales.</p>}
              {recentCustomers.map((customer) => (
                <button
                  key={customer.name}
                  onClick={() => onUseCustomer(customer)}
                  className="rounded-full px-3 py-2 text-sm font-bold"
                  style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}
                >
                  {customer.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RecordingSession({ onTranscript, onTypeInstead, onNoInternet, voiceContext }) {
  const { t, lang } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioMimeTypeRef = useRef('');
  const timerRef = useRef(null);
  const stoppedRef = useRef(false);
  const processedRef = useRef(false);
  const handleStopRef = useRef(null);

  const cleanupMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const getRecordedAudioBlob = useCallback(() => {
    if (audioChunksRef.current.length === 0) {
      return null;
    }

    return new Blob(audioChunksRef.current, {
      type: audioMimeTypeRef.current || 'audio/webm',
    });
  }, []);

  const stopMediaRecorder = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return getRecordedAudioBlob();
    }

    if (recorder.state !== 'inactive') {
      await new Promise(resolve => {
        const handleRecorderStop = () => resolve();
        recorder.addEventListener('stop', handleRecorderStop, { once: true });
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    }

    mediaRecorderRef.current = null;
    return getRecordedAudioBlob();
  }, [getRecordedAudioBlob]);

  const sendTranscriptRequest = useCallback(async (transcript, signal) => {
    const resp = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ transcript, voice_context: voiceContext || undefined }),
    });

    if (!resp.ok) {
      throw new Error('Server error');
    }

    return resp.json();
  }, [voiceContext]);

  const sendAudioRequest = useCallback(async (audioBlob, transcript, signal) => {
    const formData = new FormData();
    formData.append('audio', buildAudioFile(audioBlob, audioMimeTypeRef.current));
    if (transcript) {
      formData.append('transcript', transcript);
    }
    if (voiceContext) {
      formData.append('voice_context', JSON.stringify(voiceContext));
    }

    const resp = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!resp.ok) {
      throw new Error('Server error');
    }

    return resp.json();
  }, [voiceContext]);

  const {
    supported: supportsSpeechRecognition,
    transcript: liveTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: getRecognitionLanguage(lang),
    continuous: true,
    interimResults: true,
    onError: (code) => {
      if (code === 'network') {
        onNoInternet();
        cleanupMediaStream();
        return;
      }
      setError(mapRecognitionError(code, t));
      cleanupMediaStream();
    },
    onEnd: (finalText, endErrorCode) => {
      if (!stoppedRef.current && endErrorCode !== 'not-allowed' && endErrorCode !== 'service-not-allowed' && endErrorCode !== 'network') {
        handleStopRef.current?.();
      }
    },
  });

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopListening();
  }, [stopListening]);

  const handleStop = useCallback(async () => {
    if (stoppedRef.current || processedRef.current) return;
    stoppedRef.current = true;
    processedRef.current = true;
    cleanupRecording();

    const transcript = liveTranscript.trim();
    const audioBlob = await stopMediaRecorder();
    cleanupMediaStream();

    if (!transcript && !audioBlob) {
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
      try {
        let data;
        try {
          data = audioBlob
            ? await sendAudioRequest(audioBlob, transcript, controller.signal)
            : await sendTranscriptRequest(transcript, controller.signal);
        } catch (audioError) {
          if (!transcript || !audioBlob) {
            throw audioError;
          }
          data = await sendTranscriptRequest(transcript, controller.signal);
        }

        onTranscript(
          data.transcript,
          data.detected_total,
          data.confidence ?? null,
          data.draft ?? null,
          data.provider ?? null,
        );
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
  }, [cleanupMediaStream, cleanupRecording, liveTranscript, onTranscript, onNoInternet, sendAudioRequest, sendTranscriptRequest, stopMediaRecorder, t]);

  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  useEffect(() => {
    stoppedRef.current = false;
    processedRef.current = false;
    audioChunksRef.current = [];
    audioMimeTypeRef.current = '';
    resetTranscript();
    setError(null);

    const supportsAudioRecording = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

    if (!supportsSpeechRecognition && !supportsAudioRecording) {
      setError(t.voiceNotSupported);
      return;
    }

    let cancelled = false;

    const startCapture = async () => {
      try {
        if (supportsAudioRecording) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          mediaStreamRef.current = stream;

          const preferredMimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : '';
          const recorder = preferredMimeType
            ? new MediaRecorder(stream, { mimeType: preferredMimeType })
            : new MediaRecorder(stream);

          audioMimeTypeRef.current = recorder.mimeType || preferredMimeType || 'audio/webm';
          recorder.ondataavailable = (event) => {
            if (event.data?.size) {
              audioChunksRef.current.push(event.data);
            }
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        }

        if (supportsSpeechRecognition) {
          startListening();
        }
      } catch (captureError) {
        if (!cancelled) {
          const blocked = captureError?.name === 'NotAllowedError' || captureError?.name === 'PermissionDeniedError';
          setError(blocked ? (t.voiceMicBlocked || t.tryAgain) : t.tryAgain);
        }
      }
    };

    startCapture();

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
      cancelled = true;
      stoppedRef.current = true;
      cleanupRecording();
      cleanupMediaStream();
    };
  }, [cleanupMediaStream, cleanupRecording, handleStop, resetTranscript, startListening, supportsSpeechRecognition, t]);

  const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: '#1B4332' }}>
      <Mic className="w-10 h-10 text-white mb-3" strokeWidth={2.5} />
      <h2 className="text-white text-xl font-black mb-2 font-sans">{t.voiceRecordingTitle}</h2>
      <p className="text-white opacity-70 text-sm mb-8 font-sans">{t.voiceRecordingHint}</p>

      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute inset-0 rounded-full bg-white opacity-5" />
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)' }}
        >
          <Mic className="w-14 h-14 text-white" strokeWidth={2} />
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

      <div
        className="w-full max-w-xs min-h-[84px] mb-4 px-4 py-3 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
      >
        <p className="text-[11px] uppercase tracking-wide text-white/60 font-bold mb-1 font-sans">{t.voiceTranscript}</p>
        <p className="text-sm text-white leading-relaxed font-sans">
          {liveTranscript || '...'}
        </p>
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-4 font-sans">{error}</p>
      )}

      {isProcessing ? (
        <div className="w-full max-w-xs py-4 font-black text-white text-base text-center font-sans"
          style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)' }}>
          <span className="inline-flex items-center justify-center gap-2">
            <LoaderCircle className="w-5 h-5 animate-spin" />
            {t.saving}
          </span>
        </div>
      ) : (
        <button
          onClick={handleStop}
          className="w-full max-w-xs py-4 font-black text-base font-sans"
          style={{ background: '#fff', color: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}
        >
          <Square className="inline-block w-5 h-5 mr-2 align-[-2px]" />
          {t.voiceStop}
        </button>
      )}

      <button
        onClick={async () => {
          stoppedRef.current = true;
          cleanupRecording();
          await stopMediaRecorder();
          cleanupMediaStream();
          onTypeInstead();
        }}
        className="mt-5 text-white opacity-60 text-sm underline font-sans min-h-[44px] flex items-center"
      >
        {t.voiceTypeInstead}
      </button>
    </div>
  );
}

function VoiceRecordScreen({ onTranscript, onTypeInstead, workspace, voiceContext, onRepeatSale, onUseItem, onUseCustomer }) {
  const { t } = useLang();
  const [sessionKey, setSessionKey] = useState(0);
  const [noInternet, setNoInternet] = useState(() => !navigator.onLine);
  const [mode, setMode] = useState('ready');

  const handleNoInternet = useCallback(() => {
    setNoInternet(true);
  }, []);

  const handleRetry = () => {
    if (!navigator.onLine) {
      return;
    }
    setNoInternet(false);
    setMode('recording');
    setSessionKey(prev => prev + 1);
  };

  if (noInternet) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--color-bg)' }}>
        <WifiOff className="w-12 h-12 mb-4 text-red-500" strokeWidth={2} />
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

  if (mode !== 'recording') {
    return (
      <VoiceWorkspace
        t={t}
        workspace={workspace}
        onStartRecording={() => {
          if (!navigator.onLine) {
            setNoInternet(true);
            return;
          }
          setMode('recording');
          setSessionKey(prev => prev + 1);
        }}
        onTypeInstead={onTypeInstead}
        onRepeatSale={onRepeatSale}
        onUseItem={onUseItem}
        onUseCustomer={onUseCustomer}
      />
    );
  }

  return (
    <RecordingSession
      key={sessionKey}
      onTranscript={onTranscript}
      onTypeInstead={onTypeInstead}
      onNoInternet={handleNoInternet}
      voiceContext={voiceContext}
    />
  );
}

export default VoiceRecordScreen;

