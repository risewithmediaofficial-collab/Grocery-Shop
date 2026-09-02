import React, { useState } from 'react';
import { X, Plus, Minus, Check, Package, Sparkles, AlertCircle } from 'lucide-react';
import { getProductVariantConfig } from '../../utils/groceryVariants';

export default function QuantityPackagingModal({ product, existingCartItem, onConfirm, onClose }) {
  if (!product) return null;

  const cfg = getProductVariantConfig(product);
  const baseRate = Number(product.sellingPrice || 0);

  // Commodity Loose State - Pre-populate if already in cart
  const initialLooseMode = existingCartItem?.packDetails?.mode || 'kg';
  const [looseMode, setLooseMode] = useState(initialLooseMode); // 'kg' or 'bag'
  const [looseKgQty, setLooseKgQty] = useState(
    initialLooseMode === 'kg' && existingCartItem?.quantity
      ? String(existingCartItem.quantity)
      : '1'
  );
  const [selectedBag, setSelectedBag] = useState(() => {
    if (initialLooseMode === 'bag' && existingCartItem) {
      const foundBag = cfg.bagOptions?.find(b => b.label === existingCartItem.packDetails?.optionLabel || b.id === existingCartItem.packDetails?.optionLabel);
      if (foundBag) return foundBag.id;
    }
    return cfg.bagOptions?.[0]?.id || 'bag_25';
  });
  const [bagCountQty, setBagCountQty] = useState(
    initialLooseMode === 'bag' && existingCartItem?.quantity
      ? String(existingCartItem.quantity)
      : '1'
  );

  // Packaged Options State (Liquid, Masala, Snack, General) - Pre-populate if already in cart
  const [selectedOptId, setSelectedOptId] = useState(() => {
    if (existingCartItem?.packDetails?.optionLabel) {
      const foundOpt = cfg.options?.find(o => o.label === existingCartItem.packDetails.optionLabel || o.id === existingCartItem.packDetails.optionLabel);
      if (foundOpt) return foundOpt.id;
    }
    return cfg.selectedOption?.id || cfg.options?.[0]?.id || '';
  });
  const [packQty, setPackQty] = useState(
    existingCartItem?.quantity ? String(existingCartItem.quantity) : '1'
  );

  // Current selected option object
  const currentPackOption = cfg.options?.find(o => o.id === selectedOptId) || cfg.options?.[0];
  const currentBagOption = cfg.bagOptions?.find(b => b.id === selectedBag) || cfg.bagOptions?.[0];

  // Calculate live item price and quantity
  let computedQty = 1;
  let computedRate = baseRate;
  let computedItemName = product.name;
  let computedUnit = product.unit?.symbol || 'unit';
  let computedSubtext = '';

  if (cfg.type === 'commodity_loose') {
    if (looseMode === 'kg') {
      const val = Math.max(0.1, parseFloat(looseKgQty) || 1);
      computedQty = val;
      computedRate = baseRate;
      computedUnit = 'kg';
      computedItemName = product.name;
      computedSubtext = `Loose weight (${val} kg @ ₹${baseRate}/kg)`;
    } else {
      const bags = Math.max(1, parseInt(bagCountQty, 10) || 1);
      computedQty = bags;
      computedRate = currentBagOption?.price || (baseRate * 25);
      computedUnit = 'bag';
      computedItemName = `${product.name} (${currentBagOption?.label || 'Bag'})`;
      computedSubtext = `${bags} × ${currentBagOption?.label || 'Bag'} (@ ₹${currentBagOption?.ratePerKg || baseRate}/kg)`;
    }
  } else {
    const packs = Math.max(1, parseInt(packQty, 10) || 1);
    computedQty = packs;
    computedRate = currentPackOption?.price || baseRate;
    computedUnit = currentPackOption?.unitDescription || 'pack';
    computedItemName = currentPackOption?.label
      ? `${product.name} (${currentPackOption.label})`
      : product.name;
    computedSubtext = `${packs} × ${currentPackOption?.label || 'Pack'} (@ ₹${computedRate} each)`;
  }

  const computedTotal = Math.round(computedRate * computedQty);

  const handleConfirm = () => {
    onConfirm({
      product,
      name: computedItemName,
      sellingPrice: computedRate,
      quantity: computedQty,
      unit: computedUnit,
      packDetails: {
        mode: looseMode,
        variantType: cfg.type,
        optionLabel: cfg.type === 'commodity_loose' ? (looseMode === 'kg' ? `${computedQty} kg` : currentBagOption?.label) : currentPackOption?.label,
      },
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 text-white flex items-center justify-between ${existingCartItem ? 'bg-gradient-to-r from-amber-600 to-amber-700' : 'bg-gradient-to-r from-primary-600 to-primary-700'}`}>
          <div className="min-w-0 pr-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              {existingCartItem ? '✏️ Modify Product in Cart' : 'Select Packaging & Quantity'}
            </span>
            <h3 className="font-extrabold text-base sm:text-lg truncate">{product.name}</h3>
            <p className="text-xs text-white/80">Base Price: ₹{baseRate} / {product.unit?.symbol || 'unit'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Already In Cart Alert Banner */}
          {existingCartItem && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in">
              <span className="text-base shrink-0">⚠️</span>
              <div className="min-w-0">
                <p className="font-black text-amber-950">Already in your cart!</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                  Currently added as <span className="font-bold text-amber-950">{existingCartItem.name} ({existingCartItem.quantity} {existingCartItem.unit})</span>. Modify the quantity or pack below to update it.
                </p>
              </div>
            </div>
          )}
          {/* 1. Commodity Loose (Rice, Sugar, Atta, Dals) */}
          {cfg.type === 'commodity_loose' && (
            <div className="space-y-3.5">
              {/* Mode Switcher: Active mode is active, the other is blocked/hidden */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => setLooseMode('kg')}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    looseMode === 'kg'
                      ? 'bg-primary-600 text-white shadow-xs scale-101'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <span>🍚 Loose by Weight (KG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLooseMode('bag')}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    looseMode === 'bag'
                      ? 'bg-emerald-600 text-white shadow-xs scale-101'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <span>📦 Whole Bags</span>
                </button>
              </div>

              {/* KG Option Fields */}
              {looseMode === 'kg' ? (
                <div className="p-3.5 bg-primary-50/50 border border-primary-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">
                      Enter Loose Weight in Kilograms:
                    </label>
                    <span className="text-xs font-bold text-primary-700">₹{baseRate} / kg</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLooseKgQty(prev => String(Math.max(0.25, (parseFloat(prev) || 1) - 1)))}
                      className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center font-bold text-gray-700 cursor-pointer shadow-2xs"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="1"
                        value={looseKgQty}
                        onChange={e => setLooseKgQty(e.target.value)}
                        className="form-input text-center font-black text-lg py-2 rounded-xl border-primary-300 focus:border-primary-500 pr-9 placeholder:text-gray-300 placeholder:font-normal placeholder:opacity-60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KG</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLooseKgQty(prev => String((parseFloat(prev) || 0) + 1))}
                      className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold cursor-pointer shadow-2xs"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Quick KG chips */}
                  <div className="flex gap-1.5 overflow-x-auto pt-1">
                    {[0.5, 1, 2, 5, 10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLooseKgQty(String(val))}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shrink-0 ${
                          parseFloat(looseKgQty) === val
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {val} kg
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Bag Options */
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-800 block">
                    Select Bag Size:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {cfg.bagOptions?.map(bag => (
                      <button
                        key={bag.id}
                        type="button"
                        onClick={() => setSelectedBag(bag.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedBag === bag.id
                            ? 'border-primary-500 bg-primary-50 shadow-2xs ring-1 ring-primary-500'
                            : 'border-gray-200 bg-gray-50/50 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900">{bag.label}</span>
                          {selectedBag === bag.id && <Check size={14} className="text-primary-600" />}
                        </div>
                        <p className="text-sm font-extrabold text-primary-700 mt-1">₹{bag.price}</p>
                        <p className="text-[10px] text-gray-400">₹{bag.ratePerKg}/kg</p>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Number of Bags:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBagCountQty(prev => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700 cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={bagCountQty}
                        onChange={e => setBagCountQty(e.target.value)}
                        className="w-12 text-center font-black text-sm py-1 rounded-lg border border-gray-300 placeholder:text-gray-300 placeholder:font-normal placeholder:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setBagCountQty(prev => String((parseInt(prev, 10) || 0) + 1))}
                        className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Packaged Options (Water bottles, Oils, Spices, Biscuits, General FMCG) */}
          {cfg.type !== 'commodity_loose' && (
            <div className="space-y-3.5">
              <label className="text-xs font-bold text-gray-800 block">
                {cfg.type === 'packaged_liquid' && 'Select Bottle / Pack Size:'}
                {cfg.type === 'packaged_masala' && 'Select Packet Size:'}
                {cfg.type === 'packaged_snack_price' && 'Select Retail Price Pack:'}
                {cfg.type === 'packaged_general' && 'Select Packaging Option:'}
              </label>

              <div className="grid grid-cols-2 gap-2">
                {cfg.options?.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptId(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedOptId === opt.id
                        ? 'border-primary-500 bg-primary-50 shadow-2xs ring-1 ring-primary-500'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{opt.label}</span>
                      {selectedOptId === opt.id && <Check size={14} className="text-primary-600" />}
                    </div>
                    <p className="text-sm font-extrabold text-primary-700 mt-1">₹{opt.price}</p>
                    {opt.unitDescription && (
                      <p className="text-[10px] text-gray-400">{opt.unitDescription}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Quantity Stepper */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Quantity (Units / Packs):</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPackQty(prev => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700 cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={packQty}
                    onChange={e => setPackQty(e.target.value)}
                    className="w-12 text-center font-black text-sm py-1 rounded-lg border border-gray-300 placeholder:text-gray-300 placeholder:font-normal placeholder:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setPackQty(prev => String((parseInt(prev, 10) || 0) + 1))}
                    className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Preview Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-950">{computedItemName}</p>
              <p className="text-[11px] text-emerald-700">{computedSubtext}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Amount</span>
              <span className="text-lg font-black text-emerald-800">₹{computedTotal}</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2.5 px-4 text-xs font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`py-2.5 px-5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs text-white ${existingCartItem ? 'bg-amber-600 hover:bg-amber-700' : 'btn-primary'}`}
          >
            {existingCartItem ? <Check size={15} /> : <Plus size={15} />}
            <span>{existingCartItem ? `Update Cart (₹${computedTotal})` : `Add to Cart (₹${computedTotal})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
