import { FilterType } from '../types';
const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}
`;

// Passthrough shader now supports horizontal flip
const passthroughShader = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform float u_flipHorizontal;

void main() {
  vec2 texCoord = v_texCoord;
  if (u_flipHorizontal > 0.5) {
    texCoord.x = 1.0 - texCoord.x;
  }
  outColor = texture(u_texture, texCoord);
}
`;

// Helper functions for HSL blend modes
const hslHelpers = `
vec3 rgb2hsl(vec3 color) {
  float maxC = max(max(color.r, color.g), color.b);
  float minC = min(min(color.r, color.g), color.b);
  float delta = maxC - minC;
  
  float h = 0.0;
  float s = 0.0;
  float l = (maxC + minC) / 2.0;
  
  if (delta > 0.0001) {
    s = l < 0.5 ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);
    
    if (maxC == color.r) {
      h = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
    } else if (maxC == color.g) {
      h = (color.b - color.r) / delta + 2.0;
    } else {
      h = (color.r - color.g) / delta + 4.0;
    }
    h /= 6.0;
  }
  
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  
  if (s == 0.0) {
    return vec3(l);
  }
  
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

float luminosity(vec3 color) {
  return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

// Random function for dissolve mode
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
`;

// High-quality hash function for noise generation (no tiling)
const noiseHelpers = `
// Hash function for true random noise (based on reference article)
// This creates non-repeating noise by using multiple hash operations
float hash(vec2 p) {
  // Use a combination of sine and large primes to create pseudo-random values
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

// Multi-octave hash for even better randomness
float hash13(vec3 p3) {
  p3 = fract(p3 * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

// Generate noise value at a given position with time seed
float noise(vec2 pos, float time) {
  // Add time as third dimension to prevent tiling
  vec3 p = vec3(pos, time);
  return hash13(p);
}

// Generate color noise (RGB channels with different seeds)
vec3 colorNoise(vec2 pos, float time) {
  return vec3(
    hash13(vec3(pos, time)),
    hash13(vec3(pos, time + 123.456)),
    hash13(vec3(pos, time + 789.012))
  );
}

// Value noise - smooth interpolated random values (NOT hash-based)
// This creates much smoother, cloud-like patterns
float valueNoise(vec2 pos, float time) {
  vec2 i = floor(pos);
  vec2 f = fract(pos);
  
  // Quintic interpolation for extra smoothness (different from hash)
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  
  // Sample corners with time-based seed
  float a = hash13(vec3(i, time));
  float b = hash13(vec3(i + vec2(1.0, 0.0), time));
  float c = hash13(vec3(i + vec2(0.0, 1.0), time));
  float d = hash13(vec3(i + vec2(1.0, 1.0), time));
  
  // Bilinear interpolation with quintic curve
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Value color noise - much smoother than hash
vec3 valueColorNoise(vec2 pos, float time) {
  return vec3(
    valueNoise(pos, time),
    valueNoise(pos + vec2(43.21, 0.0), time),
    valueNoise(pos + vec2(0.0, 87.65), time)
  );
}

// Smooth noise with interpolation for larger grain sizes (hash-based)
float smoothNoise(vec2 pos, float time) {
  vec2 i = floor(pos);
  vec2 f = fract(pos);
  
  // Smooth interpolation (smoothstep)
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  // Sample corners
  float a = hash13(vec3(i, time));
  float b = hash13(vec3(i + vec2(1.0, 0.0), time));
  float c = hash13(vec3(i + vec2(0.0, 1.0), time));
  float d = hash13(vec3(i + vec2(1.0, 1.0), time));
  
  // Bilinear interpolation
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Smooth color noise with interpolation
vec3 smoothColorNoise(vec2 pos, float time) {
  return vec3(
    smoothNoise(pos, time),
    smoothNoise(pos, time + 123.456),
    smoothNoise(pos, time + 789.012)
  );
}
`;

// Complete Photoshop blend mode functions
const blendModeFunctions = `
${hslHelpers}

// Normal group
vec3 blendNormal(vec3 base, vec3 blend) {
  return blend;
}

vec3 blendDissolve(vec3 base, vec3 blend, vec2 coord, float opacity) {
  float rand = random(coord * 1000.0);
  return rand < opacity ? blend : base;
}

// Darken group
vec3 blendDarken(vec3 base, vec3 blend) {
  return min(base, blend);
}

vec3 blendMultiply(vec3 base, vec3 blend) {
  return base * blend;
}

vec3 blendColorBurn(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) / (blend + 0.001);
}

vec3 blendLinearBurn(vec3 base, vec3 blend) {
  return max(base + blend - 1.0, 0.0);
}

vec3 blendDarkerColor(vec3 base, vec3 blend) {
  float baseLum = luminosity(base);
  float blendLum = luminosity(blend);
  return blendLum < baseLum ? blend : base;
}

// Lighten group
vec3 blendLighten(vec3 base, vec3 blend) {
  return max(base, blend);
}

vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blendColorDodge(vec3 base, vec3 blend) {
  return base / (1.0 - blend + 0.001);
}

vec3 blendLinearDodge(vec3 base, vec3 blend) {
  return min(base + blend, 1.0);
}

vec3 blendLighterColor(vec3 base, vec3 blend) {
  float baseLum = luminosity(base);
  float blendLum = luminosity(blend);
  return blendLum > baseLum ? blend : base;
}

// Contrast group
vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend,
    1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
    step(0.5, base)
  );
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
    sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
    step(0.5, blend)
  );
}

vec3 blendHardLight(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend,
    1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
    step(0.5, blend)
  );
}

vec3 blendVividLight(vec3 base, vec3 blend) {
  return mix(
    1.0 - (1.0 - base) / (2.0 * blend + 0.001),
    base / (2.0 * (1.0 - blend) + 0.001),
    step(0.5, blend)
  );
}

vec3 blendLinearLight(vec3 base, vec3 blend) {
  return base + 2.0 * blend - 1.0;
}

vec3 blendPinLight(vec3 base, vec3 blend) {
  return mix(
    min(base, 2.0 * blend),
    max(base, 2.0 * (blend - 0.5)),
    step(0.5, blend)
  );
}

vec3 blendHardMix(vec3 base, vec3 blend) {
  vec3 sum = base + blend;
  return step(1.0, sum);
}

// Comparative group
vec3 blendDifference(vec3 base, vec3 blend) {
  return abs(base - blend);
}

vec3 blendExclusion(vec3 base, vec3 blend) {
  return base + blend - 2.0 * base * blend;
}

vec3 blendSubtract(vec3 base, vec3 blend) {
  return max(base - blend, 0.0);
}

vec3 blendDivide(vec3 base, vec3 blend) {
  return base / (blend + 0.001);
}

// HSL group
vec3 blendHue(vec3 base, vec3 blend) {
  vec3 baseHSL = rgb2hsl(base);
  vec3 blendHSL = rgb2hsl(blend);
  return hsl2rgb(vec3(blendHSL.x, baseHSL.y, baseHSL.z));
}

vec3 blendSaturation(vec3 base, vec3 blend) {
  vec3 baseHSL = rgb2hsl(base);
  vec3 blendHSL = rgb2hsl(blend);
  return hsl2rgb(vec3(baseHSL.x, blendHSL.y, baseHSL.z));
}

vec3 blendColor(vec3 base, vec3 blend) {
  vec3 baseHSL = rgb2hsl(base);
  vec3 blendHSL = rgb2hsl(blend);
  return hsl2rgb(vec3(blendHSL.x, blendHSL.y, baseHSL.z));
}

vec3 blendLuminosity(vec3 base, vec3 blend) {
  vec3 baseHSL = rgb2hsl(base);
  vec3 blendHSL = rgb2hsl(blend);
  return hsl2rgb(vec3(baseHSL.x, baseHSL.y, blendHSL.z));
}

vec3 applyBlendMode(int mode, vec3 base, vec3 blend, vec2 coord, float opacity) {
  // Normal group
  if (mode == 0) return blendNormal(base, blend);
  if (mode == 1) return blendDissolve(base, blend, coord, opacity);
  
  // Darken group
  if (mode == 2) return blendDarken(base, blend);
  if (mode == 3) return blendMultiply(base, blend);
  if (mode == 4) return blendColorBurn(base, blend);
  if (mode == 5) return blendLinearBurn(base, blend);
  if (mode == 6) return blendDarkerColor(base, blend);
  
  // Lighten group
  if (mode == 7) return blendLighten(base, blend);
  if (mode == 8) return blendScreen(base, blend);
  if (mode == 9) return blendColorDodge(base, blend);
  if (mode == 10) return blendLinearDodge(base, blend);
  if (mode == 11) return blendLighterColor(base, blend);
  
  // Contrast group
  if (mode == 12) return blendOverlay(base, blend);
  if (mode == 13) return blendSoftLight(base, blend);
  if (mode == 14) return blendHardLight(base, blend);
  if (mode == 15) return blendVividLight(base, blend);
  if (mode == 16) return blendLinearLight(base, blend);
  if (mode == 17) return blendPinLight(base, blend);
  if (mode == 18) return blendHardMix(base, blend);
  
  // Comparative group
  if (mode == 19) return blendDifference(base, blend);
  if (mode == 20) return blendExclusion(base, blend);
  if (mode == 21) return blendSubtract(base, blend);
  if (mode == 22) return blendDivide(base, blend);
  
  // HSL group
  if (mode == 23) return blendHue(base, blend);
  if (mode == 24) return blendSaturation(base, blend);
  if (mode == 25) return blendColor(base, blend);
  if (mode == 26) return blendLuminosity(base, blend);
  
  return blend; // fallback to normal
}
`;

// CMYK U.S. Web Coated (SWOP) v2 conversion functions
const cmykFunctions = `
// sRGB to linear RGB conversion (gamma 2.2)
vec3 srgb_to_linear(vec3 srgb) {
  vec3 linear;
  linear.r = (srgb.r <= 0.04045) ? srgb.r / 12.92 : pow((srgb.r + 0.055) / 1.055, 2.4);
  linear.g = (srgb.g <= 0.04045) ? srgb.g / 12.92 : pow((srgb.g + 0.055) / 1.055, 2.4);
  linear.b = (srgb.b <= 0.04045) ? srgb.b / 12.92 : pow((srgb.b + 0.055) / 1.055, 2.4);
  return linear;
}

// Linear RGB to sRGB conversion (gamma 2.2)
vec3 linear_to_srgb(vec3 linear) {
  vec3 srgb;
  srgb.r = (linear.r <= 0.0031308) ? linear.r * 12.92 : 1.055 * pow(linear.r, 1.0 / 2.4) - 0.055;
  srgb.g = (linear.g <= 0.0031308) ? linear.g * 12.92 : 1.055 * pow(linear.g, 1.0 / 2.4) - 0.055;
  srgb.b = (linear.b <= 0.0031308) ? linear.b * 12.92 : 1.055 * pow(linear.b, 1.0 / 2.4) - 0.055;
  return clamp(srgb, 0.0, 1.0);
}

// SWOP v2 dot gain curve - simulates ink spread on paper
// Applied during CMYK to RGB to simulate printed appearance
float apply_swop_dot_gain(float value) {
  // SWOP v2 characteristic curve - approximately 18-20% gain at 50%
  // More gain in midtones, less in highlights and shadows
  float gain = 0.18 * sin(3.14159 * value);
  return clamp(value + gain * value * (1.0 - value), 0.0, 1.0);
}

// RGB to CMYK using SWOP v2 profile characteristics
vec4 rgb_to_cmyk_swop(vec3 rgb) {
  // Convert sRGB to linear RGB for accurate color math
  vec3 linear = srgb_to_linear(rgb);
  
  // Calculate initial CMY values (subtractive color)
  float c = 1.0 - linear.r;
  float m = 1.0 - linear.g;
  float y = 1.0 - linear.b;
  
  // SWOP v2 black generation - Medium GCR (Gray Component Replacement)
  // Start with minimum of CMY as black candidate
  float k_candidate = min(min(c, m), y);
  
  // Apply SWOP v2 black generation curve
  // Medium GCR: use about 70% of maximum possible black
  // This balances ink usage with shadow detail
  float k = k_candidate * 0.70;
  
  // Under Color Removal (UCR) - remove CMY where K is present
  // SWOP v2 uses moderate UCR to reduce ink consumption
  if (k > 0.001) {
    // Remove equivalent amount of CMY based on K
    // Use 100% UCR for accurate color separation
    c = max(0.0, c - k);
    m = max(0.0, m - k);
    y = max(0.0, y - k);
  }
  
  // Total Ink Limit (TIL) for SWOP v2 is 300%
  float total_ink = c + m + y + k;
  if (total_ink > 3.0) {
    float scale = 3.0 / total_ink;
    c *= scale;
    m *= scale;
    y *= scale;
    k *= scale;
  }
  
  return vec4(c, m, y, k);
}

// CMYK to RGB using SWOP v2 profile characteristics
vec3 cmyk_to_rgb_swop(vec4 cmyk) {
  float c = cmyk.x;
  float m = cmyk.y;
  float y = cmyk.z;
  float k = cmyk.w;
  
  // Apply SWOP v2 dot gain to simulate printed appearance
  // This darkens the output to match how ink spreads on paper
  c = apply_swop_dot_gain(c);
  m = apply_swop_dot_gain(m);
  y = apply_swop_dot_gain(y);
  k = apply_swop_dot_gain(k);
  
  // Standard CMYK to RGB conversion
  // The (1-k) factor accounts for black reducing all colors
  vec3 linear;
  linear.r = (1.0 - c) * (1.0 - k);
  linear.g = (1.0 - m) * (1.0 - k);
  linear.b = (1.0 - y) * (1.0 - k);
  
  // Clamp to valid range
  linear = clamp(linear, 0.0, 1.0);
  
  // Convert linear RGB back to sRGB
  return linear_to_srgb(linear);
}
`;
const fragmentShaders: Record<FilterType | 'passthrough', string> = {
  passthrough: passthroughShader,
  blur: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
uniform int u_blendMode;

${blendModeFunctions}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  vec2 texelSize = 1.0 / u_resolution;
  vec4 sum = vec4(0.0);
  float totalWeight = 0.0;
  
  int samples = int(u_radius);
  for (int x = -samples; x <= samples; x++) {
    for (int y = -samples; y <= samples; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize;
      float weight = 1.0 / (1.0 + length(offset) * 100.0);
      sum += texture(u_texture, v_texCoord + offset) * weight;
      totalWeight += weight;
    }
  }
  
  vec4 blurredColor = sum / totalWeight;
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, blurredColor.rgb, v_texCoord, 1.0);
  outColor = vec4(blended, originalColor.a);
}
`,
  glow: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform float u_hueMin;
uniform float u_hueMax;
uniform float u_lumMin;
uniform float u_lumMax;
uniform float u_glowColorH;
uniform float u_glowColorS;
uniform float u_glowColorL;
uniform float u_angle;
uniform float u_distance;
uniform float u_blur;
uniform int u_blendMode;

${blendModeFunctions}

// Check if a hue is within the selected range (handles wraparound)
bool isHueInRange(float hue, float minHue, float maxHue) {
  // Convert to 0-360 range
  float h = hue * 360.0;
  float hMin = minHue;
  float hMax = maxHue;
  
  if (hMin <= hMax) {
    // Normal case: min < max
    return h >= hMin && h <= hMax;
  } else {
    // Wraparound case: max < min (crosses 0°)
    return h >= hMin || h <= hMax;
  }
}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  // Convert angle to radians and rotate 270 degrees (90 + 180) to match canvas
  // Add 90 degrees to flip by 180 from previous orientation
  float angleRad = radians(u_angle + 90.0);
  vec2 direction = vec2(cos(angleRad), -sin(angleRad));
  vec2 offset = direction * u_distance / u_resolution;
  
  // Optimize: Use adaptive sampling based on blur amount
  // Smaller blur = fewer samples needed
  int maxSamples = int(u_blur);
  
  // Cap maximum samples for performance (blur > 50 uses same sample count as 50)
  maxSamples = min(maxSamples, 50);
  
  // Use step size to reduce samples for large blur
  int stepSize = 1;
  if (maxSamples > 30) {
    stepSize = 2; // Sample every 2 pixels for large blur
  }
  
  vec2 texelSize = 1.0 / u_resolution;
  float glowMask = 0.0;
  float totalWeight = 0.0;
  
  if (maxSamples > 0) {
    // Optimized blur loop with adaptive sampling
    for (int x = -maxSamples; x <= maxSamples; x += stepSize) {
      for (int y = -maxSamples; y <= maxSamples; y += stepSize) {
        vec2 sampleOffset = vec2(float(x), float(y)) * texelSize;
        vec2 samplePos = v_texCoord + offset + sampleOffset;
        
        // Early exit if sample is out of bounds
        if (samplePos.x < 0.0 || samplePos.x > 1.0 || samplePos.y < 0.0 || samplePos.y > 1.0) {
          continue;
        }
        
        // Sample and check threshold
        vec4 sampleColor = texture(u_texture, samplePos);
        vec3 sampleHSL = rgb2hsl(sampleColor.rgb);
        float sampleLum = luminosity(sampleColor.rgb) * 255.0;
        
        bool sampleInHue = isHueInRange(sampleHSL.x, u_hueMin, u_hueMax);
        bool sampleInLum = sampleLum >= u_lumMin && sampleLum <= u_lumMax;
        float sampleMask = (sampleInHue && sampleInLum) ? 1.0 : 0.0;
        
        // Optimized Gaussian weight calculation
        float dist = length(sampleOffset);
        float sigma = float(maxSamples) * 0.5;
        float weight = exp(-dist * dist / (2.0 * sigma * sigma));
        
        glowMask += sampleMask * weight;
        totalWeight += weight;
      }
    }
    
    if (totalWeight > 0.0) {
      glowMask /= totalWeight;
    }
  } else {
    // No blur - just check current pixel at offset
    vec2 samplePos = v_texCoord + offset;
    
    if (samplePos.x >= 0.0 && samplePos.x <= 1.0 && samplePos.y >= 0.0 && samplePos.y <= 1.0) {
      vec4 sampleColor = texture(u_texture, samplePos);
      vec3 sampleHSL = rgb2hsl(sampleColor.rgb);
      float sampleLum = luminosity(sampleColor.rgb) * 255.0;
      
      bool sampleInHue = isHueInRange(sampleHSL.x, u_hueMin, u_hueMax);
      bool sampleInLum = sampleLum >= u_lumMin && sampleLum <= u_lumMax;
      glowMask = (sampleInHue && sampleInLum) ? 1.0 : 0.0;
    }
  }
  
  // Convert glow color from HSL to RGB
  vec3 glowColorRGB = hsl2rgb(vec3(u_glowColorH / 360.0, u_glowColorS / 100.0, u_glowColorL / 100.0));
  
  // Create glow layer
  vec3 glowLayer = glowColorRGB * glowMask;
  
  // Composite glow over original using additive blend
  vec3 glowComposite = originalColor.rgb + glowLayer;
  glowComposite = clamp(glowComposite, 0.0, 1.0);
  
  // Apply blend mode between original and glow composite
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, glowComposite, v_texCoord, 1.0);
  
  // Mix with opacity
  vec3 finalColor = mix(originalColor.rgb, blended, u_opacity);
  
  outColor = vec4(finalColor, originalColor.a);
}
`,
  mosaic: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform float u_width;
uniform float u_height;
uniform int u_blendMode;

${blendModeFunctions}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  // Calculate cell size in texture coordinates
  vec2 cellSize = vec2(u_width, u_height) / u_resolution;
  
  // Find which cell this pixel belongs to
  vec2 cellCoord = floor(v_texCoord / cellSize);
  
  // Calculate the center of this cell
  vec2 cellCenter = (cellCoord + 0.5) * cellSize;
  
  // Sample multiple points within the cell to get average color
  vec4 avgColor = vec4(0.0);
  float samples = 0.0;
  
  // Sample a grid within the cell for better averaging
  int sampleCount = 4;
  for (int x = 0; x < sampleCount; x++) {
    for (int y = 0; y < sampleCount; y++) {
      vec2 offset = (vec2(float(x), float(y)) / float(sampleCount - 1) - 0.5) * cellSize;
      vec2 samplePos = cellCenter + offset;
      
      if (samplePos.x >= 0.0 && samplePos.x <= 1.0 && samplePos.y >= 0.0 && samplePos.y <= 1.0) {
        avgColor += texture(u_texture, samplePos);
        samples += 1.0;
      }
    }
  }
  
  avgColor /= samples;
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, avgColor.rgb, v_texCoord, u_opacity);
  outColor = vec4(mix(originalColor.rgb, blended, u_opacity), originalColor.a);
}
`,
  pattern: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform sampler2D u_pattern;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform float u_width;
uniform float u_height;
uniform float u_hasPattern;
uniform int u_blendMode;

${blendModeFunctions}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  // If no pattern uploaded, just return original
  if (u_hasPattern < 0.5) {
    outColor = originalColor;
    return;
  }
  
  // Convert to pixel coordinates
  vec2 pixelCoord = v_texCoord * u_resolution;
  
  // Calculate tile size in pixels
  vec2 tileSize = vec2(u_width, u_height);
  
  // Get position within the current tile (0 to 1)
  vec2 tileCoord = mod(pixelCoord, tileSize) / tileSize;
  
  // Sample the pattern texture
  vec4 patternColor = texture(u_pattern, tileCoord);
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, patternColor.rgb, v_texCoord, u_opacity);
  
  // Mix with opacity and pattern alpha
  outColor = vec4(mix(originalColor.rgb, blended, u_opacity * patternColor.a), originalColor.a);
}
`,
  cmyk: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform float u_cyan;
uniform float u_magenta;
uniform float u_yellow;
uniform float u_black;
uniform int u_blendMode;

${cmykFunctions}
${blendModeFunctions}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  // Convert RGB to CMYK using SWOP v2 profile
  vec4 cmyk = rgb_to_cmyk_swop(originalColor.rgb);
  
  // Apply channel opacity adjustments
  cmyk.x *= u_cyan;    // Cyan
  cmyk.y *= u_magenta; // Magenta
  cmyk.z *= u_yellow;  // Yellow
  cmyk.w *= u_black;   // Black (Key)
  
  // Convert back to RGB using SWOP v2 profile
  // This includes dot gain simulation which darkens the output
  vec3 adjustedColor = cmyk_to_rgb_swop(cmyk);
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, adjustedColor, v_texCoord, 1.0);
  outColor = vec4(blended, originalColor.a);
}
`,
  levels: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform float u_inputBlack;
uniform float u_inputWhite;
uniform float u_gamma;
uniform float u_outputBlack;
uniform float u_outputWhite;
uniform int u_blendMode;

${blendModeFunctions}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  vec3 color = originalColor.rgb;
  
  // Convert to 0-255 range for levels adjustment
  color = color * 255.0;
  
  // Input Levels: Remap black and white points
  color = (color - u_inputBlack) / (u_inputWhite - u_inputBlack);
  color = clamp(color, 0.0, 1.0);
  
  // Gamma adjustment (midtone correction)
  color = pow(color, vec3(1.0 / u_gamma));
  
  // Output Levels: Remap to output range
  color = color * (u_outputWhite - u_outputBlack) + u_outputBlack;
  
  // Convert back to 0-1 range
  color = color / 255.0;
  color = clamp(color, 0.0, 1.0);
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, color, v_texCoord, 1.0);
  outColor = vec4(blended, originalColor.a);
}
`,
  noise: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform float u_intensity;
uniform float u_size;
uniform float u_speed;
uniform float u_saturation;
uniform float u_time;
uniform int u_noiseType;
uniform int u_blendMode;

${noiseHelpers}
${blendModeFunctions}

// Perlin noise gradient function - NOW WITH TIME
vec2 perlinGradient(vec2 p, float time) {
  float h = hash13(vec3(p, time));
  float angle = h * 6.28318530718; // 2 * PI
  return vec2(cos(angle), sin(angle));
}

// Perlin noise implementation - NOW ANIMATED
float perlinNoise(vec2 pos, float time) {
  vec2 i = floor(pos);
  vec2 f = fract(pos);
  
  // Smooth interpolation
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  // Get gradients at corners WITH TIME
  vec2 g00 = perlinGradient(i, time);
  vec2 g10 = perlinGradient(i + vec2(1.0, 0.0), time);
  vec2 g01 = perlinGradient(i + vec2(0.0, 1.0), time);
  vec2 g11 = perlinGradient(i + vec2(1.0, 1.0), time);
  
  // Dot products
  float v00 = dot(g00, f);
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  
  // Interpolate
  float v0 = mix(v00, v10, u.x);
  float v1 = mix(v01, v11, u.x);
  
  return mix(v0, v1, u.y) * 0.5 + 0.5; // Remap to [0,1]
}

// Perlin color noise - NOW ANIMATED
vec3 perlinColorNoise(vec2 pos, float time) {
  return vec3(
    perlinNoise(pos, time),
    perlinNoise(pos + vec2(123.456, 0.0), time + 10.0),
    perlinNoise(pos + vec2(0.0, 789.012), time + 20.0)
  );
}

// Worley noise implementation
float worleyNoise(vec2 pos, float time) {
  vec2 i = floor(pos);
  vec2 f = fract(pos);
  
  float minDist = 1.0;
  
  // Check 3x3 grid of cells
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellPos = i + neighbor;
      
      // Random point in this cell
      vec2 point = vec2(
        hash13(vec3(cellPos, time)),
        hash13(vec3(cellPos + vec2(100.0, 0.0), time))
      );
      
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      minDist = min(minDist, dist);
    }
  }
  
  return minDist;
}

// Worley color noise
vec3 worleyColorNoise(vec2 pos, float time) {
  return vec3(
    worleyNoise(pos, time),
    worleyNoise(pos + vec2(123.456, 0.0), time + 10.0),
    worleyNoise(pos + vec2(0.0, 789.012), time + 20.0)
  );
}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  // Improved size scaling algorithm
  float scaledSize = pow(u_size, 1.5);
  
  // Calculate noise position based on scaled size parameter
  vec2 noisePos = v_texCoord * u_resolution / scaledSize;
  
  // Logarithmic speed scaling for better control at slow speeds
  // Range 0-5 maps to exponential curve: 0 = static, 1 = very slow, 5 = fast
  // Using exp2 (2^x) for smooth logarithmic response
  // Subtract 10 to start very slow, then scale
  float logSpeed = (exp2(u_speed) - 1.0) / 31.0; // exp2(5) = 32, so (32-1)/31 = 1.0 at max
  float scaledSpeed = logSpeed * 0.1; // Scale down for reasonable animation speed
  float timeSeed = u_time * scaledSpeed;
  
  vec3 noiseColor;
  
  // Select noise type
  if (u_noiseType == 0) {
    // Hash noise (film grain) - sharp, crispy
    if (u_size > 2.0) {
      noiseColor = smoothColorNoise(noisePos, timeSeed);
    } else {
      noiseColor = colorNoise(noisePos, timeSeed);
    }
  } else if (u_noiseType == 1) {
    // Value noise (smooth) - very smooth, cloud-like with quintic interpolation
    noiseColor = valueColorNoise(noisePos, timeSeed);
  } else if (u_noiseType == 2) {
    // Perlin noise (organic) - gradient-based, flowing patterns - NOW ANIMATED
    noiseColor = perlinColorNoise(noisePos, timeSeed);
  } else {
    // Worley noise (cellular) - distance-based, honeycomb patterns
    noiseColor = worleyColorNoise(noisePos, timeSeed);
  }
  
  // Apply saturation control
  vec3 noiseHSL = rgb2hsl(noiseColor);
  noiseHSL.y *= u_saturation;
  noiseColor = hsl2rgb(noiseHSL);
  
  // Remap noise from [0,1] to [-1,1] for better blending
  noiseColor = noiseColor * 2.0 - 1.0;
  
  // Apply intensity
  noiseColor *= u_intensity;
  
  // Add noise to original color
  vec3 noisyColor = originalColor.rgb + noiseColor;
  noisyColor = clamp(noisyColor, 0.0, 1.0);
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, noisyColor, v_texCoord, u_opacity);
  
  // Apply opacity to blend between original and blended result
  outColor = vec4(mix(originalColor.rgb, blended, u_opacity), originalColor.a);
}
`,
  colorTone: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;

// All channel parameters (8 channels x 4 params = 32 uniforms)
uniform float u_all_saturation;
uniform float u_all_hue;
uniform float u_all_tone;
uniform float u_all_tint;

uniform float u_red_saturation;
uniform float u_red_hue;
uniform float u_red_tone;
uniform float u_red_tint;

uniform float u_orange_saturation;
uniform float u_orange_hue;
uniform float u_orange_tone;
uniform float u_orange_tint;

uniform float u_yellow_saturation;
uniform float u_yellow_hue;
uniform float u_yellow_tone;
uniform float u_yellow_tint;

uniform float u_green_saturation;
uniform float u_green_hue;
uniform float u_green_tone;
uniform float u_green_tint;

uniform float u_cyan_saturation;
uniform float u_cyan_hue;
uniform float u_cyan_tone;
uniform float u_cyan_tint;

uniform float u_blue_saturation;
uniform float u_blue_hue;
uniform float u_blue_tone;
uniform float u_blue_tint;

uniform float u_magenta_saturation;
uniform float u_magenta_hue;
uniform float u_magenta_tone;
uniform float u_magenta_tint;

${hslHelpers}

// Apply saturation adjustment (0-200, 100 = no change)
vec3 applySaturation(vec3 color, float saturation) {
  float factor = saturation / 100.0;
  vec3 hsl = rgb2hsl(color);
  hsl.y *= factor;
  hsl.y = clamp(hsl.y, 0.0, 1.0);
  return hsl2rgb(hsl);
}

// Apply hue shift (-180 to 180 degrees)
vec3 applyHue(vec3 color, float hueShift) {
  vec3 hsl = rgb2hsl(color);
  hsl.x += hueShift / 360.0;
  hsl.x = fract(hsl.x); // Wrap around
  return hsl2rgb(hsl);
}

// Apply tone (temperature): -100 = blue, 0 = neutral, +100 = orange
vec3 applyTone(vec3 color, float tone) {
  float factor = tone / 100.0;
  
  if (factor > 0.0) {
    // Warm (orange)
    color.r += factor * 0.15;
    color.g += factor * 0.05;
    color.b -= factor * 0.1;
  } else {
    // Cool (blue)
    color.r += factor * 0.1;
    color.g += factor * 0.05;
    color.b -= factor * 0.15;
  }
  
  return clamp(color, 0.0, 1.0);
}

// Apply tint: -100 = green, 0 = neutral, +100 = magenta
vec3 applyTint(vec3 color, float tint) {
  float factor = tint / 100.0;
  
  if (factor > 0.0) {
    // Magenta
    color.r += factor * 0.15;
    color.g -= factor * 0.1;
    color.b += factor * 0.15;
  } else {
    // Green
    color.r += factor * 0.1;
    color.g -= factor * 0.15;
    color.b += factor * 0.1;
  }
  
  return clamp(color, 0.0, 1.0);
}

// Determine which color channel a pixel belongs to based on its hue
// Returns weights for each channel (0-1)
void getChannelWeights(vec3 color, out float weights[7]) {
  vec3 hsl = rgb2hsl(color);
  float hue = hsl.x * 360.0; // Convert to degrees
  
  // Define hue ranges for each color (in degrees)
  // Red: 345-15, Orange: 15-45, Yellow: 45-75, Green: 75-165,
  // Cyan: 165-195, Blue: 195-285, Magenta: 285-345
  
  // Initialize all weights to 0
  for (int i = 0; i < 7; i++) {
    weights[i] = 0.0;
  }
  
  // Calculate weights with smooth transitions (20 degree overlap)
  float overlap = 20.0;
  
  // Red (345-15, wraps around)
  if (hue >= 345.0 || hue <= 15.0) {
    float h = hue >= 345.0 ? hue - 360.0 : hue;
    weights[0] = 1.0;
    if (h < 5.0 && h > -5.0) {
      float t = (h + 5.0) / 10.0;
      weights[0] = t;
      weights[6] = 1.0 - t; // Blend with magenta
    } else if (h > 5.0 && h < 15.0) {
      float t = (h - 5.0) / 10.0;
      weights[0] = 1.0 - t;
      weights[1] = t; // Blend with orange
    }
  }
  // Orange (15-45)
  else if (hue >= 15.0 && hue <= 45.0) {
    weights[1] = 1.0;
    if (hue < 25.0) {
      float t = (hue - 15.0) / 10.0;
      weights[1] = t;
      weights[0] = 1.0 - t;
    } else if (hue > 35.0) {
      float t = (hue - 35.0) / 10.0;
      weights[1] = 1.0 - t;
      weights[2] = t;
    }
  }
  // Yellow (45-75)
  else if (hue >= 45.0 && hue <= 75.0) {
    weights[2] = 1.0;
    if (hue < 55.0) {
      float t = (hue - 45.0) / 10.0;
      weights[2] = t;
      weights[1] = 1.0 - t;
    } else if (hue > 65.0) {
      float t = (hue - 65.0) / 10.0;
      weights[2] = 1.0 - t;
      weights[3] = t;
    }
  }
  // Green (75-165)
  else if (hue >= 75.0 && hue <= 165.0) {
    weights[3] = 1.0;
    if (hue < 85.0) {
      float t = (hue - 75.0) / 10.0;
      weights[3] = t;
      weights[2] = 1.0 - t;
    } else if (hue > 155.0) {
      float t = (hue - 155.0) / 10.0;
      weights[3] = 1.0 - t;
      weights[4] = t;
    }
  }
  // Cyan (165-195)
  else if (hue >= 165.0 && hue <= 195.0) {
    weights[4] = 1.0;
    if (hue < 175.0) {
      float t = (hue - 165.0) / 10.0;
      weights[4] = t;
      weights[3] = 1.0 - t;
    } else if (hue > 185.0) {
      float t = (hue - 185.0) / 10.0;
      weights[4] = 1.0 - t;
      weights[5] = t;
    }
  }
  // Blue (195-285)
  else if (hue >= 195.0 && hue <= 285.0) {
    weights[5] = 1.0;
    if (hue < 205.0) {
      float t = (hue - 195.0) / 10.0;
      weights[5] = t;
      weights[4] = 1.0 - t;
    } else if (hue > 275.0) {
      float t = (hue - 275.0) / 10.0;
      weights[5] = 1.0 - t;
      weights[6] = t;
    }
  }
  // Magenta (285-345)
  else if (hue >= 285.0 && hue <= 345.0) {
    weights[6] = 1.0;
    if (hue < 295.0) {
      float t = (hue - 285.0) / 10.0;
      weights[6] = t;
      weights[5] = 1.0 - t;
    } else if (hue > 335.0) {
      float t = (hue - 335.0) / 10.0;
      weights[6] = 1.0 - t;
      weights[0] = t;
    }
  }
}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  vec3 color = originalColor.rgb;
  
  // Apply "all" channel first
  color = applySaturation(color, u_all_saturation);
  color = applyHue(color, u_all_hue);
  color = applyTone(color, u_all_tone);
  color = applyTint(color, u_all_tint);
  
  // Get channel weights for this pixel
  float weights[7];
  getChannelWeights(color, weights);
  
  // Apply each color channel's adjustments weighted by how much the pixel belongs to that channel
  vec3 channelAdjusted = color;
  
  // Red
  if (weights[0] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_red_saturation);
    adjusted = applyHue(adjusted, u_red_hue);
    adjusted = applyTone(adjusted, u_red_tone);
    adjusted = applyTint(adjusted, u_red_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[0]);
  }
  
  // Orange
  if (weights[1] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_orange_saturation);
    adjusted = applyHue(adjusted, u_orange_hue);
    adjusted = applyTone(adjusted, u_orange_tone);
    adjusted = applyTint(adjusted, u_orange_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[1]);
  }
  
  // Yellow
  if (weights[2] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_yellow_saturation);
    adjusted = applyHue(adjusted, u_yellow_hue);
    adjusted = applyTone(adjusted, u_yellow_tone);
    adjusted = applyTint(adjusted, u_yellow_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[2]);
  }
  
  // Green
  if (weights[3] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_green_saturation);
    adjusted = applyHue(adjusted, u_green_hue);
    adjusted = applyTone(adjusted, u_green_tone);
    adjusted = applyTint(adjusted, u_green_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[3]);
  }
  
  // Cyan
  if (weights[4] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_cyan_saturation);
    adjusted = applyHue(adjusted, u_cyan_hue);
    adjusted = applyTone(adjusted, u_cyan_tone);
    adjusted = applyTint(adjusted, u_cyan_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[4]);
  }
  
  // Blue
  if (weights[5] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_blue_saturation);
    adjusted = applyHue(adjusted, u_blue_hue);
    adjusted = applyTone(adjusted, u_blue_tone);
    adjusted = applyTint(adjusted, u_blue_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[5]);
  }
  
  // Magenta
  if (weights[6] > 0.01) {
    vec3 adjusted = color;
    adjusted = applySaturation(adjusted, u_magenta_saturation);
    adjusted = applyHue(adjusted, u_magenta_hue);
    adjusted = applyTone(adjusted, u_magenta_tone);
    adjusted = applyTint(adjusted, u_magenta_tint);
    channelAdjusted = mix(channelAdjusted, adjusted, weights[6]);
  }
  
  outColor = vec4(channelAdjusted, originalColor.a);
}
`,
  vsyncTears: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_tearFrequency;
uniform float u_tearDuration;
uniform float u_tearShift;
uniform float u_tearHeightMin;
uniform float u_tearHeightAvg;
uniform float u_tearHeightMax;
uniform float u_simultaneousTears;
uniform float u_scrollSpeed;
uniform int u_tearMotionType;
uniform float u_tearMotionSpeed;
uniform float u_tearMotionIntensity;
uniform float u_tearMotionPhase;

// Hash function for randomness
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

// Easing functions
float easeLinear(float t) {
  return t;
}

float easeSine(float t) {
  return sin(t * 3.14159265359);
}

float easeInQuad(float t) {
  return t * t;
}

float easeOutQuad(float t) {
  return t * (2.0 - t);
}

float easeInOutQuad(float t) {
  return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

float easeBounce(float t) {
  if (t < 0.36363636) {
    return 7.5625 * t * t;
  } else if (t < 0.72727272) {
    t -= 0.54545454;
    return 7.5625 * t * t + 0.75;
  } else if (t < 0.90909090) {
    t -= 0.81818181;
    return 7.5625 * t * t + 0.9375;
  } else {
    t -= 0.95454545;
    return 7.5625 * t * t + 0.984375;
  }
}

float easeElastic(float t) {
  if (t == 0.0 || t == 1.0) return t;
  float p = 0.3;
  float s = p / 4.0;
  return pow(2.0, -10.0 * t) * sin((t - s) * (2.0 * 3.14159265359) / p) + 1.0;
}

// Main motion calculation function
float calculateTearMotion(float tearProgress, int motionType, float speed, float intensity, float phase) {
  float adjustedProgress = tearProgress * speed;
  float phaseRad = phase * 3.14159265359 / 180.0;
  
  float motionValue;
  
  if (motionType == 0) {
    motionValue = step(0.5, tearProgress);
  } else if (motionType == 1) {
    motionValue = sin(adjustedProgress * 3.14159265359 + phaseRad);
  } else if (motionType == 2) {
    motionValue = easeLinear(fract(adjustedProgress));
  } else if (motionType == 3) {
    motionValue = easeInQuad(fract(adjustedProgress));
  } else if (motionType == 4) {
    motionValue = easeOutQuad(fract(adjustedProgress));
  } else if (motionType == 5) {
    motionValue = easeInOutQuad(fract(adjustedProgress));
  } else if (motionType == 6) {
    motionValue = easeBounce(fract(adjustedProgress));
  } else if (motionType == 7) {
    motionValue = easeElastic(fract(adjustedProgress));
  } else {
    motionValue = sin(adjustedProgress * 3.14159265359 + phaseRad);
  }
  
  return motionValue * intensity;
}

// Calculate tear height based on min, avg, max using triangular distribution
float calculateTearHeight(float randomValue, float minHeight, float avgHeight, float maxHeight) {
  float hMin = (minHeight / 100.0) * 0.5;
  float hAvg = (avgHeight / 100.0) * 0.5;
  float hMax = (maxHeight / 100.0) * 0.5;
  
  float range = hMax - hMin;
  if (range < 0.001) return hAvg;
  
  float fc = (hAvg - hMin) / range;
  
  if (randomValue < fc) {
    return hMin + sqrt(randomValue * range * (hAvg - hMin));
  } else {
    return hMax - sqrt((1.0 - randomValue) * range * (hMax - hAvg));
  }
}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  vec2 sampleUV = v_texCoord;
  
  // Calculate tear frequency (0-500 maps to 0.1-50 tears/sec)
  float tearsPerSecond = 0.1 + (u_tearFrequency / 500.0) * 49.9;
  
  // Calculate cycle duration in milliseconds
  float cycleDuration = 1000.0 / tearsPerSecond;
  
  // Calculate vertical scroll offset
  // scrollSpeed: 0-10, where 10 = 1 full screen per second
  // Scroll upward means Y decreases over time
  float scrollOffset = u_scrollSpeed * u_time * -1.0; // Negative for upward scroll
  
  // Check multiple simultaneous tears
  int maxTears = int(u_simultaneousTears);
  
  for (int tearIndex = 0; tearIndex < 100; tearIndex++) {
    if (tearIndex >= maxTears) break;
    
    // Each tear has its own cycle offset
    float tearOffset = float(tearIndex) * 1000.0 / u_simultaneousTears;
    float adjustedTime = u_time * 1000.0 + tearOffset;
    
    float cycleIndex = floor(adjustedTime / cycleDuration);
    float cycleTime = mod(adjustedTime, cycleDuration);
    
    // Random seed for this tear cycle
    float tearSeed = hash(vec2(cycleIndex, float(tearIndex)));
    
    // Determine if tear is active (50% chance)
    bool isTearActive = tearSeed > 0.5;
    
    float tearTime = cycleTime;
    
    if (isTearActive && tearTime < u_tearDuration) {
      // Random Y position (base position)
      float tearYBase = hash(vec2(tearSeed, cycleIndex + 1.0 + float(tearIndex)));
      
      // Apply vertical scroll offset and wrap around
      float tearY = mod(tearYBase + scrollOffset, 1.0);
      
      // Calculate tear height using triangular distribution
      float heightRandom = hash(vec2(tearSeed, cycleIndex + 2.0 + float(tearIndex)));
      float actualHeight = calculateTearHeight(heightRandom, u_tearHeightMin, u_tearHeightAvg, u_tearHeightMax);
      actualHeight = clamp(actualHeight, 0.001, 0.5);
      
      // Check if current pixel is within tear region
      float distFromTear = abs(v_texCoord.y - tearY);
      
      if (distFromTear < actualHeight) {
        // Calculate normalized progress (0-1)
        float tearProgress = tearTime / u_tearDuration;
        
        // Calculate motion
        float motionValue = calculateTearMotion(
          tearProgress,
          u_tearMotionType,
          u_tearMotionSpeed,
          u_tearMotionIntensity,
          u_tearMotionPhase
        );
        
        // Apply shift
        float shiftAmount = (u_tearShift / u_resolution.x) * motionValue;
        sampleUV.x += shiftAmount;
        sampleUV.x = fract(sampleUV.x);
        
        // Once we find a tear affecting this pixel, we can break
        break;
      }
    }
  }
  
  // Sample the texture with potentially shifted UV
  vec4 tornColor = texture(u_texture, sampleUV);
  outColor = vec4(tornColor.rgb, originalColor.a);
}
`,
  chromaticAberration: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_amount;
uniform float u_redOffset;
uniform float u_greenOffset;
uniform float u_blueOffset;
uniform float u_falloff;
uniform float u_centerX;
uniform float u_centerY;
uniform int u_blendMode;

${blendModeFunctions}

void main() {
  vec4 originalColor = texture(u_texture, v_texCoord);
  
  // Calculate center point (0-1 range)
  vec2 center = vec2(u_centerX / 100.0, u_centerY / 100.0);
  
  // Calculate distance from center (0-1 range, where 1 is corner)
  vec2 delta = v_texCoord - center;
  float dist = length(delta) * 1.414213562; // Normalize to 0-1 (diagonal = sqrt(2))
  
  // Apply falloff curve
  // falloff = 0: uniform effect everywhere
  // falloff = 100: effect only at edges
  float falloffFactor = pow(dist, 1.0 + (u_falloff / 100.0) * 3.0);
  
  // Calculate amount multiplier (0-1)
  float amountMultiplier = (u_amount / 100.0) * falloffFactor;
  
  // Calculate pixel offsets for each channel
  // Offsets are in pixels, scaled by amount
  vec2 pixelSize = 1.0 / u_resolution;
  
  float redOffsetPixels = u_redOffset * amountMultiplier;
  float greenOffsetPixels = u_greenOffset * amountMultiplier;
  float blueOffsetPixels = u_blueOffset * amountMultiplier;
  
  // Sample each channel with its offset
  vec2 redUV = v_texCoord + vec2(redOffsetPixels * pixelSize.x, 0.0);
  vec2 greenUV = v_texCoord + vec2(greenOffsetPixels * pixelSize.x, 0.0);
  vec2 blueUV = v_texCoord + vec2(blueOffsetPixels * pixelSize.x, 0.0);
  
  // Clamp UVs to prevent wrapping
  redUV = clamp(redUV, 0.0, 1.0);
  greenUV = clamp(greenUV, 0.0, 1.0);
  blueUV = clamp(blueUV, 0.0, 1.0);
  
  // Sample each channel
  float r = texture(u_texture, redUV).r;
  float g = texture(u_texture, greenUV).g;
  float b = texture(u_texture, blueUV).b;
  
  // Combine channels
  vec3 aberratedColor = vec3(r, g, b);
  
  // Apply blend mode
  vec3 blended = applyBlendMode(u_blendMode, originalColor.rgb, aberratedColor, v_texCoord, 1.0);
  
  outColor = vec4(blended, originalColor.a);
}
`,
  duplicateLayer: `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
uniform sampler2D u_duplicateTexture;
uniform int u_flipHorizontal;
uniform float u_duplicateOpacity;
uniform int u_duplicateBlendMode;
uniform int u_duplicateStackingOrder;
uniform int u_hasDuplicateFrame;

${blendModeFunctions}

void main() {
  vec4 sourceColor = texture(u_texture, v_texCoord);
  
  // If no frame available or opacity is 0, just pass through
  if (u_hasDuplicateFrame == 0 || u_duplicateOpacity <= 0.0) {
    outColor = sourceColor;
    return;
  }
  
  // Apply horizontal flip to duplicate texture coordinates if enabled
  vec2 duplicateUV = v_texCoord;
  if (u_flipHorizontal == 1) {
    duplicateUV.x = 1.0 - duplicateUV.x;
  }
  
  vec4 duplicateColor = texture(u_duplicateTexture, duplicateUV);
  
  vec3 finalColor;
  float opacityFactor = u_duplicateOpacity / 100.0;
  
  if (u_duplicateStackingOrder == 0) {
    // Source on Top: duplicate is base, source is blend
    vec3 blended = applyBlendMode(u_duplicateBlendMode, duplicateColor.rgb, sourceColor.rgb, v_texCoord, 1.0);
    finalColor = mix(duplicateColor.rgb, blended, opacityFactor);
  } else {
    // Duplicate on Top: source is base, duplicate is blend
    vec3 blended = applyBlendMode(u_duplicateBlendMode, sourceColor.rgb, duplicateColor.rgb, v_texCoord, 1.0);
    finalColor = mix(sourceColor.rgb, blended, opacityFactor);
  }
  
  outColor = vec4(finalColor, 1.0);
}
`
};
export function createShaderProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
    throw new Error('Failed to compile vertex shader');
  }
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, fragmentSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
    throw new Error('Failed to compile fragment shader');
  }
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    throw new Error('Failed to link program');
  }
  return program;
}
export function createFilterShader(gl: WebGL2RenderingContext, filterType: FilterType | 'passthrough'): WebGLProgram {
  return createShaderProgram(gl, vertexShaderSource, fragmentShaders[filterType]);
}