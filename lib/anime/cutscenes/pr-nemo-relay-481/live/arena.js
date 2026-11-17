// The stone arena of the Tournament: tipped tiles, rubble, floating rocks, the ledge, foreground rocks and ink crack lines, breaking outside-in.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, PlaneGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { celMaterial, flatMaterial, hullMaterial } from "./cel.js";
import { clamp01, flat, hash, hide, inst, put, srgb } from "../util.js";
import { LENS } from "../lens.js";
import { PAL } from "../clock.js";

export const TOP = 0.03;
export const LEDGE = { x: 4.0, y: 1.0, z: -8.5, r: 4.6 };
const PITCH = 2.6;
const TILE = 2.5;
const TONE = PAL.tile;
const ROCK = PAL.rock;
const NEAR = 14; // rock chunks 0..13 are near (tier 0); 14 and up are far (tier 3)
const ROCKS = 40;
const LINES = 40;

const jitterAt = (x, y, z, k) => hash(Math.round(x * 29) * 7.13 + Math.round(y * 29) * 3.71 + Math.round(z * 29) * 1.37, k) - 0.5;
function jitter(g, amt, keepTop = -9) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    p.setXYZ(i, x + jitterAt(x, y, z, 1) * amt, y >= keepTop ? y : y + jitterAt(x, y, z, 2) * amt, z + jitterAt(x, y, z, 3) * amt);
  }
  return g;
}
function chunk() {
  const top = flat(new IcosahedronGeometry(1, 1).scale(1, 0.34, 1));
  const spire = flat(new ConeGeometry(0.88, 1.7, 7).rotateX(Math.PI).translate(0, -0.78, 0));
  return jitter(mergeGeometries([top, spire]), 0.28);
}
function slab() {
  const top = flat(new CylinderGeometry(1, 0.9, 0.34, 9).translate(0, 0.17, 0));
  const spire = flat(new ConeGeometry(0.9, 2.0, 9).rotateX(Math.PI).translate(0, -1.0, 0));
  return jitter(mergeGeometries([top, spire]), 0.16, 0.3);
}
const withHull = (geo, n, mat, hull) => {
  const fill = inst(geo, mat, n);
  const h = inst(geo, hull, n);
  h.instanceMatrix = fill.instanceMatrix;
  return { fill, hull: h };
};
const eyeOf = (k) => new Vector3(...LENS[k][0]);
const forwardOf = (k) => new Vector3(...LENS[k][1]).normalize();
const rightOf = (f) => new Vector3().crossVectors(f, new Vector3(0, 1, 0)).normalize();

export function buildArena(T) {
  const stone = celMaterial();
  const hullR = hullMaterial({ radial: true });
  const col = new Color();
  const setCol = (m, i, hex, k = 1) => {
    const [r, g, b] = srgb(hex);
    m.setColorAt(i, col.setRGB(r * k, g * k, b * k));
  };

  const tiles = [];
  for (let i = -12; i <= 12; i++) {
    for (let j = -14; j <= 6; j++) {
      const x = i * PITCH;
      const z = j * PITCH;
      const r = Math.hypot(x, z);
      const e = Math.max(Math.abs(x) / 32, Math.abs(z + 8) / 29) + 0.2 * (hash(i * 31 + j, 5) - 0.5);
      if (e > 1) continue;
      if (r > 7 && hash(i * 17 + j, 6) < 0.07) continue;
      const rim = Math.max(0, e - 0.78) / 0.22;
      const tipped = r > 9 && hash(i * 13 + j, 7) < 0.12 + 0.5 * rim;
      tiles.push({
        x,
        z,
        r,
        top: TOP - (tipped ? 0.15 + 0.9 * hash(i + j * 9, 8) * (0.4 + rim) : 0) + (r > 6 ? 0.05 * (hash(i * 5 + j, 9) - 0.5) : 0),
        th: 1.1 + 2.8 * hash(i * 3 + j, 10) + 1.8 * rim,
        rx: tipped ? (hash(i + j, 11) - 0.5) * 0.5 : 0,
        rz: tipped ? (hash(i * 2 + j, 12) - 0.5) * 0.5 : 0,
        c: (i + j) & 1 ? TONE.a : TONE.b,
        delay: 0,
        h: hash(i * 19 + j * 3, 13),
      });
    }
  }
  const rmax = tiles.reduce((a, t) => Math.max(a, t.r), 1);
  tiles.forEach((t) => (t.delay = (1 - t.r / rmax) ** 0.85 * 1.15 + t.h * 0.2));
  const tileGeo = flat(new BoxGeometry(TILE, 1, TILE));
  const stage = withHull(tileGeo, tiles.length, stone, hullR);
  tiles.forEach((t, i) => setCol(stage.fill, i, t.r > 12 && t.h < 0.3 ? TONE.edge : t.c));
  const base = (t, i) => put(stage.fill, i, t.x, t.top - t.th / 2, t.z, 1, t.th, 1, t.rx, 0, t.rz);
  tiles.forEach(base);

  const RUB = 120;
  const rubG = jitter(flat(new IcosahedronGeometry(1, 0).scale(1, 0.8, 1)), 0.3);
  const rub = withHull(rubG, RUB, stone, hullR);
  const rubble = Array.from({ length: RUB }, (_, i) => {
    const a = hash(i, 1) * Math.PI * 2;
    const d = 5 + 24 * hash(i, 2) ** 1.5;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d * 0.9 - 4;
    const s = (0.14 + 0.55 * hash(i, 3) ** 2) * (d < 11 ? 1.25 : 1.6);
    setCol(rub.fill, i, ROCK[i % 3], 1.08);
    return { x, z, s, near: d < 10 ? 1 : 0, lift: 0.8 + 2.6 * hash(i, 4), h: hash(i, 5), spin: 1 + 3 * hash(i, 6), r: Math.hypot(x, z), delay: (1 - Math.min(1, Math.hypot(x, z) / rmax)) * 1.15 };
  });

  const rockG = chunk();
  const rkN = withHull(rockG, NEAR, stone, hullR);
  const rkF = withHull(rockG, ROCKS - NEAR, stone, hullR);
  rkF.fill.userData.tier = 3;
  rkF.hull.userData.tier = 3;
  const rocks = Array.from({ length: ROCKS }, (_, i) => {
    const far = i >= NEAR;
    const a = (far ? -0.25 + 1.5 * hash(i, 1) : hash(i, 1) * 6.28) * Math.PI;
    const d = far ? 55 + 70 * hash(i, 2) : 26 + 12 * hash(i, 2);
    let x = Math.sin(a) * d;
    const z = -Math.cos(a) * d - (far ? 10 : 6);
    const y = far ? -22 + 52 * hash(i, 3) : -4 + 12 * hash(i, 3);
    if (!far && Math.abs(x - LEDGE.x) < 12 && z < -4) x += x < LEDGE.x ? -14 : 14;
    const set = far ? rkF : rkN;
    const j = far ? i - NEAR : i;
    setCol(set.fill, j, ROCK[i % 4], 1.05);
    return { set, j, x, y, z, s: far ? 3.5 + 9 * hash(i, 4) : 1.6 + 3.4 * hash(i, 4), ph: hash(i, 5) * 6.28, sp: 0.2 + 0.4 * hash(i, 6), delay: 0.4 + 1.2 * hash(i, 7) };
  });

  const ledge = withHull(slab(), 1, stone, hullR);
  setCol(ledge.fill, 0, PAL.ledge);
  put(ledge.fill, 0, LEDGE.x, LEDGE.y - 0.34 * 0.9 * LEDGE.r, LEDGE.z, LEDGE.r, LEDGE.r * 0.9, LEDGE.r * 0.7, 0, 0.3, 0);

  // FOREGROUND ROCKS: two each side of the windows a, b, c and one big one for the bloom, from the live lens; they fall with the break
  const fgAt = [];
  for (const k of ["a", "b", "c"]) {
    const e = eyeOf(k), f = forwardOf(k), r = rightOf(f);
    fgAt.push([e.clone().addScaledVector(f, 5.5).addScaledVector(r, 3.8), 3.4 + 1.8 * hash(fgAt.length, 8)]);
    fgAt.push([e.clone().addScaledVector(f, 5.5).addScaledVector(r, -3.8), 3.4 + 1.8 * hash(fgAt.length, 9)]);
  }
  {
    const e = eyeOf("bloom"), f = forwardOf("bloom"), r = rightOf(f);
    fgAt.push([e.clone().addScaledVector(f, 6).addScaledVector(r, -3), 6.5]);
  }
  const fg = withHull(rockG, fgAt.length, stone, hullR);
  const fgRocks = fgAt.map(([p, s], i) => {
    setCol(fg.fill, i, ROCK[i % 4], 1.05);
    return { x: p.x, z: p.z, s, ph: hash(i, 10) * 6.28, tilt: 0.12 };
  });

  // INK CRACKS: 40 radial segments on the tile tops, grown by crackR (the hit), gone at the break
  const lineG = flat(new PlaneGeometry(0.07, 1).rotateX(-Math.PI / 2));
  const lineM = inst(lineG, flatMaterial(PAL.ink), LINES);
  const cracks = Array.from({ length: LINES }, (_, i) => {
    const a = hash(i, 21) * Math.PI * 2 + 0.3 * (hash(i, 22) - 0.5);
    const s = 1.2 + 2.5 * hash(i, 23);
    const L = 1.6 + 1.6 * hash(i, 24);
    return { a, L, dc: s + L / 2, cx: Math.cos(a) * (s + L / 2), cz: Math.sin(a) * (s + L / 2) };
  });

  const sets = [stage, rub, rkN, rkF, ledge, fg];
  let first = true;
  let prev = 0;
  return {
    groups: sets,
    stone,
    fg,
    lines: lineM,
    // tt is the (twos) clock, lift the awakening 0..1 (rubble rises), quake the pre-break shake, crackR the crack radius in m
    update(tt, lift, quake, crackR = 0) {
      const brk = tt - T.crack;
      const was = first;
      first = false;
      const moving = brk > -0.1 && brk < 5;
      const lifting = lift > 0 || prev > 0;
      prev = lift;
      if (was || quake > 0 || moving) for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        const d = brk - t.delay;
        if (d < 0) {
          const q = quake * (t.r > 3 ? 0.05 : 0.02) * (Math.floor(tt * 12 + t.h * 5) % 2 ? 1 : -1);
          put(stage.fill, i, t.x, t.top - t.th / 2 + q, t.z, 1, t.th, 1, t.rx, 0, t.rz);
        } else if (d > 3) hide(stage.fill, i);
        else {
          const k = 1 - clamp01((d - 1.6) / 1.2);
          put(stage.fill, i, t.x + (t.h - 0.5) * 2.2 * d, t.top - t.th / 2 - 0.5 * 15 * d * d, t.z + (t.x > 0 ? 1 : -1) * t.h * d, k, t.th * k, k, t.rx + d * (1 + 2 * t.h), d * 0.6, t.rz + d * (2 - t.h));
        }
      }
      stage.fill.instanceMatrix.needsUpdate = true;
      if (was || lifting || moving) for (let i = 0; i < RUB; i++) {
        const b = rubble[i];
        const d = brk - b.delay;
        const up = b.near * lift * b.lift * (1 + 0.08 * Math.sin(tt * 3 + i));
        const y = TOP + b.s * 0.3 + up - (d > 0 ? 0.5 * 14 * d * d : 0);
        if (y < -30) hide(rub.fill, i);
        else put(rub.fill, i, b.x, y, b.z, b.s * (1 + 0.15 * b.near), b.s, b.s, b.h * 3 + up * 0.4 * b.spin, b.h * 5 + up * 0.8, up * 0.3);
      }
      rub.fill.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < ROCKS; i++) {
        const r = rocks[i];
        const d = brk - r.delay;
        const y = r.y + 0.45 * Math.sin(tt * r.sp + r.ph) - (d > 0 ? 0.5 * 6 * d * d : 0);
        if (y < -120) hide(r.set.fill, r.j);
        else put(r.set.fill, r.j, r.x, y, r.z, r.s, r.s, r.s, 0.05 * Math.sin(tt * 0.5 + r.ph), tt * 0.06 * (r.ph > 3 ? 1 : -1) + r.ph, 0);
      }
      rkN.fill.instanceMatrix.needsUpdate = true;
      rkF.fill.instanceMatrix.needsUpdate = true;
      fgRocks.forEach((g, i) => {
        const d = brk - 0.2;
        const y = TOP - 0.4 - (d > 0 ? 0.5 * 14 * d * d : 0);
        if (y < -30) hide(fg.fill, i);
        else put(fg.fill, i, g.x, y, g.z, g.s, g.s, g.s, g.tilt, g.ph, 0);
      });
      fg.fill.instanceMatrix.needsUpdate = true;
      cracks.forEach((c, i) => {
        if (brk < 0 && c.dc < crackR) put(lineM, i, c.cx, TOP + 0.006, c.cz, 1, 1, c.L, 0, Math.PI / 2 - c.a, 0);
        else hide(lineM, i);
      });
      lineM.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const s of sets) {
        s.fill.dispose();
        s.hull.dispose();
      }
      lineM.dispose();
      lineG.dispose();
      stone.dispose();
      hullR.dispose();
    },
  };
}
