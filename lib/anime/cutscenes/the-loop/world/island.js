// The Triton shore the loop cut is drawn over: the site's own pure builders, lit as the island is lit. Shown at B0 and B9 only (set).
import { BackSide, BufferGeometry, Color, DoubleSide, FrontSide, Float32BufferAttribute, Group, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { buildCalver, buildTriton, CALVERS } from "../../../../../components/world/land/parts/triton-glacier.js";
import { buildSkin } from "../../../../../components/world/land/parts/google-range.js";
import { fbm, groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";
import { groundShadow } from "../../../pup.js";
import { DOCK } from "../clock.js";

const lin = (hex) => new Color(hex);
const K = { snow: lin("#fcf0e9"), snowCool: lin("#f6ebe8"), rock: lin("#474853"), rockLit: lin("#62636f"), iceFace: lin("#9fcfeb"), iceDeep: lin("#62abd9"), glacier: lin("#d3e9f6"), wet: lin("#bccad8"), bed: lin("#7aa0b3"), bedDeep: lin("#2b5a72") };
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

const FRAG = /* glsl */ `
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
const VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_F = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;

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

// several of the site's geometries as one draw: [geometry, its matrix], keeping position, normal and colour
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

export function buildIsland(ctx) {
  const group = new Group(), land = new Group(), made = [];
  group.name = "the-loop-island";
  group.userData.layer = 0;
  land.position.set(-DOCK[0], 0, -DOCK[2]);
  group.add(land);
  const sky = lin("#a4d0ee"), base = { uSun: { value: new Vector3(-14, 26, 12).normalize() }, uSky: { value: lin("#c4def2") } };
  const mat = (o = {}) => { const m = new ShaderMaterial({ uniforms: { ...base, uShade: { value: new Vector3(0.5, 0.56, 0.8) }, uSunC: { value: new Vector3(0.62, 0.56, 0.44) }, uGloss: { value: 0 }, uUnlit: { value: 0 }, ...o.u }, vertexShader: VERT, fragmentShader: FRAG, side: o.side ?? FrontSide }); made.push(m); return m; };
  const add = (g, m, parent = land) => { const x = new Mesh(g, m); x.frustumCulled = false; parent.add(x); made.push(g); return x; };
  const tri = buildTriton(), ice = mat({ u: { uGloss: { value: 1 }, uShade: { value: new Vector3(0.58, 0.66, 0.9) }, uSunC: { value: new Vector3(0.6, 0.55, 0.44) } } });
  add(terrain(-46, 80, -128, -34), mat({ u: { uShade: { value: new Vector3(0.64, 0.7, 0.92) } } }));
  add(buildSkin(), mat());
  add(merged([[tri.ice], ...CALVERS.map((c) => [buildCalver(), new Matrix4().makeRotationY(c.yaw).setPosition(c.x, c.base, c.z)])]), ice);
  const water = new PlaneGeometry(90, 70).rotateX(-Math.PI / 2);
  water.setAttribute("color", new Float32BufferAttribute(new Array(4).fill([...lin("#37b4c8")]).flat(), 3));
  add(merged([[tri.glow], [water, new Matrix4().makeTranslation(-10, WATER_Y, -62)]]), mat({ u: { uUnlit: { value: 1 } }, side: DoubleSide }));
  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({ uniforms: { uSky: { value: lin("#cfe3f3") }, uHigh: { value: sky } }, vertexShader: "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }", fragmentShader: SKY_F, side: BackSide, depthWrite: false }));
  dome.frustumCulled = false; dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);
  return {
    group,
    set(on, pupShadow) { group.visible = on; shadow.visible = on && pupShadow; },
    update() {},
    dispose() { for (const x of made) x.dispose(); },
  };
}
