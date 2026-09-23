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
//   Tier   2 = AO + bloom, 1 = bloom, 0 = no post (native tone mapping).
//          PerformanceMonitor steps down when a device cannot hold ~50 fps:
//          AO goes first, then bloom. ?look=0|1|2 pins a tier (captures).
//          Resolution is never touched: crispness is not traded for effects.

import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { SelectiveBloomEffect, ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackSide } from "three";
import { useUi } from "../../lib/world/store";
import { RadiationPovEffect, stepRadiationPov } from "./look/RadiationPov";
import { C, LIGHT } from "./palette";

const pinned = () => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("look");
  return v === null || !/^[012]$/.test(v) ? null : Number(v);
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

function Post({ tier }) {
  const bloom = useLampBloom();
  const pov = useRadiationPov();
  return (
    <EffectComposer multisampling={4}>
      {tier >= 2 ? <N8AO ref={opaqueOnly} halfRes aoRadius={0.9} distanceFalloff={0.5} intensity={2.5} aoSamples={12} denoiseSamples={6} color={LIGHT.ao} /> : null}
      <primitive object={bloom} dispose={null} />
      <primitive object={pov} dispose={null} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

export default function Look() {
  const [pin] = useState(pinned);
  const [tier, setTier] = useState(pin ?? 2);
  const gl = useThree((s) => s.gl);
  const ready = useUi((s) => s.ready);
  const [watching, setWatching] = useState(false);

  // Judge the device only once the first shaders have compiled; the load
  // itself always stutters.
  useEffect(() => {
    if (!ready || pin !== null) return undefined;
    const t = setTimeout(() => setWatching(true), 4000);
    return () => clearTimeout(t);
  }, [ready, pin]);

  // Without the composer the renderer tone maps again, as Island.jsx set it.
  useEffect(() => {
    if (tier === 0) gl.toneMapping = LIGHT.toneMapping;
    window.__world = { ...(window.__world || {}), look: tier };
  }, [tier, gl]);

  return (
    <>
      <Sky />
      {tier > 0 ? <Post tier={tier} /> : null}
      {watching && tier > 0 ? (
        <PerformanceMonitor bounds={() => [50, Infinity]} onDecline={() => setTier((t) => Math.max(0, t - 1))} />
      ) : null}
    </>
  );
}
