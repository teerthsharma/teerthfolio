"use client";

// What a TNT blast and a bowling strike look like: round pastel smoke balls
// and one brief flash (a pooled sphere mesh), confetti and fuse sparks (one
// pooled box mesh), and scorch rings in the snow that fade (one decal mesh).
// Three draw calls, every slot preallocated, nothing in useFrame allocates.
// The rules and the events (live.boom, live.cheer, a lit fuse) are in
// lib/world/toys.js.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CircleGeometry, Color, DoubleSide, IcosahedronGeometry, MeshBasicMaterial, MultiplyBlending, Object3D, RingGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { live } from "../../lib/world/store";
import { easeOutBack } from "./life/util";

const SMOKE = 44;
const BITS = 160;
const SCORCH = 6;
const SMOKE_COLORS = ["#ffc9d6", "#d7c6ff", "#fff0c4", "#c4efe0", "#ffdcbc"].map((c) => new Color(c));
const CONFETTI_COLORS = ["#ff7088", "#ffd66b", "#8fd3ff", "#b6f0c8", "#d3b8ff", "#ffffff"].map((c) => new Color(c));
const FLASH = new Color(3.2, 3, 2.6);
const SPARK = new Color(3, 2.1, 0.5);
const SNOW = new Color(1, 1, 1);
const SCORCH_FROM = new Color(0.62, 0.55, 0.6); // multiplied onto the snow: a mauve smudge
const SCORCH_LIFE = 9; // s
const FADE = new Color();

const SMOKE_GEO = new IcosahedronGeometry(1, 1);
const BIT_GEO = new BoxGeometry(0.26, 0.04, 0.17);
const SCORCH_GEO = mergeGeometries([new RingGeometry(1.5, 1.9, 36).toNonIndexed(), new CircleGeometry(1.1, 28).toNonIndexed()], false).rotateX(-Math.PI / 2);

const dummy = new Object3D();
const rnd = (a, b) => a + Math.random() * (b - a);

function makePool(n) {
  return {
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    rot: new Float32Array(n * 3),
    tumble: new Float32Array(n * 3),
    age: new Float32Array(n).fill(Infinity),
    life: new Float32Array(n),
    size: new Float32Array(n),
    cursor: 0,
    n,
  };
}

function take(pool, x, y, z, vx, vy, vz, size, life) {
  const i = pool.cursor;
  pool.cursor = (i + 1) % pool.n;
  const b = i * 3;
  pool.pos[b] = x;
  pool.pos[b + 1] = y;
  pool.pos[b + 2] = z;
  pool.vel[b] = vx;
  pool.vel[b + 1] = vy;
  pool.vel[b + 2] = vz;
  pool.rot[b] = rnd(0, 3);
  pool.rot[b + 1] = rnd(0, 3);
  pool.rot[b + 2] = rnd(0, 3);
  pool.tumble[b] = rnd(-9, 9);
  pool.tumble[b + 1] = rnd(-9, 9);
  pool.tumble[b + 2] = rnd(-9, 9);
  pool.age[i] = 0;
  pool.life[i] = life;
  pool.size[i] = size;
  return i;
}

export default function Blast() {
  const reduced = useMemo(() => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) || false, []);
  const calm = reduced ? 0.5 : 1;
  const smokeRef = useRef();
  const bitsRef = useRef();
  const scorchRef = useRef();
  const smoke = useMemo(() => makePool(SMOKE), []);
  const bits = useMemo(() => makePool(BITS), []);
  const scorch = useMemo(() => ({ x: new Float32Array(SCORCH), z: new Float32Array(SCORCH), age: new Float32Array(SCORCH).fill(Infinity), cursor: 0 }), []);
  const seen = useRef({ cheer: live.cheer.n });
  const sparkAt = useRef(0);
  const scorchMat = useMemo(
    () => new MeshBasicMaterial({ color: "#ffffff", blending: MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, side: DoubleSide, toneMapped: false }),
    [],
  );
  const bitMat = useMemo(() => new MeshBasicMaterial({ color: "#ffffff", side: DoubleSide }), []);

  useLayoutEffect(() => {
    // Instance colours exist from the first frame; every slot starts hidden.
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (const [mesh, n] of [[smokeRef.current, SMOKE], [bitsRef.current, BITS], [scorchRef.current, SCORCH]]) {
      for (let i = 0; i < n; i++) {
        mesh.setColorAt(i, SNOW);
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceColor.needsUpdate = true;
    }
  }, []);

  const confetti = (x, y, z, count, power) => {
    for (let i = 0; i < Math.round(count * calm); i++) {
      const a = rnd(0, Math.PI * 2);
      const out = rnd(1.5, power);
      const k = take(bits, x, y, z, Math.cos(a) * out, rnd(4.5, 8.5), Math.sin(a) * out, rnd(0.8, 1.5), rnd(1.5, 2.1));
      bitsRef.current.setColorAt(k, CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]);
    }
    bitsRef.current.instanceColor.needsUpdate = true;
  };

  const boom = (x, z) => {
    const sm = smokeRef.current;
    // The flash: one fat over-bright ball that pops and is gone in a blink.
    if (!reduced) {
      const f = take(smoke, x, 0.9, z, 0, 0, 0, 2.2, 0.16);
      sm.setColorAt(f, FLASH);
    }
    for (let i = 0; i < Math.round(11 * calm); i++) {
      const a = (i / 11) * Math.PI * 2 + rnd(-0.3, 0.3);
      const out = rnd(3, 6.2);
      const k = take(smoke, x + Math.cos(a) * 0.4, 0.5, z + Math.sin(a) * 0.4, Math.cos(a) * out, rnd(1.6, 3.4), Math.sin(a) * out, rnd(0.35, 0.65), rnd(1, 1.5));
      sm.setColorAt(k, SMOKE_COLORS[i % SMOKE_COLORS.length]);
    }
    sm.instanceColor.needsUpdate = true;
    confetti(x, 1, z, 34, 7);
    const s = scorch.cursor;
    scorch.cursor = (s + 1) % SCORCH;
    scorch.x[s] = x;
    scorch.z[s] = z;
    scorch.age[s] = 0;
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Events: blasts the toy logic has queued, a strike, and sparks off every lit fuse.
    const q = live.boom.q;
    while (q.length) {
      const b = q.pop();
      boom(b.x, b.z);
    }
    if (live.cheer.n !== seen.current.cheer) {
      seen.current.cheer = live.cheer.n;
      confetti(live.cheer.x, 0.6, live.cheer.z, 44, 5);
    }
    sparkAt.current += dt;
    if (sparkAt.current >= 0.025) {
      sparkAt.current = 0;
      for (const p of live.props) {
        if (p.kind !== "tnt" || !(p.fuse >= 0)) continue;
        const k = take(bits, p.x, 1.2, p.z, rnd(-1, 1), rnd(1.6, 3.2), rnd(-1, 1), rnd(0.35, 0.6), rnd(0.25, 0.45));
        bitsRef.current.setColorAt(k, SPARK);
        bitsRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Smoke balls: swell out fast, then ease away as they drift up and slow.
    const sm = smokeRef.current;
    for (let i = 0; i < SMOKE; i++) {
      const age = smoke.age[i];
      if (age === Infinity) continue;
      smoke.age[i] = age + dt;
      const u = (age + dt) / smoke.life[i];
      const b = i * 3;
      if (u >= 1) {
        smoke.age[i] = Infinity;
        dummy.scale.setScalar(0);
      } else {
        const drag = Math.exp(-2.2 * dt);
        smoke.vel[b] *= drag;
        smoke.vel[b + 1] = smoke.vel[b + 1] * drag + 0.6 * dt;
        smoke.vel[b + 2] *= drag;
        smoke.pos[b] += smoke.vel[b] * dt;
        smoke.pos[b + 1] = Math.max(smoke.size[i] * 0.5, smoke.pos[b + 1] + smoke.vel[b + 1] * dt);
        smoke.pos[b + 2] += smoke.vel[b + 2] * dt;
        const s = smoke.size[i] * easeOutBack(Math.min(1, u * 4)) * (u > 0.65 ? 1 - ((u - 0.65) / 0.35) ** 2 : 1);
        dummy.scale.setScalar(Math.max(0, s));
      }
      dummy.position.set(smoke.pos[b], smoke.pos[b + 1], smoke.pos[b + 2]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      sm.setMatrixAt(i, dummy.matrix);
    }
    sm.instanceMatrix.needsUpdate = true;

    // Confetti and sparks: tossed up, they tumble down and shrink away.
    const bm = bitsRef.current;
    for (let i = 0; i < BITS; i++) {
      const age = bits.age[i];
      if (age === Infinity) continue;
      bits.age[i] = age + dt;
      const left = bits.life[i] - (age + dt);
      const b = i * 3;
      if (left <= 0) {
        bits.age[i] = Infinity;
        dummy.scale.setScalar(0);
      } else {
        bits.vel[b + 1] -= (bits.size[i] < 0.7 ? 6 : 12) * dt;
        const drag = Math.exp(-0.9 * dt);
        bits.vel[b] *= drag;
        bits.vel[b + 2] *= drag;
        bits.pos[b] += bits.vel[b] * dt;
        bits.pos[b + 1] = Math.max(0.03, bits.pos[b + 1] + bits.vel[b + 1] * dt);
        bits.pos[b + 2] += bits.vel[b + 2] * dt;
        bits.rot[b] += bits.tumble[b] * dt;
        bits.rot[b + 1] += bits.tumble[b + 1] * dt;
        bits.rot[b + 2] += bits.tumble[b + 2] * dt;
        dummy.scale.setScalar(bits.size[i] * Math.min(1, left / 0.3));
      }
      dummy.position.set(bits.pos[b], bits.pos[b + 1], bits.pos[b + 2]);
      dummy.rotation.set(bits.rot[b], bits.rot[b + 1], bits.rot[b + 2]);
      dummy.updateMatrix();
      bm.setMatrixAt(i, dummy.matrix);
    }
    bm.instanceMatrix.needsUpdate = true;

    // Scorch rings: pop out of the snow, then fade back to it (the multiply goes to white).
    const sc = scorchRef.current;
    for (let i = 0; i < SCORCH; i++) {
      const age = scorch.age[i];
      if (age === Infinity) continue;
      scorch.age[i] = age + dt;
      const u = (age + dt) / SCORCH_LIFE;
      if (u >= 1) {
        scorch.age[i] = Infinity;
        dummy.scale.setScalar(0);
      } else {
        dummy.scale.setScalar(easeOutBack(Math.min(1, (age + dt) / 0.3)) * 1.7);
        sc.setColorAt(i, FADE.copy(SCORCH_FROM).lerp(SNOW, u * u));
      }
      dummy.position.set(scorch.x[i], 0.04, scorch.z[i]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      sc.setMatrixAt(i, dummy.matrix);
    }
    sc.instanceMatrix.needsUpdate = true;
    sc.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={smokeRef} args={[SMOKE_GEO, undefined, SMOKE]} frustumCulled={false}>
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={bitsRef} args={[BIT_GEO, bitMat, BITS]} frustumCulled={false} />
      <instancedMesh ref={scorchRef} args={[SCORCH_GEO, scorchMat, SCORCH]} frustumCulled={false} renderOrder={1} />
    </>
  );
}

