import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { DuplicateLayerParams, BlendMode, BLEND_MODE_LABELS } from '../types';
import { InfoIcon, ChevronDownIcon, FlipHorizontalIcon } from 'lucide-react';
interface DuplicateLayerUIProps {
  params: DuplicateLayerParams;
  onUpdate: (params: DuplicateLayerParams) => void;
}
const PARAM_INFO: Record<string, string> = {
  flipHorizontal: 'Flip the duplicate layer horizontally (mirror effect)',
  blendMode: 'How the duplicate layer blends with the source video',
  frameOffset: 'Time delay in frames. Negative = duplicate is behind in time, Positive = duplicate is ahead',
  stackingOrder: 'Which layer appears on top. Source on Top = duplicate below, Duplicate on Top = duplicate above',
  opacity: 'Overall opacity of the duplicate layer (0-100%)'
};
interface TooltipProps {
  text: string;
  anchorRef: React.RefObject<HTMLDivElement>;
}
function Tooltip({
  text,
  anchorRef
}: TooltipProps) {
  const [position, setPosition] = useState({
    top: 0,
    left: 0
  });
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left
      });
    }
  }, [anchorRef]);
  return ReactDOM.createPortal(<div className="fixed w-56 p-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 pointer-events-none transform -translate-y-full" style={{
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 10000
  }}>
      {text}
    </div>, document.body);
}
export function DuplicateLayerUI({
  params,
  onUpdate
}: DuplicateLayerUIProps) {
  const [showBlendModeDropdown, setShowBlendModeDropdown] = useState(false);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);
  const flipHorizontalRef = useRef<HTMLDivElement>(null);
  const blendModeRef = useRef<HTMLDivElement>(null);
  const frameOffsetRef = useRef<HTMLDivElement>(null);
  const stackingOrderRef = useRef<HTMLDivElement>(null);
  const opacityRef = useRef<HTMLDivElement>(null);
  const updateParam = <K extends keyof DuplicateLayerParams,>(key: K, value: DuplicateLayerParams[K]) => {
    onUpdate({
      ...params,
      [key]: value
    });
  };
  // Calculate time display (assuming 30fps)
  const timeInSeconds = (Math.abs(params.frameOffset) / 30).toFixed(2);
  const timeDisplay = params.frameOffset < 0 ? `-${timeInSeconds}s` : params.frameOffset > 0 ? `+${timeInSeconds}s` : '0s';
  return <div className="space-y-4">
      {/* Flip Horizontal Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
        <div className="flex items-center gap-1.5">
          <FlipHorizontalIcon className="w-4 h-4 text-slate-400" />
          <label className="text-xs font-medium text-slate-400">
            Flip Horizontal
          </label>
          <div ref={flipHorizontalRef} className="relative group" onMouseEnter={() => setHoveredParam('flipHorizontal')} onMouseLeave={() => setHoveredParam(null)}>
            <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
          </div>
        </div>
        <button onClick={() => updateParam('flipHorizontal', !params.flipHorizontal)} className={`relative w-11 h-6 rounded-full transition-colors ${params.flipHorizontal ? 'bg-purple-500' : 'bg-slate-700'}`}>
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${params.flipHorizontal ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Blend Mode */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Blend Mode
            </label>
            <div ref={blendModeRef} className="relative group" onMouseEnter={() => setHoveredParam('blendMode')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowBlendModeDropdown(!showBlendModeDropdown)} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-between hover:bg-slate-700 cursor-pointer">
            <span>{BLEND_MODE_LABELS[params.blendMode]}</span>
            <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showBlendModeDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showBlendModeDropdown && <>
              <div className="fixed inset-0" style={{
            zIndex: 9997
          }} onClick={() => setShowBlendModeDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto" style={{
            zIndex: 9999
          }}>
                {(Object.keys(BLEND_MODE_LABELS) as BlendMode[]).map(mode => <button key={mode} onClick={() => {
              updateParam('blendMode', mode);
              setShowBlendModeDropdown(false);
            }} className={`w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors text-sm ${params.blendMode === mode ? 'text-purple-400 bg-slate-700/30' : 'text-slate-300'}`}>
                    {BLEND_MODE_LABELS[mode]}
                  </button>)}
              </div>
            </>}
        </div>
      </div>

      {/* Frame Offset */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Time Offset
            </label>
            <div ref={frameOffsetRef} className="relative group" onMouseEnter={() => setHoveredParam('frameOffset')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.frameOffset}f ({timeDisplay})
          </span>
        </div>
        <input type="range" min={-300} max={300} step={1} value={params.frameOffset} onChange={e => updateParam('frameOffset', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
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

      {/* Stacking Order */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Stacking Order
            </label>
            <div ref={stackingOrderRef} className="relative group" onMouseEnter={() => setHoveredParam('stackingOrder')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => updateParam('stackingOrder', 0)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${params.stackingOrder === 0 ? 'bg-purple-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
            Source on Top
          </button>
          <button onClick={() => updateParam('stackingOrder', 1)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${params.stackingOrder === 1 ? 'bg-purple-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
            Duplicate on Top
          </button>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Opacity
            </label>
            <div ref={opacityRef} className="relative group" onMouseEnter={() => setHoveredParam('opacity')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.opacity}%
          </span>
        </div>
        <input type="range" min={0} max={100} step={1} value={params.opacity} onChange={e => updateParam('opacity', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
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

      {/* Render tooltips via portal */}
      {hoveredParam === 'flipHorizontal' && <Tooltip text={PARAM_INFO.flipHorizontal} anchorRef={flipHorizontalRef} />}
      {hoveredParam === 'blendMode' && <Tooltip text={PARAM_INFO.blendMode} anchorRef={blendModeRef} />}
      {hoveredParam === 'frameOffset' && <Tooltip text={PARAM_INFO.frameOffset} anchorRef={frameOffsetRef} />}
      {hoveredParam === 'stackingOrder' && <Tooltip text={PARAM_INFO.stackingOrder} anchorRef={stackingOrderRef} />}
      {hoveredParam === 'opacity' && <Tooltip text={PARAM_INFO.opacity} anchorRef={opacityRef} />}
    </div>;
}