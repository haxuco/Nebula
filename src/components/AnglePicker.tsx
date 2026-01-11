import React, { useEffect, useState, useRef } from 'react';
interface AnglePickerProps {
  angle: number; // 0-360 degrees
  onChange: (angle: number) => void;
  label: string;
}
export function AnglePicker({
  angle,
  onChange,
  label
}: AnglePickerProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const updateAngle = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // Calculate angle in degrees (0° = top, clockwise)
    let newAngle = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (newAngle < 0) newAngle += 360;
    onChange(Math.round(newAngle));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    updateAngle(e.clientX, e.clientY);
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      updateAngle(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      setDragging(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);
  // Convert angle to rotation (0° = top)
  const rotation = angle;
  return <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <span className="text-xs text-slate-500 font-mono">{angle}°</span>
      </div>

      <div className="flex items-center justify-center py-2">
        <div ref={dialRef} className="relative w-20 h-20 rounded-full bg-slate-700/50 border-2 border-slate-600/50 cursor-pointer" onMouseDown={handleMouseDown}>
          {/* Angle indicators */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute top-1 w-0.5 h-2 bg-slate-500" />
            <div className="absolute bottom-1 w-0.5 h-2 bg-slate-500" />
            <div className="absolute left-1 w-2 h-0.5 bg-slate-500" />
            <div className="absolute right-1 w-2 h-0.5 bg-slate-500" />
          </div>

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-none bg-slate-600" />
          </div>

          {/* Draggable handle - center intersects circle edge, no line */}
          <div className="absolute inset-0 flex items-start justify-center transition-transform" style={{
          transform: `rotate(${rotation}deg)`
        }}>
            {/* Handle at edge - center of handle intersects circle */}
            <div className="absolute top-0 w-3 h-3 rounded-none bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg -translate-y-1/2" />
          </div>
        </div>
      </div>
    </div>;
}