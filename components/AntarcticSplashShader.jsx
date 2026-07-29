"use client";

import { useEffect, useRef } from "react";

export const SPLASH_SHADER_PROFILE =
  "deep polar twilight threshold with a six-axis hex phase gate, phase-negating ring collisions, mint-violet aurora ribbons, warm low-sun horizon, rim-lit night ice shelf, and idle kaleidoscope drift";

export const SPLASH_RADIAL_PALETTE = Object.freeze({
  neonBlue: "#BFD8FF",
  bloodRed: "#2C3F66",
  neonRed: "#8D69D6",
  nuclearAmber: "#F2B96B",
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

  float splashNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(vec3(i, 5.0));
    float b = hash(vec3(i + vec2(1.0, 0.0), 5.0));
    float c = hash(vec3(i + vec2(0.0, 1.0), 5.0));
    float d = hash(vec3(i + vec2(1.0, 1.0), 5.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float splashFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 3; octave++) {
      value += splashNoise(p) * amplitude;
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
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

  float phaseNegation(float a, float b) {
    return abs(a - b) * (1.0 - min(a, b) * 0.62);
  }

  float hexDistance(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.8660254, 0.5)), p.x);
  }

  float gateRing(vec2 p, vec2 origin, float radius, float sharpness) {
    float distanceHex = hexDistance(p - origin);
    return exp(-pow(abs(distanceHex - radius) * sharpness, 2.0));
  }

  float starSparkle(vec2 uv, float time) {
    vec2 drift = vec2(0.0, time * 0.004);
    vec2 grid = (uv + drift) * vec2(150.0, 90.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float seed = hash(vec3(cell, 3.7));
    float dotShape = smoothstep(0.08, 0.02, length(local));
    float twinkle = 0.5 + 0.5 * sin(time * 0.9 + seed * 20.0);
    return dotShape * step(0.935, seed) * twinkle;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (uv * 2.0 - 1.0) * vec2(aspect, 1.0);
    float time = uTime * 0.45;
    float idle = smoothstep(8.0, 42.0, uTime);
    // Reduced motion still supplies uTime=0, so the gate remains a stable,
    // non-animated twilight field; idle waiting slowly folds the gate rings
    // into the six-sector kaleidoscope.
    vec2 gateP = kaleidoscopeDomain(p * 1.02, idle * (0.10 + time * 0.05));

    // POLAR DUSK night-launch palette.
    vec3 duskCore = vec3(0.0784, 0.1098, 0.2);      // #141C33 zenith
    vec3 duskHorizon = vec3(0.1725, 0.2471, 0.4);   // #2C3F66 horizon
    vec3 fogBlue = vec3(0.2078, 0.2745, 0.4196);    // #35466B fog band
    vec3 iceRim = vec3(0.749, 0.8471, 1.0);         // #BFD8FF ice rim
    vec3 sunWarm = vec3(1.0, 0.851, 0.6392);        // #FFD9A3 low sun
    vec3 amber = vec3(0.949, 0.7255, 0.4196);       // #F2B96B warm accent
    vec3 mint = vec3(0.4353, 0.9059, 0.7843);       // #6FE7C8 aurora mint
    vec3 violet = vec3(0.5529, 0.4118, 0.8392);     // #8D69D6 aurora violet

    // Deep polar twilight sky: fog-lifted horizon fading to a near-night zenith.
    vec3 sky = mix(duskHorizon, duskCore, smoothstep(-0.35, 0.85, p.y));
    sky = mix(sky, fogBlue, exp(-pow((p.y + 0.22) / 0.3, 2.0)) * 0.5);

    // One warm low sun resting on the shelf, plus an amber glow along the horizon.
    vec2 sunPos = vec2(-0.62, -0.16);
    float sunDist = length((p - sunPos) * vec2(1.0, 1.35));
    float sunDisc = smoothstep(0.08, 0.058, sunDist);
    float sunHalo = exp(-sunDist * 2.8);
    sky = mix(sky, sunWarm, clamp(sunHalo * 0.3 + sunDisc * 0.9, 0.0, 1.0));
    sky += amber * sunDisc * 0.35 + amber * sunHalo * 0.16;
    float horizonKiss = exp(-pow((p.y + 0.22) / 0.2, 2.0));
    sky = mix(sky, amber, horizonKiss * 0.24 * (0.35 + 0.65 * exp(-pow((p.x + 0.55) / 0.7, 2.0))));

    // Two drifting aurora ribbons aloft: mint-led with a violet sweep and an
    // ice-rim shimmer; night skies let them carry more of the frame.
    float auroraMask = smoothstep(0.1, 0.4, p.y) * (1.0 - smoothstep(0.95, 1.3, p.y));
    float curtainA = exp(-pow((p.y - (0.52 + 0.13 * sin(p.x * 1.2 + time * 0.23) + splashFbm(vec2(p.x * 0.8 + time * 0.05, 3.7)) * 0.1)) / 0.11, 2.0));
    float curtainB = exp(-pow((p.y - (0.74 + 0.09 * sin(p.x * 0.9 - time * 0.17 + 2.1))) / 0.085, 2.0));
    float shimmer = 0.55 + 0.45 * sin(p.x * 9.0 + time * 0.6 + splashFbm(p * 2.0) * 3.0);
    vec3 aurora = mix(mint, violet, clamp(p.x * 0.5 + 0.5, 0.0, 1.0));
    aurora = mix(aurora, iceRim, clamp(sin(p.x * 1.3 + time * 0.1) * 0.5 + 0.5, 0.0, 1.0) * 0.18);
    sky = mix(sky, aurora, clamp(curtainA * 0.5 + curtainB * 0.3, 0.0, 0.7) * shimmer * auroraMask);

    // The six-axis topology gate: a crisp static hex lattice with faint spokes,
    // plus one expanding phase-wave pair whose collisions strike amber fringes.
    vec2 gateCenter = vec2(0.0, 0.04);
    float hexD = hexDistance(gateP - gateCenter);
    float staticRings = 0.0;
    for (int ring = 1; ring <= 4; ring++) {
      float radius = 0.18 * float(ring);
      staticRings += exp(-pow((hexD - radius) * 26.0, 2.0)) * (0.5 - float(ring) * 0.07);
    }
    float gateAngle = atan(gateP.y - gateCenter.y, gateP.x - gateCenter.x);
    float spokes = pow(abs(cos(gateAngle * 3.0)), 24.0) * smoothstep(0.8, 0.18, hexD);
    float waveA = mod(time * 0.22, 1.1);
    float waveB = mod(time * 0.22 + 0.55, 1.1);
    float ringsA = exp(-pow((hexD - waveA) * 18.0, 2.0));
    float ringsB = exp(-pow((hexD - waveB) * 18.0, 2.0));
    float collision = phaseNegation(ringsA, ringsB);
    float gateFade = 1.0 - smoothstep(0.55, 1.0, hexD);
    sky = mix(sky, mint * 0.8, clamp(staticRings, 0.0, 1.0) * 0.3 * gateFade);
    sky = mix(sky, mint, clamp(spokes, 0.0, 1.0) * 0.16 * gateFade);
    sky = mix(sky, iceRim * 0.75, clamp(ringsA, 0.0, 1.0) * 0.45 * gateFade);
    sky = mix(sky, amber, clamp(collision + ringsB * 0.4, 0.0, 1.0) * 0.4 * gateFade);

    // Night ice shelf: twilight-blue sastrugi, rim-lit warm near the sun and
    // ice-blue away from it — the silhouetted launch pad of the route.
    float shelfLine = -0.34 + splashFbm(vec2(p.x * 1.4, 8.2)) * 0.06;
    float shelf = 1.0 - smoothstep(shelfLine - 0.015, shelfLine + 0.02, p.y);
    float sastrugi = 0.5 + 0.5 * sin(p.x * 9.0 + splashFbm(p * 3.0) * 4.0);
    vec3 shelfColor = mix(duskHorizon * 1.05, fogBlue * 1.2, 0.45 + 0.35 * sastrugi);
    shelfColor = mix(shelfColor, duskCore, (0.2 + 0.22 * sastrugi) * (1.0 - smoothstep(-0.9, -0.34, p.y)));
    shelfColor += iceRim * 0.05 * sastrugi;
    sky = mix(sky, shelfColor, shelf);
    float shelfRim = exp(-pow((p.y - shelfLine) / 0.02, 2.0));
    float rimWarm = 0.35 + 0.65 * exp(-pow((p.x + 0.55) / 0.8, 2.0));
    sky = mix(sky, mix(iceRim, sunWarm, rimWarm), shelfRim * 0.34);

    // High cirrus veils and a denser field of night-sky star sparkle.
    float cirrus = splashFbm(vec2(p.x * 1.1 + time * 0.02, p.y * 3.4));
    cirrus = smoothstep(0.55, 0.85, cirrus) * smoothstep(0.15, 0.4, p.y) * (1.0 - smoothstep(0.7, 1.05, p.y));
    sky = mix(sky, iceRim, cirrus * 0.08);
    float sparkle = starSparkle(uv, time);
    sky += iceRim * sparkle * 0.55;

    float vignette = smoothstep(0.55, 1.5, length((uv - 0.5) * vec2(1.15, 0.95)));
    sky = mix(sky, duskCore * 0.85, vignette * 0.5);
    float dither = (hash(vec3(gl_FragCoord.xy, floor(time * 12.0))) - 0.5) / 255.0;
    gl_FragColor = vec4(clamp(sky + dither, 0.0, 1.0), 1.0);
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
