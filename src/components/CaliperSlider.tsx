import React, { useEffect, useState, useRef } from 'react';
interface CaliperSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  gradient?: string;
  label: string;
  formatValue?: (value: number) => string;
}
export function CaliperSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  gradient,
  label,
  formatValue = v => v.toString()
}: CaliperSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
  const handleMouseDown = (thumb: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(thumb);
  };
  const updateValue = (clientX: number) => {
    if (!trackRef.current || !dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const value = Math.round(min + percent * (max - min));
    if (dragging === 'min') {
      // Prevent overlap - min can't go past max - 1
      onChange(Math.min(value, valueMax - 1), valueMax);
    } else {
      // Prevent overlap - max can't go below min + 1
      onChange(valueMin, Math.max(value, valueMin + 1));
    }
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX);
    };
    const handleMouseUp = () => {
      setDragging(null);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, valueMin, valueMax, min, max]);
  const minPercent = (valueMin - min) / (max - min) * 100;
  const maxPercent = (valueMax - min) / (max - min) * 100;
  return <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span>{formatValue(valueMin)}</span>
          <span className="text-slate-600">→</span>
          <span>{formatValue(valueMax)}</span>
        </div>
      </div>

      <div className="relative">
        {/* Track with gradient background and rounded caps */}
        <div ref={trackRef} className="relative h-1.5 rounded-lg cursor-crosshair overflow-hidden" style={{
        background: gradient || '#64748b'
      }} />

        {/* Thumb handles positioned on track - caliper style with rounded corners */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Left handle (min) - anchored on RIGHT side, pointing left (◄) */}
          <div className="absolute top-1/2 -translate-y-1/2 pointer-events-auto -translate-x-full" style={{
          left: `${minPercent}%`
        }} onMouseDown={handleMouseDown('min')}>
            <div className="relative cursor-ew-resize group">
              {/* Left-pointing triangle (◄) - with rounded corners */}
              <svg width="10" height="16" viewBox="0 0 10 16" className="transition-transform group-hover:scale-110">
                <path d="M 10 1 L 2 8 L 10 15 Q 10 14 10 14 L 10 2 Q 10 2 10 1 Z" fill="url(#leftGradient)" className="drop-shadow-lg" />
                <defs>
                  <linearGradient id="leftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Right handle (max) - anchored on LEFT side, pointing right (►) */}
          <div className="absolute top-1/2 -translate-y-1/2 pointer-events-auto" style={{
          left: `${maxPercent}%`
        }} onMouseDown={handleMouseDown('max')}>
            <div className="relative cursor-ew-resize group">
              {/* Right-pointing triangle (►) - with rounded corners */}
              <svg width="10" height="16" viewBox="0 0 10 16" className="transition-transform group-hover:scale-110">
                <path d="M 0 1 L 8 8 L 0 15 Q 0 14 0 14 L 0 2 Q 0 2 0 1 Z" fill="url(#rightGradient)" className="drop-shadow-lg" />
                <defs>
                  <linearGradient id="rightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>;
}