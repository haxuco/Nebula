import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChromaticAberrationParams } from '../types';
import { InfoIcon } from 'lucide-react';
interface ChromaticAberrationUIProps {
  params: ChromaticAberrationParams;
  onUpdate: (params: ChromaticAberrationParams) => void;
}
const PARAM_INFO: Record<string, string> = {
  amount: 'Overall intensity of the chromatic aberration effect (0-100)',
  redOffset: 'Horizontal offset for the red channel. Positive = right, negative = left',
  greenOffset: 'Horizontal offset for the green channel. Positive = right, negative = left',
  blueOffset: 'Horizontal offset for the blue channel. Positive = right, negative = left',
  falloff: 'How much the effect diminishes from center to edges. Higher = more edge focus',
  centerX: 'Horizontal center point of the effect (0 = left, 100 = right)',
  centerY: 'Vertical center point of the effect (0 = top, 100 = bottom)'
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
export function ChromaticAberrationUI({
  params,
  onUpdate
}: ChromaticAberrationUIProps) {
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  const redOffsetRef = useRef<HTMLDivElement>(null);
  const greenOffsetRef = useRef<HTMLDivElement>(null);
  const blueOffsetRef = useRef<HTMLDivElement>(null);
  const falloffRef = useRef<HTMLDivElement>(null);
  const centerXRef = useRef<HTMLDivElement>(null);
  const centerYRef = useRef<HTMLDivElement>(null);
  const updateParam = <K extends keyof ChromaticAberrationParams,>(key: K, value: ChromaticAberrationParams[K]) => {
    onUpdate({
      ...params,
      [key]: value
    });
  };
  return <div className="space-y-4">
      {/* Amount */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">Amount</label>
            <div ref={amountRef} className="relative group" onMouseEnter={() => setHoveredParam('amount')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.amount}
          </span>
        </div>
        <input type="range" min={0} max={100} step={1} value={params.amount} onChange={e => updateParam('amount', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
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

      {/* Red Offset */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-red-400">
              Red Offset
            </label>
            <div ref={redOffsetRef} className="relative group" onMouseEnter={() => setHoveredParam('redOffset')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.redOffset > 0 ? '+' : ''}
            {params.redOffset}
          </span>
        </div>
        <input type="range" min={-100} max={100} step={1} value={params.redOffset} onChange={e => updateParam('redOffset', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-br
            [&::-webkit-slider-thumb]:from-red-400
            [&::-webkit-slider-thumb]:to-red-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-br
            [&::-moz-range-thumb]:from-red-400
            [&::-moz-range-thumb]:to-red-500
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer" />
      </div>

      {/* Green Offset */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-green-400">
              Green Offset
            </label>
            <div ref={greenOffsetRef} className="relative group" onMouseEnter={() => setHoveredParam('greenOffset')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.greenOffset > 0 ? '+' : ''}
            {params.greenOffset}
          </span>
        </div>
        <input type="range" min={-100} max={100} step={1} value={params.greenOffset} onChange={e => updateParam('greenOffset', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-br
            [&::-webkit-slider-thumb]:from-green-400
            [&::-webkit-slider-thumb]:to-green-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-br
            [&::-moz-range-thumb]:from-green-400
            [&::-moz-range-thumb]:to-green-500
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer" />
      </div>

      {/* Blue Offset */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-blue-400">
              Blue Offset
            </label>
            <div ref={blueOffsetRef} className="relative group" onMouseEnter={() => setHoveredParam('blueOffset')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.blueOffset > 0 ? '+' : ''}
            {params.blueOffset}
          </span>
        </div>
        <input type="range" min={-100} max={100} step={1} value={params.blueOffset} onChange={e => updateParam('blueOffset', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-br
            [&::-webkit-slider-thumb]:from-blue-400
            [&::-webkit-slider-thumb]:to-blue-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-br
            [&::-moz-range-thumb]:from-blue-400
            [&::-moz-range-thumb]:to-blue-500
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer" />
      </div>

      {/* Falloff */}
      <div className="space-y-1.5 pb-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Falloff
            </label>
            <div ref={falloffRef} className="relative group" onMouseEnter={() => setHoveredParam('falloff')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.falloff}
          </span>
        </div>
        <input type="range" min={0} max={100} step={1} value={params.falloff} onChange={e => updateParam('falloff', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
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

      {/* Center X */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Center X
            </label>
            <div ref={centerXRef} className="relative group" onMouseEnter={() => setHoveredParam('centerX')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.centerX}%
          </span>
        </div>
        <input type="range" min={0} max={100} step={1} value={params.centerX} onChange={e => updateParam('centerX', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
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

      {/* Center Y */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Center Y
            </label>
            <div ref={centerYRef} className="relative group" onMouseEnter={() => setHoveredParam('centerY')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {params.centerY}%
          </span>
        </div>
        <input type="range" min={0} max={100} step={1} value={params.centerY} onChange={e => updateParam('centerY', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
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
      {hoveredParam === 'amount' && <Tooltip text={PARAM_INFO.amount} anchorRef={amountRef} />}
      {hoveredParam === 'redOffset' && <Tooltip text={PARAM_INFO.redOffset} anchorRef={redOffsetRef} />}
      {hoveredParam === 'greenOffset' && <Tooltip text={PARAM_INFO.greenOffset} anchorRef={greenOffsetRef} />}
      {hoveredParam === 'blueOffset' && <Tooltip text={PARAM_INFO.blueOffset} anchorRef={blueOffsetRef} />}
      {hoveredParam === 'falloff' && <Tooltip text={PARAM_INFO.falloff} anchorRef={falloffRef} />}
      {hoveredParam === 'centerX' && <Tooltip text={PARAM_INFO.centerX} anchorRef={centerXRef} />}
      {hoveredParam === 'centerY' && <Tooltip text={PARAM_INFO.centerY} anchorRef={centerYRef} />}
    </div>;
}