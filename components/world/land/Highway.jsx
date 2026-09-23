"use client";

// THE HIGHWAY (google/highway #3244), a real one: four lanes of asphalt from
// the town to Mount MujoRush, round a roundabout whose island is the
// highway's place, into the car park under the three faces (layout:
// lib/world/land.js HIGHWAY; the seal slides 30% faster on it, motion.js).
// Show, never tell: the cars drive side by side in lockstep, one per lane,
// and a whole row waits together when the seal is in front of any car in it.
// THE ANOMALY, the area's radiation made visible: the lane paint crawls along
// the road by itself, every lane's dashes in step, glowing in its colour.
// Static parts are merged into a few meshes; dashes and cars are instanced
// and move without allocating.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Object3D,
  RingGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HIGHWAY } from "../../../lib/world/land";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { live, useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";
import { mulberry32 } from "../life/spawn";

const PLACE = PLACE_BY_ID["pr-highway-3244"];
const RADIATION = PLACE?.radiation ?? "#ff4d6a";
const HALF = HIGHWAY.width / 2;
const LANE = 1.6;
const Y = 0.03; // asphalt, just over the snow (and the trail under it)
const PAINT_Y = 0.045;
const STEP = 0.25; // m between curve samples
const PERIOD = 3; // m: a 1.2 m dash every 3 m
const CRAWL = 2.2; // m/s the paint crawls
const CAR_SPEED = 6.5; // m/s
const TRIM = 2.2; // m of each leg's joined end kept clear of paint and cars
const GOOGLE = ["#4285f4", "#ea4335", "#fbbc05", "#34a853"];

// ---- the legs as arc-length tables -------------------------------------------------------

function legTable(points) {
  const curve = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  const len = curve.getLength();
  const n = Math.max(2, Math.ceil(len / STEP));
  const pts = curve.getSpacedPoints(n);
  const px = new Float32Array(n + 1);
  const pz = new Float32Array(n + 1);
  const tx = new Float32Array(n + 1);
  const tz = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    px[i] = pts[i].x;
    pz[i] = pts[i].z;
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    tx[i] = (b.x - a.x) / l;
    tz[i] = (b.z - a.z) / l;
  }
  return { px, pz, tx, tz, n, len, step: len / n };
}
const LEGS = HIGHWAY.legs.map(legTable);

// The point `d` metres along a leg, `off` metres to the right of its centre
// line (right-hand traffic: the forward carriageway is at +off), written
// into `out` with the heading (rotation.y) that faces along the leg.
function along(tab, d, off, out) {
  const f = Math.max(0, Math.min(tab.n, d / tab.step));
  const i = Math.min(tab.n - 1, Math.floor(f));
  const u = f - i;
  const tx = tab.tx[i] + (tab.tx[i + 1] - tab.tx[i]) * u;
  const tz = tab.tz[i] + (tab.tz[i + 1] - tab.tz[i]) * u;
  // right of travel with +y up is (-tz, tx) rotated: forward x up = (-tz, 0, tx)
  out.x = tab.px[i] + (tab.px[i + 1] - tab.px[i]) * u - tz * off;
  out.z = tab.pz[i] + (tab.pz[i + 1] - tab.pz[i]) * u + tx * off;
  out.heading = Math.atan2(tx, tz);
  return out;
}

// A flat ribbon between two offsets across a leg, from d0 to d1 along it.
function strip(tab, o0, o1, y, d0 = 0, d1 = tab.len) {
  const pos = [];
  const idx = [];
  const p = {};
  let k = 0;
  for (let d = d0; ; d = Math.min(d1, d + tab.step)) {
    along(tab, d, o0, p);
    pos.push(p.x, y, p.z);
    along(tab, d, o1, p);
    pos.push(p.x, y, p.z);
    // counter-clockwise seen from above when o0 is left of o1
    if (k > 0 && o0 < o1) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k);
    if (k > 0 && o0 > o1) idx.push(2 * k - 2, 2 * k, 2 * k - 1, 2 * k - 1, 2 * k, 2 * k + 1);
    k++;
    if (d >= d1) break;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const up = new Float32Array(pos.length);
  for (let i = 1; i < up.length; i += 3) up[i] = 1;
  g.setAttribute("normal", new Float32BufferAttribute(up, 3));
  g.setIndex(idx);
  return g;
}
const flat = (g, x, y, z) => {
  g.deleteAttribute("uv");
  return g.rotateX(-Math.PI / 2).translate(x, y, z);
};
// Which end of each leg joins the ring or the car park (and keeps clear of
// paint); the town end of the first leg is open road.
const trimOf = (li) => [li === 0 ? 0.5 : TRIM, TRIM];

// ---- static geometry ------------------------------------------------------------------

function roundedRect(w, d, r) {
  const s = new Shape();
  const x = -w / 2;
  const z = -d / 2;
  s.moveTo(x + r, z);
  s.lineTo(x + w - r, z);
  s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + d - r);
  s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d);
  s.quadraticCurveTo(x, z + d, x, z + d - r);
  s.lineTo(x, z + r);
  s.quadraticCurveTo(x, z, x + r, z);
  return s;
}

function buildStatic() {
  const r = HIGHWAY.roundabout;
  const c = HIGHWAY.carPark;
  const start = HIGHWAY.legs[0][0];

  const asphalt = mergeGeometries([
    ...LEGS.map((t) => strip(t, -HALF, HALF, Y)),
    flat(new RingGeometry(r.radius - r.width / 2, r.radius + r.width / 2, 64), r.x, Y + 0.006, r.z),
    flat(new ShapeGeometry(roundedRect(c.w, c.d, 1.2), 4), c.x, Y + 0.004, c.z),
    flat(new CircleGeometry(HALF, 28), start[0], Y - 0.004, start[1]), // the town end: a turning circle
  ]);

  const white = [];
  const yellow = [];
  LEGS.forEach((t, li) => {
    const [a, b] = trimOf(li);
    for (const s of [1, -1]) white.push(strip(t, s * (HALF - 0.35), s * (HALF - 0.2), PAINT_Y, a, t.len - b)); // edge lines
    for (const s of [1, -1]) yellow.push(strip(t, s * 0.06, s * 0.18, PAINT_Y, a, t.len - b)); // the double centre line
  });
  const ri = r.radius - r.width / 2;
  const ro = r.radius + r.width / 2;
  white.push(flat(new RingGeometry(ri + 0.15, ri + 0.3, 64), r.x, PAINT_Y, r.z), flat(new RingGeometry(ro - 0.3, ro - 0.15, 64), r.x, PAINT_Y, r.z));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
    white.push(new BoxGeometry(0.9, 0.01, 0.12).rotateY(-a + Math.PI / 2).translate(r.x + Math.cos(a) * r.radius, PAINT_Y, r.z + Math.sin(a) * r.radius));
  }
  // the car park: an outline and a row of bays along its north side, facing the faces
  const cx0 = c.x - c.w / 2 + 0.5;
  const cz0 = c.z - c.d / 2 + 0.4;
  for (let x = cx0; x <= c.x + c.w / 2 - 0.4; x += 1.9) white.push(new BoxGeometry(0.12, 0.01, 2.2).translate(x, PAINT_Y, cz0 + 1.1));
  white.push(new BoxGeometry(c.w - 1, 0.01, 0.12).translate(c.x, PAINT_Y, cz0));
  for (const g of white) if (g.attributes.uv) g.deleteAttribute("uv");
  for (const g of yellow) if (g.attributes.uv) g.deleteAttribute("uv");

  // streetlights down both legs, alternating sides, arms reaching over the road
  const poles = [];
  const heads = [];
  const p = {};
  LEGS.forEach((t, li) => {
    const [a, b] = trimOf(li);
    let side = 1;
    for (let d = a + 3; d < t.len - b; d += 9, side = -side) {
      along(t, d, side * (HALF + 0.7), p);
      const turn = p.heading + (side > 0 ? Math.PI / 2 : -Math.PI / 2); // the arm's +z points back over the road
      poles.push(
        new CylinderGeometry(0.07, 0.1, 3, 8).translate(0, 1.5, 0).rotateY(turn).translate(p.x, 0, p.z),
        new BoxGeometry(0.09, 0.09, 1.2).translate(0, 3, 0.55).rotateY(turn).translate(p.x, 0, p.z),
      );
      heads.push(new BoxGeometry(0.36, 0.14, 0.56).translate(0, 2.93, 1.15).rotateY(turn).translate(p.x, 0, p.z));
    }
  });

  // the roundabout's island: a white curb, a flower bed in Google's four
  // colours, and an interstate shield on two posts (the sign is the joke;
  // it carries no words)
  const curb = new CylinderGeometry(ri - 0.05, ri, 0.24, 36).translate(r.x, 0.12, r.z);
  const BED = ri - 0.3;
  const bed = new SphereGeometry(BED, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.28, 1).translate(r.x, 0.2, r.z);
  const rand = mulberry32(3244);
  const flowers = GOOGLE.map(() => []);
  for (let i = 0; i < 44; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 0.5 + rand() * (BED - 0.8);
    const top = 0.2 + BED * 0.28 * Math.sqrt(1 - (rr / BED) ** 2); // the bed's surface there
    flowers[i % 4].push(new ConeGeometry(0.13, 0.26, 5).rotateX(Math.PI).translate(r.x + Math.cos(a) * rr, top + 0.12, r.z + Math.sin(a) * rr));
  }
  const shield = new Shape();
  shield.moveTo(0, -0.8);
  shield.quadraticCurveTo(0.78, -0.5, 0.72, 0.2);
  shield.lineTo(0.72, 0.55);
  shield.quadraticCurveTo(0.36, 0.7, 0, 0.55);
  shield.quadraticCurveTo(-0.36, 0.7, -0.72, 0.55);
  shield.lineTo(-0.72, 0.2);
  shield.quadraticCurveTo(-0.78, -0.5, 0, -0.8);
  const crown = new Shape();
  crown.moveTo(-0.74, 0.28);
  crown.lineTo(0.74, 0.28);
  crown.lineTo(0.74, 0.57);
  crown.quadraticCurveTo(0.36, 0.72, 0, 0.57);
  crown.quadraticCurveTo(-0.36, 0.72, -0.74, 0.57);
  crown.lineTo(-0.74, 0.28);
  const extrude = { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 8 };
  const signAt = (g, dz) => g.translate(r.x, 2.35, r.z + 0.3 + dz);
  const signBlue = signAt(new ExtrudeGeometry(shield, extrude), 0);
  const signRed = signAt(new ExtrudeGeometry(crown, { ...extrude, depth: 0.04 }), 0.14);
  for (const s of [1, -1]) poles.push(new CylinderGeometry(0.06, 0.06, 2.2, 8).translate(r.x + s * 0.4, 1.1, r.z + 0.25));

  const clean = (gs) => gs.map((g) => (g.attributes.uv ? (g.deleteAttribute("uv"), g) : g));
  return {
    asphalt,
    white: mergeGeometries(clean(white)),
    yellow: mergeGeometries(clean(yellow)),
    poles: mergeGeometries(clean(poles)),
    heads: mergeGeometries(clean(heads)),
    curb: mergeGeometries(clean([curb])),
    bed: mergeGeometries(clean([bed])),
    flowers: flowers.map((f) => mergeGeometries(clean(f))),
    signBlue: mergeGeometries(clean([signBlue])),
    signRed: mergeGeometries(clean([signRed])),
  };
}

// ---- moving parts: the crawling paint and the lockstep cars ---------------------------------

// Lane dividers (between the two lanes of each carriageway) as dash slots:
// each leg, each side; the dashes crawl the way that side's traffic runs.
const DIVIDERS = LEGS.flatMap((t, li) => {
  const [a, b] = trimOf(li);
  const count = Math.floor((t.len - a - b) / PERIOD);
  return [1, -1].map((side) => ({ t, side, a, count }));
});
const DASHES = DIVIDERS.reduce((n, d) => n + d.count, 0);

// Rows of cars side by side, one per lane of a carriageway, all moving as
// one. Legs get rows both ways; the ring gets one row going round.
function makeRows() {
  const rows = [];
  LEGS.forEach((t, li) => {
    const [a, b] = trimOf(li);
    const span = t.len - a - b;
    if (span < 10) return; // too short a run: cars would pop in and out every second
    const perSide = span > 18 ? 2 : 1;
    for (const side of [1, -1]) for (let k = 0; k < perSide; k++) rows.push({ t, side, a, span, s: (k + (side < 0 ? 0.5 : 0)) * (span / perSide), v: CAR_SPEED, cars: [{}, {}] });
  });
  rows.push({ ring: true, s: 0, v: CAR_SPEED * 0.6, cars: [{}, {}] });
  return rows;
}
// parked in the bays under the faces (bay lines every 1.9 m from x -40.5)
const PARKED = [
  [-37.65, "#4285f4"],
  [-33.85, "#fbbc05"],
  [-28.15, "#ea4335"],
];

const dummy = new Object3D();
const P = {};
const tint = new Color();

function carGeometry() {
  const body = new BoxGeometry(0.62, 0.3, 1.3).translate(0, 0.3, 0);
  const cabin = new BoxGeometry(0.52, 0.26, 0.66).translate(0, 0.58, -0.08);
  const wheels = mergeGeometries(
    [0.42, -0.42].map((z) => new CylinderGeometry(0.17, 0.17, 0.72, 10).rotateZ(Math.PI / 2).translate(0, 0.17, z)),
  );
  return { body, cabin, wheels };
}

export default function Highway() {
  const near = useUi((s) => s.near) === PLACE?.id;
  const geo = useMemo(buildStatic, []);
  const car = useMemo(carGeometry, []);
  const rows = useMemo(makeRows, []);
  const carCount = rows.length * 2 + PARKED.length;
  const dashGeo = useMemo(() => new BoxGeometry(0.14, 0.012, 1.2), []);
  const dashMat = useMemo(() => lamp(RADIATION, 0.9).clone(), []);
  const dashes = useRef(null);
  const bodies = useRef(null);
  const cabins = useRef(null);
  const wheels = useRef(null);
  const glow = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    glow.current += ((near ? 1 : 0) - glow.current) * (1 - Math.exp(-3 * dt));
    dashMat.emissiveIntensity = 0.8 + 0.8 * glow.current;

    // the paint crawls: every dash in every lane moves by the same phase
    const mesh = dashes.current;
    if (mesh) {
      const phase = (t * CRAWL) % PERIOD;
      let i = 0;
      for (const d of DIVIDERS) {
        for (let k = 0; k < d.count; k++, i++) {
          const s = d.side > 0 ? d.a + k * PERIOD + phase : d.a + (k + 1) * PERIOD - phase;
          along(d.t, s, d.side * LANE, P);
          dummy.position.set(P.x, PAINT_Y + 0.004, P.z);
          dummy.rotation.set(0, P.heading, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // the cars: a row waits as one when the seal is ahead of any car in it
    const b = bodies.current;
    if (!b) return;
    const seal = live.seal;
    const r = HIGHWAY.roundabout;
    let n = 0;
    const place = (x, z, heading, scale) => {
      dummy.position.set(x, Y, z);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      b.setMatrixAt(n, dummy.matrix);
      cabins.current.setMatrixAt(n, dummy.matrix);
      wheels.current.setMatrixAt(n, dummy.matrix);
      n++;
    };
    for (const row of rows) {
      let blocked = false;
      for (let lane = 0; lane < 2; lane++) {
        if (row.ring) {
          const a = row.s / r.radius;
          const rr = r.radius + (lane ? 0.8 : -0.8);
          P.x = r.x + Math.cos(a) * rr;
          P.z = r.z - Math.sin(a) * rr;
          P.heading = Math.atan2(-Math.sin(a), -Math.cos(a));
        } else {
          const s = row.a + (row.side > 0 ? row.s : row.span - row.s);
          along(row.t, s, row.side * (LANE * 0.5 + lane * LANE), P);
          if (row.side < 0) P.heading += Math.PI;
        }
        const fx = Math.sin(P.heading);
        const fz = Math.cos(P.heading);
        const rx = seal.x - P.x;
        const rz = seal.z - P.z;
        const ahead = rx * fx + rz * fz;
        if (ahead > 0 && ahead < 3.2 && Math.abs(rx * fz - rz * fx) < 1.3) blocked = true;
        const cur = row.cars[lane];
        cur.x = P.x;
        cur.z = P.z;
        cur.h = P.heading;
      }
      row.v += ((blocked ? 0 : row.ring ? CAR_SPEED * 0.6 : CAR_SPEED) - row.v) * (1 - Math.exp(-(blocked ? 9 : 2) * dt));
      row.s += row.v * dt;
      if (row.ring) row.s %= Math.PI * 2 * r.radius;
      else if (row.s > row.span) row.s -= row.span;
      // pop in and out at a leg's ends (a toy road: they drive off the table)
      const edge = row.ring ? 1 : Math.min(1, row.s / 1.2, (row.span - row.s) / 1.2);
      for (const cur of row.cars) place(cur.x, cur.z, cur.h, Math.max(0.001, edge));
    }
    for (const [x] of PARKED) place(x, HIGHWAY.carPark.z - HIGHWAY.carPark.d / 2 + 1.5, Math.PI, 1);
    b.instanceMatrix.needsUpdate = true;
    cabins.current.instanceMatrix.needsUpdate = true;
    wheels.current.instanceMatrix.needsUpdate = true;
  });

  // per-car colours, one per lane across Google's four
  const colourCars = (mesh) => {
    if (!mesh || mesh.instanceColor) return;
    let n = 0;
    for (let i = 0; i < rows.length; i++) for (let lane = 0; lane < 2; lane++) mesh.setColorAt(n++, tint.set(GOOGLE[(i + lane * 2) % 4]));
    for (const [, c] of PARKED) mesh.setColorAt(n++, tint.set(c));
    mesh.instanceColor.needsUpdate = true;
  };

  return (
    <group>
      <mesh geometry={geo.asphalt} material={mat("#3d3b4a", { roughness: 0.92 })} receiveShadow />
      <mesh geometry={geo.white} material={mat("#fbfaf7", { roughness: 0.6 })} />
      <mesh geometry={geo.yellow} material={mat("#ffc933", { roughness: 0.6 })} />
      <mesh geometry={geo.poles} material={mat(C.charcoal)} castShadow />
      <mesh geometry={geo.heads} material={lamp(RADIATION, 1.1)} />
      <mesh geometry={geo.curb} material={mat(C.snow)} receiveShadow castShadow />
      <mesh geometry={geo.bed} material={mat("#7ed957", { roughness: 0.9 })} receiveShadow />
      {geo.flowers.map((g, i) => (
        <mesh key={i} geometry={g} material={mat(GOOGLE[i], { roughness: 0.5 })} castShadow />
      ))}
      <mesh geometry={geo.signBlue} material={mat("#2b5fd9", { roughness: 0.4 })} castShadow />
      <mesh geometry={geo.signRed} material={mat("#ea4335", { roughness: 0.4 })} />
      <instancedMesh ref={dashes} args={[dashGeo, dashMat, DASHES]} frustumCulled={false} />
      <instancedMesh
        ref={(m) => {
          bodies.current = m;
          colourCars(m);
        }}
        args={[car.body, mat("#ffffff", { roughness: 0.35 }), carCount]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh ref={cabins} args={[car.cabin, mat("#cfe9ff", { roughness: 0.15, metalness: 0.1 }), carCount]} frustumCulled={false} />
      <instancedMesh ref={wheels} args={[car.wheels, mat(C.charcoal), carCount]} frustumCulled={false} />
    </group>
  );
}
