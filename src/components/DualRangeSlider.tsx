import React, { useEffect, useState, useRef } from 'react';
interface DualRangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  gradient?: string;
  label: string;
  formatValue?: (value: number) => string;
}
export function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  gradient,
  label,
  formatValue = v => v.toString()
}: DualRangeSliderProps) {
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
      onChange(Math.min(value, valueMax - 1), valueMax);
    } else {
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
        {/* Track with gradient background */}
        <div ref={trackRef} className="relative h-1.5 rounded-lg cursor-crosshair" style={{
        background: gradient || '#64748b'
      }}>
          {/* Selected range overlay */}
          <div className="absolute h-full bg-white/20 rounded-lg pointer-events-none" style={{
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`
        }} />
        </div>

        {/* Thumb handles */}
        <div className="relative h-4 -mt-1">
          {/* Min thumb */}
          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize group" style={{
          left: `${minPercent}%`
        }} onMouseDown={handleMouseDown('min')}>
            <div className="w-3 h-3 rounded-none bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg transition-transform group-hover:scale-110" />
          </div>

          {/* Max thumb */}
          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize group" style={{
          left: `${maxPercent}%`
        }} onMouseDown={handleMouseDown('max')}>
            <div className="w-3 h-3 rounded-none bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg transition-transform group-hover:scale-110" />
          </div>
        </div>
      </div>
    </div>;
}