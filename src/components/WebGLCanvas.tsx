import React, { useEffect, useRef, forwardRef, useState } from 'react';
import { VideoIcon, ImageIcon, UploadIcon, ChevronDownIcon } from 'lucide-react';
import { useWebGL } from '../hooks/useWebGL';
import { FilterConfig, SourceType } from '../types';
interface WebGLCanvasProps {
  source: HTMLImageElement | HTMLVideoElement | null;
  sourceType: SourceType;
  filters: FilterConfig[];
  isSourceReady: boolean;
  onBack: () => void;
  onWebcam: () => void;
  onImage: (file: File) => void;
  onVideo: (file: File) => void;
}
export const WebGLCanvas = forwardRef<HTMLCanvasElement, WebGLCanvasProps>(({
  source,
  sourceType,
  filters,
  isSourceReady,
  onBack,
  onWebcam,
  onImage,
  onVideo
}, forwardedRef) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
  const handleImageClick = () => {
    imageInputRef.current?.click();
    setShowDropdown(false);
  };
  const handleVideoClick = () => {
    videoInputRef.current?.click();
    setShowDropdown(false);
  };
  const handleWebcamClick = () => {
    onWebcam();
    setShowDropdown(false);
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImage(file);
  };
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onVideo(file);
  };
  const getSourceLabel = () => {
    if (sourceType === 'webcam') return 'Webcam';
    if (sourceType === 'image') return 'Image';
    if (sourceType === 'video') return 'Video';
    return 'Select Source';
  };
  const showCanvas = source && isSourceReady;
  return <div className="relative w-full h-full flex items-center justify-center bg-white">
        {showCanvas && <div className="absolute top-6 right-6 z-10">
            <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 backdrop-blur-sm border border-slate-200 transition-colors text-slate-700 text-sm shadow-sm">
              <span>{getSourceLabel()}</span>
              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && <>
                <div className="fixed inset-0" style={{
              zIndex: 9997
            }} onClick={() => setShowDropdown(false)} />
                <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 shadow-xl overflow-hidden" style={{
              zIndex: 9999
            }}>
                  <button onClick={handleWebcamClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-b border-slate-100">
                    <VideoIcon className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                    <span className="text-sm text-slate-700 font-medium">Webcam</span>
                  </button>

                  <button onClick={handleImageClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-b border-slate-100">
                    <ImageIcon className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                    <span className="text-sm text-slate-700 font-medium">Upload Image</span>
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

                  <button onClick={handleVideoClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group">
                    <UploadIcon className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                    <span className="text-sm text-slate-700 font-medium">Upload Video</span>
                  </button>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />

                  <button onClick={onBack} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-t border-slate-100">
                    <span className="text-sm text-slate-700 font-medium">Stop Source</span>
                  </button>
                </div>
              </>}
          </div>}

        <canvas ref={canvasRef} className="max-w-full max-h-full rounded-xl" style={{
      imageRendering: 'auto',
      visibility: showCanvas ? 'visible' : 'hidden',
      opacity: showCanvas ? 1 : 0
    }} />
      </div>;
});
WebGLCanvas.displayName = 'WebGLCanvas';