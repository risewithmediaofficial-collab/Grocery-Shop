import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Package, Users, Truck, DollarSign,
  BarChart2, Settings, ExternalLink, ArrowRight, Sparkles, Tag
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const actions = useMemo(() => [
    { id: 'pos', title: 'Open POS Counter', category: 'Fast Billing', path: '/pos', icon: ShoppingCart, hotkey: 'Alt+P' },
    { id: 'orders', title: 'View Customer Online Orders', category: 'Orders', path: '/orders', icon: Truck, hotkey: 'Alt+O' },
    { id: 'products', title: 'Product Catalog & Pricing', category: 'Catalog', path: '/products', icon: Package },
    { id: 'customers', title: 'Customer Ledger & Udhaar', category: 'Customers', path: '/customers', icon: Users },
    { id: 'inventory', title: 'Stock & Batches', category: 'Inventory', path: '/inventory', icon: Tag },
    { id: 'sales', title: 'Sales History & Invoices', category: 'Billing', path: '/sales', icon: DollarSign },
    { id: 'expenses', title: 'Daily Expenses & Register', category: 'Accounting', path: '/expenses', icon: DollarSign },
    { id: 'reports', title: 'Business Analytics & Reports', category: 'Reports', path: '/reports', icon: BarChart2 },
    { id: 'settings', title: 'Store Settings & WhatsApp', category: 'System', path: '/settings', icon: Settings },
    { id: 'customer_store', title: 'Open Public Customer Storefront', category: 'Customer Store', path: '/order', external: true, icon: ExternalLink }
  ], []);

  const filtered = useMemo(() => actions.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  ), [actions, query]);

  const handleSelect = useCallback((item) => {
    onClose();
    if (item.external) {
      window.open(item.path, '_blank');
    } else {
      navigate(item.path);
    }
  }, [onClose, navigate]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, page name, or action... (Esc to exit)"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          />
          <kbd className="px-2 py-0.5 text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No matching pages or actions found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected ? 'bg-primary-50 text-primary-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.hotkey && (
                      <kbd className="px-1.5 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
                        {item.hotkey}
                      </kbd>
                    )}
                    <ArrowRight size={14} className={isSelected ? 'text-primary-600' : 'text-slate-300'} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-medium text-emerald-600 flex items-center gap-1">
            <Sparkles size={12} /> New Columbu Stores
          </span>
        </div>
      </div>
    </div>
  );
}
