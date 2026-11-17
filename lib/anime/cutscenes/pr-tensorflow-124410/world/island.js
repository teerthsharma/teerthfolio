// The island the cutscene opens and closes on: the site's tensorflow dam from its pure builders, the ground round the dock, the dock sign,
// an igloo and a cannon. Lit as the island is lit; the dimension hides it and the tear brings it back in four waves.
import { BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildConcreteWall, buildIceWall } from "../../../../../components/world/land/parts/dam-wall.js";
import { fbm, groundAt } from "../../../../../lib/world/terrain.js";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { groundShadow } from "../../../pup.js";

const SNOW = new Color("#fcf0e9"), SNOW_COOL = new Color("#f6ebe8"), ROCK = new Color("#474853"), ROCK_LIT = new Color("#62636f");
const ICE_FACE = new Color("#9fcfeb"), ICE_DEEP = new Color("#62abd9"), GLACIER = new Color("#d3e9f6"), WET = new Color("#bccad8");
const BED = new Color("#7aa0b3"), BED_DEEP = new Color("#2b5a72");
const HORIZON = new Color("#cfe3f3"), HIGH = new Color("#a4d0ee");
const SPAN = 42, STRIP = 21, RING_RGB = [0.753, 0.149, 0.827];

const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

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
    gl_FragColor = vec4(c, 0.99);
  }`;
const SKY_F = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.99); }`;
const RING_F = /* glsl */ `
  uniform float uK; varying vec2 vP;
  void main() {
    float r = length(vP), o = 0.6 + 5.0 * uK, w = 0.35 * (1.0 - uK);
    if (r < o - w || r > o) discard;
    gl_FragColor = vec4(${RING_RGB.map((v) => v.toFixed(3)).join(", ")}, 0.99);
  }`;

// the height field on a 1 m grid: smooth snow on the plain, one flat facet on the relief (the site's own rule)
function terrain(x0, x1, z0, z1) {
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1, n = nx * nz, P = new Float32Array(n * 3), G = new Array(n), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix, z = z0 + iz;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h, z], i * 3);
    G[i] = { gap: o.gap, mount: o.mount, stuff: o.stuff, glacier: o.glacier };
  }
  const pos = [], nor = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const g = G[i0], h = (A.y + B.y + C.y) / 3, x = (A.x + B.x + C.x) / 3, z = (A.z + B.z + C.z) / 3;
    const relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    if (g.gap < 0 && h < -0.25) c.copy(BED).lerp(BED_DEEP, s01(-0.9, -2.6, h));
    else if (relief && g.mount > 0.2) {
      const steep = s01(0.8, 0.62, N.y);
      if (g.stuff === 1) { c.copy(steep > 0.45 ? ICE_FACE : SNOW).lerp(ICE_DEEP, steep > 0.45 ? s01(0.55, 0.2, N.y) : 0); if (g.glacier > 0.5) c.copy(steep > 0.7 ? ICE_FACE : GLACIER); }
      else c.copy(N.y < 0.52 ? ROCK_LIT : SNOW).lerp(ROCK, N.y < 0.52 ? 0.4 + 0.6 * rnd(x, z) : 0);
    } else {
      c.copy(SNOW).lerp(SNOW_COOL, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
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

// position, normal and colour only, non-indexed: the attributes every island piece carries, so the pieces of one wave bucket merge
const flatGeo = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "color") g.deleteAttribute(k);
  return g;
};

// a site geometry gets the colour of its part when it carries none
function paint(geo, hex) {
  if (!geo.attributes.color) {
    const c = new Color(hex), a = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
    geo.setAttribute("color", new BufferAttribute(a, 3));
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

// one coloured piece for a merged prop: non-indexed, no uv, so pieces of different colours share one geometry
const piece = (geo, hex) => paint(geo.toNonIndexed().deleteAttribute("uv"), hex);

function signTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 144;
  const g = c.getContext("2d");
  g.fillStyle = "#fff1d6"; g.fillRect(0, 0, 512, 144);
  g.fillStyle = "#110a22"; g.font = "800 58px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("4 edges to 3", 256, 74);
  const t = new CanvasTexture(c);
  t.magFilter = NearestFilter; t.minFilter = NearestFilter;
  return t;
}

export function buildIsland() {
  const dock = dockPoint(PLACE_BY_ID["pr-tensorflow-124410"]), o = {};
  groundAt(dock.x, dock.z, o);
  const h0 = o.h;
  const group = new Group(), land = new Group();
  land.position.set(-dock.x, -h0, -dock.z);
  group.add(land);
  const x0 = Math.floor(dock.x) - SPAN, buckets = [0, 1, 2, 3].map(() => new Group());
  buckets.forEach((b) => land.add(b));
  const bucketIx = (x) => Math.min(3, Math.max(0, Math.floor(((x - x0) / (2 * SPAN)) * 4)));
  const pieces = buckets.map(() => []);
  const made = [];
  const lit = new ShaderMaterial({ uniforms: { uSun: { value: new Vector3(-14, 26, 12).normalize() }, uShade: { value: new Vector3(0.6, 0.66, 0.9) }, uSunC: { value: new Vector3(0.6, 0.55, 0.44) }, uSky: { value: HORIZON.clone() } }, vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide });
  made.push(lit);
  // every island piece shares the one material, so a wave bucket is one merged mesh (see the merge before the shadow)
  const add = (geo, bucket) => {
    geo.computeBoundingBox();
    const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
    pieces[bucket ?? bucketIx(cx)].push(geo);
    made.push(geo);
  };
  for (let q = 0; q < 4; q++) add(terrain(x0 + q * STRIP, x0 + (q + 1) * STRIP, Math.floor(dock.z) - 60, Math.floor(dock.z) + 20), q);

  const dam = buildConcreteWall();
  const parts = [["body", "#f0d0c8"], ["road", "#33302f"], ["accent", "#ff8f00"], ["plant", "#f3f4f6"], ["plantRed", "#ef4444"], ["bathtub", "#fcf0e9"], ["lamps", "#ff8a1a"], ["windows", "#ff8a1a"]];
  for (const [k, hex] of parts) if (dam[k]) add(paint(dam[k], hex));
  add(paint(buildIceWall(), "#62abd9"));

  const sx = dock.x - 2.4, sz = dock.z - 0.9, so = {};
  groundAt(sx, sz, so);
  const post = paint(new CylinderGeometry(0.08, 0.08, 2.2, 6).translate(sx, so.h + 1.1, sz), "#5b5560");
  add(post);
  const board = new Mesh(new PlaneGeometry(2.4, 0.7).rotateY(0.4).translate(sx, so.h + 1.9, sz), new MeshBasicMaterial({ map: signTexture(), toneMapped: false, side: DoubleSide }));
  board.frustumCulled = false;
  buckets[bucketIx(sx)].add(board);
  made.push(board.geometry, board.material);

  const bw = paint(new BoxGeometry(2.2, 0.25, 1.4).rotateZ(0.2).translate(sx + 1.6, so.h + 0.12, sz), "#d8a066");
  add(bw);

  // the middle distance and the low objects the live opening shows: a pylon, a pink-and-green gazebo, a magenta ball, a pale egg
  const pyG = (x, z) => {
    const o = {};
    groundAt(x, z, o);
    return [piece(new BoxGeometry(0.5, 7, 0.5).translate(x, o.h + 3.5, z), "#6b5bd0"), piece(new BoxGeometry(3, 0.35, 0.35).translate(x, o.h + 6, z), "#6b5bd0")];
  };
  add(mergeGeometries(pyG(dock.x - 12, dock.z - 6), false));
  const gz = (x, z) => {
    const o = {}, p = [];
    groundAt(x, z, o);
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) p.push(piece(new BoxGeometry(0.22, 2.2, 0.22).translate(x + dx, o.h + 1.1, z + dz), "#7ad39a"));
    p.push(piece(new ConeGeometry(1.6, 1.0, 8).translate(x, o.h + 2.7, z), "#e7a1c8"));
    return p;
  };
  add(mergeGeometries(gz(dock.x + 7, dock.z - 9), false));
  const bx = dock.x - 5.5, bz = dock.z + 3, bo = {};
  groundAt(bx, bz, bo);
  add(paint(new SphereGeometry(0.7, 12, 8).translate(bx, bo.h + 0.7, bz), "#c026d3"));
  const ex = dock.x - 3, ez = dock.z + 3.5, eo = {};
  groundAt(ex, ez, eo);
  add(paint(new SphereGeometry(0.6, 12, 8).scale(1, 1.4, 1).translate(ex, eo.h + 0.85, ez), "#ece8f2"));

  const ix = dock.x - 9.5, iz = dock.z - 3, io = {};
  groundAt(ix, iz, io);
  add(paint(new SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(ix, io.h, iz), "#dfdcec"));
  add(paint(new CylinderGeometry(0.34, 0.34, 3.4, 10).rotateX(0.7).translate(ix, io.h + 3.0, iz + 1.5), "#6fa3d8"));

  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({ uniforms: { uSky: { value: HORIZON.clone() }, uHigh: { value: HIGH.clone() } }, vertexShader: "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }", fragmentShader: SKY_F, side: BackSide, depthWrite: false }));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);

  buckets.forEach((b, i) => {
    const flat = pieces[i].map(flatGeo), merged = mergeGeometries(flat, false);
    for (const geo of merged ? [merged] : flat) {
      made.push(geo);
      const m = new Mesh(geo, lit);
      m.frustumCulled = false;
      b.add(m);
    }
  });

  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);

  const ring = new Mesh(new PlaneGeometry(14, 14).rotateX(-Math.PI / 2).translate(0, 0.04, 0), new ShaderMaterial({ uniforms: { uK: { value: 0 } }, vertexShader: "varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: RING_F, depthWrite: false }));
  ring.visible = false;
  ring.frustumCulled = false;
  group.add(ring);
  made.push(ring.geometry, ring.material);

  const skyU = dome.material.uniforms;
  const page = (on, pupShadow = true) => {
    land.visible = !on;
    dome.visible = !on;
    shadow.visible = pupShadow;
    skyU.uHigh.value.copy(on ? HORIZON : HIGH);
  };
  const ringAt = (k) => {
    ring.visible = k > 0 && k < 1;
    ring.material.uniforms.uK.value = k;
  };
  // k <= 0 is "no tear yet" (all land shows); between 0 and 1 the tear shows ceil(4k) buckets, the live's four waves
  const wave = (k) => buckets.forEach((b, i) => { b.visible = k <= 0 || k >= 1 || Math.ceil(4 * k) > i; });
  return {
    group,
    page,
    wave,
    ring: ringAt,
    dispose() { for (const x of made) x.dispose(); },
  };
}
