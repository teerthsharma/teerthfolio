"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POST_PROCESS_BUDGET } from "../lib/polar-art-direction";
import { motionWarpFromVelocity } from "../lib/polar-world-cadence";

export const GLOBAL_ANIME_POST_PROFILE =
  "anime-soft depth pixel fog: camera-motion fisheye, linear depth, bounded luma/depth edge confidence, chromatic edge AA, toon quantization, stable dither, indigo ink, static scanline, wide vignette, tiered paper contrast grade";
export const GLOBAL_RETRO_POST_PROFILE = GLOBAL_ANIME_POST_PROFILE;
export const POINTER_VISUAL_EFFECTS = "none";

const qualityBudget = POST_PROCESS_BUDGET;

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
  vec2 sampleUv = mix(clampedUv, clamp(pixelUv, 0.001, 0.999), depthFogMask * 0.10);

  // 4. Four cardinal luma taps and four depth taps share one bounded line-confidence field.
  float lumaEdge = lumaEdgeConfidence(sampleUv, texel);
  float depthEdge = depthEdgeConfidence(sampleUv, texel);
  float gaussianEdge = gaussianEdgeConfidence(sampleUv, texel);
  float edgeConfidence = clamp(max(max(lumaEdge, gaussianEdge), depthEdge * 1.15), 0.0, 1.0);

  // 5. RGB offsets only exist on confident outer-screen edges; neighbor AA is capped at 18%.
  vec2 normalizedScreen = vUv * 2.0 - 1.0;
  float outerScreenMask = smoothstep(0.18, 1.12, dot(normalizedScreen, normalizedScreen));
  vec3 color = chromaticEdgeAA(sampleUv, texel, edgeConfidence, outerScreenMask);
  color = mix(color, vec3(0.7216, 0.8863, 0.8745), depthFogMask * 0.08);

  // 6-7. Ten luminance bands, 24 channel levels, then stable 0.0025 dither.
  color = toonQuantize(color);
  float temporalSeed = floor(uTime * 6.0);
  float dither = interleavedGradientNoise(gl_FragCoord.xy, temporalSeed) - 0.5;
  color += vec3(dither * 0.0025);

  // 8-10. Indigo ink, static scanlines, and an 8% maximum wide vignette finish the pass.
  vec3 animeInk = vec3(0.2, 0.2510, 0.4314);
  color = mix(color, animeInk, edgeConfidence * uInkStrength);
  float scanline = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159265);
  color *= 1.0 - scanline * uScanlineStrength;
  float vignette = smoothstep(0.50, 1.45, dot(normalizedScreen, normalizedScreen));
  color = mix(color, animeInk, vignette * 0.08);

  // 11. A tiered paper-grade curve restores ink structure; medium/high retain brighter snow.
  color *= (uGradeBase + uGradeCurve * color);
  color = paperShadowSeparation(color);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function makeRenderTarget(width = 1, height = 1) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
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
    const dpr = Math.min(gl.getPixelRatio(), 1);
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
  }, [gl, material, quality, size.height, size.width, target]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => target.dispose(), [target]);

  useFrame(({ clock }, delta) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
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
