'use client';

import { useState, useRef } from 'react';

interface SlideToConfirmProps {
  label: string;
  onSlideComplete: () => void;
  disabled?: boolean;
  isBusy?: boolean;
  resetKey?: string | number;
}

export default function SlideToConfirm({
  label,
  onSlideComplete,
  disabled = false,
  isBusy = false,
  resetKey,
}: SlideToConfirmProps) {
  const [progress, setProgress] = useState(0); // 0.0 to 1.0
  const [isDragging, setIsDragging] = useState(false);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  const [prevDisabled, setPrevDisabled] = useState(disabled);

  // Adjust state during render when resetKey or disabled changes (React recommended pattern)
  if (resetKey !== prevResetKey || disabled !== prevDisabled) {
    setPrevResetKey(resetKey);
    setPrevDisabled(disabled);
    setProgress(0);
    setIsDragging(false);
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number>(0);
  const startProgress = useRef<number>(0);
  const isPointerDown = useRef<boolean>(false);

  const getTrackMaxDistance = () => {
    if (!containerRef.current || !handleRef.current) return 0;
    const containerWidth = containerRef.current.clientWidth;
    const handleWidth = handleRef.current.clientWidth;
    return Math.max(containerWidth - handleWidth - 8, 0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isBusy) return;
    isPointerDown.current = true;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    startProgress.current = progress;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if setPointerCapture is unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current || disabled || isBusy) return;

    const maxDist = getTrackMaxDistance();
    if (maxDist <= 0) return;

    const deltaX = e.clientX - dragStartX.current;
    const addedProgress = deltaX / maxDist;
    const nextProgress = Math.min(
      Math.max(startProgress.current + addedProgress, 0),
      1
    );

    setProgress(nextProgress);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore pointer release errors
    }

    // If slid past 85% threshold, snap to 100% and trigger confirmation callback
    if (progress >= 0.85) {
      setProgress(1);
      onSlideComplete();
    } else {
      // Snap back smoothly to start
      setProgress(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isBusy) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(progress + 0.25, 1);
      setProgress(next);
      if (next >= 0.85) {
        setProgress(1);
        onSlideComplete();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setProgress(Math.max(progress - 0.25, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setProgress(1);
      onSlideComplete();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setProgress(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setProgress(1);
      onSlideComplete();
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={disabled || isBusy ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`relative w-full h-12 select-none touch-none rounded-xl p-1 border transition-colors flex items-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] focus-visible:ring-offset-2 ${
        disabled
          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
          : 'bg-slate-100/90 hover:bg-slate-100 border-slate-200/90 shadow-inner-xs'
      }`}
    >
      {/* Progress Track Fill */}
      <div
        className={`absolute inset-y-0 left-0 bg-sky-100/90 border-r border-[#006194]/20 rounded-lg pointer-events-none ${
          isDragging ? 'transition-none' : 'transition-all duration-200 ease-out'
        }`}
        style={{
          width: `calc(${progress * 100}% + ${progress * 10}px)`,
        }}
      />

      {/* Instructional Label Text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-xs sm:text-sm font-bold text-slate-600 transition-opacity"
        style={{
          opacity: Math.max(1 - progress * 1.5, 0.15),
        }}
      >
        <span className="truncate tracking-wide">{label}</span>
      </div>

      {/* Draggable Handle Thumb */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative z-10 w-10 h-10 rounded-lg bg-[#006194] text-white flex items-center justify-center shadow-sm select-none cursor-grab active:cursor-grabbing hover:bg-[#004e77] active:scale-[0.98] ${
          isDragging ? 'transition-none' : 'transition-all duration-200 ease-out'
        } ${disabled || isBusy ? 'cursor-not-allowed opacity-80' : ''}`}
        style={{
          left: `${progress * 100}%`,
          transform: `translateX(-${progress * 100}%)`,
        }}
      >
        {isBusy ? (
          <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-white transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.25"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
