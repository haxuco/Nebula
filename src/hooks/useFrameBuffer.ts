import { useRef, useCallback } from 'react';
interface FrameBufferOptions {
  maxFrames?: number;
}
export function useFrameBuffer(options: FrameBufferOptions = {}) {
  const {
    maxFrames = 300
  } = options; // 10 seconds at 30fps

  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const canvasPoolRef = useRef<HTMLCanvasElement[]>([]);
  const addFrame = useCallback((source: HTMLImageElement | HTMLVideoElement, width: number, height: number) => {
    // Get or create canvas from pool
    let canvas = canvasPoolRef.current.pop();
    if (!canvas) {
      canvas = document.createElement('canvas');
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', {
      willReadFrequently: false
    });
    if (!ctx) return;

    // Draw current frame
    ctx.drawImage(source, 0, 0, width, height);

    // Add to buffer
    framesRef.current.push(canvas);

    // Remove old frames if buffer is full
    if (framesRef.current.length > maxFrames) {
      const oldCanvas = framesRef.current.shift();
      if (oldCanvas) {
        // Return to pool for reuse
        canvasPoolRef.current.push(oldCanvas);
      }
    }
  }, [maxFrames]);
  const getDelayedFrame = useCallback((frameOffset: number): HTMLCanvasElement | null => {
    if (frameOffset === 0) return null;
    const index = framesRef.current.length - 1 - Math.abs(frameOffset);
    if (index >= 0 && index < framesRef.current.length) {
      return framesRef.current[index];
    }
    return null;
  }, []);
  const clear = useCallback(() => {
    // Return all frames to pool
    canvasPoolRef.current.push(...framesRef.current);
    framesRef.current = [];
  }, []);
  const getBufferSize = useCallback(() => {
    return framesRef.current.length;
  }, []);
  return {
    addFrame,
    getDelayedFrame,
    clear,
    getBufferSize
  };
}