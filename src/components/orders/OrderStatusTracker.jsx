import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Store, Home, Truck, Package,
  ReceiptText, AlertCircle, Navigation2
} from 'lucide-react';
import clsx from 'clsx';

/**
 * OrderStatusTracker — Clean, professional delivery tracking component.
 * Inspired by Swiggy/Zomato minimal production UI — monochrome + single accent.
 */
export default function OrderStatusTracker({ order }) {
  const rawStatus = ((order?.status) || 'pending').toLowerCase();
  const address = order?.deliveryAddress || 'Your Address';
  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'returned';

  const STEPS = [
    { key: 'confirmed',        label: 'Confirmed',  Icon: ReceiptText },
    { key: 'packing',          label: 'Packing',    Icon: Package     },
    { key: 'out_for_delivery', label: 'On the Way', Icon: Truck       },
    { key: 'delivered',        label: 'Delivered',  Icon: Home        },
  ];

  let activeStep = 0;
  if (rawStatus === 'delivered') activeStep = 3;
  else if (rawStatus === 'out_for_delivery') activeStep = 2;
  else if (['packing', 'ready', 'processing'].includes(rawStatus)) activeStep = 1;

  const progressPercent = [0, 33, 66, 100][activeStep];

  // Animated dots for live statuses
  const [dots, setDots] = useState('');
  useEffect(() => {
    const isLive = ['pending','confirmed','packing','ready','out_for_delivery'].includes(rawStatus);
    if (!isLive) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [rawStatus]);

  if (!order) return null;

  const isDelivered     = rawStatus === 'delivered';
  const isOutForDel     = rawStatus === 'out_for_delivery';
  const isPacking       = rawStatus === 'packing' || rawStatus === 'processing';
  const isReady         = rawStatus === 'ready';

  // Accent: emerald when done/confirmed, orange when actively moving
  const accentClass = isDelivered ? 'bg-emerald-500'
    : isOutForDel                 ? 'bg-orange-500'
    : isPacking || isReady        ? 'bg-orange-400'
    :                               'bg-emerald-500';

  const statusLabel = {
    pending:          'Order Received & Confirmed',
    confirmed:        'Order Received & Confirmed',
    packing:          `Staff Packing Order${dots}`,
    ready:            'Ready for pickup',
    processing:       `Staff Packing Order${dots}`,
    out_for_delivery: `Out for delivery!${dots}`,
    delivered:        'Delivered Successfully',
    cancelled:        'Order Cancelled',
    returned:         'Order Returned',
  }[rawStatus] || 'Order Received & Confirmed';

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden select-none">

      {/* ── Thin colored top accent stripe ── */}
      {!isCancelled && (
        <div className={clsx('h-0.5 w-full', accentClass)} />
      )}

      {/* ── Status row ── */}
      <div className={clsx(
        'px-4 py-3 flex items-center justify-between gap-3',
        isCancelled ? 'bg-slate-50' : 'bg-white'
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {isCancelled ? (
            <AlertCircle size={15} className="text-slate-400 shrink-0" />
          ) : (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={clsx(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-60',
                isDelivered ? 'bg-emerald-400' : 'bg-orange-400'
              )} />
              <span className={clsx(
                'relative inline-flex rounded-full h-2 w-2',
                isDelivered ? 'bg-emerald-500' : 'bg-orange-500'
              )} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 leading-none truncate">
              {statusLabel}
            </p>
            {!isCancelled && (
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none truncate">
                {isOutForDel ? `Live Delivery Tracking Active • Driver en route to ${address.split(',')[0]}` :
                 isDelivered  ? `Arrived at destination (${address.split(',')[0]})` :
                 isPacking    ? 'Packing in progress! Staff Quality Checking your items' :
                 isReady      ? 'Bags sealed — awaiting courier' :
                 order?.orderNumber ? `Order #${order.orderNumber} Verified & accepted by store` :
                 'Store has received your order'}
              </p>
            )}
          </div>
        </div>

        {/* Status chip */}
        {!isCancelled && (
          <span className={clsx(
            'shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-md border tracking-wide',
            isDelivered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            isOutForDel ? 'bg-orange-50 text-orange-700 border-orange-200' :
            isPacking   ? 'bg-slate-50 text-slate-600 border-slate-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
          )}>
            {isDelivered ? 'Delivered' : isOutForDel ? 'Live' : isPacking ? 'Packing' : isReady ? 'Ready' : 'Confirmed'}
          </span>
        )}
      </div>

      {/* ── Route corridor (non-cancelled only) ── */}
      {!isCancelled && (
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="relative flex items-center justify-between">

            {/* Store node */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500',
                activeStep >= 1 || isOutForDel || isDelivered
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              )}>
                <Store size={16} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Store Hub</span>
              <span className="text-[9px] text-slate-400 -mt-1 font-medium">Dispatched</span>
            </div>

            {/* Middle track */}
            <div className="flex-1 relative mx-3 flex items-center">
              {/* Base track */}
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-1000',
                    isDelivered ? 'bg-slate-800'
                    : isOutForDel ? 'bg-orange-400 delivery-shimmer'
                    : isPacking  ? 'bg-slate-400'
                    :              'bg-emerald-500'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Rider icon — only while out for delivery */}
              {isOutForDel && (
                <div
                  className="absolute animate-rider-bounce"
                  style={{ left: `calc(${progressPercent}% - 20px)` }}
                >
                  <div className="relative">
                    <span className="absolute -inset-1.5 rounded-full bg-orange-300/30 animate-ping" />
                    <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-orange-400 flex items-center justify-center shadow-md relative z-10">
                      <Navigation2 size={12} className="text-orange-300 fill-orange-300" />
                    </div>
                  </div>
                </div>
              )}

              {/* Packing indicator */}
              {isPacking && (
                <div className="absolute left-1/3">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center animate-box-bounce">
                    <Package size={11} className="text-slate-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Home node */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all duration-500 relative',
                isDelivered
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : isOutForDel
                  ? 'bg-orange-500 border-orange-400 text-white'
                  : 'bg-white border-slate-200 text-slate-300'
              )}>
                <Home size={16} />
                {isDelivered && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 size={10} className="text-white" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 font-semibold">Destination</span>
              <span className={clsx(
                'text-[10px] font-medium text-center leading-tight max-w-[56px] truncate -mt-1',
                isDelivered ? 'text-emerald-600' : 'text-slate-400'
              )} title={address}>
                {address.split(',')[0]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4-Step progress stepper ── */}
      <div className={clsx(
        'px-4 pb-4',
        !isCancelled && 'border-t border-slate-100 pt-3'
      )}>
        {isCancelled ? (
          <div className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-200">
            <AlertCircle size={13} className="text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 font-medium">{statusLabel}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Track line */}
            <div className="absolute top-[15px] left-4 right-4 h-px bg-slate-100">
              <div
                className={clsx(
                  'h-full transition-all duration-700',
                  isDelivered ? 'bg-slate-700' : isOutForDel ? 'bg-orange-400' : 'bg-slate-400'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Steps */}
            <div className="relative z-10 grid grid-cols-4 text-center">
              {STEPS.map((step, i) => {
                const isDone    = activeStep > i;
                const isCurrent = activeStep === i;
                const StepIcon  = step.Icon;

                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5">
                    <div className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 border',
                      isDone
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : isCurrent
                        ? isOutForDel
                          ? 'bg-orange-500 border-orange-400 text-white scale-110 shadow-sm shadow-orange-200'
                          : 'bg-slate-900 border-slate-800 text-white scale-110 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-300'
                    )}>
                      {isDone
                        ? <CheckCircle2 size={13} className="text-white" />
                        : <StepIcon size={12} />
                      }
                    </div>
                    <span className={clsx(
                      'text-[10px] leading-tight font-medium',
                      isDone    ? 'text-slate-600' :
                      isCurrent ? 'text-slate-900 font-semibold' :
                                  'text-slate-300'
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
