import { useEffect, useRef, useState, useCallback } from 'react';
import { FilterConfig, BlendMode, NoiseType, ColorChannel, TearMotionType } from '../types';
import { createShaderProgram, createFilterShader } from '../utils/shaders';
import { useFrameBuffer } from './useFrameBuffer';
const BLEND_MODE_MAP: Record<BlendMode, number> = {
  // Normal group
  normal: 0,
  dissolve: 1,
  // Darken group
  darken: 2,
  multiply: 3,
  colorBurn: 4,
  linearBurn: 5,
  darkerColor: 6,
  // Lighten group
  lighten: 7,
  screen: 8,
  colorDodge: 9,
  linearDodge: 10,
  lighterColor: 11,
  // Contrast group
  overlay: 12,
  softLight: 13,
  hardLight: 14,
  vividLight: 15,
  linearLight: 16,
  pinLight: 17,
  hardMix: 18,
  // Comparative group
  difference: 19,
  exclusion: 20,
  subtract: 21,
  divide: 22,
  // HSL group
  hue: 23,
  saturation: 24,
  color: 25,
  luminosity: 26
};
const NOISE_TYPE_MAP: Record<NoiseType, number> = {
  hash: 0,
  value: 1,
  perlin: 2,
  worley: 3
};
const TEAR_MOTION_TYPE_MAP: Record<TearMotionType, number> = {
  instantJump: 0,
  sineWave: 1,
  linear: 2,
  easeIn: 3,
  easeOut: 4,
  easeInOut: 5,
  bounce: 6,
  elastic: 7
};
export function useWebGL(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programsRef = useRef<Map<string, WebGLProgram>>(new Map());
  const texturesRef = useRef<WebGLTexture[]>([]);
  const framebuffersRef = useRef<WebGLFramebuffer[]>([]);
  const patternTexturesRef = useRef<Map<string, WebGLTexture>>(new Map());
  const duplicateTextureRef = useRef<WebGLTexture | null>(null);
  const [isReady, setIsReady] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Frame buffer for duplicate layer
  const frameBuffer = useFrameBuffer({
    maxFrames: 300
  });
  useEffect(() => {
    if (!canvasRef.current) {
      console.error('Canvas ref is null');
      return;
    }
    const gl = canvasRef.current.getContext('webgl2', {
      premultipliedAlpha: false,
      alpha: false,
      preserveDrawingBuffer: false
    });
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    console.log('WebGL2 context created successfully!');
    glRef.current = gl;

    // Create vertex buffer for full-screen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    setIsReady(true);
    return () => {
      programsRef.current.forEach(program => gl.deleteProgram(program));
      texturesRef.current.forEach(texture => gl.deleteTexture(texture));
      framebuffersRef.current.forEach(fb => gl.deleteFramebuffer(fb));
      patternTexturesRef.current.forEach(texture => gl.deleteTexture(texture));
      if (duplicateTextureRef.current) {
        gl.deleteTexture(duplicateTextureRef.current);
      }
    };
  }, [canvasRef]);
  const render = useCallback((source: HTMLImageElement | HTMLVideoElement, filters: FilterConfig[]) => {
    const gl = glRef.current;
    if (!gl || !isReady) return;

    // Determine if source is a webcam (video element without src attribute)
    const isWebcam = source instanceof HTMLVideoElement && !source.src;

    // For video sources, ensure they're playing
    if (source instanceof HTMLVideoElement) {
      if (source.paused) {
        source.play().catch(err => console.error('Failed to play video:', err));
      }
    }
    const canvas = gl.canvas as HTMLCanvasElement;

    // Get source dimensions
    const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth || source.width;
    const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight || source.height;
    
    // Early return if source not ready - but don't clear canvas in this case
    if (sourceWidth === 0 || sourceHeight === 0) {
      // Don't render if dimensions aren't available yet
      return;
    }
    if (source instanceof HTMLVideoElement && source.readyState < 2) {
      // Video not ready yet
      return;
    }
    if (source instanceof HTMLImageElement && !source.complete) return;

    // Get container dimensions from parent element
    const container = canvas.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;
    const aspectRatio = sourceWidth / sourceHeight;
    const containerAspect = containerWidth / containerHeight;
    let renderWidth, renderHeight;
    if (aspectRatio > containerAspect) {
      renderWidth = containerWidth;
      renderHeight = containerWidth / aspectRatio;
    } else {
      renderHeight = containerHeight;
      renderWidth = containerHeight * aspectRatio;
    }

    // Only update canvas size if it changed
    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }
    gl.viewport(0, 0, renderWidth, renderHeight);
    gl.clearColor(1, 1, 1, 1); // Clear to white to match background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Calculate time for noise animation
    const currentTime = (Date.now() - startTimeRef.current) / 1000.0;

    // Add current frame to buffer for duplicate layer (only for video)
    if (source instanceof HTMLVideoElement) {
      frameBuffer.addFrame(source, sourceWidth, sourceHeight);
    }

    // Get or create source texture
    let sourceTexture = texturesRef.current[0];
    if (!sourceTexture) {
      sourceTexture = gl.createTexture()!;
      texturesRef.current[0] = sourceTexture;
    }

    // Upload source texture with UNPACK_FLIP_Y to flip it right-side up
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (err) {
      console.error('Failed to upload texture:', err);
      return;
    }

    // First pass: flip webcam horizontally using passthrough shader
    let currentTexture = sourceTexture;
    if (isWebcam) {
      // Create flipped texture for webcam
      let fb = framebuffersRef.current[0];
      let tex = texturesRef.current[1];
      if (!fb) {
        fb = gl.createFramebuffer()!;
        framebuffersRef.current[0] = fb;
      }
      if (!tex) {
        tex = gl.createTexture()!;
        texturesRef.current[1] = tex;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, renderWidth, renderHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      // Use passthrough shader with flip
      let program = programsRef.current.get('passthrough');
      if (!program) {
        try {
          program = createFilterShader(gl, 'passthrough' as any);
          programsRef.current.set('passthrough', program);
        } catch (err) {
          console.error('Failed to create passthrough shader:', err);
          return;
        }
      }
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
      gl.uniform1f(gl.getUniformLocation(program, 'u_flipHorizontal'), 1.0);
      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Now use the flipped texture as source
      currentTexture = tex;
    }

    // REVERSE the filter order: bottom filters apply first, top filters apply last
    const enabledFilters = filters.filter(f => f.enabled).reverse();
    enabledFilters.forEach((filter, index) => {
      const isLastFilter = index === enabledFilters.length - 1;
      const fbIndex = isWebcam ? index + 1 : index;
      const texIndex = isWebcam ? index + 2 : index + 1;
      let program = programsRef.current.get(filter.type);
      if (!program) {
        try {
          program = createFilterShader(gl, filter.type);
          programsRef.current.set(filter.type, program);
        } catch (err) {
          console.error(`Failed to create shader for ${filter.type}:`, err);
          return;
        }
      }
      gl.useProgram(program);
      if (!isLastFilter) {
        let fb = framebuffersRef.current[fbIndex];
        let tex = texturesRef.current[texIndex];
        if (!fb) {
          fb = gl.createFramebuffer()!;
          framebuffersRef.current[fbIndex] = fb;
        }
        if (!tex) {
          tex = gl.createTexture()!;
          texturesRef.current[texIndex] = tex;
        }
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, renderWidth, renderHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), renderWidth, renderHeight);

      // Set blend mode (skip for filters without blend mode)
      if (filter.type !== 'levels' && filter.type !== 'colorTone' && filter.type !== 'vsyncTears' && filter.type !== 'duplicateLayer') {
        const blendModeValue = BLEND_MODE_MAP[filter.blendMode] ?? 0;
        gl.uniform1i(gl.getUniformLocation(program, 'u_blendMode'), blendModeValue);
      }

      // Set time and noise type uniforms for noise filter
      if (filter.type === 'noise') {
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), currentTime);
        const noiseTypeValue = NOISE_TYPE_MAP[filter.noiseType || 'hash'];
        gl.uniform1i(gl.getUniformLocation(program, 'u_noiseType'), noiseTypeValue);
      }

      // Handle Duplicate Layer filter parameters
      if (filter.type === 'duplicateLayer' && filter.duplicateLayerParams) {
        const params = filter.duplicateLayerParams;
        gl.uniform1i(gl.getUniformLocation(program, 'u_flipHorizontal'), params.flipHorizontal ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(program, 'u_duplicateOpacity'), params.opacity);
        const blendModeValue = BLEND_MODE_MAP[params.blendMode] ?? 0;
        gl.uniform1i(gl.getUniformLocation(program, 'u_duplicateBlendMode'), blendModeValue);
        gl.uniform1i(gl.getUniformLocation(program, 'u_duplicateStackingOrder'), params.stackingOrder);

        // Get delayed frame from buffer
        const delayedFrame = frameBuffer.getDelayedFrame(params.frameOffset);
        if (delayedFrame) {
          // Create or get duplicate texture
          if (!duplicateTextureRef.current) {
            duplicateTextureRef.current = gl.createTexture()!;
          }
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, duplicateTextureRef.current);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, delayedFrame);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.uniform1i(gl.getUniformLocation(program, 'u_duplicateTexture'), 1);
            gl.uniform1i(gl.getUniformLocation(program, 'u_hasDuplicateFrame'), 1);
          } catch (err) {
            console.error('Failed to upload duplicate texture:', err);
            gl.uniform1i(gl.getUniformLocation(program, 'u_hasDuplicateFrame'), 0);
          }
        } else {
          gl.uniform1i(gl.getUniformLocation(program, 'u_hasDuplicateFrame'), 0);
        }
      }

      // Handle Color & Tone filter parameters
      if (filter.type === 'colorTone' && filter.colorToneParams) {
        const channels: ColorChannel[] = ['all', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
        channels.forEach(channel => {
          const params = filter.colorToneParams![channel];
          const prefix = `u_${channel}`;
          gl.uniform1f(gl.getUniformLocation(program, `${prefix}_saturation`), params.saturation);
          gl.uniform1f(gl.getUniformLocation(program, `${prefix}_hue`), params.hue);
          gl.uniform1f(gl.getUniformLocation(program, `${prefix}_tone`), params.tone);
          gl.uniform1f(gl.getUniformLocation(program, `${prefix}_tint`), params.tint);
        });
      }

      // Handle Glow filter parameters
      if (filter.type === 'glow' && filter.glowParams) {
        const params = filter.glowParams;
        gl.uniform1f(gl.getUniformLocation(program, 'u_opacity'), params.opacity);
        gl.uniform1f(gl.getUniformLocation(program, 'u_hueMin'), params.hueMin);
        gl.uniform1f(gl.getUniformLocation(program, 'u_hueMax'), params.hueMax);
        gl.uniform1f(gl.getUniformLocation(program, 'u_lumMin'), params.lumMin);
        gl.uniform1f(gl.getUniformLocation(program, 'u_lumMax'), params.lumMax);
        gl.uniform1f(gl.getUniformLocation(program, 'u_glowColorH'), params.glowColorH);
        gl.uniform1f(gl.getUniformLocation(program, 'u_glowColorS'), params.glowColorS);
        gl.uniform1f(gl.getUniformLocation(program, 'u_glowColorL'), params.glowColorL);
        gl.uniform1f(gl.getUniformLocation(program, 'u_angle'), params.angle);
        gl.uniform1f(gl.getUniformLocation(program, 'u_distance'), params.distance);
        gl.uniform1f(gl.getUniformLocation(program, 'u_blur'), params.blur);
      }

      // Handle Chromatic Aberration filter parameters
      if (filter.type === 'chromaticAberration' && filter.chromaticAberrationParams) {
        const params = filter.chromaticAberrationParams;
        gl.uniform1f(gl.getUniformLocation(program, 'u_amount'), params.amount);
        gl.uniform1f(gl.getUniformLocation(program, 'u_redOffset'), params.redOffset);
        gl.uniform1f(gl.getUniformLocation(program, 'u_greenOffset'), params.greenOffset);
        gl.uniform1f(gl.getUniformLocation(program, 'u_blueOffset'), params.blueOffset);
        gl.uniform1f(gl.getUniformLocation(program, 'u_falloff'), params.falloff);
        gl.uniform1f(gl.getUniformLocation(program, 'u_centerX'), params.centerX);
        gl.uniform1f(gl.getUniformLocation(program, 'u_centerY'), params.centerY);
      }

      // Handle VSync Tears filter parameters
      if (filter.type === 'vsyncTears') {
        // Set time uniform for animation
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), currentTime);
        const params = filter.vsyncTearsParams || {
          tearFrequency: 30,
          tearDuration: 200,
          tearShift: 50,
          tearHeightMin: 5,
          tearHeightAvg: 10,
          tearHeightMax: 15,
          simultaneousTears: 1,
          scrollSpeed: 0,
          tearMotionType: 'sineWave' as TearMotionType,
          tearMotionSpeed: 1.0,
          tearMotionIntensity: 1.0,
          tearMotionPhase: 0
        };
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearFrequency'), params.tearFrequency);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearDuration'), params.tearDuration);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearShift'), params.tearShift);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearHeightMin'), params.tearHeightMin);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearHeightAvg'), params.tearHeightAvg);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearHeightMax'), params.tearHeightMax);
        gl.uniform1f(gl.getUniformLocation(program, 'u_simultaneousTears'), params.simultaneousTears);
        gl.uniform1f(gl.getUniformLocation(program, 'u_scrollSpeed'), params.scrollSpeed);
        const tearMotionTypeValue = TEAR_MOTION_TYPE_MAP[params.tearMotionType];
        gl.uniform1i(gl.getUniformLocation(program, 'u_tearMotionType'), tearMotionTypeValue);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearMotionSpeed'), params.tearMotionSpeed);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearMotionIntensity'), params.tearMotionIntensity);
        gl.uniform1f(gl.getUniformLocation(program, 'u_tearMotionPhase'), params.tearMotionPhase);
      }

      // Handle pattern texture for pattern filter
      if (filter.type === 'pattern') {
        const pParams = filter.patternParams || {
          view: 'patterns',
          opacity: 0.5,
          width: 50,
          height: 50,
          orientation: 'vertical',
          line1Color: '#ffffff',
          line1Thickness: 5,
          line2Color: '#000000',
          line2Thickness: 5
        };

        gl.uniform1i(gl.getUniformLocation(program, 'u_patternView'), pParams.view === 'patterns' ? 0 : 1);
        gl.uniform1f(gl.getUniformLocation(program, 'u_patternOpacity'), pParams.opacity);
        
        if (pParams.view === 'patterns') {
          gl.uniform1f(gl.getUniformLocation(program, 'u_width'), pParams.width);
          gl.uniform1f(gl.getUniformLocation(program, 'u_height'), pParams.height);
          
          const hasPattern = filter.patternImage ? 1.0 : 0.0;
          gl.uniform1f(gl.getUniformLocation(program, 'u_hasPattern'), hasPattern);
          if (filter.patternImage) {
            let patternTexture = patternTexturesRef.current.get(filter.id);
            if (!patternTexture) {
              patternTexture = gl.createTexture()!;
              patternTexturesRef.current.set(filter.id, patternTexture);
            }
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, patternTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, filter.patternImage);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.uniform1i(gl.getUniformLocation(program, 'u_pattern'), 1);
          }
        } else {
          // Lines view
          gl.uniform1i(gl.getUniformLocation(program, 'u_orientation'), pParams.orientation === 'vertical' ? 0 : 1);
          
          // Helper to convert hex to RGB array [r, g, b]
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return [r, g, b];
          };
          
          const rgb1 = hexToRgb(pParams.line1Color);
          const rgb2 = hexToRgb(pParams.line2Color);
          
          gl.uniform3fv(gl.getUniformLocation(program, 'u_line1Color'), new Float32Array(rgb1));
          gl.uniform1f(gl.getUniformLocation(program, 'u_line1Thickness'), pParams.line1Thickness);
          gl.uniform3fv(gl.getUniformLocation(program, 'u_line2Color'), new Float32Array(rgb2));
          gl.uniform1f(gl.getUniformLocation(program, 'u_line2Thickness'), pParams.line2Thickness);
        }
      }

      // Set regular filter parameters
      Object.entries(filter.params).forEach(([key, value]) => {
        const loc = gl.getUniformLocation(program, `u_${key}`);
        if (loc) gl.uniform1f(loc, value);
      });
      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!isLastFilter) {
        currentTexture = texturesRef.current[texIndex];
      }
    });

    // If no filters, just render source (with flip for webcam)
    if (enabledFilters.length === 0) {
      if (isWebcam) {
        // Webcam with no filters: render the flipped texture to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let program = programsRef.current.get('passthrough');
        if (!program) {
          try {
            program = createFilterShader(gl, 'passthrough' as any);
            programsRef.current.set('passthrough', program);
          } catch (err) {
            console.error('Failed to create passthrough shader:', err);
            return;
          }
        }
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
        gl.uniform1f(gl.getUniformLocation(program, 'u_flipHorizontal'), 0.0);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {
        // Non-webcam with no filters: render source directly
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let program = programsRef.current.get('passthrough');
        if (!program) {
          try {
            program = createFilterShader(gl, 'passthrough' as any);
            programsRef.current.set('passthrough', program);
          } catch (err) {
            console.error('Failed to create passthrough shader:', err);
            return;
          }
        }
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
        gl.uniform1f(gl.getUniformLocation(program, 'u_flipHorizontal'), 0.0);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // Remove CSS transform since we're flipping in shader
    canvas.style.transform = '';
  }, [isReady, frameBuffer]);
  return {
    render,
    isReady
  };
}