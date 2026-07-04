"use client";

import { useEffect, useRef } from "react";

export const SPLASH_SHADER_PROFILE = "bounded WebGL Antarctica shader gate with blackhole-grade ray atmosphere";

const INITIAL_SHADER_PRIMER = `
(() => {
  const script = document.currentScript;
  const canvas = script && script.previousElementSibling;
  if (!canvas || canvas.__sdfPrimed) return;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  if (!gl) return;
  const width = canvas.width || 300;
  const height = canvas.height || 150;
  gl.viewport(0, 0, width, height);
  gl.clearColor(0.004, 0.018, 0.022, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST);
  const bands = 14;
  for (let index = 0; index < bands; index += 1) {
    const weight = index / Math.max(1, bands - 1);
    const y = Math.floor((height * index) / bands);
    const nextY = Math.ceil((height * (index + 1)) / bands);
    gl.scissor(0, y, width, Math.max(1, nextY - y));
    gl.clearColor(0.006 + weight * 0.026, 0.02 + weight * 0.085, 0.024 + weight * 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.disable(gl.SCISSOR_TEST);
  canvas.__sdfPrimed = true;
})();
`;

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 5; i++) {
      value += noise(p) * amp;
      p = mat2(1.64, -1.12, 1.12, 1.64) * p + 0.17;
      amp *= 0.5;
    }
    return value;
  }

  float ridge(vec2 p, float height, float width) {
    float h = fbm(p * vec2(1.8, 0.86));
    float y = p.y + h * 0.18;
    return smoothstep(width, 0.0, abs(y - height));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.06;

    vec3 color = mix(vec3(0.001, 0.008, 0.010), vec3(0.014, 0.038, 0.044), smoothstep(-0.9, 0.78, p.y));

    float polarHaze = fbm(vec2(p.x * 0.62 + t, p.y * 0.75 - t));
    color += vec3(0.02, 0.09, 0.10) * polarHaze * smoothstep(-0.7, 0.85, p.y) * 0.38;

    float farRidge = ridge(p + vec2(0.0, 0.08), -0.04, 0.11);
    float nearRidge = ridge(p * vec2(1.0, 1.15) + vec2(0.13, 0.2), -0.34, 0.15);
    color = mix(color, vec3(0.03, 0.07, 0.075), farRidge * 0.58);
    color = mix(color, vec3(0.055, 0.105, 0.11), nearRidge * 0.66);

    vec2 dome = vec2((p.x - 0.42) / 0.72, (p.y + 0.21) / 0.42);
    float domeShell = smoothstep(1.0, 0.97, length(dome)) * smoothstep(-0.04, 0.03, dome.y);
    float domeCut = smoothstep(0.98, 1.0, length(dome * vec2(1.0, 0.72)));
    float domeGlow = domeShell * (1.0 - domeCut * 0.24);
    float tileLines = smoothstep(0.018, 0.0, abs(fract((atan(dome.y, dome.x) + 3.14159) * 5.6) - 0.5) - 0.47);
    tileLines += smoothstep(0.018, 0.0, abs(fract(length(dome) * 7.0) - 0.5) - 0.47);
    color += domeGlow * vec3(0.26, 0.42, 0.43);
    color += domeGlow * tileLines * vec3(0.52, 0.92, 0.88);

    vec2 lens = p - vec2(0.42, -0.18);
    float singularity = 1.0 / max(dot(lens, lens) * 18.0, 0.05);
    float ring = smoothstep(0.018, 0.0, abs(length(lens) - 0.42 + sin(t * 3.2) * 0.01));
    color += vec3(0.12, 0.72, 0.68) * ring * 0.55;
    color += vec3(0.04, 0.32, 0.34) * singularity * 0.04;

    float grid = smoothstep(0.012, 0.0, abs(fract((p.x + t) * 9.0) - 0.5) - 0.49);
    grid += smoothstep(0.012, 0.0, abs(fract((p.y - t * 0.8) * 7.0) - 0.5) - 0.49);
    color += vec3(0.08, 0.52, 0.48) * grid * smoothstep(0.65, -0.45, p.y) * 0.11;

    float vignette = smoothstep(1.32, 0.2, length(p * vec2(0.82, 1.0)));
    color *= vignette;
    color = pow(color, vec3(0.88));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function AntarcticSplashShader() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    if (!gl) return undefined;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) return undefined;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return undefined;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "uResolution");
    const time = gl.getUniformLocation(program, "uTime");
    const startedAt = performance.now();
    let raf = 0;
    let lastFrame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.15);
      const width = rect.width || window.innerWidth || 1;
      const height = rect.height || window.innerHeight || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const drawFrame = (now) => {
      gl.uniform1f(time, (now - startedAt) * 0.001);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const render = (now) => {
      if (now - lastFrame >= 1000 / 30) {
        lastFrame = now;
        drawFrame(now);
      }
      raf = window.requestAnimationFrame(render);
    };

    resize();
    drawFrame(performance.now());
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="sdf-splash-shader-canvas"
        data-profile={SPLASH_SHADER_PROFILE}
      />
      <script dangerouslySetInnerHTML={{ __html: INITIAL_SHADER_PRIMER }} />
    </>
  );
}
