import React, { useEffect, useState, useRef } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
interface LevelsUIProps {
  params: {
    inputBlack: number;
    inputWhite: number;
    gamma: number;
    outputBlack: number;
    outputWhite: number;
  };
  onUpdate: (params: Record<string, number>) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}
export function LevelsUI({
  params,
  onUpdate
}: LevelsUIProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [holdingButton, setHoldingButton] = useState<{
    param: string;
    direction: 'up' | 'down';
  } | null>(null);
  const inputTrackRef = useRef<HTMLDivElement>(null);
  const outputTrackRef = useRef<HTMLDivElement>(null);
  const holdIntervalRef = useRef<number>();
  const handleInputDrag = (e: React.MouseEvent, handle: 'black' | 'white' | 'gamma') => {
    e.preventDefault();
    if (!inputTrackRef.current) return;
    const rect = inputTrackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    if (handle === 'black') {
      const value = Math.floor(percent * 255);
      onUpdate({
        ...params,
        inputBlack: Math.min(value, params.inputWhite - 1)
      });
    } else if (handle === 'white') {
      const value = Math.floor(percent * 255);
      onUpdate({
        ...params,
        inputWhite: Math.max(value, params.inputBlack + 1)
      });
    } else if (handle === 'gamma') {
      const blackPercent = params.inputBlack / 255;
      const whitePercent = params.inputWhite / 255;
      const range = whitePercent - blackPercent;
      const relativePercent = (percent - blackPercent) / range;
      const gamma = relativePercent < 0.5 ? 0.1 + relativePercent * 2 * 0.9 : 1.0 + (relativePercent - 0.5) * 2 * 8.99;
      onUpdate({
        ...params,
        gamma: Math.max(0.1, Math.min(9.99, gamma))
      });
    }
  };
  const handleOutputDrag = (e: React.MouseEvent, handle: 'black' | 'white') => {
    e.preventDefault();
    if (!outputTrackRef.current) return;
    const rect = outputTrackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const value = Math.floor(percent * 255);
    if (handle === 'black') {
      onUpdate({
        ...params,
        outputBlack: Math.min(value, params.outputWhite - 1)
      });
    } else {
      onUpdate({
        ...params,
        outputWhite: Math.max(value, params.outputBlack + 1)
      });
    }
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.startsWith('input-')) {
        const handle = dragging.replace('input-', '') as 'black' | 'white' | 'gamma';
        handleInputDrag(e as any, handle);
      } else if (dragging.startsWith('output-')) {
        const handle = dragging.replace('output-', '') as 'black' | 'white';
        handleOutputDrag(e as any, handle);
      }
    };
    const handleMouseUp = () => setDragging(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, params]);
  // Handle button hold for rapid increment/decrement (±1 at faster rate)
  useEffect(() => {
    if (!holdingButton) return;
    const increment = () => {
      const {
        param,
        direction
      } = holdingButton;
      const delta = direction === 'up' ? 1 : -1;
      const gammaDelta = direction === 'up' ? 0.01 : -0.01;
      switch (param) {
        case 'inputBlack':
          onUpdate({
            ...params,
            inputBlack: Math.max(0, Math.min(params.inputBlack + delta, params.inputWhite - 1))
          });
          break;
        case 'inputWhite':
          onUpdate({
            ...params,
            inputWhite: Math.max(params.inputBlack + 1, Math.min(params.inputWhite + delta, 255))
          });
          break;
        case 'gamma':
          onUpdate({
            ...params,
            gamma: Math.max(0.1, Math.min(9.99, params.gamma + gammaDelta))
          });
          break;
        case 'outputBlack':
          onUpdate({
            ...params,
            outputBlack: Math.max(0, Math.min(params.outputBlack + delta, params.outputWhite - 1))
          });
          break;
        case 'outputWhite':
          onUpdate({
            ...params,
            outputWhite: Math.max(params.outputBlack + 1, Math.min(params.outputWhite + delta, 255))
          });
          break;
      }
    };
    // Initial delay before rapid increment
    const initialTimeout = setTimeout(() => {
      holdIntervalRef.current = window.setInterval(increment, 16); // ~60fps for smooth rapid increment
    }, 300);
    return () => {
      clearTimeout(initialTimeout);
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, [holdingButton, params]);
  // Handle keyboard arrow keys (works for both input and button focus)
  useEffect(() => {
    if (!focusedInput) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const gammaDelta = e.key === 'ArrowUp' ? 0.01 : -0.01;
      switch (focusedInput) {
        case 'inputBlack':
          onUpdate({
            ...params,
            inputBlack: Math.max(0, Math.min(params.inputBlack + delta, params.inputWhite - 1))
          });
          break;
        case 'inputWhite':
          onUpdate({
            ...params,
            inputWhite: Math.max(params.inputBlack + 1, Math.min(params.inputWhite + delta, 255))
          });
          break;
        case 'gamma':
          onUpdate({
            ...params,
            gamma: Math.max(0.1, Math.min(9.99, params.gamma + gammaDelta))
          });
          break;
        case 'outputBlack':
          onUpdate({
            ...params,
            outputBlack: Math.max(0, Math.min(params.outputBlack + delta, params.outputWhite - 1))
          });
          break;
        case 'outputWhite':
          onUpdate({
            ...params,
            outputWhite: Math.max(params.outputBlack + 1, Math.min(params.outputWhite + delta, 255))
          });
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedInput, params]);
  // Calculate handle positions
  const inputBlackPercent = params.inputBlack / 255 * 100;
  const inputWhitePercent = params.inputWhite / 255 * 100;
  const gammaRelative = params.gamma <= 1.0 ? (params.gamma - 0.1) / 0.9 * 0.5 : 0.5 + (params.gamma - 1.0) / 8.99 * 0.5;
  const gammaPercent = inputBlackPercent + gammaRelative * (inputWhitePercent - inputBlackPercent);
  const outputBlackPercent = params.outputBlack / 255 * 100;
  const outputWhitePercent = params.outputWhite / 255 * 100;
  return <div className="space-y-3">
      {/* Input Levels */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">
            Input Levels
          </label>
        </div>

        <div ref={inputTrackRef} className="relative h-1.5 bg-gradient-to-r from-black via-gray-500 to-white rounded-lg cursor-crosshair" />

        {/* Triangle handles container */}
        <div className="relative h-2.5 mt-0.5">
          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize" style={{
          left: `${inputBlackPercent}%`
        }} onMouseDown={() => setDragging('input-black')}>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-black" />
          </div>

          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize" style={{
          left: `${gammaPercent}%`
        }} onMouseDown={() => setDragging('input-gamma')}>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-gray-500" />
          </div>

          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize" style={{
          left: `${inputWhitePercent}%`
        }} onMouseDown={() => setDragging('input-white')}>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-white drop-shadow-md" />
          </div>
        </div>

        <div className="flex justify-between text-xs gap-1">
          {/* Input Black */}
          <div className="flex items-center gap-0.5">
            <input type="number" value={params.inputBlack} onChange={e => onUpdate({
            ...params,
            inputBlack: Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
          })} onFocus={() => setFocusedInput('inputBlack')} onBlur={() => setFocusedInput(null)} className={`w-12 px-2 py-1 bg-slate-700/50 border rounded text-slate-300 text-center
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${focusedInput === 'inputBlack' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-600'}`} />
            <div className="flex flex-col">
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                inputBlack: Math.min(params.inputBlack + 1, params.inputWhite - 1)
              });
              setHoldingButton({
                param: 'inputBlack',
                direction: 'up'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('inputBlack')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border border-b-0 rounded-t hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'inputBlack' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronUpIcon className="w-3 h-3 text-slate-400" />
              </button>
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                inputBlack: Math.max(params.inputBlack - 1, 0)
              });
              setHoldingButton({
                param: 'inputBlack',
                direction: 'down'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('inputBlack')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border rounded-b hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'inputBlack' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronDownIcon className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Gamma */}
          <div className="flex items-center gap-0.5">
            <input type="number" value={params.gamma.toFixed(2)} step="0.01" onChange={e => onUpdate({
            ...params,
            gamma: Math.max(0.1, Math.min(9.99, parseFloat(e.target.value) || 1))
          })} onFocus={() => setFocusedInput('gamma')} onBlur={() => setFocusedInput(null)} className={`w-12 px-2 py-1 bg-slate-700/50 border rounded text-slate-300 text-center
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${focusedInput === 'gamma' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-600'}`} />
            <div className="flex flex-col">
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                gamma: Math.min(params.gamma + 0.01, 9.99)
              });
              setHoldingButton({
                param: 'gamma',
                direction: 'up'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('gamma')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border border-b-0 rounded-t hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'gamma' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronUpIcon className="w-3 h-3 text-slate-400" />
              </button>
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                gamma: Math.max(params.gamma - 0.01, 0.1)
              });
              setHoldingButton({
                param: 'gamma',
                direction: 'down'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('gamma')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border rounded-b hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'gamma' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronDownIcon className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Input White */}
          <div className="flex items-center gap-0.5">
            <input type="number" value={params.inputWhite} onChange={e => onUpdate({
            ...params,
            inputWhite: Math.max(0, Math.min(255, parseInt(e.target.value) || 255))
          })} onFocus={() => setFocusedInput('inputWhite')} onBlur={() => setFocusedInput(null)} className={`w-12 px-2 py-1 bg-slate-700/50 border rounded text-slate-300 text-center
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${focusedInput === 'inputWhite' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-600'}`} />
            <div className="flex flex-col">
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                inputWhite: Math.min(params.inputWhite + 1, 255)
              });
              setHoldingButton({
                param: 'inputWhite',
                direction: 'up'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('inputWhite')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border border-b-0 rounded-t hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'inputWhite' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronUpIcon className="w-3 h-3 text-slate-400" />
              </button>
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                inputWhite: Math.max(params.inputWhite - 1, params.inputBlack + 1)
              });
              setHoldingButton({
                param: 'inputWhite',
                direction: 'down'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('inputWhite')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border rounded-b hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'inputWhite' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronDownIcon className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Output Levels */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">
            Output Levels
          </label>
        </div>

        <div ref={outputTrackRef} className="relative h-1.5 bg-gradient-to-r from-black to-white rounded-lg cursor-crosshair" />

        <div className="relative h-2.5 mt-0.5">
          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize" style={{
          left: `${outputBlackPercent}%`
        }} onMouseDown={() => setDragging('output-black')}>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-black" />
          </div>

          <div className="absolute top-0 -translate-x-1/2 cursor-ew-resize" style={{
          left: `${outputWhitePercent}%`
        }} onMouseDown={() => setDragging('output-white')}>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-white drop-shadow-md" />
          </div>
        </div>

        <div className="flex justify-between text-xs gap-1">
          {/* Output Black */}
          <div className="flex items-center gap-0.5">
            <input type="number" value={params.outputBlack} onChange={e => onUpdate({
            ...params,
            outputBlack: Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
          })} onFocus={() => setFocusedInput('outputBlack')} onBlur={() => setFocusedInput(null)} className={`w-12 px-2 py-1 bg-slate-700/50 border rounded text-slate-300 text-center
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${focusedInput === 'outputBlack' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-600'}`} />
            <div className="flex flex-col">
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                outputBlack: Math.min(params.outputBlack + 1, params.outputWhite - 1)
              });
              setHoldingButton({
                param: 'outputBlack',
                direction: 'up'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('outputBlack')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border border-b-0 rounded-t hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'outputBlack' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronUpIcon className="w-3 h-3 text-slate-400" />
              </button>
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                outputBlack: Math.max(params.outputBlack - 1, 0)
              });
              setHoldingButton({
                param: 'outputBlack',
                direction: 'down'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('outputBlack')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border rounded-b hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'outputBlack' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronDownIcon className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Output White */}
          <div className="flex items-center gap-0.5">
            <input type="number" value={params.outputWhite} onChange={e => onUpdate({
            ...params,
            outputWhite: Math.max(0, Math.min(255, parseInt(e.target.value) || 255))
          })} onFocus={() => setFocusedInput('outputWhite')} onBlur={() => setFocusedInput(null)} className={`w-12 px-2 py-1 bg-slate-700/50 border rounded text-slate-300 text-center
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${focusedInput === 'outputWhite' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-600'}`} />
            <div className="flex flex-col">
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                outputWhite: Math.min(params.outputWhite + 1, 255)
              });
              setHoldingButton({
                param: 'outputWhite',
                direction: 'up'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('outputWhite')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border border-b-0 rounded-t hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'outputWhite' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronUpIcon className="w-3 h-3 text-slate-400" />
              </button>
              <button onMouseDown={() => {
              onUpdate({
                ...params,
                outputWhite: Math.max(params.outputWhite - 1, params.outputBlack + 1)
              });
              setHoldingButton({
                param: 'outputWhite',
                direction: 'down'
              });
            }} onMouseUp={() => setHoldingButton(null)} onMouseLeave={() => setHoldingButton(null)} onFocus={() => setFocusedInput('outputWhite')} onBlur={() => setFocusedInput(null)} className={`w-4 h-3 flex items-center justify-center bg-slate-700/50 border rounded-b hover:bg-slate-600/50 transition-colors
                  ${focusedInput === 'outputWhite' ? 'border-purple-500' : 'border-slate-600'}`}>
                <ChevronDownIcon className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>;
}