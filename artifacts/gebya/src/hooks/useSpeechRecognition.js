import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function getRecognitionLanguage(appLang) {
  return appLang === 'en' ? 'en-US' : 'am-ET';
}

export function mapRecognitionError(errorCode, t) {
  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
    return t.voiceMicBlocked || t.tryAgain;
  }
  if (errorCode === 'network') {
    return t.voiceNoInternetHint || t.tryAgain;
  }
  return t.tryAgain;
}

export function useSpeechRecognition({
  language = 'am-ET',
  continuous = false,
  interimResults = true,
  onFinalResult,
  onError,
  onEnd,
} = {}) {
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const listeningIntentRef = useRef(false);
  const lastErrorCodeRef = useRef(null);
  const onFinalResultRef = useRef(onFinalResult);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);

  const [supported, setSupported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
    onErrorRef.current = onError;
    onEndRef.current = onEnd;
  }, [onEnd, onError, onFinalResult]);

  const stopListening = useCallback(() => {
    listeningIntentRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setErrorCode(null);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    setSupported(Boolean(SpeechRecognition));

    if (!SpeechRecognition) {
      const nextError = 'unsupported';
      setErrorCode(nextError);
      onErrorRef.current?.(nextError);
      return false;
    }

    stopListening();
    resetTranscript();
    listeningIntentRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setErrorCode(null);
      lastErrorCodeRef.current = null;
    };

    recognition.onresult = (event) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript?.trim();
        if (!chunk) continue;

        if (event.results[i].isFinal) {
          const existingFinal = finalTranscriptRef.current.trim();
          if (!existingFinal.endsWith(chunk)) {
            finalTranscriptRef.current = `${existingFinal} ${chunk}`.trim();
          }
        } else {
          interim = `${interim} ${chunk}`.trim();
        }
      }

      const combined = `${finalTranscriptRef.current} ${interim}`.trim();
      setTranscript(combined);

      if (!continuous && finalTranscriptRef.current.trim()) {
        onFinalResultRef.current?.(finalTranscriptRef.current.trim());
      }
    };

    recognition.onerror = (event) => {
      const nextError = event?.error || 'unknown';
      setErrorCode(nextError);
      lastErrorCodeRef.current = nextError;
      setListening(false);
      listeningIntentRef.current = false;
      onErrorRef.current?.(nextError);
    };

    recognition.onend = () => {
      setListening(false);
      const finalText = finalTranscriptRef.current.trim();
      if (continuous && listeningIntentRef.current && finalText) {
        onFinalResultRef.current?.(finalText);
      }
      onEndRef.current?.(finalText, lastErrorCodeRef.current);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch {
      const nextError = 'start-failed';
      setErrorCode(nextError);
      listeningIntentRef.current = false;
      onErrorRef.current?.(nextError);
      return false;
    }
  }, [continuous, interimResults, language, resetTranscript, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  return {
    supported,
    listening,
    transcript,
    errorCode,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
