// epsilon-hollow: Fullmetal Alchemist. The pup in Edward's red coat with a steel automail flipper CLAPS (slow-mo, a CLAP burst),
// slaps its palms to the sunset plaza, and a huge blue transmutation circle races out under crackling alchemy lightning while
// the ground reshapes into a stone spire and a wall of pillars. Alphonse (horned helm, red loincloth, glowing eye-dots) stands
// beside it. Then the stone Gate of Truth rises and opens: black tendrils, many white eyes, Truth grinning. The hollow metaphor:
// Epsilon-Hollow runs on no Philosopher's Stone. At the close the circle reverses and the pup is transmuted back to the island
// ("Return trip: paid in full."). Everything is built at mount (and prewarmed on approach); nothing is allocated per frame.
// Card: lib/world/cutscene/cards/p-epsilon-hollow.js. Builders: ./p-epsilon-hollow/fma.js, fx.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, Mesh, SphereGeometry } from "three";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { cutsceneMode } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { bolts, coat, particles, pupPaper } from "./p-epsilon-hollow/fx";
import { alphonse, circle, column, gate, hollowSphere, plaza, rimMaterial, skyDome, spire } from "./p-epsilon-hollow/fma";
import { layer } from "./p-epsilon-hollow/paper";

const AL = [-3.6, 0, -1.2]; // Alphonse beside the pup
const GATE_AT = [-3.5, 0, -17];
const SPHERE_AT = [2.4, 2.3, 0.4];
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);

// the pup's red coat gets a hood, and its right flipper a steel automail shell: both ride on the pup's own groups
function outfit(p, mat) {
  const out = [];
  const head = p?.head;
  if (head) {
    let big = null;
    let n = -1;
    head.traverse((o) => {
      if (o.isMesh && o.geometry.attributes.position.count > n) (n = o.geometry.attributes.position.count), (big = o);
    });
    if (big) {
      big.geometry.computeBoundingBox();
      const bb = big.geometry.boundingBox;
      const sx = bb.max.x - bb.min.x;
      const sy = bb.max.y - bb.min.y;
      const sz = bb.max.z - bb.min.z;
      const L = layer();
      L.add(new SphereGeometry(0.58, 18, 12, Math.PI, Math.PI, 0, Math.PI * 0.62), "#e0262b", {}, 0, 0, 0, 0, 0, 0, sx * 1.0, sy * 1.05, sz * 1.0);
      const h = new Mesh(L.build(), mat);
      h.frustumCulled = false;
      h.position.set((bb.max.x + bb.min.x) / 2, (bb.max.y + bb.min.y) / 2 + sy * 0.06, (bb.max.z + bb.min.z) / 2 - sz * 0.06);
      big.parent.add(h);
      out.push(h);
    }
  }
  return out;
}

function steelFlipper(r, mat) {
  const pairs = [];
  r?.traverse((o) => {
    if (!o.isMesh || o.userData.steel) return;
    const L = layer();
    L.add(o.geometry, "#b9c6e0", {});
    const s = new Mesh(L.build(), mat);
    s.userData.steel = true;
    s.scale.setScalar(1.12);
    s.frustumCulled = false;
    pairs.push([o, s]);
  });
  for (const [o, s] of pairs) o.add(s);
  return pairs.map(([, s]) => s);
}

function build() {
  const mat = rimMaterial();
  const sky = skyDome();
  const ground = plaza(mat);
  const circ = circle(mat);
  const col = column();
  const al = alphonse(mat);
  const sp = spire(mat);
  const gt = gate(mat);
  const hs = hollowSphere();
  const bl = bolts(mat);
  const spark = particles(mat, [
    { n: 40, at: [0, 1.0, 0.6], t0: 1.0, speed: 6, up: 0.4, life: 0.9, g: 4, size: 0.14, colors: ["#e6f4ff", "#7fd2ff", "#ffffff", "#ffd36a"], seed: 1 },
    { n: 60, at: [0, 0.2, 0], r: 6, t0: 3.4, spread: 1.4, speed: 4, up: 1.6, vy: 1.4, life: 1.4, g: 7, size: 0.16, colors: ["#3fdcff", "#ffffff", "#ffd36a"], seed: 2 },
    { n: 50, at: [7, 0.3, -4], r: 4, t0: 4.0, spread: 1.6, speed: 3, up: 1.5, vy: 1.2, life: 1.6, g: 8, size: 0.2, colors: ["#e8883a", "#ffd37a", "#c9482b"], seed: 3 },
    { n: 50, at: GATE_AT, r: 5, t0: 13.2, spread: 0.8, speed: 4, up: 1.4, vy: 1.4, life: 1.4, g: 8, size: 0.2, colors: ["#e8883a", "#ffd37a", "#ffffff"], seed: 4 },
    { n: 70, at: [0, 0.3, 0], r: 6, t0: 24.4, spread: 1.0, speed: 5, up: 2.0, vy: 1.6, life: 1.2, g: 3, size: 0.16, colors: ["#3fdcff", "#ffffff", "#9fe6ff"], seed: 5 },
  ]);
  const flash = flashQuad("#cfe6ff");
  return { mat, sky, ground, circ, col, al, sp, gt, hs, bl, spark, flash };
}

// ---- PREWARM: near the dock the parts are built and every program compiled, drawn at scale ~0 for four frames, then taken away.
let PRE = null;
let PAINT = null;
const takeParts = () => {
  const p = PRE;
  PRE = null;
  return p?.m ?? build();
};
function warmUp(w) {
  const m = build();
  PRE = { m };
  const root = new Group();
  root.scale.setScalar(0.0001);
  root.position.set(live.seal.x, -400, live.seal.z);
  const mine = [m.sky.mesh, m.ground, m.circ.root, m.col.mesh, m.al.root, m.sp.root, m.gt.root, m.hs.root, m.bl.mesh, m.spark.mesh, m.flash];
  const kept = [];
  for (const o of mine) {
    o.traverse((x) => kept.push([x, x.visible]));
    root.add(o);
  }
  for (const [x] of kept) x.visible = true;
  const p = pupParts(w.scene);
  const paint = p?.root ? pupPaper(p.root) : null;
  PAINT = paint;
  const stand = paint ? paint.stand() : [];
  for (const x of stand) root.add(x);
  w.scene.add(root);
  let n = 0;
  const done = () => {
    if (++n < 4) return requestAnimationFrame(done);
    for (const o of mine) o.removeFromParent();
    for (const [x, v] of kept) x.visible = v;
    for (const x of stand) x.removeFromParent();
    root.removeFromParent();
  };
  requestAnimationFrame(done);
}
if (typeof window !== "undefined" && cutsceneMode("p-epsilon-hollow") === "full") {
  const dock = PLACE_BY_ID["p-epsilon-hollow"];
  const poll = setInterval(() => {
    const w = window.__world;
    if (!w?.scene || !live.seal) return;
    if (Math.hypot(live.seal.x - dock.x, live.seal.z - dock.z) > 48) return;
    clearInterval(poll);
    warmUp(w);
  }, 400);
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const pup = useRef(null);
  const paint = useRef(null);
  const cloak = useRef(null);
  const extras = useRef([]);
  const island = useRef([]);
  const flaps = useRef(null);
  const caption = useRef(null);
  const clap = useRef(0);
  const m = useMemo(takeParts, []);

  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    paint.current = PAINT ?? (p?.root ? pupPaper(p.root) : null);
    PAINT = null;
    cloak.current = p?.rear ? coat(p.rear, m.mat) : null;
    const kids = p?.rear?.children ?? [];
    flaps.current = { l: kids[1] ?? null, r: kids[2]?.children?.[0] ?? null };
    extras.current = [...outfit(p, m.mat), ...steelFlipper(flaps.current.r, m.mat)];
    return () => {
      for (const x of extras.current) (x.removeFromParent(), x.geometry.dispose());
      extras.current = [];
      paint.current?.dispose();
      paint.current = null;
      cloak.current?.dispose();
      cloak.current = null;
      pup.current = null;
      m.sky.dispose();
      m.ground.geometry.dispose();
      m.circ.dispose();
      m.col.dispose();
      m.al.root.traverse((o) => o.isMesh && o.geometry.dispose());
      m.sp.dispose();
      m.gt.dispose();
      m.hs.dispose();
      m.bl.dispose();
      m.spark.dispose();
      m.flash.geometry.dispose();
      m.flash.material.dispose();
      m.mat.dispose();
    };
  }, [scene, m]);

  // the return caption: a cream card in the lower half
  useEffect(() => {
    if (mode !== "full") return undefined;
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.textContent = "Return trip: paid in full.";
    el.style.cssText =
      "position:fixed;z-index:45;left:50%;bottom:16vh;transform:translateX(-50%);padding:10px 24px;border:3px solid #1b1427;border-radius:6px;background:#fff3d6;color:#1b1427;box-shadow:6px 6px 0 #e0262b;font:800 clamp(18px,3.2vmin,30px) var(--font-comic,system-ui),sans-serif;pointer-events:none;opacity:0;white-space:nowrap";
    document.body.appendChild(el);
    caption.current = el;
    return () => {
      el.remove();
      caption.current = null;
    };
  }, [mode]);

  // the clap, after the pup's own pose: the flippers slap together
  useFrame(() => {
    const f = flaps.current;
    if (!f || !live.arrival.id || mode !== "full") return;
    const k = clap.current;
    if (k > 0.001 && f.l && f.r) {
      f.l.rotation.set(0.1, -1.25 * k + (1 - k) * f.l.rotation.y, 0.35 * k + (1 - k) * f.l.rotation.z, "YZX");
      f.r.rotation.set(0.1, -1.25 * k + (1 - k) * f.r.rotation.y, 0.35 * k + (1 - k) * f.r.rotation.z, "YZX");
    }
  }, 0);

  useFrame(() => {
    if (!live.arrival.id) {
      rig.current.visible = false;
      paint.current?.set(false);
      if (cloak.current) cloak.current.group.visible = false;
      if (caption.current) caption.current.style.opacity = 0;
    }
  }, -0.5);

  useCutFrame((t, state) => {
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) {
      paint.current?.set(false);
      if (cloak.current) cloak.current.group.visible = false;
      return;
    }
    const s = live.seal;
    const cam = state.camera;
    const c0 = tl.collapse[0];
    const c1 = tl.collapse[1];
    g.position.set(s.x, 0, s.z);
    m.mat.uniforms.uTime.value = t;
    m.mat.uniforms.uGlow.value = 0.5 + 0.5 * Math.sin(t * 9);
    const frame = Math.floor(t * 12);
    const back = smooth(c0 - 0.6, c0 + 0.5, t);

    // ---- the transmutation circle: races out from the pup after the palms land (3.2 -> 4.7), spinning; reverses on the return
    const out = smooth(3.2, 4.7, t) * (1 - smooth(c0 - 0.4, c0 + 0.2, t));
    const re = smooth(c0 - 0.2, c0 + 0.6, t) * (1 - smooth(c1 - 0.2, c1 + 0.2, t));
    const radius = Math.max(out, re * 0.9);
    m.circ.root.visible = radius > 0.002;
    m.circ.root.scale.setScalar(Math.max(0.001, radius));
    m.circ.spin.rotation.y = t < c0 - 0.2 ? t * 0.35 : -(t * 1.6);
    m.circ.glowMat.uniforms.uK.value = 0.9 + 0.5 * Math.sin(t * 14) + bump(t, 3.9, 0.5) * 1.5;
    const colK = bump(t, 3.5, 0.5) * 0.9 + re * (1 - smooth(c1 - 0.1, c1 + 0.2, t));
    m.col.mesh.visible = colK > 0.01;
    m.col.glowMat.uniforms.uK.value = colK * 2.2;

    // ---- lightning: crawls out with the circle, flickering on twos; again on the return
    const win1 = t > 3.2 && t < 7.8;
    const win2 = t > c0 - 0.2 && t < c1 + 0.2;
    m.bl.mesh.visible = win1 || win2;
    if (win1) m.bl.update(t - 1.9, Math.min(9, (t - 3.2) * 7), 0.12, frame);
    else if (win2) m.bl.update(t - (c0 - 0.2) + 0.2, 4 + (t - c0) * 5, 0.12, frame);
    m.spark.update(t);

    // ---- the ground reshapes: spire and pillars rise, and sink back on the return
    m.sp.update(t, 1 - smooth(c0 - 0.5, c0 + 0.4, t));

    // ---- Alphonse stands beside the pup from the start
    const al = m.al;
    al.root.position.set(AL[0], 0.02 * Math.sin(t * 1.6), AL[2]);
    al.root.rotation.y = 0.28;
    al.root.scale.setScalar(0.62);
    al.head.rotation.y = 0.35 * Math.sin(t * 0.5);
    al.head.rotation.z = 0.04 * Math.sin(t * 0.8);
    al.root.visible = t < c0 + 0.3;

    // ---- the Gate of Truth: stands up from the ground (12.6 -> 13.8), opens on line C (14.0 -> 16.2), closes before the credit
    const rise = smooth(12.6, 13.8, t) * (1 - smooth(c0 - 0.4, c0 + 0.1, t));
    const open = smooth(14.0, 16.2, t) * (1 - smooth(19.5, 20.3, t));
    const reach = smooth(14.8, 17.2, t) * (1 - smooth(19.1, 20.3, t));
    const truthK = smooth(15.8, 17.0, t) * (1 - smooth(19.5, 20.1, t));
    m.gt.root.position.set(GATE_AT[0], 0, GATE_AT[2]);
    m.gt.update(t, rise, open, reach, truthK);

    // ---- the hollow sphere (memory, files, scheduler): up with the "your stone" line
    const hk = smooth(16.2, 17.2, t) * (1 - smooth(c0 - 0.5, c0, t));
    m.hs.root.visible = hk > 0.01;
    m.hs.root.position.set(SPHERE_AT[0], SPHERE_AT[1] + 0.1 * Math.sin(t * 1.5), SPHERE_AT[2]);
    m.hs.root.scale.setScalar(Math.max(0.001, 0.95 * hk));
    m.hs.root.rotation.set(t * 0.4, t * 0.7, 0);

    // ---- THE PUP: the clap, palms to the ground, then upright; transmuted back at the close
    clap.current = smooth(0.92, 1.0, t) * (1 - smooth(1.9, 2.3, t));
    live.pose.sign = smooth(0.3, 0.9, t) * (1 - smooth(1.0, 1.2, t));
    live.pose.crouch = smooth(2.8, 3.3, t) * (1 - smooth(5.6, 6.4, t));
    paint.current?.set(true);
    const cp = cloak.current;
    if (cp) {
      cp.group.visible = true;
      cp.group.rotation.x = -0.1 * Math.sin(t * 6) * 0.4 - 0.08;
    }
    for (const x of extras.current) x.visible = true;

    // ---- the flashes: the clap, the circle's arrival, the return
    m.flash.material.color.set(t > 3 ? "#9fe6ff" : "#fff3c8");
    holdFlash(m.flash, cam, bump(t, 1.0, 0.1) * 0.35 + bump(t, 3.3, 0.12) * 0.3 + bump(t, c1 - 0.2, 0.3) * 0.7 + bump(t, c0 + 0.4, 0.15) * 0.3);

    // ---- the return caption
    if (caption.current) caption.current.style.opacity = (smooth(c0 - 0.1, c0 + 0.3, t) * (1 - smooth(c1 + 0.9, c1 + 1.4, t))).toFixed(2);

    // the island the stage hid comes back as the circle takes the pup home
    if (back > 0.9 && t < c1 + 0.4) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <primitive object={m.sky.mesh} />
        <primitive object={m.ground} />
        <primitive object={m.circ.root} />
        <primitive object={m.col.mesh} />
        <primitive object={m.al.root} />
        <primitive object={m.sp.root} />
        <primitive object={m.gt.root} />
        <primitive object={m.hs.root} />
        <primitive object={m.bl.mesh} />
        <primitive object={m.spark.mesh} />
      </group>
    </>
  );
}
