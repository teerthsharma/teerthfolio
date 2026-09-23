"use client";

// THE PYREFLY FLOES (facebook/pyrefly #4180, place id pr-pyrefly-4180): the
// river's outflow east of the NVIDIA moat (lib/world/river.js), where the
// moat's water leaves for the sea.
//
//   - THE ANOMALY, the radiation made visible: the reproducer's 208 chained
//     components do not float on the river. They hang in the air above it,
//     wound into a funnel -- a whirlpool lifted off the water and hung up to
//     dry -- pinned at the bottom to a basalt stack standing in the
//     shallows, where the chain commits (parts/floes-layout.js has the
//     funnel's geometry: 208 two-lobed ice floes on a pressure ridge, tied
//     to the next by a thin ice thread). The whole coil turns slowly on the
//     pin, like a mobile hung to dry, and glows in pyrefly's own radiation
//     colour -- ice, not a progress legend: show, never tell.
//   - Plain floes are stranded along the outflow's banks, afloat and
//     unremarkable: what floes normally do, for the anomaly to read against.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CircleGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Object3D, Quaternion, RingGeometry, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { WHIRLPOOL } from "../../../lib/world/river";
import { live, useUi } from "../../../lib/world/store";
import { WATER_Y } from "../../../lib/world/terrain";
import { C, glow, mat } from "../palette";
import { FLOE, FLOES, N, PIN, PIN_R, PIN_TOP, STRANDED, THREADS } from "./parts/floes-layout";
import { EYE_R, INNER_CHIPS, MIST, MIST_N, OUTER_CHIPS } from "./parts/floes-vortex";

const NEAR_ID = "pr-pyrefly-4180";
const RADIATION = PLACE_BY_ID[NEAR_ID].radiation;

// The basalt stack the chain commits onto: a squat, slightly tapered pillar
// standing in the shallows, its top at PIN_TOP -- the geometry is built with
// its base already at y = 0, so the mesh sits at the pin's water-plane origin.
const stackGeo = new CylinderGeometry(PIN_R * 0.7, PIN_R * 1.15, PIN_TOP, 7, 1).translate(0, PIN_TOP / 2, 0);
const stackMat = mat(C.charcoal, { roughness: 0.85 });

// Plain stranded floes: small flat ice chips, calm, afloat -- the same
// low-poly ellipsoid language as the chained floes but idle and undramatic.
const FREEBOARD = 0.07;
const strandedGeo = new IcosahedronGeometry(1, 1);
const strandedMat = mat(C.ice, { roughness: 0.4 });
const dummy = new Object3D();

function Stranded() {
  const ref = useRef(null);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < STRANDED.length; i++) {
      const s = STRANDED[i];
      const bob = Math.sin(t * 0.8 + i * 2.3) * 0.02;
      dummy.position.set(s.x, WATER_Y + FREEBOARD + bob, s.z);
      dummy.rotation.set(Math.sin(t * 0.6 + i) * 0.03, s.yaw, Math.cos(t * 0.5 + i) * 0.03);
      dummy.scale.set(0.3 * s.scale, 0.16 * s.scale, 0.24 * s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[strandedGeo, strandedMat, STRANDED.length]} castShadow receiveShadow frustumCulled={false} />;
}

// ---- the funnel: 208 floes, baked once from floes-layout.js -----------------
//
// Every position and orientation is static (the reproducer's shape); only
// the whole coil's slow turn and its glow move per frame. No per-instance
// colour, no travelling markers, no door -- the diagram lived in the earlier
// monuments/Chain.jsx draft and is not carried over.

const RIDGE_R = 0.07; // the short thick ridge freezing a floe's two lobes together
const THREAD_R = 0.028; // the thin ice thread to the next floe
const LOBES_N = N * 2;
const LOBE_GEO = new IcosahedronGeometry(1, 1); // scaled per instance into an ice-chip ellipsoid
const STICK_GEO = new CylinderGeometry(1, 1, 1, 6, 1); // unit cylinder, scaled per instance
const EASE_RATE = 4; // near/far blend rate: k = 1 - exp(-EASE_RATE*dt)
const HALO_GROW = 1.3; // the edge-glow shell: the same lobe, a little larger, additive and unlit behind it

const UP = new Vector3(0, 1, 0);
const qTmp = new Quaternion();
const vTmp = new Vector3();
const basisM = new Matrix4();

// Places a unit stick between two points, radius `r`: used once to bake the
// ridge and thread instances, which never move again.
function placeStick(p0, p1, r) {
  vTmp.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const len = Math.max(0.001, vTmp.length());
  vTmp.normalize();
  qTmp.setFromUnitVectors(UP, vTmp);
  dummy.position.set((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
  dummy.quaternion.copy(qTmp);
  dummy.scale.set(r, len, r);
  dummy.updateMatrix();
}

function Funnel({ near }) {
  const groupRef = useRef(null);
  const lobesRef = useRef(null);
  const ridgesRef = useRef(null);
  const threadsRef = useRef(null);
  const haloRef = useRef(null);
  const nearK = useRef(0);

  // Ice base -- deepIce (palette.js: "ice in depth ... floes' sides"), more
  // saturated than the pale C.ice this used to read as, so the chain stays
  // legible against the sky instead of smudging into it -- plus a scaled-up
  // additive shell in the district's own radiation colour behind every lobe,
  // the "glowing through its edges" read: it only peeks out past the ice
  // silhouette, never washing the faces out. Both static/shared; only their
  // intensity moves per frame.
  const iceMat = useMemo(() => mat(C.deepIce, { roughness: 0.3, emissive: RADIATION, emissiveIntensity: 0.55 }).clone(), []);
  const haloMat = useMemo(() => glow(RADIATION, 0.3).clone(), []);

  useEffect(() => {
    const lobes = lobesRef.current, ridges = ridgesRef.current, threads = threadsRef.current, halos = haloRef.current;
    if (!lobes || !ridges || !threads || !halos) return;
    for (let i = 0; i < N; i++) {
      const f = FLOES[i];
      const off = FLOE.lobeOff * f.scale;
      const a = [f.c[0] - f.x[0] * off, f.c[1] - f.x[1] * off, f.c[2] - f.x[2] * off];
      const b = [f.c[0] + f.x[0] * off, f.c[1] + f.x[1] * off, f.c[2] + f.x[2] * off];

      basisM.makeBasis(new Vector3(...f.x), new Vector3(...f.y), new Vector3(...f.z));
      qTmp.setFromRotationMatrix(basisM);
      dummy.quaternion.copy(qTmp);
      dummy.scale.set(FLOE.lobeX * f.scale, FLOE.thick * f.scale, FLOE.lobeZ * f.scale);
      dummy.position.set(a[0], a[1], a[2]);
      dummy.updateMatrix();
      lobes.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.set(b[0], b[1], b[2]);
      dummy.updateMatrix();
      lobes.setMatrixAt(i * 2 + 1, dummy.matrix);

      dummy.scale.multiplyScalar(HALO_GROW);
      dummy.position.set(a[0], a[1], a[2]);
      dummy.updateMatrix();
      halos.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.set(b[0], b[1], b[2]);
      dummy.updateMatrix();
      halos.setMatrixAt(i * 2 + 1, dummy.matrix);

      placeStick(a, b, RIDGE_R);
      ridges.setMatrixAt(i, dummy.matrix);

      const [t, h] = THREADS[i];
      placeStick(t, h, THREAD_R);
      threads.setMatrixAt(i, dummy.matrix);
    }
    lobes.instanceMatrix.needsUpdate = true;
    ridges.instanceMatrix.needsUpdate = true;
    threads.instanceMatrix.needsUpdate = true;
    halos.instanceMatrix.needsUpdate = true;
  }, []);

  // The last floe commits onto the pin's centre (floes-layout's COMMIT sits
  // on the y axis), so turning this whole group around y leaves that point
  // fixed: the coil spins slowly on its pin, like a mobile hung to dry. A
  // catch in progress (live.seal.whirled, the whirlpool below) winds it
  // faster and brighter too -- the same water, one system.
  useFrame((_, dt) => {
    nearK.current += ((near ? 1 : 0) - nearK.current) * (1 - Math.exp(-EASE_RATE * dt));
    const whirl = live.seal.whirled > 0 ? Math.min(1, live.seal.whirled / WHIRLPOOL.hold) : 0;
    if (groupRef.current) groupRef.current.rotation.y += (0.05 + 0.1 * nearK.current + 0.18 * whirl) * dt;
    iceMat.emissiveIntensity = 0.55 + 0.35 * nearK.current + 0.35 * whirl;
    haloMat.opacity = 0.3 + 0.25 * nearK.current + 0.4 * whirl;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={haloRef} args={[LOBE_GEO, haloMat, LOBES_N]} frustumCulled={false} />
      <instancedMesh ref={lobesRef} args={[LOBE_GEO, iceMat, LOBES_N]} castShadow frustumCulled={false} />
      <instancedMesh ref={ridgesRef} args={[STICK_GEO, iceMat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={threadsRef} args={[STICK_GEO, iceMat, N]} frustumCulled={false} />
    </group>
  );
}

// ---- the whirlpool: a spiral of foam spinning on the water, exactly
// WHIRLPOOL.radius wide (WHIRLPOOL.x/z, the channel's centre line -- close
// to the pin but not on it), under the funnel -- the water doing what
// lib/world/motion.js's stepSeal already does: catch a swimmer, carry it
// round, throw it back. Two rings (rim, eye) baked once (parts/floes-vortex)
// and turned at their own speed: cheap, and a real whirlpool's differential
// (faster near the eye) for free.
const EYE_GEO = new CircleGeometry(EYE_R, 20).rotateX(-Math.PI / 2);
const cRim = new Color(C.foam);
const cEye = new Color(C.shallows);
const cTmp = new Color();

function bakeChips(mesh, chips) {
  if (!mesh) return;
  for (let i = 0; i < chips.length; i++) {
    const c = chips[i];
    dummy.position.set(c.x, c.y, c.z);
    dummy.rotation.set(0, c.angle, 0);
    dummy.scale.set(c.len, 0.16, c.w);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    cTmp.copy(cRim).lerp(cEye, c.u);
    mesh.setColorAt(i, cTmp);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function Vortex() {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const outerGroup = useRef(null);
  const innerGroup = useRef(null);
  const mistRef = useRef(null);
  const boost = useRef(0);

  const foamMat = useMemo(() => mat(C.foam, { roughness: 0.3, emissive: RADIATION, emissiveIntensity: 0.22 }).clone(), []);
  const eyeMat = useMemo(() => mat("#0b2f3d", { roughness: 0.6, emissive: RADIATION, emissiveIntensity: 0.12 }).clone(), []);
  const mistMat = useMemo(() => mat("#eaf6ff", { flat: false, roughness: 1, emissive: RADIATION, emissiveIntensity: 0.18 }), []);

  useEffect(() => {
    bakeChips(outerRef.current, OUTER_CHIPS);
    bakeChips(innerRef.current, INNER_CHIPS);
  }, []);

  useFrame((state, dt) => {
    const seal = live.seal;
    const raw = seal.whirled > 0 ? Math.min(1, seal.whirled / WHIRLPOOL.hold) : 0;
    boost.current += (raw - boost.current) * (1 - Math.exp(-5 * dt));
    const b = boost.current;
    if (outerGroup.current) outerGroup.current.rotation.y += (0.3 + 1.1 * b) * dt;
    if (innerGroup.current) innerGroup.current.rotation.y -= (0.55 + 1.9 * b) * dt; // the eddy inside spins the other way: reads as wound tight, not just faster
    foamMat.emissiveIntensity = 0.22 + 0.9 * b;
    eyeMat.emissiveIntensity = 0.12 + 0.5 * b;

    const mesh = mistRef.current;
    if (mesh) {
      const t = state.clock.elapsedTime;
      for (let i = 0; i < MIST_N; i++) {
        const m = MIST[i];
        const u = (t * 0.18 + m.offset) % 1;
        dummy.position.set(Math.cos(m.angle) * m.radius, u * (0.3 + 0.9 * m.apex), Math.sin(m.angle) * m.radius);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.16 * Math.sin(Math.PI * u) * (0.7 + 0.3 * b));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <group position={[WHIRLPOOL.x, WATER_Y, WHIRLPOOL.z]}>
        <group ref={outerGroup}>
          <instancedMesh ref={outerRef} args={[LOBE_GEO, foamMat, OUTER_CHIPS.length]} frustumCulled={false} />
        </group>
        <group ref={innerGroup}>
          <instancedMesh ref={innerRef} args={[LOBE_GEO, foamMat, INNER_CHIPS.length]} frustumCulled={false} />
        </group>
        {/* the water surface here (River.jsx) is a flat opaque mesh at y = 0
            in this group's own frame -- anything below it is hidden under
            it, which is why the eye used to vanish at -0.24; it now sits a
            hair above, flush with the foam ring instead of dipped under it */}
        <mesh geometry={EYE_GEO} material={eyeMat} position={[0, 0.012, 0]} />
      </group>
      {/* the mist hangs off the pin itself (PIN.x/z), not the whirlpool's own
          centre a few metres out on the channel line -- "spray round the pin" */}
      <group position={[PIN.x, PIN_TOP + 0.15, PIN.z]}>
        <instancedMesh ref={mistRef} args={[LOBE_GEO, mistMat, MIST_N]} frustumCulled={false} />
      </group>
    </>
  );
}

// ---- the throw: a splash at the catch, a ring of foam racing out with the
// seal's flight, a snow puff at the landing -- the moment live.seal.flight
// leaves 0 and the moment it returns. One small pool, reused every throw;
// nothing here allocates inside the frame loop.
const SPLASH_N = 28;
const sprayMat = mat("#eaf7ff", { roughness: 0.3, emissive: "#bfe8ff", emissiveIntensity: 0.25 });
const ringGeo = new RingGeometry(0.5, 0.85, 40);

function makeSplashPool() {
  return {
    pos: new Float32Array(SPLASH_N * 3),
    vel: new Float32Array(SPLASH_N * 3),
    age: new Float32Array(SPLASH_N).fill(Infinity),
    life: new Float32Array(SPLASH_N),
    size: new Float32Array(SPLASH_N),
    kind: new Uint8Array(SPLASH_N), // 0 spray droplet (gravity, stops at the water), 1 landing puff (drifts, fades)
    cursor: 0,
    alive: 0,
    wasAlive: new Uint8Array(SPLASH_N),
  };
}

function addSplash(pool, x, y, z, vx, vy, vz, size, life, kind) {
  const i = pool.cursor;
  pool.cursor = (i + 1) % SPLASH_N;
  const b = i * 3;
  pool.pos[b] = x;
  pool.pos[b + 1] = y;
  pool.pos[b + 2] = z;
  pool.vel[b] = vx;
  pool.vel[b + 1] = vy;
  pool.vel[b + 2] = vz;
  pool.age[i] = 0;
  pool.life[i] = life;
  pool.size[i] = size;
  pool.kind[i] = kind;
  if (!pool.wasAlive[i]) pool.alive++;
  pool.wasAlive[i] = 1;
}

// A spray column climbing plus droplets fanning outward: the catch's own
// edge, the instant live.seal.flight leaves 0.
function throwBurst(pool, x, z) {
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.6;
    addSplash(pool, x + Math.cos(a) * r, WATER_Y + 0.1, z + Math.sin(a) * r, Math.cos(a) * 1.2, 5 + Math.random() * 2.5, Math.sin(a) * 1.2, 0.16 + Math.random() * 0.1, 0.7 + Math.random() * 0.2, 0);
  }
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.random() * 2;
    addSplash(pool, x, WATER_Y + 0.1, z, Math.cos(a) * r, 2.5 + Math.random() * 2, Math.sin(a) * r, 0.14 + Math.random() * 0.08, 0.6 + Math.random() * 0.3, 0);
  }
}

// A small snow puff where the seal lands.
function landingPuff(pool, x, z) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * 1.4;
    addSplash(pool, x, 0.1, z, Math.cos(a) * r, 1.4 + Math.random() * 0.8, Math.sin(a) * r, 0.14 + Math.random() * 0.08, 0.45 + Math.random() * 0.2, 1);
  }
}

function Splash() {
  const meshRef = useRef(null);
  const ringRef = useRef(null);
  const pool = useMemo(makeSplashPool, []);
  const burst = useRef({ x: 0, z: 0 });
  const prevFlight = useRef(0);
  const ringMat = useMemo(
    () => new MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, side: DoubleSide, toneMapped: false }),
    [],
  );

  useFrame((_, dt) => {
    const seal = live.seal;
    const flight = seal.flight;
    if (flight > 0 && prevFlight.current <= 0) {
      burst.current.x = seal.x;
      burst.current.z = seal.z;
      throwBurst(pool, seal.x, seal.z);
    }
    if (flight === 0 && prevFlight.current > 0) landingPuff(pool, seal.x, seal.z);
    prevFlight.current = flight;

    const ring = ringRef.current;
    if (ring) {
      if (flight > 0) {
        const u = 1 - flight / WHIRLPOOL.flight;
        ring.visible = true;
        ring.position.set(burst.current.x, WATER_Y + 0.03, burst.current.z);
        ring.scale.setScalar(0.4 + u * WHIRLPOOL.radius * 2.1);
        ringMat.opacity = 0.8 * (1 - u);
      } else {
        ring.visible = false;
      }
    }

    const mesh = meshRef.current;
    if (mesh && pool.alive > 0) {
      for (let i = 0; i < SPLASH_N; i++) {
        if (!pool.wasAlive[i]) continue;
        const age = pool.age[i] + dt;
        pool.age[i] = age;
        const life = pool.life[i];
        if (age >= life) {
          dummy.position.set(0, -1000, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          pool.wasAlive[i] = 0;
          pool.alive--;
          continue;
        }
        const b = i * 3;
        if (pool.kind[i] === 0) {
          pool.vel[b + 1] -= 9 * dt;
          pool.pos[b] += pool.vel[b] * dt;
          pool.pos[b + 1] += pool.vel[b + 1] * dt;
          pool.pos[b + 2] += pool.vel[b + 2] * dt;
          if (pool.pos[b + 1] < WATER_Y + 0.02) {
            pool.pos[b + 1] = WATER_Y + 0.02;
            pool.vel[b + 1] = 0;
          }
        } else {
          pool.vel[b + 1] -= 2.4 * dt;
          pool.pos[b] += pool.vel[b] * dt;
          pool.pos[b + 1] += pool.vel[b + 1] * dt;
          pool.pos[b + 2] += pool.vel[b + 2] * dt;
        }
        const u = age / life;
        const size = Math.max(0, pool.size[i] * (1 - u * u));
        dummy.position.set(pool.pos[b], pool.pos[b + 1], pool.pos[b + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[LOBE_GEO, sprayMat, SPLASH_N]} frustumCulled={false} />
      <mesh ref={ringRef} geometry={ringGeo} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} visible={false} />
    </>
  );
}

export default function Floes() {
  const near = useUi((s) => s.near) === NEAR_ID;
  return (
    <group>
      <mesh position={[PIN.x, 0, PIN.z]} geometry={stackGeo} material={stackMat} castShadow receiveShadow />
      <group position={[PIN.x, 0, PIN.z]}>
        <Funnel near={near} />
      </group>
      <Stranded />
      <Vortex />
      <Splash />
    </group>
  );
}
