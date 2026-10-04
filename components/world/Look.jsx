"use client";

// The image-wide look, laid over whatever the island draws.
//
//   Sky    a procedural environment (no files, no network): sky above, snow
//          bounce below, a band of teal sea at the horizon and a hot disc
//          where the sun stands, so glossy things (the seal, ice, lamps)
//          catch light. It takes over part of the hemisphere light (see
//          LIGHT.env in palette.js), so matte colours stay calibrated.
//   Post   ambient occlusion so things sit on the snow, a bloom that only
//          sees emissive lamps, the radiation on the viewer's eyes
//          (look/RadiationPov.js: crossing into an area floods and warps the
//          view, then clears), then the Neutral tone map the palette was
//          solved for, applied once at the very end.
//   Tier   a rung of the ladder in lib/world/quality.js (T0 potato .. T4
//          top): pixel budget, MSAA, sun shadow, AO, bloom, snow, sky.
//          The renderer string picks the first rung (or the one this GPU
//          settled on last visit), the loading screen measures it
//          (Scene.jsx FirstFrame), then PerformanceMonitor moves it both
//          ways: down below 50 fps, up with headroom. ?look=0..4 pins one.
//          Resolution is the first thing a rung spends: the frame cost is
//          mostly per pixel, and a fixed DPR gave the biggest screen
//          (a laptop) the most pixels and the worst frame.

import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { SelectiveBloomEffect, ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BackSide } from "three";
import { TIERS, TOP, classify, climbCost, dprFor, recall, remember } from "../../lib/world/quality";
import { getUi, setUi, useUi } from "../../lib/world/store";
import { RadiationPovEffect, stepRadiationPov } from "./look/RadiationPov";
import { C, LIGHT } from "./palette";

const pinned = () => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("look");
  return v === null || !/^[0-4]$/.test(v) ? null : Number(v);
};

// Where Island.jsx puts the sun, as a direction.
const SUN_DIR = [-14, 26, 12].map((v) => v / Math.hypot(-14, 26, 12));

function Sky() {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={LIGHT.env}>
      <color attach="background" args={[LIGHT.hemiSky]} />
      {/* the snow below: a lower dome in the hemisphere's ground colour */}
      <mesh scale={90}>
        <sphereGeometry args={[1, 32, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color={LIGHT.hemiGround} side={BackSide} toneMapped={false} />
      </mesh>
      {/* the sea: a teal band just under the horizon, a rim on glossy sides */}
      <mesh position={[0, -5, 0]}>
        <cylinderGeometry args={[80, 80, 10, 48, 1, true]} />
        <meshBasicMaterial color={C.sea} side={BackSide} toneMapped={false} />
      </mesh>
      {/* the sun: small and hot, so glossy things get one crisp highlight */}
      <Lightformer form="circle" color={LIGHT.sun} intensity={LIGHT.envSun} scale={9} position={SUN_DIR.map((v) => v * 60)} target={[0, 0, 0]} />
    </Environment>
  );
}

// A mesh blooms when its material glows on its own. glow() shells are left
// out on purpose: they write no depth, so the bloom mask cannot see them, and
// selecting one would hide the lamp inside it.
const glows = (m) => m.emissive !== undefined && m.depthWrite !== false && m.emissiveIntensity * Math.max(m.emissive.r, m.emissive.g, m.emissive.b) > 0.15;

function useLampBloom() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const bloom = useMemo(() => new SelectiveBloomEffect(scene, camera, {
    mipmapBlur: true,
    intensity: 0.9,
    radius: 0.7,
    luminanceThreshold: 0.35,
    luminanceSmoothing: 0.25,
  }), [scene, camera]);
  useEffect(() => () => bloom.dispose(), [bloom]);

  // Lamps come and go (buildings mount late, the seal mutates), so the set is
  // rebuilt once a second rather than every frame.
  const wait = useRef(0);
  const visit = useMemo(() => (o) => {
    if (o.isMesh && (Array.isArray(o.material) ? o.material.some(glows) : glows(o.material))) bloom.selection.add(o);
  }, [bloom]);
  useFrame((_, dt) => {
    wait.current -= dt;
    if (wait.current > 0) return;
    wait.current = 1;
    bloom.selection.clear();
    scene.traverse(visit);
    if (window.__world) window.__world.lamps = bloom.selection.size;
  });
  return bloom;
}

// N8AO, left to itself, spots any transparent material (every glow shell,
// the water) and then re-renders the whole scene twice more per frame to
// keep AO off it. That tripled the frame on this GPU; AO under a glow is
// invisible anyway.
const opaqueOnly = (ao) => {
  if (!ao) return;
  ao.autoDetectTransparency = false;
  ao.configuration.transparencyAware = false;
};

function useRadiationPov() {
  const pov = useMemo(() => new RadiationPovEffect(), []);
  useEffect(() => () => pov.dispose(), [pov]);
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useFrame((state) => stepRadiationPov(pov, state.clock.elapsedTime, state.size.width / state.size.height, reduced));
  return pov;
}

function Glow() {
  const bloom = useLampBloom();
  const pov = useRadiationPov();
  return (
    <>
      <primitive object={bloom} dispose={null} />
      <primitive object={pov} dispose={null} />
    </>
  );
}

// Every rung keeps the composer, with the tone map at least. Dropping it
// moved drawing from its render target to the screen, which changes every
// material's program key (tone mapping, colour space) and recompiled every
// shader in one frame: 5.5-5.9 s frozen on Intel UHD (scripts/perf-frames.mjs).
// The radiation on the viewer's eyes rides with the bloom: both are glow.
function Post({ rung }) {
  return (
    <EffectComposer multisampling={rung.msaa}>
      {rung.ao ? <N8AO ref={opaqueOnly} halfRes aoRadius={0.9} distanceFalloff={0.5} intensity={2.5} aoSamples={12} denoiseSamples={6} color={LIGHT.ao} /> : null}
      {rung.bloom ? <Glow /> : null}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

const rendererOf = (gl) => {
  const ctx = gl.getContext();
  const info = ctx.getExtension("WEBGL_debug_renderer_info");
  return info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER);
};

export default function Look() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const setDpr = useThree((s) => s.setDpr);
  const [renderer] = useState(() => rendererOf(gl));
  const ready = useUi((s) => s.ready);
  const tier = useUi((s) => s.tier);
  const tierFrom = useUi((s) => s.tierFrom);
  const [watching, setWatching] = useState(false);

  // The first rung, before the world's first frame.
  useLayoutEffect(() => {
    const pin = pinned();
    const kept = pin === null ? recall(renderer) : null;
    const tierFrom = pin !== null ? "pin" : kept !== null ? "recall" : "guess";
    setUi({ tier: pin ?? kept ?? classify(renderer), tierFrom, tierCap: TOP });
  }, [renderer]);

  const rung = TIERS[tier ?? 0];
  // The device DPR changes without a resize when the window moves to another
  // screen (or the page zooms): listen for it, once per current value.
  const [deviceDpr, setDeviceDpr] = useState(() => window.devicePixelRatio || 1);
  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${deviceDpr}dppx)`);
    const moved = () => setDeviceDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", moved);
    return () => mq.removeEventListener("change", moved);
  }, [deviceDpr]);

  const [squeeze, setSqueeze] = useState(1);
  useEffect(() => {
    if (tier === null) return;
    const dpr = dprFor(tier, size.width, size.height, deviceDpr, tier === 0 ? squeeze : 1);
    setDpr(dpr);
    window.__world = { ...(window.__world || {}), look: tier, dpr, squeeze, gpu: renderer };
  }, [tier, squeeze, size.width, size.height, deviceDpr, setDpr, renderer]);

  // Judge the device only once the first shaders have compiled (the load
  // always stutters), and again a little after each change of rung, whose
  // new shaders stutter too.
  useEffect(() => {
    setWatching(false);
    if (!ready || tierFrom === "pin") return undefined;
    const t = setTimeout(() => setWatching(true), 3000);
    return () => clearTimeout(t);
  }, [ready, tierFrom, tier, squeeze]);

  // A rung that failed once is not tried again this visit (tierCap), and a
  // climb is tried only with the headroom the next rung costs (climbCost):
  // each failed try is a visible hitch and a burst of new shaders. Below T0
  // the pixel budget itself shrinks (squeeze), down to T0's DPR floor.
  const step = (d) => () => {
    const { tier: now, tierCap } = getUi();
    if (now === 0 && (d < 0 || squeeze < 1)) {
      const next = Math.min(1, Math.max(0.5, d < 0 ? squeeze * 0.8 : squeeze / 0.8));
      if (next !== squeeze) return setSqueeze(next);
      if (d < 0) return undefined;
    }
    const next = Math.max(0, Math.min(tierCap, now + d));
    if (next === now) return undefined;
    setUi(d < 0 ? { tier: next, tierCap: next } : { tier: next });
    remember(renderer, next);
    return undefined;
  };
  const upper = (hz) => {
    const now = getUi().tier;
    const need = 50 * (now === 0 && squeeze < 1 ? 1 / 0.8 : climbCost(now, size.width, size.height, deviceDpr));
    // a display this slow cannot show the headroom a climb needs
    return need > hz * 0.95 ? Infinity : need;
  };

  if (tier === null) return null;
  return (
    <>
      <Sky />
      <Post rung={rung} />
      {watching ? (
        <PerformanceMonitor bounds={(hz) => [50, upper(hz)]} onDecline={step(-1)} onIncline={step(1)} />
      ) : null}
    </>
  );
}
