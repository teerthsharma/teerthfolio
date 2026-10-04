// THE CITY BELOW: dense office towers falling away to the horizon (one instanced mesh; the lit window grids are
// painted in the fragment shader), an elevated expressway curving between them with slow streams of head- and
// tail-lights, and three giant broadcast screens on the nearest towers showing a live studio feed as abstract
// colour cells (no logos, no text). The nearest screen carries MISA, a small figure with twin pigtails and a frilled
// gothic dress, hands clasped: the city watching. On the cut every screen shows the notebook page. Rig frame.

import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, Vector3 } from "three";
import { U, VERT, LIGHT, ball, box, cyl, hash, limb, merge, mergeC, prep, sm, tene, tint } from "./look";
import { T } from "./timeline";

const D = new Object3D();
export const SCREENS = [
  { x: -5.9, y: 5.3, z: -25.0, w: 9.0, h: 5.6, yaw: 0.17 },
  { x: 10.5, y: 3.5, z: -33.0, w: 10.4, h: 6.0, yaw: -0.27 },
  { x: -17.5, y: 6.2, z: -66.0, w: 16.0, h: 9.2, yaw: 0.24 },
];
const EXPRESS_Y = 0.3;
const expressAt = (s, out) => {
  const x = s * 88;
  return out.set(x, EXPRESS_Y, -42 - 0.0058 * x * x);
};

const TOWER_FRAG = /* glsl */ `
  varying vec3 vP;
  varying vec3 vP0;
  varying vec3 vN;
  varying vec3 vCol;
  varying vec3 vBary;
  ${LIGHT}
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 N = normalize(vN);
    vec3 P = vP0;
    float seed = vCol.r;
    vec3 body = shade(vec3(0.30, 0.27, 0.26), N, vP, 0.3, 0.0);
    vec2 uv = abs(N.x) > 0.5 ? vec2(P.z, P.y) : vec2(P.x, P.y);
    vec2 cell = vec2(1.25, 1.7);
    vec2 q = uv / cell + vec2(seed * 40.0, 0.0);
    vec2 id = floor(q);
    vec2 f = fract(q);
    float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.8) * step(abs(N.y), 0.5);
    float r1 = h21(id + seed * 91.0);
    float on = step(1.0 - vCol.g, r1);
    float r2 = h21(id * 1.7 + 3.1 + seed * 13.0);
    vec3 wc = r2 < 0.66 ? vec3(0.98, 0.62, 0.24) : (r2 < 0.84 ? vec3(0.92, 0.84, 0.66) : vec3(0.40, 0.72, 0.78));
    vec3 emit = wc * win * on * (0.5 + 0.5 * r1);
    float d = distance(P + uOrigin, cameraPosition);
    float fogK = 1.0 - exp(-d * 0.0072);
    vec3 col = body + emit * (1.0 - fogK * 0.6);
    vec3 haze = vec3(0.30, 0.165, 0.07) * (0.45 + 0.55 * clamp(P.y / 24.0 + 0.35, 0.0, 1.0));
    col = mix(col, haze, fogK * 0.6);
    gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);
  }`;

function towerMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      ${VERT}
      void main() {
        vec3 w, n;
        tenePos(w, n);
        vN = n;
        vCol = instanceColor;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: TOWER_FRAG,
  });
}

// the towers: [x, z, w, d, top]; the screens' hosts first
function towerList() {
  const L = [];
  for (const s of SCREENS) L.push([s.x - Math.sin(s.yaw) * 3.2, s.z - Math.cos(s.yaw) * 3.4, s.w + 1.8, 6, s.y + s.h / 2 + 1.1 + hash(L.length, 1) * 1.5, s.yaw]);
  let n = 0;
  const add = (x, z, w, d, top) => L.push([x, z, w, d, top, 0]) && n++;
  // the near flanks: tall, close, the rooftop's neighbours
  for (let i = 0; i < 16; i++) add(-12 - 26 * hash(i, 1) - (i % 2) * 6, -20 - 24 * hash(i, 2), 5 + 7 * hash(i, 3), 5 + 6 * hash(i, 4), 4 + 14 * hash(i, 5) ** 1.3);
  for (let i = 0; i < 16; i++) add(14 + 28 * hash(i, 6), -24 - 24 * hash(i, 7), 5 + 7 * hash(i, 8), 5 + 6 * hash(i, 9), 5 + 17 * hash(i, 10) ** 1.3);
  // the middle city: a field, tops falling with distance
  for (let i = 0; i < 70; i++) {
    const z = -52 - 62 * hash(i, 11);
    const x = (hash(i, 12) - 0.5) * 150;
    add(x, z, 6 + 8 * hash(i, 13), 6 + 8 * hash(i, 14), 6 - (-z - 52) * 0.24 + 8 * hash(i, 15) - 4);
  }
  // the far city, dim, almost down to the horizon
  for (let i = 0; i < 50; i++) {
    const z = -118 - 70 * hash(i, 16);
    add((hash(i, 17) - 0.5) * 230, z, 8 + 10 * hash(i, 18), 8 + 10 * hash(i, 19), -9 + 11 * hash(i, 20) - (-z - 118) * 0.02);
  }
  return L;
}

function screenMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: U.uTime, uBreak: U.uBreak, uOrigin: U.uOrigin, uPage: { value: 0 }, uFlick: { value: 0 }, uGlitch: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aScreen;
      uniform float uBreak;
      varying vec2 vUv;
      varying float vId;
      void main() {
        vUv = uv;
        vId = aScreen;
        vec4 w = modelMatrix * vec4(position, 1.0);
        if (uBreak > 0.0) { w.y -= 6.0 * uBreak * uBreak * (0.5 + fract(aScreen * 0.37)); }
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPage, uFlick, uGlitch;
      varying vec2 vUv;
      varying float vId;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 feed(vec2 uv, float id, float t) {
        vec2 p = uv * vec2(6.5, 4.2) * (1.0 + 0.12 * id) + vec2(t * 0.2 + id * 3.0, sin(t * 0.3 + id) * 0.4);
        vec2 ip = floor(p), fp = fract(p);
        float d1 = 9.0, sid = 0.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(x, y);
          vec2 o = vec2(h21(ip + g + id * 7.0), h21(ip + g + 31.0 + id * 7.0));
          o = 0.5 + 0.42 * sin(t * 0.45 + 6.28 * o);
          float d = length(g + o - fp);
          if (d < d1) { d1 = d; sid = h21(ip + g + 11.0 + id); }
        }
        vec3 c = sid < 0.30 ? vec3(0.12, 0.30, 0.34) : sid < 0.55 ? vec3(0.80, 0.74, 0.60) : sid < 0.75 ? vec3(0.80, 0.48, 0.20) : sid < 0.94 ? vec3(0.08, 0.11, 0.13) : vec3(0.66, 0.08, 0.10);
        return c * (0.5 + 0.5 * (1.0 - smoothstep(0.08, 0.62, d1)));
      }
      void main() {
        vec2 uv = vUv;
        uv.x += uGlitch * (h21(vec2(floor(uv.y * 24.0), floor(uTime * 20.0))) - 0.5) * 0.08;
        vec3 c = feed(uv, vId, uTime) * (0.85 + 0.35 * uFlick);
        // the page: a black notebook page, four ivory lines, three struck in coral
        vec2 pr = vec2((uv.x - 0.5) / 0.215, (uv.y - 0.5) / 0.43);
        float inPage = step(abs(pr.x), 1.0) * step(abs(pr.y), 1.0);
        vec3 page = vec3(0.05, 0.035, 0.03);
        float edge = 1.0 - smoothstep(0.96, 1.0, max(abs(pr.x), abs(pr.y)));
        page = mix(vec3(0.85, 0.78, 0.62), page, edge);
        for (int r = 0; r < 4; r++) {
          float ry = 0.68 - float(r) * 0.45;
          float wob = 0.018 * sin(pr.x * 38.0 + float(r) * 2.1) + 0.012 * sin(pr.x * 91.0 + float(r));
          float line = 1.0 - smoothstep(0.035, 0.07, abs(pr.y - ry + wob));
          line *= step(abs(pr.x), 0.78) * (0.55 + 0.45 * h21(vec2(floor(pr.x * 18.0), float(r))));
          vec3 ink = r == 3 ? vec3(1.0, 0.94, 0.78) : vec3(0.93, 0.86, 0.70);
          page = mix(page, ink * (r == 3 ? 1.15 : 0.9), line);
          if (r < 3) {
            float strike = (1.0 - smoothstep(0.012, 0.03, abs(pr.y - ry - 0.01 * sin(pr.x * 6.0)))) * step(abs(pr.x), 0.86);
            page = mix(page, vec3(1.0, 0.42, 0.35), strike);
          }
        }
        c = mix(c * (1.0 - 0.7 * uPage), page * 1.05, inPage * uPage);
        gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), 1.0);
      }`,
  });
}

function misaGeometry() {
  const dark = "#1c1519";
  const plum = "#2a1c26";
  const frill = "#e8dfd0";
  const p = [];
  p.push(tint(ball(0.34, 0, 3.4, 0, 1, 1.05, 0.95, 12, 8), "#d9c8b4")); // the head
  p.push(tint(ball(0.37, 0, 3.52, -0.02, 1.02, 0.85, 1.0, 12, 6), dark)); // the hair cap
  for (const s of [-1, 1]) {
    p.push(tint(limb([s * 0.4, 3.55, 0], [s * 0.78, 1.7, -0.08], 0.17, 0.05, 6), dark)); // the twin pigtails, long
    p.push(tint(ball(0.12, s * 0.42, 3.5, 0.04, 1, 1, 1, 6, 4), "#7a1a22")); // their ties (the one red)
    p.push(tint(limb([s * 0.17, 2.95, 0], [s * 0.14, 2.15, 0.12], 0.07, 0.06, 5), "#d9c8b4")); // arms, hands clasped in front
  }
  p.push(tint(limb([-0.1, 2.15, 0.14], [0.1, 2.2, 0.16], 0.07, 0.07, 5), "#d9c8b4"));
  p.push(tint(cyl(0.2, 0.3, 0.8, 0, 2.7, 0, 9), plum)); // the bodice
  p.push(tint(cyl(0.34, 0.2, 0.18, 0, 3.08, 0.0, 9), frill)); // the collar frill
  // the skirt: tiers of frilled flares
  for (let k = 0; k < 4; k++) {
    p.push(tint(cyl(0.34 + k * 0.17, 0.42 + k * 0.17, 0.3, 0, 2.25 - k * 0.3, 0, 12), k % 2 ? frill : dark));
  }
  for (const s of [-1, 1]) {
    p.push(tint(limb([s * 0.2, 1.0, 0], [s * 0.2, 0.18, 0], 0.09, 0.07, 5), "#2b2024")); // stockings
    p.push(tint(box(0.24, 0.14, 0.4, s * 0.2, 0.07, 0.1), dark)); // boots
  }
  return mergeC(p);
}

function expresswayGeometry() {
  const road = [];
  const lamps = [];
  const N = 64;
  const a = new Vector3();
  const b = new Vector3();
  const side = new Vector3();
  const quad = (p0, p1, p2, p3) => road.push(p0.clone(), p1.clone(), p2.clone(), p0.clone(), p2.clone(), p3.clone());
  const W = 4.2;
  for (let i = 0; i < N; i++) {
    expressAt(-1 + (2 * i) / N, a);
    expressAt(-1 + (2 * (i + 1)) / N, b);
    side.set(b.z - a.z, 0, -(b.x - a.x)).normalize().multiplyScalar(W);
    const up = new Vector3(0, 1, 0);
    // the road surface
    quad(a.clone().sub(side), b.clone().sub(side), b.clone().add(side), a.clone().add(side));
    // the barriers, both sides: a low wall
    for (const sg of [-1, 1]) {
      const o = side.clone().multiplyScalar(sg);
      const a1 = a.clone().add(o);
      const b1 = b.clone().add(o);
      const a2 = a1.clone().addScaledVector(up, 0.95);
      const b2 = b1.clone().addScaledVector(up, 0.95);
      quad(a1, b1, b2, a2);
      quad(a2, b2, b2.clone().addScaledVector(side, -0.0001 * sg), a2.clone().addScaledVector(side, -0.0001 * sg));
    }
    // the deck's thickness under, a dark slab
    quad(a.clone().sub(side).addScaledVector(up, -1.4), b.clone().sub(side).addScaledVector(up, -1.4), b.clone().add(side).addScaledVector(up, -1.4), a.clone().add(side).addScaledVector(up, -1.4));
    quad(a.clone().add(side).addScaledVector(up, -1.4), b.clone().add(side).addScaledVector(up, -1.4), b.clone().add(side), a.clone().add(side));
    if (i % 4 === 0) {
      for (const sg of [-1, 1]) lamps.push(a.clone().addScaledVector(side, sg * 1.04), sg);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(road.flatMap((v) => [v.x, v.y, v.z])), 3));
  g.computeVertexNormals();
  return { road: prep(g), lamps };
}

export function buildCity() {
  const g = new Group();
  const geos = [];
  const mats = [];
  const own = (x) => (geos.push(x), x);
  const ownM = (x) => (mats.push(x), x);

  // towers
  const list = towerList();
  const unit = prep(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const tm = ownM(towerMaterial());
  const towers = new InstancedMesh(own(unit), tm, list.length);
  towers.frustumCulled = false;
  const col = new Float32Array(list.length * 3);
  list.forEach(([x, z, w, d, top, yaw], i) => {
    const base = -60;
    D.position.set(x, base, z);
    D.rotation.set(0, yaw, 0);
    D.scale.set(w, top - base, d);
    D.updateMatrix();
    towers.setMatrixAt(i, D.matrix);
    col[i * 3] = hash(i, 31);
    col[i * 3 + 1] = i < 3 ? 0.5 : 0.18 + 0.5 * hash(i, 32);
  });
  towers.instanceColor = new InstancedBufferAttribute(col, 3);
  g.add(towers);

  // the expressway and its streams of lights
  const ex = expresswayGeometry();
  const road = new Mesh(own(ex.road), ownM(tene({ albedo: "#6c675f", wet: 0.9, side: DoubleSide })));
  road.frustumCulled = false;
  g.add(road);
  const lampN = ex.lamps.length / 2;
  const poles = [];
  const heads = [];
  for (let i = 0; i < lampN; i++) {
    const p = ex.lamps[i * 2];
    poles.push(cyl(0.05, 0.07, 4.6, p.x, p.y + 2.3, p.z, 5));
    heads.push(box(0.5, 0.1, 0.2, p.x, p.y + 4.6, p.z));
  }
  const poleMesh = new Mesh(own(merge(poles)), ownM(tene({ albedo: "#5e5a52", wet: 0.5 })));
  poleMesh.frustumCulled = false;
  g.add(poleMesh);
  const lampMesh = new Mesh(own(merge(heads)), ownM(new MeshBasicMaterial({ color: "#ffd89a", toneMapped: false, fog: false })));
  lampMesh.frustumCulled = false;
  g.add(lampMesh);
  const CARS = 110;
  const carG = own(new BoxGeometry(0.55, 0.32, 0.12));
  const cars = new InstancedMesh(carG, ownM(new MeshBasicMaterial({ toneMapped: false, fog: false })), CARS);
  cars.frustumCulled = false;
  cars.instanceColor = new InstancedBufferAttribute(new Float32Array(CARS * 3), 3);
  const c = new Color();
  for (let i = 0; i < CARS; i++) cars.setColorAt(i, i % 2 ? c.set("#ffe2a8") : c.set("#d1241f"));
  g.add(cars);
  const A = new Vector3();
  const B = new Vector3();
  const S = new Vector3();

  // the three screens (one merged mesh with an id per screen) and their dark bezels
  const sg = [];
  const bez = [];
  SCREENS.forEach((s, id) => {
    const plane = new BoxGeometry(s.w, s.h, 0.05);
    const ids = new Float32Array(plane.attributes.position.count).fill(id);
    plane.setAttribute("aScreen", new BufferAttribute(ids, 1));
    plane.rotateY(s.yaw).translate(s.x, s.y, s.z);
    sg.push(plane);
    bez.push(box(s.w + 0.7, s.h + 0.7, 0.4, 0, 0, -0.18, 0, 0, 0).rotateY(s.yaw).translate(s.x, s.y, s.z));
  });
  const sm_ = ownM(screenMaterial());
  const merged = new BufferGeometry();
  {
    const ps = [];
    const us = [];
    const is = [];
    for (const pl of sg) {
      const nonIdx = pl.toNonIndexed();
      ps.push(...nonIdx.attributes.position.array);
      us.push(...nonIdx.attributes.uv.array);
      is.push(...nonIdx.attributes.aScreen.array);
    }
    merged.setAttribute("position", new BufferAttribute(new Float32Array(ps), 3));
    merged.setAttribute("uv", new BufferAttribute(new Float32Array(us), 2));
    merged.setAttribute("aScreen", new BufferAttribute(new Float32Array(is), 1));
  }
  const screens = new Mesh(own(merged), sm_);
  screens.frustumCulled = false;
  g.add(screens);
  const bezel = new Mesh(own(merge(bez)), ownM(tene({ albedo: "#4a4741", wet: 0.4 })));
  bezel.frustumCulled = false;
  g.add(bezel);
  // MISA, on the nearest screen
  const misa = new Mesh(own(misaGeometry()), ownM(tene({ vertexColors: true, wet: 0.35, albedo: "#ffffff" })));
  misa.frustumCulled = false;
  const s0 = SCREENS[0];
  misa.position.set(s0.x + Math.sin(s0.yaw) * 0.5 + 1.0, s0.y - s0.h / 2 + 0.2, s0.z + Math.cos(s0.yaw) * 0.5);
  misa.rotation.y = s0.yaw;
  misa.scale.setScalar(1.28);
  g.add(misa);

  return {
    group: g,
    // page: 0..1 the cut to the notebook page; flick: a toll's flicker
    tick(t, page, flick) {
      const u = sm_.uniforms;
      u.uPage.value = page;
      u.uFlick.value = flick;
      u.uGlitch.value = page > 0.001 && page < 0.999 ? 1 : 0;
      for (let i = 0; i < CARS; i++) {
        const lane = i % 2;
        const sp = 0.012 + 0.006 * hash(i, 5);
        const s = (((i * 0.0917 + t * sp * (lane ? -1 : 1)) % 1) + 1) % 1;
        expressAt(-1 + 2 * s, A);
        expressAt(-1 + 2 * Math.min(1, s + 0.002), B);
        S.set(B.z - A.z, 0, -(B.x - A.x)).normalize();
        const off = (lane ? -1 : 1) * (1.1 + 1.6 * hash(i, 6));
        D.position.set(A.x + S.x * off, A.y + 0.55, A.z + S.z * off);
        D.rotation.set(0, Math.atan2(B.x - A.x, B.z - A.z), 0);
        D.scale.setScalar(1);
        D.updateMatrix();
        cars.setMatrixAt(i, D.matrix);
      }
      cars.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const x of geos) x.dispose();
      for (const m of mats) m.dispose();
      for (const m of [towers, cars]) m.dispose();
    },
  };
}
void AdditiveBlending;
void sm;
void T;
void limb;
