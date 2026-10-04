"use client";

// THE SPEAKER (shared): a low-poly ink silhouette, the other mouth of a
// place's cutscene. Parametric from the card: a build (tall, broad, small),
// a hair outline, ONE cream prop and a pose; no face, ever. Ink with a faint
// halftone where the facets turn to the light, a thin rim from an inverted
// hull, both tinted to the place (lib/world/cutscene/look.js). It steps in
// on twos after the bloom (squash, stretch, settle) and out on the collapse;
// with reduced motion it simply stands. A card whose speaker is "land" has
// no figure: the landform speaks (Stage.jsx keeps it lit).

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BackSide, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, MeshBasicMaterial, Quaternion, ShaderMaterial, BoxGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paletteFor } from "../../../lib/world/cutscene/look";
import { BUILDS, figureAt, figureScale, onTwos, speakersOf } from "../../../lib/world/cutscene/timeline";
import { live } from "../../../lib/world/store";
import { HALFTONE } from "./Stage";

// The silhouette: ink with a rim light set as halftone dots on the facets
// that turn away from the lens.
function inkMaterial() {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uInk: { value: new Color() }, uRim: { value: new Color() } },
    vertexShader: /* glsl */ `
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      uniform vec3 uRim;
      varying vec3 vView;
      ${HALFTONE}
      void main() {
        vec3 n = normalize(cross(dFdx(vView), dFdy(vView))); // the facet's normal: low poly, flat
        if (dot(n, vView) > 0.0) n = -n;
        // body shading only: a faint halftone where the facets turn to the light
        float tone = max(n.y, 0.0) * 0.5 + max(n.x, 0.0) * 0.35;
        vec3 col = mix(uInk, mix(uInk, uRim, 0.22), uCell > 0.0 ? halftone(tone) : tone * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// A thin solid rim: the hull pushed out a fixed width, back faces only.
function outlineMaterial() {
  return new ShaderMaterial({
    uniforms: { uRim: { value: new Color() } },
    side: BackSide,
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.022, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRim;
      void main() { gl_FragColor = vec4(uRim, 1.0); }`,
  });
}

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
const prep = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};
// A tapered six-sided limb from a to b.
function limb(a, b, r1, r2, sx = 1, sz = 1) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, len, 6, 1).scale(sx, 1, sz);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return prep(g);
}
const hand = (at, r = 0.075) => prep(new IcosahedronGeometry(r, 0).translate(...at));

// THE ARMS, per pose, in the tall figure's space (it faces +z; its right
// hand, -x, is the side toward the pup). Each entry: [from, to, r1, r2], and
// the hands left showing.
const S = (s, x, y, z) => [s * x, y, z];
const ARMS = {
  pockets: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.42, 1.22, -0.04), 0.095, 0.08], [S(s, 0.42, 1.22, -0.04), S(s, 0.21, 1.0, 0.08), 0.08, 0.07]], // elbows out, into the pockets
  side: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.37, 1.22, -0.02), 0.095, 0.08], [S(s, 0.37, 1.22, -0.02), S(s, 0.39, 0.9, 0.04), 0.08, 0.07, true]],
  point: (s) => (s < 0 ? [[S(s, 0.3, 1.58, 0), S(s, 0.62, 1.52, 0.2), 0.095, 0.08], [S(s, 0.62, 1.52, 0.2), S(s, 0.98, 1.5, 0.45), 0.08, 0.065, true]] : ARMS.side(s)),
  handout: (s) => (s < 0 ? [[S(s, 0.3, 1.58, 0), S(s, 0.5, 1.36, 0.25), 0.095, 0.08], [S(s, 0.5, 1.36, 0.25), S(s, 0.66, 1.34, 0.62), 0.08, 0.065, true]] : ARMS.side(s)),
  hip: (s) => (s > 0 ? ARMS.pockets(s).map((l, i) => (i ? [l[0], S(s, 0.24, 1.02, 0.02), 0.08, 0.07] : l)) : [[S(s, 0.3, 1.58, 0), S(s, 0.5, 1.82, 0.16), 0.095, 0.08], [S(s, 0.5, 1.82, 0.16), S(s, 0.66, 2.1, 0.36), 0.08, 0.065, true]]),
  crossed: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.38, 1.27, 0.12), 0.095, 0.08], [S(s, 0.38, 1.27, 0.12), S(s, -0.22, 1.36 + 0.03 * s, 0.24), 0.08, 0.075]],
  cane: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.36, 1.26, 0.14), 0.095, 0.08], [S(s, 0.36, 1.26, 0.14), S(s, 0.05, 1.02, 0.34), 0.08, 0.07]],
};

// THE HAIR, on a unit head at the origin: [degrees round from the top, how
// far back, length] spikes (Aether-Lang's swept-up crown is "spiky"), or a
// function of its own.
const SPIKES = {
  spiky: [
    [-78, 0.05, 0.2], [-55, -0.05, 0.27], [-32, 0.04, 0.33], [-10, -0.06, 0.36], [12, 0.05, 0.35],
    [34, -0.04, 0.32], [56, 0.03, 0.27], [76, -0.02, 0.2], [-22, -0.6, 0.27], [24, -0.6, 0.26], [0, -0.9, 0.22],
  ],
  flame: [
    [-40, 0.1, 0.28], [-24, -0.1, 0.36], [-10, 0.05, 0.43], [4, -0.12, 0.46], [18, 0.04, 0.4], [32, -0.08, 0.33], [46, 0.08, 0.25],
    [-14, -0.7, 0.34], [14, -0.7, 0.32], [0, 0.5, 0.14],
  ],
  short: [[-70, 0, 0.1], [-40, -0.1, 0.12], [-12, 0.05, 0.13], [14, -0.05, 0.13], [42, 0.08, 0.12], [70, 0, 0.1], [0, -0.8, 0.11]],
};
function hairParts(hair, head, k) {
  const parts = [];
  const spike = (dir, h, r = 0.075) => {
    const g = new ConeGeometry(r * k, h * k, 5);
    g.translate(0, (h * k) / 2, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, dir.normalize()));
    g.translate(head[0] + dir.x * 0.1 * k, head[1] + 0.04 * k + dir.y * 0.1 * k, head[2] + dir.z * 0.1 * k);
    parts.push(prep(g));
  };
  if (SPIKES[hair]) {
    for (const [deg, back, h] of SPIKES[hair]) {
      const a = (deg * Math.PI) / 180;
      spike(new Vector3(Math.sin(a), Math.cos(a) * 0.95 + 0.15, back), h);
    }
  } else if (hair === "swept") {
    // slicked straight back, one loose strand over the brow
    for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) spike(new Vector3(x * 0.6, 0.55, -1), 0.3, 0.085);
    spike(new Vector3(0.15, -0.5, 1), 0.16, 0.03);
  } else if (hair === "mane") {
    // long and heavy down the back, ragged at the crown
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) spike(new Vector3(x * 0.5, -0.9, -0.55), 0.62, 0.1);
    for (const deg of [-50, -20, 10, 40]) spike(new Vector3(Math.sin((deg * Math.PI) / 180), 0.9, -0.2), 0.18);
  } else if (hair === "crest") {
    // swept up into one tall shape, a lean crest with a low tail behind
    spike(new Vector3(0, 1, -0.25), 0.5, 0.1);
    spike(new Vector3(0.2, 0.9, -0.5), 0.34, 0.08);
    spike(new Vector3(-0.2, 0.9, -0.5), 0.34, 0.08);
    spike(new Vector3(0, 0.3, -1), 0.3, 0.07);
  } else if (hair === "catears") {
    // two tall pointed ears, a god's: allowed on an ink figure, never on the pup
    for (const sd of [-1, 1]) spike(new Vector3(sd * 0.42, 1, -0.05), 0.4, 0.085);
  } else if (hair === "ears") {
    // two long ears out to the sides, tipped up: a small sage's outline
    for (const s of [-1, 1]) spike(new Vector3(s, 0.5, -0.15), 0.3, 0.05);
  }
  return parts;
}

// THE ONE PROP, in cream: what makes the silhouette a homage without a face.
function propGeometry(prop, head, r, b) {
  const [hx, hy, hz] = head;
  const parts = [];
  const add = (g) => parts.push(g);
  if (prop === "band") add(new CylinderGeometry(r + 0.007, r + 0.007, 0.062, 14, 1, true).scale(0.96, 1, 1.04).translate(hx, hy + 0.02, hz)); // a blindfold at the eyes
  else if (prop === "glasses") add(new BoxGeometry(r * 1.7, 0.045, 0.02).translate(hx, hy + 0.02, hz + r * 0.98));
  else if (prop === "lens") {
    add(new BoxGeometry(0.13, 0.095, 0.018).rotateZ(0.12).translate(hx - r * 0.42, hy + 0.03, hz + r * 1.02)); // over the near eye
    add(new BoxGeometry(0.03, 0.03, r * 1.1).translate(hx - r * 1.0, hy + 0.03, hz + r * 0.45)); // back to the ear
  } else if (prop === "mask") {
    add(new IcosahedronGeometry(r * 1.1, 1).scale(0.96, 1.14, 1.02).translate(hx, hy, hz + 0.01));
    add(new ConeGeometry(0.05, 0.22, 4).translate(hx, hy + r * 1.25 + 0.08, hz)); // the crest
  } else if (prop === "cane") add(new CylinderGeometry(0.028 * b.w, 0.028 * b.w, 1.04 * b.h, 6).translate(0.05 * b.w, 0.5 * b.h, 0.34));
  else if (prop === "bowtie") {
    for (const s of [-1, 1]) add(new ConeGeometry(0.05, 0.11, 4).rotateZ((s * Math.PI) / 2).translate(s * 0.055 * b.w, 1.6 * b.h, 0.16));
  } else if (prop === "dots7") {
    // seven scars on the chest, in the dipper's shape
    for (const [x, y] of [[-0.14, 1.5], [-0.05, 1.46], [0.04, 1.42], [0.12, 1.36], [0.1, 1.24], [0.2, 1.2], [0.22, 1.32]]) add(new CylinderGeometry(0.03, 0.03, 0.01, 8).rotateX(Math.PI / 2).translate(x * b.w, y * b.h, 0.22 * b.w));
  } else if (prop === "cap") {
    add(new CylinderGeometry(r * 1.02, r * 1.08, r * 0.55, 10).translate(hx, hy + r * 0.7, hz));
    add(new CylinderGeometry(r * 0.9, r * 0.9, 0.02, 10, 1).scale(1, 1, 0.8).translate(hx, hy + r * 0.48, hz + r * 0.75)); // the brim
  } else if (prop === "eyes") {
    for (const s of [-1, 1]) add(new IcosahedronGeometry(0.026, 0).scale(1.3, 0.8, 0.6).translate(hx + s * r * 0.36, hy + 0.03, hz + r * 0.95));
  } else if (prop === "earring") {
    for (const s of [-1, 1]) add(new IcosahedronGeometry(0.035, 0).translate(hx + s * r * 1.02, hy - r * 0.55, hz));
  }
  if (prop === "staff") {
    // a staff in the near hand with an orb on top, and the ringed halo at the neck (part of the silhouette)
    add(new CylinderGeometry(0.026 * b.w, 0.026 * b.w, 2.15 * b.h, 6).translate(-0.05 * b.w, 1.07 * b.h, 0.34));
    add(new IcosahedronGeometry(0.1 * b.w, 1).translate(-0.05 * b.w, 2.22 * b.h, 0.34));
    add(new TorusGeometry(0.3 * b.w, 0.022, 5, 20).rotateX(Math.PI / 2 - 0.35).translate(0, 1.64 * b.h, 0.02));
  } else if (prop === "pudding") {
    // a pudding cup held out in the near hand: a little frustum with a dome of custard
    add(new CylinderGeometry(0.085, 0.06, 0.11, 8).translate(-0.66 * b.w, 1.34 * b.h + 0.02, 0.62));
    add(new IcosahedronGeometry(0.075, 1).scale(1, 0.7, 1).translate(-0.66 * b.w, 1.34 * b.h + 0.1, 0.62));
  }
  if (!parts.length) return null;
  const g = parts.length === 1 ? parts[0] : mergeGeometries(parts.map(prep));
  return g;
}

// The figure, in its own space (feet at the origin, facing +z), cached per card.
const FIGURES = new WeakMap();
function figureFor(sp) {
  let f = FIGURES.get(sp);
  if (f) return f;
  const b = BUILDS[sp.build] ?? BUILDS.tall;
  const P = (p) => [p[0] * b.w, p[1] * b.h, p[2]];
  const head = [0, 1.9 * b.h, 0.02];
  const r = 0.155 * b.head;
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(limb(P([s * 0.11, 0, 0.03]), P([s * 0.13, 1.0, 0]), 0.085 * b.w, 0.115 * b.w)); // trousers, not sticks
    for (const [a, z, r1, r2, showHand] of (ARMS[sp.pose] ?? ARMS.side)(s)) {
      parts.push(limb(P(a), P(z), r1 * b.w, r2 * b.w));
      if (showHand) parts.push(hand(P(z), 0.075 * b.w));
    }
  }
  parts.push(limb(P([0, 0.88, 0]), P([0, 1.6, 0]), 0.2 * b.w, 0.25 * b.w, 1.3, 0.8)); // the jacket, shoulders wide
  parts.push(limb(P([0, 0.78, 0]), P([0, 1.0, 0]), 0.26 * b.w, 0.21 * b.w, 1.15, 0.85)); // its hem
  parts.push(limb(P([-0.31, 1.6, 0]), P([0.31, 1.6, 0]), 0.08 * b.w, 0.08 * b.w));
  parts.push(limb(P([0, 1.58, 0]), P([0, 1.8, 0.01]), 0.07 * b.w, 0.06 * b.w));
  parts.push(prep(new IcosahedronGeometry(r, 1).scale(0.94, 1.12, 1).translate(...head)));
  parts.push(...hairParts(sp.hair, head, b.head));
  const ink = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  // the rim: an inverted hull, welded so its smooth normals push out evenly
  const outline = mergeVertices(ink.clone(), 1e-3);
  outline.computeVertexNormals();
  f = { ink, outline, prop: propGeometry(sp.prop, head, r, b) };
  FIGURES.set(sp, f);
  return f;
}

// Shared by every speaker: three materials, tinted per scene.
let MATS = null;
const mats = () => (MATS ??= { ink: inkMaterial(), outline: outlineMaterial(), prop: new MeshBasicMaterial({ color: "#fbfaf7", side: DoubleSide, toneMapped: false, fog: false }) });

// The entrance and exit, on twos: squash, stretch, settle.
const ENTER = [
  [1.3, 0.5],
  [0.86, 1.14],
  [1.05, 0.96],
];

// The move's props ({ card, tl, mode }). `lean` (rad) tips the figure in
// toward the pup on line B, the way Aether-Lang's leans into the koan.
export default function Speaker(props) {
  return speakersOf(props.card).map((sp, i) => <Figure key={i} {...props} sp={sp} index={i} />);
}

function Figure({ card, tl, mode, lean = 0.035, sp, index }) {
  const fig = useMemo(() => figureFor(sp), [sp]);
  const m = mats();
  const root = useRef();
  useEffect(() => {
    const p = paletteFor(card);
    m.ink.uniforms.uInk.value.set(p.ink);
    m.ink.uniforms.uRim.value.set(p.rim);
    m.outline.uniforms.uRim.value.set(p.rim);
  }, [card, m]);

  useFrame((state) => {
    const f = root.current;
    if (!f) return;
    const arrival = live.arrival;
    if (!arrival.id) {
      f.visible = false;
      return;
    }
    const t = state.clock.elapsedTime - arrival.start;
    const s = live.seal;
    const at = figureAt(card, index);
    const scale = figureScale(card, index);
    f.position.set(s.x + at[0], at[1], s.z + at[2]);
    m.ink.uniforms.uCell.value = (card.stage?.halftone ?? 6) * 0.6 * state.gl.getPixelRatio(); // a finer screen on the figure
    const inF = Math.floor((t - tl.enter) * 12);
    const outF = Math.floor((t - tl.collapse[0]) * 12);
    const frame = mode === "still" ? 9 : outF >= 0 ? 2 - outF : inF;
    f.visible = frame >= 0;
    if (f.visible) {
      const [sx, sy] = ENTER[frame] ?? [1, 1];
      const tt = onTwos(t);
      f.scale.set(scale * sx, scale * sy, scale * sx);
      f.rotation.set(0, -0.42, mode === "full" ? 0.015 * Math.sin(tt * 2.2) + (t > tl.lineB ? lean : 0) : 0);
    }
  });

  if (!fig) return null;
  return (
    <group ref={root} visible={false}>
      <mesh geometry={fig.outline} material={m.outline} />
      <mesh geometry={fig.ink} material={m.ink} />
      {fig.prop ? <mesh geometry={fig.prop} material={m.prop} /> : null}
    </group>
  );
}
