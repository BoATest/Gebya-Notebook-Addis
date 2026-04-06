import { Mic, MicOff } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { getRecognitionLanguage, mapRecognitionError, useSpeechRecognition } from '../hooks/useSpeechRecognition';

function VoiceButton({ onResult }) {
  const { t, lang } = useLang();
  const {
    supported,
    listening,
    transcript,
    errorCode,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language: getRecognitionLanguage(lang),
    continuous: false,
    interimResults: true,
    onFinalResult: (value) => {
      if (value?.trim()) {
        onResult(value.trim());
      }
    },
  });

  if (!supported) {
    return (
      <span className="text-xs text-gray-400 italic">{t.voiceNotSupported}</span>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        aria-label={t.voiceInput}
        className={`p-3 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-all ${
          listening
            ? 'bg-red-500 animate-pulse text-white'
            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }`}
      >
        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      <span className="text-[11px] text-gray-400 mt-1 min-h-[16px] text-center max-w-[120px] leading-tight">
        {listening ? (transcript || t.voiceInput) : ''}
      </span>
      {errorCode && <span className="text-xs text-red-500 mt-1 text-center">{mapRecognitionError(errorCode, t)}</span>}
    </div>
  );
}

export default VoiceButton;
