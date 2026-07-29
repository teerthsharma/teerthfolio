import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// ASSEMBLY VEIL — the page "pieces itself together": a thin gaussian lens-band
// sweeps the frame on world reveal and on dock arrival. Ahead of the wavefront
// the world is faintly dimmed and refraction-shimmered; behind it, clean.
// Idle contribution is imperceptible (the sweep mesh fully unmounts from the
// draw list via visible=false). Deterministic: no Math.random, time-driven only.
const VEIL_SWEEP_PROFILE = {
  durationSeconds: 1.2,
  refractorySeconds: 1.6,
  revealDelaySeconds: 0.12,
  idleContributionCeiling: 0.02,
};

const QUALITY_TIER = { low: 0, medium: 1, high: 2 };

// Shared suite noise fingerprint (identical across veil / travel warp / aurora).
const PN_NOISE_GLSL = `
  float pn_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float pn_noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pn_hash(i), pn_hash(i + vec2(1.0, 0.0)), f.x),
               mix(pn_hash(i + vec2(0.0, 1.0)), pn_hash(i + vec2(1.0, 1.0)), f.x), f.y); }
  float pn_fbm(vec2 p){ float a = 0.5; float v = 0.0; for (int i = 0; i < 4; i++){ v += a * pn_noise(p); p *= 2.03; a *= 0.5; } return v; }
  // Single-return form: the old early-return branch tripped ANGLE's
  // "potentially uninitialized variable" warning on D3D targets.
  float pn_fbm_q(vec2 p, float tier){
    float octaves = tier < 0.5 ? 2.0 : 4.0;
    float a = 0.5; float v = 0.0;
    for (int i = 0; i < 4; i++){
      if (float(i) < octaves) { v += a * pn_noise(p); p *= 2.03; a *= 0.5; }
    }
    return v;
  }
`;

const AURORA_ANCHORS_GLSL = `
  const vec3 AURORA_MINT = vec3(0.4353, 0.9059, 0.7843);
  const vec3 AURORA_VIOLET = vec3(0.5529, 0.4118, 0.8392);
  const vec3 DEEP_CORE = vec3(0.0471, 0.0667, 0.1333);
`;

const backdropVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Quiet atmospheric backdrop (behind the world, renderOrder -10). Keeps the
// original dusk pressure-fog identity but on the shared pn_ fingerprint.
const backdropFragmentShader = `
  precision highp float;
  uniform float uWorldTime;
  uniform vec3 uStationAccent;
  uniform float uQualityTier;
  uniform float uReducedMotion;
  varying vec2 vUv;
  ${PN_NOISE_GLSL}
  ${AURORA_ANCHORS_GLSL}

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= 1.65;
    float r = length(uv);
    float t = mix(uWorldTime, 8.0, uReducedMotion);
    float fog = smoothstep(1.32, 0.08, r);
    float scan = sin((vUv.y + t * 0.035) * 360.0) * 0.006;
    float pressure = pn_fbm_q(uv * 3.0 + vec2(t * 0.035, -t * 0.02), uQualityTier);
    // No permanent ring/ellipse term: the old idle ring composited as a ghost
    // ellipse over sky and terrain from any camera facing world center.
    vec3 color = vec3(0.10, 0.14, 0.24);
    color += uStationAccent * fog * 0.05;
    color += AURORA_MINT * pow(max(0.0, 1.0 - r), 4.0) * 0.055;
    color += vec3(scan + pressure * 0.012);
    // Lowered fog ceiling so distant landforms behind the plane stay visible.
    float alpha = clamp(fog * 0.07, 0.0, 0.12);
    gl_FragColor = vec4(color, alpha);
  }
`;

// Fullscreen clip-space quad: matrices ignored, always covers the frame.
const sweepVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const sweepFragmentShader = `
  precision highp float;
  uniform float uWorldTime;
  uniform float uSweep;
  uniform float uDockProgress;
  uniform vec3 uStationAccent;
  uniform float uQualityTier;
  uniform float uReducedMotion;
  uniform vec2 uResolution;
  varying vec2 vUv;
  ${PN_NOISE_GLSL}
  ${AURORA_ANCHORS_GLSL}

  void main() {
    float aspect = max(uResolution.x, 1.0) / max(uResolution.y, 1.0);
    vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);
    // vignette-weighted compositing: contributions die toward frame corners.
    float vig = smoothstep(1.35, 0.35, length(c));

    float progress = clamp(uSweep, 0.0, 1.0);
    float sweepWindow = smoothstep(0.0, 0.10, progress) * (1.0 - smoothstep(0.80, 1.0, progress));
    sweepWindow *= (1.0 - uReducedMotion);

    // Assembly wavefront travels along a fixed diagonal axis across the frame.
    vec2 axis = normalize(vec2(0.885, 0.465));
    float travel = (aspect * abs(axis.x) + abs(axis.y)) * 0.5 + 0.35;
    float eased = progress * progress * (3.0 - 2.0 * progress);
    float sweepPos = mix(-travel, travel, eased);
    float lateral = dot(c, vec2(-axis.y, axis.x));
    float wobble = (pn_fbm_q(vec2(lateral * 2.4, uWorldTime * 0.35), uQualityTier) - 0.5) * 0.16;
    float d = dot(c, axis) - sweepPos + wobble * sweepWindow;

    // Thin gaussian lens-band (same family as the black hole horizonBand):
    // a tight core plus an independent, wider soft halo so the profile rolls
    // off like a lens instead of a hard-edged stripe.
    float band = exp(-pow(d * 8.5, 2.0));
    float halo = exp(-pow(d * 2.1, 2.0));

    // Ahead of the front: not yet assembled — dimmed, refraction-shimmered.
    float ahead = smoothstep(0.02, 0.30, d);
    float shimmer = pn_fbm_q(c * 5.0 + vec2(uWorldTime * 0.22, -uWorldTime * 0.13), uQualityTier);
    float refract = ahead * (0.55 + 0.45 * shimmer);

    // Behind the front: clean world, only a fading mint settle fringe. It
    // trails the core slightly and eases out on its own later window so the
    // frame reads as settling rather than being wiped.
    float settle = exp(-pow((d + 0.13) * 9.0, 2.0));
    float settleWindow = smoothstep(0.06, 0.20, progress) * (1.0 - smoothstep(0.88, 1.0, progress));
    settleWindow *= (1.0 - uReducedMotion);

    // Polar-angle aurora modulation, tinted by the active station accent.
    float theta = atan(c.y, c.x);
    vec3 aurora = mix(AURORA_MINT, AURORA_VIOLET, 0.5 + 0.5 * sin(theta * 2.0 + uWorldTime * 0.4));
    vec3 bandColor = mix(aurora, uStationAccent, 0.45);

    vec3 color = DEEP_CORE;
    float alpha = refract * 0.22 * sweepWindow * vig;
    // Core takes the accent aurora near full weight; the halo only breathes
    // a softened share of it so the skirt never reads as a second stripe.
    color = mix(color, bandColor * 1.06, clamp(band + halo * 0.35, 0.0, 1.0));
    alpha += (band * 0.60 + halo * 0.14) * sweepWindow * vig;
    color = mix(color, AURORA_MINT, settle * 0.45);
    alpha += settle * 0.06 * settleWindow * vig;

    // dock strength gives arrival sweeps a touch more presence than reveals.
    alpha *= 0.82 + 0.18 * clamp(uDockProgress, 0.0, 1.0);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.6));
  }
`;

function fract01(value) {
  return value - Math.floor(value);
}

function smoothstep01(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sweepActivity(progress) {
  return smoothstep01(0, 0.1, progress) * (1 - smoothstep01(0.8, 1, progress));
}

function PressureDust({ quality, reducedMotion }) {
  const points = useRef(null);
  const count = quality === "low" ? 90 : quality === "medium" ? 150 : 240;
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      // deterministic per-index hash: same dust constellation every session.
      const h0 = fract01(Math.sin(i * 127.1 + 311.7) * 43758.5453);
      const h1 = fract01(Math.sin(i * 269.5 + 183.3) * 43758.5453);
      const h2 = fract01(Math.sin(i * 419.2 + 371.9) * 43758.5453);
      values[i * 3] = (h0 - 0.5) * 10;
      values[i * 3 + 1] = h1 * 3.4 - 0.2;
      values[i * 3 + 2] = (h2 - 0.5) * 6.5;
    }
    return values;
  }, [count]);

  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return;
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.08;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.24) * 0.04;
  });

  return (
    <points ref={points} name="ActiveTheoryPressureDust">
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#BFD8FF" size={0.016} transparent opacity={0.22} depthWrite={false} />
    </points>
  );
}

export default function ActiveTheoryVeil({ accent = "#6FE7C8", quality = "high" }) {
  const sweepMesh = useRef(null);
  const sweepState = useRef({
    accent: null,
    exportedActivity: -1,
    hostElement: null,
    lastTriggerTime: -Infinity,
    prevDockProgress: 0,
    revealFired: false,
    // 1 = settled/clean; a trigger rewinds to 0 and the sweep replays.
    sweepProgress: 1,
  });
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    [],
  );

  const backdropUniforms = useMemo(
    () => ({
      uWorldTime: { value: 0 },
      uStationAccent: { value: new THREE.Color("#6FE7C8") },
      uQualityTier: { value: 2 },
      uReducedMotion: { value: 0 },
    }),
    [],
  );
  const sweepUniforms = useMemo(
    () => ({
      uWorldTime: { value: 0 },
      uSweep: { value: 1 },
      uDockProgress: { value: 0 },
      uStationAccent: { value: new THREE.Color("#6FE7C8") },
      uQualityTier: { value: 2 },
      uReducedMotion: { value: 0 },
      uResolution: { value: new THREE.Vector2(1280, 800) },
    }),
    [],
  );

  useEffect(() => {
    backdropUniforms.uStationAccent.value.set(accent);
    sweepUniforms.uStationAccent.value.set(accent);
  }, [accent, backdropUniforms, sweepUniforms]);
  useEffect(() => {
    const tier = QUALITY_TIER[quality] ?? 2;
    backdropUniforms.uQualityTier.value = tier;
    sweepUniforms.uQualityTier.value = tier;
  }, [quality, backdropUniforms, sweepUniforms]);
  useEffect(() => {
    const flag = reducedMotion ? 1 : 0;
    backdropUniforms.uReducedMotion.value = flag;
    sweepUniforms.uReducedMotion.value = flag;
  }, [reducedMotion, backdropUniforms, sweepUniforms]);
  useEffect(() => {
    const state = sweepState.current;
    return () => {
      // release the exported cross-shader activity signal on unmount.
      if (state.hostElement) delete state.hostElement.dataset.veilActivity;
    };
  }, []);

  useFrame(({ clock, gl, size, viewport }, delta) => {
    const t = clock.elapsedTime;
    const state = sweepState.current;
    const worldTime = reducedMotion ? 8.0 : t;
    backdropUniforms.uWorldTime.value = worldTime;
    sweepUniforms.uWorldTime.value = worldTime;
    sweepUniforms.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);

    if (state.hostElement && !state.hostElement.isConnected) {
      // Canvas remount (context loss/recovery) — re-resolve and re-export.
      state.hostElement = null;
      state.exportedActivity = -1;
    }
    if (!state.hostElement) {
      state.hostElement = gl.domElement.closest("[data-station-proximity]") || gl.domElement.parentElement;
    }
    const host = state.hostElement;

    // uDockProgress: arrival strength approximated from the scene's published
    // station proximity (no extra props reach this mount site).
    let dockProgress = 0;
    const proximityAttr = host?.getAttribute?.("data-station-proximity");
    if (proximityAttr) {
      const parsed = Number.parseFloat(proximityAttr);
      if (Number.isFinite(parsed)) dockProgress = Math.min(1, Math.max(0, parsed));
    }
    sweepUniforms.uDockProgress.value = dockProgress;

    if (!reducedMotion) {
      // World reveal: fire once when the world publicly starts rendering.
      if (!state.revealFired) {
        const revealHost = gl.domElement.closest("[data-render-enabled]");
        const renderEnabled = revealHost
          ? revealHost.getAttribute("data-render-enabled") === "true"
          : true;
        if (renderEnabled) {
          state.revealFired = true;
          state.sweepProgress = -VEIL_SWEEP_PROFILE.revealDelaySeconds / VEIL_SWEEP_PROFILE.durationSeconds;
          state.lastTriggerTime = t;
        }
      }
      // Dock arrival: rising edge of proximity, or the active accent changing.
      const dockRising = dockProgress >= 0.5 && state.prevDockProgress < 0.5;
      const accentChanged = state.accent !== null && state.accent !== accent;
      if (
        (dockRising || accentChanged) &&
        t - state.lastTriggerTime > VEIL_SWEEP_PROFILE.refractorySeconds
      ) {
        state.sweepProgress = 0;
        state.lastTriggerTime = t;
      }
      // Advance by clamped delta so shader-compile stalls and demand-loop
      // gaps cannot swallow the sweep window (elapsedTime can jump seconds),
      // while low-frame-rate devices still track real time.
      if (state.sweepProgress < 1) {
        state.sweepProgress = Math.min(
          1,
          state.sweepProgress + Math.min(delta, 0.25) / VEIL_SWEEP_PROFILE.durationSeconds,
        );
      }
    }
    state.prevDockProgress = dockProgress;
    state.accent = accent;

    // Reduced motion: no sweep, instantly clean.
    const progress = reducedMotion ? 1 : Math.max(0, state.sweepProgress);
    sweepUniforms.uSweep.value = progress;

    const activity = reducedMotion ? 0 : sweepActivity(progress);
    if (sweepMesh.current) {
      // Idle: fully off the draw list — below the 0.02 contribution ceiling.
      sweepMesh.current.visible = activity > 0.004;
    }
    // Export activity for sibling shaders (travel warp yields while we sweep).
    const quantized = Math.round(activity * 20) / 20;
    if (host && quantized !== state.exportedActivity) {
      state.exportedActivity = quantized;
      host.dataset.veilActivity = quantized.toFixed(2);
    }
  });

  return (
    <group name="ActiveTheoryVeil" className="active-theory-veil">
      <mesh position={[0, 1.15, -4.2]} scale={[13.5, 8.2, 1]} renderOrder={-10}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <shaderMaterial
          depthTest={false}
          depthWrite={false}
          fragmentShader={backdropFragmentShader}
          transparent
          uniforms={backdropUniforms}
          vertexShader={backdropVertexShader}
        />
      </mesh>
      <mesh frustumCulled={false} name="AssemblyVeilSweep" ref={sweepMesh} renderOrder={30} visible={false}>
        <planeGeometry args={[2, 2, 1, 1]} />
        <shaderMaterial
          depthTest={false}
          depthWrite={false}
          fragmentShader={sweepFragmentShader}
          transparent
          uniforms={sweepUniforms}
          vertexShader={sweepVertexShader}
        />
      </mesh>
      <PressureDust quality={quality} reducedMotion={reducedMotion} />
    </group>
  );
}
