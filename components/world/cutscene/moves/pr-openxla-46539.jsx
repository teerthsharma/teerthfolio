"use client";

// The XLA geyser: Detective Conan ("There is always only one truth."). The
// PUP makes the famous move: it turns full front, throws one flipper at the
// lens with a white star on its eye catchlight ("BAN!") and the spotlight
// snaps onto it, while the other flipper grabs the two racing output cards
// (blue X, coral Y) out of the air and crushes them into one blue X ("GASHAN"):
// then the geyser erupts behind it on cue ("SHUUUU"). The witnesses are ink
// silhouettes: the culprit with a ring of keys (the hash set) who flinches
// back on the reveal, and Sleeping Kogoro in his armchair, tie askew, Zzz.
// The sinter cone and its vent come from land/parts/dam-geyser.js, scaled to
// the frame; the eruption reuses its 40 DROPS. Everything is flat-coloured or
// additive, steam and drops are instanced, and nothing is a post pass.
// Card: lib/world/cutscene/cards/pr-openxla-46539.js. Shape, colour, pose only.

import { useMemo, useRef } from "react";
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, CircleGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry, TorusGeometry, Vector3,
} from "three";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { DROPS } from "../../land/parts/dam-geyser";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { live } from "../../../../lib/world/store";
import { CREAM, FigureAttach, PLANE, colorBar, colorBox, flatMat, flipperAt, inkGeo, inkMats, letterMat, letterTex, limb, merged, shaded, srgb, starGeo, tint, useCredit, usePupFront, usePupPost, useStageGroup } from "./g3/common";

const INK = "#2a1c14";
const BLUE = "#3e7bfa";
const CORAL = "#ff6b57";
const MINT = "#10d9a0";
const LIP = [-1.1, 0.95, -2.3]; // the vent's lip, in the pup's space
const RACE_Z = -2.9;
const RACE = [
  { y: 1.25, v: 0.42, ph: 0.2 },
  { y: 2.0, v: 0.7, ph: 0.62 },
];

// a stamp: a coloured square with a cream X or Y in it
const glyph = (kind) => {
  const x = 0.36;
  const y = 0.22;
  const z = 0.034;
  return kind === "x"
    ? [colorBar(0.26, 0.05, 0.02, [x, y, z], CREAM, 0.78), colorBar(0.26, 0.05, 0.02, [x, y, z], CREAM, -0.78)]
    : [colorBar(0.05, 0.14, 0.02, [x, y - 0.06, z], CREAM), colorBar(0.05, 0.15, 0.02, [x - 0.045, y + 0.055, z], CREAM, -0.5), colorBar(0.05, 0.15, 0.02, [x + 0.045, y + 0.055, z], CREAM, 0.5)];
};
const card = (stamp, kind) =>
  merged([
    colorBox(1.28, 0.86, 0.04, [0, 0, -0.012], INK),
    colorBox(1.2, 0.78, 0.04, [0, 0, 0], CREAM),
    colorBox(0.64, 0.07, 0.045, [-0.22, 0.1, 0.002], INK),
    colorBox(0.8, 0.07, 0.045, [-0.14, -0.04, 0.002], INK),
    colorBox(0.5, 0.07, 0.045, [-0.3, -0.18, 0.002], INK),
    colorBox(0.36, 0.36, 0.05, [0.36, 0.22, 0.004], stamp),
    ...glyph(kind),
  ]);

// the sinter cone and its vent lip, one faceted mesh
const mound = () =>
  shaded(
    [
      new CylinderGeometry(0.42, 1.0, 0.95, 9, 2).translate(0, 0.475, 0),
      new TorusGeometry(0.42, 0.08, 4, 9).rotateX(Math.PI / 2).translate(0, 0.95, 0),
      new CircleGeometry(0.4, 9).rotateX(-Math.PI / 2).translate(0, 0.94, 0),
    ],
    ["#8fc9b4", "#ece8d6", "#17594a"],
    0.4,
  );

// a light cone from the top: open, brighter at the lamp, fading to the floor
function coneGeo() {
  const g = new CylinderGeometry(0.1, 1, 4.6, 28, 1, true).translate(0, -2.3, 0);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) col.set([1, 0.97, 0.84, p.getY(i) > -1 ? 0.24 : 0.06], i * 4);
  g.setAttribute("color", new BufferAttribute(col, 4));
  return g;
}

// the culprit's keys, hung from the near hand in the figure's own space
const HAND = [-0.66, 1.34, 0.62];
function keysGeo() {
  const parts = [tint(new TorusGeometry(0.085, 0.018, 4, 10).translate(0, -0.06, 0), CREAM)];
  [-0.5, -0.17, 0.17, 0.5].forEach((a, i) => {
    parts.push(colorBar(0.03, 0.17 + 0.02 * (i % 2), 0.02, [Math.sin(a) * 0.1, -0.2 - Math.cos(a) * 0.05, 0], CREAM, -a));
    parts.push(colorBar(0.07, 0.04, 0.02, [Math.sin(a) * 0.12 + 0.02, -0.3 - 0.02 * (i % 2), 0], CREAM, -a));
  });
  return merged(parts);
}

// Sleeping Kogoro, slumped in his armchair (ink)
function kogoro() {
  return inkGeo([
    new BoxGeometry(0.9, 0.2, 0.8).translate(0, 0.45, 0),
    new BoxGeometry(0.9, 0.95, 0.14).translate(0, 0.92, -0.38),
    new CylinderGeometry(0.24, 0.27, 0.62, 7).rotateX(-0.28).translate(0, 0.9, -0.12), // the slumped body
    new IcosahedronGeometry(0.2, 0).translate(0.16, 1.3, -0.14), // the head, lolled to one side
    limb([-0.14, 0.52, 0.08], [-0.17, 0.4, 0.74], 0.1, 0.09), // legs out
    limb([0.14, 0.52, 0.08], [0.17, 0.4, 0.74], 0.1, 0.09),
    limb([-0.27, 1.05, -0.1], [-0.33, 0.66, 0.1], 0.07, 0.06), // arms hung
    limb([0.27, 1.05, -0.1], [0.33, 0.66, 0.1], 0.07, 0.06),
  ]);
}
const tie = () => merged([colorBar(0.09, 0.06, 0.02, [0, 0.2, 0], CREAM), colorBar(0.08, 0.34, 0.02, [0.02, 0, 0], CREAM, 0.06)]);

const STEAM = 24;
const addMat = (hex, opacity) => new MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false });
const EYE = new Vector3();

export default function Move(cut) {
  const { card: dock, tl } = cut;
  const root = useRef();
  const A = useRef();
  const B = useRef();
  const keys = useRef();
  const tieRef = useRef();
  const zzz = useRef();
  const mesh = { ring: useRef(), cone: useRef(), pool: useRef(), col: useRef(), core: useRef(), drops: useRef(), steam: useRef(), star: useRef(), ban: useRef(), gashan: useRef(), shu: useRef() };
  const hand = useRef([0.9, 1.0, 0.4]);
  const eyeAt = useRef([-0.3, 0.9, 0.8]);
  const [m0, m1] = tl.move;
  const E = m1 + 0.12; // the eruption, on the beat after the crush

  const g = useMemo(() => {
    const ban = letterTex("BAN!", MINT);
    const gashan = letterTex("GASHAN", CORAL);
    const shu = letterTex("SHUUUU", MINT);
    const zz = letterTex("Zzz", "#a8f0dc", 90);
    const drops = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ color: "#bdfbe9", toneMapped: false, fog: false }), DROPS.length);
    drops.frustumCulled = false;
    const steam = new InstancedMesh(new CircleGeometry(1, 10), new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }), STEAM);
    steam.frustumCulled = false;
    for (let i = 0; i < STEAM; i++) steam.setColorAt(i, new Color(0, 0, 0));
    return {
      x: card(BLUE, "x"),
      y: card(CORAL, "y"),
      mat: flatMat(),
      mound: mound(),
      cone: coneGeo(),
      coneMat: new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
      pool: new CircleGeometry(1, 36).rotateX(-Math.PI / 2),
      poolMat: addMat("#fff1c8", 0.3),
      col: new CylinderGeometry(0.2, 0.34, 1, 12, 1, true).translate(0, 0.5, 0),
      colMat: addMat("#53f0c4", 0.42),
      core: new CylinderGeometry(0.08, 0.15, 1, 8, 1, true).translate(0, 0.5, 0),
      coreMat: addMat("#f2fffb", 0.7),
      drops,
      steam,
      o: new Object3D(),
      c: new Color(),
      ring: new RingGeometry(0.8, 1, 40),
      ringMat: addMat("#ffffff", 1),
      star: starGeo(1, 0.16),
      starMat: new MeshBasicMaterial({ color: "#ffffff", transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }),
      ban, gashan, shu, zz,
      banMat: letterMat(ban),
      gashanMat: letterMat(gashan),
      shuMat: letterMat(shu),
      zzMat: letterMat(zz),
      keys: keysGeo(),
      kog: kogoro(),
      tie: tie(),
    };
  }, []);
  useMemo(() => srgb(g.ringMat.color, paletteFor(dock).core), [dock, g]);

  // the pup: crouches to wind up, then stands front, one flipper at the lens
  useCutFrame((t) => {
    if (cut.mode !== "full") return;
    live.pose.crouch = 0.8 * smooth(m0 - 0.45, m0 - 0.05, t) * (1 - smooth(m0 + 0.05, m0 + 0.3, t));
  });
  usePupFront(cut, m0 - 0.3, m0 + 0.1);
  usePupPost(cut, (t, rig) => {
    const T = onTwos(t);
    const wR = smooth(m0 + 0.05, m0 + 0.25, T); // the point
    const wL = smooth(m0 + 0.1, m0 + 0.42, T); // the grab
    const mix = (f, rx, ry, rz, w) => {
      const e = f.rotation;
      f.rotation.set(e.x + (rx - e.x) * w, e.y + (ry - e.y) * w, e.z + (rz - e.z) * w, "YZX");
    };
    mix(rig.flipR, 0, -1.05, 0.5, wR);
    rig.flipR.position.z += 0.25 * wR;
    rig.flipR.position.y += 0.1 * wR;
    rig.flipR.scale.setScalar(1 + 0.5 * wR); // thrust: bigger at the lens
    mix(rig.flipL, 0, -0.35, 0.95, wL);
    rig.flipL.userData.z0 ??= rig.flipL.position.z; // D never resets the far flipper's root
    rig.flipL.position.z = rig.flipL.userData.z0 + 0.1 * wL;
    const th = T - (m0 + 0.25);
    if (th > 0 && th < 0.34) rig.tail.rotation.x += 0.55 * Math.sin((th * Math.PI) / 0.34); // the tail's overshoot
    const r = root.current;
    if (!r) return;
    const p = flipperAt(rig.flipL, r, [0.7, 0.1, 0]);
    hand.current = [p.x, p.y, p.z];
    // the near eye's catchlight: the glint mesh's centroid on the pup's right (-x in the eyes' space)
    const gl = rig.eyes.children[1];
    const pos = gl?.geometry?.attributes.position;
    if (pos) {
      let n = 0;
      EYE.set(0, 0, 0);
      for (let i = 0; i < pos.count; i++) {
        if (pos.getX(i) < 0) {
          EYE.x += pos.getX(i);
          EYE.y += pos.getY(i);
          EYE.z += pos.getZ(i);
          n++;
        }
      }
      if (n) {
        EYE.multiplyScalar(1 / n);
        gl.updateWorldMatrix(true, false);
        gl.localToWorld(EYE);
        r.worldToLocal(EYE);
        eyeAt.current = [EYE.x, EYE.y, EYE.z];
      }
    }
  });

  useCredit(cut, "openxla/xla #46539", "5 lines, deterministic", "Same program, same GPU code, every run.");

  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const hit = T - m1; // seconds since the crush
    const show = smooth(tl.enter + 0.4, tl.enter + 0.7, T);
    const gather = smooth(m0 + 0.25, m0 + 0.58, T);
    const e = gather * gather;
    const [hx, hy, hz] = hand.current;
    [A.current, B.current].forEach((m, i) => {
      const c = RACE[i];
      const tt = Math.min(T, m0 + 0.25);
      const rx = -6 + 12 * ((tt * c.v + c.ph) % 1);
      const ry = c.y + 0.1 * Math.sin(tt * 9 + c.ph * 7);
      m.position.set(rx + (hx + 0.2 - rx) * e, ry + (hy + 0.12 - ry) * e, RACE_Z + (hz + 0.3 - RACE_Z) * e);
      m.rotation.z = (i ? -0.08 : 0.07) * (1 - e);
      let s = show * (1.2 - 0.65 * e);
      if (hit >= 0) {
        if (i) s = 0; // coral is crushed into blue: one card is left
        else s = show * 0.55 * (1 + 0.3 * Math.exp(-hit * 9) * Math.cos(hit * 28));
      }
      m.scale.setScalar(Math.max(0.001, s));
      m.visible = s > 0.002;
    });
    // the crush: a ring of light at the flipper
    const r = mesh.ring.current;
    r.visible = hit >= 0 && hit < 0.45;
    if (r.visible) {
      r.position.set(hx, hy + 0.3, hz + 0.2);
      r.scale.setScalar(0.3 + 1.1 * Math.min(1, hit / 0.4));
      g.ringMat.opacity = 1 - hit / 0.45;
    }
    // the spotlight: wide on the vent, then it snaps onto the pup
    const snap = T >= m0 + 0.25;
    const cone = mesh.cone.current;
    const lit = T > tl.enter + 0.1;
    cone.visible = lit;
    cone.position.set(snap ? 0 : LIP[0], 4.6, snap ? 0.2 : LIP[2]);
    cone.scale.set(snap ? 0.8 : 1.15, 1, snap ? 0.8 : 1.15);
    g.coneMat.opacity = smooth(tl.enter + 0.1, tl.enter + 0.5, T);
    const pool = mesh.pool.current;
    pool.visible = lit;
    pool.position.set(snap ? 0 : LIP[0], 0.04, snap ? 0.2 : LIP[2]);
    pool.scale.setScalar(snap ? 0.85 : 1.15);
    g.poolMat.opacity = 0.3 * g.coneMat.opacity;
    // the eruption: a column on the beat and the deterministic fan of drops
    const u = T - E;
    const col = mesh.col.current;
    const core = mesh.core.current;
    const rise = smooth(0, 0.35, u);
    col.visible = core.visible = u >= 0;
    col.position.set(LIP[0], LIP[1], LIP[2]);
    core.position.copy(col.position);
    const wob = 1 + 0.08 * Math.sin(T * 30);
    col.scale.set(wob, Math.max(0.001, 2.1 * rise), wob);
    core.scale.set(wob, Math.max(0.001, 2.1 * rise), wob);
    const o = g.o;
    const dm = mesh.drops.current;
    for (let i = 0; i < DROPS.length; i++) {
      const d = DROPS[i];
      const v = u - d.delay * 0.7;
      const k = v >= 0 ? (v / 2.2) % 1 : 0;
      o.position.set(LIP[0] + Math.cos(d.angle) * d.spread * 0.9 * k, LIP[1] + d.apex * 0.2 * 4 * k * (1 - k), LIP[2] + Math.sin(d.angle) * d.spread * 0.6 * k);
      o.rotation.set(0, d.angle, 0);
      o.scale.setScalar(v >= 0 ? 0.075 * (1 - 0.4 * k) : 0.0001);
      o.updateMatrix();
      dm.setMatrixAt(i, o.matrix);
    }
    dm.instanceMatrix.needsUpdate = true;
    // steam curls off the lip all the time, on twos
    const sm = mesh.steam.current;
    for (let i = 0; i < STEAM; i++) {
      const k = (T / 2.6 + i / STEAM) % 1;
      o.position.set(LIP[0] + Math.sin(i * 2.1 + T * 1.3) * 0.14 + 0.5 * k * Math.sin(i), LIP[1] + 0.05 + 1.15 * k, LIP[2] + 0.1 * Math.cos(i));
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(0.08 + 0.17 * k);
      o.updateMatrix();
      sm.setMatrixAt(i, o.matrix);
      sm.setColorAt(i, g.c.setScalar(0.28 * Math.sin(Math.PI * k) * (u >= 0 ? 1.5 : 1)));
    }
    sm.instanceMatrix.needsUpdate = true;
    sm.instanceColor.needsUpdate = true;
    // the star on the near eye's catchlight
    const st = mesh.star.current;
    const sa = T - (m0 + 0.25);
    st.visible = sa >= 0;
    if (st.visible) {
      const [qx, qy, qz] = eyeAt.current;
      st.position.set(qx - 0.04, qy + 0.04, qz + 0.12);
      st.scale.setScalar(0.34 * (1 + 0.7 * Math.exp(-sa * 7)) * (1 + 0.1 * Math.sin(T * 16)));
      st.rotation.z = 0.2 * Math.sin(T * 6) + 0.4 * Math.exp(-sa * 5);
    }
    // the lettering, each on its beat
    const put = (ref, lt, x, y, z, h, a0, a1) => {
      const m = ref.current;
      const age = T - a0;
      m.visible = age >= 0 && T < a1;
      if (m.visible) {
        const pop = 1 + 0.35 * Math.exp(-age * 12);
        m.position.set(x, y, z);
        m.scale.set(h * lt.aspect * pop, h * pop, 1);
        m.rotation.z = 0.08;
      }
    };
    put(mesh.ban, g.ban, -1.55, 1.95, 0.5, 0.7, m0 + 0.25, m0 + 1.5);
    put(mesh.gashan, g.gashan, hx + 0.5, hy + 0.95, hz + 0.3, 0.5, m1, m1 + 0.9);
    put(mesh.shu, g.shu, -0.1, 2.15, -2.4, 0.45, E, E + 1.0);
    // the keys swing and settle twice after the flinch, Kogoro's tie sways, Zzz rises
    keys.current.rotation.z = 0.12 * Math.sin(T * 3.4) + (hit >= 0 ? 0.7 * Math.exp(-hit * 2.4) * Math.sin(hit * 17) : 0);
    tieRef.current.rotation.z = 0.35 + 0.12 * Math.sin(T * 2.2);
    zzz.current.children.forEach((c, i) => {
      const k = (T / 2.8 + i / 3) % 1;
      c.position.set(0.15 * i + 0.1 * k, 0.5 * k + 0.12 * i, 0);
      c.scale.set(g.zz.aspect * (0.18 + 0.14 * k) * (1 - 0.15 * i), (0.18 + 0.14 * k) * (1 - 0.15 * i), 1);
      c.visible = k < 0.92;
    });
  });

  const ink = inkMats();
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} lean={-0.2} />
      <FigureAttach {...cut}>
        <group position={HAND} ref={keys}>
          <mesh geometry={g.keys} material={g.mat} />
        </group>
      </FigureAttach>
      <group ref={root} visible={false}>
        <mesh geometry={g.mound} material={g.mat} position={[LIP[0], 0, LIP[2]]} />
        <mesh ref={mesh.cone} geometry={g.cone} material={g.coneMat} visible={false} />
        <mesh ref={mesh.pool} geometry={g.pool} material={g.poolMat} visible={false} />
        <mesh ref={mesh.col} geometry={g.col} material={g.colMat} visible={false} />
        <mesh ref={mesh.core} geometry={g.core} material={g.coreMat} visible={false} />
        <primitive ref={mesh.drops} object={g.drops} />
        <primitive ref={mesh.steam} object={g.steam} />
        <mesh ref={A} geometry={g.x} material={g.mat} />
        <mesh ref={B} geometry={g.y} material={g.mat} />
        <mesh ref={mesh.ring} geometry={g.ring} material={g.ringMat} visible={false} />
        <mesh ref={mesh.star} geometry={g.star} material={g.starMat} visible={false} renderOrder={6} />
        <mesh ref={mesh.ban} geometry={PLANE} material={g.banMat} visible={false} renderOrder={9} />
        <mesh ref={mesh.gashan} geometry={PLANE} material={g.gashanMat} visible={false} renderOrder={9} />
        <mesh ref={mesh.shu} geometry={PLANE} material={g.shuMat} visible={false} renderOrder={9} />
        <group position={[3.1, 0, -0.9]} rotation={[0, -0.8, 0]} scale={0.95}>
          <mesh geometry={g.kog.outline} material={ink.outline} />
          <mesh geometry={g.kog.ink} material={ink.ink} />
          <group position={[0.0, 1.05, 0.2]} scale={0.5} ref={tieRef}>
            <mesh geometry={g.tie} material={g.mat} />
          </group>
          <group position={[0.3, 1.6, 0.1]} ref={zzz}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} geometry={PLANE} material={g.zzMat} renderOrder={9} />
            ))}
          </group>
        </group>
      </group>
    </>
  );
}
