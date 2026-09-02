import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { SUBCATEGORY_ICONS } from '../../utils/groceryVariants';

/**
 * SubcategorySwipeBar
 * Interactive, swipeable subcategory filter bar with:
 * - Left and Right scroll navigation buttons (< and >)
 * - Desktop click-and-drag mouse swipe
 * - Native touch gesture swipe
 * - Auto-centering of selected subcategories
 * - Visual edge fade indicators when more categories exist
 */
export default function SubcategorySwipeBar({
  subCategories = [],
  selectedSubCategory = 'all',
  onSelectSubCategory,
  colorScheme = 'emerald', // 'emerald' | 'primary'
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const hasMovedRef = useRef(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [subCategories, checkScroll]);

  // Scroll with buttons
  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = direction === 'left' ? -220 : 220;
    scrollRef.current.scrollBy({ left: distance, behavior: 'smooth' });
    setTimeout(checkScroll, 250);
  };

  // Mouse Drag / Swipe Handlers
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftPos(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleSelect = (sub, e) => {
    if (hasMovedRef.current) {
      // It was a drag swipe, prevent accidental select
      e?.preventDefault?.();
      return;
    }
    onSelectSubCategory(sub);
    // Smoothly center the clicked subcategory in the bar
    e?.currentTarget?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  if (!subCategories || subCategories.length <= 1) return null;

  return (
    <div className="relative group/swipe py-1 select-none">
      {/* Label and Swipe Tip */}
      <div className="flex items-center justify-between px-0.5 mb-1 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span>Subcategories:</span>
          <span className="text-[10px] font-bold text-gray-400 normal-case tracking-normal">
            ({subCategories.length - 1} available)
          </span>
        </span>
        <span className="text-[10px] font-bold text-gray-400 normal-case tracking-normal hidden sm:inline-flex items-center gap-1">
          <span>👈 Swipe or click arrows 👉</span>
        </span>
      </div>

      <div className="relative flex items-center">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="absolute -left-1 sm:-left-2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-gray-700 shadow-md border border-gray-200 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
            title="Swipe left"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Left Edge Gradient Blur */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
        )}

        {/* Scrollable & Swipeable Subcategory Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={clsx(
            'flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 scroll-smooth scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 w-full',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          style={{ scrollbarWidth: 'thin' }}
        >
          {subCategories.map(sub => {
            const isSelected = selectedSubCategory.toLowerCase() === sub.toLowerCase();
            const icon = SUBCATEGORY_ICONS[sub.toLowerCase()] || '🏷️';
            const label = sub === 'all' ? 'All Subcategories' : sub;

            return (
              <button
                key={sub}
                type="button"
                onClick={(e) => handleSelect(sub, e)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border select-none',
                  isSelected
                    ? colorScheme === 'emerald'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102 ring-2 ring-emerald-200'
                      : 'bg-primary-600 text-white border-primary-600 shadow-xs scale-102 ring-2 ring-primary-200'
                    : colorScheme === 'emerald'
                    ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                )}
              >
                <span className="text-sm shrink-0">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Edge Gradient Blur */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="absolute -right-1 sm:-right-2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-gray-700 shadow-md border border-gray-200 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
            title="Swipe right"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
