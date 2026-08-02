"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POST_PROCESS_BUDGET } from "../lib/polar-art-direction";
import { motionWarpFromVelocity } from "../lib/polar-world-cadence";

export const GLOBAL_ANIME_POST_PROFILE =
  "anime-soft depth pixel fog: camera-motion fisheye, linear depth, bounded luma/depth edge confidence, chromatic edge AA, toon quantization, stable dither, indigo ink, static scanline, wide vignette, tiered paper contrast grade; polar-dusk cinematic finish: soft-knee dual-radius thresholded highlight glow, toe-guarded filmic S-curve, teal-shadow warm-highlight split tone, warm-lifted vignette, luminance-weighted grain";
export const GLOBAL_RETRO_POST_PROFILE = GLOBAL_ANIME_POST_PROFILE;
export const POINTER_VISUAL_EFFECTS = "none";

const qualityBudget = POST_PROCESS_BUDGET;

// Local cinematic layer tuned per quality tier, stacked on top of the frozen
// POST_PROCESS_BUDGET without changing how that budget is consumed.
// SHADER LAW 1: the camera-space layer is a whisper. Everything that reads as
// dirt on the glass (grain, screen snow, heavy vignette) is floored so the
// frame looks like a place, not a filtered image. Only bloom and the colour
// grade survive at strength, and bloom is threshold-gated to real highlights.
// Liveliness belongs to the world (sky aurora sector + cloud drift), not here.
const CINEMATIC_GRADE = Object.freeze({
  low: Object.freeze({ vignette: 0.05, grain: 0, bloom: 0, sCurve: 0.06, splitTone: 0.08, snow: 0 }),
  medium: Object.freeze({ vignette: 0.06, grain: 0.01, bloom: 0.38, sCurve: 0.06, splitTone: 0.09, snow: 0 }),
  high: Object.freeze({ vignette: 0.07, grain: 0.012, bloom: 0.5, sCurve: 0.06, splitTone: 0.1, snow: 0 }),
});

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uTime;
uniform float uPixelSize;
uniform float uFisheyeStrength;
uniform float uMotionFisheye;
uniform vec2 uMotionVector;
uniform float uChromaticStrength;
uniform float uInkStrength;
uniform float uScanlineStrength;
uniform float uQuantizeStrength;
uniform float uGradeBase;
uniform float uGradeCurve;
uniform float uShadowSeparation;
uniform float uVignetteStrength;
uniform float uGrainStrength;
uniform float uBloomStrength;
uniform float uSCurveStrength;
uniform float uSplitToneStrength;
uniform float uSnowStrength;
uniform float uExposureBreath;

varying vec2 vUv;

float animeLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 paperShadowSeparation(vec3 color) {
  float gradedLuma = animeLuminance(color);
  float shadowMask = 1.0 - smoothstep(0.18, 0.46, gradedLuma);
  float highlightMask = smoothstep(0.58, 0.88, gradedLuma);
  float gradeGain = 1.0 - shadowMask * uShadowSeparation
    + highlightMask * uShadowSeparation * 0.12;
  return color * gradeGain;
}

float interleavedGradientNoise(vec2 pixel, float seed) {
  vec2 seededPixel = pixel + vec2(seed * 0.754877666, seed * 0.569840296);
  return fract(52.9829189 * fract(dot(seededPixel, vec2(0.06711056, 0.00583715))));
}

float perspectiveDepthToViewZ(float invClipZ, float near, float far) {
  return (near * far) / ((far - near) * invClipZ - far);
}

float viewZToOrthographicDepth(float viewZ, float near, float far) {
  return (viewZ + near) / (near - far);
}

float readLinearDepth(vec2 uv) {
  float fragCoordZ = texture2D(tDepth, clamp(uv, 0.001, 0.999)).x;
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
  return clamp(viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar), 0.0, 1.0);
}

vec2 fisheyeUv(vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  centered *= 1.0 + (uFisheyeStrength + uMotionFisheye) * dot(centered, centered);
  return centered * 0.5 + 0.5 + uMotionVector;
}

float lumaEdgeConfidence(vec2 uv, vec2 texel) {
  float center = animeLuminance(texture2D(tDiffuse, uv).rgb);
  float left = animeLuminance(texture2D(tDiffuse, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)).rgb);
  float right = animeLuminance(texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb);
  float down = animeLuminance(texture2D(tDiffuse, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)).rgb);
  float up = animeLuminance(texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)).rgb);
  float contrast = max(abs(right - left), abs(up - down));
  return smoothstep(0.018, 0.11, max(contrast, abs(center - (left + right + down + up) * 0.25)));
}

float depthEdgeConfidence(vec2 uv, vec2 texel) {
  float center = readLinearDepth(uv);
  float edge = 0.0;
  edge = max(edge, abs(center - readLinearDepth(uv + vec2(texel.x, 0.0))));
  edge = max(edge, abs(center - readLinearDepth(uv - vec2(texel.x, 0.0))));
  edge = max(edge, abs(center - readLinearDepth(uv + vec2(0.0, texel.y))));
  edge = max(edge, abs(center - readLinearDepth(uv - vec2(0.0, texel.y))));
  return smoothstep(0.0015, 0.018, edge);
}

float gaussianEdgeConfidence(vec2 uv, vec2 texel) {
  // Five-tap Gaussian approximation keeps the hand-drawn edge response
  // stable while avoiding a second post-processing pass.
  float center = animeLuminance(texture2D(tDiffuse, uv).rgb);
  float cross = 0.0;
  cross += animeLuminance(texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb);
  cross += animeLuminance(texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb);
  cross += animeLuminance(texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb);
  cross += animeLuminance(texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb);
  return smoothstep(0.012, 0.09, abs(center - cross * 0.25));
}

vec3 chromaticEdgeAA(vec2 uv, vec2 texel, float edgeConfidence, float outerScreenMask) {
  vec2 fromCenter = uv - 0.5;
  vec2 radial = fromCenter / max(length(fromCenter), 0.0001);
  vec2 chromaOffset = radial * texel * uChromaticStrength * edgeConfidence * outerScreenMask;
  vec3 center = texture2D(tDiffuse, uv).rgb;
  vec3 chromatic = vec3(
    texture2D(tDiffuse, clamp(uv + chromaOffset, 0.001, 0.999)).r,
    center.g,
    texture2D(tDiffuse, clamp(uv - chromaOffset, 0.001, 0.999)).b
  );
  vec3 neighborAverage = (
    texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb +
    texture2D(tDiffuse, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)).rgb +
    texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)).rgb +
    texture2D(tDiffuse, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)).rgb
  ) * 0.25;
  float neighborAABlend = min(edgeConfidence * 0.18, 0.18);
  return mix(chromatic, neighborAverage, neighborAABlend);
}

vec3 toonQuantize(vec3 color) {
  float luma = max(animeLuminance(color), 0.001);
  float luminanceBand = floor(clamp(luma, 0.0, 0.9999) * 10.0) / 10.0;
  vec3 banded = clamp(color * (luminanceBand / luma), 0.0, 1.0);
  vec3 channelQuantized = floor(banded * 24.0 + 0.5) / 24.0;
  return mix(color, channelQuantized, uQuantizeStrength);
}

vec3 filmicSCurve(vec3 color) {
  // Gentle smoothstep S-curve blended in at low strength. The toe guard
  // fades the curve out below ~0.16 luma so the darkest dusk shadows keep
  // their detail instead of compressing toward the floor; shoulder and
  // midtone contrast stay untouched.
  vec3 curved = color * color * (3.0 - 2.0 * color);
  float toeGuard = smoothstep(0.035, 0.16, animeLuminance(color));
  return mix(color, curved, uSCurveStrength * toeGuard);
}

vec3 duskSplitTone(vec3 color) {
  // Shadows drift toward #2C3F66 twilight blue, highlights toward #F5C98A
  // low-sun amber. Tint ratios are luma-normalized so exposure holds steady.
  float splitLuma = animeLuminance(color);
  float splitShadowMask = 1.0 - smoothstep(0.08, 0.5, splitLuma);
  float splitHighlightMask = smoothstep(0.55, 0.92, splitLuma);
  vec3 shadowTinted = color * vec3(0.712, 1.02, 1.651);
  vec3 highlightTinted = color * vec3(1.19, 0.977, 0.671);
  color = mix(color, shadowTinted, splitShadowMask * uSplitToneStrength);
  return mix(color, highlightTinted, splitHighlightMask * uSplitToneStrength);
}

vec3 glowSample(vec2 uv) {
  vec3 tap = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
  // Soft-knee threshold at 0.80 (knee 0.045): the quadratic ramp-in removes
  // the hard clip edge that banded the old glow, while the threshold stays
  // high so only genuine highlights (window glass, indicator lights,
  // telemetry, sun kiss) bloom. Lower thresholds smear the frame into haze.
  vec3 knee = clamp(tap - vec3(0.755), vec3(0.0), vec3(0.09));
  knee = knee * knee * (1.0 / 0.18);
  return max(max(tap - vec3(0.80), vec3(0.0)), knee);
}

vec3 highlightGlow(vec2 uv, vec2 texel) {
  // Cheap in-pass bloom approximation: still eight taps, now split across
  // two radii — a tight cardinal cross (1.7 texels) plus a wider diagonal
  // ring (3.3 texels) — with normalized gaussian-ish weights so the falloff
  // rolls off smoothly instead of printing one hard ring. Callers only
  // invoke this when uBloomStrength > 0 (medium/high tiers), so the low
  // tier never pays for the extra texture reads.
  vec2 inner = texel * 1.7;
  vec2 outer = texel * 3.3 * 0.7071;
  vec3 nearRing = glowSample(uv + vec2(inner.x, 0.0))
    + glowSample(uv - vec2(inner.x, 0.0))
    + glowSample(uv + vec2(0.0, inner.y))
    + glowSample(uv - vec2(0.0, inner.y));
  vec3 farRing = glowSample(uv + outer)
    + glowSample(uv - outer)
    + glowSample(uv + vec2(outer.x, -outer.y))
    + glowSample(uv - vec2(outer.x, -outer.y));
  // Weights sum to one: the near cross carries the core, the far ring the
  // soft skirt.
  return nearRing * 0.17 + farRing * 0.08;
}

float snowCellHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(41.3, 289.1))) * 43758.5453);
}

// One drifting screen-space snow layer. Cells are hashed to a flake centre so
// the field costs no texture reads; uTime is pinned to 0 under reduced motion,
// which freezes the drift in place exactly like the grain field above.
float snowLayer(vec2 uv, float density, float fallSpeed, float sway) {
  vec2 drifted = uv * density;
  drifted.y += uTime * fallSpeed;
  drifted.x += sin(uTime * 0.31 + uv.y * 5.4) * sway;
  vec2 cell = floor(drifted);
  vec2 inCell = fract(drifted) - 0.5;
  float presence = snowCellHash(cell);
  // Only a sparse subset of cells carry a flake, so the field reads as weather
  // rather than static.
  if (presence < 0.72) return 0.0;
  vec2 jitter = vec2(snowCellHash(cell + 17.0), snowCellHash(cell + 51.0)) - 0.5;
  float flake = length((inCell - jitter * 0.6) * vec2(1.0, 0.85));
  return smoothstep(0.34, 0.03, flake) * (0.55 + presence * 0.45);
}

vec3 ambientSnow(vec2 uv) {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 snowUv = vec2(uv.x * aspect, uv.y);
  // Near layer is sparser, larger, and falls faster than the hazy far layer.
  float far = snowLayer(snowUv, 46.0, 0.085, 0.010) * 0.55;
  float near = snowLayer(snowUv + vec2(0.37, 0.19), 22.0, 0.16, 0.018);
  return vec3(0.92, 0.96, 1.0) * (far + near);
}

void main() {
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));

  // 1. Bounded camera-motion fisheye precedes scene sampling; pointer input never changes pixels.
  vec2 warpedUv = fisheyeUv(vUv);
  vec2 clampedUv = clamp(warpedUv, 0.001, 0.999);

  // 2-3. Linear depth drives a subtle, capped pixel-fog sample shift after 54% depth.
  float linearDepth = readLinearDepth(clampedUv);
  float depthFogMask = smoothstep(0.54, 0.96, linearDepth);
  float pixelSize = max(1.0, uPixelSize);
  vec2 pixelUv = (floor(clampedUv * uResolution / pixelSize) + 0.5) * pixelSize / uResolution;
  vec2 sampleUv = mix(clampedUv, clamp(pixelUv, 0.001, 0.999), depthFogMask * 0.04);

  // 4. Four cardinal luma taps and four depth taps share one bounded line-confidence field.
  float lumaEdge = lumaEdgeConfidence(sampleUv, texel);
  float depthEdge = depthEdgeConfidence(sampleUv, texel);
  float gaussianEdge = gaussianEdgeConfidence(sampleUv, texel);
  float edgeConfidence = clamp(max(max(lumaEdge, gaussianEdge), depthEdge * 1.15), 0.0, 1.0);

  // 5. RGB offsets only exist on confident outer-screen edges; neighbor AA is capped at 18%.
  vec2 normalizedScreen = vUv * 2.0 - 1.0;
  float outerScreenMask = smoothstep(0.18, 1.12, dot(normalizedScreen, normalizedScreen));
  vec3 color = chromaticEdgeAA(sampleUv, texel, edgeConfidence, outerScreenMask);
  color = mix(color, vec3(0.2902, 0.3725, 0.5333), depthFogMask * 0.08);

  // 6-7. Ten luminance bands, 24 channel levels, then stable 0.0025 dither.
  color = toonQuantize(color);
  float temporalSeed = floor(uTime * 6.0);
  float dither = interleavedGradientNoise(gl_FragCoord.xy, temporalSeed) - 0.5;
  color += vec3(dither * 0.0025);

  // 8-10. Indigo ink, faint static scanlines, and an 8% maximum wide vignette finish the pass.
  vec3 animeInk = vec3(0.2, 0.2510, 0.4314);
  color = mix(color, animeInk, edgeConfidence * uInkStrength);
  float scanline = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159265);
  color *= 1.0 - scanline * uScanlineStrength * 0.45;
  float vignette = smoothstep(0.50, 1.45, dot(normalizedScreen, normalizedScreen));
  color = mix(color, animeInk, vignette * 0.025);

  // 11. A tiered paper-grade curve restores ink structure; medium/high retain brighter snow.
  color *= (uGradeBase + uGradeCurve * color);
  color = paperShadowSeparation(color);

  // 12. Polar-dusk cinematic finish. Highlight glow only samples on medium/high.
  if (uBloomStrength > 0.0005) {
    vec3 glow = highlightGlow(sampleUv, texel);
    color += glow * uBloomStrength * vec3(1.06, 0.98, 0.88);
  }
  color = filmicSCurve(color);
  color = duskSplitTone(color);

  // 13. Smooth cinematic vignette with a slightly warm-lifted center.
  float cineRadial = dot(normalizedScreen, normalizedScreen);
  float cineVignette = smoothstep(0.24, 1.7, cineRadial);
  color *= 1.0 - cineVignette * uVignetteStrength;
  color += vec3(0.028, 0.02, 0.01) * (1.0 - cineVignette) * uVignetteStrength;

  // 14. Filmic grain, luminance-weighted toward shadows. uTime is pinned to 0
  // under reduced motion, which freezes the grain field in place.
  float grainSeed = floor(uTime * 24.0);
  float grain = interleavedGradientNoise(gl_FragCoord.xy + vec2(7.0, 113.0), grainSeed) - 0.5;
  float grainWeight = 1.0 - smoothstep(0.25, 0.85, animeLuminance(color));
  color += vec3(grain * uGrainStrength * (0.4 + 0.6 * grainWeight));

  // 15. Ambient two-layer screen-space snow drift, additive so it never
  // darkens the polar grade. Frozen under reduced motion with uTime.
  if (uSnowStrength > 0.0005) {
    color += ambientSnow(vUv) * uSnowStrength;
  }

  // 16. Slow exposure breathing keeps the settled frame alive without moving
  // any geometry; the CPU pins this to 1.0 under reduced motion.
  color *= uExposureBreath;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function makeRenderTarget(width = 1, height = 1) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    // The scene never reaches the default framebuffer, so the canvas `antialias`
    // flag can never touch it: every edge is resolved here or not at all.
    // MSAA was measured at -19% framerate (prod, 1440x900, discrete GPU: 36 ->
    // 29fps median) for edges that supersampling gives away free wherever the
    // pixels already exist - the post target now tracks devicePixelRatio to 1.5,
    // so any HiDPI display downsamples through the linear blit below. Machines
    // that cannot afford the pixels do not pay for coverage they never see.
    // ponytail: no MSAA, revisit if a DPR-1 desktop pass ever needs clean edges.
    samples: 0,
    stencilBuffer: false,
  });
  target.depthTexture = new THREE.DepthTexture(width, height);
  target.depthTexture.format = THREE.DepthFormat;
  target.depthTexture.type = THREE.UnsignedIntType;
  return target;
}

export default function RetroCinematicPostProcess({
  motionPoseRef,
  quality = "high",
  reducedMotion = false,
}) {
  const { camera, gl, scene, size } = useThree();
  const motionFisheyeCurrent = useRef(0);
  const motionShiftCurrent = useMemo(() => new THREE.Vector2(), []);
  const motionShiftTarget = useMemo(() => new THREE.Vector2(), []);
  const target = useMemo(() => makeRenderTarget(), []);
  const postCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const postScene = useMemo(() => new THREE.Scene(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          tDiffuse: { value: target.texture },
          tDepth: { value: target.depthTexture },
          uCameraFar: { value: 100 },
          uCameraNear: { value: 0.1 },
          uChromaticStrength: { value: qualityBudget.high.chroma },
          uFisheyeStrength: { value: qualityBudget.high.fisheye },
          uMotionFisheye: { value: 0 },
          uMotionVector: { value: new THREE.Vector2() },
          uInkStrength: { value: qualityBudget.high.ink },
          uGradeBase: { value: qualityBudget.high.gradeBase },
          uGradeCurve: { value: qualityBudget.high.gradeCurve },
          uShadowSeparation: { value: qualityBudget.high.shadowSeparation },
          uPixelSize: { value: qualityBudget.high.pixel },
          uQuantizeStrength: { value: qualityBudget.high.quantize },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uScanlineStrength: { value: qualityBudget.high.scanline },
          uTime: { value: 0 },
          uVignetteStrength: { value: CINEMATIC_GRADE.high.vignette },
          uGrainStrength: { value: CINEMATIC_GRADE.high.grain },
          uBloomStrength: { value: CINEMATIC_GRADE.high.bloom },
          uSCurveStrength: { value: CINEMATIC_GRADE.high.sCurve },
          uSplitToneStrength: { value: CINEMATIC_GRADE.high.splitTone },
          uSnowStrength: { value: CINEMATIC_GRADE.high.snow },
          uExposureBreath: { value: 1 },
        },
        vertexShader: VERTEX_SHADER,
      }),
    [target],
  );

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    postScene.add(quad);
    return () => {
      postScene.remove(quad);
      geometry.dispose();
    };
  }, [material, postScene]);

  useEffect(() => {
    const budget = qualityBudget[quality] || qualityBudget.high;
    // Hard-clamping to 1 meant every HiDPI visitor got a CSS-pixel render
    // upscaled into a larger backing store - soft on top of aliased. Track the
    // real ratio to 1.5 so the target matches the canvas on ordinary retina.
    const dpr = Math.min(gl.getPixelRatio(), 1.5);
    const width = Math.max(1, Math.floor(size.width * dpr * budget.scale));
    const height = Math.max(1, Math.floor(size.height * dpr * budget.scale));
    target.setSize(width, height);
    material.uniforms.uResolution.value.set(width, height);
    material.uniforms.uFisheyeStrength.value = budget.fisheye;
    material.uniforms.uChromaticStrength.value = budget.chroma;
    material.uniforms.uInkStrength.value = budget.ink;
    material.uniforms.uGradeBase.value = budget.gradeBase;
    material.uniforms.uGradeCurve.value = budget.gradeCurve;
    material.uniforms.uShadowSeparation.value = budget.shadowSeparation;
    material.uniforms.uScanlineStrength.value = budget.scanline;
    material.uniforms.uPixelSize.value = budget.pixel;
    material.uniforms.uQuantizeStrength.value = budget.quantize;
    const cinematic = CINEMATIC_GRADE[quality] || CINEMATIC_GRADE.high;
    material.uniforms.uVignetteStrength.value = cinematic.vignette;
    material.uniforms.uGrainStrength.value = reducedMotion ? cinematic.grain * 0.6 : cinematic.grain;
    material.uniforms.uBloomStrength.value = cinematic.bloom;
    material.uniforms.uSCurveStrength.value = cinematic.sCurve;
    material.uniforms.uSplitToneStrength.value = cinematic.splitTone;
    material.uniforms.uSnowStrength.value = cinematic.snow;
  }, [gl, material, quality, reducedMotion, size.height, size.width, target]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => target.dispose(), [target]);

  useFrame(({ clock }, delta) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    // +-0.5% exposure breathing at 0.08Hz; flat under reduced motion.
    material.uniforms.uExposureBreath.value = reducedMotion
      ? 1
      : 1 + Math.sin(clock.elapsedTime * Math.PI * 2 * 0.08) * 0.005;
    material.uniforms.uCameraNear.value = camera.near;
    material.uniforms.uCameraFar.value = camera.far;
    const motionPose = motionPoseRef?.current;
    const motionWarp = motionWarpFromVelocity(motionPose?.vx, motionPose?.vz, {
      quality,
      reducedMotion,
    });
    motionShiftTarget.set(motionWarp.x, motionWarp.y);
    const motionDamping = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 8.5);
    motionShiftCurrent.lerp(motionShiftTarget, motionDamping);
    motionFisheyeCurrent.current = THREE.MathUtils.lerp(
      motionFisheyeCurrent.current,
      motionWarp.fisheye,
      motionDamping,
    );
    material.uniforms.uMotionVector.value.copy(motionShiftCurrent);
    material.uniforms.uMotionFisheye.value = motionFisheyeCurrent.current;
    const previousAutoClear = gl.autoClear;
    gl.autoClear = true;
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(postScene, postCamera);
    gl.autoClear = previousAutoClear;
  }, 1);

  return null;
}
