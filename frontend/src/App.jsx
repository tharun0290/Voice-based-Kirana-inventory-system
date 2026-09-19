import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import VoiceController from './components/VoiceController';
import InventoryGrid from './components/InventoryGrid';
import CameraScanner from './components/CameraScanner';
import ClarificationModal from './components/ClarificationModal';
import RecommendationModal from './components/RecommendationModal';
import ApiKeyModal from './components/ApiKeyModal';
import { TRANSLATIONS } from './utils/translations';
import {
  fetchInventory,
  adjustStock,
  updateProductImage,
  deleteProduct,
  sendVoiceCommand,
  sendCameraCommand,
  sendClarification,
  fetchPurchaseRecommendation,
  resetDatabase,
  fetchHealth
} from './services/api';
import confetti from 'canvas-confetti';

const ROLE_CREDENTIALS = {
  customer: { username: 'customer', password: 'customer123' },
  owner: { username: 'owner', password: 'owner123' }
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('kirana_session') === 'true');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('kirana_role') || 'customer');
  const [loginForm, setLoginForm] = useState({ username: 'customer', password: 'customer123' });
  const [loginError, setLoginError] = useState('');

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kirana_lang') || 'te';
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [recommendationData, setRecommendationData] = useState(null);
  const [recommendationStartWithResults, setRecommendationStartWithResults] = useState(false);
  const [recommendationInitialBudget, setRecommendationInitialBudget] = useState(5000);
  const [clarificationData, setClarificationData] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const t = TRANSLATIONS[language] || TRANSLATIONS.te;
  const availableProducts = products.filter((product) => Number(product.current_stock) > 0);
  const summaryProducts = userRole === 'customer' ? availableProducts : products;
  const totalStockUnits = summaryProducts.reduce(
    (total, product) => total + Number(product.current_stock || 0),
    0
  );
  const lowStockCount = summaryProducts.filter(
    (product) => Number(product.days_of_stock_remaining) < 5
  ).length;
  const netChange = summaryProducts.reduce(
    (total, product) => total + Number(product.current_stock || 0) - Number(product.min_stock || 0),
    0
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadInventory();
      checkHealth();
    }
  }, [isAuthenticated]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('kirana_lang', newLang);
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const username = loginForm.username.trim().toLowerCase();
    const password = loginForm.password.trim();

    if (username === ROLE_CREDENTIALS.customer.username && password === ROLE_CREDENTIALS.customer.password) {
      setUserRole('customer');
      localStorage.setItem('kirana_role', 'customer');
      localStorage.setItem('kirana_session', 'true');
      setIsAuthenticated(true);
      setLoginError('');
      return;
    }

    if (username === ROLE_CREDENTIALS.owner.username && password === ROLE_CREDENTIALS.owner.password) {
      setUserRole('owner');
      localStorage.setItem('kirana_role', 'owner');
      localStorage.setItem('kirana_session', 'true');
      setIsAuthenticated(true);
      setLoginError('');
      return;
    }

    setLoginError('Use customer / customer123 or owner / owner123');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('kirana_session');
    setLoginForm({ username: 'customer', password: 'customer123' });
  };

  const checkHealth = async () => {
    try {
      const data = await fetchHealth();
      if (data.status === 'healthy') {
        console.log('Collaborative AI Engine active:', data.engine);
      }
    } catch (e) {
      console.warn('Health check failed:', e);
    }
  };

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const data = await fetchInventory();
      setProducts(data);
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (productId, delta) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newStock = Math.max(0, p.current_stock + delta);
        const days = p.avg_daily_sales ? (newStock / p.avg_daily_sales).toFixed(1) : 999;
        return { ...p, current_stock: newStock, days_of_stock_remaining: Number(days) };
      }
      return p;
    }));

    try {
      await adjustStock(productId, delta);
    } catch (e) {
      console.error('Failed to adjust stock:', e);
      loadInventory();
    }
  };

  const handleUpdateProductImage = async (productId, imageUrl) => {
    try {
      const res = await updateProductImage(productId, imageUrl);
      setLastActionMessage(res.message || 'Product image updated.');
      await loadInventory();
    } catch (e) {
      console.error('Failed to update product image:', e);
      setLastActionMessage('⚠️ Could not update the product image.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product from the catalog?')) return;

    try {
      const res = await deleteProduct(productId);
      setLastActionMessage(res.message || 'Product removed.');
      await loadInventory();
    } catch (e) {
      console.error('Failed to delete product:', e);
      setLastActionMessage('⚠️ Could not remove that product.');
    }
  };

  const handleVoiceSubmit = async (transcript) => {
    if (userRole !== 'owner') {
      setLastActionMessage('Customer mode can browse available items. Owners can add or remove stock.');
      return;
    }

    setIsProcessing(true);
    setLastActionMessage(language === 'hi' ? 'सोच रहा हूँ...' : (language === 'en' ? 'Thinking with Collaborative AI...' : 'ఆలోచిస్తున్నాను...'));
    try {
      const res = await sendVoiceCommand(transcript, language);

      if (res.status === 'needs_clarification') {
        setClarificationData(res);
        setLastActionMessage(`❓ ${res.question}`);
        return;
      }

      if (res.status === 'needs_budget' || res.action === 'ask_budget') {
        setRecommendationData(null);
        setRecommendationStartWithResults(false);
        if (res.default_budget) setRecommendationInitialBudget(res.default_budget);
        setIsRecommendationOpen(true);
        setLastActionMessage(`💰 ${res.question}`);
        return;
      }

      if (res.action === 'purchase_recommendation') {
        setRecommendationData(res.recommendation ? { ...res.recommendation, narration: res.narration } : null);
        setRecommendationStartWithResults(true);
        if (res.budget) setRecommendationInitialBudget(res.budget);
        setIsRecommendationOpen(true);
        setLastActionMessage(res.message);
        return;
      }

      if (res.status === 'success') {
        setLastActionMessage(res.message);

        if (res.product_id && res.current_stock !== undefined) {
          setProducts(prev => prev.map(p =>
            p.id === res.product_id
              ? {
                  ...p,
                  current_stock: res.current_stock,
                  days_of_stock_remaining: Number((res.current_stock / (p.avg_daily_sales || 1)).toFixed(1))
                }
              : p
          ));
        }

        confetti({ particleCount: 50, spread: 50 });
        await loadInventory();
      } else {
        setLastActionMessage(`⚠️ ${res.message}`);
      }
    } catch (err) {
      console.error('Voice command error:', err);
      setLastActionMessage('⚠️ Error processing voice command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraCaptureAndSend = async (imageB64, voiceTranscript) => {
    if (userRole !== 'owner') {
      alert('Owners can scan and manage stock updates. Customers can browse inventory only.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await sendCameraCommand(imageB64, voiceTranscript, language);

      if (res.status === 'needs_clarification') {
        setIsScannerOpen(false);
        setClarificationData(res);
        setLastActionMessage(`📸 ${res.question}`);
        return;
      }

      if (res.status === 'success') {
        setIsScannerOpen(false);
        setLastActionMessage(res.message);
        confetti({ particleCount: 70, spread: 60 });
        await loadInventory();
      } else {
        alert(res.message || 'Could not recognize grocery item.');
      }
    } catch (err) {
      console.error('Camera command error:', err);
      alert('Failed to analyze camera frame.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClarificationSubmit = async (sessionId, replyText) => {
    setIsProcessing(true);
    try {
      const res = await sendClarification(sessionId, replyText, language);

      if (res.status === 'needs_clarification') {
        setClarificationData(res);
        return;
      }

      if (res.status === 'success') {
        setClarificationData(null);
        setLastActionMessage(res.message);
        confetti({ particleCount: 80, spread: 60 });
        await loadInventory();
      } else {
        alert(res.message || 'Failed to clarify quantity.');
      }
    } catch (err) {
      console.error('Clarification error:', err);
      alert('Failed to send clarification.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchRecommendation = async (budget, lang) => {
    try {
      const res = await fetchPurchaseRecommendation(budget, lang || language);
      setRecommendationData(res);
    } catch (err) {
      console.error('Recommendation fetch error:', err);
    }
  };

  const handleResetStore = async () => {
    if (!window.confirm(t.resetConfirm)) return;
    setIsResetting(true);
    try {
      await resetDatabase();
      await loadInventory();
      setLastActionMessage('✨ Reset store catalog to initial Kirana products.');
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl shadow-md">🛒</div>
            <h1 className="text-2xl font-black text-stone-900">Kirana Mitra</h1>
            <p className="mt-2 text-sm text-stone-500">Customer access or owner management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLoginForm({ username: 'customer', password: 'customer123' })}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${loginForm.username === 'customer' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setLoginForm({ username: 'owner', password: 'owner123' })}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${loginForm.username === 'owner' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
              >
                Owner
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm py-3 shadow-md hover:from-amber-700 hover:to-orange-700"
            >
              Login
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">
            <p><strong>Customer:</strong> customer / customer123</p>
            <p><strong>Owner:</strong> owner / owner123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header
        products={products}
        onOpenRecommendation={() => {
          setRecommendationData(null);
          setRecommendationStartWithResults(false);
          setIsRecommendationOpen(true);
        }}
        onOpenScanner={() => setIsScannerOpen(true)}
        onResetData={handleResetStore}
        isResetting={isResetting}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
        language={language}
        onLanguageChange={handleLanguageChange}
        userRole={userRole}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 p-3 shadow-sm">
          <div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-stone-400">Access level</p>
            <h2 className="text-lg font-black text-stone-900 capitalize">{userRole} dashboard</h2>
          </div>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700">
            {userRole === 'customer' ? 'Available items only' : 'All items + owner controls'}
          </span>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Inventory summary">
          <div className="min-h-[92px] rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Total products</p>
            <p className="mt-2 text-2xl font-black text-stone-900">{summaryProducts.length}</p>
          </div>
          <div className="min-h-[92px] rounded-2xl border border-red-100 bg-red-50/80 px-4 py-4 shadow-sm">
            <p className="text-[10px] uppercase font-black tracking-wide text-red-500">Low stock</p>
            <p className="mt-2 text-2xl font-black text-red-700">{lowStockCount}</p>
          </div>
          <div className="min-h-[92px] rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-4 shadow-sm">
            <p className="text-[10px] uppercase font-black tracking-wide text-emerald-600">Stock units</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{Math.round(totalStockUnits)}</p>
          </div>
          <div className="min-h-[92px] rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-4 shadow-sm">
            <p className="text-[10px] uppercase font-black tracking-wide text-amber-600">Net change</p>
            <p className={`mt-2 text-2xl font-black ${netChange >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {netChange >= 0 ? '+' : ''}{Math.round(netChange)}
            </p>
          </div>
        </section>

        {userRole === 'customer' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Customer view: you can browse products that are currently in stock.
          </div>
        )}

        {userRole === 'owner' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Owner view: you can update stock, remove products, and replace product images.
          </div>
        )}

        <VoiceController
          onVoiceSubmit={handleVoiceSubmit}
          isProcessing={isProcessing}
          lastActionMessage={lastActionMessage}
          language={language}
        />

        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
              {t.catalogTitle}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {userRole === 'customer'
                ? 'Available inventory for customers'
                : 'Real-time stock depletion tracker & voice-operated catalog'}
            </p>
          </div>
          <span className="text-xs font-bold text-stone-500 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
            {userRole === 'customer'
              ? products.filter((p) => Number(p.current_stock) > 0).length
              : products.length} {t.itemsCount}
          </span>
        </div>

        <InventoryGrid
          products={products}
          onAdjustStock={handleAdjustStock}
          onDeleteProduct={handleDeleteProduct}
          onUpdateProductImage={handleUpdateProductImage}
          isLoading={isLoading}
          language={language}
          userRole={userRole}
        />
      </main>

      <CameraScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCaptureAndSend={handleCameraCaptureAndSend}
        isProcessing={isProcessing}
        language={language}
      />

      <ClarificationModal
        clarificationData={clarificationData}
        onClarifySubmit={handleClarificationSubmit}
        onClose={() => setClarificationData(null)}
        isProcessing={isProcessing}
        language={language}
      />

      <RecommendationModal
        isOpen={isRecommendationOpen}
        onClose={() => setIsRecommendationOpen(false)}
        recommendationData={recommendationData}
        onFetchRecommendation={handleFetchRecommendation}
        onOrderPlaced={loadInventory}
        isLoading={isProcessing}
        language={language}
        initialBudget={recommendationInitialBudget}
        startWithResults={recommendationStartWithResults}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        onSettingsSaved={() => {
          setLastActionMessage('✨ Collaborative AI settings saved successfully.');
        }}
      />

      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-400">
        Kirana Mitra AI • Powered by Gemini Live + NVIDIA DiffusionGemma 26B A4B IT Collaborative Architecture
      </footer>
    </div>
  );
}
