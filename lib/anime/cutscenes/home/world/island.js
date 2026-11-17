// The real island the cutscene opens on and returns to, as the site draws it: the snow round the dock (a 1 m height field from groundAt), the igloo
// at the home place, the Highway, Mount MujoRush with its amber eyes, ice shards, lanterns and snowflake decals, lit as the live island is lit.
import { BackSide, BufferGeometry, CatmullRomCurve3, CircleGeometry, ConeGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { HIGHWAY } from "../../../../../lib/world/land.js";
import { groundAt } from "../../../../../lib/world/terrain.js";
import { buildStone, EYES } from "../../../../../components/world/land/parts/mujorush-build.js";
import { groundShadow } from "../../../pup.js";
import { iglooGeometry, scopeGeometry } from "../live/farm.js";
import { merge, paint, rgb } from "../live/paper.js";
import { hash } from "../live/parts.js";
import { DOCK } from "../clock.js";

const heightAt = (x, z) => {
  const o = {};
  groundAt(x, z, o);
  return o.h ?? 0;
};

const HOME = { x: 0, z: -8, s: 1.25 };
const SHARDS = [[-2.4, -3.6], [1.5, -4.2], [2.9, -2.1], [-3.2, -1.5], [1.1, -0.9], [-6.8, -6], [4.4, -11.2], [6.8, -3.4], [-6.3, -2.6], [7.6, -8.6], [-9.4, -9.6]];
const SLAB = [-8.4, -3.8];
const LANTERNS = [[0, "#ff6a4d"], [45, "#ffb020"], [135, "#22c55e"], [180, "#06b6d4"], [240, "#4f7cff"], [300, "#e94bff"]];
const SNOW = rgb("#cfcdc0");
const SUN = new Vector3(-14, 26, 12).normalize();
const ROAD = { asphalt: "#3b3a4a", shoulder: "#cfd0dc", centre: "#f2c230", lane: "#ff4d6a" };
const ROAD_Y = 0.04, MARK_Y = 0.06;

const VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  uniform vec3 uSun, uShade, uSunC, uSky;
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    vec3 c = vC * (uShade + uSunC * max(dot(n, uSun), 0.0));
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 0.99);
  }`;
const GLOW_FRAG = /* glsl */ `
  varying vec3 vC;
  void main() { gl_FragColor = vec4(vC, 0.99); }`;
const DOME_FRAG = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uBlue, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; vec3 c = mix(uSky, uBlue, smoothstep(0.02, 0.7, h)); gl_FragColor = vec4(mix(c, uHigh, smoothstep(0.7, 1.0, h)), 0.0); }`;
const DOME_VERT = /* glsl */ `
  varying vec3 vW;
  void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;

function terrain(x0, x1, z0, z1) {
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1, n = nx * nz;
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3), idx = [], o = {};
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = iz * nx + ix, x = x0 + ix, z = z0 + iz;
      groundAt(x, z, o);
      P.set([x, o.h, z], i * 3);
      const k = 0.98 + 0.04 * hash(i, 9);
      C.set([SNOW[0] * k, SNOW[1] * k, SNOW[2] * k], i * 3);
    }
  }
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(P, 3));
  g.setAttribute("color", new Float32BufferAttribute(C, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Winds each triangle so its normal points up: the material culls back faces.
function tri(o, a, b, c, col) {
  const flip = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) < 0;
  const [p, q] = flip ? [c, b] : [b, c];
  o.p.push(...a, ...p, ...q);
  o.c.push(...col, ...col, ...col);
}

function centreline(pts, step) {
  const curve = new CatmullRomCurve3(pts.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  const P = curve.getSpacedPoints(Math.max(2, Math.round(curve.getLength() / step)));
  let s = 0;
  return P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    if (i) s += Math.hypot(p.x - a.x, p.z - a.z);
    return { x: p.x, z: p.z, nx: -(b.z - a.z) / L, nz: (b.x - a.x) / L, s };
  });
}

function band(o, P, o0, o1, lift, hex, on = () => true) {
  const col = rgb(hex);
  const at = (p, k) => {
    const x = p.x + p.nx * k, z = p.z + p.nz * k;
    return [x, heightAt(x, z) + lift, z];
  };
  for (let i = 0; i + 1 < P.length; i++) {
    if (!on(P[i].s)) continue;
    const a = at(P[i], o0), b = at(P[i], o1), c = at(P[i + 1], o0), d = at(P[i + 1], o1);
    tri(o, a, c, b, col);
    tri(o, b, c, d, col);
  }
}

function ring(o, m, rIn, rOut, lift, hex, n) {
  const col = rgb(hex);
  const at = (r, k) => {
    const a = (k / n) * Math.PI * 2, x = m.x + r * Math.cos(a), z = m.z + r * Math.sin(a);
    return [x, heightAt(x, z) + lift, z];
  };
  for (let k = 0; k < n; k++) {
    const a = at(rIn, k), b = at(rOut, k), c = at(rIn, k + 1), d = at(rOut, k + 1);
    tri(o, a, c, b, col);
    tri(o, b, c, d, col);
  }
}

function plate(o, x0, x1, z0, z1, lift, hex) {
  const col = rgb(hex), nx = Math.round(x1 - x0), nz = Math.round(z1 - z0);
  const at = (i, j) => {
    const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
    return [x, heightAt(x, z) + lift, z];
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      tri(o, a, b, c, col);
      tri(o, b, d, c, col);
    }
  }
}

function roadGeo() {
  const o = { p: [], c: [] }, hw = HIGHWAY.width / 2, cones = [];
  const dash = (s) => s % 1.6 < 0.9;
  HIGHWAY.legs.forEach((leg, li) => {
    const P = centreline(leg, 0.2);
    band(o, P, -hw, -hw + 0.3, ROAD_Y, ROAD.shoulder);
    band(o, P, hw - 0.3, hw, ROAD_Y, ROAD.shoulder);
    band(o, P, -hw + 0.3, hw - 0.3, ROAD_Y, ROAD.asphalt);
    band(o, P, -0.06, 0.06, MARK_Y, ROAD.centre);
    band(o, P, 1.53, 1.67, MARK_Y, ROAD.lane, dash);
    band(o, P, -1.67, -1.53, MARK_Y, ROAD.lane, dash);
    if (li) return;
    for (let k = 0; k < 6; k++) {
      const p = P[Math.floor(hash(k, 7) * (P.length - 1))], d = k % 2 ? 3.3 : -3.3;
      const x = p.x + p.nx * d, z = p.z + p.nz * d;
      cones.push(paint(new ConeGeometry(0.12, 0.35, 8).translate(x, heightAt(x, z) + 0.175, z), "#ff7a2a", 0.02, k));
    }
  });
  const R = HIGHWAY.roundabout;
  ring(o, R, R.radius - R.width / 2, R.radius + R.width / 2, ROAD_Y, ROAD.asphalt, 48);
  const C = HIGHWAY.carPark;
  plate(o, C.x - C.w / 2, C.x + C.w / 2, C.z - C.d / 2, C.z + C.d / 2, ROAD_Y, ROAD.asphalt);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(o.p, 3));
  g.setAttribute("color", new Float32BufferAttribute(o.c, 3));
  g.computeVertexNormals();
  return merge([g, ...cones]);
}

function shardGeo() {
  const list = SHARDS.map(([x, z], i) => {
    const r = 0.4 + 0.8 * hash(i, 3), y = heightAt(x, z);
    return paint(new IcosahedronGeometry(1, 0).scale(r, r * 0.55, r * 0.8).rotateY(hash(i, 4) * 6.3).translate(x, y + r * 0.1, z), "#d9e6f6", 0.03, 40 + i);
  });
  const [x, z] = SLAB;
  list.push(paint(new IcosahedronGeometry(1, 0).scale(1.1, 0.3, 0.8).rotateY(0.4).translate(x, heightAt(x, z) + 0.06, z), "#3d6f8a", 0.02, 60));
  return merge(list);
}

function lanternGeo() {
  return merge(LANTERNS.map(([deg, hex], i) => {
    const a = (deg * Math.PI) / 180, x = HOME.x + 5.6 * Math.cos(a), z = HOME.z + 5.6 * Math.sin(a);
    return paint(new SphereGeometry(0.24, 10, 8).translate(x, heightAt(x, z) + 0.5, z), hex, 0.02, 80 + i);
  }));
}

function flakeGeo() {
  const list = [];
  for (let k = 0, n = 0; n < 8 && k < 400; k++) {
    const x = -7 + 14 * hash(k, 31), z = -13 + 11 * hash(k, 32);
    if (Math.hypot(x - HOME.x, z - HOME.z) < 3.9 || Math.hypot(x - DOCK[0], z - DOCK[2]) < 2.2) continue;
    n++;
    for (let j = 0; j < 3; j++) {
      list.push(paint(new PlaneGeometry(0.5, 0.06).rotateX(-Math.PI / 2).rotateY((j * Math.PI) / 3 + hash(k, 33)).translate(x, heightAt(x, z) + 0.03, z), "#9ad8ee", 0.02, 90 + k));
    }
  }
  return merge(list);
}

function eyeGeo() {
  return merge(EYES.map((e, i) => paint(new CircleGeometry(0.32, 14).rotateX(e.rx).translate(e.x, e.y, e.z + e.sz + 0.02), "#ffb347", 0, 100 + i)));
}

export function buildIsland() {
  const group = new Group(), land = new Group();
  land.position.set(-DOCK[0], 0, -DOCK[2]);
  group.add(land);
  const made = [];
  const mat = () => {
    const m = new ShaderMaterial({
      uniforms: {
        uSun: { value: SUN },
        uShade: { value: new Vector3(0.64, 0.7, 0.92) },
        uSunC: { value: new Vector3(0.62, 0.56, 0.44) },
        uSky: { value: new Vector3(...rgb("#c4def2")) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });
    made.push(m);
    return m;
  };
  const glow = () => {
    const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: GLOW_FRAG });
    made.push(m);
    return m;
  };
  const snowM = mat();
  const home = new Group();
  home.position.set(HOME.x, heightAt(HOME.x, HOME.z), HOME.z);
  home.scale.setScalar(HOME.s);
  const turret = new Group();
  turret.position.set(0, 4.55, 0);
  const igloo = new Mesh(iglooGeometry(), mat()), scope = new Mesh(scopeGeometry(), mat());
  turret.add(scope);
  const hearth = new Mesh(paint(new CircleGeometry(0.5, 16).translate(0, 0.36, 4.02), "#ffd990", 0.02, 50), glow());
  home.add(igloo, turret, hearth);
  land.add(new Mesh(terrain(-62, 40, -62, 30), snowM), home);

  const stone = buildStone();
  land.add(
    new Mesh(shardGeo(), mat()),
    new Mesh(roadGeo(), mat()),
    new Mesh(lanternGeo(), glow()),
    new Mesh(flakeGeo(), glow()),
    new Mesh(stone.stone, mat()),
    new Mesh(paint(stone.inlay, "#2a2d3c", 0.02, 21), glow()),
  );
  if (EYES.length) land.add(new Mesh(eyeGeo(), glow()));

  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({
    uniforms: {
      uSky: { value: new Vector3(...rgb("#cfe3f3")) },
      uBlue: { value: new Vector3(...rgb("#a4d0ee")) },
      uHigh: { value: new Vector3(...rgb("#f4dde6")) },
    },
    vertexShader: DOME_VERT,
    fragmentShader: DOME_FRAG,
    side: BackSide,
    depthWrite: false,
  }));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);

  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);

  const page = (on, pupVisible) => {
    land.visible = !on;
    dome.visible = !on;
    shadow.visible = !on && pupVisible;
  };
  const dispose = () => {
    group.traverse((x) => {
      x.geometry?.dispose();
      if (x.material) x.material.dispose();
    });
    for (const m of made) m.dispose();
  };
  return { group, page, dispose };
}
