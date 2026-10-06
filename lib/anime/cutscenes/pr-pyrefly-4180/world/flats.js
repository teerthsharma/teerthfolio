// FLATS for pr-pyrefly-4180: the six layered cut-paper cards of the clearing, back-lit by the lamp (washi-card shader).
// Each layer is a row of hinged panels on a stage arc BEHIND the seal; they lie flat on the floor, then rise like a pop-up book.
//
// washi-card MATHS (fragment, per pixel, p = card-space metres, d = signed distance to the cut outline, < 0 inside):
//   discard d > 0                                  (the silhouette is cut out of the card, no alpha blending)
//   band = clamp(2.2 * fwidth(d), .025, .6)        the die-cut width in screen terms (2-3 px), cut = smoothstep(-band, -.4 band, d)
//   v    = fbm3(p * (.22,.3)) * .55 + (1 - y/H) * .45;   step s = floor(v * 1.25 * 3) in {0,1,2}  : THREE card values
//   base = deep | mid | lit by s, hue pushed to violet in the shadow: base *= mix(1, (.9,.82,1.15), (1 - s/2) * .4)
//   lamp transmission: lg = exp(-|W.xy - L.xy|^2 / 360);  thin = exp(d / .5)  (paper is thinner at the cut edge, so it glows)
//     col = base * (.28 + .72 uLamp) + GOLD * uLamp * (.22 lg + .55 thin (.4 + lg))
//   fibres: strokes(p*3) * .1 modulates value; sparkle where hash(floor(p*24)) > .996 (back-lit fibre glints, gold)
//   atmosphere: col += EMBER * .12 * uDepth * (.3 + lg)   (far cards pick up the fire)
//   die-cut: col = mix(col, CREAM * (.55 + .45 uLamp), cut);   alpha = .5 (the set-line id, so the id pass leaves cards be)
import { Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { KIT, V } from "../../../paint.js";
import { C } from "./palette.js";

const FRAG = /* glsl */ `
  uniform vec2 uSize; uniform float uKind, uSeed, uLamp, uDepth, uT, uOff;
  uniform vec3 uLit, uMid, uDeep, uLampPos;
  varying vec2 vP; varying vec3 vW;
  const vec3 GOLD = ${V(C.lamp)}, CREAM = ${V(C.cream)}, EMBER = ${V(C.ember)}, MASK = ${V(C.orangeMask)}, FIREC = ${V(C.fire)};
  float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vn(p); p = ROT * p; a *= 0.5; } return s; }
  float sdBox(vec2 p, vec2 c, vec2 h) { vec2 q = abs(p - c) - h; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }

  // ---- kinds 0 and 3: cedars. Tiered sawtooth hem: halfwidth = w (1 - y/h) (.55 + .45 fract(.55 y + .3)): jagged cut-paper boughs
  float cedar(vec2 p, float cx, float h, float w) {
    float t = clamp(p.y / h, 0.0, 1.0);
    float hw = w * (1.0 - t) * (0.55 + 0.45 * fract(p.y * 0.55 + 0.3));
    return min(max(abs(p.x - cx) - hw, p.y - h), sdBox(p, vec2(cx, 0.6), vec2(0.18, 0.6)));
  }
  float cedars(vec2 p) {
    float d = 1e3, cell = floor(p.x / 3.4);
    for (int i = -1; i <= 1; i++) {
      float c = cell + float(i); vec2 r = h22(vec2(c, uSeed));
      d = min(d, cedar(p, (c + 0.3 + 0.4 * r.x) * 3.4, uSize.y * (0.55 + 0.4 * r.y), 1.5 + r.x * 0.8));
    }
    return d;
  }
  // ---- kind 1: wall cut-out: crenellated top + arched windows cut THROUGH the card (the lamp shows in them)
  float wall(vec2 p) {
    float top = uSize.y * 0.5, mer = step(0.5, fract(p.x / 1.6)) * 0.9;
    float d = p.y - (top + mer);
    vec2 q = vec2(mod(p.x, 5.0) - 2.5, p.y - top * 0.55);
    float win = min(sdBox(q, vec2(0.0), vec2(0.45, 0.8)), length(vec2(q.x, q.y - 0.8)) - 0.45);
    return max(d, -win);
  }
  // ---- kind 2: the bough. A tapering limb every 26 m, pointed leaves along it, and the tiny orange spiral mask on top (egg 1)
  float boughY(float x) { return uSize.y * 0.6 + 1.3 * sin(x * 0.31 + uSeed); }
  vec2 maskAt(float x) { float b = floor(x / 26.0) * 26.0 + 8.0 + 12.0 * 0.55; return vec2(b, boughY(b) + 0.7 * 0.45 + 0.45); }
  float bough(vec2 p) {
    float u = (mod(p.x, 26.0) - 8.0) / 12.0;
    float by = boughY(p.x), th = 0.7 * (1.0 - u) + 0.15;
    float d = max(abs(p.y - by) - th, max(-u * 12.0, (u - 1.0) * 12.0));
    float c = floor(p.x / 1.8); vec2 r = h22(vec2(c, uSeed + 4.0));
    vec2 q = p - vec2((c + 0.5) * 1.8, boughY((c + 0.5) * 1.8) + 0.6 + 1.4 * r.y);
    float uc = (mod((c + 0.5) * 1.8, 26.0) - 8.0) / 12.0;
    float leaf = (abs(q.x) * 2.0 + abs(q.y)) - (0.5 + 0.5 * r.x);
    if (uc > 0.05 && uc < 1.0) d = min(d, leaf);
    return min(d, length(p - maskAt(p.x)) - 0.38);
  }
  // ---- kind 4: Konoha rooftops, grey-blue tiles: top = base + pk (1 - |2fx|)^.65, chimneys, bell towers (cell % 5 == 2)
  float roofs(vec2 p) {
    float cw = 7.0, c = floor(p.x / cw), fx = fract(p.x / cw) - 0.5;
    vec2 r = h22(vec2(c, uSeed)); float base = uSize.y * (0.25 + 0.2 * r.x), pk = uSize.y * (0.15 + 0.12 * r.y);
    float d = p.y - (base + pk * pow(max(1.0 - abs(fx) * 2.0, 0.0), 0.65));
    float cx = (c + 0.5 + 0.22) * cw;
    if (r.y > 0.45) d = min(d, sdBox(p, vec2(cx, base + pk * 0.5 + 1.2), vec2(0.45, 1.6)));
    if (mod(c, 5.0) == 2.0) {
      float bx = (c + 0.5) * cw;
      d = min(d, sdBox(p, vec2(bx, base + pk + 2.0), vec2(0.5, 2.6)));
      d = min(d, length(vec2((p.x - bx) * 0.8, p.y - (base + pk + 5.2))) - 1.0);   // the bell chimney's flared bell
    }
    return d;
  }
  // ---- kind 5: the far burning ridge: top = .35 H + 3 ridged(.12 x) + jagged village rooftops
  float ridge(vec2 p) {
    float top = uSize.y * 0.35 + 3.0 * ridged(vec2(p.x * 0.12, uSeed)) + 0.8 * step(0.5, fract(p.x / 1.9)) + 0.5 * h21(vec2(floor(p.x / 1.9), uSeed));
    return p.y - top;
  }
  float shape(vec2 p) {
    if (uKind < 0.5) return cedars(p);
    if (uKind < 1.5) return wall(p);
    if (uKind < 2.5) return bough(p);
    if (uKind < 3.5) return cedars(p * vec2(0.8, 1.0));
    if (uKind < 4.5) return roofs(p);
    return ridge(p);
  }
  void main() {
    vec2 p = vP;
    float d = shape(p), fw = fwidth(d);
    if (d > 0.0) discard;
    float band = clamp(fw * 2.2, 0.025, 0.6), cut = smoothstep(-band, -band * 0.4, d);
    float v = fbm3(p * vec2(0.22, 0.3) + uSeed * 3.1) * 0.55 + (1.0 - clamp(p.y / uSize.y, 0.0, 1.0)) * 0.45;
    float s = floor(clamp(v * 1.25, 0.0, 0.999) * 3.0);
    vec3 base = s < 0.5 ? uDeep : (s < 1.5 ? uMid : uLit);
    base *= mix(vec3(1.0), vec3(0.9, 0.82, 1.15), (1.0 - s * 0.5) * 0.4);
    vec2 lp = vW.xy - uLampPos.xy; float lg = exp(-dot(lp, lp) / 360.0), thin = exp(d / 0.5);
    vec3 col = base * (0.28 + 0.72 * uLamp) + GOLD * uLamp * (0.22 * lg + 0.55 * thin * (0.4 + lg));
    col *= 0.93 + 0.1 * strokes(p * 3.0, 0.5, 0.8, 0.02);
    col += GOLD * step(0.996, h21(floor(p * 24.0) + 7.0)) * uLamp * 0.8;
    col += EMBER * 0.12 * uDepth * (0.3 + lg);
    // windows lit from inside the burning village (kinds 4, 5): emissive amber, independent of the lamp, blooms
    if (uKind > 3.5 && d < -1.0) {
      vec2 g = vec2(1.5, 2.0), c = floor(p / g), f = fract(p / g) - 0.5;
      float on = step(0.62, h21(c + uSeed)) * step(abs(f.x), 0.2) * step(abs(f.y), 0.22);
      col = mix(col, GOLD * 1.5, on);
    }
    // the far ridge burns along its crest: fbm tongues drift upward on the stepped clock
    if (uKind > 4.5) {
      float tongue = smoothstep(-2.4, 0.0, d) * smoothstep(0.35, 0.8, fbm3(p * vec2(1.1, 1.1) + vec2(0.0, -uT * 1.5)));
      col = mix(col, mix(FIREC, GOLD, tongue) * 1.6, tongue * 0.9);
    }
    // egg 1: Tobi's orange spiral mask: a disc with a spiral cut and one eye hole, on the bough
    if (uKind > 1.5 && uKind < 2.5) {
      vec2 q = p - maskAt(p.x);
      if (length(q) < 0.38) {
        float a = atan(q.y, q.x), r = length(q) / 0.38;
        col = mix(MASK, uDeep, 0.85 * step(0.5, fract(a / 6.2832 + r * 2.2)));
        if (length(q - vec2(0.08, 0.02)) < 0.07) col = vec3(0.02);
      }
    }
    col = mix(col, CREAM * (0.55 + 0.45 * uLamp), cut);
    gl_FragColor = vec4(min(col, vec3(1.4)), 0.5);
  }`;

const VERT = /* glsl */ `varying vec2 vP; varying vec3 vW; uniform vec2 uSize; uniform float uOff;
  void main() { vP = uv * uSize + vec2(uOff, 0.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

// kind: 0 cedars, 1 wall, 2 bough, 3 cedars (wide), 4 rooftops, 5 burning ridge. depth 0 near .. 1 far.
const LAYERS = [
  { R: 10, h: 8, kind: 1, seed: 1.1, deep: "#1d1328", mid: C.plum, lit: C.violet, wings: false },
  { R: 14, h: 10, kind: 2, seed: 2.3, deep: "#1d1328", mid: "#2a1d3a", lit: "#3a2a52", wings: true },
  { R: 18, h: 12, kind: 0, seed: 3.7, deep: "#162424", mid: C.cedar, lit: "#3c5252", wings: true },
  { R: 23, h: 14, kind: 4, seed: 4.9, deep: C.roofShade, mid: "#3a4562", lit: C.roofLit, wings: true },
  { R: 28, h: 16, kind: 3, seed: 5.5, deep: "#2a2244", mid: "#3a2d5c", lit: "#5a4684", wings: true },
  { R: 34, h: 18, kind: 5, seed: 6.1, deep: "#3a2850", mid: "#5a3a6a", lit: "#7a4a72", wings: true },
];

export function buildFlats(shared) {
  const group = new Group();
  const panels = [];
  const mats = [];
  LAYERS.forEach((L, li) => {
    const angles = L.wings ? [-80, -54, 0, 54, 80] : [-54, 0, 54];
    const W = L.R * 0.95;
    angles.forEach((deg, pi) => {
      const a = (deg * Math.PI) / 180;
      const mat = new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
          ...shared, uSize: { value: new Vector2(W, L.h) }, uKind: { value: L.kind }, uSeed: { value: L.seed + pi * 0.37 }, uDepth: { value: li / 5 },
          uOff: { value: 200 + a * L.R }, uLit: { value: new Color(L.lit) }, uMid: { value: new Color(L.mid) }, uDeep: { value: new Color(L.deep) },
        },
        vertexShader: VERT, fragmentShader: `${KIT}${FRAG}`,
      });
      mats.push(mat);
      const root = new Group();
      root.position.set(L.R * Math.sin(a), 0.03 + li * 0.012, -L.R * Math.cos(a));
      root.rotation.y = -a;
      const hinge = new Group();
      hinge.rotation.x = -Math.PI / 2; // lying flat on the floor, top edge away from the centre
      const m = new Mesh(new PlaneGeometry(W, L.h), mat);
      m.position.y = L.h / 2; m.frustumCulled = false;
      hinge.add(m); root.add(hinge); group.add(root);
      panels.push({ hinge, layer: li, idx: pi, geo: m.geometry });
    });
  });
  return {
    group, panels, layerCount: LAYERS.length,
    dispose() { for (const m of mats) m.dispose(); for (const p of panels) p.geo.dispose(); },
  };
}
