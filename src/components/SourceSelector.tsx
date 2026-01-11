import React, { useRef, useState } from 'react';
import { VideoIcon, ImageIcon, UploadIcon, ChevronDownIcon } from 'lucide-react';
interface SourceSelectorProps {
  onWebcam: () => void;
  onImage: (file: File) => void;
  onVideo: (file: File) => void;
  hasSource: boolean;
}
export function SourceSelector({
  onWebcam,
  onImage,
  onVideo,
  hasSource
}: SourceSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
  return <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 transition-colors text-left group shadow-sm">
        <div className="flex items-center gap-3">
          <VideoIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-slate-700 font-medium">Select Source</span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && <>
          <div className="fixed inset-0" style={{
        zIndex: 9997
      }} onClick={() => setShowDropdown(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl overflow-hidden" style={{
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
          </div>
        </>}
    </div>;
}