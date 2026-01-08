import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaSource, SourceType } from '../types';
export function useMediaSource() {
  const [source, setSource] = useState<MediaSource>({
    type: 'none'
  });
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Create hidden container for video elements
  useEffect(() => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
    containerRef.current = container;
    return () => {
      if (containerRef.current && document.body.contains(containerRef.current)) {
        document.body.removeChild(containerRef.current);
      }
    };
  }, []);
  const startWebcam = useCallback(async () => {
    try {
      setError(null);
      setIsReady(false);
      console.log('Requesting webcam access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 1920
          },
          height: {
            ideal: 1080
          },
          facingMode: 'user'
        }
      });
      console.log('Webcam stream obtained');
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;

      // Add to hidden container
      if (containerRef.current) {
        containerRef.current.appendChild(video);
        console.log('Video element added to DOM');
      }

      // Wait for video to be ready with actual data
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const checkReady = () => {
          if (resolved) return;
          console.log('Checking video ready state:', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            paused: video.paused
          });

          // Check if video has valid dimensions and is playing
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            resolved = true;
            videoRef.current = video;
            console.log('Video ready! Dimensions:', video.videoWidth, 'x', video.videoHeight);
            setSource({
              type: 'webcam',
              stream,
              element: video
            });
            setIsReady(true);
            resolve();
          }
        };
        video.addEventListener('loadeddata', () => {
          console.log('loadeddata event fired');
          checkReady();
        });
        video.addEventListener('canplay', () => {
          console.log('canplay event fired');
          checkReady();
        });
        video.addEventListener('playing', () => {
          console.log('playing event fired');
          checkReady();
        });
        video.onerror = e => {
          console.error('Video error:', e);
          if (!resolved) {
            resolved = true;
            reject(new Error('Video load failed'));
          }
        };

        // Start playing
        console.log('Starting video playback...');
        video.play().then(() => {
          console.log('Video play() succeeded');
          setTimeout(checkReady, 100);
        }).catch(err => {
          console.error('Video play() failed:', err);
          reject(err);
        });

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            console.log('Timeout reached, forcing ready check');
            checkReady();
            if (!resolved) {
              console.error('Video failed to become ready within timeout');
              reject(new Error('Video load timeout'));
            }
          }
        }, 3000);
      });
    } catch (err) {
      console.error('Webcam error:', err);
      setError('Failed to access webcam. Please check permissions.');
      setIsReady(false);
    }
  }, []);
  const loadImage = useCallback((file: File) => {
    setError(null);
    setIsReady(false);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        imageRef.current = img;
        setSource({
          type: 'image',
          element: img
        });
        setIsReady(true);
      } else {
        setError('Invalid image dimensions');
        setIsReady(false);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError('Failed to load image');
      setIsReady(false);
      URL.revokeObjectURL(url);
    };
    img.crossOrigin = 'anonymous';
    img.src = url;
  }, []);
  const loadVideo = useCallback((file: File) => {
    setError(null);
    setIsReady(false);
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.onloadeddata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        videoRef.current = video;
        video.loop = true;
        video.muted = true;
        video.play().then(() => {
          setSource({
            type: 'video',
            element: video
          });
          setIsReady(true);
        }).catch(err => {
          setError('Failed to play video');
          setIsReady(false);
          console.error('Video play error:', err);
        });
      } else {
        setError('Invalid video dimensions');
        setIsReady(false);
      }
    };
    video.onerror = () => {
      setError('Failed to load video');
      setIsReady(false);
      URL.revokeObjectURL(url);
    };

    // Add to hidden container
    if (containerRef.current) {
      containerRef.current.appendChild(video);
    }
    video.src = url;
    video.load();
  }, []);
  const stopSource = useCallback(() => {
    if (source.stream) {
      source.stream.getTracks().forEach(track => track.stop());
    }

    // Clean up video elements
    if (videoRef.current && containerRef.current?.contains(videoRef.current)) {
      containerRef.current.removeChild(videoRef.current);
    }
    videoRef.current = null;
    imageRef.current = null;
    setSource({
      type: 'none'
    });
    setIsReady(false);
  }, [source]);
  useEffect(() => {
    return () => {
      if (source.stream) {
        source.stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && containerRef.current?.contains(videoRef.current)) {
        try {
          containerRef.current.removeChild(videoRef.current);
        } catch (e) {
          // Element might already be removed
        }
      }
    };
  }, [source]);
  return {
    source,
    error,
    isReady,
    startWebcam,
    loadImage,
    loadVideo,
    stopSource
  };
}