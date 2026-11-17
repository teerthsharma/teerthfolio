"use client";

// THE COVENANT OF COMMUNITY (boykopovar/AnyPS5 #12609): a meadow on the east shore (where it grows: lib/world/terrain.js
// meadowAt) and its one monument, a bronze fish leaping a granite wave on a plinth.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Matrix4, Object3D, Shape, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { detail } from "../../../lib/world/detail";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import { fbm, heightAt, meadowAt } from "../../../lib/world/terrain";
import { mat } from "../palette";

const PLACE = PLACE_BY_ID["pr-anyps5-12609"];
const MEADOW = PLACE.district;
const BRONZE = "#a8693a";
const BACK = "#6b3e22";
const BELLY = "#ddb07c";
const FIN = "#7c4826";
const GRANITE = "#9e928d"; // the spawn statue's plinth stone
const GRANITE_DARK = "#6a625c";

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = new Color(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};
const merged = (parts) => {
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
};
const shape = (pts) => new Shape(pts.map(([u, v]) => new Vector2(u, v)));
// Maps a part built in (u, v, w) onto the axes T, N and the monument's z, at p.
const onto = (T, N, p, z = 0) => new Matrix4().set(T[0], N[0], 0, p[0], T[1], N[1], 0, p[1], 0, 0, 1, z, 0, 0, 0, 1);

// The spine, tail to head, in the monument's plane (x east, y up; its side faces the camera): an arch over the wave.
const SPINE = [[-2.45, 2.85], [-1.5, 3.55], [-0.3, 3.85], [1.0, 3.55], [2.3, 2.65]];
const at = (t) => {
  const s = t * (SPINE.length - 1);
  const i = Math.min(SPINE.length - 2, Math.floor(s));
  const f = s - i;
  const [a, b, c, d] = [SPINE[Math.max(0, i - 1)], SPINE[i], SPINE[i + 1], SPINE[Math.min(SPINE.length - 1, i + 2)]];
  const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
  return [cr(a[0], b[0], c[0], d[0]), cr(a[1], b[1], c[1], d[1])];
};
const frame = (t) => {
  const [x0, y0] = at(Math.max(0, t - 0.01));
  const [x1, y1] = at(Math.min(1, t + 0.01));
  const l = Math.hypot(x1 - x0, y1 - y0);
  const T = [(x1 - x0) / l, (y1 - y0) / l];
  return { p: at(t), T, N: [-T[1], T[0]] }; // N: the back, away from the arch's centre
};
// The body's half-height (RH) and half-width (RW) along it: a slim peduncle, the girth forward, a blunt head.
const girth = (t) => (t < 0.08 ? 0.16 : t < 0.62 ? 0.16 + 0.84 * Math.sin((((t - 0.08) / 0.54) * Math.PI) / 2) : 0.25 + 0.75 * Math.cos((((t - 0.62) / 0.38) * Math.PI) / 2) ** 0.8);
const RH = 0.82;
const RW = 0.5;

// Stations along the spine; the four packed near 0.8 draw the gill line as a thin dark ring.
const STATIONS = [...Array.from({ length: 27 }, (_, m) => m / 26), 0.785, 0.792, 0.815, 0.822].sort((a, b) => a - b);
const GILL = (t) => t > 0.79 && t < 0.818;

function body() {
  const M = STATIONS.length - 1;
  const R = 10;
  const pos = [];
  const col = [];
  const idx = [];
  const tone = [new Color(BELLY), new Color(BRONZE), new Color(BACK)];
  const gill = new Color(FIN).multiplyScalar(0.7);
  for (const t of STATIONS) {
    const { p, N } = frame(t);
    const k = t === 1 ? 0 : girth(t);
    for (let r = 0; r < R; r++) {
      const a = (r / R) * Math.PI * 2;
      const n = Math.cos(a) * RH * k * (Math.cos(a) < 0 ? 0.9 : 1);
      pos.push(p[0] + N[0] * n, p[1] + N[1] * n, Math.sin(a) * RW * k);
      col.push(...(GILL(t) ? gill : tone[Math.cos(a) < -0.5 ? 0 : Math.cos(a) > 0.5 ? 2 : 1]).toArray());
    }
  }
  for (let m = 0; m < M; m++)
    for (let r = 0; r < R; r++) {
      const a = m * R + r;
      const b = m * R + ((r + 1) % R);
      idx.push(a, b, a + R, b, b + R, a + R);
    }
  for (let r = 1; r < R - 1; r++) idx.push(0, r + 1, r); // the tail's end, under the fin
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g.toNonIndexed();
}

// A flat fin at t: a polygon in (u along the spine, v along the back), `depth` thick, swung out by `out` on `side`.
function fin(t, pts, { side = 0, out = 0, depth = 0.08, lift = 0 } = {}) {
  const { p, T, N } = frame(t);
  const g = new ExtrudeGeometry(shape(pts), { depth, bevelEnabled: false }).translate(0, 0, -depth / 2).rotateX(side * out);
  return g.applyMatrix4(onto(T, N, [p[0] + N[0] * lift, p[1] + N[1] * lift], side * RW * girth(t) * 0.8));
}

function fish() {
  const tail = frame(0);
  const caudal = new ExtrudeGeometry(shape([[0, 0.16], [1.05, 0.95], [0.66, 0.02], [1.05, -0.9], [0, -0.16]]), { depth: 0.09, bevelEnabled: false }).translate(0, 0, -0.045);
  const parts = [
    body(),
    painted(caudal.applyMatrix4(onto([-tail.T[0], -tail.T[1]], tail.N, tail.p)), FIN), // forked, out behind the peduncle
    painted(fin(0.55, [[0.62, 0], [0.22, 0.7], [-0.78, 0.18], [-0.66, 0]], { lift: RH * 0.82 }), FIN), // dorsal
    painted(fin(0.3, [[0.22, 0], [-0.2, -0.42], [-0.5, 0]], { lift: -RH * girth(0.3) * 0.82 }), FIN), // anal
  ];
  const { p, N } = frame(0.9);
  for (const side of [-1, 1]) {
    parts.push(painted(fin(0.78, [[0.1, 0], [-0.62, -0.34], [-0.28, 0.02]], { side, out: 0.75, depth: 0.06, lift: -RH * 0.35 }), FIN)); // pectoral
    const z = side * RW * girth(0.9) * 0.86;
    const ex = p[0] + N[0] * 0.2;
    const ey = p[1] + N[1] * 0.2;
    parts.push(painted(new CylinderGeometry(0.15, 0.15, 0.06, 8).rotateX(Math.PI / 2).translate(ex, ey, z), "#f3ede4"));
    parts.push(painted(new CylinderGeometry(0.08, 0.08, 0.04, 8).rotateX(Math.PI / 2).translate(ex, ey, z + side * 0.04), "#1c1824"));
  }
  return merged(parts);
}

// The plinth, its step, and the wave that rises to hold the fish's belly.
function stone() {
  const { p, N } = frame(0.5);
  const bx = p[0] - N[0] * RH * 0.86;
  const H = p[1] - N[1] * RH * 0.86 - 0.8;
  const curl = [[-1.45, 0], [1.35, 0], [1.0, 0.22], [0.62, 0.48], [0.5, 0.7], [0.72, 0.86], [1.05, 0.9], [0.82, 1.0], [0.3, 1.02], [-0.15, 0.94], [-0.42, 0.72], [-0.7, 0.42], [-1.1, 0.18]];
  const wave = new ExtrudeGeometry(shape(curl.map(([u, v]) => [bx + u, 0.8 + v * H])), { depth: 1.0, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 1 }).translate(0, 0, -0.5);
  const ring = (r0, r1, h, y, hex) => painted(new CylinderGeometry(r0, r1, h, 12, 1, false, Math.PI / 12).translate(0, y, 0), hex); // a flat face toward the dock
  const face = 2.77 * Math.cos(Math.PI / 12);
  return merged([
    ring(3.05, 3.1, 0.24, 0.12, GRANITE_DARK),
    ring(2.72, 2.82, 0.62, 0.55, GRANITE),
    ring(2.8, 2.72, 0.08, 0.86, GRANITE_DARK),
    painted(wave, GRANITE),
    painted(new BoxGeometry(0.96, 0.42, 0.05).rotateX(-0.16).translate(0, 0.55, face + 0.025), FIN), // the plaque, no words, leaning with the plinth
    painted(new BoxGeometry(0.84, 0.31, 0.05).rotateX(-0.16).translate(0, 0.55, face + 0.045), BELLY),
  ]);
}

// The grass: jittered flat facets lying on the snow wherever meadowAt holds, each light or deep green, so its rim is a
// broken facet edge and never a fade.
const rnd = (a, b) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
function turf() {
  const S = 0.55;
  const N = Math.ceil(((MEADOW.radius + 2) * 2) / S);
  const at = (i, j) => {
    const x = MEADOW.x + (i - N / 2 + (rnd(i, j) - 0.5) * 0.5) * S;
    const z = MEADOW.z + (j - N / 2 + (rnd(j + 7, i) - 0.5) * 0.5) * S;
    return [x, heightAt(x, z) + 0.03, z];
  };
  const [light, deep, c] = [new Color("#b7e07a"), new Color("#8fd05c"), new Color()];
  const pos = [];
  const col = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const [a, b, d, e] = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
      for (const [k, tri] of [[a, d, b], [b, d, e]].entries()) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
        const cz = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;
        if (meadowAt(cx, cz) < 0.5) continue;
        c.lerpColors(light, deep, Math.min(1, Math.max(0, 1.6 * (fbm(cx / 2.5 + 31, cz / 2.5) - 0.5) + 0.5 + (rnd(i * 2 + k, j) - 0.5) * 0.3)));
        for (const p of tri) pos.push(...p), col.push(c.r, c.g, c.b);
      }
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Tufts and the superbloom (candy petals on the grass) on the grass: seeded, thickest by the plinth and thinning
// outward to the patches, clear of the plinth and the dock. One instanced draw each; the petal count follows the tier.
const DOCK = { x: PLACE.x, z: PLACE.z + PLACE.radius + 1.6 };
function scatter(seed, tries, cap, keep) {
  const out = [];
  let s = seed;
  const rand = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < tries && out.length < cap; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (MEADOW.radius + 2);
    const x = MEADOW.x + Math.cos(a) * r;
    const z = MEADOW.z + Math.sin(a) * r;
    const k = 0.7 + 0.6 * rand();
    const turn = rand() * Math.PI;
    const pick = rand();
    if (meadowAt(x, z) < 0.6 || !keep(r, rand()) || Math.hypot(x - PLACE.x, z - PLACE.z) < PLACE.radius + 0.6 || Math.hypot(x - DOCK.x, z - DOCK.z) < 1.8) continue;
    out.push([x, heightAt(x, z), z, k, turn, pick]);
  }
  return out;
}
const near = (r) => 1 - Math.min(1, Math.max(0, r - PLACE.radius) / (MEADOW.radius + 2 - PLACE.radius));
const TUFT = mergeGeometries([-0.5, 0.4, 1.3].map((a, i) => new ConeGeometry(0.06, 0.34 - i * 0.04, 3).translate(0, 0.17, 0).rotateZ(0.28).rotateY(a * 2.1).translate(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05)));
const CUP = new ConeGeometry(0.11, 0.22, 5).rotateX(Math.PI).translate(0, 0.13, 0);
const BLADES = [new Color("#7d9c5a"), new Color("#5c7f45")];
const PETALS = ["#ffb627", "#ff9ec7", "#ffffff", "#5fd38d", "#ff6b7a"].map((h) => new Color(h));

export default function Covenant() {
  const fishGeo = useMemo(fish, []);
  const stoneGeo = useMemo(stone, []);
  const turfGeo = useMemo(turf, []);
  const tufts = useMemo(() => scatter(12609, 2400, 220, (r, u) => u < 0.08 + 0.92 * near(r) ** 1.6), []);
  const flowers = useMemo(() => scatter(9061, 4000, 220, (r, u) => u < 0.9 * near(r)), []);
  const tier = useUi((s) => s.tier);
  const grass = useRef(null);
  const cups = useRef(null);
  const bronze = mat("#ffffff", { vertexColors: true, metalness: 0.45, roughness: 0.4 });
  const granite = mat("#ffffff", { vertexColors: true, roughness: 0.88 });
  const plant = mat("#ffffff", { roughness: 0.9 });

  useLayoutEffect(() => {
    const d = new Object3D();
    const c = new Color();
    for (const [mesh, spots, tint] of [[grass.current, tufts, (p) => c.lerpColors(BLADES[0], BLADES[1], p)], [cups.current, flowers, (p) => PETALS[Math.floor(p * PETALS.length)]]]) {
      spots.forEach(([x, y, z, k, turn, pick], i) => {
        d.position.set(x, y, z);
        d.rotation.set(0, turn, 0);
        d.scale.setScalar(k);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
        mesh.setColorAt(i, tint(pick));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [tufts, flowers]);

  useEffect(() => {
    if (cups.current) cups.current.count = Math.min(flowers.length, detail(220, tier));
  }, [flowers, tier]);

  return (
    <>
      <group position={[PLACE.x, 0, PLACE.z]}>
        <mesh geometry={stoneGeo} material={granite} castShadow receiveShadow />
        <mesh geometry={fishGeo} material={bronze} castShadow />
      </group>
      <mesh geometry={turfGeo} material={mat("#ffffff", { vertexColors: true })} receiveShadow />
      <instancedMesh ref={grass} args={[TUFT, plant, tufts.length]} receiveShadow />
      <instancedMesh ref={cups} args={[CUP, plant, flowers.length]} receiveShadow />
    </>
  );
}
