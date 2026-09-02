import React from 'react';
import { CheckCircle2, Clock, Store, Home } from 'lucide-react';
import clsx from 'clsx';

/**
 * OrderStatusTracker
 * Sleek, compact, premium tri-color order status animation component.
 * Palette: Emerald Green (#059669), Slate (#0f172a / #334155), Pure White.
 */
export default function OrderStatusTracker({ order }) {
  if (!order) return null;

  const rawStatus = (order.status || 'pending').toLowerCase();
  const address = order.deliveryAddress || 'Your Address';

  // Active step index (0: Confirmed, 1: Packing, 2: Out for Delivery, 3: Delivered)
  let activeStep = 0;
  if (rawStatus === 'delivered') {
    activeStep = 3;
  } else if (rawStatus === 'out_for_delivery') {
    activeStep = 2;
  } else if (rawStatus === 'packing' || rawStatus === 'ready' || rawStatus === 'processing') {
    activeStep = 1;
  } else {
    activeStep = 0;
  }

  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'returned';

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-2.5 select-none">
      {/* 1. Sleek Status Stage (Tri-Color: Emerald, Slate, White) */}
      {!isCancelled ? (
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-lg p-2.5 relative overflow-hidden">
          {rawStatus === 'out_for_delivery' && (
            <div className="space-y-1.5">
              {/* Header Status Bar */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
                  </span>
                  Live Delivery Tracking Active
                </span>
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  Driver en route
                </span>
              </div>

              {/* Compact Two-Point Road Track */}
              <div className="relative py-2.5 px-1 my-0.5">
                {/* Road Line Base */}
                <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1.5 bg-slate-200 rounded-full overflow-hidden flex items-center">
                  <div className="w-full h-0.5 animate-road-dash" />
                </div>

                {/* Traveling Delivery Vehicle */}
                <div className="absolute top-1/2 -translate-y-1/2 animate-delivery-travel z-20 pointer-events-none">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white shadow-md border-2 border-white flex items-center justify-center text-xs">
                    🛵
                  </div>
                </div>

                {/* Point 1 (Store Hub) & Point 2 (Customer Destination) */}
                <div className="relative flex items-center justify-between z-10">
                  {/* Point 1: Store */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 shadow-2xs flex items-center justify-center">
                      <Store size={15} />
                    </div>
                    <span className="font-bold text-[10px] text-slate-800 mt-1 leading-tight">
                      Store Hub
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                      Dispatched
                    </span>
                  </div>

                  {/* Point 2: Destination */}
                  <div className="flex flex-col items-center max-w-[50%] text-center">
                    <div className="relative">
                      <span className="absolute -inset-0.5 rounded-lg bg-emerald-500/25 animate-pin-ripple pointer-events-none" />
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-2xs flex items-center justify-center relative z-10">
                        <Home size={15} />
                      </div>
                    </div>
                    <span className="font-bold text-[10px] text-slate-800 mt-1 truncate max-w-full" title={address}>
                      {address}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-semibold">
                      Destination
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 text-center leading-snug">
                🛵 <span className="font-bold text-slate-800">Out for delivery!</span> Partner heading to <b>{address}</b>.
              </p>
            </div>
          )}

          {rawStatus === 'packing' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Staff Packing Order
                </span>
                <span className="text-[10px] font-semibold text-slate-500">Quality Checking</span>
              </div>

              <div className="py-2 flex items-center justify-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute text-sm animate-item-hop-1 pointer-events-none">🥦</span>
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white shadow-xs flex items-center justify-center text-base animate-box-bounce">
                    📦
                  </div>
                </div>
                <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full animate-pulse w-3/4" />
                </div>
              </div>

              <p className="text-[11px] text-slate-600 text-center leading-snug">
                📦 <span className="font-bold text-slate-800">Packing in progress!</span> Items inspected and boxed fresh.
              </p>
            </div>
          )}

          {(rawStatus === 'confirmed' || rawStatus === 'pending') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 size={11} /> Order Received & Confirmed
                </span>
                <span className="text-[10px] font-semibold text-slate-500">Queued</span>
              </div>

              <div className="py-1.5 flex items-center justify-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white shadow-xs flex items-center justify-center text-sm animate-pulse-ring">
                  <span className="animate-bell-ring">🔔</span>
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-800">
                    Order #{order.orderNumber} Verified
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Accepted by store. Packing starts momentarily.
                  </p>
                </div>
              </div>
            </div>
          )}

          {rawStatus === 'ready' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Packed & Ready
                </span>
                <span className="text-[10px] font-semibold text-slate-500">Ready for Handover</span>
              </div>

              <div className="py-1.5 flex items-center justify-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-xs flex items-center justify-center text-sm animate-box-bounce">
                  🛍️
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-800">Bags Sealed & Tagged</p>
                  <p className="text-[10px] text-slate-500">Ready at dispatch counter for courier pickup.</p>
                </div>
              </div>
            </div>
          )}

          {rawStatus === 'delivered' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 size={11} /> Delivered Successfully
                </span>
                <span className="text-xs">🎉</span>
              </div>

              <div className="py-1 flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white shadow-xs flex items-center justify-center text-xs">
                  ✓
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  Handed over at <b>{address}</b>. Thank you for shopping with us!
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-[11px] text-slate-600 font-medium">
          This order was cancelled or returned.
        </div>
      )}

      {/* 2. Compact 4-Step Progress Ribbon (Sleek Tri-Color) */}
      <div className="pt-1.5 border-t border-slate-100">
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { label: 'Confirmed', icon: '🧾', stepIdx: 0 },
            { label: 'Packing', icon: '📦', stepIdx: 1 },
            { label: 'On Way', icon: '🛵', stepIdx: 2 },
            { label: 'Delivered', icon: '🏠', stepIdx: 3 },
          ].map((s) => {
            const isDone = activeStep > s.stepIdx;
            const isCurrent = activeStep === s.stepIdx && !isCancelled;

            return (
              <div key={s.stepIdx} className="flex flex-col items-center">
                <div
                  className={clsx(
                    'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all mb-0.5',
                    isCurrent
                      ? 'bg-slate-900 text-white ring-2 ring-slate-200 shadow-2xs scale-105'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  )}
                >
                  {isDone ? <CheckCircle2 size={12} /> : s.icon}
                </div>
                <span
                  className={clsx(
                    'text-[9px] font-semibold tracking-tight',
                    isCurrent ? 'text-slate-900 font-bold' : isDone ? 'text-emerald-700' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
