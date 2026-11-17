"use client";

// THE GRAVEYARD (lib/world/bergs.js): tabular bergs in the open sea past the rims, four grounded on the west shoal and two in
// transit. One vertex-coloured mesh for the bergs, their keels and foam rings; the bergy bits are one instanced mesh.

import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, CircleGeometry, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BERGS, BITS, BITS_BASE, PINNACLE } from "../../../lib/world/bergs";
import { useUi } from "../../../lib/world/store";
import { SEA_Y } from "../../../lib/world/terrain";
import { C, mat } from "../palette";

const TIER_SCALE = [0.4, 0.6, 1, 1, 1.25];
const tierCount = (base, tier) => Math.max(1, Math.round(base * (TIER_SCALE[tier] ?? 1)));

const DRAFT = 1.5;
const KEEL = 1.3;
const FOAM = 0.4;
const CREST = 0.6; // the gable crown stands this far above the eaves: two facets tilted about 7 to 14 degrees
const SIDES = 16;
const RIDGE = SIDES / 2;
const KS = Array.from({ length: SIDES }, (_, k) => k);
const UNIT = KS.map((k) => {
  const t = (2 * Math.PI * k) / SIDES;
  const sq = (c) => Math.sign(c) * Math.abs(c) ** (2 / 3); // squircle plan: a rounded rectangle, not a box
  return [sq(Math.cos(t)), sq(Math.sin(t))];
});

const SNOW = new Color(C.snow);
const ICE = new Color(C.ice);
const DEEP = new Color(C.deepIce);
const MID = ICE.clone().lerp(DEEP, 0.5);
const WHITE = new Color(C.foam);
const WATERLINE = "#1ec8f0"; // the Ice Crown's radiation, the glow round the bergs' keels
const WALL = [ICE, MID, DEEP, DEEP, DEEP]; // eave, upper wall, waterline notch, skirt, draft
const RING = [[1, 0.7], [0.9, 0.25], [1.07, -0.2], [1, -DRAFT]]; // [scale, height above sea] of the wall rings under the eave
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function paint(geo, tone) {
  const g = (geo.index ? geo.toNonIndexed() : geo).deleteAttribute("uv").deleteAttribute("normal");
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    tone(c, pos.getY(i));
    c.toArray(col, i * 3);
  }
  return g.setAttribute("color", new Float32BufferAttribute(col, 3));
}

function soup() {
  const pos = [];
  const col = [];
  const vert = (v) => {
    pos.push(v.p[0], v.p[1], v.p[2]);
    col.push(v.c.r, v.c.g, v.c.b);
  };
  const tri = (A, B, D, facing) => {
    const u = [B.p[0] - A.p[0], B.p[1] - A.p[1], B.p[2] - A.p[2]];
    const v = [D.p[0] - A.p[0], D.p[1] - A.p[1], D.p[2] - A.p[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const h = facing === "radial" ? [A.p[0] + B.p[0] + D.p[0], 0, A.p[2] + B.p[2] + D.p[2]] : [0, facing === "down" ? -1 : 1, 0];
    const flip = n[0] * h[0] + n[1] * h[1] + n[2] * h[2] < 0;
    vert(A);
    vert(flip ? D : B);
    vert(flip ? B : D);
  };
  const geometry = () => new BufferGeometry().setAttribute("position", new Float32BufferAttribute(pos, 3)).setAttribute("color", new Float32BufferAttribute(col, 3));
  return { tri, geometry };
}

function berg({ x, z, w, d, free, turn, tilt = 0 }, seed) {
  const a = w / 2;
  const e = d / 2;
  const jit = (k) => (k === 0 || k === RIDGE ? 1 : 1 + 0.06 * (hash(k, seed) - 0.5));
  const ring = (s, yOf, c) => KS.map((k) => ({ p: [UNIT[k][0] * jit(k) * a * s, yOf(k), UNIT[k][1] * jit(k) * e * s], c }));
  const rings = [ring(1, (k) => free + CREST * (1 - Math.abs(UNIT[k][1] * jit(k))), WALL[0]), ...RING.map(([s, y], i) => ring(s, () => y, WALL[i + 1]))];
  const hull = soup();
  const top = rings[0].map((v) => ({ p: v.p, c: SNOW }));
  for (const f of [KS.slice(0, RIDGE + 1), [...KS.slice(RIDGE), 0]]) {
    for (let j = 1; j < f.length - 1; j++) hull.tri(top[f[0]], top[f[j]], top[f[j + 1]], "up");
  }
  for (let r = 0; r + 1 < rings.length; r++) {
    for (const k of KS) {
      const k2 = (k + 1) % SIDES;
      const [p0, p1, p2, p3] = [rings[r][k], rings[r][k2], rings[r + 1][k2], rings[r + 1][k]];
      hull.tri(p0, p1, p2, "radial");
      hull.tri(p0, p2, p3, "radial");
    }
  }
  const low = rings[rings.length - 1];
  const hub = { p: [0, -DRAFT, 0], c: DEEP };
  for (const k of KS) hull.tri(hub, low[k], low[(k + 1) % SIDES], "down");
  const foam = soup();
  const edge = (k, s) => ({ p: [UNIT[k][0] * jit(k) * (a + s), 0.04, UNIT[k][1] * jit(k) * (e + s)], c: WHITE });
  for (const k of KS) {
    const k2 = (k + 1) % SIDES;
    foam.tri(edge(k, 0), edge(k2, 0), edge(k2, FOAM), "up");
    foam.tri(edge(k, 0), edge(k2, FOAM), edge(k, FOAM), "up");
  }
  const keel = new CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(KEEL * w / 2, 1, KEEL * d / 2).rotateY(turn).translate(x, SEA_Y + 0.02, z);
  return [hull.geometry().rotateZ(tilt).rotateY(turn).translate(x, SEA_Y, z), paint(keel, (c) => c.set(WATERLINE)), foam.geometry().rotateY(turn).translate(x, SEA_Y, z)];
}

function spire() {
  const base = SEA_Y - 2;
  const h = PINNACLE.top + 2;
  const top = base + h;
  const g = new CylinderGeometry(0.9, PINNACLE.r, h, 6, 1).translate(PINNACLE.x, base + h / 2, PINNACLE.z);
  return paint(g, (c, y) => (y > top - 0.01 ? c.copy(SNOW) : c.copy(DEEP).lerp(ICE, clamp01((y - base) / h))));
}

function ice() {
  const g = mergeGeometries([...BERGS.flatMap((b, i) => berg(b, i + 1)), spire()]);
  g.computeVertexNormals();
  return g;
}

const skin = mat("#ffffff", { vertexColors: true, roughness: 0.4 });
const bitGeo = new IcosahedronGeometry(1, 1);
const bitMat = mat(C.ice, { roughness: 0.4 });
const dummy = new Object3D();

export default function Bergs() {
  const tier = useUi((s) => s.tier);
  const geo = useMemo(ice, []);
  const bits = useRef(null);

  useEffect(() => {
    const m = bits.current;
    if (!m) return;
    BITS.forEach((b, i) => {
      dummy.position.set(b.x, SEA_Y + 0.05, b.z);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.scale.set(b.r, b.h, b.r * 0.8);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  useEffect(() => {
    if (bits.current) bits.current.count = tierCount(BITS_BASE, tier);
  }, [tier]);

  return (
    <group>
      <mesh geometry={geo} material={skin} castShadow receiveShadow />
      <instancedMesh ref={bits} args={[bitGeo, bitMat, BITS.length]} castShadow receiveShadow />
    </group>
  );
}
