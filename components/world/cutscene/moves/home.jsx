// The igloo: Vinland Saga, "I have no enemies". Calm, and no effects: a warm
// low sun, a peach-to-lilac sky, a cream igloo, a mid-dark sea, the pup the
// brightest thing in the frame. The igloo speaks ("Neutral zone. No
// radiation.") from its entrance arch; the pup sits, a full plop with squash,
// eyes open, and does nothing. An orca fin (a curved, swept, lit low-poly
// blade with a V-wake) rises out of the pool beside it, circles once at an
// easy distance, pauses and sinks with a ring and a bloop. Two penguins
// waddle past behind the pup, a gull lands on the dome, steam curls from the
// vent, snow sparkles drift. On the flex line the docks light up, one by one,
// along the horizon. No camera shake, no halftone, no glow: that is the point.
// The kit Stage keeps the igloo only (props and particles by it are hidden).
// Cost by construction: dome, ground, shadow, pool, fin, wake, ring, penguins,
// gull, steam, sparkles, dock lights: about 13 draw calls, no post.
// Card: lib/world/cutscene/cards/home.js.

import { useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CircleGeometry, Color, ConeGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, RingGeometry, SphereGeometry, BackSide, BufferGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLACES } from "../../../../lib/world/places";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { Dome, Motes, Shadow } from "./_g1";

const D = new Object3D();
const PAL = {
  top: "#9a86cc", mid: "#e0aebe", hor: "#ffd2b0", bot: "#3f6aa0", glow: "#fff0d2", dot: "#ffd2b0", glowK: 0.45, dotK: 0,
  groundIn: "#fbf4ea", groundOut: "#d9d2ea", groundDot: "#fbf4ea",
};
const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
const put = (m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
};
const inst = (g, m, n, colors) => {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
  return mesh;
};
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const IGLOO = [0, -8]; // world: the igloo's centre
const POOL = [-2.5, -1.7]; // pup-local: the pool beside the pup
const PR = [1.5, 0.85]; // the fin's path
const T = { plop: 3.0, fin: 2.5, sink: 5.4, flex: 7.3, gull: 4.0 };
const lerp = (a, b, k) => a + (b - a) * k;

// the penguin: a dark body, a cream belly, a head and an orange beak, vertex-coloured
function penguinGeometry() {
  const paint = (g, hex) => {
    const c = new Color(hex);
    const n = g.toNonIndexed();
    n.deleteAttribute("uv");
    n.deleteAttribute("normal");
    n.setAttribute("color", new Float32BufferAttribute(Array.from({ length: n.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
    return n;
  };
  return mergeGeometries([
    paint(new SphereGeometry(0.2, 8, 6).scale(1, 1.4, 0.9).translate(0, 0.28, 0), "#1c2230"),
    paint(new SphereGeometry(0.15, 8, 6).scale(1, 1.3, 0.7).translate(0, 0.26, 0.09), "#f4efe6"),
    paint(new SphereGeometry(0.11, 8, 6).translate(0, 0.62, 0.02), "#1c2230"),
    paint(new ConeGeometry(0.035, 0.1, 5).rotateX(Math.PI / 2).translate(0, 0.6, 0.15), "#f08a2a"),
  ]);
}

// the orca fin: a swept, curved low-poly blade (a squashed four-sided cone, its tip drawn back), lit
function finGeometry() {
  const g = new ConeGeometry(0.3, 1.25, 4, 3).rotateY(Math.PI / 4).translate(0, 0.62, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * 0.36);
    p.setZ(i, p.getZ(i) - 0.55 * y * y); // the sweep: the tip trails
  }
  g.computeVertexNormals();
  return g;
}

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const g = useRef();
  const w = useRef();
  const f = useMemo(() => {
    const pool = new Mesh(new CircleGeometry(1, 40).rotateX(-Math.PI / 2), mat({ color: "#3f6aa0" }));
    const ring = new Mesh(new RingGeometry(0.9, 1, 32).rotateX(-Math.PI / 2), mat({ color: "#e8f2ff", transparent: true, opacity: 0.8, depthWrite: false, side: DoubleSide }));
    const wake = new BufferGeometry();
    wake.setAttribute("position", new Float32BufferAttribute([0, 0, 0, -1.7, 0, 0.55, -1.55, 0, 0.5, 0, 0, 0, -1.7, 0, -0.55, -1.55, 0, -0.5], 3));
    const vwake = new Mesh(wake, mat({ color: "#e8f2ff", transparent: true, opacity: 0.6, depthWrite: false, side: DoubleSide }));
    const body = new Mesh(finGeometry(), new MeshStandardMaterial({ color: "#16202e", flatShading: true, roughness: 0.55, metalness: 0.05 }));
    const rim = new Mesh(finGeometry(), mat({ color: "#f3ecdf", side: BackSide }));
    rim.scale.set(1.18, 1.05, 1.18);
    const finGroup = new Object3D();
    finGroup.add(rim, body);
    const penguins = inst(penguinGeometry(), new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false }), 2);
    const body2 = new SphereGeometry(0.22, 8, 6).scale(1.5, 0.8, 0.8);
    const gull = inst(mergeGeometries([body2.toNonIndexed(), new SphereGeometry(0.1, 6, 5).translate(0.28, 0.1, 0).toNonIndexed()].map((x) => (x.deleteAttribute("uv"), x.deleteAttribute("normal"), x))), mat({ color: "#fbfaf7" }), 1);
    const wings = inst(new IcosahedronGeometry(1, 0).scale(0.28, 0.025, 0.12), mat({ color: "#e9e6e0" }), 2);
    const steam = inst(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.55, depthWrite: false }), 14, Array(14).fill(new Color("#fffaf2")));
    const lights = inst(new IcosahedronGeometry(1, 1), mat(), PLACES.length, PLACES.map((p) => new Color(p.radiation ?? p.color ?? "#ffd66b")));
    return { pool, ring, vwake, finGroup, penguins, gull, wings, steam, lights };
  }, []);

  // world -> pup-local (the rig turns about the pup toward the arch)
  const ground = (x, z, a, s) => [Math.cos(a) * (x - s.x) - Math.sin(a) * (z - s.z), Math.sin(a) * (x - s.x) + Math.cos(a) * (z - s.z)];

  useCutFrame((t) => {
    const s = live.seal;
    const seal = scene.getObjectByName("seal");
    const full = mode === "full";
    g.current.visible = full;
    w.current.visible = full;
    if (!full) return;
    const a = turnFor(card, place, s.x, s.z);
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = a;
    w.current.position.set(s.x, 0, s.z);
    w.current.rotation.y = a;
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);

    // THE PUP: a full plop with squash, eyes open, a slow blink on the hold and another on line B
    live.pose.sit = smooth(T.plop - 0.35, T.plop, tt) * out;
    live.pose.eyes = 1;
    const slow = (at) => (tt > at && tt < at + 0.32 ? Math.sin(((tt - at) / 0.32) * Math.PI) : 0);
    live.pose.blink = Math.max(slow(3.7), slow(tl.lineB + 0.4));
    const tau = tt - T.plop;
    const sq = tau > 0 ? Math.exp(-5 * tau) * Math.cos(16 * tau) : 0; // the landing, then the settle
    seal?.scale.set(1 + 0.12 * sq * out, 1 - 0.2 * sq * out, 1 + 0.12 * sq * out);

    // THE POOL and the FIN: up out of the water, once round, a pause, and down
    const seen = smooth(T.fin, T.fin + 0.7, tt) * out;
    const sunk = smooth(T.sink, T.sink + 0.7, tt);
    const ang = lerp(3.6, 3.6 + Math.PI * 2, smooth(T.fin + 0.2, T.sink - 0.3, tt));
    const fx = POOL[0] + PR[0] * Math.sin(ang);
    const fz = POOL[1] + PR[1] * Math.cos(ang);
    const vx = Math.cos(ang) * PR[0];
    const vz = -Math.sin(ang) * PR[1];
    f.pool.position.set(POOL[0], 0.03, POOL[1]);
    f.pool.scale.set(2.4 * out, 1, 1.4 * out);
    f.finGroup.position.set(fx, 0.03 - 0.95 * sunk, fz);
    f.finGroup.rotation.set(0.07 * Math.sin(tt * 2.6), Math.atan2(vx, vz), 0.1 * Math.sin(tt * 1.9)); // a small bob and tilt as it circles
    f.finGroup.scale.setScalar(Math.max(seen * 0.95, 0.0001));
    f.finGroup.visible = seen > 0.01 && sunk < 1;
    f.vwake.position.set(fx, 0.05, fz);
    f.vwake.rotation.y = Math.atan2(-vz, vx); // the V trails behind
    f.vwake.scale.setScalar(Math.max(seen * (1 - sunk), 0.0001));
    const bl = (tt - (T.sink + 0.55)) / 0.9; // the bloop where it sinks
    f.ring.position.set(fx, 0.06, fz);
    f.ring.scale.setScalar(bl > 0 && bl < 1 ? 0.2 + 1.3 * bl : 0.0001);
    f.ring.material.opacity = bl > 0 && bl < 1 ? 0.85 * (1 - bl) : 0;

    // two penguins waddle past behind the pup, unbothered
    for (let i = 0; i < 2; i++) {
      const u = ((tt - 2.3 - i * 0.7) / 6) % 1;
      const on = tt > 2.3 + i * 0.7 && u >= 0 ? 1 : 0.0001;
      put(f.penguins, i, lerp(-3.4, 4.2, u) + i * 0.1, 0.05 + Math.abs(Math.sin(tt * 9 + i)) * 0.03, -2.4 - i * 0.5, 1.5 * on, 1.5 * on, 1.5 * on, 0, Math.PI / 4, 0.14 * Math.sin(tt * 9 + i)); // rolling side to side
    }
    f.penguins.instanceMatrix.needsUpdate = true;
    // a single gull lands on the dome and folds its wings
    const [gx, gz] = ground(IGLOO[0] + 1.3, IGLOO[1] + 1.7, a, s);
    const gu = smooth(T.gull, T.gull + 1.0, tt);
    const gy = 3.2 + 5 * (1 - gu) * (1 - gu);
    const flap = (1 - gu) * Math.sin(tt * 20);
    put(f.gull, 0, gx + 3 * (1 - gu), gy, gz, 1, 1, 1, 0, 0, 0);
    put(f.wings, 0, gx + 3 * (1 - gu), gy + 0.04, gz + 0.14, lerp(0.15, 1, 1 - gu), 1, 1, 0.3 * flap + 0.5 * gu, 0, 0.5 * flap * 2);
    put(f.wings, 1, gx + 3 * (1 - gu), gy + 0.04, gz - 0.14, lerp(0.15, 1, 1 - gu), 1, 1, -0.3 * flap - 0.5 * gu, 0, -0.5 * flap * 2);
    f.gull.instanceMatrix.needsUpdate = true;
    f.wings.instanceMatrix.needsUpdate = true;
    // steam curls from the vent
    for (let i = 0; i < 14; i++) {
      const life = (tt * 0.28 + hash(i)) % 1;
      const k = Math.sin(life * Math.PI) * (0.14 + 0.1 * hash(i, 1)) * out * smooth(2.0, 2.8, tt);
      put(f.steam, i, gx - 3 + 0.1 * Math.sin(life * 6 + i), 3.0 + life * 1.8, gz - 0.4 + 0.1 * Math.cos(life * 5 + i), k);
    }
    f.steam.instanceMatrix.needsUpdate = true;
    // the docks' lights blink on along the horizon, one by one, on the flex line
    for (let i = 0; i < PLACES.length; i++) {
      const aa = (i / PLACES.length) * Math.PI * 2 + 0.4;
      const [lx, lz] = ground(s.x + Math.cos(aa) * 26, s.z + Math.sin(aa) * 26, a, s);
      const on = tt > T.flex + 0.1 + i * 0.08 ? 1 : 0.0001;
      put(f.lights, i, lx, 2.2 + 0.25 * Math.sin(tt * 3 + i), lz, 0.9 * on * out);
    }
    f.lights.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={(o) => o.isInstancedMesh || o.isPoints} />
      <Dome tl={tl} mode={mode} pal={PAL} radius={20} />
      <Shadow mode={mode} k={0.55} size={1.0} />
      <Motes mode={mode} tl={tl} n={60} span={[16, 5, 12]} center={[0, 0, -2]} dir={[0.04, 0.05, 0]} size={0.04} color={["#fffaf2", "#ffe9cc"]} sway={0.3} />
      <Speaker {...cut} />
      <group ref={g} visible={false}>
        <primitive object={f.pool} />
        <primitive object={f.vwake} />
        <primitive object={f.ring} />
        <primitive object={f.finGroup} />
        <primitive object={f.penguins} />
      </group>
      <group ref={w} visible={false}>
        <primitive object={f.gull} />
        <primitive object={f.wings} />
        <primitive object={f.steam} />
        <primitive object={f.lights} />
      </group>
    </>
  );
}
