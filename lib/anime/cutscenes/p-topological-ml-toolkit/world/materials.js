// MATERIALS: the Academy City cel shader and its ink hull, both driven by the stage transform (stage.js).
// One program draws every set piece; the material KIND is a per-vertex attribute (aKind.x):
//   0 ribbon-window wall   1 curtain-glass wall   2 plaza paving   3 city ground (slab, avenue and cross-street asphalt, lane paint)
//   4 flat painted         5 foliage              6 signal lamp (blinks)   7 grass island (plate, not stage)   8 turbine blade
//   11 motion arc          12 constant glow (lamps, bollard caps, the vending panel, the frog lamp)
//
// SHADING MATHS (fragment)
//   h  = 0.5 N.L + 0.5, band edges at 0.52 (lit | shade) and 0.30 (shade | deep), width fwidth(h) + 0.01  : hard cel bands
//   shade albedo is pushed toward blue-violet #7f8fd0:  sh' = mix(sh, #7f8fd0 * luma(sh) * 1.3, 0.3)       : never grey (bible style law)
//   atmosphere: col = mix(col, #5a8ae0, 0.6 * smoothstep(140, 520, |p - cam|)), a SATURATED haze so far towers stay cobalt
//   contact shadow: an ellipse under the seal, offset along -L.xz, filled #2a3a8a at 0.45 (one hard shape, not a soft disc)
//   paper back: faces seen from below (the folded map's reverse) are paper #eef3f8 with a #9fb8dc grid every 6 m
//   windows (kind 0): ribbons 2.6 m x 1.9 m, mullion 0.07 m, 15% of cells lit #9fd0ff, two diagonal 60% white glass bars per 9 m,
//                     a +0.16 reflection stripe where fract((u + 0.9 y) / 9) > 0.6, and the floor-slab line darkening 12%
import { BackSide, Color, DoubleSide, ShaderMaterial } from "three";
import { V } from "../../../paint.js";
import { STAGE_V } from "./stage.js";

const FRAG = /* glsl */ `
  uniform vec3 uLightDir; uniform vec3 uLightCol; uniform float uT; uniform float uId; uniform vec4 uHinge; uniform vec4 uBloom; uniform vec4 uFold;
  uniform vec4 uShadow; uniform vec4 uShadowB; uniform vec3 uHaze; uniform vec2 uFogR;
  varying vec3 vCol; varying vec3 vShade; varying vec3 vN; varying vec3 vON; varying vec3 vOP; varying vec3 vWP; varying vec4 vKind; varying vec4 vHub; varying float vLive;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  const vec3 G0 = ${V("#6f9fd6")}, G1 = ${V("#7fb0dc")}, G2 = ${V("#8db8e2")}, G3 = ${V("#5f8fcb")}, GLIT = ${V("#9fd0ff")};
  const vec3 ROOF = ${V("#e6edf6")}, ROOFS = ${V("#aab5cc")}, INK = ${V("#1d3f9a")}, JOINT = ${V("#6f86b0")};
  const vec3 PLAZA = ${V("#e3eaf3")}, PLAZAS = ${V("#b5c3dc")}, RING = ${V("#73a0dc")}, SLAB = ${V("#c3d1e3")}, SLABS = ${V("#9fb2d0")};
  const vec3 ASPH = ${V("#7a8aa1")}, ASPHS = ${V("#566783")}, PAINT = ${V("#f4f7fb")}, PAPER = ${V("#eef3f8")}, PGRID = ${V("#9fb8dc")};
  const vec3 TIPC = ${V("#3b74d9")}, FOLCUT = ${V("#a9dcc0")}, SHCOL = ${V("#2a3a8a")}, GRASS = ${V("#8fc6a4")}, GRASSS = ${V("#5fa384")}, GRASSD = ${V("#3c7a68")};
  float hsh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), f.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), f.x), f.y); }
  float gridD(float u, float per) { return abs(fract(u / per + 0.5) - 0.5) * per; }
  // a line d metres away from the centre, px pixels wide
  float lp(float d, float u, float px) { float w = fwidth(u) + 1e-5; return 1.0 - smoothstep(0.5 * px * w - 0.5 * w, 0.5 * px * w + 0.5 * w, d); }
  vec3 glassPick(float s) { float i = floor(s * 4.0); return i < 1.0 ? G0 : (i < 2.0 ? G1 : (i < 3.0 ? G2 : G3)); }
  float sideU() { return abs(vON.x) > abs(vON.z) ? vOP.z : vOP.x; }

  void wallSurf(out vec3 a, out vec3 s) {
    a = vCol; s = vShade;
    if (vON.y > 0.5) { a = ROOF; s = ROOFS; return; }
    if (abs(vON.y) > 0.5) return;
    float u = sideU(), y = vOP.y, y0 = vKind.z, y1 = vKind.w;
    float row = y / 1.9, yy = fract(row), cu = u / 2.6;
    float dm = abs(fract(cu + 0.5) - 0.5) * 2.6;
    float mull = 1.0 - smoothstep(0.035, 0.035 + fwidth(u) + 0.02, dm);
    float inY = step(0.2, yy) * step(yy, 0.8) * step(y0 + 0.3, y) * step(y, y1 - 0.3);
    float win = inY * (1.0 - mull);
    vec3 g = glassPick(vKind.y);
    float lit = step(hsh(vec2(floor(cu), floor(row)) + vKind.y * 37.0), 0.15);
    g = mix(g, GLIT, lit);
    float dg = fract((u + y * 0.9) / 9.0);
    g += 0.16 * step(0.6, dg) * (1.0 - lit);
    float bar = max(step(dg, 0.055), 1.0 - step(0.025, abs(dg - 0.4)));
    g = mix(g, vec3(1.0), 0.6 * bar * win);
    a = mix(a, g, win); s = mix(s, g * vec3(0.62, 0.68, 0.9), win);
    a *= 1.0 - 0.12 * (1.0 - step(0.06, yy));
  }
  void curtainSurf(out vec3 a, out vec3 s) {
    a = vCol; s = vShade;
    if (vON.y > 0.5) { a = ROOF; s = ROOFS; return; }
    if (abs(vON.y) > 0.5) return;
    float u = sideU(), y = vOP.y;
    float mu = 1.0 - smoothstep(0.04, 0.04 + fwidth(u) + 0.02, gridD(u, 1.4));
    float mv = 1.0 - smoothstep(0.05, 0.05 + fwidth(y) + 0.02, gridD(y, 1.9));
    float lit = step(hsh(floor(vec2(u / 1.4, y / 1.9)) + vKind.y * 53.0), 0.15);
    vec3 g = mix(vCol, GLIT, lit);
    float dg = fract((u + y * 0.9) / 9.0);
    g += 0.16 * step(0.6, dg) * (1.0 - lit);
    float bar = max(step(dg, 0.055), 1.0 - step(0.025, abs(dg - 0.4)));
    g = mix(g, vec3(1.0), 0.6 * bar);
    a = mix(g, g * 0.55 + vec3(0.03, 0.05, 0.1), max(mu, mv)); s = a * vec3(0.62, 0.68, 0.9);
  }
  void paving(vec2 P, out vec3 a, out vec3 s) {
    vec2 c = floor(P / 2.0);
    a = PLAZA * (1.0 + (mod(c.x + c.y, 2.0) - 0.5) * 0.05 + (hsh(c) - 0.5) * 0.025); s = PLAZAS;        // checker +-2.5%
    float j = max(lp(gridD(P.x, 2.0), P.x, 1.5), lp(gridD(P.y, 2.0), P.y, 1.5));                       // 2 m joints, 1.5 px
    float jh = max(lp(gridD(P.x, 8.0), P.x, 2.6), lp(gridD(P.y, 8.0), P.y, 2.6));                      // heavier every 8 m
    a = mix(a, JOINT, max(j * 0.55, jh * 0.9));
    float r = length(P - vec2(0.0, 1.0)), w = fwidth(r) + 1e-4;
    float ring = max(1.0 - smoothstep(0.17 - w, 0.17 + w, abs(r - 5.4)), 1.0 - smoothstep(0.17 - w, 0.17 + w, abs(r - 8.6)));
    a = mix(a, RING, ring);
  }
  void cityGround(vec2 P, out vec3 a, out vec3 s) {
    vec2 c = floor(P / 8.0);
    a = SLAB * (1.0 + (mod(c.x + c.y, 2.0) - 0.5) * 0.04); s = SLABS;
    a = mix(a, JOINT, max(lp(gridD(P.x, 8.0), P.x, 1.4), lp(gridD(P.y, 8.0), P.y, 1.4)) * 0.5);
    float ax = abs(abs(P.x) - 27.0), cs = abs(P.y + 17.8);                                              // avenues at x = +-27, cross street under the viaduct
    float asph = max(1.0 - smoothstep(3.9, 4.0, ax), 1.0 - smoothstep(3.6, 3.7, cs));
    a = mix(a, ASPH * (0.96 + 0.08 * hsh(floor(P * 30.0))), asph); s = mix(s, ASPHS, asph);
    float dz = step(fract(P.y / 6.0), 0.55), dx = step(fract(P.x / 6.0), 0.55);
    float pAv = (1.0 - smoothstep(0.08, 0.13, ax)) * dz + (1.0 - smoothstep(0.07, 0.12, abs(ax - 3.4)));
    float pCs = (1.0 - smoothstep(0.08, 0.13, cs)) * dx + (1.0 - smoothstep(0.07, 0.12, abs(cs - 3.2)));
    float onAv = 1.0 - smoothstep(3.9, 4.0, ax), onCs = 1.0 - smoothstep(3.6, 3.7, cs);
    a = mix(a, PAINT, clamp(pAv, 0.0, 1.0) * onAv * (1.0 - onCs));                                       // lane paint, avenue
    a = mix(a, PAINT, clamp(pCs, 0.0, 1.0) * onCs * (1.0 - onAv));                                       // lane paint, cross street
  }
  void grassSurf(vec2 P, out vec3 a, out vec3 s) {
    float n = vnz(P * 0.3) * 0.6 + vnz(P * 0.9) * 0.4, tone = floor(n * 3.0) / 2.0;                    // posterised 3 tones
    a = mix(GRASSS, GRASS, tone); s = mix(GRASSD, GRASSS, tone);
    vec2 q = P * 1.7, f = fract(q) - 0.5;
    float tuft = step(0.78, hsh(floor(q))) * (1.0 - smoothstep(0.2, 0.26, length(f)));
    a = mix(a, GRASSD, tuft * 0.8);
  }
  vec3 paperBack(vec2 P) { return mix(PAPER, PGRID, max(lp(gridD(P.x, 6.0), P.x, 1.4), lp(gridD(P.y, 6.0), P.y, 1.4))); }

  void main() {
    if (vLive < 0.5) discard;
    float kind = vKind.x;
    bool ground = kind > 1.5 && kind < 3.5;
    if (ground && length(vOP.xz) > uBloom.x) discard;                                                 // the city blooms outward: no pavement past the front
    bool back = !gl_FrontFacing;
    vec3 N = normalize(vN); if (back && !ground) N = -N;
    vec3 col; float emit = 0.0;
    bool paper = (ground && back) || (vON.y < -0.5 && (kind < 2.5 || (kind > 3.5 && kind < 4.5)));
    if (paper) {
      col = paperBack(vOP.xz);
    } else {
      vec3 a = vCol, s = vShade;
      if (kind < 0.5) wallSurf(a, s);
      else if (kind < 1.5) curtainSurf(a, s);
      else if (kind < 2.5) { if (vON.y > 0.5) paving(vOP.xz, a, s); }
      else if (kind < 3.5) cityGround(vOP.xz, a, s);
      else if (kind > 5.5 && kind < 6.5) { float lit = step(fract(uT * 0.7 - vKind.y), 0.34); a = vCol * (0.35 + 0.65 * lit); s = a * 0.6; emit = lit * 0.3; }
      else if (kind > 6.5 && kind < 7.5) grassSurf(vOP.xz, a, s);
      else if (kind > 7.5 && kind < 8.5) a = mix(a, TIPC, step(vKind.z, length(vOP - vHub.xyz)));
      else if (kind > 11.5 && kind < 12.5) { emit = 0.35; }
      vec3 L = normalize(uLightDir);
      float h = dot(N, L) * 0.5 + 0.5, w = fwidth(h) + 0.01;
      if (kind > 4.5 && kind < 5.5 && h > 0.9) a = FOLCUT;                                           // the hard foliage cut
      float b1 = smoothstep(0.52 - w, 0.52 + w, h), b2 = smoothstep(0.30 - w, 0.30 + w, h);
      s = mix(s, vec3(0.498, 0.561, 0.816) * dot(s, LUMA) * 1.3, 0.3);
      col = mix(mix(s * 0.8, s, b2), a * uLightCol, b1);
      if (ground || (kind > 6.5 && kind < 7.5)) {                                                     // the seal's contact shadow: one hard ellipse
        vec2 q = vWP.xz - uShadow.xy;
        vec2 r = vec2(q.x * uShadowB.x + q.y * uShadowB.y, -q.x * uShadowB.y + q.y * uShadowB.x) / uShadow.zw;
        float e = dot(r, r), ew = fwidth(e) + 1e-4;
        col = mix(col, SHCOL, 0.45 * (1.0 - smoothstep(1.0 - ew, 1.0 + ew, e)));
      }
    }
    if (ground) {                                                                                     // the crease along each hinge (visible only during the fold)
      vec2 P = vOP.xz;
      float d = min(min(abs(P.y - uHinge.x), abs(P.y - uHinge.y)), min(abs(P.y - uHinge.z), abs(P.y - uHinge.w)));
      col = mix(col, INK, lp(d, P.y, 2.4) * uFold.w);
    }
    float fk = smoothstep(uFogR.x, uFogR.y, length(vWP - cameraPosition)) * 0.6;
    col = mix(col, uHaze, fk);
    gl_FragColor = vec4(col + vCol * emit, uId);
  }`;

const SURF_V = /* glsl */ `${STAGE_V}
  varying vec3 vCol; varying vec3 vShade; varying vec3 vN; varying vec3 vON; varying vec3 vOP; varying vec3 vWP; varying vec4 vKind; varying vec4 vHub; varying float vLive;
  void main() {
    float vis; vec3 wp = placeW(position, vis);
    vCol = aCol; vShade = aShade; vOP = position; vON = normal; vN = normalize(mat3(modelMatrix) * normal);
    vWP = wp; vKind = aKind; vHub = aHub; vLive = vis;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;

// INK HULL: the inverted shell extruded in clip space by a constant pixel width (2 px at 1080p, x aCen.z), along the transformed
// corner direction: dir = ndc(stage(p + 0.4 hn)) - ndc(stage(p)). The nearest six towers carry aCen.z = 1.6.
const HULL_V = /* glsl */ `${STAGE_V}
  uniform vec2 uRes; uniform float uHullPx; uniform vec3 uHaze; uniform vec2 uFogR;
  varying float vFog;
  void main() {
    if (aCen.z <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float vis, vis2; vec3 wp = placeW(position, vis); vec3 wq = placeW(position + aHN * 0.4, vis2);
    if (vis < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 c = projectionMatrix * viewMatrix * vec4(wp, 1.0), q = projectionMatrix * viewMatrix * vec4(wq, 1.0);
    vec2 dir = q.xy / q.w - c.xy / c.w; dir = dir / max(length(dir), 1e-5);
    float px = uHullPx * aCen.z * (uRes.y / 1080.0) * clamp(18.0 / max(c.w, 0.5), 0.6, 1.4);
    c.xy += dir * px * 2.0 / uRes * c.w;
    vFog = smoothstep(uFogR.x, uFogR.y, length(wp - cameraPosition)) * 0.6;
    gl_Position = c;
  }`;
const HULL_F = /* glsl */ `uniform vec3 uInk; uniform vec3 uHaze; varying float vFog;
  void main() { gl_FragColor = vec4(mix(uInk, uHaze, vFog * 0.8), 1.0); }`;

export function cityMaterial(engine, U) {
  const sh = engine.shared;
  return new ShaderMaterial({ side: DoubleSide, uniforms: { uLightDir: sh.uLightDir, uLightCol: sh.uLightCol, ...U }, vertexShader: SURF_V, fragmentShader: FRAG });
}
export function hullMaterial(engine, U, ink = "#1d3f9a", px = 2.0) {
  const sh = engine.shared;
  return new ShaderMaterial({
    side: BackSide,
    uniforms: { uRes: sh.uRes, uHullPx: { value: px }, uInk: { value: new Color(ink) }, uHaze: U.uHaze, uFogR: U.uFogR, uBloom: U.uBloom, uFold: U.uFold, uFoldA: U.uFoldA, uHinge: U.uHinge, uAng: U.uAng, uArc: U.uArc },
    vertexShader: HULL_V, fragmentShader: HULL_F,
  });
}

// a flat unlit ShaderMaterial (rings, signs): colour or texture, id > 0.5 so the layer-1 composite keeps it
export function flatMaterial(col, id = 0.62) {
  return new ShaderMaterial({
    side: DoubleSide, uniforms: { uCol: { value: new Color(col) }, uId: { value: id } },
    vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uCol; uniform float uId; void main() { gl_FragColor = vec4(uCol, uId); }",
  });
}
export function mapMaterial(tex, id = 0.62) {
  return new ShaderMaterial({
    side: DoubleSide, uniforms: { tMap: { value: tex }, uId: { value: id } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D tMap; uniform float uId; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tMap, vUv).rgb, uId); }",
  });
}
