import React, { useRef } from 'react';
import { PatternParams, PatternView } from '../types';
import { UploadIcon } from 'lucide-react';

interface PatternUIProps {
  params: PatternParams;
  onUpdate: (params: PatternParams) => void;
  patternImage?: HTMLImageElement;
  onUpdateImage: (image: HTMLImageElement) => void;
}

export function PatternUI({
  params,
  onUpdate,
  patternImage,
  onUpdateImage
}: PatternUIProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateParam = <K extends keyof PatternParams>(key: K, value: PatternParams[K]) => {
    onUpdate({
      ...params,
      [key]: value
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onUpdateImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => updateParam('view', 'patterns')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            params.view === 'patterns'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Patterns
        </button>
        <button
          onClick={() => updateParam('view', 'lines')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            params.view === 'lines'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Lines
        </button>
      </div>

      {/* Common: Opacity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500">Opacity</label>
          <span className="text-xs text-slate-500 font-mono">
            {params.opacity.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={params.opacity}
          onChange={(e) => updateParam('opacity', parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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
            [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>

      {params.view === 'patterns' ? (
        <div className="space-y-4">
          {/* Patterns View */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">Pattern Image</label>
            
            {/* Built-in Pattern Presets */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                onClick={() => {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = () => onUpdateImage(img);
                  img.src = "/pattern.svg";
                }}
                className="aspect-square bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-blue-500/50 transition-all overflow-hidden rounded"
                title="Vertical Stripes"
              >
                <img src="/pattern.svg" alt="Vertical stripes pattern" className="w-full h-full object-cover" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm text-slate-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <UploadIcon className="w-4 h-4" />
              {patternImage ? 'Change Pattern' : 'Upload Custom Pattern'}
            </button>
            
            {patternImage && (
              <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                <img src={patternImage.src} alt="Pattern preview" className="w-full h-16 object-contain" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">Tile Width</label>
                <span className="text-xs text-slate-500 font-mono">{params.width}</span>
              </div>
              <input
                type="range"
                min={2}
                max={200}
                step={1}
                value={params.width}
                onChange={(e) => updateParam('width', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-none
                  [&::-webkit-slider-thumb]:bg-gradient-to-br
                  [&::-webkit-slider-thumb]:from-blue-600
                  [&::-webkit-slider-thumb]:to-blue-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">Tile Height</label>
                <span className="text-xs text-slate-500 font-mono">{params.height}</span>
              </div>
              <input
                type="range"
                min={2}
                max={200}
                step={1}
                value={params.height}
                onChange={(e) => updateParam('height', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-none
                  [&::-webkit-slider-thumb]:bg-gradient-to-br
                  [&::-webkit-slider-thumb]:from-blue-600
                  [&::-webkit-slider-thumb]:to-blue-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lines View */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">Orientation</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateParam('orientation', 'horizontal')}
                className={`flex-1 px-3 py-2 text-xs font-medium border transition-all ${
                  params.orientation === 'horizontal'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Horizontal
              </button>
              <button
                onClick={() => updateParam('orientation', 'vertical')}
                className={`flex-1 px-3 py-2 text-xs font-medium border transition-all ${
                  params.orientation === 'vertical'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Vertical
              </button>
            </div>
          </div>

          {/* Line 1 */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line 1</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={params.line1Color}
                  onChange={(e) => updateParam('line1Color', e.target.value)}
                  className="w-6 h-6 rounded border-0 p-0 overflow-hidden cursor-pointer"
                />
                <input
                  type="text"
                  value={params.line1Color}
                  onChange={(e) => updateParam('line1Color', e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] font-mono border border-slate-200 rounded text-slate-600"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Thickness</label>
                <span className="text-[10px] text-slate-500 font-mono">{params.line1Thickness}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={params.line1Thickness}
                onChange={(e) => updateParam('line1Thickness', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-2.5
                  [&::-webkit-slider-thumb]:h-2.5
                  [&::-webkit-slider-thumb]:rounded-none
                  [&::-webkit-slider-thumb]:bg-blue-600"
              />
            </div>
          </div>

          {/* Line 2 */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line 2</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={params.line2Color}
                  onChange={(e) => updateParam('line2Color', e.target.value)}
                  className="w-6 h-6 rounded border-0 p-0 overflow-hidden cursor-pointer"
                />
                <input
                  type="text"
                  value={params.line2Color}
                  onChange={(e) => updateParam('line2Color', e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] font-mono border border-slate-200 rounded text-slate-600"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Thickness</label>
                <span className="text-[10px] text-slate-500 font-mono">{params.line2Thickness}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={params.line2Thickness}
                onChange={(e) => updateParam('line2Thickness', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-2.5
                  [&::-webkit-slider-thumb]:h-2.5
                  [&::-webkit-slider-thumb]:rounded-none
                  [&::-webkit-slider-thumb]:bg-blue-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
