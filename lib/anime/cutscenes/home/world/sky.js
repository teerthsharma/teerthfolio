// SKY AND FAR PLATES for home: the dawn dome, hard cumulus cards, the sun, the painted mountain plates (bible 3.1, 3.2, 3.16).
// All painted procedurally, ONCE, in GLSL (bake.sky / bake.card); layer 0 except Vinland, which rises (layer 1).
//
// DOME  sky(az, el), az from -z toward +x, el up. d = (sin az cos el, sin el, -cos az cos el), s = dir(sun).
//   ang = acos(d.s), glow = exp(-ang^2 / 0.35).  e = max(el, 0).
//   column = horizon mix(cool lilac #b9c4ea, apricot #ffb978, glow) -> pale band mix(#a5cdeb, #ffd9a0, glow) -> #a5cdeb -> #5b9bd6
//            -> #3f86d0 -> zenith #1f58ac   (smoothstep ramps at e = .035/.10/.26/.62/1.15; saturated, no grey-lilac mid).
//   cirrus: three bands at el .32/.47/.60. dy = el - yc - .025 fbm(az 2.2). band = 1 - smoothstep(t - w, t + w, |dy|), t = .025 + .02 fbm;
//           streaks = smoothstep(.5 - w, .5 + w, fbm(vec2(az 5, dy 45))): lit #ffc9b0 above the centre line, #8f8fd0 below. Faded for |az| > 1.4.
//   sun halo: + #ffd9a0 * .45 exp(-ang^2 / .01) (values just above 1 near the disc are the only bloom).
// CLOUD CARD  q = p - (asp/2, 0), five circles (c_k, r_k) on a flat base y = .16, d = max(min_k(|q - c_k| - r_k), .16 - q.y).
//   n = normalize(q - c_nearest); l = n . normalize(-.45, .85): belly #9fb7de (l < -.05 or q.y < .26), body #e6eefc, crisp top #ffffff (l > .72);
//   sun-side rim: +12% #ffe3c0 where l > .2. coverage = d < 0.
// SUN CARD  disc r < .235 #fff3d8 x 3.2 (HDR, blooms), ring .235..265 #f2a05a x 1.4.
// MOUNTAIN CARD  top profiles: range2 .38 + .2 ridged(1.7 x), range1 .26 + .18 ridged(2.6 x), peaks tri(x) = H0 (1 - |x - xc| / Wb) + rough (ridged - .45).
//   facing f = d top / dx sampled at +-.02: f > 0 faces the sun (left) -> lit tone. Main: v = .5 + 12 f + .6 (ridged(warp(9x, 14y)) - .5), cel3(v, .38, .78, ..).
//   snow = step(.62, .65 ridged(warp(7x, 13y)) + .6 smooth(.25, .75, y) + .2 fbm), tones snow shade/mid/lit; dry-brush strokes on rock.
//   aerial: toward #7d8fd0 at the foot (55%) and 15% overall; ranges are the haze colour (ref 04: two bluer ranges).
// VINLAND CARD  headland profile .12 + .30 bell(u) + fbm, vertical wheat strokes (strokes(p, pi/2, .10, .010)), gold core #ffd37a, body #f2b84a,
//   edges aubergine #3a2a42 (ref 09). It rises from the water over 1.2 s with a haze tint that clears (bible 3.16).
import { Color, Group, Mesh } from "three";
import { mistCard } from "../../../tools/mist.js";
import { C, g, SUN, dirOf } from "./palette.js";
import { sm } from "./lib.js";

const DOME = /* glsl */ `
  const vec3 SD = vec3(${(Math.sin(SUN.az) * Math.cos(SUN.el)).toFixed(5)}, ${Math.sin(SUN.el).toFixed(5)}, ${(-Math.cos(SUN.az) * Math.cos(SUN.el)).toFixed(5)});
  float cirrus(vec2 p, float yc, float seed, out float lit) {
    float dy = p.y - yc - 0.025 * fbm(vec2(p.x * 2.2 + seed, seed));
    float t = 0.025 + 0.02 * fbm(vec2(p.x * 1.7 + seed * 3.0, 1.0));
    float w = fwidth(dy) * 1.2 + 1e-4;
    float band = 1.0 - smoothstep(t - w, t + w, abs(dy));
    float n = fbm(vec2(p.x * 5.0 + seed * 3.0, dy * 45.0)), wn = fwidth(n) * 1.2 + 1e-4;
    lit = step(0.0, dy);
    return band * smoothstep(0.5 - wn, 0.5 + wn, n) * (1.0 - smoothstep(1.4, 1.9, abs(p.x)));
  }
  vec3 sky(float az, float el) {
    vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
    float ang = acos(clamp(dot(d, SD), -1.0, 1.0));
    float glow = exp(-ang * ang / 0.35), e = max(el, 0.0);
    vec3 c = mix(${g("cool")}, ${g("horizon")}, glow);
    c = mix(c, mix(${g("low")}, ${g("horizonHi")}, glow), smoothstep(0.0, 0.035, e));
    c = mix(c, ${g("low")}, smoothstep(0.035, 0.10, e));
    c = mix(c, ${g("mid")}, smoothstep(0.08, 0.26, e));
    c = mix(c, ${g("upper")}, smoothstep(0.24, 0.62, e));
    c = mix(c, ${g("zenith")}, smoothstep(0.55, 1.15, e));
    float lit;
    float k1 = cirrus(vec2(az, el), 0.32, 1.0, lit); c = mix(c, mix(${g("cirrusShade")}, ${g("cirrusLit")}, lit), k1);
    float k2 = cirrus(vec2(az, el), 0.47, 2.0, lit); c = mix(c, mix(${g("cirrusShade")}, ${g("cirrusLit")}, lit), k2);
    float k3 = cirrus(vec2(az, el), 0.60, 3.0, lit); c = mix(c, mix(${g("cirrusShade")}, ${g("cirrusLit")}, lit), k3 * 0.8);
    c += ${g("horizonHi")} * 0.45 * exp(-ang * ang / 0.01);
    return c;
  }`;

const CLOUD = /* glsl */ `
  uniform float uSeed;
  float cloudD(vec2 q, out vec2 nc) {
    float d = 1e3; nc = vec2(0.0, 1.0);
    for (int k = 0; k < 5; k++) {
      float fk = float(k); vec2 h = h22(vec2(fk * 1.7, uSeed));
      float r = (0.10 + 0.16 * sin(3.14159 * (fk + 0.5) / 5.0)) * (0.75 + 0.5 * h.y);
      vec2 c = vec2(-0.5 + 0.25 * fk + 0.05 * (h.x - 0.5), 0.16 + r * 0.6);
      float dk = length(q - c) - r;
      if (dk < d) { d = dk; nc = q - c; }
    }
    return d;
  }
  vec4 paint(vec2 p) {
    vec2 q = p - vec2(uAsp * 0.5, 0.0), nc;
    float d = max(cloudD(q, nc), 0.16 - q.y);
    if (d > 0.0) return vec4(0.0);
    float l = dot(normalize(nc), normalize(vec2(-0.45, 0.85)));
    vec3 col = mix(${g("cloudBody")}, ${g("cloudTop")}, step(0.72, l));
    col = mix(col, ${g("apricot")}, 0.12 * step(0.2, l));
    col = mix(col, ${g("cloudBelly")}, max(step(l, -0.05), step(q.y, 0.26)));
    return vec4(col, 1.0);
  }`;

const SUNCARD = /* glsl */ `
  vec4 paint(vec2 p) { float r = length(p - 0.5);
    if (r < 0.235) return vec4(${g("sun")} * 3.2, 1.0);
    if (r < 0.265) return vec4(${g("sunRing")} * 1.4, 1.0);
    return vec4(0.0); }`;

const MOUNTAIN = /* glsl */ `
  uniform float uMain; uniform float uSeed;
  float top2(float x) { return 0.38 + 0.20 * ridged(vec2(x * 1.7 + 3.0, uSeed)); }
  float top1(float x) { return 0.26 + 0.18 * ridged(vec2(x * 2.6 + 11.0, uSeed * 2.0)); }
  float peak(float x, float xc, float H0, float Wb, float s) {
    float tri = H0 * (1.0 - abs(x - xc) / Wb);
    return tri + 0.07 * (ridged(vec2(x * 6.0 + s, s * 1.7)) - 0.45) * smoothstep(0.0, 0.5, tri);
  }
  float topM(float x) { return max(peak(x, uAsp * 0.52, 0.82, 1.3, 1.0), peak(x, uAsp * 0.18, 0.46, 0.95, 5.0)); }
  vec4 paint(vec2 p) {
    float x = p.x, y = p.y, dx = 0.02;
    vec3 col = vec3(0.0); float a = 0.0;
    // farthest range: pale haze with sunlit facets
    if (y < top2(x)) { float f = top2(x + dx) - top2(x - dx); a = 1.0;
      col = mix(${g("haze")} * 0.9, mix(${g("haze")}, ${g("cloudBelly")}, 0.6), step(0.0, f));
      col = mix(col, ${g("snowMid")}, step(0.62, 0.7 * ridged(warp(vec2(x * 8.0, y * 14.0), 0.5)) + 0.55 * smoothstep(0.2, 0.5, y)) * 0.7); }
    // near range: the bluer haze #7d8fd0
    if (y < top1(x)) { float f = top1(x + dx) - top1(x - dx); a = 1.0;
      col = mix(${g("haze")} * 0.8, ${g("haze")}, step(0.0, f));
      col = mix(col, ${g("snowShade")}, step(0.66, 0.7 * ridged(warp(vec2(x * 9.0, y * 16.0), 0.5)) + 0.5 * smoothstep(0.1, 0.4, y)) * 0.8); }
    // the main peak: rock with dendritic snow, sun from the left
    if (uMain > 0.5 && y < topM(x)) {
      a = 1.0;
      float f = topM(x + dx) - topM(x - dx);
      vec2 wq = warp(vec2(x * 9.0, y * 14.0), 0.6);
      float v = 0.5 + 12.0 * f + 0.6 * (ridged(wq) - 0.5);
      vec3 rock = cel3(v, 0.38, 0.78, ${g("rockShade")}, ${g("rockMid")}, ${g("rockLit")});
      rock *= 0.9 + 0.2 * step(0.55, strokes(vec2(x, y) * 60.0, 1.5708, 2.2, 0.35));
      float s = 0.65 * ridged(warp(vec2(x * 7.0, y * 13.0), 0.5)) + 0.6 * smoothstep(0.25, 0.75, y) + 0.2 * fbm(vec2(x * 5.0, y * 9.0));
      vec3 snow = cel3(v, 0.38, 0.78, ${g("snowShade")}, ${g("snowMid")}, ${g("snowLit")});
      snow = mix(snow, ${g("snowDeep")}, step(v, 0.18) * 0.7);
      col = mix(rock, snow, step(0.62, s));
      col = mix(col, ${g("apricot")}, 0.12 * step(0.78, v));
    }
    // aerial perspective
    col = mix(col, ${g("haze")}, 0.15 + 0.4 * (1.0 - smoothstep(0.0, 0.30, y)));
    return vec4(col, a);
  }`;

const VINLAND = /* glsl */ `
  vec4 paint(vec2 p) {
    float u = p.x / uAsp;
    float bell = smoothstep(0.0, 0.5, u) * smoothstep(1.0, 0.5, u);
    float prof = 0.10 + 0.34 * pow(bell, 0.8) + 0.05 * (fbm(vec2(u * 7.0, 2.0)) - 0.5);
    if (p.y > prof) return vec4(0.0);
    float core = exp(-pow((u - 0.5) / 0.26, 2.0));
    float wheat = step(0.5, strokes(p, 1.5708, 0.10, 0.010));
    vec3 body = mix(${g("vinBody")} * 0.92, ${g("vinBody")}, wheat);
    vec3 col = mix(body, mix(${g("vinCore")} * 0.95, ${g("vinCore")}, wheat), smoothstep(0.35, 0.8, core));
    // aubergine at the edges and in the shadowed foot (ref 09)
    col = mix(${g("vinEdge")}, col, smoothstep(0.04, 0.34, bell * (0.55 + 0.7 * (p.y / max(prof, 1e-3)))));
    col = mix(col, ${g("vinEdge")}, 0.55 * (1.0 - smoothstep(0.0, 0.05, p.y)));
    // a few sun-glint strokes on the crest
    col = mix(col, ${g("#fff0b0")}, step(0.93, strokes(p + 3.0, 1.5708, 0.07, 0.006)) * step(prof * 0.55, p.y));
    return vec4(col, 1.0);
  }`;

export function buildSky(ctx) {
  const { engine, bake } = ctx;
  const group = new Group(), cards = [];
  const disposables = [];
  const add = (card, keep = true) => { if (keep) cards.push(card); return card; };

  // the dome: 4000 x 1350 px over az +-2.0, el -0.2..1.15. Behind the seal (|az| > 2) it holds the edge column: gradient only.
  const dome = bake.sky(DOME, { tools: ["noise"], az: [-2.0, 2.0], el: [-0.2, 1.15], pxPerRad: 1000 });
  dome.userData.layer = 0; group.add(dome); disposables.push(() => { dome.userData.target?.dispose?.(); dome.material.dispose(); dome.geometry.dispose(); });

  // the sun: a crisp HDR disc card at 380 m (the dome carries only its halo)
  const sun = bake.card(SUNCARD, { w: 512, h: 512, size: [52, 52], billboard: true, id: 0, tools: ["noise"] });
  sun.position.set(...dirOf(SUN.az, SUN.el).map((v) => v * 380));
  sun.userData.layer = 0; group.add(add(sun));

  // hard cumulus: three baked clumps, reused as billboards around the dome
  const bakes = [11.3, 4.7, 27.1].map((seed) => add(bake.card(CLOUD, { w: 1024, h: 512, size: [120, 60], billboard: true, id: 0, tools: ["noise"], uniforms: { uSeed: { value: seed } } })));
  const spots = [ // az, el, width m, which bake
    [-1.12, 0.34, 120, 0], [-0.62, 0.20, 90, 1], [-0.20, 0.50, 130, 2], [0.38, 0.28, 100, 0], [0.82, 0.46, 140, 1], [1.30, 0.22, 90, 2],
    [-1.75, 0.30, 110, 1], [1.95, 0.40, 120, 0], [2.60, 0.30, 110, 2], [3.00, 0.36, 100, 1], [-2.55, 0.32, 120, 0], [-3.00, 0.28, 100, 2],
  ];
  for (const [az, el, w, k] of spots) {
    const c = new Mesh(bakes[k].geometry, bakes[k].material);
    c.userData.sharedGeo = true; c.userData.sharedMat = true;
    c.scale.set(w / 120, w / 120, 1); c.frustumCulled = false;
    c.position.set(...dirOf(az, el).map((v) => v * 330));
    c.onBeforeRender = (_r, _s, cam) => { c.quaternion.copy(cam.quaternion); };
    c.userData.layer = 0; group.add(c);
  }
  bakes.forEach((b) => { b.visible = false; group.add(b); }); // owners: kept only so their render targets are disposed

  // the mountains: the main plate north (behind the fjord mouth), mirrored plates E, S, W so an arc or a looking-back shot still sees range
  const main = add(bake.card(MOUNTAIN, { w: 3072, h: 768, size: [440, 110], id: 0, tools: ["noise"], uniforms: { uMain: { value: 1 }, uSeed: { value: 1.3 } } }));
  main.position.set(0, 49, -262); main.userData.layer = 0; group.add(main);
  const side = (ry, x, z, flip) => { const m = new Mesh(main.geometry, main.material); m.userData.sharedGeo = m.userData.sharedMat = true; m.position.set(x, 49, z); m.rotation.y = ry; m.scale.x = flip; m.frustumCulled = false; m.userData.layer = 0; group.add(m); };
  side(Math.PI, 0, 262, -1); side(-Math.PI / 2, 262, 0, 1); side(Math.PI / 2, -262, 0, -1);
  const far = add(bake.card(MOUNTAIN, { w: 2048, h: 256, size: [800, 100], id: 0, tools: ["noise"], uniforms: { uMain: { value: 0 }, uSeed: { value: 4.1 } } }));
  far.position.set(0, 44, -335); far.userData.layer = 0; group.add(far);

  // far-shore mist: a thin blue-violet film at the mouth and a low band on the water (1.5% reads as film, not fog)
  const m1 = mistCard(160, 14, new Color(C.haze), 0.30, 3), m2 = mistCard(110, 5, new Color(C.low), 0.16, 8);
  m1.position.set(0, -0.6, -128); m2.position.set(0, -0.55, -62);
  for (const m of [m1, m2]) { m.userData.layer = 0; group.add(m); disposables.push(() => { m.geometry.dispose(); m.material.dispose(); }); }

  // VINLAND: layer 1, rises out of the haze from the "vinland" beat (default 12.8 s, 1.2 s)
  const vin = bake.card(VINLAND, { w: 2048, h: 512, size: [170, 42.5], id: 0, tools: ["noise"], layer: 1 });
  vin.userData.layer = 1; vin.position.set(0, -30, -150); vin.visible = false; group.add(vin);
  cards.push(vin);
  const tint = vin.material.uniforms.uTint.value;
  const haze = new Color(C.haze), clear = new Color(1, 1, 1);

  const state = { rise: 0 };
  function update(t, cue) {
    const s = cue.since("vinland");
    const local = Number.isFinite(s) ? cue.t - s : 12.8;
    const dur = Number.isFinite(s) ? cue.arg("vinland", "dur", 1.2) : 1.2;
    const k = sm(0, 1, (t - local) / dur);
    state.rise = k;
    vin.visible = k > 0.001;
    vin.position.y = -30 + k * 50.75; // base hidden under the water, rising until its centre stands at y 20.75 (base at -0.5)
    tint.copy(haze).lerp(clear, k * k);
  }
  function dispose() {
    for (const c of cards) c.userData.dispose?.();
    for (const f of disposables) f();
  }
  return { group, update, dispose, state };
}
