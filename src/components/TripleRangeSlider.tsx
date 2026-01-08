import React, { useCallback, useEffect, useState, useRef } from 'react';
interface TripleRangeSliderProps {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueAvg: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeAvg: (value: number) => void;
  onChangeMax: (value: number) => void;
  unit?: string;
}
export function TripleRangeSlider({
  min,
  max,
  step,
  valueMin,
  valueAvg,
  valueMax,
  onChangeMin,
  onChangeAvg,
  onChangeMax,
  unit = ''
}: TripleRangeSliderProps) {
  const [dragging, setDragging] = useState<'min' | 'avg' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Calculate percentages for positioning
  const minPercent = (valueMin - min) / (max - min) * 100;
  const avgPercent = (valueAvg - min) / (max - min) * 100;
  const maxPercent = (valueMax - min) / (max - min) * 100;
  const handleMouseDown = (type: 'min' | 'avg' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
    const rawValue = min + percent / 100 * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    if (dragging === 'min') {
      // Min can't exceed avg
      const newMin = Math.min(clampedValue, valueAvg);
      onChangeMin(newMin);
    } else if (dragging === 'avg') {
      // Avg must be between min and max
      const newAvg = Math.max(valueMin, Math.min(valueMax, clampedValue));
      onChangeAvg(newAvg);
    } else if (dragging === 'max') {
      // Max can't be below avg
      const newMax = Math.max(clampedValue, valueAvg);
      onChangeMax(newMax);
    }
  }, [dragging, min, max, step, valueMin, valueAvg, valueMax, onChangeMin, onChangeAvg, onChangeMax]);
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);
  return <div className="relative pt-2 pb-2">
      {/* Track */}
      <div ref={trackRef} className="relative h-1.5 bg-slate-700/50 rounded-lg cursor-pointer">
        {/* Filled range (from min to max) */}
        <div className="absolute h-full bg-gradient-to-r from-purple-400/30 to-blue-400/30 rounded-lg" style={{
        left: `${minPercent}%`,
        width: `${maxPercent - minPercent}%`
      }} />

        {/* Min thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 shadow-lg" style={{
        left: `${minPercent}%`
      }} onMouseDown={handleMouseDown('min')}>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono whitespace-nowrap">
            {valueMin.toFixed(1)}
            {unit}
          </div>
        </div>

        {/* Avg thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 shadow-lg z-10" style={{
        left: `${avgPercent}%`
      }} onMouseDown={handleMouseDown('avg')}>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-blue-400 font-mono whitespace-nowrap font-semibold">
            {valueAvg.toFixed(1)}
            {unit}
          </div>
        </div>

        {/* Max thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 shadow-lg" style={{
        left: `${maxPercent}%`
      }} onMouseDown={handleMouseDown('max')}>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono whitespace-nowrap">
            {valueMax.toFixed(1)}
            {unit}
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        <span>Min</span>
        <span className="text-blue-400">Avg</span>
        <span>Max</span>
      </div>
    </div>;
}