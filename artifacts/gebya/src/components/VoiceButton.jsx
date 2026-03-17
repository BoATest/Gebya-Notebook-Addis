import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLang } from '../context/LangContext';

function VoiceButton({ onResult }) {
  const { t } = useLang();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const startListening = () => {
    setError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'am-ET';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setError(t.tryAgain);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
  };

  if (!isSupported) {
    return (
      <span className="text-xs text-gray-400 italic">{t.voiceNotSupported}</span>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={startListening}
        disabled={listening}
        aria-label={t.voiceInput}
        className={`p-3 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-all ${
          listening
            ? 'bg-red-500 animate-pulse text-white'
            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }`}
      >
        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
}

export default VoiceButton;
