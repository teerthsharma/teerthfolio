"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const GLOBAL_RETRO_POST_PROFILE =
  "global post stack: toon quantization, chromatic AA, depth pixel fog, gaussian edge ink, scanline fisheye vignette";

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
uniform float uIntensity;
uniform float uPixelSize;
uniform float uChromaticStrength;

varying vec2 vUv;

float retroLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float retroPerspectiveDepthToViewZ(float invClipZ, float near, float far) {
  return (near * far) / ((far - near) * invClipZ - far);
}

float retroViewZToOrthographicDepth(float viewZ, float near, float far) {
  return (viewZ + near) / (near - far);
}

float readLinearDepth(vec2 uv) {
  float fragCoordZ = texture2D(tDepth, clamp(uv, 0.001, 0.999)).x;
  float viewZ = retroPerspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
  return clamp(retroViewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar), 0.0, 1.0);
}

vec2 fisheyeUv(vec2 uv) {
  vec2 p = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  p *= 1.0 + 0.012 * r2;
  return p * 0.5 + 0.5;
}

float gaussianEdge(vec2 uv, vec2 texel) {
  float c = retroLuminance(texture2D(tDiffuse, uv).rgb);
  float blur = 0.0;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2(-1.0, -1.0)).rgb) * 0.0625;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2( 0.0, -1.0)).rgb) * 0.125;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2( 1.0, -1.0)).rgb) * 0.0625;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2(-1.0,  0.0)).rgb) * 0.125;
  blur += c * 0.25;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2( 1.0,  0.0)).rgb) * 0.125;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2(-1.0,  1.0)).rgb) * 0.0625;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2( 0.0,  1.0)).rgb) * 0.125;
  blur += retroLuminance(texture2D(tDiffuse, uv + texel * vec2( 1.0,  1.0)).rgb) * 0.0625;
  return smoothstep(0.026, 0.12, abs(c - blur) * 2.45);
}

vec3 toonQuantize(vec3 color, float dither) {
  float luma = max(0.001, retroLuminance(color));
  float band = floor(luma * 6.0 + dither * 0.38) / 6.0;
  vec3 banded = color * mix(1.0, band / luma, 0.24 * uIntensity);
  vec3 quantized = floor(banded * 28.0 + dither * 0.48) / 28.0;
  return mix(color, quantized, 0.38 * uIntensity);
}

void main() {
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));
  vec2 uv = fisheyeUv(vUv);
  vec2 clampedUv = clamp(uv, 0.001, 0.999);
  float depth = readLinearDepth(clampedUv);
  float farMask = smoothstep(0.38, 0.96, depth);
  float pixelStep = mix(1.0, uPixelSize, farMask * 0.28 * uIntensity);
  vec2 pixelUv = (floor(clampedUv * uResolution / pixelStep) + 0.5) * pixelStep / uResolution;
  vec2 sampleUv = mix(clampedUv, pixelUv, farMask * 0.32 * uIntensity);

  float edge = gaussianEdge(sampleUv, texel);
  vec2 fromCenter = sampleUv - 0.5;
  vec2 chromaOffset = normalize(fromCenter + vec2(0.0001)) * texel * (0.54 + farMask * 0.82 + edge * 0.58) * uChromaticStrength;
  vec3 color;
  color.r = texture2D(tDiffuse, clamp(sampleUv + chromaOffset, 0.001, 0.999)).r;
  color.g = texture2D(tDiffuse, sampleUv).g;
  color.b = texture2D(tDiffuse, clamp(sampleUv - chromaOffset, 0.001, 0.999)).b;

  float dither = hash12(gl_FragCoord.xy + floor(uTime * 12.0)) - 0.5;
  color = toonQuantize(color + dither * 0.0045 * uIntensity, dither);

  vec3 coldFog = vec3(0.62, 0.9, 0.96);
  color = mix(color, coldFog, farMask * 0.055 * uIntensity);

  vec3 ink = vec3(0.018, 0.03, 0.055);
  color = mix(color, ink, edge * 0.16 * uIntensity);

  float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159265);
  color *= 1.0 - scan * 0.017 * uIntensity;

  vec2 p = vUv * 2.0 - 1.0;
  float vignette = smoothstep(0.44, 1.34, dot(p, p));
  color *= 1.0 - vignette * 0.055 * uIntensity;
  color += vec3(0.035, 0.075, 0.09) * (1.0 - vignette) * 0.1 * uIntensity;

  gl_FragColor = vec4(color, 1.0);
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

export default function RetroCinematicPostProcess({ quality = "medium", reducedMotion = false }) {
  const { camera, gl, scene, size } = useThree();
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
          uChromaticStrength: { value: 1.0 },
          uIntensity: { value: 1.0 },
          uPixelSize: { value: 2.0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
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
    const renderScale = quality === "low" ? 0.72 : quality === "medium" ? 0.86 : 1;
    const dpr = Math.min(gl.getPixelRatio(), quality === "low" ? 0.8 : quality === "medium" ? 0.92 : 1);
    const width = Math.max(1, Math.floor(size.width * dpr * renderScale));
    const height = Math.max(1, Math.floor(size.height * dpr * renderScale));
    target.setSize(width, height);
    material.uniforms.uResolution.value.set(width, height);
    material.uniforms.uIntensity.value = quality === "low" ? 0.48 : quality === "medium" ? 0.6 : 0.7;
    material.uniforms.uPixelSize.value = quality === "low" ? 1.85 : quality === "medium" ? 1.58 : 1.34;
    material.uniforms.uChromaticStrength.value = quality === "low" ? 0.42 : quality === "medium" ? 0.55 : 0.68;
  }, [gl, material, quality, size.height, size.width, target]);

  useEffect(
    () => () => {
      target.dispose();
      material.dispose();
    },
    [material, target],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uCameraNear.value = camera.near;
    material.uniforms.uCameraFar.value = camera.far;

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
