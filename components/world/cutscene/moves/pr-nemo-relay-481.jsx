// NeMo Relay: Dragon Ball Super, Ultra Instinct. The pup is the performer.
// It starts crouched and spent, flashes silver, and rises calm with a silver
// ring round each pupil. Whis (staff, ringed halo) and Beerus (ears, pudding
// cup) watch as ink cutouts. About a dozen coloured task orbs fly at it from
// the left and miss: four silver afterimages flick through the places it was,
// each in for 0.12 s, the coloured satellite of each orb drops to the ground
// in a splash ring, and the violet cores curve round behind its head into one
// globe of nested shells that sends out a ring each time a shell fills. A
// silver-white dome (its own shader), silver aura tongues and rising motes
// replace the island. Shape, colour, pose.
// Cost by construction: dome, ground, shadow, motes, 4 ghosts, 2 orb meshes,
// 4 globe meshes, aura and splash rings: about 17 draw calls, no post.
// Card: lib/world/cutscene/cards/pr-nemo-relay-481.js.

import { useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry, TorusGeometry } from "three";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { Dome, Motes, Shadow, bakePup } from "./_g1";

const D = new Object3D();
const PAL = {
  top: "#4654b8", mid: "#7d8de0", hor: "#cdd6ff", bot: "#6f7fd6", glow: "#eef1ff", dot: "#3a47b0", glowK: 0.6, dotK: 0.8,
  groundIn: "#a9b5f0", groundOut: "#6f7ed8", groundDot: "#3a47b0",
};
const VIOLET = new Color("#b25cff");
const CREAM = new Color("#fbf6ec");
const SAT = ["#ff5a5f", "#ffb347", "#ffe14a", "#5ad46a", "#4cc9f0", "#ff7ad9"].map((c) => new Color(c));
const N = 12;
const G = [0.1, 1.45, -0.85]; // the globe, behind the head
const LAUNCH = 2.6; // s: the first orb leaves
const GAP = 0.26;
const FLY = 0.5;
const CURVE = 0.6;
const PASS = [2, 5, 8, 11]; // the orbs whose pass an afterimage flicks through
const GHOST_AT = [[-1.0, 0, 0.2, 1], [1.0, 0, 0.25, 1], [0.1, 0, 0.7, 0.72], [-0.7, 0, -0.2, 1]]; // x, y, z, y-scale: left, right, low, left again
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
const ease = (x) => x * x * (3 - 2 * x);
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// where orb i crosses the pup's plane, and where it starts
const cross = (i) => (i % 2 ? [0, 0.3 + (0.15 * ((i * 5) % 4)) / 3, 1.5] : [0, 0.8 + (0.6 * ((i * 5) % 4)) / 3, -0.7]); // in front they pass low, behind they pass high: never over the face
const start = (i) => [-7 + (i % 3) * 0.4, 0.9 + 0.7 * hash(i), cross(i)[2] + (hash(i, 2) - 0.5) * 1.2];

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const g = useRef();
  const baked = useRef(null);
  const ghosts = useRef([]);
  const f = useMemo(() => {
    const cores = inst(new IcosahedronGeometry(1, 1), mat(), N, Array(N).fill(VIOLET));
    const sats = inst(new IcosahedronGeometry(1, 1), mat(), N, Array.from({ length: N }, (_, i) => SAT[i % SAT.length]));
    const shell = inst(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.72, depthWrite: false }), 3, [VIOLET, new Color("#d6a8ff"), VIOLET]);
    const core = inst(new IcosahedronGeometry(1, 1), mat(), 1, [CREAM]);
    const rings = inst(new TorusGeometry(1, 0.03, 4, 28), mat({ transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }), 3, [CREAM, CREAM, CREAM]);
    const aura = inst(new OctahedronGeometry(1, 0).scale(0.2, 1, 0.04), mat({ transparent: true, opacity: 0.4, depthWrite: false, side: DoubleSide }), 40, Array.from({ length: 40 }, (_, i) => new Color(i % 3 ? "#ffffff" : "#cfd8ff")));
    const splash = inst(new RingGeometry(0.8, 1, 20).rotateX(-Math.PI / 2), mat({ transparent: true, opacity: 0.8, depthWrite: false, side: DoubleSide }), N, Array.from({ length: N }, (_, i) => SAT[i % SAT.length]));
    return { cores, sats, shell, core, rings, aura, splash };
  }, []);
  const ghostMat = useMemo(() => [0, 1, 2, 3].map(() => mat({ color: "#dfe6ff", transparent: true, opacity: 0, depthWrite: false })), []);

  useCutFrame((t) => {
    const s = live.seal;
    const full = mode === "full";
    g.current.visible = full;
    if (!full) return;
    g.current.position.set(s.x, 0, s.z);
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);

    // the pup's own silhouette, baked once, for the afterimages
    const seal = scene.getObjectByName("seal");
    if (!baked.current && seal && t > 0.3) {
      baked.current = bakePup(seal);
      ghosts.current.forEach((m) => {
        m.geometry = baked.current;
      });
    }

    // THE PUP: crouched and spent, a silver flash, then a calm upright rise and a ring round each pupil;
    // a flipper kick follows every dodge
    const kick = PASS.reduce((k, i) => {
      const dt = tt - (LAUNCH + i * GAP + FLY);
      return k + (dt > 0 && dt < 0.5 ? Math.exp(-dt * 7) : 0);
    }, 0);
    live.pose.crouch = 0.9 * smooth(0.35, 0.9, tt) * (1 - smooth(1.15, 1.45, tt)) * out;
    live.pose.raise = (0.32 * smooth(1.2, 1.9, tt) + 0.3 * Math.min(1, kick)) * out;
    live.pose.ring = smooth(1.15, 1.5, tt) * out;

    // the afterimages: left, right, low, left again, on the pass of their orbs
    const q = seal ? seal.quaternion : null;
    ghosts.current.forEach((m, k) => {
      const age = tt - (LAUNCH + PASS[k] * GAP + FLY - 0.02);
      const on = age >= 0 && age < 0.12 && baked.current;
      m.visible = Boolean(on);
      if (!on) return;
      m.position.set(GHOST_AT[k][0], GHOST_AT[k][1], GHOST_AT[k][2]);
      if (q) m.quaternion.copy(q);
      m.scale.set(1, GHOST_AT[k][3], 1);
      ghostMat[k].opacity = 0.55 * (1 - age / 0.12);
    });

    // the barrage: each orb is a violet core with a coloured satellite circling it
    let merged = 0;
    for (let i = 0; i < N; i++) {
      const t0 = LAUNCH + i * GAP;
      const u = (tt - t0) / FLY;
      const X = cross(i);
      const S = start(i);
      const spin = tt * 6 + i;
      if (u < 0) {
        put(f.cores, i, 0, -9, 0, 0.0001);
        put(f.sats, i, 0, -9, 0, 0.0001);
        put(f.splash, i, 0, -9, 0, 0.0001);
        continue;
      }
      const k = Math.min(u, 1);
      const px = S[0] + (X[0] - S[0]) * k;
      const py = S[1] + (X[1] - S[1]) * k;
      const pz = S[2] + (X[2] - S[2]) * k;
      const w = (tt - t0 - FLY) / CURVE; // after the pass
      const ox = 0.3 * Math.cos(spin);
      const oy = 0.3 * Math.sin(spin);
      if (w <= 0) {
        put(f.cores, i, px, py, pz, 0.17 * out);
        put(f.sats, i, px + ox, py + oy, pz, 0.1 * out);
        put(f.splash, i, 0, -9, 0, 0.0001);
        continue;
      }
      // the core curves round behind the pup into the globe
      const e = ease(Math.min(w, 1));
      const cx = X[0] + 1.6;
      const cz = -1.6;
      put(
        f.cores,
        i,
        (1 - e) * (1 - e) * X[0] + 2 * (1 - e) * e * cx + e * e * G[0],
        (1 - e) * X[1] + e * G[1],
        (1 - e) * (1 - e) * X[2] + 2 * (1 - e) * e * cz + e * e * G[2],
        0.17 * (1 - 0.7 * e) * out,
      );
      if (w >= 1) merged += 1;
      // the satellite carries straight on and falls, then rings the ground
      const tau = tt - t0 - FLY;
      const sx = X[0] + 6 * tau;
      const sy = X[1] + 1.5 * tau - 4.9 * tau * tau;
      put(f.sats, i, sx + ox * 0.3, Math.max(sy, 0.1) + 0.1, X[2], 0.1 * out);
      if (sy <= 0.1) {
        const r = Math.min(1, Math.max(0, (tau - (0.15 + Math.sqrt((X[1] + 0.1) / 4.9) * 1.2)) / 0.5));
        put(f.splash, i, sx, 0.04, X[2], r > 0 && r < 1 ? 0.15 + 0.5 * r : 0.0001);
      } else put(f.splash, i, 0, -9, 0, 0.0001);
    }
    for (const m of [f.cores, f.sats, f.splash]) m.instanceMatrix.needsUpdate = true;

    // the globe of nested shells: grows with every core that arrives, a ring leaves each time a shell fills
    const R = merged > 0 ? (0.14 + (0.5 * Math.min(N, merged)) / N) * out : 0.0001;
    put(f.shell, 0, G[0], G[1], G[2], R * (1 + 0.03 * Math.sin(tt * 5)));
    put(f.shell, 1, G[0], G[1], G[2], merged >= 4 ? R * 0.72 : 0.0001);
    put(f.shell, 2, G[0], G[1], G[2], merged >= 8 ? R * 0.46 : 0.0001);
    put(f.core, 0, G[0], G[1], G[2], R * 0.26);
    for (let k = 0; k < 3; k++) {
      const ta = tt - (LAUNCH + ((k + 1) * 4 - 1) * GAP + FLY + CURVE);
      const r = ta > 0 && ta < 0.5 ? ta / 0.5 : 0;
      const sc = r > 0 ? R * (1 + 1.4 * r) : 0.0001;
      put(f.rings, k, G[0], G[1], G[2], sc, sc, sc, 0, 0.5 * k, 0);
    }
    for (const x of [f.shell, f.core, f.rings]) x.instanceMatrix.needsUpdate = true;

    // the silver aura: flame tongues rising round the pup after the flash
    const on = smooth(1.2, 1.9, tt) * out;
    for (let i = 0; i < 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI + hash(i) * 0.2; // the back half of a ring, left of the gods: never between the pup and the lens
      const rad = 0.8 + 2.4 * hash(i, 1);
      const life = (tt * (0.35 + 0.25 * hash(i, 2)) + hash(i, 3)) % 1;
      const h = (0.9 + 1.4 * hash(i, 4)) * on * Math.sin(Math.min(1, life * 1.25) * Math.PI);
      put(f.aura, i, -1.7 + Math.cos(a) * rad, life * 2.4, Math.sin(a) * rad * 0.8 - 1.2, 0.5, Math.max(h, 0.0001), 0.5, 0, 0, 0.25 * Math.sin(tt * 3 + i));
    }
    f.aura.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} bare />
      <Dome tl={tl} mode={mode} pal={PAL} />
      <Shadow mode={mode} k={0.45} size={1.1} />
      <Motes mode={mode} tl={tl} n={110} span={[16, 7, 12]} center={[0, 0, -3]} dir={[0, 0.6, 0]} size={0.07} color={["#ffffff", "#dfe6ff", "#b9c4ff"]} sway={0.2} />
      <Speaker {...cut} />
      <group ref={g} visible={false}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} ref={(m) => m && (ghosts.current[k] = m)} material={ghostMat[k]} visible={false} frustumCulled={false} />
        ))}
        <primitive object={f.cores} />
        <primitive object={f.sats} />
        <primitive object={f.splash} />
        <primitive object={f.shell} />
        <primitive object={f.core} />
        <primitive object={f.rings} />
        <primitive object={f.aura} />
      </group>
    </>
  );
}
