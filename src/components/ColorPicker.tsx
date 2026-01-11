import React from 'react';
interface ColorPickerProps {
  hue: number; // 0-360
  saturation: number; // 0-100
  lightness: number; // 0-100
  onChange: (h: number, s: number, l: number) => void;
  label: string;
}
export function ColorPicker({
  hue,
  saturation,
  lightness,
  onChange,
  label
}: ColorPickerProps) {
  // Convert HSL to CSS color
  const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <div className="w-8 h-8 rounded border-2 border-slate-600/50 shadow-inner" style={{
        backgroundColor: hslColor
      }} title={hslColor} />
      </div>

      {/* Hue Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">Hue</label>
          <span className="text-xs text-slate-500 font-mono">{hue}°</span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
        }} />
          <input type="range" min={0} max={360} step={1} value={hue} onChange={e => onChange(parseFloat(e.target.value), saturation, lightness)} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-none
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-blue-600
              [&::-moz-range-thumb]:to-blue-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>

      {/* Saturation Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">Saturation</label>
          <span className="text-xs text-slate-500 font-mono">
            {saturation}%
          </span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
        }} />
          <input type="range" min={0} max={100} step={1} value={saturation} onChange={e => onChange(hue, parseFloat(e.target.value), lightness)} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-none
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-blue-600
              [&::-moz-range-thumb]:to-blue-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>

      {/* Lightness Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">Lightness</label>
          <span className="text-xs text-slate-500 font-mono">{lightness}%</span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: `linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`
        }} />
          <input type="range" min={0} max={100} step={1} value={lightness} onChange={e => onChange(hue, saturation, parseFloat(e.target.value))} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-none
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-blue-600
              [&::-moz-range-thumb]:to-blue-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>
    </div>;
}