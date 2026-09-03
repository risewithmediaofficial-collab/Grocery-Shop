import React from 'react';
import {
  CheckCircle2, Clock, Store, Home, Truck, Package,
  Bell, ShoppingBag, ReceiptText, ShieldCheck, Navigation
} from 'lucide-react';
import clsx from 'clsx';

/**
 * OrderStatusTracker
 * Rapido-style live delivery journey and animated tracking component.
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3.5 select-none">
      {!isCancelled ? (
        <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50/80 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 relative overflow-hidden space-y-2.5">
          {/* Top Status & Live Badge */}
          <div className="flex items-center justify-between gap-2">
            {rawStatus === 'out_for_delivery' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  Live Delivery Tracking Active
                </span>
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  <Clock size={12} className="text-emerald-600" />
                  Driver en route
                </span>
              </>
            )}

            {rawStatus === 'packing' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Staff Packing Order
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Quality Checking
                </span>
              </>
            )}

            {(rawStatus === 'confirmed' || rawStatus === 'pending') && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Order Received & Confirmed
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Queued
                </span>
              </>
            )}

            {rawStatus === 'ready' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  Packed & Ready
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Ready for Handover
                </span>
              </>
            )}

            {rawStatus === 'delivered' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Delivered Successfully
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  Arrived at destination
                </span>
              </>
            )}
          </div>

          {/* Rapido-Style Visual Route Corridor / Live Map Track */}
          <div className="relative py-4 px-1 my-1">
            {/* Road Base Track */}
            <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-2 bg-slate-200/90 rounded-full overflow-hidden flex items-center shadow-inner">
              {rawStatus === 'delivered' ? (
                <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />
              ) : (
                <div className="w-full h-1 animate-road-dash" />
              )}
            </div>

            {/* Glowing Active Trail for Out for Delivery */}
            {rawStatus === 'out_for_delivery' && (
              <div className="absolute top-1/2 left-8 -translate-y-1/2 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full animate-delivery-trail z-10 pointer-events-none shadow-sm" />
            )}

            {/* Traveling Vehicle (Rapido Style Bike / Courier) */}
            {rawStatus === 'out_for_delivery' && (
              <div className="absolute top-1/2 -translate-y-1/2 animate-delivery-travel z-20 pointer-events-none">
                <div className="relative flex items-center justify-center">
                  {/* Radar Ripple */}
                  <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400/45 opacity-80" />
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white shadow-md border-2 border-emerald-400 flex items-center justify-center relative z-10">
                    <Truck size={15} className="text-emerald-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Two Points: Store Hub (Pickup) & Customer Home (Drop) */}
            <div className="relative flex items-center justify-between z-10">
              {/* Point 1: Store Hub */}
              <div className="flex flex-col items-center">
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs transition-all',
                  activeStep >= 1 || rawStatus === 'out_for_delivery' || rawStatus === 'delivered'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-700'
                )}>
                  <Store size={17} />
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] text-slate-800 mt-1 leading-tight">
                  Store Hub
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  {rawStatus === 'delivered' ? 'Dispatched' : activeStep >= 2 ? 'Dispatched' : 'Preparing'}
                </span>
              </div>

              {/* Center status badge for non-out-for-delivery states */}
              {rawStatus === 'packing' && (
                <div className="flex items-center gap-1.5 bg-amber-50/95 border border-amber-200 px-3 py-1 rounded-full shadow-2xs animate-box-bounce">
                  <Package size={14} className="text-amber-700" />
                  <span className="text-[10px] font-bold text-amber-900">Packaging Items Fresh</span>
                </div>
              )}

              {(rawStatus === 'confirmed' || rawStatus === 'pending') && (
                <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-300 px-3 py-1 rounded-full shadow-2xs">
                  <Bell size={13} className="text-slate-700" />
                  <span className="text-[10px] font-bold text-slate-800">Order #{order.orderNumber} Verified</span>
                </div>
              )}

              {/* Point 2: Destination */}
              <div className="flex flex-col items-center max-w-[45%] text-center">
                <div className="relative">
                  {rawStatus === 'out_for_delivery' && (
                    <span className="absolute -inset-1 rounded-xl bg-emerald-500/30 animate-pin-ripple pointer-events-none" />
                  )}
                  {rawStatus === 'delivered' && (
                    <span className="absolute -inset-1 rounded-xl bg-emerald-500/40 animate-pulse pointer-events-none" />
                  )}
                  <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs transition-all relative z-10',
                    rawStatus === 'delivered'
                      ? 'bg-emerald-600 border-emerald-700 text-white'
                      : rawStatus === 'out_for_delivery'
                      ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-emerald-400'
                      : 'bg-white border-slate-300 text-slate-500'
                  )}>
                    <Home size={17} />
                  </div>
                  {rawStatus === 'delivered' && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center z-20 shadow-xs">
                      <CheckCircle2 size={11} />
                    </div>
                  )}
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] text-slate-800 mt-1 truncate max-w-full" title={address}>
                  {address}
                </span>
                <span className={clsx(
                  'text-[9px] font-semibold',
                  rawStatus === 'delivered' ? 'text-emerald-700' : 'text-slate-500'
                )}>
                  Destination
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Contextual Status Note */}
          <div className="pt-0.5 text-center">
            {rawStatus === 'out_for_delivery' && (
              <p className="text-[11px] text-slate-600 leading-snug flex items-center justify-center gap-1.5">
                <Truck size={13} className="text-emerald-600 shrink-0" />
                <span><span className="font-bold text-slate-800">Out for delivery!</span> Partner heading to <b>{address}</b>.</span>
              </p>
            )}

            {rawStatus === 'packing' && (
              <p className="text-[11px] text-slate-600 leading-snug flex items-center justify-center gap-1.5">
                <Package size={13} className="text-amber-600 shrink-0" />
                <span><span className="font-bold text-slate-800">Packing in progress!</span> Items inspected and boxed fresh.</span>
              </p>
            )}

            {(rawStatus === 'confirmed' || rawStatus === 'pending') && (
              <p className="text-[11px] text-slate-600 leading-snug flex items-center justify-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Accepted by store. Packing starts momentarily.</span>
              </p>
            )}

            {rawStatus === 'ready' && (
              <p className="text-[11px] text-slate-600 leading-snug flex items-center justify-center gap-1.5">
                <ShoppingBag size={13} className="text-blue-600 shrink-0" />
                <span>Bags sealed & tagged. Ready at dispatch counter for courier pickup.</span>
              </p>
            )}

            {rawStatus === 'delivered' && (
              <p className="text-[11px] text-slate-700 font-medium leading-snug flex items-center justify-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Handed over at <b>{address}</b>. Thank you for shopping with us!</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700 font-semibold">
          This order was cancelled or returned.
        </div>
      )}

      {/* Connected 4-Step Stepper Ribbon (Simple & Great Flow) */}
      <div className="pt-2 border-t border-slate-100 relative">
        {/* Continuous Step Connector Track */}
        <div className="absolute top-[21px] left-8 right-8 h-0.5 bg-slate-200 -z-0">
          <div
            className="h-full bg-emerald-600 transition-all duration-500"
            style={{
              width: activeStep === 0 ? '0%' : activeStep === 1 ? '33%' : activeStep === 2 ? '66%' : '100%'
            }}
          />
        </div>

        <div className="grid grid-cols-4 gap-1 text-center relative z-10">
          {[
            { label: 'Confirmed', Icon: ReceiptText, stepIdx: 0 },
            { label: 'Packing', Icon: Package, stepIdx: 1 },
            { label: 'On Way', Icon: Truck, stepIdx: 2 },
            { label: 'Delivered', Icon: Home, stepIdx: 3 },
          ].map((s) => {
            const isDone = activeStep > s.stepIdx;
            const isCurrent = activeStep === s.stepIdx && !isCancelled;
            const StepIcon = s.Icon;

            return (
              <div key={s.stepIdx} className="flex flex-col items-center">
                <div
                  className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all mb-1',
                    isCurrent
                      ? 'bg-slate-900 text-white ring-2 ring-emerald-400 ring-offset-2 shadow-sm scale-110'
                      : isDone
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-400 border border-slate-300 shadow-2xs'
                  )}
                >
                  {isDone ? <CheckCircle2 size={14} /> : <StepIcon size={13} />}
                </div>
                <span
                  className={clsx(
                    'text-[10px] font-semibold tracking-tight',
                    isCurrent ? 'text-slate-900 font-extrabold' : isDone ? 'text-emerald-700 font-bold' : 'text-slate-400'
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
