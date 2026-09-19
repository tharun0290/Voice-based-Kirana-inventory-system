import React, { useState, useEffect } from 'react';
import { Sparkles, X, Volume2, ShoppingCart, ArrowLeft, BrainCircuit } from 'lucide-react';
import { speakText, adjustStock } from '../services/api';
import { TRANSLATIONS } from '../utils/translations';
import confetti from 'canvas-confetti';

const PRESET_BUDGETS = [2500, 5000, 7500, 10000, 15000, 20000];

export default function RecommendationModal({
  isOpen,
  onClose,
  recommendationData,
  onFetchRecommendation,
  onOrderPlaced,
  isLoading,
  language = 'te',
  initialBudget = 5000,
  startWithResults = false
}) {
  const [budget, setBudget] = useState(initialBudget);
  const [step, setStep] = useState('budget'); // 'budget' | 'results'
  const [isApplying, setIsApplying] = useState(false);
  const t = TRANSLATIONS[language] || TRANSLATIONS.te;

  useEffect(() => {
    if (isOpen) {
      if (startWithResults && recommendationData) {
        setStep('results');
      } else {
        setStep('budget');
      }
      setBudget(initialBudget || 5000);
    }
  }, [isOpen, startWithResults]);

  useEffect(() => {
    if (recommendationData && step === 'budget' && isLoading === false) {
      // If data arrived after user triggered calculation
    }
  }, [recommendationData]);

  const handleThinkAndRecommend = async () => {
    try {
      await onFetchRecommendation(budget, language);
      setStep('results');
    } catch (e) {
      console.error('Failed to compute recommendation:', e);
    }
  };

  const handlePlayNarration = () => {
    if (recommendationData?.narration) {
      // Manual click only
      speakText(recommendationData.narration, language);
    }
  };

  const handleConfirmPurchaseOrder = async () => {
    if (!recommendationData?.recommendations?.length) return;
    setIsApplying(true);
    try {
      for (const item of recommendationData.recommendations) {
        await adjustStock(item.product_id, item.recommended_quantity);
      }
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      onOrderPlaced();
      onClose();
    } catch (e) {
      console.error('Error applying order:', e);
      alert('Could not apply stock order. Check network connection.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-amber-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {t.recModalTitle}
              </h3>
              <p className="text-xs text-amber-100">
                Collaborative AI Stock Reordering (Gemini Live + DiffusionGemma)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* STEP 1: ASK BUDGET FIRST */}
          {step === 'budget' && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-1.5 max-w-md mx-auto">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mb-3 shadow-inner">
                  <span className="text-2xl font-black">₹</span>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-stone-900">
                  {t.askBudgetTitle}
                </h4>
                <p className="text-xs sm:text-sm text-stone-500 font-medium">
                  {t.askBudgetSubtitle}
                </p>
              </div>

              {/* Budget Numeric Box & Slider */}
              <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 sm:p-6 space-y-5 max-w-lg mx-auto">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2 text-center">
                    {t.enterBudgetPrompt}
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-amber-600">₹</span>
                    <input
                      type="number"
                      min="500"
                      max="100000"
                      step="500"
                      value={budget}
                      onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                      className="text-3xl sm:text-4xl font-black text-stone-900 bg-white border border-stone-200 rounded-2xl px-4 py-2 w-52 text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div>
                  <span className="text-[11px] font-bold text-stone-400 block mb-2 text-center uppercase tracking-wider">
                    {t.presetBudgetTitle}
                  </span>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {PRESET_BUDGETS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBudget(b)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          budget === b
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-105'
                            : 'bg-white border border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        ₹{b.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="500"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer h-2.5 bg-stone-200 rounded-lg"
                />

                {/* Think and Recommend Button */}
                <button
                  type="button"
                  onClick={handleThinkAndRecommend}
                  disabled={isLoading || budget <= 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all active:scale-98 cursor-pointer"
                >
                  <BrainCircuit className="w-5 h-5 text-amber-200" />
                  <span>{isLoading ? t.thinkingReorder : t.thinkAndRecommendBtn}</span>
                </button>
              </div>

              {isLoading && (
                <div className="text-center py-4 text-amber-700 font-bold text-sm animate-pulse flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-amber-600" />
                  <span>{t.thinkingReorder}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: RESULTS (After AI has thought) */}
          {step === 'results' && (
            <div className="space-y-6">
              
              {/* Back to Budget Button & Current Budget Badge */}
              <div className="flex items-center justify-between gap-3 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                <button
                  type="button"
                  onClick={() => setStep('budget')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.changeBudgetBtn}</span>
                </button>
                <div className="text-xs font-bold text-stone-700">
                  {t.budgetLabel} <span className="text-sm font-black text-amber-800">₹{budget.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* AI Shopkeeper Narration Card in Chosen Language */}
              {recommendationData?.narration && (
                <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 rounded-2xl p-4 border border-amber-300 flex items-start gap-3 shadow-xs">
                  <button
                    onClick={handlePlayNarration}
                    className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    title="Play Audio"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {t.narrationCardTitle}:
                    </span>
                    <p className="text-sm font-semibold text-stone-800 leading-relaxed">
                      {recommendationData.narration}
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Metric Stats */}
              {recommendationData && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                    <span className="text-[11px] font-bold uppercase text-stone-500 block">{t.totalAllocated}</span>
                    <span className="text-lg sm:text-xl font-extrabold text-stone-900">
                      ₹{recommendationData.total_spent?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                    <span className="text-[11px] font-bold uppercase text-stone-500 block">{t.remainingBudget}</span>
                    <span className="text-lg sm:text-xl font-extrabold text-emerald-700">
                      ₹{recommendationData.remaining_budget?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                    <span className="text-[11px] font-bold uppercase text-stone-500 block">{t.reorderUnits}</span>
                    <span className="text-lg sm:text-xl font-extrabold text-amber-600">
                      {recommendationData.recommendations?.length || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Greedy Allocation Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                  Ranked Depleted Stock Allocation:
                </h4>

                {isLoading ? (
                  <div className="py-12 text-center text-stone-500 text-sm font-medium">
                    {t.thinkingReorder}
                  </div>
                ) : recommendationData?.recommendations?.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 text-sm bg-stone-50 rounded-2xl border border-stone-200">
                    All store stock levels are currently healthy! No urgent purchase needed.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-stone-200">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3 text-center">Days Left</th>
                          <th className="p-3 text-center">{t.reorderUnits}</th>
                          <th className="p-3 text-right">Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {recommendationData?.recommendations?.map((item) => {
                          const localizedName = (language === 'te' ? item.telugu_name : (language === 'hi' ? item.hindi_name : item.product_name)) || item.product_name;
                          const subtitleName = localizedName !== item.product_name ? item.product_name : (item.telugu_name || item.hindi_name || '');
                          const localizedUnit = t.units?.[item.unit] || item.unit;

                          return (
                            <tr key={item.product_id} className="hover:bg-amber-50/50 transition-colors">
                              <td className="p-3 flex items-center gap-2.5">
                                <img
                                  src={item.image_url}
                                  alt={localizedName}
                                  className="w-9 h-9 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0"
                                  onError={(e) => { e.target.src = '/assets/products/unknown.png'; }}
                                />
                                <div>
                                  <div className="font-bold text-stone-900">{localizedName}</div>
                                  {subtitleName && (
                                    <div className="text-[11px] text-stone-500">{subtitleName}</div>
                                  )}
                                  <div className="text-[10px] text-stone-400">Current: {item.current_stock} {localizedUnit}</div>
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                  item.days_of_stock_remaining < 3
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.days_of_stock_remaining}d
                                </span>
                              </td>

                              <td className="p-3 text-center font-bold text-amber-700">
                                +{item.recommended_quantity} {localizedUnit}
                              </td>

                              <td className="p-3 text-right font-extrabold text-stone-900">
                                ₹{item.total_cost?.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer with Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-200 text-xs sm:text-sm font-semibold text-stone-700 transition-colors cursor-pointer"
          >
            {t.closeBtn}
          </button>

          {step === 'results' && (
            <button
              onClick={handleConfirmPurchaseOrder}
              disabled={isApplying || !recommendationData?.recommendations?.length}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{isApplying ? "Applying Restock..." : "Confirm & Restock Items"}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
