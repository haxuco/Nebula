import React, { useState } from 'react';
import { PencilIcon } from 'lucide-react';
import { ColorChannel, ColorToneParams, ColorToneChannelParams, COLOR_CHANNEL_LABELS, COLOR_CHANNEL_COLORS } from '../types';
interface ColorToneUIProps {
  params: ColorToneParams;
  activeChannel: ColorChannel;
  onUpdate: (params: ColorToneParams) => void;
  onChannelChange: (channel: ColorChannel) => void;
}
export function ColorToneUI({
  params,
  activeChannel,
  onUpdate,
  onChannelChange
}: ColorToneUIProps) {
  const currentChannelParams = params[activeChannel];
  const hasChannelEdits = (channel: ColorChannel): boolean => {
    if (channel === 'all') return false;
    const channelParams = params[channel];
    return channelParams.saturation !== 100 || channelParams.hue !== 0 || channelParams.tone !== 0 || channelParams.tint !== 0;
  };
  const updateChannelParam = (key: keyof ColorToneChannelParams, value: number) => {
    onUpdate({
      ...params,
      [activeChannel]: {
        ...currentChannelParams,
        [key]: value
      }
    });
  };
  const resetAllColors = () => {
    const defaultChannel: ColorToneChannelParams = {
      saturation: 100,
      hue: 0,
      tone: 0,
      tint: 0
    };
    onUpdate({
      all: {
        ...defaultChannel
      },
      red: {
        ...defaultChannel
      },
      orange: {
        ...defaultChannel
      },
      yellow: {
        ...defaultChannel
      },
      green: {
        ...defaultChannel
      },
      cyan: {
        ...defaultChannel
      },
      blue: {
        ...defaultChannel
      },
      magenta: {
        ...defaultChannel
      }
    });
  };
  const resetChannel = () => {
    onUpdate({
      ...params,
      [activeChannel]: {
        saturation: 100,
        hue: 0,
        tone: 0,
        tint: 0
      }
    });
  };
  const channels: ColorChannel[] = ['all', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
  return <div className="space-y-4">
      {/* Reset Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={resetAllColors} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-600 transition-colors font-medium">
          Reset All Colors
        </button>
        <button onClick={resetChannel} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-600 transition-colors font-medium">
          Reset Channel
        </button>
      </div>

      {/* Channel Buttons - Shorter */}
      <div className="grid grid-cols-4 gap-2">
        {channels.map(channel => {
        const isActive = activeChannel === channel;
        const hasEdits = hasChannelEdits(channel);
        const channelColor = COLOR_CHANNEL_COLORS[channel];
        return <button key={channel} onClick={() => onChannelChange(channel)} className={`relative h-8 transition-all ${isActive ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white' : 'hover:ring-1 hover:ring-slate-300'}`} style={{
          background: channelColor
        }} title={COLOR_CHANNEL_LABELS[channel]}>
              {hasEdits && <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white/90 rounded-none shadow-sm flex items-center justify-center">
                  <PencilIcon className="w-2.5 h-2.5 text-slate-600" />
                </div>}
            </button>;
      })}
      </div>

      {/* Saturation Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500">
            Saturation
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {currentChannelParams.saturation}
          </span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: 'linear-gradient(to right, #808080 0%, #ff0000 50%, #ff0000 100%)'
        }} />
          <input type="range" min={0} max={200} step={1} value={currentChannelParams.saturation} onChange={e => updateChannelParam('saturation', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3.5
              [&::-moz-range-thumb]:h-3.5
              [&::-moz-range-thumb]:rounded-none
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-blue-600
              [&::-moz-range-thumb]:to-blue-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>

      {/* Hue Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500">Hue</label>
          <span className="text-xs text-slate-400 font-mono">
            {currentChannelParams.hue}°
          </span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
        }} />
          <input type="range" min={-180} max={180} step={1} value={currentChannelParams.hue} onChange={e => updateChannelParam('hue', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3.5
              [&::-moz-range-thumb]:h-3.5
              [&::-moz-range-thumb]:rounded-none
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-blue-600
              [&::-moz-range-thumb]:to-blue-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>

      {/* Tone (Temperature) Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500">
            Tone (Temperature)
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {currentChannelParams.tone}
          </span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: 'linear-gradient(to right, #4dabf7 0%, #e0e0e0 50%, #ffa94d 100%)'
        }} />
          <input type="range" min={-100} max={100} step={1} value={currentChannelParams.tone} onChange={e => updateChannelParam('tone', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3.5
              [&::-moz-range-thumb]:h-3.5
              [&::-moz-range-thumb]:rounded-none
              [&::-moz-range-thumb]:bg-gradient-to-br
              [&::-moz-range-thumb]:from-blue-600
              [&::-moz-range-thumb]:to-blue-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer" />
        </div>
      </div>

      {/* Tint Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500">Tint</label>
          <span className="text-xs text-slate-400 font-mono">
            {currentChannelParams.tint}
          </span>
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
          background: 'linear-gradient(to right, #51cf66 0%, #e0e0e0 50%, #da77f2 100%)'
        }} />
          <input type="range" min={-100} max={100} step={1} value={currentChannelParams.tint} onChange={e => updateChannelParam('tint', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full bg-transparent rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-none
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-blue-600
              [&::-webkit-slider-thumb]:to-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-3.5
              [&::-moz-range-thumb]:h-3.5
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