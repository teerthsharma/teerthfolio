// p-separatrix WORLD: Rome beyond the break (rome-skyline-kit, local). Three painted cards at 72, 112 and 170 m in the break direction
// (multiplane parallax), plus a handful of real 3D umbrella pines and cypresses in the gap. All saturated (L8): hills #9a5a8a rose-violet,
// roofs #b9573a with #7a2290 shadow, foliage #4a5a2a / #2e3a1c, dome #d9a441; apricot haze #e8a060 (own per-card amount, then the
// shared 140..520 m haze), never white.
//
// CARD PAINTERS (m = card-local metres, y up; coverage a = 1 draws, a < 0.5 is discarded; each painter is flat 2-tone, no outline on hills):
//   hills  ridge r1(x) = 16 + 10 fbm(0.012 x) + 6 fbm(0.04 x); nearer ridge r2(x) = 9 + 6 fbm(0.02 x + 9) + 3 fbm(0.08 x + 3). Far #b06a96, near #7a4a82,
//          crest band 1.4 m x 1.12 on the lit side.
//   city   7 m cells: wall height 4 + 4 h, roof rise 1.2 + 1.6 h (triangle), lit half #e8c890 / shadow half #a8602a -> #7a2290, roof lit #b9573a / shadow #7a2290,
//          window slots #2a1a24; a dome (drum 9 x 6 m + hemisphere r 8, total 14 m, 3 tones, lantern) at 62 percent of the card; cypresses (ellipse
//          rx 1.1 ry 5.2, every ~23 m) and umbrella pines (trunk 0.35 x 6.5, crown ellipse rx 4.5 ry 1.5, every ~31 m), all two-tone left-lit.
//   trees  the same trees at a larger scale and a tighter pitch with a low travertine wall, for the near plane.
import { BufferAttribute, ConeGeometry, CylinderGeometry, Group, InstancedMesh, Mesh, Object3D, PlaneGeometry, SphereGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { surface } from "../../../kit/surface.js";
import { C, PHI, PRELUDE, hex, mixHex } from "./common.js";

const CARD = /* glsl */ `
  uniform float uKind; uniform vec2 uCard; uniform float uHaze;
  vec4 over(vec4 base, vec3 c, float cov) { return vec4(mix(base.rgb, c, cov), max(base.a, cov)); }
  vec4 tree(vec4 o, vec2 m, float x0, float sc, float kind, float lr) {   // kind 0 cypress, 1 umbrella pine
    vec2 q = (m - vec2(x0, 0.0)) / sc; float leftLit = step(q.x, 0.0);
    if (kind < 0.5) {
      float cov = step(length((q - vec2(0.0, 5.0)) / vec2(1.1, 5.2)), 1.0);
      return over(o, mix(${hex(C.pineShade)}, ${hex(C.pine)}, leftLit), cov);
    }
    float trunk = step(abs(q.x), 0.18) * step(q.y, 6.6) * step(0.0, q.y);
    float crown = step(length((q - vec2(0.0, 7.6)) / vec2(4.5, 1.5)), 1.0);
    o = over(o, ${hex(C.pineDeep)}, trunk);
    return over(o, mix(${hex(C.pineShade)}, ${hex(C.pine)}, leftLit), crown);
  }
  vec4 hills(vec2 m) {
    float r1 = 16.0 + 10.0 * fbm(vec2(m.x * 0.012, 1.7)) + 6.0 * fbm(vec2(m.x * 0.04, 5.0));
    float r2 = 9.0 + 6.0 * fbm(vec2(m.x * 0.02 + 9.0, 3.0)) + 3.0 * fbm(vec2(m.x * 0.08, 3.0));
    vec3 c = ${hex(C.hillsFar)};
    c *= mix(1.0, 1.12, step(r1 - 1.4, m.y));
    if (m.y < r2) { c = ${mixHex(C.hills, "#7a2290", 0.35)}; c *= mix(1.0, 1.12, step(r2 - 1.2, m.y)); }
    return vec4(c, step(m.y, r1));
  }
  vec4 city(vec2 m, float scale) {
    vec4 o = vec4(0.0);
    float cx = floor(m.x / 7.0), fx = fract(m.x / 7.0);
    float hh = 4.0 + 4.0 * h21(vec2(cx, 3.0)), rh = 1.2 + 1.6 * h21(vec2(cx, 9.0));
    float half_ = step(0.5, fx);
    float wall = step(0.06, fx) * step(fx, 0.94) * step(m.y, hh);
    float slot = step(1.2, m.y) * step(m.y, hh - 0.8) * step(abs(fract(m.x / 3.5) - 0.5), 0.12) * step(0.6, fract(m.y / 2.0));
    vec3 wc = mix(${hex(C.stoneLit)}, ${mixHex(C.stoneMid, C.roofShade, 0.4)}, half_);
    o = over(o, mix(wc, ${hex(C.deep)}, slot), wall);
    float roof = step(hh, m.y) * step(m.y, hh + rh * (1.0 - abs(fx * 2.0 - 1.0))) * step(0.04, fx) * step(fx, 0.96);
    o = over(o, mix(${hex(C.roof)}, ${hex(C.roofShade)}, half_), roof);
    // the dome: drum 9 x 6 m, hemisphere r 8, lantern
    float xd = uCard.x * 0.62, dx = m.x - xd;
    float drum = step(abs(dx), 4.5) * step(m.y, 6.0);
    o = over(o, mix(${hex(C.stoneLit)}, ${mixHex(C.stoneMid, C.roofShade, 0.4)}, step(0.0, dx)), drum);
    vec2 dq = vec2(dx, m.y - 6.0);
    float dome = step(length(dq), 8.0) * step(0.0, dq.y);
    float dl = dot(normalize(dq + 1e-4), normalize(vec2(-0.6, 0.8)));
    vec3 dc = mix(${mixHex(C.stoneMid, C.roofShade, 0.4)}, ${hex(C.dome)}, step(-0.15, dl)); dc = mix(dc, ${hex(C.horizon)}, step(0.62, dl));
    o = over(o, dc, dome);
    o = over(o, ${hex(C.dome)}, step(abs(dx), 0.7) * step(14.0, m.y) * step(m.y, 15.6));
    // trees over the roofs
    for (int i = 0; i < 12; i++) {
      float fi = float(i), xc = (fi + 0.3 + 0.4 * h21(vec2(fi, 5.0))) * 23.0;
      o = tree(o, m, xc, scale, 0.0, 0.0);
      float xp = (fi + 0.6 + 0.3 * h21(vec2(fi, 8.0))) * 31.0;
      o = tree(o, m, xp, scale, 1.0, 0.0);
    }
    return o;
  }
  vec4 trees(vec2 m) {
    vec4 o = vec4(0.0);
    float wall = step(m.y, 2.2 + 0.4 * h21(vec2(floor(m.x / 5.0), 1.0))) * step(0.04, fract(m.x / 5.0));
    o = over(o, mix(${hex(C.stone)}, ${mixHex(C.stoneMid, C.roofShade, 0.4)}, step(0.5, fract(m.x / 5.0))), wall);
    for (int i = 0; i < 14; i++) {
      float fi = float(i), xc = (fi + 0.3 + 0.4 * h21(vec2(fi, 15.0))) * 12.0;
      o = tree(o, m, xc, 1.5, mod(fi, 3.0) < 1.5 ? 0.0 : 1.0, 0.0);
    }
    return o;
  }
  vec3 shade(vec3 P, vec3 N, vec3 V) {
    vec2 m = vUv * uCard;
    vec4 o = uKind < 0.5 ? hills(m) : (uKind < 1.5 ? city(m, 1.0) : trees(m));
    if (o.a < 0.5) discard;
    vec3 c = mix(o.rgb, ${hex(C.apricot)}, uHaze);
    c = fresco(c, P);
    return apricot(c, P);
  }`;

export function buildRome(ctx, U) {
  const group = new Group(), sh = ctx.engine.shared, R = ctx.rng("rome"), disposables = [];
  const dx = Math.cos(PHI), dz = Math.sin(PHI), yaw = Math.atan2(-dx, -dz);
  const cards = [
    { kind: 0, D: 170, w: 360, h: 56, y: -2, haze: 0.32 },
    { kind: 1, D: 112, w: 250, h: 30, y: -1, haze: 0.14 },
    { kind: 2, D: 72, w: 170, h: 22, y: -0.5, haze: 0.04 },
  ];
  for (const c of cards) {
    const mat = surface(sh, `${PRELUDE}\n${CARD}`, { uniforms: { ...U, uKind: { value: c.kind }, uCard: { value: new Vector2(c.w, c.h) }, uHaze: { value: c.haze } }, id: 0.5, side: 2 });
    const m = new Mesh(new PlaneGeometry(c.w, c.h), mat);
    m.position.set(dx * c.D, c.y + c.h / 2, dz * c.D); m.rotation.y = yaw;
    group.add(m); disposables.push(mat, m.geometry);
  }
  // ---- real 3D trees in the gap: umbrella pines and cypresses, instanced
  const tag = (g, leaf) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k); n.setAttribute("aLeaf", new BufferAttribute(new Float32Array(n.attributes.position.count).fill(leaf), 1)); return n; };
  const pineG = mergeGeometries([tag(new CylinderGeometry(0.22, 0.36, 6.4, 8).translate(0, 3.2, 0), 0), tag(new SphereGeometry(1, 14, 9).scale(4.4, 1.5, 4.4).translate(0, 7.4, 0), 1)]);
  const cypG = mergeGeometries([tag(new CylinderGeometry(0.15, 0.2, 1.0, 6).translate(0, 0.5, 0), 0), tag(new ConeGeometry(1.25, 10, 10).translate(0, 5.8, 0), 1)]);
  const tmat = surface(sh, /* glsl */ `
    ${PRELUDE}
    varying float vLeaf;
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec3 c = vLeaf > 0.5 ? stoneCel(P * 0.6, N, V, 1.0, ${hex(C.pineShade)}, ${hex(C.pine)}, ${hex(C.pineLit)}, 0.4)
                           : stoneCel(P, N, V, 1.0, ${hex(C.pineDeep)}, ${hex("#5a3a2c")}, ${hex("#7a5a3c")}, 0.0);
      c = fresco(c, P);
      return apricot(c, P);
    }`, { instanced: true, uniforms: U, id: 0.5, attrs: "attribute float aLeaf; varying float vLeaf;", varyings: "varying float vLeaf;", vert: "vLeaf = aLeaf;" });
  const o = new Object3D();
  const scatter = (geo, n, r0, r1, sMin, sMax) => {
    const im = new InstancedMesh(geo, tmat, n); im.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      const a = PHI + (R() - 0.5) * 1.2, rr = r0 + R() * (r1 - r0), s = sMin + R() * (sMax - sMin);
      o.position.set(Math.cos(a) * rr, -0.05, Math.sin(a) * rr); o.rotation.set(0, R() * 6.28, 0); o.scale.set(s, s * (0.9 + R() * 0.3), s); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    group.add(im); disposables.push(geo);
  };
  scatter(pineG, 11, 34, 66, 0.8, 1.25);
  scatter(cypG, 9, 33, 60, 0.8, 1.2);
  disposables.push(tmat);
  return { group, update() {}, dispose() { for (const d of disposables) d.dispose?.(); } };
}
