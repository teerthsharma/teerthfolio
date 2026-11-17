// The island the cutscene opens on and returns to: Mount MujoRush's own granite, its carved cliff (mujorush-build.js) and the height field round the dock.
// The seal stands on the dock point; the carved faces' eyes, the banners and the floating boulders are flat colour, as the live draws them.
import { BackSide, BoxGeometry, BufferGeometry, Color, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix3, Matrix4, Mesh, OctahedronGeometry, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { buildStone, EYES, FACES, FLOATERS, CRYSTALS, SPARKS, TALUS, faceZ } from "../../../../../components/world/land/parts/mujorush-build.js";
import { fbm, groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { groundShadow } from "../../../pup.js";
import { glslFor } from "../../../tools/index.js";
import { R } from "../clock.js";
import { HOME, SEA, SHORE } from "./spec.js";

const lin = (hex) => new Color(hex);
const srgb = (hex) => new Color(hex).convertLinearToSRGB(); // flat colours: the shader writes its colour as it is, so it must be the hex
const K = { snow: srgb(HOME.snow), snowCool: srgb("#F3E9EC"), rock: srgb("#8A7C78"), rockLit: srgb(HOME.rock), iceFace: lin("#9fcfeb"), iceDeep: lin("#62abd9"), glacier: lin("#d3e9f6"), wet: lin("#bccad8"), bed: lin("#7aa0b3"), bedDeep: lin("#2b5a72") };
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const PERI = srgb("#8fa7ff");
const NOISE = glslFor(["noise"]); // the table's fbm: the sea ripple and the foam wobble

const FRAG = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  uniform float uUnlit; uniform vec3 uSun, uShade, uSunC, uSky;
  void main() {
    vec3 c = vC;
    if (uUnlit < 0.5) { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; c *= uShade + uSunC * max(dot(n, uSun), 0.0); }
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    gl_FragColor = vec4(c, 0.99);
  }`;
const VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_V = "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";
const SKY_F = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;

const SEA_V = "varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SEA_F = /* glsl */ `
  varying vec2 vP; uniform float uT, uZ0, uZ1, uFoamW; uniform vec3 uB0, uB1, uB2, uFoam, uFar;
  ${NOISE}
  void main() {
    float v = 0.5 + 0.5 * sin(vP.y * 6.0 + 2.0 * fbm(vP * 0.7 + uT * 0.2));
    vec3 c = v < 0.33 ? uB0 : (v < 0.66 ? uB1 : uB2);
    c = mix(c, uFar, 0.06 * (1.0 - smoothstep(uZ0, uZ1, vP.y)));
    float edge = uZ0 + 0.12 * fbm(vec2(vP.x * 1.5, 0.0));
    gl_FragColor = vec4(mix(c, uFoam, step(abs(vP.y - edge), uFoamW)), 0.99);
  }`;

// the height field on a 1 m grid: smooth snow on the plain, one flat colour a facet on the relief (the site's own rule)
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
    if (g.gap < 0 && h < -0.25) c.copy(K.bed).lerp(K.bedDeep, s01(-0.9, -2.6, h));
    else if (relief && g.mount > 0.2) {
      const steep = s01(0.8, 0.62, N.y);
      if (g.stuff === 1) { c.copy(steep > 0.45 ? K.iceFace : K.snow).lerp(K.iceDeep, steep > 0.45 ? s01(0.55, 0.2, N.y) : 0); if (g.glacier > 0.5) c.copy(steep > 0.7 ? K.iceFace : K.glacier); }
      else c.copy(N.y < 0.52 ? K.rockLit : K.snow).lerp(K.rock, N.y < 0.52 ? 0.4 + 0.6 * rnd(i0, 1.7) : 0);
    } else {
      c.copy(K.snow).lerp(K.snowCool, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
      if (g.gap < 1.8) c.lerp(K.wet, s01(1.8, 0, g.gap) * 0.85);
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

// [geometry, matrix, colour] parts merged into one vertex-coloured geometry
function bake(parts) {
  const pos = [], nor = [], col = [], v = new Vector3(), nm = new Matrix3();
  for (const [geo, m, c] of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const P = g.attributes.position, N = g.attributes.normal;
    nm.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  out.setAttribute("color", new Float32BufferAttribute(col, 3));
  return out;
}
const place = (p, rx, ry, rz, s) => new Matrix4().compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(...s));
function paint(geo, c) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new Float32BufferAttribute(a, 3));
  return geo;
}

// one merged geometry of flat footprints (the groundShadow plane, uv 0..1), each matrix placing one
function shadows(list, proto) {
  const g = proto.geometry.toNonIndexed(), P = g.attributes.position, U = g.attributes.uv, pos = [], uv = [], v = new Vector3();
  for (const m of list) for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); uv.push(U.getX(i), U.getY(i)); }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(pos, 3));
  out.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return out;
}

export function buildIsland() {
  const dock = dockPoint(PLACE_BY_ID["pr-mujoco-3396"]), group = new Group(), land = new Group(), made = [];
  land.position.set(-dock.x, 0, -dock.z);
  group.add(land);
  const sun = new Vector3(-14, 26, 12).normalize(), haze = lin("#e6d8d2");
  const shader = (u) => new ShaderMaterial({ uniforms: { uSun: { value: sun }, uSky: { value: haze }, uShade: { value: new Vector3(0.66, 0.63, 0.66) }, uSunC: { value: new Vector3(...HOME.sunC) }, uUnlit: { value: 0 }, ...u }, vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide });
  const stoneMat = shader({}), flatMat = shader({ uUnlit: { value: 1 } });
  const add = (geo, m, parent = land) => { const x = new Mesh(geo, m); x.frustumCulled = false; parent.add(x); made.push(geo); return x; };
  made.push(stoneMat, flatMat);

  add(terrain(-100, -4, -96, -30), stoneMat);
  const cliff = buildStone();
  add(cliff.stone, stoneMat);
  add(paint(cliff.inlay, srgb("#1c1824")), flatMat);
  add(paint(cliff.gems, srgb(FACES[0].place.radiation)), flatMat);
  const glow = srgb(FACES[0].place.radiation);
  glow.multiplyScalar(0.7 / (0.2126 * glow.r + 0.7152 * glow.g + 0.0722 * glow.b)); // the numbers at luma 0.7
  cliff.glows.forEach((g) => add(paint(g, glow), flatMat));

  const ORANGE = srgb("#D9731A"), eyeGeo = paint(new SphereGeometry(1, 20, 14), ORANGE), pupilGeo = paint(new SphereGeometry(1, 20, 14), srgb("#1c1824"));
  made.push(eyeGeo, pupilGeo);
  const eyes = EYES.map((e) => {
    const g = new Group(), m = new Mesh(eyeGeo, flatMat), p = new Mesh(pupilGeo, flatMat);
    g.position.set(e.x, e.y, e.z); g.rotation.x = e.rx; m.frustumCulled = false; p.frustumCulled = false;
    p.position.set(0, 0, 0.62 * e.sz); p.scale.set(0.34 * e.sx, 0.4 * e.sy, 0.55 * e.sz);
    g.add(m, p); land.add(g);
    return { m, p, e };
  });
  const sparks = SPARKS.map((s, i) => {
    const e = EYES[i], m = new Mesh(eyeGeo, flatMat);
    m.position.set(e.x + s.dx, e.y + s.dy, e.z + s.dz); m.scale.setScalar(s.r); land.add(m);
    return { m, r: s.r };
  });

  const BANNER = ["#4f7cff", "#22c55e", "#f59e0b"];
  add(bake(FACES.flatMap((f, i) => {
    const x = f.x + 2.8, z = faceZ(x, 1.5) + 0.7;
    return [[new CylinderGeometry(0.05, 0.06, 3, 6), new Matrix4().makeTranslation(x, 1.5, z), srgb("#43434c")], [new BoxGeometry(0.4, 1, 0.04), new Matrix4().makeTranslation(x + 0.25, 2.35, z), srgb(BANNER[i])]];
  })), flatMat);
  // 14 foreground rocks on the snow between the dock and the lens (the pups' lane kept clear), and 10 seal prints trailing to the lens
  const FORE = [];
  for (let i = 0; FORE.length < 14 && i < 80; i++) {
    const x = (rnd(i, 61) - 0.5) * 11, z = 1.2 + 3.4 * rnd(i, 62);
    if (Math.abs(x + 0.2) < 1.3 && z < 2.2) continue;
    const o = {}, r = 0.12 + 0.28 * rnd(i, 63);
    groundAt(dock.x + x, dock.z + z, o);
    FORE.push({ x: dock.x + x, y: o.h + 0.3 * r, z: dock.z + z, r, rx: rnd(i, 65) * 0.8, ry: rnd(i, 64) * 6.3, sy: 0.7, sz: 0.92 });
  }
  const PRINT = Array.from({ length: 10 }, (_, i) => {
    const x = dock.x + (i % 2 ? 0.18 : -0.18), z = dock.z + 0.6 + (3.6 * i) / 9, o = {};
    groundAt(x, z, o);
    return new Matrix4().makeTranslation(x, o.h + 0.02, z);
  });
  add(bake(TALUS.map((b) => [new IcosahedronGeometry(1, 0), place([b.x, b.y, b.z], b.rx, b.ry, 0, [b.r, b.r * (b.sy ?? 0.78), b.r * (b.sz ?? 0.92)]), lin("#a89c96")]).concat(FORE.map((b) => [new IcosahedronGeometry(1, 0), place([b.x, b.y, b.z], b.rx, b.ry, 0, [b.r, b.r * b.sy, b.r * b.sz]), lin("#a89c96")]))), stoneMat);
  add(bake(PRINT.map((m) => [new BoxGeometry(0.28, 0.02, 0.16), m, srgb("#E2D6DA")])), flatMat);
  add(bake(CRYSTALS.map((c) => [new OctahedronGeometry(1, 0), place([c.x, c.y + c.h * 0.45, c.z], c.tilt * 0.5, c.ry, c.tilt, [c.r, c.h, c.r]), PERI])), flatMat);
  const pose = (b, i, s) => place([b.x, b.y, b.z], b.phase, i, 0.3 * Math.sin(i), s);
  const boulder = lin("#b0a49d").lerp(lin("#8fa7ff"), 0.35);
  add(bake(FLOATERS.map((b, i) => [new IcosahedronGeometry(1, 0), pose(b, i, [b.r, b.r * 0.82, b.r * 0.94]), boulder])), stoneMat);
  add(bake(FLOATERS.map((b, i) => [new OctahedronGeometry(1, 0), pose(b, i, [b.r * 0.42, b.r * 1.45, b.r * 0.42]), PERI])), flatMat);
  add(paint(new PlaneGeometry(90, 70).rotateX(-Math.PI / 2), srgb("#37b4c8")), flatMat).position.set(-10, WATER_Y, -62);
  // the live's blue sea strip under the card (p56 to p60): in group, rig frame, so the burn shows it while the painting hides land
  // SHORE.y (-0.05) sank under the plain's snow (height within 0.1 of 0), so the band sits at 0.12 instead
  const seaZ = (SHORE.z0 + SHORE.z1) / 2, SEA_Y = 0.12;
  // the sea is drawn: three flat bands of ripple, a far-side lift and a foam edge on the shore, all in one shader
  const seaMat = new ShaderMaterial({ uniforms: { uT: { value: 0 }, uZ0: { value: SHORE.z0 }, uZ1: { value: SHORE.z1 }, uFoamW: { value: SEA.foamW }, uB0: { value: lin(SEA.bands[0]) }, uB1: { value: lin(SEA.bands[1]) }, uB2: { value: lin(SEA.bands[2]) }, uFoam: { value: lin(SEA.foam) }, uFar: { value: lin("#5A98B8") } }, vertexShader: SEA_V, fragmentShader: SEA_F, side: DoubleSide });
  made.push(seaMat);
  const shore = [add(new PlaneGeometry(2 * SHORE.x, SHORE.z1 - SHORE.z0).rotateX(-Math.PI / 2).translate(0, SEA_Y, seaZ), seaMat, group)];

  // the orange dock flag on its pole at the foot of the cliff, by the dock
  const flagAt = [dock.x + 2.2, dock.z - 6.5], pole = {};
  groundAt(flagAt[0], flagAt[1], pole);
  add(bake([[new CylinderGeometry(0.05, 0.06, 3, 6), new Matrix4().makeTranslation(flagAt[0], pole.h + 1.5, flagAt[1]), srgb("#43434c")], [new BoxGeometry(0.4, 1, 0.04), new Matrix4().makeTranslation(flagAt[0] + 0.25, pole.h + 2.35, flagAt[1]), srgb("#F59E0B")]]), flatMat);

  // a ground shadow under each floating boulder and each talus rock, one merged mesh
  const shade = groundShadow(1, 1, "#9c93c9", 0.5);
  const footAt = (b, r) => { const o = {}; groundAt(b.x, b.z, o); return new Matrix4().compose(new Vector3(b.x, o.h + 0.04, b.z), new Quaternion(), new Vector3(r, 1, r * 0.7)); };
  const cast = new Mesh(shadows([...FLOATERS.map((b) => footAt(b, b.r)), ...TALUS.map((b) => footAt(b, b.r)), ...FORE.map((b) => footAt(b, b.r))], shade), shade.material);
  cast.frustumCulled = false; land.add(cast); made.push(cast.geometry, shade.material, shade.geometry);

  // 22 radiation-blue snowflake decals, drifting down at 0.15 m/s over the cliff, wrapping on twos
  const FLAKE = Array.from({ length: 22 },(_, i) => ({ x: -70 + 46 * rnd(i, 21), z: -62 + 18 * rnd(i, 22), y: 1 + 10 * rnd(i, 23), s: (0.5 + 0.4 * rnd(i, 25)) / 0.7 }));
  const flakeGeo = bake([0, 60, 120].map((deg) => [new BoxGeometry(1.4, 0.05, 0.05), new Matrix4().makeRotationZ((deg * Math.PI) / 180), srgb("#5B6CFF")]));
  const flakeMat = shader({ uUnlit: { value: 1 } });
  flakeMat.vertexShader = VERT.replace("modelMatrix * vec4(position, 1.0)", "modelMatrix * instanceMatrix * vec4(position, 1.0)");
  flakeMat.needsUpdate = true;
  const flakes = new InstancedMesh(flakeGeo, flakeMat, FLAKE.length), M4 = new Matrix4(), QI = new Quaternion(), SC = new Vector3(), PO = new Vector3();
  flakes.frustumCulled = false; land.add(flakes); made.push(flakeGeo, flakeMat);
  const flakeFrame = (tq) => {
    FLAKE.forEach((f, i) => flakes.setMatrixAt(i, M4.compose(PO.set(f.x, 0.5 + ((((f.y - 0.15 * tq) % 10) + 10) % 10), f.z), QI, SC.setScalar(f.s))));
    flakes.instanceMatrix.needsUpdate = true;
  };
  flakeFrame(0);

  const domeMat = new ShaderMaterial({ uniforms: { uSky: { value: srgb("#cfe3f3") }, uHigh: { value: srgb("#a4d0ee") } }, vertexShader: SKY_V, fragmentShader: SKY_F, side: BackSide, depthWrite: false });
  const dome = new Mesh(new SphereGeometry(900, 24, 12), domeMat);
  dome.frustumCulled = false; dome.renderOrder = -9; group.add(dome);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05); group.add(shadow);
  made.push(domeMat, dome.geometry, shadow.geometry, shadow.material);

  const sky = domeMat.uniforms, own = [sky.uSky.value.clone(), sky.uHigh.value.clone()], INK = srgb("#0D0805");
  // the island is not drawn under the painted dimension; its pup's shadow goes with the pup
  const page = (on, pup = true) => { land.visible = !on; shadow.visible = !on && pup; sky.uSky.value.copy(on ? INK : own[0]); sky.uHigh.value.copy(on ? INK : own[1]); };
  // the final hold's one blink: drawings 8 and 9 of the hold from R.home[1], eyes at 8 percent height
  const update = (t) => {
    const k = Math.floor((t - R.home[1]) * 24 + 1e-6) - 8, shut = k === 0 || k === 1 ? 0.08 : 1;
    for (const { m, p, e } of eyes) { m.scale.set(e.sx, e.sy * shut, e.sz); p.scale.set(0.34 * e.sx, 0.4 * e.sy * shut, 0.55 * e.sz); }
    for (const { m, r } of sparks) m.scale.setScalar(r * shut);
    for (const x of shore) x.visible = t >= R.burn[0] && t < 27.0;
    seaMat.uniforms.uT.value = Math.floor(t * 12 + 1e-6) / 12;
    flakeFrame(Math.floor(t * 12 + 1e-6) / 12);
  };
  return { group, page, update, dispose() { for (const x of made) x.dispose(); } };
}
