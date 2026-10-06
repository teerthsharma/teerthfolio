// GEOMETRY + MATERIAL helpers for the dam world (reusable: a candidate for promotion to kit/).
//  Parts          accumulate boxes / cylinders / cones / spheres with a flat colour each into ONE non-indexed geometry
//                 (flat facet normals; attribute aCol = the lit albedo; aHN = the SMOOTHED hull normal, the average of the
//                 face normals of every vertex sharing a position, so an ink hull of boxes stays closed at the corners).
//  stoneMaterial  the Araki set shader (3-step cel, hard diagonal cut shadows, diagonal hatching in the shadow, 1.5 px panel
//                 lines, complementary shadow hue, optional crack and emission). Maths in the fragment comment.
//  hullMaterial   inverted hull at a constant 3 px (clip-space push along the projected smoothed normal), ink #05020a.
//  inked          fill + hull as a group.
import { BackSide, BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, FrontSide, Group, Matrix4, Mesh, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import { NOISE, PAL_UNIFORMS } from "./glsl.js";

const _m = new Matrix4(), _q = new Quaternion(), _e = new Euler(), _p = new Vector3(), _s = new Vector3();

export class Parts {
  constructor() { this.pos = []; this.nor = []; this.col = []; }
  add(geo, color, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute("uv");
    _m.compose(_p.set(o.x ?? 0, o.y ?? 0, o.z ?? 0), _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)), _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
    g.applyMatrix4(_m);
    g.computeVertexNormals(); // non-indexed: one flat normal a facet
    const c = new Color(color), P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i++) { this.pos.push(P[i]); this.nor.push(N[i]); }
    for (let i = 0; i < P.length / 3; i++) this.col.push(c.r, c.g, c.b);
    g.dispose();
    return this;
  }
  box(w, h, d, color, o) { return this.add(new BoxGeometry(w, h, d), color, o); }
  cyl(rt, rb, h, seg, color, o) { return this.add(new CylinderGeometry(rt, rb, h, seg), color, o); }
  cone(r, h, seg, color, o) { return this.add(new ConeGeometry(r, h, seg), color, o); }
  ball(r, color, o, ws = 8, hs = 6) { return this.add(new SphereGeometry(r, ws, hs), color, o); }
  build() {
    const g = new BufferGeometry();
    const P = new Float32Array(this.pos), N = new Float32Array(this.nor), C = new Float32Array(this.col);
    g.setAttribute("position", new BufferAttribute(P, 3));
    g.setAttribute("normal", new BufferAttribute(N, 3));
    g.setAttribute("aCol", new BufferAttribute(C, 3));
    g.setAttribute("aHN", new BufferAttribute(hullNormals(P, N), 3));
    g.computeBoundingSphere();
    return g;
  }
}

// smoothed normal per position: average the flat normals of every vertex that shares (x, y, z) to 2.5 mm
export function hullNormals(P, N) {
  const acc = new Map(), key = (i) => `${Math.round(P[3 * i] * 400)},${Math.round(P[3 * i + 1] * 400)},${Math.round(P[3 * i + 2] * 400)}`;
  const n = P.length / 3;
  for (let i = 0; i < n; i++) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, (a = [0, 0, 0])); a[0] += N[3 * i]; a[1] += N[3 * i + 1]; a[2] += N[3 * i + 2]; }
  const out = new Float32Array(P.length);
  for (let i = 0; i < n; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; out[3 * i] = a[0] / l; out[3 * i + 1] = a[1] / l; out[3 * i + 2] = a[2] / l; }
  return out;
}

const STONE_V = /* glsl */ `
  attribute vec3 aCol;
  varying vec3 vWP; varying vec3 vN; varying vec3 vCol; varying vec3 vLP;
  void main() {
    vCol = aCol; vLP = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWP = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// THE ARAKI SET SHADER.
//  value        v = N.key * 0.5 + 0.5 - 0.42 * cut, cut = the world-space hard diagonal band: s = dot(wp.xz, (0.62, -0.78)) *
//               0.045 + wp.y * 0.03 + shift, shadowed where fract(s) > 0.64 (a 22 m period of bold diagonal shadow shapes)
//  3 steps      lit = mix(albedo, light tint, tintAmt) capped at luma 0.92; mid = albedo*0.66 + shade tint*0.28;
//               shadow = albedo*0.36 + shade tint*0.5*0.6 (the complementary shadow hue). steps at v = 0.42 and 0.70,
//               each aaStep(v, t) = smoothstep(t - w, t + w, v), w = 0.75 fwidth(v).
//  hatch        in the shadow step only: diagonal lines in SCREEN space, h = (x - y) / (5 px * H/720), line where
//               |fract(h) - 0.5| * 2 > 0.8; the shadow colour * 0.55 at 70% coverage (the hand-cel hatching).
//  panel lines  1.5 px: q = (xz / 4 m) on a floor, (along-wall / 4 m, y / 2.5 m) on a wall; distance to the nearest lattice
//               line in pixels g = |fract(q - .5) - .5| / fwidth(q); line = 1 - smoothstep(0.5, 1.5, min(g.x, g.y)); fades
//               out when a cell is under 4 px.
//  crack        (the coral edge) beam x bx = local x + piece offset; zig = a jagged offset; the two fissures sit at uCut.xy;
//               half-width 0.02 + 0.09 * uCrack; ink; hairline cracks at three fixed positions once uCrack > 0.3.
//  fog          flat: mix(col, haze, 0.75 * smoothstep(90, 360, dist)).
const STONE_F = /* glsl */ `
  ${PAL_UNIFORMS}
  ${NOISE}
  const vec3 AW_INK = vec3(0.0015, 0.0006, 0.003);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  uniform vec3 uEmit; uniform float uPanel; uniform float uTintAmt; uniform float uCrack; uniform float uPieceX; uniform vec2 uCut; uniform float uId; uniform float uHatch;
  varying vec3 vWP; varying vec3 vN; varying vec3 vCol; varying vec3 vLP;
  float aaStep(float v, float t) { float w = fwidth(v) * 0.75 + 1e-4; return smoothstep(t - w, t + w, v); }
  void main() {
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    float ndl = dot(N, normalize(uKey)) * 0.5 + 0.5;
    float s = dot(vWP.xz, vec2(0.62, -0.78)) * 0.045 + vWP.y * 0.03 + uShift;
    float fs = fract(s), sw = fwidth(s) + 1e-5;
    float cut = clamp(min(fs - 0.64, 1.0 - fs) / sw + 0.5, 0.0, 1.0);
    float v = ndl - 0.42 * cut;
    vec3 base = vCol;
    float bl = dot(base, LUMA);
    vec3 lit = mix(base, uLightC, uTintAmt); lit *= min(1.0, 0.92 / max(dot(lit, LUMA), 1e-3));
    vec3 mid = mix(base * 0.66, uShadeC * (0.5 + bl), 0.28);
    vec3 shd = mix(base * 0.36, uShadeC * 0.6, 0.5);
    float t1 = aaStep(v, 0.42), t2 = aaStep(v, 0.70);
    vec3 col = mix(shd, mid, t1); col = mix(col, lit, t2);
    // diagonal hatching in the shadow step
    float hp = (gl_FragCoord.x - gl_FragCoord.y) / (5.0 * uRes.y / 720.0);
    float hl = abs(fract(hp) - 0.5) * 2.0;
    col = mix(col, col * 0.55, smoothstep(0.78, 0.86, hl) * (1.0 - t1) * 0.7 * uHatch);
    if (uPanel > 0.5) {
      vec2 q = abs(N.y) > 0.7 ? vWP.xz / 4.0 : vec2(dot(vWP.xz, normalize(vec2(-N.z, N.x) + 1e-5)) / 4.0, vWP.y / 2.5);
      vec2 fw = fwidth(q) + 1e-6, g = abs(fract(q - 0.5) - 0.5) / fw;
      float ln = (1.0 - smoothstep(0.5, 1.5, min(g.x, g.y))) * (1.0 - smoothstep(0.25, 0.5, max(fw.x, fw.y)));
      col = mix(col, shd * 0.8, ln * 0.5);
    }
    if (uCrack > 0.001) {
      float bx = vLP.x + uPieceX;
      float zig = 0.11 * sin(vLP.y * 21.0 + vLP.z * 13.0) + 0.06 * sin(vLP.y * 47.0 + vLP.z * 5.0);
      float dm = min(abs(bx - uCut.x + zig), abs(bx - uCut.y + zig * 1.3));
      float wd = 0.02 + 0.09 * uCrack, fx = fwidth(bx) * 1.2 + 1e-4;
      float fis = 1.0 - smoothstep(wd, wd + fx, dm);
      float hd = min(min(abs(bx + 8.5 + zig * 2.0), abs(bx - 2.2 - zig * 2.5)), abs(bx - 9.1 + zig * 2.0));
      float hw = (0.012 + 0.02 * uCrack) * smoothstep(0.3, 0.5, uCrack);
      float hair = (1.0 - smoothstep(hw, hw + fx, hd)) * step(0.35, awHash(vec2(floor(vLP.y * 3.0 + 7.0), floor(bx * 0.5))));
      col = mix(col, AW_INK, max(fis, hair * 0.9));
    }
    float fd = smoothstep(90.0, 360.0, length(vWP - cameraPosition));
    col = mix(col, uHaze, fd * 0.75);
    gl_FragColor = vec4(col + uEmit, uId);
  }`;

export function stoneMaterial(U, o = {}) {
  return new ShaderMaterial({
    uniforms: {
      ...U,
      uEmit: { value: new Vector3(...(o.emit ?? [0, 0, 0])) }, uPanel: { value: o.panel ?? 0 }, uTintAmt: { value: o.tint ?? 0.22 },
      uCrack: { value: 0 }, uPieceX: { value: 0 }, uCut: { value: new Vector2(-3.08, 4.4) },
      uId: { value: o.id ?? 0.5 }, uHatch: { value: o.hatch ?? 1 },
    },
    vertexShader: STONE_V, fragmentShader: STONE_F, side: o.side ?? FrontSide,
  });
}

const HULL_V = /* glsl */ `
  attribute vec3 aHN; uniform vec2 uRes; uniform float uPx;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 c = projectionMatrix * mv;
    vec2 d = (projectionMatrix * vec4(normalize(normalMatrix * aHN), 0.0)).xy;
    c.xy += normalize(d + 1e-6) * uPx * (uRes.y / 720.0) * 2.0 / uRes * c.w;
    gl_Position = c;
  }`;
export function hullMaterial(U, px = 3) {
  return new ShaderMaterial({
    uniforms: { uRes: U.uRes, uPx: { value: px } },
    vertexShader: HULL_V,
    fragmentShader: "void main() { gl_FragColor = vec4(0.0015, 0.0006, 0.003, 0.5); }",
    side: BackSide,
  });
}

// fill + hull, both frustumCulled off (the bounding sphere ignores the hull push and the shader transforms)
export function inked(geo, U, o = {}) {
  const g = new Group();
  const fill = new Mesh(geo, stoneMaterial(U, o));
  const hull = new Mesh(geo, hullMaterial(U, o.px ?? 3));
  fill.frustumCulled = hull.frustumCulled = false; hull.renderOrder = -1;
  g.add(fill, hull);
  g.userData.fill = fill; g.userData.hull = hull;
  return g;
}
export function disposeTree(root) {
  root.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose?.(); o.userData?.dispose?.(); });
}
