import React from 'react';
import { GlowParams } from '../types';
import { CaliperSlider } from './CaliperSlider';
import { HueWheelSelector } from './HueWheelSelector';
import { AnglePicker } from './AnglePicker';
import { ColorPicker } from './ColorPicker';
interface GlowUIProps {
  params: GlowParams;
  onUpdate: (params: GlowParams) => void;
}
export function GlowUI({
  params,
  onUpdate
}: GlowUIProps) {
  const updateParam = <K extends keyof GlowParams,>(key: K, value: GlowParams[K]) => {
    onUpdate({
      ...params,
      [key]: value
    });
  };
  return <div className="space-y-6">
      {/* Section 1: Blend Mode & Opacity */}
      <div className="space-y-3 pb-6 border-b border-slate-700/30">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">
              Opacity
            </label>
            <span className="text-xs text-slate-500 font-mono">
              {Math.round(params.opacity * 100)}%
            </span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={params.opacity} onChange={e => updateParam('opacity', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-purple-400
              [&::-webkit-slider-thumb]:to-blue-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-purple-400
              [&::-moz-range-thumb]:to-blue-400
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>

      {/* Section 2: Hue & Luminosity Thresholds */}
      <div className="space-y-3 pb-6 border-b border-slate-700/30">
        <HueWheelSelector hueMin={params.hueMin} hueMax={params.hueMax} onChange={(min, max) => {
        onUpdate({
          ...params,
          hueMin: min,
          hueMax: max
        });
      }} label="Hue Sample Range" />

        <CaliperSlider min={0} max={255} valueMin={params.lumMin} valueMax={params.lumMax} onChange={(min, max) => {
        onUpdate({
          ...params,
          lumMin: min,
          lumMax: max
        });
      }} gradient="linear-gradient(to right, #000000, #ffffff)" label="Luminosity Threshold" />
      </div>

      {/* Section 3: Glow Color */}
      <div className="space-y-3 pb-6 border-b border-slate-700/30">
        <ColorPicker hue={params.glowColorH} saturation={params.glowColorS} lightness={params.glowColorL} onChange={(h, s, l) => {
        onUpdate({
          ...params,
          glowColorH: h,
          glowColorS: s,
          glowColorL: l
        });
      }} label="Glow Color" />
      </div>

      {/* Section 4: Angle, Distance & Blur */}
      <div className="space-y-3">
        <AnglePicker angle={params.angle} onChange={angle => updateParam('angle', angle)} label="Angle" />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">
              Distance
            </label>
            <span className="text-xs text-slate-500 font-mono">
              {params.distance}px
            </span>
          </div>
          <input type="range" min={0} max={350} step={1} value={params.distance} onChange={e => updateParam('distance', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-purple-400
              [&::-webkit-slider-thumb]:to-blue-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-purple-400
              [&::-moz-range-thumb]:to-blue-400
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">
              Blur (Radial)
            </label>
            <span className="text-xs text-slate-500 font-mono">
              {params.blur}px
            </span>
          </div>
          <input type="range" min={0} max={100} step={1} value={params.blur} onChange={e => updateParam('blur', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-purple-400
              [&::-webkit-slider-thumb]:to-blue-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-purple-400
              [&::-moz-range-thumb]:to-blue-400
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>
    </div>;
}