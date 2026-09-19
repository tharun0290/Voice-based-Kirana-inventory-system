import React from 'react';
import { ShoppingBag, Camera, Sparkles, RefreshCw, AlertTriangle, Globe, Settings, Cpu } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';

export default function Header({ 
  products, 
  onOpenRecommendation, 
  onOpenScanner, 
  onResetData, 
  isResetting,
  onOpenApiKeyModal,
  language = 'te',
  onLanguageChange,
  userRole = 'customer',
  onLogout
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.te;
  const lowStockCount = products.filter(p => p.days_of_stock_remaining < 5).length;

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand Logo & Store Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                {t.appName} <span className="text-amber-600 font-bold text-base sm:text-lg">Kirana Mitra</span>
              </h1>
            </div>
            <p className="text-[11px] text-stone-500">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Center: Collaborative Engine Badge + Language Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Collaborative Hybrid Engine Badge (Gemini Live + DiffusionGemma) */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-amber-50/70 to-orange-50/80 border border-amber-200/90 shadow-xs"
            title={t.engineTooltip}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
            <span className="text-xs font-black text-stone-800 tracking-tight">
              Gemini Live <span className="text-amber-600 font-bold">+</span> DiffusionGemma
            </span>
            <button
              onClick={onOpenApiKeyModal}
              title="Configure AI Keys"
              className="ml-1 p-0.5 rounded-lg hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3-Language Selector Dropdown (English, Telugu, Hindi) */}
          <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-2xl border border-stone-200 hover:border-amber-300 transition-all shadow-xs">
            <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer pr-1"
              aria-label="Select Language"
            >
              <option value="te">🇮🇳 తెలుగు (Telugu)</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Low stock alert badge */}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>{lowStockCount} {t.lowStockAlert}</span>
            </div>
          )}

          {/* Camera Scanner Button */}
          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.scanItemBtn}</span>
          </button>

          {/* Purchase Recommendation Button */}
          <button
            onClick={onOpenRecommendation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{t.recommendationBtn}</span>
          </button>

          {/* Reset Store */}
          {userRole === 'owner' && (
            <button
              onClick={onResetData}
              disabled={isResetting}
              title={t.resetBtnTitle}
              className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 text-xs font-bold transition-all hover:bg-stone-100 cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
