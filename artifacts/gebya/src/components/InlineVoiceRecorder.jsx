import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LangContext';

const TOTAL_DURATION = 20;
const NUDGE_AT = 12;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const RECORDING_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickMime() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return RECORDING_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

async function submitAudio(blob, browserFallback = '') {
  const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
  const form = new FormData();
  form.append('audio', blob, `voice-sale.${ext}`);
  if (browserFallback.trim()) form.append('browserFallback', browserFallback.trim());
  const resp = await fetch(`${API_BASE_URL}/api/transcribe`, { method: 'POST', body: form });
  if (!resp.ok) throw new Error('Audio transcription failed');
  return resp.json();
}

async function submitText(transcript) {
  const resp = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!resp.ok) throw new Error('Text parse failed');
  return resp.json();
}

export default function InlineVoiceRecorder({ onResult }) {
  const { t } = useLang();
  const [state, setState] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerRef = useRef(null);
  const finalChunksRef = useRef([]);
  const audioChunksRef = useRef([]);
  const elapsedRef = useRef(0);
  const stoppedRef = useRef(false);
  const processedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const transcriptRef = useRef('');

  const cleanup = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* noop */ } recognitionRef.current = null; }
    if (mediaRecorderRef.current) {
      try { if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch { /* noop */ }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const processResult = useCallback(async () => {
    const backup = transcriptRef.current.trim();
    const mime = mediaRecorderRef.current?.mimeType || pickMime() || 'audio/webm';
    const hasAudio = audioChunksRef.current.length > 0;

    setState('processing');

    try {
      let data = null;
      if (hasAudio) {
        try {
          const blob = new Blob(audioChunksRef.current, { type: mime });
          data = await submitAudio(blob, backup);
        } catch { data = null; }
      }
      const transcript = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
      if (transcript) {
        onResult(transcript, data.detected_total ?? null);
        setState('done');
        return;
      }
      if (backup) {
        const fd = await submitText(backup);
        onResult(fd.transcript, fd.detected_total ?? null);
        setState('done');
        return;
      }
      throw new Error('no transcript');
    } catch {
      if (!navigator.onLine) {
        setError(t.voiceNoInternet || 'No internet');
      } else {
        setError(t.tryAgain || 'Try again');
      }
      setState('idle');
    }
  }, [onResult, t]);

  const handleStop = useCallback(() => {
    if (stoppedRef.current || processedRef.current) return;
    stoppedRef.current = true;
    stopRequestedRef.current = true;
    processedRef.current = true;
    setState('stopped');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    cleanup();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => { processResult(); };
      try { mr.stop(); return; } catch { /* fall through */ }
    }
    processResult();
  }, [cleanup, processResult]);

  const startRecording = async () => {
    setError('');
    stoppedRef.current = false;
    processedRef.current = false;
    stopRequestedRef.current = false;
    transcriptRef.current = '';
    finalChunksRef.current = [];
    audioChunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);
    setLiveText('');
    setState('recording');

    const supportsAudio = !!(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
    const supportsSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!supportsAudio && !supportsSpeech) { setError(t.voiceNotSupported || 'Not supported'); setState('idle'); return; }

    if (supportsAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const mime = pickMime();
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        recorder.ondataavailable = e => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
        mediaRecorderRef.current = recorder;
        recorder.start(250);
      } catch (err) {
        if (err?.name === 'NotAllowedError') { setError(t.voiceMicBlocked || 'Mic blocked'); setState('idle'); return; }
      }
    }

    if (supportsSpeech) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'am-ET';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = true;
      rec.onresult = e => {
        const finals = [...finalChunksRef.current];
        const interim = [];
        for (let i = 0; i < e.results.length; i++) {
          const chunk = e.results[i][0]?.transcript?.trim();
          if (!chunk) continue;
          if (e.results[i].isFinal) finals[i] = chunk;
          else interim.push(chunk);
        }
        finalChunksRef.current = finals;
        transcriptRef.current = [...finals.filter(Boolean), ...interim].join(' ').trim();
        setLiveText(transcriptRef.current);
      };
      rec.onerror = e => {
        if (e.error === 'network') { setError(t.voiceNoInternet || 'No internet'); setState('idle'); }
      };
      rec.onend = () => {
        if (!stopRequestedRef.current) {
          try { rec.start(); } catch { /* noop */ }
        }
      };
      recognitionRef.current = rec;
      try { rec.start(); } catch { /* noop */ }
    }

    timerRef.current = setInterval(() => {
      const next = elapsedRef.current + 1;
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= TOTAL_DURATION) handleStop();
    }, 1000);
  };

  const cancel = () => {
    cleanup();
    setState('idle');
    setError('');
    setLiveText('');
    setElapsed(0);
    stoppedRef.current = false;
    processedRef.current = false;
    stopRequestedRef.current = false;
  };

  useEffect(() => () => cleanup(), [cleanup]);

  const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;
  const remaining = Math.max(TOTAL_DURATION - elapsed, 0);

  if (state === 'idle') {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-lg" style={{ borderColor: '#e8e2d8', background: '#fafaf8' }}>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-sans truncate">{t.voiceHint || 'Tap mic to speak your sale'}</p>
        </div>
        <button
          onClick={startRecording}
          className="flex-shrink-0 p-2.5 rounded-full press-scale min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ background: '#2d6a4f', color: '#fff' }}
          title={t.voiceInput}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg" style={{ borderColor: '#2d6a4f', background: 'rgba(27,106,50,0.05)' }}>
        <div className="flex-shrink-0 p-2 rounded-full animate-pulse" style={{ background: '#2d6a4f' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-sans text-gray-700">{t.voiceProcessingState || 'Processing...'}</p>
          <p className="text-[11px] font-sans" style={{ color: '#9ca3af' }}>{t.voiceWaitFix || 'Parsing your words'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#2d6a4f', background: '#fafaf8' }}>
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4654A' }} />
            <span className="text-xs font-bold uppercase tracking-wide font-sans" style={{ color: '#2d6a4f' }}>
              {t.voiceListeningState || 'Recording'}
            </span>
          </div>
          <span className="text-sm font-mono font-bold font-sans text-gray-700">{timeStr}</span>
        </div>
        <div className="h-1.5 w-full rounded-full" style={{ background: '#e8e2d8' }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: '#D4654A' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-sans" style={{ color: '#9ca3af' }}>{liveText || (t.voiceLivePreviewHint || 'Speak now...')}</span>
          <span className="text-[10px] font-mono font-sans" style={{ color: '#9ca3af' }}>{remaining}s</span>
        </div>
        {error && <p className="text-xs mt-1 font-sans text-red-600">{error}</p>}
      </div>
      <div className="flex border-t" style={{ borderColor: '#e8e2d8' }}>
        <button
          onClick={handleStop}
          className="flex-1 py-2.5 text-sm font-bold font-sans text-white text-center"
          style={{ background: '#2d6a4f' }}
        >
          ⏹ {t.voiceStop || 'Stop'}
        </button>
        <button
          onClick={cancel}
          className="flex-1 py-2.5 text-sm font-bold font-sans text-gray-500 text-center border-l"
          style={{ borderColor: '#e8e2d8', background: '#fff' }}
        >
          ✕ {t.cancel || 'Cancel'}
        </button>
      </div>
    </div>
  );
}