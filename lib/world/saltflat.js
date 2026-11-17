// The salt flat (E12, Uyuni): a hexagonal crust on the open west, where the tangle trail now ends. Ground decals, no collider.
// BASE is the flat floor 0.04 m above heightAt; CRUST is the hexagon outline 0.06 m above it. Both are flat [x, y, z] triangles.
import { heightAt } from "./terrain.js";

export const SITE = { x: -74, z: 6, r: 11 };
export const COLORS = { base: "#f6f0ff", crust: "#c9a8ff" };
const SIDE = 1.6; // hexagon side, m
const HALF = 0.06; // half width of a crust line, m
const SPOKES = 24;
const BASE_LIFT = 0.04;
const LINE_LIFT = 0.06;

const at = (x, z, lift) => [x, heightAt(x, z) + lift, z];
const tri = (out, a, b, c) => out.push(...a, ...b, ...c);

function floor() {
  const out = [];
  const ring = (r) => Array.from({ length: SPOKES }, (_, j) => {
    const a = (2 * Math.PI * j) / SPOKES;
    return at(SITE.x + r * Math.cos(a), SITE.z + r * Math.sin(a), BASE_LIFT);
  });
  const centre = at(SITE.x, SITE.z, BASE_LIFT);
  let prev = ring(1);
  for (let j = 0; j < SPOKES; j++) tri(out, centre, prev[j], prev[(j + 1) % SPOKES]);
  for (let r = 2; r <= SITE.r; r++) {
    const next = ring(r);
    for (let j = 0; j < SPOKES; j++) {
      const k = (j + 1) % SPOKES;
      tri(out, prev[j], next[j], next[k]);
      tri(out, prev[j], next[k], prev[k]);
    }
    prev = next;
  }
  return out;
}

function hexEdges() {
  const seen = new Set();
  const edges = [];
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const dx = SIDE * Math.sqrt(3);
  const dz = SIDE * 1.5;
  for (let row = -8; row <= 8; row++) {
    for (let col = -8; col <= 8; col++) {
      const cx = SITE.x + col * dx + (Math.abs(row) % 2) * (dx / 2);
      const cz = SITE.z + row * dz;
      const v = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        return [cx + SIDE * Math.cos(a), cz + SIDE * Math.sin(a)];
      });
      for (let k = 0; k < 6; k++) {
        const p = v[k];
        const q = v[(k + 1) % 6];
        const reach = Math.max(Math.hypot(p[0] - SITE.x, p[1] - SITE.z), Math.hypot(q[0] - SITE.x, q[1] - SITE.z));
        const id = [key(p), key(q)].sort().join("|");
        if (reach > SITE.r - 0.2 || seen.has(id)) continue;
        seen.add(id);
        edges.push([p, q]);
      }
    }
  }
  return edges;
}

function crust() {
  const out = [];
  for (const [p, q] of hexEdges()) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const n = Math.max(1, Math.ceil(len));
    const nx = (-(q[1] - p[1]) / len) * HALF;
    const nz = ((q[0] - p[0]) / len) * HALF;
    const point = (k, s) => {
      const t = k / n;
      return at(p[0] + (q[0] - p[0]) * t + s * nx, p[1] + (q[1] - p[1]) * t + s * nz, LINE_LIFT);
    };
    for (let k = 0; k < n; k++) {
      tri(out, point(k, -1), point(k + 1, -1), point(k + 1, 1));
      tri(out, point(k, -1), point(k + 1, 1), point(k, 1));
    }
  }
  return out;
}

export const BASE = floor();
export const CRUST = crust();
export const GROUND_VERTS = [...BASE, ...CRUST].reduce((v, c, i) => {
  if (i % 3 === 0) v.push([c]);
  else v[v.length - 1].push(c);
  return v;
}, []);
