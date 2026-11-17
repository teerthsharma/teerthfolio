// The island of pr-polychrom-79: the site's height field round the Fountain plateau, the far ring, the snow terrace and the navy cliff, the river and the pup's shadow, built in the rig frame.
// `page` hides the island while the crimson world takes the frame; `update(t, stand)` moves the flat pup shadow to the stand row.
import { BackSide, BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, RingGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm, groundAt } from "../../../../../lib/world/terrain.js";
import { DOCK, FOUNTAIN_AT, T } from "../clock.js";
import { PAL, lin } from "../pal.js";
import { buildFar, tint } from "./far.js";

const SNOW = PAL.snowDeck, SNOW_COOL = PAL.snowDeck, DOME_LO = PAL.skyLo, DOME_HI = PAL.skyHi;
const FLAT = 9, C = FOUNTAIN_AT, TERRACE = -2.6;
const SUN = new Vector3(-14, 26, 12).normalize(), SHADE = new Vector3(0.64, 0.7, 0.92), SUN_C = new Vector3(0.62, 0.56, 0.44);
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const vec = (hex) => new Vector3(...lin(hex));
const NAVY = [PAL.cliffLo, PAL.cliffHi, PAL.navyDeep, PAL.cliffMid].map((h) => new Color(h)), dustF = new Color(PAL.dustFoot);
const RIVER = [[10.1, -17.6], [12.4, -12.0], [14.2, -7.6], [15.7, -3.9], [16.9, -0.9], [17.9, 1.6]];

const VERT = /* glsl */ `
  varying vec3 vW; varying vec3 vN;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIGHT = /* glsl */ `
  uniform vec3 uSun, uShade, uSunC, uSky;
  varying vec3 vW; varying vec3 vN;
  vec4 lit(vec3 base) {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    vec3 c = base * (uShade + uSunC * max(dot(n, uSun), 0.0));
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    return vec4(c, 0.99);
  }`;
const VERT_VC = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG_VC = /* glsl */ `${LIGHT}
  varying vec3 vC;
  void main() { gl_FragColor = lit(vC); }`;
const FRAG_UNI = /* glsl */ `${LIGHT}
  uniform vec3 uCol;
  void main() { gl_FragColor = lit(uCol); }`;

const sunU = () => ({ uSun: { value: SUN }, uShade: { value: SHADE }, uSunC: { value: SUN_C }, uSky: { value: vec(DOME_LO) } });
const solid = (hex) => new ShaderMaterial({ uniforms: { ...sunU(), uCol: { value: vec(hex) } }, vertexShader: VERT, fragmentShader: FRAG_UNI, side: DoubleSide });
const vertexLit = () => new ShaderMaterial({ uniforms: sunU(), vertexShader: VERT_VC, fragmentShader: FRAG_VC, side: DoubleSide });

// the height field on a 1 m grid: snow on the plain, one flat facet per triangle on the relief (the site's own rule)
function terrain(x0, x1, z0, z1) {
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1, P = new Float32Array(nx * nz * 3), G = new Array(nx * nz), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix, z = z0 + iz;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h - (o.stuff === 3 && o.mount > 0.02 ? 0.5 : 0), z], i * 3);
    G[i] = { mount: o.mount, stuff: o.stuff };
  }
  const pos = [], nor = [], col = [], c = new Color(), snow = new Color(SNOW), snowCool = new Color(SNOW_COOL);
  const A = new Vector3(), B = new Vector3(), Cv = new Vector3(), N = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); Cv.fromArray(P, i2 * 3);
    N.copy(B).sub(A).cross(Cv.clone().sub(A)).normalize();
    const x = (A.x + B.x + Cv.x) / 3, z = (A.z + B.z + Cv.z) / 3, h = (A.y + B.y + Cv.y) / 3 - DOCK[1];
    const relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    if (relief && G[i0].mount > 0.2 && N.y <= 0.85) {
      c.copy(NAVY[Math.floor(rnd(i0, 1.7) * 4) % 4]);
      if (Math.abs(h) < 0.9 || Math.abs(h - TERRACE) < 0.9) c.lerp(dustF, 0.35);
    } else if (relief && G[i0].mount > 0.2) c.copy(snow);
    else c.copy(snow).lerp(snowCool, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
    for (const v of [A, B, Cv]) { pos.push(v.x, v.y, v.z); nor.push(...(relief ? [N.x, N.y, N.z] : [0, 1, 0])); col.push(c.r, c.g, c.b); }
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

// the gold column: a twisted band, each face one of two flat tones by its normal against the sun (no emission)
function twoTone(g, hi, lo) {
  const n = g.index ? g.toNonIndexed() : g;
  n.computeVertexNormals();
  const p = n.attributes.position, c = new Float32Array(p.count * 3), a = new Vector3(), b = new Vector3(), d = new Vector3(), H = new Color(hi), L = new Color(lo);
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    const k = b.clone().sub(a).cross(d.clone().sub(a)).normalize().dot(SUN) > 0.2 ? H : L;
    for (let v = 0; v < 3; v++) c.set([k.r, k.g, k.b], (i + v) * 3);
  }
  n.setAttribute("color", new Float32BufferAttribute(c, 3));
  return n;
}
function ribbon(h, turns, r0, r1, w, N) {
  const pt = (u, s) => {
    const a = turns * Math.PI * 2 * u, rr = r0 + (r1 - r0) * u, rx = Math.cos(a), rz = Math.sin(a), phi = a * 0.5;
    return [rr * rx + (s * w / 2) * rx * Math.cos(phi), h * u + (s * w / 2) * Math.sin(phi), rr * rz + (s * w / 2) * rz * Math.cos(phi)];
  };
  const pos = [];
  for (let i = 0; i < N; i++) pos.push(...pt(i / N, -1), ...pt((i + 1) / N, -1), ...pt(i / N, 1), ...pt(i / N, 1), ...pt((i + 1) / N, -1), ...pt((i + 1) / N, 1));
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}
// a flat ribbon of width w along the polyline pts (each point lies on the ground, so it is drawn flat on the land)
function strip(pts, w) {
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az) || 1, nx = (-(bz - az) / L) * w / 2, nz = ((bx - ax) / L) * w / 2;
    pos.push(ax + nx, ay, az + nz, ax - nx, ay, az - nz, bx + nx, by, bz + nz, ax - nx, ay, az - nz, bx - nx, by, bz - nz, bx + nx, by, bz + nz);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}

export function buildIsland(opts = {}) {
  const group = new Group(), land = new Group(), fountain = new Group(), made = [], ledge = [];
  land.position.set(-DOCK[0], -DOCK[1], -DOCK[2]);
  group.add(land, fountain);
  const add = (geo, mat, parent = fountain) => { const m = new Mesh(geo, mat); m.frustumCulled = false; parent.add(m); made.push(geo, mat); return m; };
  add(terrain(7, 87, 51, 131), vertexLit(), land);

  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({
    uniforms: { uSky: { value: vec(DOME_LO) }, uHigh: { value: vec(DOME_HI) } },
    vertexShader: "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }",
    fragmentShader: "uniform vec3 uSky, uHigh; varying vec3 vW; void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.99); }",
    side: BackSide, depthWrite: false, fog: false, toneMapped: false,
  }));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);

  const ground = (x, z) => { const o = {}; groundAt(DOCK[0] + x, DOCK[2] + z, o); return o.h - DOCK[1]; };

  // the Fountain: tiered basin with a green top, the twisted gold column, three gold rings and eight candles with gold flames, one vertex-coloured mesh
  const fountainParts = [
    tint(new CylinderGeometry(2.4, 2.4, 0.45, 48).translate(C[0], 0.225, C[2]), PAL.basin),
    tint(new CylinderGeometry(1.7, 1.7, 0.45, 40).translate(C[0], 0.675, C[2]), PAL.basin),
    tint(new CylinderGeometry(1.1, 1.1, 0.4, 32).translate(C[0], 1.1, C[2]), PAL.basin),
    tint(new CylinderGeometry(0.9, 0.9, 0.02, 32).translate(C[0], 1.31, C[2]), PAL.basinTop),
    twoTone(ribbon(6, 3, 0.5, 0.2, 0.5, 60), PAL.column, PAL.goldLo).translate(C[0], 1.3, C[2]),
    ...[3.4, 4.4, 5.3].map((R) => tint(new TorusGeometry(R, 0.06, 6, 96).rotateX(Math.PI / 2).translate(C[0], 0.02, C[2]), PAL.ringGold)),
  ];
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4, x = C[0] + 5.3 * Math.cos(a), z = C[2] + 5.3 * Math.sin(a);
    fountainParts.push(tint(new CylinderGeometry(0.22, 0.22, 2.6, 10).translate(x, 1.3, z), PAL.candle));
    fountainParts.push(tint(new OctahedronGeometry(0.3).translate(x, 2.9, z), PAL.goldHi));
  }
  add(mergeGeometries(fountainParts), vertexLit());

  // the rim: nine pines on the ledge inside the deck edge, a snow terrace ring below the deck with six pines, three candle posts on its outer rim, and a teal ice slab; one merged mesh hidden on the plain
  const pines = [];
  const pine = (x, y, z, h) => [[0.9, 0.5, 0.35], [0.7, 0.4, 0.65], [0.45, 0.3, 0.9]].forEach(([rad, hf, yf]) => pines.push(tint(new ConeGeometry(rad, hf * h, 9).translate(x, y + yf * h, z), PAL.pine)));
  for (let k = 0; k < 9; k++) {
    const a = ((160 + (170 * k) / 8) * Math.PI) / 180, r = FLAT - 0.4, x = C[0] + Math.cos(a) * r, z = C[2] + Math.sin(a) * r;
    pine(x, ground(x, z), z, 2.2 + 1.2 * rnd(k, 3));
  }
  for (let k = 0; k < 6; k++) {
    const a = ((30 + 60 * k) * Math.PI) / 180, r = FLAT + 1.3;
    pine(C[0] + Math.cos(a) * r, TERRACE, C[2] + Math.sin(a) * r, 1.8);
  }
  const terrace = tint(new RingGeometry(FLAT + 0.2, FLAT + 2.4, 72).rotateX(-Math.PI / 2).translate(C[0], TERRACE, C[2]), PAL.snowDeck);
  const posts = [];
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3, x = C[0] + Math.cos(a) * (FLAT + 2.0), z = C[2] + Math.sin(a) * (FLAT + 2.0);
    posts.push(tint(new CylinderGeometry(0.16, 0.16, 1.4, 8).translate(x, TERRACE + 0.7, z), PAL.candle));
    posts.push(tint(new BoxGeometry(0.34, 0.34, 0.06).translate(x, TERRACE + 1.6, z), PAL.goldHi));
  }
  ledge.push(add(mergeGeometries([terrace, ...pines, ...posts]), vertexLit()));

  const far = buildFar(vertexLit, ground);
  group.add(far.group);
  made.push(...far.made);

  // the river: a 3 m ribbon through the measured rig points (x, z), hugging the ground
  const river = RIVER.map(([x, z]) => [x, ground(x, z) + 0.04, z]);
  ledge.push(add(strip(river, 3), solid(PAL.river)));

  // the pup's shadow: one flat unlit disc (0.9 x 0.62 m) that follows the stand
  const shadowGeo = new CircleGeometry(1, 32).scale(0.9, 0.62, 1).rotateX(-Math.PI / 2), shadowMat = new MeshBasicMaterial({ color: PAL.shadowFlat });
  const shadow = new Mesh(shadowGeo, shadowMat);
  made.push(shadowGeo, shadowMat);
  group.add(shadow);

  // the island is hidden while the crimson world is up; the ledge and far ring show at the rim (t < 0.5, or from T.edge)
  let paged = false, pupOn = true;
  const page = (on, pup = true) => { paged = on; pupOn = pup; land.visible = !on; fountain.visible = !on; dome.visible = !on; };
  const updateShadow = (stand) => {
    shadow.visible = !paged && pupOn && !!stand;
    if (stand) { shadow.position.set(stand.p[0], stand.p[1] + 0.02, stand.p[2]); shadow.scale.setScalar(stand.s ?? 1); }
  };
  const update = (t, stand) => {
    const rimOn = !paged && (t < 0.5 || t >= T.edge);
    for (const m of ledge) m.visible = rimOn;
    far.group.visible = rimOn || (!paged && t >= T.home);
    updateShadow(stand);
  };
  return { group, page, update, dispose() { for (const x of made) x.dispose(); } };
}
