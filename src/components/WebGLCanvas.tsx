import React, { useEffect, useRef, forwardRef } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { useWebGL } from '../hooks/useWebGL';
import { FilterConfig, SourceType } from '../types';
interface WebGLCanvasProps {
  source: HTMLImageElement | HTMLVideoElement | null;
  sourceType: SourceType;
  filters: FilterConfig[];
  isSourceReady: boolean;
  onBack: () => void;
}
export const WebGLCanvas = forwardRef<HTMLCanvasElement, WebGLCanvasProps>(({
  source,
  sourceType,
  filters,
  isSourceReady,
  onBack
}, forwardedRef) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = forwardedRef as React.RefObject<HTMLCanvasElement> || internalCanvasRef;
  const {
    render,
    isReady
  } = useWebGL(canvasRef);
  const animationRef = useRef<number>();
  useEffect(() => {
    if (!source || !isReady || !isSourceReady) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }
    const animate = () => {
      render(source, filters);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [source, filters, render, isReady, isSourceReady]);
  const showCanvas = source && isSourceReady;
  return <div className="relative w-full h-full flex items-center justify-center bg-black">
        {showCanvas && <button onClick={onBack} className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg transition-colors text-slate-200 text-sm">
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>}

        <canvas ref={canvasRef} className="max-w-full max-h-full" style={{
      imageRendering: 'auto',
      display: showCanvas ? 'block' : 'none'
    }} />
      </div>;
});
WebGLCanvas.displayName = 'WebGLCanvas';