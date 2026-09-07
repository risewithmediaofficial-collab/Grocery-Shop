import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Store, Home, Package,
  ReceiptText, AlertCircle, Bike
} from 'lucide-react';
import clsx from 'clsx';

// Clean Delivery Boy on Bike SVG icon
function DeliveryBoyBikeIcon({ className = "w-4 h-4 text-white" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Rear Wheel */}
      <circle cx="5.5" cy="17.5" r="2.5" />
      {/* Front Wheel */}
      <circle cx="18.5" cy="17.5" r="2.5" />
      {/* Scooter Frame */}
      <path d="M5.5 17.5h3l3.5-6.5h4.5l2 6.5" />
      {/* Handlebars */}
      <path d="M16.5 11h2.5" />
      {/* Delivery Box */}
      <rect x="2.5" y="9" width="4.5" height="5" rx="1" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.5" />
      {/* Rider Helmet */}
      <circle cx="12" cy="6" r="2" fill="currentColor" />
      {/* Rider Arm to handlebar */}
      <path d="M12 8l2.5 3" />
    </svg>
  );
}

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
    { key: 'out_for_delivery', label: 'On the Way', Icon: Bike        },
    { key: 'delivered',        label: 'Delivered',  Icon: Home        },
  ];

  let activeStep = 0;
  if (rawStatus === 'delivered') activeStep = 3;
  else if (rawStatus === 'out_for_delivery') activeStep = 2;
  else if (['packing', 'ready', 'processing'].includes(rawStatus)) activeStep = 1;

  const progressPercent = [0, 33, 66, 100][activeStep];

  const isDelivered = rawStatus === 'delivered';
  const isOutForDel = rawStatus === 'out_for_delivery';
  const isPacking   = rawStatus === 'packing' || rawStatus === 'processing';
  const isReady     = rawStatus === 'ready';

  // Realistic delivery rider progress:
  // - Out for delivery: advances slowly in real time, capped at 78% (75-80% range) while waiting for delivery
  // - NEVER rewinds/loops back!
  // - After delivered: makes full to 100%
  const getInitialProgress = () => {
    if (isDelivered) return 100;
    if (!isOutForDel) return 0;

    const outForDelLog = (order?.statusLogs || [])
      .slice()
      .reverse()
      .find(l => l.status === 'out_for_delivery');
    const startTimeStr = outForDelLog?.changedAt || (rawStatus === 'out_for_delivery' ? order?.updatedAt : null) || order?.createdAt;

    if (startTimeStr) {
      const elapsedSec = (Date.now() - new Date(startTimeStr).getTime()) / 1000;
      if (elapsedSec > 0) {
        // Realistic trip time ~12 minutes (720s) to go from 15% to 78%
        const computed = 15 + (elapsedSec / 720) * 63;
        // Cap at 78% (75-80% range) while out for delivery
        return Math.min(78, Math.max(15, Number(computed.toFixed(1))));
      }
    }
    return 20;
  };

  const [riderProgress, setRiderProgress] = useState(getInitialProgress);

  useEffect(() => {
    if (isDelivered) {
      setRiderProgress(100);
      return;
    }
    if (!isOutForDel) return;

    // Ensure progress does not rewind
    setRiderProgress(prev => {
      const init = getInitialProgress();
      return Math.min(78, Math.max(prev, init));
    });

    // Slow, realistic real-time advance (creeps forward smoothly, capped at 78%)
    // Never resets or rewinds!
    const interval = setInterval(() => {
      setRiderProgress(prev => {
        // Stop in 75-80% (78%) if delivery is running late - NEVER rewind!
        if (prev >= 78) return 78;
        return Number(Math.min(78, prev + 0.1).toFixed(2));
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isOutForDel, isDelivered, order?.status, order?.updatedAt]);

  const activeTrackPercent = isDelivered ? 100
    : isOutForDel ? riderProgress
    : isPacking || isReady ? 33
    : 0;

  // Animated dots for live statuses
  const [dots, setDots] = useState('');
  useEffect(() => {
    const isLive = ['pending','confirmed','packing','ready','out_for_delivery'].includes(rawStatus);
    if (!isLive) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [rawStatus]);

  if (!order) return null;

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
                {isOutForDel ? (
                   riderProgress >= 75
                     ? `Rider near destination (${address.split(',')[0]}) • Arriving shortly`
                     : `Live Delivery Tracking Active • Driver en route to ${address.split(',')[0]}`
                 ) :
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
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-1000 ease-out',
                    isDelivered ? 'bg-emerald-500'
                    : isOutForDel ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 delivery-shimmer'
                    : isPacking  ? 'bg-slate-400'
                    :              'bg-emerald-500'
                  )}
                  style={{ width: `${activeTrackPercent}%` }}
                />
              </div>

              {/* Delivery Boy on Bike — moving smoothly towards destination, capped at 78% until delivered, reaching 100% full when delivered */}
              {(isOutForDel || isDelivered) && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-1000 ease-out"
                  style={{ left: `${isDelivered ? 100 : riderProgress}%` }}
                >
                  <div className="relative flex items-center justify-center group">
                    {/* Pulsing radar sonar wave rings (active while en route) */}
                    {isOutForDel && (
                      <>
                        <span className="absolute -inset-2 rounded-full bg-orange-400/35 animate-ping pointer-events-none" />
                        <span className="absolute -inset-1 rounded-full bg-orange-500/20 animate-pulse pointer-events-none" />
                      </>
                    )}

                    {/* Bike & Delivery Boy Circular Badge */}
                    <div className={clsx(
                      'w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative z-10 transition-all duration-500',
                      isDelivered
                        ? 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 scale-105'
                        : 'bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 animate-rider-bounce'
                    )}>
                      <DeliveryBoyBikeIcon className="w-4 h-4 text-white" />
                    </div>

                    {/* Floating pill badge moving with rider */}
                    <div className={clsx(
                      'absolute -top-7 whitespace-nowrap text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1.5 z-30 transition-all duration-300',
                      isDelivered
                        ? 'bg-emerald-700 border border-emerald-500 shadow-emerald-900/20'
                        : riderProgress >= 75
                        ? 'bg-slate-900 border border-amber-500/60 shadow-amber-900/20'
                        : 'bg-slate-900 border border-slate-700'
                    )}>
                      {isDelivered ? (
                        <>
                          <CheckCircle2 size={10} className="text-emerald-300 shrink-0" />
                          <span>Delivered at Doorstep</span>
                        </>
                      ) : riderProgress >= 75 ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                          <span>Arriving Soon • Near Destination</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span>Rider En Route</span>
                        </>
                      )}
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
