import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { VSyncTearsParams, TearMotionType, TEAR_MOTION_TYPE_LABELS, TEAR_MOTION_TYPE_DESCRIPTIONS } from '../types';
import { ChevronDownIcon, InfoIcon } from 'lucide-react';
import { TripleRangeSlider } from './TripleRangeSlider';
interface VSyncTearsUIProps {
  params: VSyncTearsParams;
  onUpdate: (params: VSyncTearsParams) => void;
}
const MOTION_TYPE_MAP: Record<TearMotionType, number> = {
  instantJump: 0,
  sineWave: 1,
  linear: 2,
  easeIn: 3,
  easeOut: 4,
  easeInOut: 5,
  bounce: 6,
  elastic: 7
};
const PARAM_INFO: Record<string, string> = {
  tearFrequency: 'How often tears appear. Higher = more frequent (0.1 to 50 tears/sec)',
  tearDuration: 'How long each tear lasts in milliseconds',
  tearShift: 'Max horizontal displacement in pixels',
  tearHeight: 'Height range of tear regions as % of screen. Min, Avg, and Max control the distribution',
  simultaneousTears: 'How many tears can appear at the same time (1-100)',
  scrollSpeed: 'Vertical scroll speed of tear bands (VHS tracking error effect). 0 = stationary, 10 = 1 screen/sec',
  tearMotionSpeed: 'Speed multiplier for tear motion animation',
  tearMotionIntensity: 'Amplitude multiplier for motion displacement',
  tearMotionPhase: 'Starting phase offset in degrees'
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
  return ReactDOM.createPortal(<div className="fixed w-56 p-2 bg-white backdrop-blur-sm border border-slate-200 shadow-xl text-xs text-slate-700 pointer-events-none transform -translate-y-full" style={{
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 10000
  }}>
      {text}
    </div>, document.body);
}
export function VSyncTearsUI({
  params,
  onUpdate
}: VSyncTearsUIProps) {
  const [showMotionDropdown, setShowMotionDropdown] = useState(false);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);
  const tearFrequencyRef = useRef<HTMLDivElement>(null);
  const tearDurationRef = useRef<HTMLDivElement>(null);
  const tearShiftRef = useRef<HTMLDivElement>(null);
  const tearHeightRef = useRef<HTMLDivElement>(null);
  const simultaneousTearsRef = useRef<HTMLDivElement>(null);
  const scrollSpeedRef = useRef<HTMLDivElement>(null);
  const tearMotionSpeedRef = useRef<HTMLDivElement>(null);
  const tearMotionIntensityRef = useRef<HTMLDivElement>(null);
  const tearMotionPhaseRef = useRef<HTMLDivElement>(null);
  const updateParam = <K extends keyof VSyncTearsParams,>(key: K, value: VSyncTearsParams[K]) => {
    onUpdate({
      ...params,
      [key]: value
    });
  };
  return <div className="space-y-4">
      {/* Tear Frequency */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Tear Frequency
            </label>
            <div ref={tearFrequencyRef} className="relative group" onMouseEnter={() => setHoveredParam('tearFrequency')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.tearFrequency}
          </span>
        </div>
        <input type="range" min={0} max={500} step={1} value={params.tearFrequency} onChange={e => updateParam('tearFrequency', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Simultaneous Tears */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Simultaneous Tears
            </label>
            <div ref={simultaneousTearsRef} className="relative group" onMouseEnter={() => setHoveredParam('simultaneousTears')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.simultaneousTears}
          </span>
        </div>
        <input type="range" min={1} max={100} step={1} value={params.simultaneousTears} onChange={e => updateParam('simultaneousTears', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Scroll Speed */}
      <div className="space-y-1.5 pb-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Scroll Speed
            </label>
            <div ref={scrollSpeedRef} className="relative group" onMouseEnter={() => setHoveredParam('scrollSpeed')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.scrollSpeed.toFixed(1)}
          </span>
        </div>
        <input type="range" min={0} max={10} step={0.1} value={params.scrollSpeed} onChange={e => updateParam('scrollSpeed', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Tear Duration */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Tear Duration
            </label>
            <div ref={tearDurationRef} className="relative group" onMouseEnter={() => setHoveredParam('tearDuration')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.tearDuration}ms
          </span>
        </div>
        <input type="range" min={50} max={1000} step={10} value={params.tearDuration} onChange={e => updateParam('tearDuration', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Tear Shift */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Tear Shift
            </label>
            <div ref={tearShiftRef} className="relative group" onMouseEnter={() => setHoveredParam('tearShift')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.tearShift}px
          </span>
        </div>
        <input type="range" min={0} max={300} step={1} value={params.tearShift} onChange={e => updateParam('tearShift', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Tear Height - Triple Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Tear Height Range
            </label>
            <div ref={tearHeightRef} className="relative group" onMouseEnter={() => setHoveredParam('tearHeight')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
        </div>
        <TripleRangeSlider min={0.1} max={100} step={0.1} valueMin={params.tearHeightMin} valueAvg={params.tearHeightAvg} valueMax={params.tearHeightMax} onChangeMin={value => updateParam('tearHeightMin', value)} onChangeAvg={value => updateParam('tearHeightAvg', value)} onChangeMax={value => updateParam('tearHeightMax', value)} unit="%" />
      </div>

      {/* Motion Type Dropdown */}
      <div className="space-y-2 pb-4 border-b border-slate-200">
        <label className="text-xs font-semibold text-slate-500">
          Motion Type
        </label>
        <div className="relative">
          <button onClick={() => setShowMotionDropdown(!showMotionDropdown)} className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm text-slate-700 transition-colors flex items-center justify-between shadow-sm">
            <span>{TEAR_MOTION_TYPE_LABELS[params.tearMotionType]}</span>
            <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showMotionDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showMotionDropdown && <>
              <div className="fixed inset-0" style={{
            zIndex: 9997
          }} onClick={() => setShowMotionDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl overflow-hidden" style={{
            zIndex: 9999
          }}>
                {(Object.keys(TEAR_MOTION_TYPE_LABELS) as TearMotionType[]).map(type => <button key={type} onClick={() => {
              updateParam('tearMotionType', type);
              setShowMotionDropdown(false);
            }} className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${params.tearMotionType === type ? 'text-blue-700 bg-blue-50 font-medium' : 'text-slate-600'}`}>
                      <div className="text-sm font-medium">
                        {TEAR_MOTION_TYPE_LABELS[type]}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {TEAR_MOTION_TYPE_DESCRIPTIONS[type]}
                      </div>
                    </button>)}
              </div>
            </>}
        </div>
      </div>

      {/* Motion Speed */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Motion Speed
            </label>
            <div ref={tearMotionSpeedRef} className="relative group" onMouseEnter={() => setHoveredParam('tearMotionSpeed')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.tearMotionSpeed.toFixed(1)}x
          </span>
        </div>
        <input type="range" min={0.1} max={5.0} step={0.1} value={params.tearMotionSpeed} onChange={e => updateParam('tearMotionSpeed', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Motion Intensity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Motion Intensity
            </label>
            <div ref={tearMotionIntensityRef} className="relative group" onMouseEnter={() => setHoveredParam('tearMotionIntensity')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.tearMotionIntensity.toFixed(1)}
          </span>
        </div>
        <input type="range" min={0} max={2.0} step={0.1} value={params.tearMotionIntensity} onChange={e => updateParam('tearMotionIntensity', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Motion Phase */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Motion Phase
            </label>
            <div ref={tearMotionPhaseRef} className="relative group" onMouseEnter={() => setHoveredParam('tearMotionPhase')} onMouseLeave={() => setHoveredParam(null)}>
              <InfoIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {params.tearMotionPhase}°
          </span>
        </div>
        <input type="range" min={0} max={360} step={1} value={params.tearMotionPhase} onChange={e => updateParam('tearMotionPhase', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer
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

      {/* Render tooltips via portal */}
      {hoveredParam === 'tearFrequency' && <Tooltip text={PARAM_INFO.tearFrequency} anchorRef={tearFrequencyRef} />}
      {hoveredParam === 'tearDuration' && <Tooltip text={PARAM_INFO.tearDuration} anchorRef={tearDurationRef} />}
      {hoveredParam === 'tearShift' && <Tooltip text={PARAM_INFO.tearShift} anchorRef={tearShiftRef} />}
      {hoveredParam === 'tearHeight' && <Tooltip text={PARAM_INFO.tearHeight} anchorRef={tearHeightRef} />}
      {hoveredParam === 'simultaneousTears' && <Tooltip text={PARAM_INFO.simultaneousTears} anchorRef={simultaneousTearsRef} />}
      {hoveredParam === 'scrollSpeed' && <Tooltip text={PARAM_INFO.scrollSpeed} anchorRef={scrollSpeedRef} />}
      {hoveredParam === 'tearMotionSpeed' && <Tooltip text={PARAM_INFO.tearMotionSpeed} anchorRef={tearMotionSpeedRef} />}
      {hoveredParam === 'tearMotionIntensity' && <Tooltip text={PARAM_INFO.tearMotionIntensity} anchorRef={tearMotionIntensityRef} />}
      {hoveredParam === 'tearMotionPhase' && <Tooltip text={PARAM_INFO.tearMotionPhase} anchorRef={tearMotionPhaseRef} />}
    </div>;
}