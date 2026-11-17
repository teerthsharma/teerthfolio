// The Highway's roundabout, legs, car park, crawling lane paint and cars: the site's own layout (components/world/land/Highway.jsx), pure copy.
import { BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, Object3D, RingGeometry, ShaderMaterial, Shape, ShapeGeometry, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HIGHWAY } from "../../../../../lib/world/land.js";
import { BAY_Z, CAR_BAYS, LEGS, ROAD_Y, STATIC_BAYS, along, createCar, createParked, stepCars } from "../../../../../lib/world/highwayCars.js";
import { DOCK } from "../clock.js";

export const HALF = HIGHWAY.width / 2;
const LANE = 1.6, PAINT_Y = ROAD_Y + 0.015, PERIOD = 3, CRAWL = 2.2, TRIM = 2.2, DRIVE = 1.6, STEP = 1 / 30;
const SIGN = HIGHWAY.roundabout.radius / 4.5;
const GOOGLE = ["#4285f4", "#ea4335", "#fbbc05", "#34a853"];
const PARKED_HEX = ["#4285f4", "#fbbc05", "#ea4335"];
const RADIATION = "#ff4d6a";
const dummy = new Object3D(), P = {};
const lin = (hex) => new Color(hex);

export const SUN = { uSun: { value: new Vector3(-14, 26, 12).normalize() }, uSky: { value: lin("#c4def2") } };
const VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() {
    vec4 p = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 w = modelMatrix * p; vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vC = color;
    #ifdef USE_INSTANCING_COLOR
      vC *= instanceColor;
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const fragment = (hook) => /* glsl */ `
  uniform float uGloss, uUnlit, uEmit; uniform vec3 uSun, uShade, uSunC, uSky;
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  ${hook}
  void main() {
    vec3 c = vC;
    if (uUnlit < 0.5) {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(cameraPosition - vW);
      c *= uShade + uSunC * max(dot(n, uSun), 0.0);
      c = mix(c, uSky, uGloss * (0.06 + 0.5 * pow(1.0 - max(dot(n, v), 0.0), 3.0)));
      c = finish(c, n, v);
    }
    c += uEmit * vC;
    c = mix(c, uSky, smoothstep(120.0, 420.0, distance(vW, cameraPosition)) * 0.35);
    gl_FragColor = vec4(c, 0.99);
  }`;

export function litMaterial({ shade = [0.64, 0.7, 0.92], sunC = [0.62, 0.56, 0.44], gloss = 0, unlit = 0, emit = 0, side, extra } = {}) {
  return new ShaderMaterial({
    uniforms: { ...SUN, uShade: { value: new Vector3(...shade) }, uSunC: { value: new Vector3(...sunC) }, uGloss: { value: gloss }, uUnlit: { value: unlit }, uEmit: { value: emit } },
    vertexShader: VERT, fragmentShader: fragment(extra ?? "vec3 finish(vec3 c, vec3 n, vec3 v) { return c; }"), ...(side ? { side } : {}),
  });
}

export function tint(g, hex) {
  const n = g.attributes.position.count, c = lin(hex), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.deleteAttribute("uv");
  g.setAttribute("color", new Float32BufferAttribute(a, 3));
  return g;
}

function strip(tab, o0, o1, y, d0 = 0, d1 = tab.len) {
  const pos = [], idx = [], p = {};
  let k = 0;
  for (let d = d0; ; d = Math.min(d1, d + tab.step)) {
    along(tab, d, o0, p);
    pos.push(p.x, y, p.z);
    along(tab, d, o1, p);
    pos.push(p.x, y, p.z);
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
const flat = (g, x, y, z) => g.rotateX(-Math.PI / 2).translate(x, y, z);
const trimOf = (li) => [li === 0 ? 0.5 : TRIM, li === 1 ? DRIVE : TRIM];

function roundedRect(w, d, r) {
  const s = new Shape(), x = -w / 2, z = -d / 2;
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

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function buildStatic() {
  const r = HIGHWAY.roundabout, c = HIGHWAY.carPark, start = HIGHWAY.legs[0][0], Y = ROAD_Y;
  const asphalt = mergeGeometries([
    ...LEGS.map((t) => tint(strip(t, -HALF, HALF, Y), "#3d3b4a")),
    tint(flat(new RingGeometry(r.radius - r.width / 2, r.radius + r.width / 2, 64), r.x, Y + 0.006, r.z), "#3d3b4a"),
    tint(flat(new ShapeGeometry(roundedRect(c.w, c.d, 1.2), 4), c.x, Y + 0.004, c.z), "#3d3b4a"),
    tint(flat(new CircleGeometry(HALF, 28), start[0], Y - 0.004, start[1]), "#3d3b4a"),
  ]);
  const white = [], yellow = [];
  LEGS.forEach((t, li) => {
    const [a, b] = trimOf(li);
    for (const s of [1, -1]) white.push(strip(t, s * (HALF - 0.35), s * (HALF - 0.2), PAINT_Y, a, t.len - b));
    for (const s of [1, -1]) yellow.push(strip(t, s * 0.06, s * 0.18, PAINT_Y, a, t.len - b));
  });
  const ri = r.radius - r.width / 2, ro = r.radius + r.width / 2;
  white.push(flat(new RingGeometry(ri + 0.15, ri + 0.3, 64), r.x, PAINT_Y, r.z), flat(new RingGeometry(ro - 0.3, ro - 0.15, 64), r.x, PAINT_Y, r.z));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) white.push(new BoxGeometry(0.9, 0.01, 0.12).rotateY(-a + Math.PI / 2).translate(r.x + Math.cos(a) * r.radius, PAINT_Y, r.z + Math.sin(a) * r.radius));
  const cx0 = c.x - c.w / 2 + 0.5, cz0 = c.z - c.d / 2 + 0.4;
  for (let x = cx0; x <= c.x + c.w / 2 - 0.4; x += 1.9) white.push(new BoxGeometry(0.12, 0.01, 2.2).translate(x, PAINT_Y, cz0 + 1.1));
  white.push(new BoxGeometry(c.w - 1, 0.01, 0.12).translate(c.x, PAINT_Y, cz0));

  const poles = [], heads = [], p = {};
  LEGS.forEach((t, li) => {
    const [a, b] = trimOf(li);
    let side = 1;
    for (let d = a + 3; d < t.len - b; d += 9, side = -side) {
      along(t, d, side * (HALF + 0.7), p);
      const turn = p.heading + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      poles.push(new CylinderGeometry(0.07, 0.1, 3, 8).translate(0, 1.5, 0).rotateY(turn).translate(p.x, 0, p.z), new BoxGeometry(0.09, 0.09, 1.2).translate(0, 3, 0.55).rotateY(turn).translate(p.x, 0, p.z));
      heads.push(new BoxGeometry(0.36, 0.14, 0.56).translate(0, 2.93, 1.15).rotateY(turn).translate(p.x, 0, p.z));
    }
  });

  const curb = new CylinderGeometry(ri - 0.05, ri, 0.24, 36).translate(r.x, 0.12, r.z);
  const BED = ri - 0.3;
  const bed = new SphereGeometry(BED, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.28, 1).translate(r.x, 0.2, r.z);
  const rand = mulberry(3244), flowers = GOOGLE.map(() => []);
  for (let i = 0; i < 44 * Math.round(SIGN * SIGN); i++) {
    const a = rand() * Math.PI * 2, rr = 0.5 + rand() * (BED - 0.8);
    const top = 0.2 + BED * 0.28 * Math.sqrt(1 - (rr / BED) ** 2);
    flowers[i % 4].push(tint(new ConeGeometry(0.13, 0.26, 5).rotateX(Math.PI).translate(r.x + Math.cos(a) * rr, top + 0.12, r.z + Math.sin(a) * rr), GOOGLE[i % 4]));
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
  const big = (g) => g.translate(-r.x, 0, -r.z).scale(SIGN, SIGN, SIGN).translate(r.x, 0, r.z);
  const signAt = (g, dz) => big(g.translate(r.x, 2.35, r.z + 0.3 + dz));
  const signBlue = signAt(new ExtrudeGeometry(shield, extrude), 0);
  const signRed = signAt(new ExtrudeGeometry(crown, { ...extrude, depth: 0.04 }), 0.14);
  for (const s of [1, -1]) poles.push(big(new CylinderGeometry(0.06, 0.06, 2.2, 8).translate(r.x + s * 0.4, 1.1, r.z + 0.25)));

  const merge = (list, hex) => tint(mergeGeometries(list.map((g) => { g.deleteAttribute("uv"); return g; })), hex);
  return {
    asphalt,
    white: tint(mergeGeometries(white.map((g) => (g.deleteAttribute("uv"), g))), "#fbfaf7"),
    yellow: tint(mergeGeometries(yellow.map((g) => (g.deleteAttribute("uv"), g))), "#ffc933"),
    poles: merge(poles, "#43434c"),
    heads: merge(heads, RADIATION),
    curb: merge([curb], "#f7f0f2"),
    bed: merge([bed], "#7ed957"),
    flowers: flowers.map((f, i) => merge(f, GOOGLE[i])),
    signBlue: merge([signBlue], "#2b5fd9"),
    signRed: merge([signRed], "#ea4335"),
  };
}

const DIVIDERS = LEGS.flatMap((t, li) => {
  const [a, b] = trimOf(li);
  const count = Math.floor((t.len - a - b) / PERIOD);
  return [1, -1].map((side) => ({ t, side, a, count }));
});
export const DASHES = DIVIDERS.reduce((n, d) => n + d.count, 0);

function carGeometry() {
  const body = tint(new BoxGeometry(0.62, 0.3, 1.3).translate(0, 0.3, 0), "#ffffff");
  const cabin = tint(new BoxGeometry(0.52, 0.26, 0.66).translate(0, 0.58, -0.08), "#cfe9ff");
  const wheels = tint(mergeGeometries([0.42, -0.42].map((z) => new CylinderGeometry(0.17, 0.17, 0.72, 10).rotateZ(Math.PI / 2).translate(0, 0.17, z))), "#43434c");
  return { body, cabin, wheels };
}

export function buildRoad() {
  const parts = buildStatic();
  const group = new Group();
  const dashGeo = tint(new BoxGeometry(0.14, 0.012, 1.2), RADIATION);
  const dashes = new InstancedMesh(dashGeo, litMaterial({ emit: 0.35 }), DASHES);
  dashes.frustumCulled = false;
  const N = CAR_BAYS.length + STATIC_BAYS.length, cg = carGeometry();
  const bodies = new InstancedMesh(cg.body, litMaterial(), N), cabins = new InstancedMesh(cg.cabin, litMaterial(), N), wheels = new InstancedMesh(cg.wheels, litMaterial(), N);
  for (const m of [bodies, cabins, wheels]) m.frustumCulled = false;
  CAR_BAYS.forEach((_, i) => bodies.setColorAt(i, lin(GOOGLE[i % 4])));
  PARKED_HEX.forEach((h, i) => bodies.setColorAt(CAR_BAYS.length + i, lin(h)));
  const { asphalt, flowers, ...statics } = parts;
  group.add(new Mesh(asphalt, litMaterial({ gloss: 0.2 })), new Mesh(mergeGeometries([...Object.values(statics), ...flowers].map((g) => (g.index ? g.toNonIndexed() : g))), litMaterial({ gloss: 0.4 })));
  group.add(dashes, bodies, cabins, wheels);
  const sim = { t: 0, cars: CAR_BAYS.map((_, k) => createCar(k)), parked: STATIC_BAYS.map((x) => createParked(x)) };
  return { parts, group, dashes, bodies, cabins, wheels, sim, N, dashGeo };
}

export function updateRoad(road, tc) {
  const s = road.sim;
  if (tc < s.t) { s.t = 0; s.cars = CAR_BAYS.map((_, k) => createCar(k)); s.parked = STATIC_BAYS.map((x) => createParked(x)); }
  const seal = { x: DOCK[0], z: DOCK[2] };
  while (s.t + STEP <= tc + 1e-9) { stepCars(s.cars, seal, STEP); s.t += STEP; }
  const phase = (tc * CRAWL) % PERIOD;
  let i = 0;
  for (const d of DIVIDERS) for (let k = 0; k < d.count; k++, i++) {
    const at = d.side > 0 ? d.a + k * PERIOD + phase : d.a + (k + 1) * PERIOD - phase;
    along(d.t, at, d.side * LANE, P);
    dummy.position.set(P.x, PAINT_Y + 0.004, P.z);
    dummy.rotation.set(0, P.heading, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    road.dashes.setMatrixAt(i, dummy.matrix);
  }
  road.dashes.instanceMatrix.needsUpdate = true;
  let n = 0;
  const place = (x, z, h) => {
    dummy.position.set(x, ROAD_Y, z);
    dummy.rotation.set(0, h, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    for (const m of [road.bodies, road.cabins, road.wheels]) m.setMatrixAt(n, dummy.matrix);
    n++;
  };
  for (const c of s.cars) place(c.x, c.z, c.h);
  for (const c of s.parked) place(c.x, BAY_Z, Math.PI);
  for (const m of [road.bodies, road.cabins, road.wheels]) m.instanceMatrix.needsUpdate = true;
}
