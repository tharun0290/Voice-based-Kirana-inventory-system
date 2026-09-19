import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Mic, MicOff, Send, Volume2, X } from 'lucide-react';
import { speakText } from '../services/api';
import { TRANSLATIONS } from '../utils/translations';

const QUICK_COUNTS = [5, 10, 15, 20, 25, 50];

export default function ClarificationModal({
  clarificationData,
  onClarifySubmit,
  onClose,
  isProcessing,
  language = 'te'
}) {
  const [replyText, setReplyText] = useState('');
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
    if (clarificationData?.question) {
      setReplyText('');
    }
  }, [clarificationData, language]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = getLocaleForLang(language);
      rec.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          text += e.results[i][0].transcript;
        }
        if (text) setReplyText(text);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [language]);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setReplyText('');
      recognitionRef.current.lang = getLocaleForLang(language);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!replyText.trim() || isProcessing) return;
    onClarifySubmit(clarificationData.session_id, replyText.trim());
  };

  const handleQuickCount = (count) => {
    const unit = clarificationData?.unit || 'packets';
    const text = `${count} ${unit}`;
    setReplyText(text);
    onClarifySubmit(clarificationData.session_id, text);
  };

  if (!clarificationData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-amber-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-200" />
            <h3 className="font-bold text-sm sm:text-base">
              {t.clarificationTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <button
              onClick={() => speakText(clarificationData.question, language)}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shrink-0 shadow-sm active:scale-95 cursor-pointer"
              title="Speak Again"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider mb-1">
                {clarificationData.telugu_product || clarificationData.product} ({clarificationData.source})
              </p>
              <h4 className="text-base font-bold text-stone-900 leading-snug">
                {clarificationData.question}
              </h4>
              {clarificationData.english_question && clarificationData.english_question !== clarificationData.question && (
                <p className="text-xs text-stone-500 mt-1 italic">
                  {clarificationData.english_question}
                </p>
              )}
            </div>
          </div>

          {/* Quick Count Chips */}
          <div>
            <span className="text-xs font-semibold text-stone-600 block mb-2">
              {t.clarificationPrompt}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_COUNTS.map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleQuickCount(count)}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-xl border border-amber-200 bg-stone-50 hover:bg-amber-100/70 hover:border-amber-400 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  +{count} {clarificationData?.telugu_unit || clarificationData?.unit || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Spoken / Typed Reply */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                }`}
                title="Tap to speak count"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t.inputPlaceholder}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!replyText.trim() || isProcessing}
              className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t.clarificationSubmit} ({replyText || '...'})</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
