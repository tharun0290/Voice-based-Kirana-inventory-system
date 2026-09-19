import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, MessageSquare } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';

export default function VoiceController({ onVoiceSubmit, isProcessing, lastActionMessage, language = 'te' }) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.te;

  const getLocaleForLang = (lang) => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'en': return 'en-IN';
      case 'te':
      default: return 'te-IN';
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getLocaleForLang(language);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Update speech recognition locale dynamically when user changes language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getLocaleForLang(language);
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is supported via Google Chrome / Edge. You can also click the quick speech chips or type below!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current.lang = getLocaleForLang(language);
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!transcript.trim() || isProcessing) return;
    onVoiceSubmit(transcript.trim());
    setTranscript('');
  };

  const handleChipClick = (chipText) => {
    setTranscript(chipText);
    onVoiceSubmit(chipText);
  };

  return (
    <div className="bg-gradient-to-b from-amber-500/10 to-orange-500/5 rounded-3xl p-5 border border-amber-200/80 shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-6">
        
        {/* Big Mic Button with Pulse */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-amber-500 animate-pulse-ring" />
            )}
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              title={isListening ? "Click to stop listening" : "Click to speak voice command"}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white shadow-red-500/50 scale-105'
                  : 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white hover:brightness-110 shadow-amber-600/30'
              }`}
            >
              {isListening ? (
                <MicOff className="w-9 h-9 animate-pulse" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>
          </div>
          <span className="text-xs font-bold tracking-wide uppercase text-amber-900/80">
            {isListening ? t.micListening : t.micIdle}
          </span>
        </div>

        {/* Input Field & Suggestion Chips */}
        <div className="flex-1 w-full space-y-3">
          
          {/* Transcript input box */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isListening ? t.micListening : t.inputPlaceholder}
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-amber-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm md:text-base shadow-sm font-medium"
              />
              {transcript && (
                <span className="absolute right-3 top-3 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                  Voice
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!transcript.trim() || isProcessing}
              className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t.sendBtn}</span>
            </button>
          </form>

          {/* Quick Voice Chips tailored to active language */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                {t.quickPromptsTitle}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.label)}
                  disabled={isProcessing}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white border border-amber-200/90 text-xs font-semibold text-stone-700 hover:text-amber-800 hover:border-amber-400 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                  <span className="text-[10px] text-stone-400 font-normal group-hover:text-amber-600">
                    ({chip.desc})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Response Banner */}
          {lastActionMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-stone-800 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{lastActionMessage}</div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
