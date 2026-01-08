import React, { useRef } from 'react';
import { VideoIcon, ImageIcon, UploadIcon } from 'lucide-react';
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const handleImageClick = () => imageInputRef.current?.click();
  const handleVideoClick = () => videoInputRef.current?.click();
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImage(file);
  };
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onVideo(file);
  };
  return <div className="space-y-3">
      <h3 className="text-sm font-medium text-purple-300 uppercase tracking-wider">
        Source
      </h3>

      <div className="space-y-2">
        <button onClick={onWebcam} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg transition-colors text-left group">
          <VideoIcon className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
          <span className="text-sm text-slate-200">Webcam</span>
        </button>

        <button onClick={handleImageClick} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg transition-colors text-left group">
          <ImageIcon className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
          <span className="text-sm text-slate-200">Upload Image</span>
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

        <button onClick={handleVideoClick} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg transition-colors text-left group">
          <UploadIcon className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
          <span className="text-sm text-slate-200">Upload Video</span>
        </button>
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
      </div>
    </div>;
}