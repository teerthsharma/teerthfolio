// THE SMALL THINGS THAT MOVE: the two glowing answer cards (and the one they
// become), the civilians on the rooftops (cowering, then cheering), the flags
// that whip in the shockwave, and the rubble that settles and the debris that
// arcs. All instanced or pooled; the cards are two meshes. Every one is in the
// press's inks; the shard-less pieces fall away on the page's tear.

import { DodecahedronGeometry, DoubleSide, InstancedMesh, Mesh, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import { hash } from "../p-caustic/parts";
import { PAL, PRINT, SH, u } from "./print";
import { build, instHullMaterial, instMaterial, limb, tag } from "./mesh";

const O = new Object3D();

// ---- the answer cards: a coloured card with an ink border, lines of "output" that differ run to run ----
const CARD_FRAG = /* glsl */ `
  uniform float uWhich, uShow;
  varying vec2 vUv;
  ${PRINT}
  float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
  void main() {
    vec2 c = vec2(vUv.x * 1.5, vUv.y);
    float bd = min(min(c.x, 1.5 - c.x), min(c.y, 1.0 - c.y));
    vec4 t = uWhich < 0.5 ? vec4(0.0, 0.88, 0.1, 0.0) : (uWhich < 1.5 ? vec4(0.92, 0.12, 0.0, 0.0) : vec4(0.0, 0.2, 1.0, 0.0));
    float ink = 1.0 - smoothstep(0.045, 0.06, bd);
    vec3 col = inkPrint(t);
    float flick = floor(uTime * 3.0);
    for (int i = 0; i < 5; i++) {
      float y = 0.2 + 0.125 * float(i);
      float len = uWhich > 1.5 ? 0.9 : 0.35 + 0.8 * h21(vec2(float(i) * 3.1 + uWhich * 7.3, flick * (0.3 + 0.5 * uWhich)));
      float inRow = step(abs(c.y - y), 0.032) * step(0.18, c.x) * step(c.x, 0.18 + len * (uWhich > 1.5 ? 0.6 : 1.0));
      col = mix(col, PAPER, inRow);
    }
    // the header strip
    col = mix(col, INK_K, step(0.8, c.y));
    col = mix(col, PAPER, step(abs(c.y - 0.9), 0.012) * step(0.22, c.x) * step(c.x, 0.22 + 0.55));
    if (uWhich > 1.5) {
      // one answer: a check mark in ink on the gold
      float d = min(seg(c, vec2(0.38, 0.5), vec2(0.58, 0.32)), seg(c, vec2(0.58, 0.32), vec2(1.05, 0.7)));
      col = mix(col, INK_K, 1.0 - smoothstep(0.035, 0.05, d));
    }
    col = mix(col, INK_K, ink);
    gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
  }`;
export function cardFx() {
  const g = new PlaneGeometry(1.5, 1.0);
  const mk = (which) =>
    new ShaderMaterial({ uniforms: { ...SH, uWhich: u(which), uShow: u(1) }, side: DoubleSide, vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: CARD_FRAG });
  const halo = new PlaneGeometry(1, 1);
  const hm = (ink) =>
    new ShaderMaterial({
      uniforms: { ...SH, uInk: u(ink) },
      transparent: true,
      depthWrite: false,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform vec4 uInk;
        varying vec2 vUv;
        ${PRINT}
        void main() {
          float r = length(vUv * 2.0 - 1.0);
          float tone = pow(max(1.0 - r, 0.0), 1.2);
          float cv;
          vec3 col = inkPrint(uInk * tone, cv);
          float a = cv * step(0.02, tone);
          if (a < 0.02) discard;
          gl_FragColor = vec4(pow(col, vec3(2.2)), a);
        }`,
    });
  const mats = [mk(0), mk(1), mk(2)];
  const hmats = [hm([0, 1, 0.1, 0]), hm([1, 0.2, 0, 0]), hm([0, 0.35, 1, 0])];
  const make = (i) => {
    const grp = new Object3D();
    const card = new Mesh(g, mats[i]);
    const h = new Mesh(halo, hmats[i]);
    h.scale.setScalar(2.4);
    h.position.z = -0.05;
    h.renderOrder = 4;
    card.renderOrder = 5;
    grp.add(h, card);
    grp.visible = false;
    return grp;
  };
  return { A: make(0), B: make(1), M: make(2), geoms: [g, halo], mats: [...mats, ...hmats] };
}

// ---- the crowd: little ink figures on the rooftops, a gold band each ----
function figure(armsUp) {
  const C = PAL.civ;
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(tag(limb([s * 0.12, 0, 0], [s * 0.13, 0.82, 0], 0.09, 0.08, 5), C));
    parts.push(tag(limb(armsUp ? [s * 0.24, 1.38, 0] : [s * 0.24, 1.4, 0], armsUp ? [s * 0.5, 2.05, 0.05] : [s * 0.3, 0.78, 0.04], 0.065, 0.055, 5), C));
  }
  parts.push(tag(limb([0, 0.78, 0], [0, 1.5, 0], 0.2, 0.24, 6), C));
  parts.push(tag(new SphereGeometry(0.15, 7, 5).translate(0, 1.7, 0), C));
  parts.push(tag(limb([-0.19, 1.2, 0.02], [0.19, 1.2, 0.02], 0.06, 0.06, 4), PAL.gold));
  return build(parts);
}
export function crowdFx(roofs, groundSide) {
  const spots = [];
  // both sides of the avenue, the nearest roofs first: they stand against the sky inside the wide frame
  const near = [-1, 1].flatMap((sd) => roofs.filter((r) => r.side === sd).sort((a, b) => b.z - a.z).slice(0, 5));
  near.forEach((r, ri) => {
    for (let j = 0; j < 4; j++) spots.push({ x: r.x + r.side * (0.2 + 1.4 * hash(ri * 9 + j, 1)), y: r.y, z: r.z + (j - 1.5) * r.w * 0.2, ph: hash(ri * 9 + j, 2) * 6, s: 1.5 + 0.3 * hash(ri * 9 + j, 3), up: hash(ri * 9 + j, 4) * 0.5 });
  });
  const gA = figure(false);
  const gB = figure(true);
  const mat = instMaterial();
  const A = new InstancedMesh(gA, mat, spots.length);
  const B = new InstancedMesh(gB, mat, spots.length);
  A.frustumCulled = B.frustumCulled = false;
  void groundSide;
  return {
    A,
    B,
    geoms: [gA, gB],
    mats: [mat],
    tick({ tt, hit, brk }) {
      const cheer = tt > hit + 0.25;
      spots.forEach((p, i) => {
        const T = Math.floor(tt * 12) / 12;
        const wave = cheer ? Math.abs(Math.sin(T * 9 + p.ph)) * 0.38 : 0.05 * Math.sin(T * 3 + p.ph);
        const k = cheer ? Math.max(0, T - hit - 0.25 - p.up) : 0;
        const live = cheer && k > 0 ? 1 : 0;
        let y = p.y + wave * (live || !cheer ? 1 : 0);
        const fall = brk > 0 ? 5.5 * brk * brk * (0.5 + p.up) : 0;
        y -= fall;
        const sc = p.s * (brk > 1.2 ? 0.0001 : 1);
        O.rotation.set(0, 0, cheer ? 0.07 * Math.sin(T * 8 + p.ph) : 0);
        O.position.set(p.x, y, p.z);
        O.scale.setScalar(sc);
        O.updateMatrix();
        (live ? B : A).setMatrixAt(i, O.matrix);
        O.scale.setScalar(0.0001);
        O.updateMatrix();
        (live ? A : B).setMatrixAt(i, O.matrix);
      });
      A.instanceMatrix.needsUpdate = B.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---- the flags: cloth that whips in the shockwave ----
export function flagsFx(flags) {
  const n = Math.max(1, flags.length);
  const g = new PlaneGeometry(1, 1, 8, 3);
  const m = new ShaderMaterial({
    uniforms: { ...SH, uWind: u(0.3) },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uWind, uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += 0.5;
        float ph = instanceMatrix[3].x * 1.7;
        float x0 = p.x;
        p.z += sin(uTime * 7.0 + x0 * 5.0 + ph) * 0.2 * x0 * (0.5 + uWind * 1.6);
        p.y += sin(uTime * 5.0 + x0 * 3.0 + ph) * 0.07 * x0 * (0.5 + uWind);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${PRINT}
      void main() {
        float s = vUv.y;
        vec4 t = s > 0.67 ? uPal[14] : (s > 0.34 ? uPal[16] : uPal[15]);
        t.w += step(0.5, fract(vUv.x * 5.0 + uTime * 0.7)) * 0.18 * (1.0 - t.w);
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        vec3 col = mix(inkPrint(t), INK_K, 1.0 - smoothstep(0.0, 0.04, edge));
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return {
    obj: mesh,
    geoms: [g],
    mats: [m],
    tick({ brk, wind }) {
      m.uniforms.uWind.value = wind;
      flags.forEach((f, i) => {
        O.position.set(f.x, f.y - (brk > 0 ? 5.5 * brk * brk : 0), f.z);
        O.rotation.set(0, 0, 0);
        O.scale.set(2.1 * (f.side > 0 ? 1 : -1), 1.25, 1);
        if (brk > 1.2) O.scale.setScalar(0.0001);
        O.updateMatrix();
        mesh.setMatrixAt(i, O.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---- rubble that settles, debris that arcs ----
const RUBBLE = 110;
const DEBRIS = 120;
export function rocksFx(groundY, crater, HW) {
  const rockG = build([tag(new DodecahedronGeometry(1, 0).scale(1, 0.7, 1), PAL.rubble)]);
  const rm = instMaterial();
  const hm = instHullMaterial();
  const mk = (n) => {
    const a = new InstancedMesh(rockG, rm, n);
    const h = new InstancedMesh(rockG, hm, n);
    h.instanceMatrix = a.instanceMatrix;
    a.frustumCulled = h.frustumCulled = false;
    return [a, h];
  };
  const [rubble, rubbleH] = mk(RUBBLE);
  const [debris, debrisH] = mk(DEBRIS);
  const R = Array.from({ length: RUBBLE }, (_, i) => {
    const ring = i < 26;
    const a = hash(i, 1) * 6.2832;
    const x = ring ? crater[0] + Math.cos(a) * crater[2] * (1.28 + 0.2 * hash(i, 2)) : (hash(i, 3) - 0.5) * 2 * (HW + 5);
    const z = ring ? crater[1] + Math.sin(a) * crater[2] * (1.28 + 0.2 * hash(i, 2)) : -1 - 46 * hash(i, 4) ** 1.3;
    const s = (0.18 + 0.7 * hash(i, 5) ** 2) * (ring ? 1.4 : 1);
    return { x, z, s, y: groundY(x, z) + s * 0.3, rx: hash(i, 6) * 3, ry: hash(i, 7) * 3, ph: hash(i, 8) * 6 };
  });
  // three sources of thrown stone: the nomu's rising, the punch, the crater
  const D = Array.from({ length: DEBRIS }, (_, i) => {
    const src = i < 30 ? 0 : i < 90 ? 1 : 2;
    const a = hash(i, 11) * 6.2832;
    const sp = src === 1 ? 6 + 9 * hash(i, 12) : 3 + 6 * hash(i, 12);
    const up = src === 2 ? 11 + 12 * hash(i, 13) : 5 + 9 * hash(i, 13);
    const o = src === 0 ? [2.4 + Math.cos(a) * 1.5, -9.5 + Math.sin(a) * 1.0] : src === 1 ? [Math.cos(a) * 0.8, Math.sin(a) * 0.6 - 0.6] : [crater[0] + Math.cos(a) * 0.8, crater[1] + Math.sin(a) * 0.8];
    return { src, o, v: [Math.cos(a) * sp, up, src === 1 ? -(1 + Math.abs(Math.sin(a)) * sp * 0.6) : Math.sin(a) * sp], s: 0.14 + 0.5 * hash(i, 14) ** 2 * (src === 1 ? 0.8 : 1), sp: 2 + 6 * hash(i, 15), r: hash(i, 16) };
  });
  return {
    rubble,
    rubbleH,
    debris,
    debrisH,
    geoms: [rockG],
    mats: [rm, hm],
    tick({ tt, hit, rise, brk }) {
      const T0 = [rise + 0.2, hit, hit + 0.05];
      const settleK = tt > hit ? 1 : 0;
      for (let i = 0; i < RUBBLE; i++) {
        const r = R[i];
        // the punch lifts the street and drops it: a hop that dies away
        const d = tt - hit - 0.02 * (r.ph % 1);
        const hop = settleK && d > 0 ? 0.45 * Math.exp(-d * 2.2) * Math.abs(Math.sin(d * 11 + r.ph)) * (1 - 0.5 * Math.min(1, Math.hypot(r.x, r.z) / 30)) : 0;
        const fall = brk > 0 ? 5.5 * brk * brk * (0.5 + hash(i, 9)) : 0;
        O.position.set(r.x, r.y + hop - fall, r.z);
        O.rotation.set(r.rx + hop, r.ry, 0);
        O.scale.setScalar(brk > 1.3 ? 0.0001 : r.s);
        O.updateMatrix();
        rubble.setMatrixAt(i, O.matrix);
      }
      rubble.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < DEBRIS; i++) {
        const p = D[i];
        const tau = tt - T0[p.src] - 0.12 * p.r;
        let sc = 0.0001;
        if (tau > 0) {
          let x = p.o[0] + p.v[0] * tau;
          let z = p.o[1] + p.v[2] * tau;
          let y = 0.4 + p.v[1] * tau - 9.8 * tau * tau * 0.5;
          // lands, skips once, settles
          const floor = groundY(x, z) + p.s * 0.3;
          if (y < floor) {
            const tl = (2 * p.v[1]) / 9.8;
            const tt2 = Math.max(0, tau - tl);
            y = floor + Math.max(0, 0.35 * Math.sin(Math.min(1, tt2 * 3) * Math.PI) * Math.exp(-tt2));
            x = p.o[0] + p.v[0] * Math.min(tau, tl + 0.4);
            z = p.o[1] + p.v[2] * Math.min(tau, tl + 0.4);
          }
          if (brk > 0) y -= 5.5 * brk * brk * (0.5 + p.r);
          O.position.set(x, y, z);
          O.rotation.set(tau * p.sp, tau * p.sp * 0.7, 0);
          sc = brk > 1.3 ? 0.0001 : p.s;
        } else O.position.set(0, -50, 0);
        O.scale.setScalar(sc);
        O.updateMatrix();
        debris.setMatrixAt(i, O.matrix);
      }
      debris.instanceMatrix.needsUpdate = true;
    },
  };
}

