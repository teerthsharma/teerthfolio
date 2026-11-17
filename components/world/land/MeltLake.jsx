"use client";

// THE OASIS LAKE (east shore, where the meadow's melt drains): a frozen lake under a clear lid with bubble stacks, star
// cracks, an overflow channel, a rampart of shoved ice on its south-east shore and a seal in its breathing hole.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, BufferGeometry, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Object3D, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { detail } from "../../../lib/world/detail";
import { CHANNEL, CRACKS, HOLE, LAKE } from "../../../lib/world/meltlake";
import { WIND, regionWeights } from "../../../lib/world/regions";
import { TOP as TOP_TIER } from "../../../lib/world/quality";
import { live, useUi } from "../../../lib/world/store";
import { heightAt } from "../../../lib/world/terrain";
import { mulberry32 } from "../life/spawn";
import { C, mat } from "../palette";

const LAKE_ICE = "#ff9ec7"; // the pink lake: its ice under the white bubble stacks
const BUBBLES = 240;
const MAX = detail(BUBBLES, TOP_TIER);
const STACKS = Math.ceil(MAX / 8);
const RADII = [0.34, 0.27, 0.21, 0.16, 0.12, 0.09, 0.07, 0.05];
const RAMP = 26;
const PERIOD = 22;
const BASE = heightAt(HOLE.x, HOLE.z);
const AT = [HOLE.x, BASE - 0.9, HOLE.z];
const DISC = new CircleGeometry(1, 6).rotateX(-Math.PI / 2);

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = new Color(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};
const solid = (p, hex) => painted(new BufferGeometry().setAttribute("position", new Float32BufferAttribute(p, 3)), hex);
const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const strip = (rows) => {
  const p = [];
  for (let i = 0; i + 1 < rows.length; i++)
    for (let j = 0; j + 1 < rows[i].length; j++) {
      const a = rows[i][j], b = rows[i][j + 1], c = rows[i + 1][j], d = rows[i + 1][j + 1];
      p.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
  return p;
};
const ribbon = (line, offs, lift) => line.map(([x, z], i) => {
  const [x0, z0] = line[Math.max(0, i - 1)], [x1, z1] = line[Math.min(line.length - 1, i + 1)];
  const l = Math.hypot(x1 - x0, z1 - z0);
  const nx = -(z1 - z0) / l, nz = (x1 - x0) / l;
  return offs.map((o) => {
    const px = x + nx * o, pz = z + nz * o;
    return [px, heightAt(px, pz) + lift, pz];
  });
});
const arc = (cx, cz, r, lift, n = 16) => Array.from({ length: n + 1 }, (_, j) => {
  const a = (j / n) * 2 * Math.PI, x = cx + r * Math.cos(a), z = cz + r * Math.sin(a);
  return [x, heightAt(x, z) + lift, z];
});

function decalGeo() {
  const { x, z } = HOLE;
  return mergeGeometries([
    solid(strip(ribbon(CHANNEL, [-0.6, 0, 0.6], 0.04)), LAKE_ICE),
    ...CRACKS.map((ray) => solid(strip(ribbon(ray, [-0.05, 0.05], 0.06)), "#f5f9fd")),
    solid(strip([arc(x, z, 0, 0.04), arc(x, z, HOLE.r, 0.04)]), "#12384d"),
    solid(strip([arc(x, z, HOLE.r, 0.04), arc(x, z, 0.86, 0.1)]), LAKE_ICE),
  ]);
}

// Rim blocks on the south-east half, yawed along the wind's shove, 0.6 to 1.4x, 0.3 m jitter, 30 percent skipped: a broken line.
function rampGeo() {
  const A = LAKE.a, B = LAKE.b, c = Math.cos(LAKE.rot), s = Math.sin(LAKE.rot);
  const phi = Math.atan2(B * (c - s), A * (c + s));
  const shove = Math.atan2(WIND[1], WIND[0]);
  const rand = mulberry32(90011);
  const parts = [];
  for (let i = 0; i < RAMP; i++) {
    const t = phi - Math.PI / 2 + ((i + 0.5 + 0.3 * (rand() - 0.5)) / RAMP) * Math.PI;
    if (rand() < 0.3) continue;
    const ca = A * Math.cos(t), sb = B * Math.sin(t);
    const ex = LAKE.x + ca * c - sb * s + 0.3 * (2 * rand() - 1), ez = LAKE.z + ca * s + sb * c + 0.3 * (2 * rand() - 1);
    const tan = new Vector3(-A * Math.sin(t) * c - B * Math.cos(t) * s, 0, -A * Math.sin(t) * s + B * Math.cos(t) * c).normalize();
    const nrm = new Vector3(tan.z, 0, -tan.x);
    if (nrm.dot(new Vector3(ex - LAKE.x, 0, ez - LAKE.z)) < 0) nrm.negate();
    const tilt = (10 + 25 * rand()) * (Math.PI / 180);
    const lean = new Vector3(-Math.sin(tilt) * nrm.x, Math.cos(tilt), -Math.sin(tilt) * nrm.z);
    const yaw = shove + 0.2 * (2 * rand() - 1);
    const along = new Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    along.sub(lean.clone().multiplyScalar(along.dot(lean))).normalize();
    const m = new Matrix4().makeBasis(along, lean, new Vector3().crossVectors(along, lean)).setPosition(ex, heightAt(ex, ez), ez);
    const k = 0.6 + 0.8 * rand();
    const L = (0.5 + 0.6 * rand()) * k, H = (0.5 + 0.6 * rand()) * k, W = (0.5 + 0.3 * rand()) * k;
    parts.push(painted(new BoxGeometry(L, H, W).translate(0, H / 2, 0).applyMatrix4(m), rand() < 0.5 ? C.ice : C.deepIce));
  }
  return mergeGeometries(parts);
}

// Stacks of eight flat discs, one per 0.12 m step of a hashed drift, on the lid where the lake weight is over 0.5.
function bubbleDiscs() {
  const rand = mulberry32(90004);
  const w = {};
  const stacks = [];
  for (let tries = 0; stacks.length < STACKS && tries < 20000; tries++) {
    const x = LAKE.x + (2 * rand() - 1) * LAKE.a, z = LAKE.z + (2 * rand() - 1) * LAKE.a;
    if (regionWeights(x, z, w).lake <= 0.5 || Math.hypot(x - HOLE.x, z - HOLE.z) < 2.4) continue;
    if (stacks.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.4)) continue;
    stacks.push([x, z, rand() * 2 * Math.PI]);
  }
  const out = [];
  for (const [x, z, a] of stacks)
    for (let k = 0; k < 8 && out.length < MAX; k++) {
      const cx = x + Math.cos(a) * 0.12 * k, cz = z + Math.sin(a) * 0.12 * k;
      out.push([cx, heightAt(cx, cz) + 0.04 + 0.004 * k, cz, RADII[k]]);
    }
  return out;
}

function sealGeo() {
  const rand = mulberry32(90021);
  const g = painted(new IcosahedronGeometry(0.42, 1).scale(1, 0.9, 1.15), "#8e97a6");
  const col = g.attributes.color, spot = new Color("#b4bcc8");
  for (let f = 0; f * 3 < col.count; f++) if (rand() > 0.72) for (let k = 0; k < 3; k++) col.setXYZ(f * 3 + k, spot.r, spot.g, spot.b);
  return g;
}

export default function MeltLake() {
  const lid = useMemo(decalGeo, []);
  const rubble = useMemo(rampGeo, []);
  const discs = useMemo(bubbleDiscs, []);
  const head = useMemo(sealGeo, []);
  const tier = useUi((s) => s.tier) ?? 0;
  const pool = useRef(null);
  const pup = useRef(null);
  const ice = mat("#ffffff", { vertexColors: true, roughness: 0.5, side: DoubleSide });
  const ridge = mat("#ffffff", { vertexColors: true, roughness: 0.6 });
  const bubble = mat("#ffffff", { roughness: 0.5 });
  const skin = mat("#ffffff", { vertexColors: true, roughness: 0.6 });

  useLayoutEffect(() => {
    const d = new Object3D();
    discs.forEach(([x, y, z, r], i) => {
      d.position.set(x, y, z);
      d.scale.set(r, 1, r);
      d.updateMatrix();
      pool.current.setMatrixAt(i, d.matrix);
    });
    pool.current.instanceMatrix.needsUpdate = true;
    pool.current.computeBoundingSphere();
  }, [discs]);

  useEffect(() => {
    if (pool.current) pool.current.count = detail(BUBBLES, tier);
  }, [tier]);

  useFrame(({ clock }) => {
    const m = pup.current, s = live.seal;
    if (!m) return;
    if (Math.hypot(s.x - HOLE.x, s.z - HOLE.z) > 60) {
      m.position.y = BASE - 0.9;
      return;
    }
    const t = clock.elapsedTime % PERIOD;
    const up = t < 1.2 ? smooth(t / 1.2) : t < 6.2 ? 1 : 1 - smooth(t - 6.2);
    m.position.y = BASE - 0.9 + 1.15 * up;
    m.rotation.y = Math.atan2(s.x - HOLE.x, s.z - HOLE.z) * smooth(t - 1.2);
  });

  return (
    <>
      <mesh geometry={lid} material={ice} receiveShadow />
      <mesh geometry={rubble} material={ridge} castShadow receiveShadow />
      <instancedMesh ref={pool} args={[DISC, bubble, discs.length]} receiveShadow />
      <mesh ref={pup} geometry={head} material={skin} position={AT} castShadow receiveShadow />
    </>
  );
}
