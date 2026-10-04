// Triton kernels: Jujutsu Kaisen, Sukuna's Malevolent Shrine, in shape and
// colour only. The pup is the demon seal (round head, no ears; two dark lines
// under each eye, a crimson second pair above them that opens last, black
// nail-tips). The sky floods blood red to black, a low-poly shrine with a
// fanged mouth and a torii gate rises out of the snow behind the glacier and
// says line A with its jaw. The pup flicks one flipper, and a barrage of
// two-frame slash lines carves the causal triangle of 55 blocks (the schedule
// of monuments/parts/schedule-layout.js: sink column, local diagonal, the two
// salience columns): every unscheduled block splits along a diagonal, its two
// wedges slide apart and land together; the scheduled blocks stay whole and
// light up Cherenkov blue, the only cold light in the red. On the flex line
// they pulse in walk order, row by row, and a coral bead lands at the end of
// each row. The slashes stay inside the triangle's bounds.
// Cost by construction: dome, ground, ash, blocks, wedges, slashes, chips,
// beads, shrine (ink + rim + roof + jaw): about 14 draw calls, no post.
// Card: lib/world/cutscene/cards/pr-triton-kernels-22.js.

import { useMemo, useRef } from "react";
import { BoxGeometry, ConeGeometry, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, Shape, BackSide, ShaderMaterial } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { NB, ROWS } from "../../monuments/parts/schedule-layout";
import { Speaker, Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Dome, Motes } from "./_g1";

const D = new Object3D();
const PAL = {
  top: "#050102", mid: "#4a060e", hor: "#b3121f", bot: "#12040a", glow: "#ff5a4a", dot: "#2a0309", glowK: 0.45, dotK: 0.5,
  groundIn: "#3a0a12", groundOut: "#0a0204", groundDot: "#d11a2c",
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

// the 10 x 10 lower triangle: row q holds blocks 0..q; scheduled iff ROWS[q] has it
const CELLS = [];
for (let q = 0; q < NB; q++) for (let k = 0; k <= q; k++) CELLS.push({ q, k, on: ROWS[q].includes(k) });
const CUT = CELLS.filter((c) => !c.on);
const KEEP = CELLS.filter((c) => c.on);
const C = 0.3;
const GAP = 0.03;
const TRI_AT = [2.7, 0, -2.4]; // pup-local, turned toward the glacier: right of the pup, in front of the shrine
const bx = (c) => TRI_AT[0] + (c.k - c.q / 2) * (C + GAP);
const by = (c) => (NB - 1 - c.q) * (C + GAP) + C / 2;
const SPAN = [TRI_AT[0] - (NB / 2) * (C + GAP), TRI_AT[0] + (NB / 2) * (C + GAP), 0, NB * (C + GAP)]; // the triangle's bounds: x0 x1 y0 y1
const SHRINE_AT = [14, -104]; // world x, z: far behind where the glacier was, scaled up to loom
const SHRINE_SCALE = 2.2;
const SLASHES = 60;
const CHIPS = 90;
const T = { cut: 3.3, cutEnd: 3.9, land: 4.3, flex: 7.35 };
const ICE = new Color("#76525a");
const BLUE = new Color("#1ec8f0");
const BEAD = new Color("#ff8f7a");

// the shrine: ink with a crimson rim, a fanged mouth (its jaw is its own mesh), a torii gate in front
function shrine() {
  const prep = (g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("uv");
    n.deleteAttribute("normal");
    return n;
  };
  const box = (w, h, d, x, y, z, rz = 0) => prep(new BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z));
  const cone = (r, h, x, y, z = 0, seg = 4) => prep(new ConeGeometry(r, h, seg).rotateY(seg === 4 ? Math.PI / 4 : 0).translate(x, y, z));
  const body = [box(11, 3.2, 4.5, 0, 1.6, 0), box(8, 2, 3.4, 0, 4.2, 0), box(5.2, 1.7, 2.4, 0, 6.05, 0)];
  const roofs = [cone(8.2, 1.7, 0, 5.75), cone(6, 1.5, 0, 7.6), cone(3.4, 2.8, 0, 9.7), cone(0.35, 2.2, 0, 12.2, 0, 5)];
  const gate = [];
  for (const s of [-1, 1]) {
    gate.push(prep(new CylinderGeometry(0.32, 0.36, 7, 6).translate(s * 4.2, 3.5, 6.6)));
    gate.push(box(1.4, 0.4, 0.9, s * 5.4, 7.55, 6.6, s * 0.35)); // the upturned ends of the top beam
  }
  gate.push(box(10, 0.55, 0.95, 0, 7.2, 6.6), box(8.6, 0.38, 0.5, 0, 5.7, 6.6));
  const teeth = [];
  for (let i = 0; i < 7; i++) teeth.push(prep(new ConeGeometry(0.2, 0.75, 4).rotateX(Math.PI).translate(-2.4 + i * 0.8, 2.75, 2.3)));
  const fill = mergeGeometries([...body, ...gate, ...teeth]);
  const rim = (g) => {
    const o = mergeVertices(g.clone(), 1e-3);
    o.computeVertexNormals();
    return o;
  };
  const roof = mergeGeometries(roofs);
  // the jaw: a lower slab with its own upward fangs, pivoting at its back edge
  const jawParts = [box(5.4, 0.7, 1.0, 0, -0.2, 0.5)];
  for (let i = 0; i < 6; i++) jawParts.push(prep(new ConeGeometry(0.18, 0.6, 4).translate(-2.0 + i * 0.8, 0.3, 0.9)));
  const jaw = mergeGeometries(jawParts);
  const mouth = box(5.2, 1.6, 0.4, 0, 2.15, 2.15);
  return { fill, fillRim: rim(fill), roof, roofRim: rim(roof), jaw, jawRim: rim(jaw), mouth };
}
const rimMat = () =>
  new ShaderMaterial({
    side: BackSide,
    vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.16, 1.0); }`,
    fragmentShader: /* glsl */ `void main(){ gl_FragColor = vec4(0.9, 0.08, 0.18, 1.0); }`,
  });

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const g = useRef();
  const sh = useRef();
  const roof = useRef();
  const jaw = useRef();
  const m = useMemo(() => {
    const blocks = inst(new BoxGeometry(1, 1, 0.6), mat(), CELLS.length, Array(CELLS.length).fill(ICE));
    const tri = new Shape().moveTo(-0.5, -0.5).lineTo(0.5, -0.5).lineTo(-0.5, 0.5).lineTo(-0.5, -0.5);
    const wedges = inst(new ExtrudeGeometry(tri, { depth: 0.6, bevelEnabled: false }).translate(0, 0, -0.3), mat(), CUT.length * 2, Array.from({ length: CUT.length * 2 }, (_, i) => new Color().copy(ICE).multiplyScalar(0.85 + 0.3 * hash(i))));
    const slashes = inst(new PlaneGeometry(1, 0.055), mat({ side: DoubleSide }), SLASHES, Array.from({ length: SLASHES }, (_, i) => new Color(i % 3 ? "#ffffff" : "#ff6a6a")));
    const chips = inst(new OctahedronGeometry(1, 0), mat(), CHIPS, Array.from({ length: CHIPS }, (_, i) => new Color(i % 2 ? "#cfc3c8" : "#f0e8ea")));
    const beads = inst(new IcosahedronGeometry(1, 0), mat(), NB, Array(NB).fill(BEAD));
    const s = shrine();
    return { blocks, wedges, slashes, chips, beads, s, ink: mat({ color: "#0a0508" }), mouth: mat({ color: "#8a0a16" }), rim: rimMat() };
  }, []);

  useCutFrame((t) => {
    const s = live.seal;
    const full = mode === "full";
    g.current.visible = full;
    sh.current.visible = full;
    if (!full) return;
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = turnFor(card, place, s.x, s.z);
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);

    // THE PUP: the domain hand sign, the demon marks fade in (the second pair last), one flipper flicked at the cut
    live.pose.sign = signAt(tl, t) * (1 - smooth(3.0, 3.2, tt));
    live.pose.point = smooth(3.2, 3.35, tt) * (1 - smooth(4.1, 4.4, tt)) * out;
    live.pose.demon = smooth(0.5, 1.5, tt) * out;

    // THE SHRINE rises out of the snow behind the glacier on the impact, back.out; its jaw drops on each word of line A
    const rise = smooth(1.15, 1.55, tt);
    const bk = rise < 1 ? rise + 0.12 * Math.sin(rise * Math.PI) : 1;
    sh.current.position.set(SHRINE_AT[0], -20 * (1 - bk) * out - 20 * (1 - out), SHRINE_AT[1]);
    const speak = tt > tl.lineA && tt < tl.lineA + 1.0 ? Math.floor(tt * 6) % 2 : 0;
    jaw.current.rotation.x = 0.18 * speak;
    roof.current.rotation.z = 0.012 * Math.sin(tt * 2.1);

    // THE TRIANGLE: 55 blocks; before the cut all ice; the scheduled ones go Cherenkov blue as the cut begins
    const appear = smooth(1.9, 2.6, tt) * out;
    const lit = smooth(T.cut, T.cut + 0.2, tt);
    let ci = 0;
    for (let i = 0; i < CELLS.length; i++) {
      const c = CELLS[i];
      const x = bx(c);
      const y = by(c);
      if (c.on) {
        // the walk on the flex line: rows from the apex down, a pulse each
        const ts = T.flex + 0.17 * c.q + 0.025 * ROWS[c.q].indexOf(c.k);
        const pulse = tt > ts && tt < ts + 0.3 ? Math.sin(((tt - ts) / 0.3) * Math.PI) : 0;
        put(m.blocks, i, x, y, TRI_AT[2], C * appear * (1 + 0.22 * pulse), C * appear * (1 + 0.22 * pulse), C * appear);
        m.blocks.setColorAt(i, lit > 0.5 ? BLUE : ICE);
      } else {
        const tc = T.cut + (hash(i, 2) * 0.3 + ((c.q + c.k) / (2 * NB)) * 0.3); // the cut sweeps the diagonal
        const cutNow = tt >= tc;
        put(m.blocks, i, x, y, TRI_AT[2], cutNow ? 0.0001 : C * appear, C * appear, C * appear);
        // two wedges slide apart along the diagonal and drop, all landing together
        const u = Math.min(1, Math.max(0, (tt - tc) / (T.land - tc)));
        for (let h = 0; h < 2; h++) {
          const dir = h ? 1 : -1;
          const slide = 0.5 * Math.min(1, (tt - tc) / 0.25) * dir;
          const drop = by(c) * u * u;
          put(m.wedges, ci * 2 + h, x + slide * 0.7, y - drop + (cutNow ? 0 : -9), TRI_AT[2] + 0.05 * dir, cutNow ? C : 0.0001, cutNow ? C : 0.0001, C, 0, 0, (h ? Math.PI : 0) + dir * 0.3 * u * (1 - u));
        }
        ci++;
      }
    }
    m.blocks.instanceMatrix.needsUpdate = true;
    m.blocks.instanceColor.needsUpdate = true;
    m.wedges.instanceMatrix.needsUpdate = true;

    // THE SLASH BARRAGE: two-frame strokes at random angles inside the triangle's bounds, a few held as a frozen web
    for (let i = 0; i < SLASHES; i++) {
      const ts = T.cut + ((T.cutEnd - T.cut) * i) / SLASHES;
      const life = i % 6 === 0 ? 0.7 : 0.17;
      if (tt < ts || tt > ts + life) {
        put(m.slashes, i, 0, -9, 0, 0.0001);
        continue;
      }
      const x1 = SPAN[0] + hash(i, 1) * (SPAN[1] - SPAN[0]);
      const y1 = SPAN[2] + hash(i, 2) * (SPAN[3] - SPAN[2]);
      const ang = (hash(i, 3) - 0.5) * 2.6 + (i % 2 ? 0.9 : -0.9);
      const len = 1.4 + 1.6 * hash(i, 4);
      const x2 = Math.min(SPAN[1], Math.max(SPAN[0], x1 + Math.cos(ang) * len));
      const y2 = Math.min(SPAN[3], Math.max(SPAN[2], y1 + Math.sin(ang) * len));
      put(m.slashes, i, (x1 + x2) / 2, (y1 + y2) / 2 + 0.01, TRI_AT[2] + 0.4, Math.hypot(x2 - x1, y2 - y1) * out, 1, 1, 0, 0, Math.atan2(y2 - y1, x2 - x1));
    }
    m.slashes.instanceMatrix.needsUpdate = true;

    // ice chips spray off the cuts and settle on the snow
    for (let i = 0; i < CHIPS; i++) {
      const c = CUT[i % CUT.length];
      const tc = T.cut + 0.05 + hash(i, 5) * 0.55;
      const tau = tt - tc;
      if (tau < 0) {
        put(m.chips, i, 0, -9, 0, 0.0001);
        continue;
      }
      const x = bx(c) + (hash(i, 6) - 0.5) * 2.4 * Math.min(1, tau * 2);
      const y = Math.max(0.04, by(c) + 1.8 * tau * hash(i, 7) - 4.9 * tau * tau);
      put(m.chips, i, x, y, TRI_AT[2] + (hash(i, 8) - 0.3) * 0.9 * Math.min(1, tau * 2), 0.05 * (1 + hash(i)) * out, 0.05 * out, 0.05 * out, tau * 3, tau * 2, 0);
    }
    m.chips.instanceMatrix.needsUpdate = true;

    // a coral bead lands at the end of each row on the flex line: the figure's outputs chain
    for (let q = 0; q < NB; q++) {
      const c = { q, k: q };
      const ts = T.flex + 0.17 * q + 0.12;
      const u = Math.min(1, Math.max(0, (tt - ts) / 0.3));
      put(m.beads, q, bx(c) + 0.0, by(c) + C / 2 + 0.1 + 1.2 * (1 - u) * (1 - u), TRI_AT[2] + 0.1, u > 0 ? 0.1 * out : 0.0001);
    }
    m.beads.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <Dome tl={tl} mode={mode} pal={PAL} />
      <Motes mode={mode} tl={tl} n={150} span={[24, 10, 18]} center={[0, 0, -4]} dir={[0.05, -0.4, 0]} size={0.05} color={["#ff7a6a", "#c0302c", "#e9d0cc"]} sway={0.5} shape="round" />
      <Speaker {...cut} />
      <group ref={g} visible={false}>
        <primitive object={m.blocks} />
        <primitive object={m.wedges} />
        <primitive object={m.slashes} />
        <primitive object={m.chips} />
        <primitive object={m.beads} />
      </group>
      <group ref={sh} scale={SHRINE_SCALE} visible={false}>
        <mesh geometry={m.s.fillRim} material={m.rim} />
        <mesh geometry={m.s.fill} material={m.ink} />
        <mesh geometry={m.s.mouth} material={m.mouth} />
        <group ref={roof}>
          <mesh geometry={m.s.roofRim} material={m.rim} />
          <mesh geometry={m.s.roof} material={m.ink} />
        </group>
        <group ref={jaw} position={[0, 1.75, 1.6]}>
          <mesh geometry={m.s.jawRim} material={m.rim} />
          <mesh geometry={m.s.jaw} material={m.ink} />
        </group>
      </group>
    </>
  );
}
