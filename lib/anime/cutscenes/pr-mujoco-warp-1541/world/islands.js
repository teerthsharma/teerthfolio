// NAMEK HORIZON (bible 3.2): ten painted far cards of ajisa-tree islands on the turquoise sea, matte-painted at long distance (layer 0).
// Each card is baked once (ctx.bake.card, GLSL `vec4 paint(vec2 p)`, p in card-height units, y up, alpha = coverage) and stood on the sea
// 105..160 m out, turned to face the playfield. Four of them are "near" islands that carry the 1.2 px #1b1530 line; the far ones none.
//
// The painting, per fragment (u = (x - cx) / hw across the island, s = sqrt(1 - u^2), the lens profile):
//   top(x)  = 0.18 + 0.05 s + brush wobble            the grass line
//   bot(x)  = 0.18 - 0.15 s                           the cliff underside; the card sits on the sea at its lowest point
//   grass   #35b6a4 / lit #58d4e0 right of centre (suns camera-right) with a #2a8f9c shadow band under the lip
//   cliff   #2a8f9c / shadow #1d6676 on the left, deep #103a4a over the lowest 5 %, vertical dry-brush streaks, #e9f7a8 foam at the waterline
//   ajisa   up to 9 per island: slim leaning trunk #6b4f9c (left half #5a4388), bulbous canopy = union of 3 squashed discs, 12..20 m tall;
//           canopy lit #8fe0b8, shadow crescent #3f9f8a = inside(p) && !inside(p - off) with off toward the suns
//   houses  2 white domes (hemisphere r 0.032) #fbf6fb with a #cdbfe0 crescent and a dark door
//   line    near islands: coverage = D < 0.004 and the ring takes ink, where D is the min signed distance over all layers
import { V } from "./common.js";

const ASP = 2.5;

const paint = /* glsl */ `
  uniform float uSeed; uniform float uNear;
  float canopyD(vec2 p, vec2 cc) {
    float a = length((p - cc) * vec2(1.0, 1.25)) - 0.058;
    float b = length((p - cc - vec2(0.040, -0.030)) * vec2(1.0, 1.2)) - 0.040;
    float c = length((p - cc - vec2(-0.043, -0.025)) * vec2(1.0, 1.2)) - 0.036;
    return min(a, min(b, c));
  }
  float domeD(vec2 p, vec2 c, float r) { return max(length(p - c) - r, c.y - p.y); }
  vec4 paint(vec2 p) {
    float sd = uSeed;
    float cx = 0.5 * uAsp, hw = 0.42 * uAsp;
    float u = (p.x - cx) / hw;
    float s = sqrt(max(1.0 - u * u, 0.0));
    float top = 0.18 + 0.05 * s + 0.004 * (fbm(vec2(p.x * 20.0, sd)) - 0.5);
    float bot = 0.18 - 0.15 * s;
    vec3 col = vec3(0.0);
    float D = 1e3;

    // island body
    float dI = max(max(p.y - top, bot - p.y), (abs(u) - 1.0) * 0.15);
    float sideN = (fbm(vec2(p.x * 9.0, sd + 3.0)) - 0.5) * 0.4;
    vec3 grass = mix(${V("#35b6a4")}, ${V("#58d4e0")}, step(0.0, u + sideN));
    grass = mix(grass, ${V("#2a8f9c")}, step(top - 0.034, p.y) * (1.0 - step(top - 0.024, p.y)));   // shadow band under the lip
    vec3 rock = mix(${V("#1d6676")}, ${V("#2a8f9c")}, step(0.25, u + sideN));
    rock *= 0.9 + 0.2 * step(0.55, fbm(p * vec2(70.0, 5.0)));                                       // vertical dry-brush
    rock = mix(rock, ${V("#103a4a")}, step(p.y, bot + 0.05));
    rock = mix(rock, ${V("#e9f7a8")}, step(p.y, bot + 0.012));                                      // foam at the waterline
    vec3 ic = mix(rock, grass, step(top - 0.024, p.y));
    col = mix(col, ic, step(dI, 0.0)); D = min(D, dI);

    // ajisa trees
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float xi = cx + (h21(vec2(fi, sd)) - 0.5) * 1.7 * hw;
      float ui = (xi - cx) / hw;
      if (abs(ui) > 0.88) continue;
      float ti = 0.18 + 0.05 * sqrt(1.0 - ui * ui) - 0.01;
      float hh = 0.37 + 0.25 * h21(vec2(fi + 9.0, sd));                 // 12..20 m on a 32 m card
      float lean = 0.05 * (h21(vec2(fi, sd + 5.0)) - 0.5);
      float y01 = clamp((p.y - ti) / hh, 0.0, 1.0);
      float tx = xi + lean * y01 * y01;
      float dT = max(abs(p.x - tx) - 0.008 * (1.0 - 0.3 * y01), max(ti - p.y, p.y - (ti + hh)));
      vec3 tc = mix(${V("#5a4388")}, ${V("#6b4f9c")}, step(0.0, p.x - tx));
      col = mix(col, tc, step(dT, 0.0)); D = min(D, dT);
      vec2 cc = vec2(tx, ti + hh);
      float dC = canopyD(p, cc);
      float shadow = step(0.0, canopyD(p - vec2(0.014, 0.012), cc));
      vec3 cl = mix(${V("#8fe0b8")}, ${V("#3f9f8a")}, shadow);
      col = mix(col, cl, step(dC, 0.0)); D = min(D, dC);
    }

    // two white dome houses
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float xh = cx + (fk < 0.5 ? -1.0 : 1.0) * hw * (0.12 + 0.35 * h21(vec2(fk, sd + 2.0)));
      float th = 0.18 + 0.05 * sqrt(max(1.0 - ((xh - cx) / hw) * ((xh - cx) / hw), 0.0)) - 0.004;
      vec2 hc = vec2(xh, th);
      float dH = domeD(p, hc, 0.032);
      float sh = step(0.0, domeD(p - vec2(0.008, 0.006), hc, 0.032));
      vec3 hcCol = mix(${V("#fbf6fb")}, ${V("#cdbfe0")}, sh);
      float door = step(abs(p.x - xh - 0.006), 0.005) * step(p.y, th + 0.014) * step(th, p.y);
      hcCol = mix(hcCol, ${V("#4a2878")}, door);
      col = mix(col, hcCol, step(dH, 0.0)); D = min(D, dH);
    }

    float cov = step(D, 0.0);
    if (uNear > 0.5) { cov = step(D, 0.004); col = mix(${V("#1b1530")}, col, step(D, 0.0)); }
    return vec4(col, cov);
  }`;

export function buildIslands(ctx) {
  const { THREE, bake } = ctx;
  const R = ctx.rng(23);
  const group = new THREE.Group();
  const cards = [];
  const N = 10;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + (R() - 0.5) * 0.35;           // angle round the playfield; 0 = toward -z
    const dist = 105 + R() * 55;
    const wM = 70 + R() * 30, hM = wM / ASP;
    const card = bake.card(paint, { w: 1280, h: 512, size: [wM, hM], id: 0.5, uniforms: { uSeed: { value: 1.7 + i * 3.1 }, uNear: { value: i % 5 < 2 ? 1 : 0 } } });
    const x = FLOORX + Math.sin(ang) * dist, z = FLOORZ - Math.cos(ang) * dist;
    card.position.set(x, -1.2 - 0.03 * hM + hM / 2, z);               // the lens bottom (card y 0.03) rests on the sea
    card.rotation.y = Math.atan2(FLOORX - x, FLOORZ - z);              // +z of the plane faces the playfield
    group.add(card); cards.push(card);
  }
  return { group, update() {}, dispose() { for (const c of cards) c.userData.dispose?.(); } };
}
const FLOORX = 0.9, FLOORZ = -1.6;
