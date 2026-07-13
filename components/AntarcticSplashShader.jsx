"use client";

import { useEffect, useRef } from "react";

export const SPLASH_SHADER_PROFILE =
  "black stellar threshold with four 2-D radial wave fields, phase-negating collisions, and idle kaleidoscope drift";

export const SPLASH_RADIAL_PALETTE = Object.freeze({
  neonBlue: "#00A3FF",
  bloodRed: "#8A0303",
  neonRed: "#FF073A",
  nuclearAmber: "#FFB000",
});
// Compatibility export for older gate tooling; the implementation is radial,
// not a set of 1-D ribbons.
export const SPLASH_RIBBON_PALETTE = SPLASH_RADIAL_PALETTE;

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

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  vec3 phaseField3D(vec2 p, float time) {
    float radius = dot(p, p);
    return vec3(
      p.x + sin(p.y * 2.4 + time) * 0.18,
      p.y + cos(p.x * 2.1 - time * 0.8) * 0.16,
      sin(radius * 3.2 - time * 1.4) * 0.48 + cos((p.x - p.y) * 2.6) * 0.2
    );
  }

  vec3 inversePhaseTransform(vec3 phase) {
    return vec3(
      phase.x * 0.82 - phase.z * 0.28,
      phase.y * 0.86 + phase.z * 0.24,
      phase.z - (phase.x + phase.y) * 0.16
    );
  }

  vec3 sixCoupledAxes(vec3 phase, vec3 inversePhase) {
    vec3 forwardAxes = sin(phase * vec3(3.1, 3.7, 4.3));
    vec3 inverseAxes = cos(inversePhase.zyx * vec3(4.1, 3.4, 2.8));
    return 0.5 + 0.25 * (forwardAxes + inverseAxes);
  }

  float qbitInterference(vec3 axes, float time) {
    float forwardWave = sin((axes.x + axes.y - axes.z) * 8.0 + time * 1.8);
    float inverseWave = cos((axes.z + axes.y - axes.x) * 9.0 - time * 1.3);
    return 0.5 + 0.25 * (forwardWave + inverseWave);
  }

  float hypercubeTrace(vec3 phase, vec3 inversePhase) {
    vec3 folded = abs(fract((phase + inversePhase) * 0.72) - 0.5);
    float nearestAxis = min(folded.x, min(folded.y, folded.z));
    float farthestAxis = max(folded.x, max(folded.y, folded.z));
    return smoothstep(0.095, 0.018, nearestAxis) * smoothstep(0.5, 0.16, farthestAxis);
  }

  vec3 chromaticPulse(float interference, float trace, float time) {
    vec3 polarIvory = vec3(0.965, 0.945, 0.89);
    vec3 animeCyan = vec3(0.42, 0.84, 0.88);
    vec3 auroraPink = vec3(0.91, 0.42, 0.67);
    float pulse = 0.5 + 0.5 * sin(time * 1.2 + interference * 6.28318);
    vec3 spectrum = mix(animeCyan, auroraPink, pulse);
    return mix(polarIvory, spectrum, clamp(interference * 0.58 + trace * 0.5, 0.0, 0.78));
  }

  float depthFog(vec3 phase, vec2 uv) {
    float horizon = smoothstep(0.06, 0.72, uv.y);
    float phaseDepth = smoothstep(-0.65, 0.82, phase.z);
    return clamp(horizon * 0.36 + phaseDepth * 0.18, 0.0, 0.48);
  }

  float boundedFlicker(vec3 phase, float time) {
    float cell = hash(floor(phase * 4.0 + time * 0.16));
    return 0.985 + cell * 0.015;
  }

  float starField(vec2 uv, float time) {
    vec2 grid = uv * vec2(190.0, 112.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float seed = hash(vec3(cell, 7.0));
    float dotShape = smoothstep(0.065, 0.008, length(local));
    float twinkle = 0.62 + 0.38 * sin(time * 0.7 + seed * 18.0);
    return dotShape * step(0.91, seed) * twinkle;
  }

  // Fold the plane into six mirrored sectors. Besides making the idle field
  // feel kaleidoscopic, this keeps the expensive pattern bounded to one
  // compact 2-D domain instead of drawing a set of 1-D ribbons.
  vec2 kaleidoscopeDomain(vec2 p, float drift) {
    float radius = length(p);
    float angle = atan(p.y, p.x) + drift;
    float sector = 6.2831853 / 6.0;
    float folded = mod(angle + sector * 0.5, sector);
    folded = abs(folded - sector * 0.5);
    return vec2(cos(folded), sin(folded)) * radius;
  }

  float radialFront(vec2 p, vec2 origin, float time, float speed, float frequency, float phase) {
    vec2 delta = p - origin;
    float radius = length(delta);
    float waveRadius = mod(time * speed + phase, 3.2);
    float ring = exp(-pow(abs(radius - waveRadius) * frequency, 2.0));
    float echo = exp(-pow(abs(radius - waveRadius * 0.58) * frequency * 1.28, 2.0)) * 0.32;
    float angle = atan(delta.y, delta.x);
    float petal = 0.7 + 0.3 * sin(angle * 6.0 - time * 0.9 + radius * 11.0 + phase);
    float edgeFade = 1.0 - smoothstep(1.8, 2.9, radius);
    return (ring * petal + echo) * edgeFade;
  }

  float radialFractal(vec2 p, vec2 origin, float time, float speed, float phase) {
    float field = 0.0;
    float amplitude = 1.0;
    float scale = 1.0;
    for (int octave = 0; octave < 3; octave++) {
      field += radialFront(p * scale, origin * scale, time, speed * scale, 8.0 / scale, phase + float(octave) * 0.71) * amplitude;
      scale *= 1.72;
      amplitude *= 0.42;
    }
    return clamp(field, 0.0, 1.0);
  }

  float electricBlueWave(vec2 p, float time) {
    return radialFractal(p, vec2(-0.45, 0.16), time * 0.86, 0.72, 0.0);
  }

  float bloodRedWave(vec2 p, float time) {
    return radialFractal(p, vec2(0.38, 0.12), time * 0.71, 0.62, 1.7);
  }

  float neonRedWave(vec2 p, float time) {
    return radialFractal(p, vec2(-0.24, -0.22), time * 0.59, 0.56, 3.4);
  }

  float nuclearAmberWave(vec2 p, float time) {
    return radialFractal(p, vec2(0.25, -0.28), time * 0.78, 0.68, 4.8);
  }

  float phaseNegation(float a, float b) {
    return abs(a - b) * (1.0 - min(a, b) * 0.62);
  }

  void legacyMain() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float t = uTime * 0.42;
    vec2 plane = (uv * 2.0 - 1.0) * vec2(aspect, 1.0);
    vec3 phase = phaseField3D(plane, t);
    vec3 inversePhase = inversePhaseTransform(phase);
    vec3 axes = sixCoupledAxes(phase, inversePhase);
    float interference = qbitInterference(axes, t);
    float trace = hypercubeTrace(phase, inversePhase);
    vec3 polarIvory = vec3(0.965, 0.945, 0.89);
    vec3 animeCyan = vec3(0.42, 0.84, 0.88);
    vec3 auroraPink = vec3(0.91, 0.42, 0.67);
    vec3 color = chromaticPulse(interference, trace, t);
    color += animeCyan * trace * 0.22;
    color += auroraPink * pow(interference, 3.0) * 0.08;
    color = mix(color, polarIvory, depthFog(phase, uv));
    color *= boundedFlicker(phase, t);

    float snowPlane = 1.0 - smoothstep(-0.34, 0.52, plane.y);
    float iceBands = 0.5 + 0.5 * sin((phase.x * 3.0 + inversePhase.z * 2.0) * 3.14159);
    color = mix(color, mix(polarIvory, animeCyan, iceBands * 0.16), snowPlane * 0.38);

    vec2 frame = uv * 2.0 - 1.0;
    frame.x *= 0.82;
    float vignette = 1.0 - smoothstep(0.46, 1.42, length(frame));
    color *= mix(0.9, 1.0, vignette);
    color = pow(max(color, 0.0), vec3(0.96));

    gl_FragColor = vec4(color, 1.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (uv * 2.0 - 1.0) * vec2(aspect, 1.0);
    float time = uTime * 0.72;
    float idle = smoothstep(8.0, 42.0, uTime);
    // Let the initially readable radial collisions slowly fold into a
    // six-sector kaleidoscope if the gate is left open. Reduced motion still
    // supplies uTime=0, so this remains a stable, non-animated field.
    p = kaleidoscopeDomain(p, idle * (0.16 + time * 0.08));

    float blue = electricBlueWave(p, time);
    float blood = bloodRedWave(p, time);
    float red = neonRedWave(p, time);
    float amber = nuclearAmberWave(p, time);
    float blueBlood = phaseNegation(blue, blood);
    float redAmber = phaseNegation(red, amber);

    vec3 color = vec3(0.0025, 0.004, 0.008);
    float stars = starField(uv, time);
    color += vec3(stars * 0.92);
    color += vec3(0.0, 0.6392, 1.0) * blue * 0.9;
    color += vec3(0.5412, 0.0118, 0.0118) * blood * 0.82;
    color += vec3(1.0, 0.0275, 0.2275) * red * 0.78;
    color += vec3(1.0, 0.6902, 0.0) * amber * 0.74;
    color += vec3(0.18, 0.24, 0.62) * blueBlood * 0.28;
    color += vec3(0.94, 0.22, 0.08) * redAmber * 0.3;

    // Collisions seed a restrained spectral fringe; the longer the user
    // waits, the more this fringe dominates the negative-space field.
    float collision = clamp(blueBlood + redAmber + abs(blue - red) * 0.32, 0.0, 1.0);
    vec3 spectral = 0.5 + 0.5 * cos(6.28318 * (vec3(0.02, 0.34, 0.68) + collision * 0.24 + time * 0.018));
    float fractalVeil = radialFractal(p * 0.72, vec2(0.0), time * 0.28, 0.22, 1.9);
    color += spectral * fractalVeil * idle * 0.14;

    float dither = (hash(vec3(gl_FragCoord.xy, floor(time * 12.0))) - 0.5) / 255.0;
    color += dither;
    float vignette = 1.0 - smoothstep(0.52, 1.28, length((uv - 0.5) * vec2(1.1, 0.9)));
    color *= mix(0.58, 1.0, vignette);
    gl_FragColor = vec4(max(color, 0.0), 1.0);
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

function scheduleManualWebglRelease({
  buffer,
  canvas,
  contextReleaseTimerRef,
  fragment,
  gl,
  program,
  vertex,
}) {
  canvas.dataset.webglLifecycleActive = "pending-release";
  if (buffer) gl.deleteBuffer(buffer);
  if (program) gl.deleteProgram(program);
  if (vertex) gl.deleteShader(vertex);
  if (fragment) gl.deleteShader(fragment);
  gl.flush();
  window.clearTimeout(contextReleaseTimerRef.current);
  contextReleaseTimerRef.current = window.setTimeout(() => {
    if (canvas.isConnected && canvas.dataset.webglLifecycleActive === "true") {
      contextReleaseTimerRef.current = 0;
      return;
    }
    try {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      contextReleaseTimerRef.current = 0;
    }
  }, 48);
}

function cancelScheduledContextRelease(contextReleaseTimerRef) {
  if (!contextReleaseTimerRef.current) return;
  window.clearTimeout(contextReleaseTimerRef.current);
  contextReleaseTimerRef.current = 0;
}

export default function AntarcticSplashShader({ active = true }) {
  const canvasRef = useRef(null);
  const contextReleaseTimerRef = useRef(0);

  useEffect(() => {
    if (!active) return undefined;
    cancelScheduledContextRelease(contextReleaseTimerRef);
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.dataset.webglLifecycleActive = "true";

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    if (!gl) return undefined;

    const scheduleRelease = (resources = {}) => {
      scheduleManualWebglRelease({
        canvas,
        contextReleaseTimerRef,
        gl,
        ...resources,
      });
    };

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) {
      scheduleRelease({ fragment, vertex });
      return undefined;
    }

    const program = gl.createProgram();
    if (!program) {
      scheduleRelease({ fragment, vertex });
      return undefined;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      scheduleRelease({ fragment, program, vertex });
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
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let reducedMotion = motionQuery.matches;
    let raf = 0;
    let lastFrame = 0;
    canvas.dataset.motion = reducedMotion ? "reduced" : "full";

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
      gl.uniform1f(time, reducedMotion ? 0 : (now - startedAt) * 0.001);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const render = (now) => {
      raf = 0;
      if (reducedMotion) return;
      if (now - lastFrame >= 1000 / 30) {
        lastFrame = now;
        drawFrame(now);
      }
      raf = window.requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (reducedMotion || raf) return;
      raf = window.requestAnimationFrame(render);
    };

    const handleResize = () => {
      resize();
      drawFrame(reducedMotion ? startedAt : performance.now());
    };

    const handleMotionPreference = (event) => {
      reducedMotion = event.matches;
      canvas.dataset.motion = reducedMotion ? "reduced" : "full";
      window.cancelAnimationFrame(raf);
      raf = 0;
      drawFrame(reducedMotion ? startedAt : performance.now());
      startLoop();
    };

    resize();
    drawFrame(reducedMotion ? startedAt : performance.now());
    window.addEventListener("resize", handleResize);
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", handleMotionPreference);
    else motionQuery.addListener(handleMotionPreference);
    startLoop();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      if (motionQuery.removeEventListener) motionQuery.removeEventListener("change", handleMotionPreference);
      else motionQuery.removeListener(handleMotionPreference);
      scheduleRelease({ buffer, fragment, program, vertex });
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="sdf-splash-shader-canvas"
      data-profile={SPLASH_SHADER_PROFILE}
    />
  );
}
