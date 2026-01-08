export type FilterType = 'blur' | 'mosaic' | 'pattern' | 'cmyk' | 'levels' | 'noise' | 'colorTone' | 'glow' | 'vsyncTears' | 'chromaticAberration' | 'duplicateLayer';
export type NoiseType = 'hash' | 'value' | 'perlin' | 'worley';
export type ColorChannel = 'all' | 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'magenta';
export type BlendMode =
// Normal group
'normal' | 'dissolve'
// Darken group
| 'darken' | 'multiply' | 'colorBurn' | 'linearBurn' | 'darkerColor'
// Lighten group
| 'lighten' | 'screen' | 'colorDodge' | 'linearDodge' | 'lighterColor'
// Contrast group
| 'overlay' | 'softLight' | 'hardLight' | 'vividLight' | 'linearLight' | 'pinLight' | 'hardMix'
// Comparative group
| 'difference' | 'exclusion' | 'subtract' | 'divide'
// HSL group
| 'hue' | 'saturation' | 'color' | 'luminosity';
export type TearMotionType = 'instantJump' | 'sineWave' | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
export interface ColorToneChannelParams {
  saturation: number; // 0-200, default 100
  hue: number; // -180 to 180, default 0
  tone: number; // -100 to 100, default 0 (temperature: blue to orange)
  tint: number; // -100 to 100, default 0 (green to magenta)
}
export interface ColorToneParams {
  all: ColorToneChannelParams;
  red: ColorToneChannelParams;
  orange: ColorToneChannelParams;
  yellow: ColorToneChannelParams;
  green: ColorToneChannelParams;
  cyan: ColorToneChannelParams;
  blue: ColorToneChannelParams;
  magenta: ColorToneChannelParams;
}
export interface GlowParams {
  opacity: number; // 0-1, default 0.3
  hueMin: number; // 0-360, default 0
  hueMax: number; // 0-360, default 360
  lumMin: number; // 0-255, default 230
  lumMax: number; // 0-255, default 255
  glowColorH: number; // 0-360, hue of glow color
  glowColorS: number; // 0-100, saturation of glow color
  glowColorL: number; // 0-100, lightness of glow color
  angle: number; // 0-360, default 90
  distance: number; // 0-350, default 0
  blur: number; // 0-100, default 20
}
export interface VSyncTearsParams {
  tearFrequency: number; // 0-500
  tearDuration: number; // 50-1000ms
  tearShift: number; // 0-300 pixels
  tearHeightMin: number; // 0.1-100 (percentage of screen height)
  tearHeightAvg: number; // 0.1-100 (percentage of screen height)
  tearHeightMax: number; // 0.1-100 (percentage of screen height)
  simultaneousTears: number; // 1-100
  scrollSpeed: number; // 0-10 (vertical scroll speed, 0 = stationary, 10 = 1 screen/sec)
  tearMotionType: TearMotionType;
  tearMotionSpeed: number; // 0.1-5.0
  tearMotionIntensity: number; // 0.0-2.0
  tearMotionPhase: number; // 0-360 degrees
}
export interface ChromaticAberrationParams {
  amount: number; // 0-100 (intensity of the effect)
  redOffset: number; // -100 to 100 (horizontal offset for red channel)
  greenOffset: number; // -100 to 100 (horizontal offset for green channel)
  blueOffset: number; // -100 to 100 (horizontal offset for blue channel)
  falloff: number; // 0-100 (how much the effect falls off from center)
  centerX: number; // 0-100 (horizontal center point, percentage)
  centerY: number; // 0-100 (vertical center point, percentage)
}
export interface DuplicateLayerParams {
  flipHorizontal: boolean; // Flip the duplicate layer horizontally
  blendMode: BlendMode; // Blend mode for compositing
  frameOffset: number; // Time delay in frames (-300 to 300)
  stackingOrder: 0 | 1; // 0 = source on top, 1 = duplicate on top
  opacity: number; // 0-100
}
export interface FilterConfig {
  id: string;
  type: FilterType;
  enabled: boolean;
  params: Record<string, number>;
  patternImage?: HTMLImageElement;
  blendMode: BlendMode;
  noiseType?: NoiseType;
  colorToneParams?: ColorToneParams;
  activeColorChannel?: ColorChannel;
  glowParams?: GlowParams;
  vsyncTearsParams?: VSyncTearsParams;
  chromaticAberrationParams?: ChromaticAberrationParams;
  duplicateLayerParams?: DuplicateLayerParams;
  linkedDimensions?: string[]; // Array of filter IDs that this filter's dimensions are linked to
  groupId?: string; // ID of the base filter this filter is grouped under
  groupedFilters?: string[]; // Array of filter IDs grouped under this base filter (only for base filters)
}
export interface FilterDefinition {
  type: FilterType;
  name: string;
  description: string;
  defaultParams: Record<string, number>;
  paramRanges: Record<string, {
    min: number;
    max: number;
    step: number;
    label: string;
  }>;
  requiresImage?: boolean;
  customUI?: boolean;
  noBlendMode?: boolean;
  isBaseFilter?: boolean; // Marks this filter as a base filter with grouping capabilities
  defaultNoiseType?: NoiseType;
  defaultColorToneParams?: ColorToneParams;
  defaultGlowParams?: GlowParams;
  defaultVSyncTearsParams?: VSyncTearsParams;
  defaultChromaticAberrationParams?: ChromaticAberrationParams;
  defaultDuplicateLayerParams?: DuplicateLayerParams;
}
export type SourceType = 'none' | 'webcam' | 'image' | 'video';
export interface MediaSource {
  type: SourceType;
  stream?: MediaStream;
  element?: HTMLImageElement | HTMLVideoElement;
}
export interface BlendModePreview {
  filterId: string;
  blendMode: BlendMode;
}
export interface NoiseTypePreview {
  filterId: string;
  noiseType: NoiseType;
}
export interface DimensionLinkState {
  sourceFilterId: string;
  isSelecting: boolean;
  cursorPosition: {
    x: number;
    y: number;
  } | null;
}
export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  // Normal group
  normal: 'Normal',
  dissolve: 'Dissolve',
  // Darken group
  darken: 'Darken',
  multiply: 'Multiply',
  colorBurn: 'Color Burn',
  linearBurn: 'Linear Burn',
  darkerColor: 'Darker Color',
  // Lighten group
  lighten: 'Lighten',
  screen: 'Screen',
  colorDodge: 'Color Dodge',
  linearDodge: 'Linear Dodge (Add)',
  lighterColor: 'Lighter Color',
  // Contrast group
  overlay: 'Overlay',
  softLight: 'Soft Light',
  hardLight: 'Hard Light',
  vividLight: 'Vivid Light',
  linearLight: 'Linear Light',
  pinLight: 'Pin Light',
  hardMix: 'Hard Mix',
  // Comparative group
  difference: 'Difference',
  exclusion: 'Exclusion',
  subtract: 'Subtract',
  divide: 'Divide',
  // HSL group
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity'
};
export const BLEND_MODE_GROUPS = {
  Normal: ['normal', 'dissolve'],
  Darken: ['darken', 'multiply', 'colorBurn', 'linearBurn', 'darkerColor'],
  Lighten: ['lighten', 'screen', 'colorDodge', 'linearDodge', 'lighterColor'],
  Contrast: ['overlay', 'softLight', 'hardLight', 'vividLight', 'linearLight', 'pinLight', 'hardMix'],
  Comparative: ['difference', 'exclusion', 'subtract', 'divide'],
  HSL: ['hue', 'saturation', 'color', 'luminosity']
} as const;
export const NOISE_TYPE_LABELS: Record<NoiseType, string> = {
  hash: 'Hash (Film Grain)',
  value: 'Value (Smooth)',
  perlin: 'Perlin (Organic)',
  worley: 'Worley (Cellular)'
};
export const NOISE_TYPE_DESCRIPTIONS: Record<NoiseType, string> = {
  hash: 'Sharp, crispy grain - perfect for film grain and sensor noise',
  value: 'Smooth, general-purpose noise with soft gradients',
  perlin: 'Organic, flowing patterns - great for clouds and smoke',
  worley: 'Cellular, honeycomb patterns - ideal for textures'
};
export const COLOR_CHANNEL_LABELS: Record<ColorChannel, string> = {
  all: 'All',
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  cyan: 'Cyan',
  blue: 'Blue',
  magenta: 'Magenta'
};
export const COLOR_CHANNEL_COLORS: Record<ColorChannel, string> = {
  all: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)',
  red: '#ff6b6b',
  orange: '#ffa94d',
  yellow: '#ffd43b',
  green: '#51cf66',
  cyan: '#4dabf7',
  blue: '#748ffc',
  magenta: '#da77f2'
};
export const TEAR_MOTION_TYPE_LABELS: Record<TearMotionType, string> = {
  instantJump: 'Instant Jump',
  sineWave: 'Sine Wave',
  linear: 'Linear',
  easeIn: 'Ease In',
  easeOut: 'Ease Out',
  easeInOut: 'Ease In-Out',
  bounce: 'Bounce',
  elastic: 'Elastic'
};
export const TEAR_MOTION_TYPE_DESCRIPTIONS: Record<TearMotionType, string> = {
  instantJump: 'Binary on/off, no transition - harsh digital glitches',
  sineWave: 'Smooth oscillation - natural VHS/analog artifacts',
  linear: 'Constant speed movement - mechanical, robotic tears',
  easeIn: 'Slow start, accelerates - building tension',
  easeOut: 'Fast start, decelerates - impact, settling',
  easeInOut: 'Smooth acceleration/deceleration - polished, cinematic',
  bounce: 'Elastic bounce effect - playful, exaggerated glitches',
  elastic: 'Spring overshoot - dynamic, energetic tears'
};