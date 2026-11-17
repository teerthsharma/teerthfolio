// Packet shaders for pr-pyrefly-4180: Night of the Nine Tails, fire-night Pierrot cel. y is flipped to y-down inside; t is the pocket clock.
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-pyrefly-4180";
const SUITS = ["pr-pyrefly-4180"];
const UNDER = "mix(vec3(0.125, 0.047, 0.039), vec3(0.761, 0.376, 0.176), smoothstep(0.45, 0.72, 1.0 - p.y))";

const P = (name, doc, glsl, demo, meta) => ({ ...M(name, F, doc, glsl, demo), ...meta, suits: SUITS, uniforms: [] });

export const pfNightSky = P("pfNightSky", "night sky plate: five posterised steps #0b0303 to #200c0a, two-step smoke wisps",
  `vec3 pfNightSky(vec2 p, float t){
    float y = 1.0 - p.y;
    float tf = floor(t * 12.0) / 12.0;
    vec3 c = mix(vec3(0.043, 0.012, 0.012), vec3(0.125, 0.047, 0.039), floor(clamp(y / 0.60, 0.0, 1.0) * 5.0) / 5.0);
    float w = cFbm(vec2(p.x * 3.0 - tf * 0.02, y * 6.0));
    return mix(c, vec3(0.094, 0.086, 0.090), cAA(w, 0.62) * smoothstep(0.0, 0.5, y) * 0.6);
  }`, "pfNightSky(p, t)",
  { draws: "A near-black red night sky in five flat steps that warms toward the horizon, with a few dim smoke wisps.", use: "plate", params: "t: the 12 fps clock drifts the wisps; step count 5 and the 0.60 H ramp height are fixed." });

export const pfFireBand = P("pfFireBand", "burning village horizon: four posterised glow steps above a wavy band, core swells 1.5 to 2.5 s",
  `vec3 pfFireBand(vec2 p, float t, vec3 under){
    float y = 1.0 - p.y;
    float tf = floor(t * 12.0);
    float gain = mix(0.55, 1.0, smoothstep(1.5, 2.5, t));
    float yb = 0.68 + 0.022 * sin(17.0 * p.x) + 0.012 * sin(49.0 * p.x);
    float fl = 1.0 + 0.10 * (cH21(vec2(floor(p.x * 24.0), tf)) - 0.5);
    float lv = floor(4.0 * gain * fl * exp(-max(yb - y, 0.0) / 0.09));
    vec3 c = under;
    c = mix(c, vec3(0.271, 0.122, 0.098), step(1.0, lv));
    c = mix(c, vec3(0.529, 0.235, 0.133), step(2.0, lv));
    c = mix(c, vec3(0.761, 0.376, 0.176), step(3.0, lv));
    c = mix(c, vec3(0.898, 0.573, 0.157), step(4.0, lv));
    float core = (1.0 - cAA(abs(y - yb) - 0.012, 0.0)) * smoothstep(0.7, 1.0, gain) * step(4.0, lv);
    return mix(c, vec3(0.984, 0.765, 0.349), core);
  }`, `pfFireBand(p, t, ${UNDER.replace(/mix\(.*\)$/, "vec3(0.082, 0.030, 0.027)")})`,
  { draws: "A wavy band of fire across the village in four flat orange steps with a pale gold core, flickering on twos and swelling at 1.5 s.", use: "plate", params: "under: the sky colour the glow sits on; t: gain 0.55 to 1.0 over 1.5 to 2.5 s, flicker on the 12 fps clock; band row 0.68 H and falloff 0.09 fixed." });

export const pfRoofRidge = P("pfRoofRidge", "three rows of flat ink gable roofs with a chimney, a watchtower and one flat ridge for the seal",
  `vec3 pfRoofRidge(vec2 p, float t, vec3 under){
    float y = 1.0 - p.y;
    float sil = 0.0;
    for (int r = 0; r < 3; r++) {
      float fr = float(r);
      float w = 0.075 - 0.012 * fr;
      float x = p.x + fr * 0.037;
      float u = fract(x / w) - 0.5;
      float h = cH21(vec2(floor(x / w), 7.0 + fr));
      float ridge = 0.75 + 0.06 * fr - 0.03 - 0.05 * h + abs(u) * (0.07 + 0.03 * h);
      sil = max(sil, cAA(y - ridge, 0.0));
    }
    float chim = max(abs(p.x - 0.62) - 0.012, abs(y - 0.725) - 0.035);
    float tower = max(abs(p.x - 0.82) - 0.03, abs(y - 0.70) - 0.08);
    float hip = abs(p.x - 0.82) * 1.3 + 0.55 - y;
    float slab = max(abs(p.x - 0.36) - 0.07, abs(y - 0.875) - 0.025);
    sil = max(sil, max(max(cFill(chim), cFill(tower)), max(cFill(max(hip, y - 0.62)), cFill(slab))));
    return mix(under, vec3(0.094, 0.086, 0.090), sil);
  }`, `pfRoofRidge(p, t, ${UNDER})`,
  { draws: "A flat dark skyline of gabled roofs in three overlapping rows, one chimney, a watchtower and a flat roof ridge to stand on, with no outline.", use: "plate", params: "under: the fire plate seen behind the roofs; row height 0.75 to 0.89 H, tower at x 0.82, chimney at 0.62, seal ridge at x 0.36 fixed." });

export const pfHokageRock = P("pfHokageRock", "cliff silhouette with four shallow carved-face notches on the crest, lit orange on its lower flank",
  `vec3 pfHokageRock(vec2 p, float t, vec3 under){
    float y = 1.0 - p.y;
    float u = (p.x - 0.30) / 0.14;
    float f = fract((u + 1.0) * 2.0);
    float bite = (1.0 - smoothstep(0.0, 0.10, min(f, 1.0 - f))) * 0.018 + 0.008 * (1.0 - cos(6.2832 * f)) * 0.5;
    float top = 0.52 + 0.20 * u * u - bite;
    float sil = cAA(y - top, 0.0) * (1.0 - cAA(abs(u) - 1.0, 0.0));
    vec3 c = vec3(0.094, 0.086, 0.090);
    c = mix(c, vec3(0.529, 0.235, 0.133), 0.35 * cAA(y, 0.62) + 0.30 * cAA(y, 0.69));
    return mix(under, c, sil);
  }`, `pfHokageRock(p, t, ${UNDER})`,
  { draws: "A dark mountain cliff with four small carved notches along its crest and a warm orange glow climbing its base from the fire.", use: "plate", params: "under: the sky and fire behind it; crest top 0.52 H, centre x 0.30, half width 0.14 W fixed." });

export const pfFoxFace = P("pfFoxFace", "nine-tails head: three-tone red-brown mass, cheek stripes, slit red eyes, snarl with two fang rows, contour ink",
  `vec3 pfFoxFace(vec2 p, float t, vec3 under){
    float tf = floor(t * 12.0) / 12.0;
    float ease = 0.5 * (1.0 - cos(3.14159265 * clamp((t - 4.0) / 2.5, 0.0, 1.0)));
    float y = 1.0 - p.y - 0.5 * (1.0 - ease);
    y += 0.004 * sin(6.2832 * tf / 1.5) * smoothstep(0.2, 0.8, y);
    vec2 q = vec2((p.x - 0.54) * 2.39, y - 0.385);
    vec2 qe = vec2(abs(q.x) - 0.62, q.y + 0.30);
    float dh = min(length(q / vec2(1.016, 0.365)) - 1.0, length(qe / vec2(0.16, 0.22)) - 1.0) * 0.365;
    vec3 n = normalize(vec3(q.x / 1.016, q.y / 0.365, 0.55));
    float ndl = 0.5 + 0.5 * dot(n, normalize(vec3(0.15, 0.55, 0.8)));
    vec3 col = cCel3(ndl, 0.45, 0.70, vec3(0.271, 0.122, 0.098), vec3(0.478, 0.165, 0.125), vec3(0.651, 0.227, 0.157));
    float s = abs(q.x);
    float cheek = smoothstep(0.45, 0.55, s) * (1.0 - smoothstep(0.90, 0.98, s)) * step(-0.05, q.y) * (1.0 - step(0.22, q.y));
    col = mix(col, vec3(0.192, 0.176, 0.188), (1.0 - cAA(abs(fract((q.y - 0.25 * s) * 7.0) - 0.5), 0.12)) * cheek);
    vec2 ee = vec2(abs(q.x) - 0.36, q.y + 0.12);
    col = mix(col, vec3(0.192, 0.176, 0.188), cFill(length(ee / vec2(0.19, 0.12)) - 1.0));
    float open = floor(clamp((t - 4.0) / 0.5, 0.0, 1.0) * 6.0) / 6.0;
    float flare = 1.0 + 0.6 * smoothstep(7.0, 7.5, t);
    float hh = 0.085 * open;
    float de = length(ee / vec2(0.12, max(hh, 1e-3))) - 1.0;
    float halo = (1.0 - smoothstep(0.0, 0.08, de * 0.1)) * (1.0 - cFill(de)) * step(0.01, open);
    col = mix(col, vec3(1.0, 0.353, 0.165), halo * 0.5 * flare);
    col = mix(col, vec3(0.910, 0.204, 0.110) * flare, cFill(de) * step(0.01, open));
    float wp = mix(0.018, 0.006, smoothstep(7.0, 7.5, t));
    col = mix(col, vec3(0.102, 0.047, 0.063), cFill(max(abs(ee.x) - wp, abs(ee.y) - hh * 0.95)) * cFill(de));
    col = mix(col, vec3(0.102, 0.047, 0.063), cFill(length((q - vec2(0.0, -0.02)) / vec2(0.07, 0.045)) - 1.0));
    float gap = mix(0.015, 0.10, smoothstep(7.0, 9.5, t));
    float gl = gap * max(1.0 - (q.x / 0.62) * (q.x / 0.62), 0.0);
    float dm = max(abs(q.y - 0.10) - gl - 0.008, abs(q.x) - 0.62);
    float inside = cFill(dm);
    col = mix(col, vec3(0.102, 0.047, 0.063), inside);
    float tu = min(0.07 * (1.0 - abs(fract(q.x / 0.09) - 0.5) * 2.0), gl * 1.9);
    float tl = min(0.05 * (1.0 - abs(fract(q.x / 0.09 + 0.5) - 0.5) * 2.0), gl * 1.9);
    float fu = cAA(tu - (q.y - (0.10 - gl)), 0.0) * cAA(q.y - (0.10 - gl), 0.0);
    float fb = cAA(tl - ((0.10 + gl) - q.y), 0.0) * cAA((0.10 + gl) - q.y, 0.0);
    col = mix(col, vec3(0.957, 0.910, 0.816), max(fu, fb) * inside);
    vec3 outc = mix(under, col, cFill(dh) * step(4.0, t));
    return mix(outc, vec3(0.078, 0.039, 0.063), cLine(dh, 3.0) * step(4.0, t));
  }`, `pfFoxFace(p, t + 6.5, ${UNDER})`,
  { draws: "A huge red-brown fox face filling the sky with dark stripes, narrow glowing red eyes and a wide snarling mouth of pale fangs that opens over time.", use: "card", params: "under: plate behind the head; t: rises from 4.0 s, eyes open in six steps to 4.5 s, flare at 7.0 s, jaw opens 7.0 to 9.5 s, breath shift on 1.5 s period; head 0.85 W wide fixed." });

export const pfNineTails = P("pfNineTails", "nine tails fanning from the fox's back: capsule chains swaying on twos, lit tips, contour ink",
  `vec3 pfNineTails(vec2 p, float t, vec3 under){
    float tf = floor(t * 12.0) / 12.0;
    float ease = 0.5 * (1.0 - cos(3.14159265 * clamp((t - 4.0) / 2.5, 0.0, 1.0)));
    float open = smoothstep(5.0, 6.5, t);
    vec2 q = vec2(p.x * 2.39, 1.0 - p.y);
    vec2 piv = vec2(0.5 * 2.39, 0.62 + 0.5 * (1.0 - ease));
    float bd = 1000.0, bs = 0.0;
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float a0 = radians(-160.0) + radians(17.5) * fi * open;
      vec2 pos = piv;
      for (int j = 0; j < 8; j++) {
        float fj = float(j);
        float s0 = fj / 8.0, s1 = (fj + 1.0) / 8.0, sm = (fj + 0.5) / 8.0;
        float th = a0 + 0.6 * sm * sin(2.2 * sm + fi + 1.5 * tf);
        vec2 nx = pos + vec2(cos(th), sin(th)) * (0.55 / 8.0);
        vec2 ba = nx - pos;
        float h = clamp(dot(q - pos, ba) / dot(ba, ba), 0.0, 1.0);
        float d = length(q - pos - ba * h) - mix(mix(0.03, 0.0075, s0), mix(0.03, 0.0075, s1), h);
        if (d < bd) { bd = d; bs = mix(s0, s1, h); }
        pos = nx;
      }
    }
    vec3 col = vec3(0.478, 0.165, 0.125);
    col = mix(col, vec3(0.271, 0.122, 0.098), 1.0 - cAA(bs, 0.15));
    col = mix(col, vec3(0.651, 0.227, 0.157), cAA(bs, 0.45));
    col = mix(col, vec3(0.761, 0.376, 0.176), cAA(bs, 0.82));
    vec3 outc = mix(under, col, cFill(bd) * step(4.0, t));
    return mix(outc, vec3(0.078, 0.039, 0.063), cLine(bd, 3.0) * step(4.0, t));
  }`, `pfNineTails(p, t + 6.5, ${UNDER})`,
  { draws: "Nine thick red tails curving out behind the fox like a fan, each darker at the root and orange at the tip, swaying a little.", use: "card", params: "under: plate behind; t: tails stacked until 5.0 s then open to -160..-20 degrees by 6.5 s, sway on the 12 fps clock; tail length 0.55 H and width 0.06 H to 0.015 H fixed." });

export const pfSmokeBank = P("pfSmokeBank", "five slow smoke banks in two flat steps with an orange underlight edge, drifting left 12 to 16 s",
  `vec3 pfSmokeBank(vec2 p, float t, vec3 under){
    float y = 1.0 - p.y;
    float on = smoothstep(11.5, 12.0, t) * (1.0 - smoothstep(16.0, 16.5, t));
    vec3 c = under;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float hx = cH21(vec2(fi, 31.0)), hy = cH21(vec2(fi, 37.0));
      vec2 c0 = vec2(0.10 + 0.21 * fi - 0.04 * (t - 12.0), 0.30 + 0.12 * hy);
      float w = 0.20 + 0.15 * hx;
      float d = length(vec2((p.x - c0.x) / w, (y - c0.y) / 0.075)) - 1.0 + (cFbm(vec2(p.x * 5.0, y * 8.0) + fi * 3.0) - 0.5) * 0.5;
      float cov = cAA(-d, 0.0);
      vec3 s = mix(vec3(0.094, 0.086, 0.090), vec3(0.070, 0.062, 0.066), cAA(-d, 0.35));
      s = mix(s, vec3(0.529, 0.235, 0.133), cov * (1.0 - cAA(-d, 0.18)) * cAA(y - c0.y, 0.0) * 0.8);
      c = mix(c, s, cov * 0.7 * on);
    }
    return c;
  }`, `pfSmokeBank(p, t + 12.0, ${UNDER})`,
  { draws: "Five dark smoke clouds sliding slowly across the frame, flat in two shades, each with a thin orange glow along its underside.", use: "plate", params: "under: what the smoke crosses (the fox stays readable at 70 percent alpha); t: visible 12.0 to 16.0 s, drift 0.04 W per second." });

export const pfBlackOrb = P("pfBlackOrb", "tailed-beast orb: black core with a burning red rim and a thin orange edge, grows on twos, gone at 9.542 s",
  `vec3 pfBlackOrb(vec2 p, float t, vec3 under){
    float g = clamp((floor(t * 6.0) / 6.0 - 7.0) / 2.5, 0.0, 1.0);
    float r = 0.20 * g;
    vec2 q = vec2((p.x - 0.54) * 2.39, 1.0 - p.y - 0.34);
    float d = length(q) - r;
    float live = step(0.001, r) * (1.0 - step(9.542, t));
    vec3 c = mix(under, vec3(1.0, 0.353, 0.165), 0.35 * cFill(d - 0.012) * (1.0 - cFill(d)) * live);
    c = mix(c, vec3(0.878, 0.227, 0.125), cFill(d) * live);
    c = mix(c, vec3(0.102, 0.047, 0.063), cFill(d + 0.014) * live);
    return mix(c, vec3(1.0, 0.353, 0.165), cFill(d) * (1.0 - cFill(d + 0.005)) * live);
  }`, `pfBlackOrb(p, t + 9.0, ${UNDER})`,
  { draws: "A black sphere with a burning red outline growing between the fox's fangs, then vanishing in a single frame.", use: "card", params: "under: plate behind; t: radius 0 to 0.20 H over 7.0 to 9.5 s in 6 fps steps, removed from 9.542 s; centre fixed at (0.54 W, 0.34 H)." });

export const pfKunaiStreak = P("pfKunaiStreak", "one hard yellow streak with a cream core that decays 1, 0.6, 0.25 over three 24 fps frames",
  `vec3 pfKunaiStreak(vec2 p, float t, vec3 under){
    float k = floor((t - 9.5) * 24.0 + 1e-4);
    float a = step(-0.5, k) * (1.0 - step(0.5, k)) + 0.6 * step(0.5, k) * (1.0 - step(1.5, k)) + 0.25 * step(1.5, k) * (1.0 - step(2.5, k));
    vec2 q = vec2(p.x * 2.39, 1.0 - p.y);
    vec2 A = vec2(0.22 * 2.39, 0.60), B = vec2(0.98 * 2.39, 0.30);
    vec2 ba = B - A;
    float d = length(q - A - ba * clamp(dot(q - A, ba) / dot(ba, ba), 0.0, 1.0));
    vec3 c = mix(under, vec3(1.0, 0.835, 0.290), cFill(d - 0.020) * a);
    return mix(c, vec3(0.992, 0.973, 0.878), cFill(d - 0.008) * a);
  }`, `pfKunaiStreak(p, t + 9.5, ${UNDER})`,
  { draws: "A straight, hard-edged yellow line with a pale cream centre shooting from the kunai across the frame and fading out in three frames.", use: "line", params: "under: plate behind; t: frame k = floor((t-9.5)*24) sets alpha 1.0, 0.6, 0.25 then 0; line half width 0.020 H and ends (0.22 W, 0.60 H) to (0.98 W, 0.30 H) fixed." });

export const pfFlashBeat = P("pfFlashBeat", "the cream impact frame at 9.5 s and the small far horizon detonation 10.15 to 10.75 s",
  `vec3 pfFlashBeat(vec2 p, float t, vec3 under){
    float k = floor((t - 9.5) * 24.0 + 1e-4);
    vec3 c = mix(under, vec3(0.992, 0.973, 0.878), step(-0.5, k) * (1.0 - step(0.5, k)));
    float tt = t - 10.15;
    float env = smoothstep(0.0, 0.15, tt) * (1.0 - smoothstep(0.15, 0.60, tt));
    float l = length(vec2((p.x - 0.88) * 2.39, 1.0 - p.y - 0.60));
    c = mix(c, vec3(1.0, 0.690, 0.290), cFill(l - 0.07) * env);
    return mix(c, vec3(0.992, 0.973, 0.878), cFill(l - 0.025) * env);
  }`, `pfFlashBeat(p, t + 10.3, ${UNDER})`,
  { draws: "One frame of cream-white over the whole picture, then later a small orange-and-cream burst far away over the rooftops.", use: "screen", params: "under: plate it covers; t: white frame only for the 24 fps frame k=0 at 9.5 s, far flash at (0.88 W, 0.60 H) radius 0.05 H peaking at 10.3 s." });

export const pfEmberField = P("pfEmberField", "about 140 square embers rising and drifting from the fire, gold and orange, denser from 4 s",
  `vec3 pfEmberField(vec2 p, float t, vec3 under){
    float y = 1.0 - p.y;
    float dens = mix(0.55, 1.0, smoothstep(4.0, 5.0, t));
    vec3 c = under;
    for (int L = 0; L < 3; L++) {
      float fl = float(L);
      float n = 44.0 + 4.0 * fl;
      float ci = floor(p.x * n);
      for (int k = -1; k <= 1; k++) {
        float id = ci + float(k);
        vec2 h = cH22(vec2(id, fl + 1.0));
        float h3 = cH21(vec2(id, fl + 9.0)), pr = cH21(vec2(id, fl + 21.0));
        float yy = fract(h.y - mix(0.04, 0.09, h.x) * t);
        float xx = (id + 0.5 + 0.4 * (h3 - 0.5)) / n + 0.008 * sin(t * 1.3 + h.y * 6.2832);
        float d = max(abs((p.x - xx) * 2.39), abs(y - yy)) - mix(0.0025, 0.005, h3);
        vec3 ec = mix(vec3(0.898, 0.573, 0.157), vec3(0.984, 0.765, 0.349), step(0.8, cH21(vec2(id, fl + 33.0))));
        c = mix(c, ec, cFill(d) * step(pr, dens));
      }
    }
    return c;
  }`, `pfEmberField(p, t + 4.0, ${UNDER})`,
  { draws: "Small gold and orange square sparks floating up from the burning village, sliding sideways a little, more of them after four seconds.", use: "screen", params: "under: plate behind; t: continuous clock, rise 0.04 to 0.09 H per second, density 0.55 to 1.0 over 4 to 5 s; 3 layers of about 48 columns fixed." });

export const pfFoxGrade = P("pfFoxGrade", "last-pass grade: split tone red-black to orange, ink-floor lift, 0.92 luma cap, light TV grain held per 12 fps drawing",
  `vec3 pfFoxGrade(vec3 col, vec2 p, float t){
    float Y = cLuma(col);
    vec3 c = mix(col, vec3(0.047, 0.012, 0.016), 0.35 * (1.0 - smoothstep(0.0, 0.35, Y)));
    c = mix(c, vec3(0.745, 0.400, 0.161), 0.30 * smoothstep(0.45, 0.90, Y));
    float Y2 = cLuma(c);
    c = mix(vec3(0.102, 0.047, 0.063), c, smoothstep(0.035, 0.08, Y2));
    float tf = floor(t * 12.0);
    float g = (cH21(floor(p * vec2(1280.0, 800.0)) + vec2(tf * 37.0, tf * 11.0)) - 0.5) * 0.025 * (1.0 - Y2) * smoothstep(0.06, 0.12, Y2);
    return cCap(c + g);
  }`, `pfFoxGrade(${UNDER}, p, t)`,
  { draws: "The whole frame tinted red-black in the shadows and orange in the highlights, with dark areas lifted off pure black and a faint film grain.", use: "grade", params: "col: the composited frame; p: pixel position for the grain hash (1280 x 800 grid); t: grain pattern changes at 12 fps; tint strengths 0.35 and 0.30 fixed." });

export const pfInkBars = P("pfInkBars", "2.39:1 letterbox in studio ink #1a0c10, never black",
  `vec3 pfInkBars(vec3 col, vec2 p, float aspect){
    float h = 0.5 * (1.0 - aspect / 2.39);
    return mix(col, vec3(0.102, 0.047, 0.063), cAA(h - min(p.y, 1.0 - p.y), 0.0));
  }`, `pfInkBars(${UNDER}, p, 1.6)`,
  { draws: "Wide dark red-black bars across the top and bottom that leave a cinema-wide picture in the middle.", use: "mask", params: "col: frame; aspect: canvas width over height (1.6 for 1280 x 800) sets the bar height; ink colour fixed." });

export const pfHaoriFlame = P("pfHaoriFlame", "white haori with a cool shade step and twelve red flame tongues licking up the hem",
  `vec3 pfHaoriFlame(vec2 p, float t){
    vec3 cloth = cCel3(cNdL(p), 0.40, 0.70, vec3(0.592, 0.592, 0.643), vec3(0.722, 0.722, 0.784), vec3(0.957, 0.941, 0.902));
    float u = (p.x - 0.72) / 0.94 + 0.5;
    float i = floor(u * 12.0);
    float tri = 1.0 - abs(fract(u * 12.0) - 0.5) * 2.0;
    float hgt = 0.05 + 0.07 * cH21(vec2(i, 3.0)) + 0.015 * (cH21(vec2(i, floor(t * 12.0))) - 0.5);
    float tip = 0.20 + hgt * tri;
    vec3 flame = mix(vec3(0.847, 0.220, 0.125), vec3(0.541, 0.110, 0.063), cAA(0.17 - p.y, 0.0));
    return mix(cloth, flame, cAA(tip - p.y, 0.0));
  }`, "mix(CUT_INK * 2.2, pfHaoriFlame(p, t), cCover(p))",
  { draws: "A white coat with a grey-blue shaded fold and a red hem that rises into twelve flame points that flicker.", use: "surface", params: "t: tongue height jitters on the 12 fps clock; hem row 0.20 and 12 tongues fixed; place on the seal body like castCloth." });

export const pfMinatoHair = P("pfMinatoHair", "six spiky yellow hair clumps with a pale highlight stripe and two long bangs, swaying on twos",
  `vec3 pfMinatoHair(vec2 p, float t, vec3 under){
    float tf = floor(t * 12.0) / 12.0;
    vec2 q = p - vec2(0.72, 0.84);
    float r = length(q);
    float a = atan(q.x, q.y) + 0.04 * sin(tf * 2.0);
    float cell = (a + 0.8) / (1.6 / 6.0);
    float id = floor(cell);
    float u = fract(cell) - 0.5;
    float len = 0.16 + 0.11 * cH21(vec2(id, 5.0));
    float in1 = step(0.0, id) * (1.0 - step(5.5, id)) * (1.0 - cAA(r - len, 0.0)) * cAA(r - 0.03, 0.0);
    float cov = in1 * cAA(0.5 * (1.0 - r / len) - abs(u), 0.0);
    vec3 col = vec3(0.957, 0.835, 0.282);
    col = mix(col, vec3(0.784, 0.627, 0.125), cAA(u, 0.12));
    col = mix(col, vec3(1.0, 0.957, 0.627), (1.0 - cAA(abs(u), 0.08)) * cAA(r, 0.3 * len) * (1.0 - cAA(r, 0.8 * len)));
    float bang = 1000.0;
    for (int s = 0; s < 2; s++) {
      vec2 b0 = vec2(0.72 + (s == 0 ? -0.12 : 0.12), 0.72), b1 = b0 + vec2((s == 0 ? -0.02 : 0.02) + 0.01 * sin(tf * 2.0 + float(s)), -0.13);
      vec2 ba = b1 - b0;
      float h = clamp(dot(p - b0, ba) / dot(ba, ba), 0.0, 1.0);
      bang = min(bang, length(p - b0 - ba * h) - mix(0.016, 0.003, h));
    }
    vec3 outc = mix(under, col, cov);
    return mix(outc, vec3(0.957, 0.835, 0.282), cFill(bang));
  }`, `pfMinatoHair(p, t, ${UNDER})`,
  { draws: "A crown of six sharp blond hair spikes with a pale stripe cut into each and two thin strands falling either side of the forehead.", use: "surface", params: "under: the head surface behind; t: sway on the 12 fps clock; crown at (0.72, 0.84), clump length 0.16 to 0.27 and six clumps fixed." });

export const PACKET_SHADERS = [
  pfNightSky, pfFireBand, pfRoofRidge, pfHokageRock, pfFoxFace, pfNineTails, pfSmokeBank,
  pfBlackOrb, pfKunaiStreak, pfFlashBeat, pfEmberField, pfFoxGrade, pfInkBars, pfHaoriFlame, pfMinatoHair,
];
export default PACKET_SHADERS;
