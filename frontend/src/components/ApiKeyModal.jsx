import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Cpu, CheckCircle2 } from 'lucide-react';

export default function ApiKeyModal({
  isOpen,
  onClose,
  onSettingsSaved
}) {
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nvidia_api_key: nvidiaKey.trim() || undefined,
          gemini_api_key: geminiKey.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg('✅ Collaborative AI API keys saved successfully!');
        if (onSettingsSaved) onSettingsSaved(data);
        setTimeout(() => {
          onClose();
          setStatusMsg('');
        }, 1200);
      } else {
        setStatusMsg(`❌ ${data.detail || 'Failed to save settings'}`);
      }
    } catch (e) {
      setStatusMsg('❌ Network error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-amber-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">Collaborative AI Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          
          {/* Collaborative Engine Overview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-amber-50/60 to-orange-50/70 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white">
                Collaborative Pipeline
              </span>
              <span className="text-xs font-bold text-stone-800">
                Gemini Live + DiffusionGemma Active Together
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Models work side-by-side without needing a manual selector:
            </p>
            <ul className="text-xs text-stone-700 space-y-1 pl-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span><strong>Gemini Live:</strong> High-speed Camera Vision item recognition, Multilingual Entity Normalization (Telugu/Hindi/English), and TTS.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span><strong>DiffusionGemma:</strong> Core Kirana Inventory Reasoning, Stock Deductions/Additions, and Purchase Reordering logic.</span>
              </li>
            </ul>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Google / Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Get Gemini Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy... (Leave empty to keep existing key)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-stone-500">
              Powers camera item detection and Telugu/Hindi entity canonicalization.
            </p>
          </div>

          {/* NVIDIA API Key */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-600" />
                <span>NVIDIA API Key (for DiffusionGemma)</span>
              </label>
              <a
                href="https://build.nvidia.com/google/diffusiongemma-26b-a4b-it"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>Get NVIDIA Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={nvidiaKey}
              onChange={(e) => setNvidiaKey(e.target.value)}
              placeholder="nvapi-... (Optional, local engine active if omitted)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
            <p className="text-[11px] text-stone-500">
              Calls hosted DiffusionGemma 26B A4B IT via NVIDIA Integrate API.
            </p>
          </div>

          {statusMsg && (
            <p className="text-xs font-bold text-center py-1">{statusMsg}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-600 cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save API Configuration"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
