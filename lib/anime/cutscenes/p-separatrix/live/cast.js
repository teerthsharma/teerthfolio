
import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { hash, limb, merge, paint, smooth } from "./geo.js";

const K = 4;
const P = (g, hex) => paint(g, hex, K);
const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1) => new SphereGeometry(r, 10, 7).scale(sx, sy, sz).translate(x, y, z);
const box = (w, h, d, x, y, z) => new BoxGeometry(w, h, d).translate(x, y, z);

export function diavolo() {
  const skin = "#3b2437";
  const dark = "#2c1d33";
  const b = [];
  for (const s of [-1, 1]) {
    b.push(P(limb([s * 0.11, 1.0, 0], [s * 0.13, 0.08, 0.04], 0.11, 0.07), dark));
    b.push(P(box(0.15, 0.1, 0.3, s * 0.13, 0.05, 0.12), "#241829"));
  }
  b.push(P(new CylinderGeometry(0.21, 0.17, 0.66, 10).translate(0, 1.33, 0), skin));
  b.push(P(box(0.64, 0.13, 0.27, 0, 1.64, 0), skin));
  b.push(P(limb([0, 1.64, 0], [0, 1.76, 0.02], 0.07, 0.065), skin));
  b.push(P(ball(0.145, 0, 1.84, 0.02, 1, 1.12, 1), skin));
  for (let i = -3; i <= 3; i++) {
    for (const sg of [-1, 1]) b.push(P(new BoxGeometry(0.02, 0.7, 0.02).rotateZ(sg * 0.62).translate(i * 0.07, 1.34, 0.205 - Math.abs(i) * 0.012), "#d79db3"));
  }
  b.push(P(new TorusGeometry(0.15, 0.015, 5, 14, Math.PI).rotateZ(Math.PI).translate(0, 1.62, 0.2), "#d79db3"));
  b.push(P(limb([-0.34, 1.62, 0], [-0.4, 1.22, 0.1], 0.065, 0.055), skin));
  b.push(P(limb([-0.4, 1.22, 0.1], [-0.32, 0.92, 0.2], 0.055, 0.045), skin));
  b.push(P(ball(0.06, -0.32, 0.88, 0.22), skin));
  const h = [];
  const spots = [];
  const N = 30;
  for (let k = 0; k < N; k++) {
    const a = ((k / (N - 1)) * 2 - 1) * 2.05;
    const rr = 0.16 + 0.02 * hash(k, 1);
    const x0 = Math.sin(a) * rr;
    const z0 = -Math.cos(a) * rr * 0.9;
    const len = 0.95 - 0.08 * Math.abs(Math.sin(a * 0.5)) + 0.12 * hash(k, 2);
    const flare = 0.1 + 0.16 * hash(k, 3);
    const top = 1.9;
    const mid = [x0 * 1.9 + Math.sin(a) * flare, top - len * 0.5, z0 * 1.4 - 0.04];
    const end = [x0 * 2.3 + Math.sin(a) * flare * 1.5, top - len, z0 * 1.2 - 0.06 + (Math.abs(a) > 1.3 ? 0.12 : 0)];
    h.push(P(limb([x0, top, z0], mid, 0.05, 0.065, 5), "#86405f"));
    h.push(P(limb(mid, end, 0.065, 0.025, 5), "#86405f"));
    if (k % 2 === 0) spots.push(P(new OctahedronGeometry(0.035, 0).scale(1, 1.2, 0.5).translate(mid[0] * 1.02, mid[1] + 0.12 * hash(k, 5), mid[2] - 0.03), "#f0b6c6"));
    if (k % 3 === 0) spots.push(P(new OctahedronGeometry(0.03, 0).scale(1, 1.2, 0.5).translate(end[0], end[1] + 0.25, end[2] - 0.03), "#f0b6c6"));
  }
  h.push(P(ball(0.17, 0, 1.9, -0.02, 1, 0.85, 1.05), "#86405f"));
  const arm = [P(limb([0, 0, 0], [0.06, -0.4, 0.08], 0.065, 0.055), skin), P(limb([0.06, -0.4, 0.08], [0.0, -0.66, 0.34], 0.055, 0.045), skin), P(ball(0.065, 0, -0.7, 0.38), skin)];
  return { body: merge(b), hair: merge([...h, ...spots]), arm: merge(arm), shoulder: [0.34, 1.62, 0], hand: [0.34, 0.92, 0.38], head: [0, 1.86, 0.02] };
}

export function kingCrimson() {
  const base = "#2d1b3e";
  const ridge = "#5f3470";
  const b = [];
  for (const s of [-1, 1]) {
    b.push(P(limb([s * 0.3, 1.4, 0], [s * 0.33, 0.14, 0.04], 0.26, 0.17), base));
    b.push(P(box(0.34, 0.16, 0.56, s * 0.33, 0.08, 0.16), base));
    b.push(P(ball(0.46, s * 0.92, 2.78, 0), base));
    b.push(P(limb([s * 1.0, 2.7, 0], [s * 1.2, 1.7, 0.12], 0.3, 0.24), base));
    b.push(P(limb([s * 1.2, 1.7, 0.12], [s * 1.12, 0.92, 0.42], 0.24, 0.2), base));
    b.push(P(ball(0.3, s * 1.12, 0.82, 0.46, 1, 0.9, 1), ridge));
  }
  b.push(P(new CylinderGeometry(0.86, 0.56, 1.6, 10).scale(1, 1, 0.74).translate(0, 2.12, 0), base));
  for (let k = 0; k < 5; k++) b.push(P(new BoxGeometry(1.0 - k * 0.1, 0.1, 0.18).translate(0, 1.4 + k * 0.33, 0.4 - k * 0.0), ridge));
  b.push(P(limb([0, 3.0, 0], [0, 3.2, 0.05], 0.3, 0.26), base));
  b.push(P(ball(0.4, 0, 3.4, 0.04, 1, 1.28, 1.05), base));
  for (let i = -2; i <= 2; i++) b.push(P(new BoxGeometry(0.06, 0.5 - Math.abs(i) * 0.06, 0.86).translate(i * 0.14, 3.92 - Math.abs(i) * 0.03, -0.02), ridge));
  b.push(P(ball(0.11, 0, 3.58, 0.38, 1, 1.55, 0.35), "#b98ccb"));
  return merge(b);
}

const UMBER = "#4c303c";
const UMBER_D = "#3a2430";
export function mista() {
  const b = [];
  for (const s of [-1, 1]) b.push(P(limb([s * 0.1, 0.95, 0], [s * 0.12, 0.05, 0.03], 0.1, 0.07), UMBER_D));
  b.push(P(new CylinderGeometry(0.2, 0.17, 0.62, 9).translate(0, 1.26, 0), UMBER));
  b.push(P(ball(0.14, 0, 1.72, 0.02), UMBER));
  b.push(P(limb([-0.24, 1.52, 0], [-0.3, 1.1, 0.05], 0.06, 0.05), UMBER));
  b.push(P(limb([0.24, 1.52, 0], [0.3, 1.2, 0.2], 0.06, 0.05), UMBER));
  b.push(P(limb([0.3, 1.2, 0.2], [0.26, 1.02, 0.42], 0.05, 0.045), UMBER));
  b.push(P(box(0.05, 0.05, 0.3, 0.26, 1.0, 0.56), "#2a1a24"));
  b.push(P(box(0.05, 0.13, 0.06, 0.26, 0.93, 0.42), "#2a1a24"));
  const hat = [];
  for (let k = 0; k < 4; k++) hat.push(P(new CylinderGeometry(0.17 - k * 0.012, 0.185 - k * 0.012, 0.075, 10).translate(0, 0.07 + k * 0.07, 0), k % 2 ? UMBER : "#5c3a48"));
  hat.push(P(ball(0.13, 0, 0.36, 0, 1, 0.4, 1), "#5c3a48"));
  const brim = [P(new CylinderGeometry(0.235, 0.235, 0.03, 12).translate(0, -0.015, 0), UMBER_D)];
  return { body: merge(b), hat: merge(hat), brim: merge(brim), head: [0, 1.82, 0.02] };
}
export function trish() {
  const b = [];
  b.push(P(new ConeGeometry(0.3, 1.0, 10).translate(0, 0.5, 0), UMBER));
  b.push(P(new CylinderGeometry(0.15, 0.2, 0.5, 9).translate(0, 1.2, 0), UMBER));
  b.push(P(ball(0.125, 0, 1.64, 0.02), UMBER));
  b.push(P(ball(0.17, 0, 1.64, -0.02, 1, 0.88, 1.02), "#33202c"));
  b.push(P(limb([-0.18, 1.42, 0], [-0.24, 1.0, 0.04], 0.05, 0.04), UMBER));
  b.push(P(limb([0.18, 1.42, 0], [0.26, 1.2, 0.18], 0.05, 0.04), UMBER));
  b.push(P(limb([0.26, 1.2, 0.18], [0.06, 1.55, 0.2], 0.04, 0.035), UMBER));
  b.push(P(ball(0.04, 0.05, 1.56, 0.21), UMBER));
  return merge(b);
}
export function turtle() {
  const shell = new IcosahedronGeometry(0.5, 1).scale(1, 0.55, 1.15).translate(0, 0.26, 0);
  const b = [P(shell, "#4a3a32"), P(ball(0.13, 0, 0.2, 0.62, 1, 0.9, 1.2), "#5a463a")];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.push(P(ball(0.11, sx * 0.34, 0.07, sz * 0.38, 1.1, 0.7, 1.3), "#5a463a"));
  b.push(P(new CylinderGeometry(0.03, 0.03, 0.18, 6).translate(0, 0.62, 0), "#3a2430"));
  const flat = [];
  flat.push(P(limb([0, 0.0, 0], [0, 0.55, 0], 0.09, 0.08), "#f4e3b0"));
  flat.push(P(ball(0.075, 0, 0.64, 0), "#f4e3b0"));
  flat.push(P(box(0.14, 0.06, 0.12, 0, 0.74, 0), "#f4e3b0"));
  return { turtle: merge(b), figure: merge(flat) };
}
export function key() {
  return merge([smooth(new TorusGeometry(0.075, 0.025, 6, 12).translate(0, 0.17, 0)), smooth(new CylinderGeometry(0.022, 0.022, 0.26, 6).translate(0, -0.03, 0)), smooth(new BoxGeometry(0.09, 0.03, 0.03).translate(0.05, -0.12, 0)), smooth(new BoxGeometry(0.07, 0.03, 0.03).translate(0.04, -0.07, 0))]);
}

const cap = (r, len, x, y, z, rx = 0, rz = 0) => smooth(new CapsuleGeometry(r, len, 5, 14).rotateX(rx).rotateZ(rz).translate(x, y, z));
const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => smooth(new SphereGeometry(r, 18, 12).scale(sx, sy, sz).translate(x, y, z));
export function requiem() {
  const b = [];
  for (const s of [-1, 1]) {
    b.push(cap(0.17, 1.15, s * 0.22, 0.78, 0, 0, s * 0.03));
    b.push(sph(0.2, s * 0.22, 0.08, 0.1, 1, 0.6, 1.5));
  }
  b.push(sph(0.32, 0, 1.55, 0, 1.15, 0.7, 0.85));
  b.push(cap(0.23, 0.9, 0, 2.2, 0, 0, 0));
  b.push(sph(0.5, 0, 2.72, 0, 1.3, 0.62, 0.82));
  for (const s of [-1, 1]) b.push(sph(0.24, s * 0.68, 2.85, 0));
  b.push(cap(0.1, 0.16, 0, 3.06, 0));
  b.push(sph(0.26, 0, 3.4, 0.02, 1, 1.18, 1.05));
  b.push(sph(0.1, 0, 3.52, 0.25, 0.8, 1.5, 0.5));
  for (const s of [-1, 1]) b.push(smooth(new ConeGeometry(0.06, 0.34, 5).rotateZ(-s * 1.15).translate(s * 0.19, 3.58, 0.23)));
  b.push(smooth(new ConeGeometry(0.05, 0.22, 5).translate(0, 3.76, 0.2)));
  return merge(b);
}
export function requiemArm(s) {
  return merge([cap(0.12, 0.62, s * 0.04, -0.46, 0.04, 0, s * 0.04), cap(0.1, 0.56, s * 0.07, -1.05, 0.14, 0.3, 0), sph(0.17, s * 0.07, -1.45, 0.3, 1, 0.95, 1.05)]);
}
export function requiemFist() {
  return merge([smooth(new CapsuleGeometry(0.1, 0.75, 4, 10).rotateX(Math.PI / 2).translate(0, 0, -0.3)), sph(0.18, 0, 0, 0.16, 1, 1, 1.1)]);
}
export function gem() {
  return new OctahedronGeometry(0.14, 0).scale(0.9, 1.3, 0.7);
}

export function arrow() {
  const b = [smooth(new CylinderGeometry(0.022, 0.022, 1.4, 8).rotateX(Math.PI / 2).translate(0, 0, -0.1))];
  b.push(sph(0.1, 0, 0, 0.72, 0.9, 0.55, 1.5));
  b.push(smooth(new ConeGeometry(0.05, 0.3, 6).rotateX(Math.PI / 2).translate(0, 0, 1.0)));
  for (const s of [-1, 1]) {
    b.push(smooth(new ConeGeometry(0.075, 0.42, 5).rotateX(Math.PI / 2).rotateY(s * 0.55).translate(s * 0.17, 0, 0.62)));
    b.push(smooth(new BoxGeometry(0.02, 0.2, 0.2).rotateY(s * 0.4).translate(s * 0.05, 0.0, -0.78)));
    b.push(smooth(new BoxGeometry(0.2, 0.02, 0.2).rotateY(s * 0.4).translate(0, s * 0.05, -0.78)));
  }
  return merge(b);
}
