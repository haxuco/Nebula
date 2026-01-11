import React, { useEffect, useState, useRef } from 'react';
interface HueWheelSelectorProps {
  hueMin: number; // 0-360
  hueMax: number; // 0-360
  onChange: (min: number, max: number) => void;
  label: string;
}
export function HueWheelSelector({
  hueMin,
  hueMax,
  onChange,
  label
}: HueWheelSelectorProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
  const updateAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current || !dragging) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // Calculate angle in degrees (0° = top, clockwise)
    let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const roundedAngle = Math.round(angle);
    if (dragging === 'min') {
      onChange(roundedAngle, hueMax);
    } else {
      onChange(hueMin, roundedAngle);
    }
  };
  const handleMouseDown = (thumb: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(thumb);
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateAngle(e.clientX, e.clientY);
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
  }, [dragging, hueMin, hueMax]);
  // Calculate the arc angle, handling wraparound at 0°
  let arcAngle = hueMax - hueMin;
  if (arcAngle < 0) {
    arcAngle += 360;
  }
  // Determine if selection wraps around 0°
  const wrapsAround = hueMax < hueMin;
  // Calculate SVG arc path for border
  const radius = 40; // Match the wheel radius
  const centerX = 40;
  const centerY = 40;
  const strokeWidth = 3;
  const startAngle = (hueMin - 90) * (Math.PI / 180);
  const endAngle = (hueMax - 90) * (Math.PI / 180);
  const startX = centerX + radius * Math.cos(startAngle);
  const startY = centerY + radius * Math.sin(startAngle);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY + radius * Math.sin(endAngle);
  const largeArcFlag = arcAngle > 180 ? 1 : 0;
  // Special case: full circle (0 to 360 or very close)
  const isFullCircle = arcAngle >= 359;
  return <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span>{hueMin}°</span>
          <span className="text-slate-600">→</span>
          <span>{hueMax}°</span>
        </div>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative w-20 h-20">
          {/* Base color wheel */}
          <div ref={wheelRef} className="absolute inset-0 rounded-full cursor-pointer" style={{
          background: `conic-gradient(
                from 0deg,
                hsl(0, 100%, 50%),
                hsl(60, 100%, 50%),
                hsl(120, 100%, 50%),
                hsl(180, 100%, 50%),
                hsl(240, 100%, 50%),
                hsl(300, 100%, 50%),
                hsl(360, 100%, 50%)
              )`
        }}>
            {/* Selected slice overlay - handles wraparound */}
            {wrapsAround ?
          // When wrapping around 0°, show two gradients
          <>
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{
              background: `conic-gradient(
                      from 0deg,
                      rgba(255, 255, 255, 0.5) 0deg,
                      rgba(255, 255, 255, 0.5) ${hueMax}deg,
                      rgba(0, 0, 0, 0.4) ${hueMax}deg,
                      rgba(0, 0, 0, 0.4) ${hueMin}deg,
                      rgba(255, 255, 255, 0.5) ${hueMin}deg
                    )`
            }} />
              </> :
          // Normal case: min < max
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{
            background: `conic-gradient(
                    from ${hueMin}deg,
                    rgba(255, 255, 255, 0.5) 0deg,
                    rgba(255, 255, 255, 0.5) ${arcAngle}deg,
                    rgba(0, 0, 0, 0.4) ${arcAngle}deg
                  )`
          }} />}

            {/* Min handle - larger hit area, smaller visual */}
            <div className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none" style={{
            transform: `translate(-50%, -50%) rotate(${hueMin}deg)`
          }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto" onMouseDown={handleMouseDown('min')} style={{
              padding: '4px'
            }}>
                <div className="w-2.5 h-2.5 rounded-none bg-white shadow-lg border-2 border-slate-700 transition-transform group-hover:scale-125" />
              </div>
            </div>

            {/* Max handle - larger hit area, smaller visual */}
            <div className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none" style={{
            transform: `translate(-50%, -50%) rotate(${hueMax}deg)`
          }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto" onMouseDown={handleMouseDown('max')} style={{
              padding: '4px'
            }}>
                <div className="w-2.5 h-2.5 rounded-none bg-white shadow-lg border-2 border-slate-700 transition-transform group-hover:scale-125" />
              </div>
            </div>
          </div>

          {/* SVG overlay for arc border - properly aligned */}
          <svg className="absolute pointer-events-none" viewBox="0 0 80 80" style={{
          width: '80px',
          height: '80px',
          top: '0',
          left: '0',
          overflow: 'visible'
        }}>
            {isFullCircle ?
          // Full circle border
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="white" strokeWidth={strokeWidth} opacity="0.8" /> : wrapsAround ?
          // When wrapping, draw two arcs
          <>
                {/* Arc from 0° to hueMax */}
                <path d={`M ${centerX + radius * Math.cos(-Math.PI / 2)} ${centerY + radius * Math.sin(-Math.PI / 2)} 
                      A ${radius} ${radius} 0 ${hueMax > 180 ? 1 : 0} 1 
                      ${centerX + radius * Math.cos((hueMax - 90) * (Math.PI / 180))} 
                      ${centerY + radius * Math.sin((hueMax - 90) * (Math.PI / 180))}`} fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.8" />
                {/* Arc from hueMin to 360° */}
                <path d={`M ${startX} ${startY} 
                      A ${radius} ${radius} 0 ${360 - hueMin > 180 ? 1 : 0} 1 
                      ${centerX + radius * Math.cos(-Math.PI / 2)} 
                      ${centerY + radius * Math.sin(-Math.PI / 2)}`} fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.8" />
              </> :
          // Normal arc from min to max
          <path d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`} fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.8" />}
          </svg>
        </div>
      </div>
    </div>;
}