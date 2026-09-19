import React, { useState } from 'react';
import { Plus, Minus, TrendingUp, Search, Package, Upload, Trash2 } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';

export default function InventoryGrid({
  products,
  onAdjustStock,
  onDeleteProduct,
  onUpdateProductImage,
  isLoading,
  language = 'te',
  userRole = 'customer'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [imageDrafts, setImageDrafts] = useState({});
  const t = TRANSLATIONS[language] || TRANSLATIONS.te;

  const visibleProducts = userRole === 'customer'
    ? products.filter((p) => Number(p.current_stock) > 0)
    : products;

  const categories = ['ALL', ...Array.from(new Set(visibleProducts.map(p => p.category || 'General Grocery')))]

  const filteredProducts = visibleProducts.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.telugu_name && p.telugu_name.toLowerCase().includes(q)) ||
      (p.hindi_name && p.hindi_name.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'ALL' || (p.category || 'General Grocery') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              {cat === 'ALL' ? t.filterAll : cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-stone-400 text-sm">
          Loading Kirana store inventory...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-2">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="text-base font-bold text-stone-700">No products found</h4>
          <p className="text-xs text-stone-400">Try speaking or scanning a new product with camera!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const days = product.days_of_stock_remaining;
            const isCritical = days < 3.0;
            const isLow = days >= 3.0 && days < 6.0;

            let primaryName = product.name;
            let secondaryName = '';

            if (language === 'te') {
              primaryName = product.telugu_name || product.name;
              secondaryName = product.name !== primaryName ? product.name : '';
            } else if (language === 'hi') {
              primaryName = product.hindi_name || product.name;
              secondaryName = product.name !== primaryName ? product.name : '';
            } else {
              primaryName = product.name;
              secondaryName = product.telugu_name || product.hindi_name || '';
            }

            const localizedUnit = t.units?.[product.unit] || product.unit;
            const currentImage = imageDrafts[product.id] ?? product.image_url ?? '/assets/products/unknown.png';

            return (
              <div
                key={product.id}
                className="group bg-white rounded-3xl border border-stone-200 hover:border-amber-400/80 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                <div className="relative aspect-square bg-stone-100/70 overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={currentImage}
                    alt={primaryName}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/assets/products/unknown.png';
                    }}
                  />

                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-sm ${
                      isCritical
                        ? 'bg-red-500 text-white'
                        : isLow
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {isCritical ? `⚠️ ${t.statusCritical}` : isLow ? `⚡ ${t.statusLow}` : `✓ ${t.statusHealthy}`} ({days}d)
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-3">
                    <span className="text-[10px] font-bold text-stone-600 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-stone-200">
                      {product.category || 'General'}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-tight group-hover:text-amber-700 transition-colors">
                      {primaryName}
                    </h3>
                    {secondaryName && (
                      <p className="text-xs text-amber-800/80 font-medium mt-0.5">
                        {secondaryName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">{t.daysRemaining}</span>
                      <span className="font-bold text-stone-700 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3 text-stone-400" />
                        {days} days
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">{t.sellingPrice}</span>
                      <span className="font-extrabold text-stone-900">
                        ₹{product.selling_price || product.cost_price || 50}
                      </span>
                    </div>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-2.5 flex items-center justify-between border border-stone-200/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">{t.currentStock}</span>
                      <span className="text-base font-black text-stone-900">
                        {product.current_stock} <span className="text-xs font-semibold text-stone-500">{localizedUnit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAdjustStock(product.id, -1)}
                        title="Reduce 1 unit"
                        className="w-8 h-8 rounded-xl bg-white border border-stone-200 hover:bg-red-50 hover:border-red-300 text-stone-600 hover:text-red-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAdjustStock(product.id, 1)}
                        title="Add 1 unit"
                        className="w-8 h-8 rounded-xl bg-white border border-stone-200 hover:bg-emerald-50 hover:border-emerald-300 text-stone-600 hover:text-emerald-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {userRole === 'owner' && (
                    <div className="space-y-2 border-t border-stone-200 pt-3">
                      <label className="block text-[10px] uppercase font-bold text-stone-500">Product image</label>
                      <input
                        type="text"
                        value={currentImage}
                        onChange={(e) => setImageDrafts(prev => ({ ...prev, [product.id]: e.target.value }))}
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="/assets/products/rice.png"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => onUpdateProductImage(product.id, currentImage)}
                          className="inline-flex items-center gap-1.5 flex-1 justify-center px-3 py-2 text-[11px] font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Save image
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id)}
                          className="inline-flex items-center gap-1.5 justify-center px-3 py-2 text-[11px] font-bold rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
