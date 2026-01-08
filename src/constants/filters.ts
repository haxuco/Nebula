import { FilterType, FilterDefinition, ColorToneParams, ColorToneChannelParams, GlowParams, ChromaticAberrationParams } from '../types';
const defaultChannelParams: ColorToneChannelParams = {
  saturation: 100,
  hue: 0,
  tone: 0,
  tint: 0
};
const defaultColorToneParams: ColorToneParams = {
  all: {
    ...defaultChannelParams
  },
  red: {
    ...defaultChannelParams
  },
  orange: {
    ...defaultChannelParams
  },
  yellow: {
    ...defaultChannelParams
  },
  green: {
    ...defaultChannelParams
  },
  cyan: {
    ...defaultChannelParams
  },
  blue: {
    ...defaultChannelParams
  },
  magenta: {
    ...defaultChannelParams
  }
};
const defaultGlowParams: GlowParams = {
  opacity: 0.3,
  hueMin: 0,
  hueMax: 360,
  lumMin: 230,
  lumMax: 255,
  glowColorH: 328,
  // Hot pink hue
  glowColorS: 100,
  glowColorL: 54,
  angle: 90,
  distance: 0,
  blur: 20
};
const defaultVSyncTearsParams: VSyncTearsParams = {
  tearFrequency: 30,
  tearDuration: 200,
  tearShift: 50,
  tearHeightMin: 5,
  tearHeightAvg: 10,
  tearHeightMax: 15,
  simultaneousTears: 1,
  scrollSpeed: 0,
  tearMotionType: 'sineWave',
  tearMotionSpeed: 1.0,
  tearMotionIntensity: 1.0,
  tearMotionPhase: 0
};
const defaultChromaticAberrationParams: ChromaticAberrationParams = {
  amount: 50,
  redOffset: 5,
  greenOffset: 0,
  blueOffset: -5,
  falloff: 50,
  centerX: 50,
  centerY: 50
};
const defaultDuplicateLayerParams: DuplicateLayerParams = {
  flipHorizontal: true,
  // Default to flipped
  blendMode: 'normal',
  frameOffset: -30,
  // 1 second behind at 30fps
  stackingOrder: 0,
  // Source on top
  opacity: 50
};
export const FILTER_DEFINITIONS: Record<FilterType, FilterDefinition> = {
  blur: {
    type: 'blur',
    name: 'Blur',
    description: 'Apply gaussian blur',
    defaultParams: {
      radius: 5.0
    },
    paramRanges: {
      radius: {
        min: 0,
        max: 20,
        step: 0.5,
        label: 'Radius'
      }
    }
  },
  mosaic: {
    type: 'mosaic',
    name: 'Mosaic Grid',
    description: 'Pixelate image into mosaic cells',
    defaultParams: {
      opacity: 1.0,
      width: 20,
      height: 20
    },
    paramRanges: {
      opacity: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Opacity'
      },
      width: {
        min: 2,
        max: 200,
        step: 1,
        label: 'Width'
      },
      height: {
        min: 2,
        max: 200,
        step: 1,
        label: 'Height'
      }
    }
  },
  pattern: {
    type: 'pattern',
    name: 'Pattern Overlay',
    description: 'Tile a pattern image across the canvas',
    defaultParams: {
      opacity: 0.5,
      width: 50,
      height: 50
    },
    paramRanges: {
      opacity: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Opacity'
      },
      width: {
        min: 2,
        max: 200,
        step: 1,
        label: 'Tile Width'
      },
      height: {
        min: 2,
        max: 200,
        step: 1,
        label: 'Tile Height'
      }
    },
    requiresImage: true
  },
  cmyk: {
    type: 'cmyk',
    name: 'CMYK Channels',
    description: 'Adjust CMYK color channel opacity',
    defaultParams: {
      cyan: 1.0,
      magenta: 1.0,
      yellow: 1.0,
      black: 1.0
    },
    paramRanges: {
      cyan: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Cyan'
      },
      magenta: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Magenta'
      },
      yellow: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Yellow'
      },
      black: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Black'
      }
    }
  },
  levels: {
    type: 'levels',
    name: 'Levels',
    description: 'Adjust tonal range and contrast',
    defaultParams: {
      inputBlack: 0,
      inputWhite: 255,
      gamma: 1.0,
      outputBlack: 0,
      outputWhite: 255
    },
    paramRanges: {
      inputBlack: {
        min: 0,
        max: 255,
        step: 1,
        label: 'Input Black'
      },
      inputWhite: {
        min: 0,
        max: 255,
        step: 1,
        label: 'Input White'
      },
      gamma: {
        min: 0.1,
        max: 9.99,
        step: 0.01,
        label: 'Gamma'
      },
      outputBlack: {
        min: 0,
        max: 255,
        step: 1,
        label: 'Output Black'
      },
      outputWhite: {
        min: 0,
        max: 255,
        step: 1,
        label: 'Output White'
      }
    },
    customUI: true,
    noBlendMode: true
  },
  noise: {
    type: 'noise',
    name: 'Noise',
    description: 'Add film grain and texture',
    defaultParams: {
      opacity: 1.0,
      intensity: 0.3,
      size: 1.8,
      speed: 2.0,
      saturation: 0.2
    },
    paramRanges: {
      opacity: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Opacity'
      },
      intensity: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Intensity'
      },
      size: {
        min: 0.3,
        max: 8,
        step: 0.1,
        label: 'Size'
      },
      speed: {
        min: 0,
        max: 5,
        step: 0.01,
        label: 'Speed'
      },
      saturation: {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Saturation'
      }
    },
    defaultNoiseType: 'hash',
    isBaseFilter: true
  },
  colorTone: {
    type: 'colorTone',
    name: 'Color & Tone',
    description: 'Adjust color and tone per channel',
    defaultParams: {},
    paramRanges: {},
    customUI: true,
    noBlendMode: true,
    defaultColorToneParams: defaultColorToneParams
  },
  glow: {
    type: 'glow',
    name: 'Glow',
    description: 'Add selective glow to colors and luminosity',
    defaultParams: {},
    paramRanges: {},
    customUI: true,
    noBlendMode: false,
    defaultGlowParams: defaultGlowParams
  },
  vsyncTears: {
    type: 'vsyncTears',
    name: 'VSync Tears',
    description: 'Simulate VSync tearing with motion control',
    defaultParams: {},
    paramRanges: {},
    customUI: true,
    noBlendMode: true,
    defaultVSyncTearsParams: defaultVSyncTearsParams
  },
  chromaticAberration: {
    type: 'chromaticAberration',
    name: 'Chromatic Aberration',
    description: 'Simulate lens chromatic aberration with RGB channel separation',
    defaultParams: {},
    paramRanges: {},
    customUI: true,
    noBlendMode: false,
    defaultChromaticAberrationParams: defaultChromaticAberrationParams
  },
  duplicateLayer: {
    type: 'duplicateLayer',
    name: 'Duplicate Layer',
    description: 'Time-delayed video layer with blend modes',
    defaultParams: {},
    paramRanges: {},
    customUI: true,
    noBlendMode: true,
    // Has its own blend mode control
    isBaseFilter: true,
    defaultDuplicateLayerParams: defaultDuplicateLayerParams
  }
};