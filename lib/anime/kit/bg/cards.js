// PAINTED CARDS: silhouette rows, far skylines and foreground framing pieces, each a baked cutout card (ctx.bake.card, layer 0).
//   bgCard(ctx, kind, o)  o: { w: 2048, h: 512, size: [w m, h m], at: [x, y, z], dark, mid, rim, glow, density, lit, seed, billboard }
//   kinds   skyline crowd pines rooftops mountains ruins   (rows that stand on the horizon)
//           leaves branch rubble pillar cables ribs shrine        (foreground pieces that frame a shot at its edge)
// Every kind is a dark mass in two or three painted values with a rim of light on the side facing the light; `dark` is the mass, `mid` its
// lit value, `rim` the edge light, `glow` the window or lantern colour (emissive, above 1). A far rank is made far by passing a `dark` that
// is already mixed toward the haze colour (bgRank does this from the look).
import { Color } from "three";
import { V } from "../../paint.js";
import { PAINT } from "./glsl.js";

const f = (n) => Number(n).toFixed(4);

const SHAPES = {
  skyline: /* glsl */ `
    float x = p.x * ${"DENS"}, bi = floor(x), bf = fract(x);
    float bw = 0.55 + 0.4 * h21(vec2(bi, SEED)), top = 0.22 + 0.5 * pow(h21(vec2(bi, SEED + 3.0)), 1.4);
    float crown = step(0.7, h21(vec2(bi, SEED + 9.0))) * 0.05 * step(0.22, bf) * step(bf, bw - 0.22);
    float h = top + crown;
    cov = step(p.y, h) * step(bf, bw);
    cov = max(cov, step(0.88, h21(vec2(bi, SEED + 4.1))) * step(abs(bf - bw * 0.5), 0.012) * step(p.y, h + 0.1));
    val = clamp(p.y / max(h, 0.01), 0.0, 1.0);
    rimm = step(bf, 0.05) + step(bw - 0.04, bf) * 0.0;
    vec2 wc = vec2(bf / bw * 7.0, p.y * 70.0); vec2 wi = floor(wc), wf = fract(wc);
    float win = step(1.0 - LIT, h21(wi + bi * 7.3 + SEED)) * bgBox(wf, vec2(0.2, 0.2), vec2(0.8, 0.75)) * cov * step(0.04, p.y) * step(bf, bw - 0.02);
    glow = win;`,
  crowd: /* glsl */ `
    float x = p.x * DENS * 3.0, yy = p.y;
    for (int r = 0; r < 3; r++) {
      float fr = float(r), xx = x + fr * 0.37 + h21(vec2(fr, SEED)) * 9.0, bi = floor(xx), bf = fract(xx) - 0.5;
      float hh = 0.3 + 0.1 * h21(vec2(bi, SEED + fr)) + fr * 0.0, yb = 0.06 * fr;
      vec2 hc = vec2(bf + (h21(vec2(bi, 5.0 + fr)) - 0.5) * 0.3, yy - (hh + yb));
      float head = 1.0 - smoothstep(0.17, 0.2, length(hc * vec2(1.0, 1.0) * vec2(1.0, 1.4)));
      float body = step(abs(bf * 1.0), 0.42 - 0.35 * smoothstep(hh - 0.22, hh - 0.04, yy - yb)) * step(yy - yb, hh - 0.12);
      float arm = step(0.78, h21(vec2(bi, SEED + 7.0 + fr))) * step(abs(bf - 0.28), 0.045) * step(yy - yb, hh + 0.2) * step(hh - 0.1, yy - yb);
      float c = max(max(head, body), arm);
      if (c > cov) { cov = c; val = 0.25 + 0.2 * fr + 0.5 * smoothstep(hh - 0.1, hh + 0.2, yy - yb); rimm = smoothstep(0.1, 0.2, hc.x) * head; }
    }`,
  pines: /* glsl */ `
    float x = p.x * DENS, bi = floor(x), bf = fract(x) - 0.5;
    float th = 0.35 + 0.5 * h21(vec2(bi, SEED)), off = (h21(vec2(bi, SEED + 2.0)) - 0.5) * 0.4;
    float y = p.y / th, tiers = 7.0;
    float ty = fract(y * tiers); float w = (1.0 - y) * (0.46 + 0.1 * ty) * (1.0 - 0.4 * ty);
    cov = step(abs(bf - off), w) * step(y, 1.0) * step(0.0, y);
    cov = max(cov, step(abs(bf - off), 0.02) * step(p.y, 0.1));
    val = 0.3 + 0.6 * smoothstep(-0.4, 0.4, bf - off) * ty; rimm = step(0.0, bf - off) * ty * 0.6;`,
  rooftops: /* glsl */ `
    float x = p.x * DENS, bi = floor(x), bf = fract(x);
    float bw = 0.7 + 0.25 * h21(vec2(bi, SEED)), wh = 0.14 + 0.16 * h21(vec2(bi, SEED + 3.0)), rh = wh + 0.1 + 0.08 * h21(vec2(bi, SEED + 5.0));
    float wall = step(p.y, wh) * step(bf, bw);
    float roof = step(p.y, mix(wh, rh, 1.0 - abs(bf / bw - 0.5) * 2.0)) * step(wh, p.y) * step(bf, bw);
    float chim = step(0.7, h21(vec2(bi, SEED + 8.0))) * step(abs(bf - bw * 0.78), 0.035) * step(p.y, rh + 0.03);
    cov = max(max(wall, roof), chim); val = p.y / rh; rimm = step(bf / bw, 0.5) * roof;
    vec2 wc = vec2(bf / bw * 4.0, p.y * 18.0); vec2 wi = floor(wc), wf = fract(wc);
    glow = step(1.0 - LIT, h21(wi + bi * 5.0 + SEED)) * bgBox(wf, vec2(0.25, 0.25), vec2(0.75, 0.75)) * wall * step(0.04, p.y);`,
  mountains: /* glsl */ `
    float r1 = ridged(vec2(p.x * DENS * 0.4 + SEED, 0.0)) , r2 = ridged(vec2(p.x * DENS * 1.1 + SEED * 3.0, 1.0));
    float h = 0.18 + 0.5 * pow(r1, 1.3) + 0.08 * r2;
    cov = step(p.y, h); val = smoothstep(0.0, h, p.y);
    float slope = ridged(vec2((p.x + 0.01) * DENS * 0.4 + SEED, 0.0)) - r1;
    rimm = smoothstep(0.0, 0.08, -slope) * smoothstep(h - 0.12, h, p.y);`,
  shrine: /* glsl */ `
    float x = abs(p.x / ASP - 0.5), cc = 0.0, vv = 0.0, rm = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i), y0 = 0.1 + 0.24 * fi, hw = 0.44 - 0.12 * fi, hh = 0.17 - 0.025 * fi;
      float u = clamp((p.y - y0) / hh, 0.0, 1.0);
      float up = 0.06 * pow(smoothstep(hw * 0.45, hw + 0.04, x), 2.0);
      float eave = step(y0 + up, p.y) * step(p.y, y0 + hh * (1.0 - 0.8 * smoothstep(0.0, hw + 0.05, x)) + up) * step(x, hw + 0.04);
      float body = step(y0 - 0.1, p.y) * step(p.y, y0 + 0.01) * step(x, hw * 0.6);
      float brk = step(y0 - 0.115, p.y) * step(p.y, y0 - 0.095) * step(x, hw * 0.78) * step(0.5, fract(x * 40.0));
      float lan = step(abs(x - hw * 0.5), 0.012) * step(y0 - 0.2, p.y) * step(p.y, y0 - 0.12) * step(0.5, fi + 0.5);
      cc = max(cc, max(max(eave, body), max(brk, lan)));
      if (eave > 0.5) { vv = 0.1 + 0.6 * u; rm = smoothstep(hw * 0.5, hw + 0.04, x) * 0.9 + (1.0 - u) * 0.3; }
    }
    float spire = step(x, 0.008) * step(p.y, 0.9) * step(0.55, p.y) + step(x, 0.02) * step(abs(p.y - 0.62), 0.012);
    cov = max(cc, spire); val = vv; rimm = rm;`,
  ruins: /* glsl */ `
    float x = p.x * DENS, bi = floor(x), bf = fract(x);
    float kind = h21(vec2(bi, SEED)); float top = 0.2 + 0.55 * h21(vec2(bi, SEED + 1.0));
    float jag = (vn(vec2(p.x * 40.0, SEED)) - 0.5) * 0.05;
    float wall = step(p.y, top + jag) * step(bf, 0.8);
    float arch = step(0.55, kind) * (1.0 - step(length(vec2(bf - 0.4, (p.y - 0.12) * 1.4)), 0.2) * step(p.y, 0.3));
    float col = step(kind, 0.25) * step(abs(bf - 0.4), 0.07) * step(p.y, top * 1.4);
    cov = max(wall * arch, col); val = 0.2 + 0.7 * p.y; rimm = step(bf, 0.08) * cov;`,
  leaves: /* glsl */ `
    vec2 q = p - vec2(0.0, 1.0); float best = 0.0;
    for (int i = 0; i < 14; i++) {
      float fi = float(i), a = -1.2 + fi * 0.15 + (h21(vec2(fi, SEED)) - 0.5) * 0.5, L = 0.55 + 0.7 * h21(vec2(fi, SEED + 1.0));
      vec2 d = rot(a) * q; float u = -d.y / L; float wdt = 0.16 * sin(3.14159 * clamp(u, 0.0, 1.0)) * (1.0 - 0.3 * u);
      float inL = step(0.0, u) * step(u, 1.0) * step(abs(d.x), wdt);
      if (inL > best) { best = inL; val = 0.2 + 0.6 * (0.5 + 0.5 * sign(d.x) * smoothstep(0.0, wdt, abs(d.x))) * (1.0 - 0.3 * u); rimm = step(0.5, 0.5 + 0.5 * sign(d.x)) * (1.0 - smoothstep(0.7 * wdt, wdt, abs(d.x))); glow = step(abs(d.x), 0.006) * 0.4; }
    }
    cov = best;`,
  branch: /* glsl */ `
    vec2 q = p; float y = 0.78 - 0.55 * q.x / ASP + (fbm(vec2(q.x * 2.0, SEED)) - 0.5) * 0.12;
    float tw = 0.014 + 0.03 * (1.0 - q.x / ASP);
    cov = step(abs(q.y - y), tw); val = 0.2; rimm = step(0.0, q.y - y) * cov * 0.5;
    for (int i = 0; i < 10; i++) { float fi = float(i), bx = ASP * (0.08 + 0.09 * fi);
      float by = 0.78 - 0.55 * bx / ASP + (fbm(vec2(bx * 2.0, SEED)) - 0.5) * 0.12;
      for (int k = 0; k < 6; k++) { float fk = float(k);
        float a = -2.6 + fk * 0.55 + (h21(vec2(fi, fk + SEED)) - 0.5) * 0.5, L = 0.2 + 0.1 * h21(vec2(fk, fi + 2.0));
        vec2 dir = vec2(cos(a), sin(a)); vec2 d = q - vec2(bx, by) - dir * L * 0.5; vec2 e = rot(-a) * d;
        float lf = 1.0 - smoothstep(0.85, 1.0, length(vec2(e.x / (L * 0.5), e.y / (L * 0.2 * (1.0 - 0.5 * abs(e.x / L))))));
        if (lf > 0.5) { cov = 1.0; val = 0.25 + 0.55 * (0.5 + 0.5 * sign(e.y) * (0.4 + h21(vec2(fi, fk)))) ; rimm = step(0.0, e.y) * 0.9; }
      } }`,
  rubble: /* glsl */ `
    float x = p.x * DENS, bi = floor(x), bf = fract(x);
    float h = 0.12 + 0.4 * pow(h21(vec2(bi, SEED)), 2.0) + 0.1 * sin(p.x * 14.0);
    float slab = step(p.y, h) * step(0.06 * h21(vec2(bi, 2.0)), bf);
    float cut = step(p.y, h - 0.05 * h21(vec2(floor(p.x * 31.0), SEED)));
    cov = slab * mix(1.0, cut, 0.5);
    float rebar = step(0.8, h21(vec2(bi, SEED + 6.0))) * step(abs(bf - 0.5 - 0.1 * (p.y - h)), 0.006) * step(h, p.y) * step(p.y, h + 0.14);
    cov = max(cov, rebar); val = 0.15 + 0.7 * smoothstep(0.0, h, p.y); rimm = step(h - 0.03, p.y) * cov;`,
  pillar: /* glsl */ `
    float x = p.x / ASP; float w = 0.5;
    cov = step(abs(x - 0.5), 0.5);
    float flute = 0.5 + 0.5 * cos((x - 0.5) * 6.28318 * 4.0);
    val = 0.12 + 0.55 * smoothstep(0.0, 1.0, 1.0 - abs(x - 0.25) * 1.6) + 0.12 * flute; rimm = step(0.93, x);`,
  cables: /* glsl */ `
    float cb = 0.0;
    for (int i = 0; i < 4; i++) { float fi = float(i); float y = 0.8 - fi * 0.06 - 0.12 * sin(p.x / ASP * 3.14159) * (0.7 + 0.3 * fi * 0.3);
      cb = max(cb, 1.0 - smoothstep(0.003, 0.0055, abs(p.y - y))); }
    float pole = step(abs(p.x / ASP - 0.04), 0.012) * step(p.y, 0.95);
    float arm = step(abs(p.x / ASP - 0.04), 0.07) * step(abs(p.y - 0.88), 0.008);
    cov = max(cb, max(pole, arm)); val = 0.2; rimm = 0.0;`,
  ribs: /* glsl */ `
    float x = p.x / ASP; float ar = abs(x - 0.5) * 2.0;
    float curve = 1.0 - pow(ar, 2.2) * 0.9;
    float rib = 1.0 - smoothstep(0.0, 0.03, abs(p.y - (0.55 + 0.4 * curve)));
    float beam = step(abs(fract(x * 5.0) - 0.5), 0.02) * step(0.55 + 0.4 * curve, p.y);
    cov = max(rib, beam * 0.8); val = 0.3 + 0.4 * p.y; rimm = step(0.5, fract(x * 5.0 + 0.2)) * rib;`,
};

export const CARD_KINDS = Object.keys(SHAPES);

export function cardGLSL(kind, o = {}) {
  const asp = (o.w ?? 2048) / (o.h ?? 512);
  const body = (SHAPES[kind] ?? SHAPES.skyline).replace(/DENS/g, f(o.density ?? (kind === "crowd" ? 18 : kind === "pines" ? 26 : 14))).replace(/SEED/g, f(o.seed ?? 3)).replace(/LIT/g, f(o.lit ?? 0.2)).replace(/ASP/g, f(asp));
  const col = (k, d) => V(o[k] ?? d);
  return /* glsl */ `
  vec4 paint(vec2 p) {
    float cov = 0.0, val = 0.0, rimm = 0.0, glow = 0.0;
    ${body}
    vec3 dark = ${col("dark", "#0a0810")}, mid = ${col("mid", "#2a2438")}, rimc = ${col("rim", "#ff8a50")}, gl = ${col("glow", "#ffd890")};
    vec3 c = mix(dark, mid, bgTone(val, 3.0, 0.14)) * (0.9 + 0.2 * fbm(p * 30.0));
    c += rimc * rimm * ${f(o.rimK ?? 0.9)} + gl * glow * 1.6;
    return vec4(c, cov);
  }`;
}

export function bgCard(ctx, kind, o = {}) {
  const w = o.w ?? 2048, h = o.h ?? 512, size = o.size ?? [60, 15];
  const mesh = ctx.bake.card(`${PAINT}\n${cardGLSL(kind, { ...o, w, h })}`, { w, h, size, tools: ["noise"], billboard: o.billboard, id: o.id ?? 0.5 });
  mesh.position.set(...(o.at ?? [0, size[1] / 2, -80]));
  if (o.yaw) mesh.rotation.y = o.yaw;
  return mesh;
}

const mixHex = (a, b, k) => "#" + new Color(a).lerp(new Color(b), k).getHexString();

// a rank of far silhouettes: dark and mid are pulled toward the look's haze colour by `k` (0 near, 1 lost in the air), so the ranks pale in turn
export function bgRank(ctx, look, kind, o = {}) {
  const hz = "#" + new Color().fromArray(look.u.uHaze.value.toArray()).getHexString(), k = o.k ?? 0.5;
  return bgCard(ctx, kind, { dark: mixHex(o.dark ?? "#0a0810", hz, k), mid: mixHex(o.mid ?? "#2a2438", hz, k * 0.95), rim: mixHex(o.rim ?? "#ff8a50", hz, k * 0.6), glow: o.glow ?? "#ffd890", rimK: (o.rimK ?? 0.9) * (1 - k * 0.7), ...o });
}
