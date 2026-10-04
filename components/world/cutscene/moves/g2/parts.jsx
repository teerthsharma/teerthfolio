"use client";

// Shared parts for the group-2 docks (MujoRush x2, Highway, XNNPACK, the Dam):
// the place's local frame (a land speaker's place stands where a figure would,
// so a move builds in "figure space" and the rig turns and scales it onto the
// real direction), the pup's offsets and scale, and three cheap pieces: a
// camera-facing flash, an expanding ring and an instanced shard burst. All of
// it is one draw each, unlit, no post pass.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CircleGeometry, Color, DoubleSide, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry, ShaderMaterial } from "three";
import { FIGURE_AT, landPoint, onTwos, turnFor } from "../../../../../lib/world/cutscene/timeline";
import { live } from "../../../../../lib/world/store";

export const INK = { cream: "#fbfaf7", mint: "#7ee8c0", coral: "#ff7a6b", violet: "#8f6bff", amber: "#ffb347", blue: "#69b7ff" };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ramp = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = (x) => x * x * (3 - 2 * x);
export const rand = (seed) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

// How far the two-shot stands back when the land speaks (timeline.js landRig): the rig scales to match.
export function landK(card, place, x, z) {
  if (card.view) return 1;
  const a = landPoint(card, place);
  return Math.min(1.8, Math.max(1, (0.6 * Math.hypot(a.x - x, a.z - z)) / Math.hypot(FIGURE_AT[0], FIGURE_AT[2])));
}

export const playing = (cut) => Boolean(live.arrival.id) && cut.mode === "full" && live.inStage;
export const clock = (state) => state.clock.elapsedTime - live.arrival.start;
// The scene clock for Flash/Ring callbacks: the Rig writes it each frame (-1 when not playing).
export const T = { t: -1 };

// The place's local frame, at the pup: x right, -z away (the figure's frame).
// `scaled` stands it with the land (k); unscaled it is the pup's own space.
export function Rig({ cut, scaled = true, children }) {
  const root = useRef();
  const inner = useRef();
  useFrame((state) => {
    const g = root.current;
    const on = playing(cut);
    T.t = live.arrival.id ? state.clock.elapsedTime - live.arrival.start : -1;
    g.visible = on;
    if (!on) return;
    const s = live.seal;
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turnFor(cut.card, cut.place, s.x, s.z);
    inner.current.scale.setScalar(scaled ? landK(cut.card, cut.place, s.x, s.z) : 1);
  }, -1.1);
  return (
    <group ref={root} visible={false}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

// The pup: fn(t, pup, turn) runs after Seal.jsx has placed it (so an offset
// sticks for the frame). Scale resets the moment the scene stops, so a skip
// leaves nothing behind.
export function usePup(cut, fn) {
  const scene = useThree((s) => s.scene);
  const pup = useRef(null);
  useFrame((state) => {
    pup.current ??= scene.getObjectByName("seal");
    const p = pup.current;
    if (!p) return;
    if (!live.arrival.id || cut.mode !== "full") {
      if (p.scale.x !== 1) p.scale.setScalar(1);
      return;
    }
    fn(clock(state), p, turnFor(cut.card, cut.place, live.seal.x, live.seal.z));
  }, -0.5);
  useEffect(() => () => pup.current?.scale.setScalar(1), []);
}

// Move the pup by (dx, dy, dz) in the figure frame (turned onto the real direction, unscaled).
export const nudge = (p, turn, dx, dy, dz) => {
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  p.position.x += dx * c + dz * s;
  p.position.y += dy;
  p.position.z += dz * c - dx * s;
};

export const flat = (color, extra = {}) => new MeshBasicMaterial({ color, toneMapped: false, fog: false, ...extra });

// A soft round light facing the lens. fn() -> [alpha, scale].
const FLASH_GEO = new CircleGeometry(1, 32);
export function Flash({ color = "#ffffff", at = [0, 1, 0], fn }) {
  const ref = useRef();
  const m = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: new Color(color).convertLinearToSRGB() }, uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float r = length(vUv * 2.0 - 1.0); float k = pow(max(1.0 - r, 1e-4), 1.6); gl_FragColor = vec4(pow(max(uColor * k * uAlpha, vec3(1e-4)), vec3(2.2)), 1.0); }",
      }),
    [color]
  );
  useFrame(({ camera }) => {
    const g = ref.current;
    const [alpha, scale] = fn();
    // kept "visible" (at scale ~0) for the whole stage so its program compiles under the bloom, not mid-scene
    g.visible = live.inStage;
    if (!g.visible) return;
    m.uniforms.uAlpha.value = alpha;
    g.scale.setScalar(alpha > 0.003 ? scale : 0.0001);
    g.quaternion.copy(camera.quaternion);
  }, -0.4);
  return <mesh ref={ref} geometry={FLASH_GEO} material={m} position={at} visible={false} renderOrder={5} frustumCulled={false} />;
}

// A ring facing the lens. fn() -> [scale, alpha].
const RING_GEO = new RingGeometry(0.93, 1, 48);
export function Ring({ color = INK.cream, at = [0, 1, 0], fn, squash = 1 }) {
  const ref = useRef();
  const m = useMemo(() => flat(color, { transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }), [color]);
  useFrame(({ camera }) => {
    const g = ref.current;
    const [scale, alpha] = fn();
    g.visible = live.inStage;
    if (!g.visible) return;
    m.opacity = alpha;
    const s = alpha > 0.01 && scale > 0.01 ? scale : 0.0001;
    g.scale.set(s, s * squash, s);
    g.quaternion.copy(camera.quaternion);
  }, -0.4);
  return <mesh ref={ref} geometry={RING_GEO} material={m} position={at} visible={false} renderOrder={5} frustumCulled={false} />;
}

// A shard burst: one instanced mesh of tumbling octahedra thrown from a point
// at `start` (s on the cutscene clock), falling, shrinking over `dur`, drawn on
// twos. The motion is analytic: nothing is simulated.
const SHARD = new OctahedronGeometry(1, 0).scale(0.7, 1, 0.5);
const DUMMY = new Object3D();
export function Shards({ count = 18, start, dur = 1.2, from = [0, 1, 0], speed = 2.4, up = 1.6, gravity = 6, size = 0.1, spread = [1, 1, 1], colors = [INK.cream, INK.coral], seed = 3, floor = 0.04 }) {
  const ref = useRef();
  const data = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: count }, () => ({
      v: [(r() - 0.5) * 2 * spread[0] * speed, up * (0.4 + r()) * spread[1], (r() - 0.5) * 2 * spread[2] * speed],
      s: size * (0.5 + r()),
      spin: [r() * 6, r() * 6, r() * 6],
    }));
  }, [count, speed, up, size, spread, seed]);
  const m = useMemo(() => flat("#ffffff", { side: DoubleSide }), []);
  useEffect(() => {
    const mesh = ref.current;
    const c = new Color();
    for (let i = 0; i < count; i++) mesh.setColorAt(i, c.set(colors[i % colors.length]));
    mesh.instanceColor.needsUpdate = true;
  }, [count, colors]);
  useFrame((state) => {
    const mesh = ref.current;
    const t = live.arrival.id ? clock(state) : -1;
    const tau = onTwos(t - start);
    mesh.visible = live.inStage;
    mesh.scale.setScalar(tau >= 0 && tau < dur ? 1 : 0.0001);
    if (!(tau >= 0 && tau < dur) || !mesh.visible) return;
    const k = 1 - tau / dur;
    for (let i = 0; i < count; i++) {
      const d = data[i];
      DUMMY.position.set(from[0] + d.v[0] * tau, Math.max(floor, from[1] + d.v[1] * tau - 0.5 * gravity * tau * tau), from[2] + d.v[2] * tau);
      DUMMY.rotation.set(d.spin[0] * tau * 3, d.spin[1] * tau * 3, d.spin[2] * tau * 3);
      DUMMY.scale.setScalar(d.s * Math.min(1, k * 2.2));
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return <instancedMesh ref={ref} args={[SHARD, m, count]} visible={false} frustumCulled={false} />;
}
