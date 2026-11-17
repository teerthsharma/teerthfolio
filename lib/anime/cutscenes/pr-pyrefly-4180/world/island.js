// The pale island the cutscene opens on and returns to, in the lab frame: the dock is the origin. The site's own land from its
// pure builders, read only: the height field and water level (lib/world/terrain.js), the river (lib/world/river.js), the plank
// bridges (the deck rule of components/world/island/build.js), the pyrefly floe funnel and the stranded floes (parts/floes-layout.js).
// Colours given as hex (new Color) show as that hex on screen, since the frame encodes linear to sRGB; rgb() values are linear.
import { AdditiveBlending, BackSide, BoxGeometry, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, FrontSide, Group, IcosahedronGeometry, Matrix4, Mesh, Quaternion, Shape, ShapeGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groundShadow } from "../../../pup.js";
import { buildSkin, CAVE, THROAT } from "../../../../../components/world/land/parts/google-range.js";
import { FLOE, FLOES, N, PIN, PIN_R, PIN_TOP, STRANDED, THREADS } from "../../../../../components/world/land/parts/floes-layout.js";
import { EYE_R } from "../../../../../components/world/land/parts/floes-vortex.js";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { RIVER, riverAt, WHIRLPOOL, waterGap } from "../../../../../lib/world/river.js";
import { fbm, groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";

const rgb = (r, g, b) => new Color(r / 255, g / 255, b / 255);
const K = {
  snow: rgb(215, 209, 193), snowCool: rgb(196, 207, 219), wet: rgb(180, 194, 205),
  rock: rgb(78, 80, 92), rockLit: rgb(104, 106, 120), iceFace: rgb(160, 207, 235), iceDeep: rgb(99, 171, 217), glacier: rgb(212, 233, 246),
  bed: rgb(122, 160, 179), bedDeep: rgb(43, 90, 114),
};
const ICE = rgb(59, 130, 246), HALO = rgb(47, 125, 255).multiplyScalar(0.3), WATER = new Color("#2ea7d7"), EYE = rgb(11, 47, 61);
const CHAR = rgb(67, 67, 76), WOOD = rgb(192, 138, 94), SKY_LOW = rgb(235, 223, 202), SKY_HIGH = rgb(164, 208, 238), PAPER = rgb(236, 229, 210);
const FREEBOARD = 0.07, UPV = new Vector3(0, 1, 0);
const LAND = { x0: -10, x1: 120, z0: -70, z1: 10 };
const MOUTH = 1.3, THROAT_K = ["#1c1530", "#7a3212", "#ffa51f"].map((h) => new Color(h));
const WHITE = rgb(255, 255, 255), FLAKE_BIG = new Color("#3b82f6"), FLAKE_SMALL = new Color("#7996cd");

const LIT_VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIT_FRAG = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  uniform float uUnlit, uAlpha; uniform vec3 uSun, uShade, uSunC, uSky;
  void main() {
    vec3 c = vC;
    if (uUnlit < 0.5) { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; c *= uShade + uSunC * max(dot(n, uSun), 0.0); }
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    gl_FragColor = vec4(c, uAlpha);
  }`;
const SKY_VERT = "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";
const SKY_FRAG = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;

const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

function painted(geo, c) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute("uv");
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(a, 3));
  return g;
}

function terrain() {
  const { x0, x1, z0, z1 } = LAND, nx = x1 - x0 + 1, nz = z1 - z0 + 1, n = nx * nz, P = new Float32Array(n * 3), G = new Array(n), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix, z = z0 + iz;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h - (o.stuff === 3 && o.mount > 0.02 ? 0.5 : 0), z], i * 3);
    G[i] = { gap: o.gap, mount: o.mount, stuff: o.stuff, glacier: o.glacier };
  }
  const pos = [], nor = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), Nn = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3);
    Nn.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const g = G[i0], h = (A.y + B.y + C.y) / 3, x = (A.x + B.x + C.x) / 3, z = (A.z + B.z + C.z) / 3;
    const relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    if (g.gap < 0 && h < -0.25) c.copy(K.bed).lerp(K.bedDeep, s01(-0.9, -2.6, h));
    else if (relief && g.mount > 0.2) {
      const steep = s01(0.8, 0.62, Nn.y);
      if (g.stuff === 1) { c.copy(steep > 0.45 ? K.iceFace : K.snow).lerp(K.iceDeep, steep > 0.45 ? s01(0.55, 0.2, Nn.y) : 0); if (g.glacier > 0.5) c.copy(steep > 0.7 ? K.iceFace : K.glacier); }
      else c.copy(Nn.y < 0.52 ? K.rockLit : K.snow).lerp(K.rock, Nn.y < 0.52 ? 0.4 + 0.6 * rnd(i0, 1.7) : 0);
    } else {
      c.copy(K.snow).lerp(K.snowCool, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
      if (g.gap < 1.8) c.lerp(K.wet, s01(1.8, 0, g.gap) * 0.85);
    }
    for (const v of [A, B, C]) { pos.push(v.x, v.y, v.z); nor.push(...(relief ? [Nn.x, Nn.y, Nn.z] : [0, 1, 0])); col.push(c.r, c.g, c.b); }
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

function riverRibbon() {
  const pos = [], W = RIVER.width, P = RIVER.points;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az, aw = W] = P[i], [bx, bz, bw = W] = P[i + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    const A = [ax + (nx * aw) / 2, az + (nz * aw) / 2], B = [ax - (nx * aw) / 2, az - (nz * aw) / 2];
    const C = [bx - (nx * bw) / 2, bz - (nz * bw) / 2], D = [bx + (nx * bw) / 2, bz + (nz * bw) / 2];
    for (const [x, z] of [A, B, C, A, C, D]) pos.push(x, WATER_Y, z);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return painted(g, WATER);
}

function bridgeParts() {
  const decks = [], dark = [], here = {};
  for (const b of RIVER.bridges) {
    if (b.x < LAND.x0 || b.x > LAND.x1 || b.z < LAND.z0 || b.z > LAND.z1) continue;
    riverAt(b.x, b.z, here);
    const flow = Math.hypot(here.flowX, here.flowZ) || 1;
    const angle = Math.atan2(here.flowX / flow, here.flowZ / flow);
    const span = here.half * 2 + 2.4;
    const piece = (w, h, d, x, y, z) => {
      const g = new BoxGeometry(w, h, d);
      g.translate(x, y, z);
      g.rotateY(angle);
      g.translate(b.x, 0, b.z);
      return g;
    };
    decks.push(painted(piece(span, 0.3, b.width, 0, -0.13, 0), WOOD));
    for (const side of [-1, 1]) {
      dark.push(painted(piece(span, 0.34, 0.22, 0, 0.19, side * (b.width / 2 - 0.11)), CHAR));
      dark.push(painted(piece(0.5, 1.2, b.width + 0.3, side * (span / 2 - 0.5), -0.73, 0), CHAR));
    }
  }
  return [...decks, ...dark];
}

const m4 = new Matrix4(), basis = new Matrix4(), q = new Quaternion(), p = new Vector3(), s = new Vector3();
const world = (pt) => new Vector3(PIN.x + pt[0], pt[1], PIN.z + pt[2]);

function placeFloeLobe(geo, f, at, grow) {
  basis.makeBasis(new Vector3(...f.x), new Vector3(...f.y), new Vector3(...f.z));
  q.setFromRotationMatrix(basis);
  p.copy(world(at));
  s.set(FLOE.lobeX * f.scale * grow, FLOE.thick * f.scale * grow, FLOE.lobeZ * f.scale * grow);
  return geo.applyMatrix4(m4.compose(p, q, s));
}

function placeStick(geo, p0, p1, r) {
  const v = new Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), len = Math.max(0.001, v.length());
  q.setFromUnitVectors(UPV, v.normalize());
  p.copy(world([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2]));
  s.set(r, len, r);
  return geo.applyMatrix4(m4.compose(p, q, s));
}

function funnel() {
  const chip = painted(new IcosahedronGeometry(1, 0), ICE), lobes = [], halos = [], sticks = [];
  const stick = painted(new CylinderGeometry(1, 1, 1, 6, 1), ICE);
  for (let i = 0; i < N; i++) {
    const f = FLOES[i], off = FLOE.lobeOff * f.scale;
    for (const sg of [-1, 1]) {
      const at = [f.c[0] + f.x[0] * off * sg, f.c[1] + f.x[1] * off * sg, f.c[2] + f.x[2] * off * sg];
      lobes.push(placeFloeLobe(chip.clone(), f, at, 1));
      halos.push(placeFloeLobe(chip.clone(), f, at, 1.3));
    }
    const a = [f.c[0] - f.x[0] * off, f.c[1] - f.x[1] * off, f.c[2] - f.x[2] * off], b = [f.c[0] + f.x[0] * off, f.c[1] + f.x[1] * off, f.c[2] + f.x[2] * off];
    sticks.push(placeStick(stick.clone(), a, b, 0.07));
    sticks.push(placeStick(stick.clone(), THREADS[i][0], THREADS[i][1], 0.028));
  }
  const strand = STRANDED.map((st) => {
    const g = chip.clone();
    q.setFromAxisAngle(UPV, st.yaw);
    p.set(st.x, WATER_Y + FREEBOARD, st.z);
    s.set(0.3 * st.scale, 0.16 * st.scale, 0.24 * st.scale);
    return g.applyMatrix4(m4.compose(p, q, s));
  });
  const stack = painted(new CylinderGeometry(PIN_R * 0.7, PIN_R * 1.15, PIN_TOP, 7, 1).translate(PIN.x, PIN_TOP / 2, PIN.z), CHAR);
  return { ice: mergeGeometries([...lobes, ...sticks, ...strand], false), halo: mergeGeometries(halos, false), stack };
}

const soup = (P, C) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new Float32BufferAttribute(P.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute("color", new Float32BufferAttribute(C, 3));
  return g;
};
const tri3 = (P, C, col, ...vs) => { for (const v of vs) { P.push(v[0], v[1], v[2]); C.push(col.r, col.g, col.b); } };

// white foam dashes on the outflow, laid along the flow, a little in from the banks
function foam() {
  const P = [], C = [], here = {};
  for (let i = 0, n = 0; n < 40 && i < 4000; i++) {
    const x = 60 + 22 * rnd(i, 401), z = -40 + 16 * rnd(i, 402);
    riverAt(x, z, here);
    if (!here.inside || waterGap(x, z) > -0.5) continue;
    const s = Math.hypot(here.flowX, here.flowZ) || 1, dx = here.flowX / s, dz = here.flowZ / s;
    const L = 0.9 + 1.3 * rnd(n, 403), w = 0.035, y = WATER_Y + 0.012;
    const q = (u, v) => [x + dx * u - dz * v, y, z + dz * u + dx * v];
    tri3(P, C, WHITE, q(-L / 2, -w), q(L / 2, -w), q(L / 2, w));
    tri3(P, C, WHITE, q(-L / 2, -w), q(L / 2, w), q(-L / 2, w));
    n++;
  }
  return soup(P, C);
}

// the blue snowflake stamps pressed into the snow: six kite arms with a barb each, on land clear of the banks and the bridges
function flakes(dock) {
  const P = [], C = [];
  for (let k = 0, nb = 0, ns = 0; k < 400 && nb + ns < 24; k++) {
    const big = rnd(k, 411) < 0.33;
    if (big ? nb >= 8 : ns >= 16) continue;
    const a0 = 2 * Math.PI * rnd(k, 412), r = 3 + 13 * rnd(k, 413), x = dock.x + r * Math.cos(a0), z = dock.z + r * Math.sin(a0);
    if (waterGap(x, z) < 0.5 || RIVER.bridges.some((b) => Math.hypot(x - b.x, z - b.z) < 3)) continue;
    if (big) nb++; else ns++;
    const L = big ? 1.3 + 0.4 * rnd(k, 414) : 0.5 + 0.3 * rnd(k, 414), y = groundAt(x, z).h + 0.03, rot = 2 * Math.PI * rnd(k, 415), col = big ? FLAKE_BIG : FLAKE_SMALL;
    const at = (ang, s, w) => [x + Math.sin(ang) * s + Math.cos(ang) * w, y, z + Math.cos(ang) * s - Math.sin(ang) * w];
    for (let j = 0; j < 6; j++) {
      const a = rot + (j * Math.PI) / 3, hw = 0.09 * L;
      tri3(P, C, col, at(a, 0, 0), at(a, 0.45 * L, hw), at(a, L, 0));
      tri3(P, C, col, at(a, 0, 0), at(a, L, 0), at(a, 0.45 * L, -hw));
      for (const sg of [-1, 1]) {
        const b = a + (sg * 50 * Math.PI) / 180, B = at(a, 0.55 * L, 0), tip = [B[0] + 0.3 * L * Math.sin(b), y, B[2] + 0.3 * L * Math.cos(b)];
        tri3(P, C, col, at(a, 0.55 * L, -0.05 * L), at(a, 0.55 * L, 0.05 * L), tip);
      }
    }
  }
  return soup(P, C);
}

export function buildIsland() {
  const dock = dockPoint(PLACE_BY_ID["pr-pyrefly-4180"]), group = new Group(), land = new Group(), made = [];
  land.position.set(-dock.x, 0, -dock.z);
  group.add(land);
  const base = { uSun: { value: new Vector3(-14, 26, 12).normalize() }, uSky: { value: SKY_HIGH.clone() } };
  const lit = (shade, sunC, o = {}) => {
    const m = new ShaderMaterial({ uniforms: { ...base, uShade: { value: shade }, uSunC: { value: sunC }, uUnlit: { value: o.unlit ?? 0 }, uAlpha: { value: 0.99 } }, vertexShader: LIT_VERT, fragmentShader: LIT_FRAG, side: o.side ?? FrontSide });
    made.push(m);
    return m;
  };
  const add = (g, m) => {
    const x = new Mesh(g, m);
    x.frustumCulled = false;
    land.add(x);
    made.push(g);
    return x;
  };
  const landMat = lit(new Vector3(0.64, 0.7, 0.92), new Vector3(0.62, 0.56, 0.44));
  add(terrain(), landMat);
  add(buildSkin(), landMat);
  const cave = new Group();
  cave.position.set(CAVE.x, 0, CAVE.z);
  cave.rotation.y = CAVE.turn;
  cave.scale.setScalar(MOUTH);
  [1, 0.64, 0.34].forEach((k, i) => {
    const g = painted(new ShapeGeometry(new Shape(THROAT.map(([x, y]) => ({ x: x * k, y: y * k })))), THROAT_K[i]);
    const m = new Mesh(g, lit(new Vector3(0, 0, 0), new Vector3(0, 0, 0), { unlit: 1 }));
    m.position.z = i * 0.04;
    cave.add(m);
    made.push(g);
  });
  land.add(cave);
  add(riverRibbon(), lit(new Vector3(0, 0, 0), new Vector3(0, 0, 0), { unlit: 1, side: DoubleSide }));
  add(foam(), lit(new Vector3(0, 0, 0), new Vector3(0, 0, 0), { unlit: 1, side: DoubleSide }));
  add(flakes(dock), lit(new Vector3(0, 0, 0), new Vector3(0, 0, 0), { unlit: 1, side: DoubleSide }));
  const { ice, halo, stack } = funnel();
  add(ice, lit(new Vector3(0.58, 0.66, 0.9), new Vector3(0.6, 0.55, 0.44)));
  add(mergeGeometries([stack, ...bridgeParts()], false), landMat);
  add(painted(new CircleGeometry(EYE_R, 20).rotateX(-Math.PI / 2).translate(WHIRLPOOL.x, WATER_Y + 0.012, WHIRLPOOL.z), EYE), lit(new Vector3(0, 0, 0), new Vector3(0, 0, 0), { unlit: 1 }));
  const haloMat = new ShaderMaterial({ uniforms: { uCol: { value: HALO } }, vertexShader: SKY_VERT, fragmentShader: "uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }", side: BackSide, blending: AdditiveBlending, transparent: true, depthWrite: false });
  made.push(haloMat);
  add(halo, haloMat);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);
  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({ uniforms: { uSky: { value: SKY_LOW.clone() }, uHigh: { value: SKY_HIGH.clone() } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false }));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);
  const su = dome.material.uniforms, own = [SKY_LOW.clone(), SKY_HIGH.clone()];
  const page = (on, pupShown = true) => {
    land.visible = !on;
    shadow.visible = !on && pupShown;
    su.uSky.value.copy(on ? PAPER : own[0]);
    su.uHigh.value.copy(on ? PAPER : own[1]);
  };
  return { group, page, dispose() { for (const x of made) x.dispose(); } };
}
