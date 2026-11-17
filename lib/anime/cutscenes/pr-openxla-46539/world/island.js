// The XLA Geyser island, as the site draws it: the site's own pure land builders (read only) plus the sinter mound, the dam and
// powerhouse, the Highway roundabout and the signpost of the live shot (verification/live/pr-openxla-46539, tiles 1 and 17-24).
// The page hides the island; reveal(k) brings its pieces back in rank order as the page tears.
import { BackSide, BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, FrontSide, Group, Mesh, RingGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { buildConcreteWall, POWERHOUSE } from "../../../../../components/world/land/parts/dam-wall.js";
import { buildSkin } from "../../../../../components/world/land/parts/google-range.js";
import { buildStone } from "../../../../../components/world/land/parts/mujorush-build.js";
import { fbm, groundAt } from "../../../../../lib/world/terrain.js";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { HIGHWAY } from "../../../../../lib/world/land.js";
import { groundShadow } from "../../../pup.js";
import { hash, idSafe } from "../live/support.js";
import { tone } from "../tone.js";

const lin = (hex) => new Color(hex);
const SNOW = lin("#f0f2f7"), COOL = lin("#e4e7f2"), WET = lin("#bccad8"), ROCK = lin("#978a84"), ROCK_LIT = lin("#b9aea8");
const ICE = lin("#9fcfeb"), ICE_DEEP = lin("#62abd9"), GLACIER = lin("#d3e9f6"), BED = lin("#7aa0b3"), BED_DEEP = lin("#2b5a72");
const SUN = new Vector3(-14, 26, 12).normalize();
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const VENT = { x: -12, z: -24 };
const ROUND = HIGHWAY.roundabout;

const LAND_F = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  uniform float uGloss, uUnlit; uniform vec3 uSun, uShade, uSunC, uSky;
  void main() {
    vec3 c = vC;
    if (uUnlit < 0.5) {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(cameraPosition - vW);
      c *= uShade + uSunC * max(dot(n, uSun), 0.0);
      c = mix(c, uSky, uGloss * (0.06 + 0.5 * pow(1.0 - max(dot(n, v), 0.0), 3.0)));
    }
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    gl_FragColor = vec4(c, 0.99);
  }`;
const LAND_V = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * w; }`;
const DOME_F = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;
const DOME_V = /* glsl */ `varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const STEAM_V = /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const STEAM_F = /* glsl */ `uniform vec3 uCol; uniform float uA; void main() { gl_FragColor = vec4(uCol, uA); }`;

// the height field round the vent on a 1 m grid: snow on the plain, one flat colour a facet on the relief (the site's own rule)
function terrain(x0, x1, z0, z1) {
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1, n = nx * nz, P = new Float32Array(n * 3), G = new Array(n), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix, z = z0 + iz;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h - (o.stuff === 3 && o.mount > 0.02 ? 0.5 : 0), z], i * 3);
    G[i] = { gap: o.gap, mount: o.mount, stuff: o.stuff, glacier: o.glacier };
  }
  const pos = [], nor = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const g = G[i0], h = (A.y + B.y + C.y) / 3, x = (A.x + B.x + C.x) / 3, z = (A.z + B.z + C.z) / 3, relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    if (g.gap < 0 && h < -0.25) c.copy(BED).lerp(BED_DEEP, s01(-0.9, -2.6, h));
    else if (relief && g.mount > 0.2) {
      const steep = s01(0.8, 0.62, N.y);
      if (g.stuff === 1) { c.copy(steep > 0.45 ? ICE : SNOW).lerp(ICE_DEEP, steep > 0.45 ? s01(0.55, 0.2, N.y) : 0); if (g.glacier > 0.5) c.copy(steep > 0.7 ? ICE : GLACIER); }
      else c.copy(N.y < 0.52 ? ROCK_LIT : SNOW).lerp(ROCK, N.y < 0.52 ? 0.4 + 0.6 * rnd(i0, 1.7) : 0);
    } else {
      c.copy(SNOW).lerp(COOL, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
      if (g.gap < 1.8) c.lerp(WET, s01(1.8, 0, g.gap) * 0.85);
    }
    for (const v of [A, B, C]) { pos.push(v.x, v.y, v.z); nor.push(...(relief ? [N.x, N.y, N.z] : [0, 1, 0])); col.push(c.r, c.g, c.b); }
  };
  for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
    const a = iz * nx + ix, b = a + 1, cc = a + nx, d = cc + 1, y = (i) => P[i * 3 + 1];
    if (Math.abs(y(a) - y(d)) < Math.abs(y(b) - y(cc))) { tri(a, cc, d); tri(a, d, b); } else { tri(a, cc, b); tri(b, cc, d); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

// the site's geometry painted one colour (multiplied into any baked vertex colour), so several parts draw as one mesh
function paint(g, hex) {
  const c = lin(hex), n = g.attributes.position.count, old = g.attributes.color, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r * (old ? old.getX(i) : 1), c.g * (old ? old.getY(i) : 1), c.b * (old ? old.getZ(i) : 1)], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

// several painted geometries as one: [geometry, matrix] pairs, keeping position, normal and colour
function merged(parts) {
  const out = { position: [], normal: [], color: [] }, size = {}, g = new BufferGeometry();
  for (const [geo, m] of parts) {
    const x = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) x.applyMatrix4(m);
    for (const k in out) {
      const a = x.attributes[k], n = x.attributes.position.count * (size[k] ??= a?.itemSize ?? 3);
      for (let i = 0; i < n; i++) out[k].push(a ? a.array[i] : i % 3 === 1 ? 1 : 0);
    }
    x.dispose(); geo.dispose();
  }
  for (const k in out) g.setAttribute(k, new Float32BufferAttribute(out[k], size[k]));
  return g;
}

const ground = (x, z) => { const o = {}; groundAt(x, z, o); return o.h; };
const at = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => geo.rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);

// a flat ribbon along a polyline (x, z pairs) of width w, lying on the ground
function ribbon(pts, w) {
  const pos = [], idx = [];
  pts.forEach(([x, z], i) => {
    const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)];
    let dx = bx - ax, dz = bz - az;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    const nx = (-dz * w) / 2, nz = (dx * w) / 2, y = ground(x, z) + 0.05;
    pos.push(x + nx, y, z + nz, x - nx, y, z - nz);
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

// the dashes of a polyline: a short box every `every` metres, aligned to the segment
function dashes(pts, every, len) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
    for (let s = every / 2; s < L; s += every) {
      const x = ax + ((bx - ax) * s) / L, z = az + ((bz - az) * s) / L;
      out.push([new BoxGeometry(len, 0.02, 0.18), x, ground(x, z) + 0.06, z, ang - Math.PI / 2]);
    }
  }
  return out;
}

export function buildIsland() {
  const dock = dockPoint(PLACE_BY_ID["pr-openxla-46539"]), group = new Group(), land = new Group(), made = [], pieces = [];
  land.position.set(-dock.x, 0, -dock.z);
  group.add(land);
  const mats = [];
  const landMat = (unlit = 0, shade = [0.64, 0.7, 0.92], sunC = [0.47, 0.36, 0.08]) => { const m = tone(new ShaderMaterial({ uniforms: { uSun: { value: SUN }, uSunC: { value: new Vector3(...sunC) }, uShade: { value: new Vector3(...shade) }, uSky: { value: lin("#a4d0ee") }, uGloss: { value: 0 }, uUnlit: { value: unlit } }, vertexShader: LAND_V, fragmentShader: LAND_F, side: FrontSide })); mats.push(m); return m; };
  const mesh = (geo, m, parent = land) => { const x = new Mesh(geo, m); x.frustumCulled = false; parent.add(x); made.push(geo); return x; };
  const piece = (obj, rank) => { obj.rank = rank; pieces.push(obj); return obj; };

  const terr = mesh(terrain(-60, 30, -60, 10), landMat());
  terr.rank = 0;
  pieces.push(terr);

  const cone = at(new CylinderGeometry(0.36, 2.4, 3.4, 9), VENT.x, ground(VENT.x, VENT.z) + 1.7, VENT.z);
  const rim = paint(at(new CylinderGeometry(1.49, 1.63, 0.22, 12), VENT.x, ground(VENT.x, VENT.z) + 3.29, VENT.z), "#10d9a0");
  const vent = paint(at(new CylinderGeometry(1.01, 1.2, 0.4, 12), VENT.x, ground(VENT.x, VENT.z) + 3.4, VENT.z), "#3a3338");
  const mound = paint(cone, "#c08a5e");
  piece(mesh(merged([[mound]]), landMat()), hash(31, 9));
  piece(mesh(merged([[vent]]), landMat()), hash(32, 9));
  piece(mesh(merged([[rim]]), landMat(1)), hash(33, 9));

  const wall = buildConcreteWall();
  const conc = (g, hex) => paint(g, hex);
  const dam = merged([
    [conc(wall.body, "#e5e7eb"), null], [conc(wall.road, "#2f2f38"), null], [conc(wall.accent, "#ff8a3d"), null],
    [conc(wall.bathtub, "#f0f2f7"), null], [conc(wall.plant, "#f3f4f6"), null], [conc(wall.plantRed, "#ef4444"), null],
  ]);
  piece(mesh(dam, landMat(0, [1.0, 0.84, 0.86], [0.3, 0.26, 0.2])), hash(34, 9));
  piece(mesh(merged([[conc(wall.lamps, "#fff1c9"), null], [conc(wall.windows, "#ffe9b0"), null]]), landMat(1)), hash(35, 9));
  const turb = new CylinderGeometry(0.85, 0.85, 0.16, 8).rotateY(POWERHOUSE.angle).rotateX(Math.PI / 2).translate(POWERHOUSE.x + Math.sin(POWERHOUSE.angle) * 1.35, 2.23, POWERHOUSE.z + Math.cos(POWERHOUSE.angle) * 1.35);
  piece(mesh(merged([[paint(turb, "#3a3338"), null]]), landMat()), hash(36, 9));

  const rx = ROUND.x, rz = ROUND.z, rg = ground(rx, rz);
  const ring = paint(new RingGeometry(4.75, 8.75, 48).rotateX(-Math.PI / 2).translate(rx, rg + 0.04, rz), "#34343e");
  const grass = paint(new CircleGeometry(4.75, 32).rotateX(-Math.PI / 2).translate(rx, rg + 0.05, rz), "#7ccf6a");
  const white = [], pink = [], cars = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; white.push(at(new BoxGeometry(0.9, 0.02, 0.22), rx + 6.75 * Math.cos(a), rg + 0.07, rz + 6.75 * Math.sin(a), 0, -(a + Math.PI / 2))); }
  for (const r of [8.4, 5.1]) for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + r; pink.push(at(new BoxGeometry(0.7, 0.02, 0.18), rx + r * Math.cos(a), rg + 0.07, rz + r * Math.sin(a), 0, -(a + Math.PI / 2))); }
  const carCols = ["#ff5a5a", "#ffd23a", "#5aa0ff", "#7ccf6a"];
  for (let i = 0; i < 14; i++) { const a = hash(i, 71) * Math.PI * 2, r = 6.75; cars.push(paint(at(new BoxGeometry(0.5, 0.25, 0.25), rx + r * Math.cos(a), rg + 0.22, rz + r * Math.sin(a), 0, -(a + Math.PI / 2)), carCols[i % 4])); }
  const leg = HIGHWAY.legs[0];
  const road = paint(ribbon(leg, 7), "#34343e");
  const legDash = dashes(leg, 2.4, 1.2).map(([g, x, y, z, ry]) => paint(at(g, x, y, z, 0, ry), "#f2c230"));
  piece(mesh(merged([[paint(ring, "#34343e"), null], [grass, null], [road, null], ...white.map((g) => [paint(g, "#ffffff"), null]), ...pink.map((g) => [paint(g, "#ff4f7a"), null]), ...cars.map((g) => [g, null]), ...legDash.map((g) => [g, null])]), landMat()), hash(37, 9));

  // the carved-seal rock (MujoRush) and the painted range: both land in the wide frame (checked against LENS.w, verts in view 73,814 and 3,937)
  const stone = buildStone().stone;
  if (!stone.attributes.color) paint(stone, "#b9aea8");
  piece(mesh(stone, landMat()), hash(40, 9));
  const skin = buildSkin();
  if (!skin.attributes.color) paint(skin, "#b9aea8");
  piece(mesh(skin, landMat()), hash(41, 9));

  const post = paint(at(new BoxGeometry(0.18, 2.0, 0.18), -16.2, 1.0 + ground(-16.2, -22.4), -22.4), "#8a5a3c");
  const board = paint(at(new BoxGeometry(1.1, 0.5, 0.1), -16.2, 1.85 + ground(-16.2, -22.4), -22.4), "#ff6fa8");
  const cones = [paint(at(new ConeGeometry(0.22, 0.6, 8), -17, 0.3 + ground(-17, -21.6), -21.6), "#ff8a3d"), paint(at(new ConeGeometry(0.22, 0.6, 8), -17.6, 0.3 + ground(-17.6, -21.2), -21.2), "#ff8a3d")];
  const buoy = paint(at(new TorusGeometry(0.28, 0.09, 8, 16), -17.4, 0.5 + ground(-17.4, -20.6), -20.6, Math.PI / 2), "#e24a3b");
  const lampPole = paint(at(new CylinderGeometry(0.07, 0.09, 5.4, 6), -16.3, 2.7 + ground(-16.3, -20.2), -20.2), "#1f3a2c");
  piece(mesh(merged([[post, null], [board, null], ...cones.map((g) => [g, null]), [buoy, null], [lampPole, null]]), landMat()), hash(38, 9));

  const dome = new Mesh(new SphereGeometry(900, 24, 12), tone(new ShaderMaterial({ uniforms: { uSky: { value: lin("#cfe3f3") }, uHigh: { value: lin("#a4d0ee") } }, vertexShader: DOME_V, fragmentShader: DOME_F, side: BackSide, depthWrite: false })));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);

  const steam = [];
  for (let k = 0; k < 5; k++) {
    const m = tone(idSafe(new ShaderMaterial({ uniforms: { uCol: { value: lin("#fff4e6") }, uA: { value: 0.9 } }, vertexShader: STEAM_V, fragmentShader: STEAM_F, transparent: true, depthWrite: false })));
    mats.push(m);
    const s = new Mesh(new SphereGeometry(1, 10, 8), m);
    s.frustumCulled = false;
    land.add(s);
    made.push(s.geometry);
    s.userData.k = k;
    steam.push(piece(s, hash(39 + k, 9)));
  }

  const state = { on: false, k: 0, pup: true };
  const su = dome.material.uniforms, own = [su.uSky.value.clone(), su.uHigh.value.clone()], paper = lin("#ece5d2");
  const apply = () => {
    land.visible = !state.on || state.k > 0;
    for (const p of pieces) if (p !== terr) p.visible = !state.on || p.rank < state.k;
    shadow.visible = (!state.on || state.k > 0) && state.pup;
    const pg = state.on && state.k < 1;
    su.uSky.value.copy(pg ? paper : own[0]);
    su.uHigh.value.copy(pg ? paper : own[1]);
  };
  apply();

  return {
    group,
    page(on = false, pupVisible = true) { state.on = !!on; state.pup = pupVisible; apply(); },
    reveal(k = 1) { state.k = Math.min(1, Math.max(0, k)); apply(); },
    update(t) {
      for (const s of steam) {
        const uu = (t / 3.4 + s.userData.k / 5) % 1;
        s.position.set(VENT.x, ground(VENT.x, VENT.z) + 3.7 + 4.6 * uu, VENT.z);
        s.scale.setScalar(0.3 + 0.9 * uu);
        s.material.uniforms.uA.value = 0.9 * (1 - uu);
      }
    },
    dispose() { for (const x of made) x.dispose(); for (const m of mats) m.dispose(); },
  };
}
