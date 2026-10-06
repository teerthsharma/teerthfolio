// Sheaves / Čech cohomology / restriction / stalks / germs.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoSheafRestrictionFail",
    doc: "sheaf restriction fail: colour jump where r_{U∩V}(s_U) ≠ r_{U∩V}(s_V)",
    glsl: /* glsl */ `
    vec3 topoSheafRestrictionFail(vec2 p, float t) {
      float U = tFill(length(p - vec2(0.50, 0.5)) - 0.32);
      float V = tFill(length(p - vec2(0.96, 0.5)) - 0.32);
      float sU = 0.2 + 0.6 * tMorse(p);
      float sV = 0.2 + 0.6 * tMorse(p + vec2(0.18, 0.0)) + 0.15 * sin(t * 0.5);
      float fail = U * V * smoothstep(0.08, 0.2, abs(sU - sV));
      vec3 col = mix(tPaper(), tBirth(), U * 0.45);
      col = mix(col, tMint(), V * 0.45);
      return tTone(mix(col, tDeath(), fail));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSheafRestrictionFail(p, t); }`,
  }),
  defineModule({
    name: "topoStalkMismatch",
    doc: "stalk comparison: germs at a point from two opens disagree",
    glsl: /* glsl */ `
    vec3 topoStalkMismatch(vec2 p, float t) {
      vec2 x = vec2(0.72, 0.5);
      float g0 = tMorse(p), g1 = tTerrain(p);
      float near = exp(-length(p - x) * 6.0);
      float mis = abs(g0 - g1) * near;
      vec3 col = mix(tPaper(), tInk(), 0.15);
      col = mix(col, tBirth(), tDisk(p, x, 0.04));
      return tTone(mix(col, tDeath(), clamp(mis * 2.2, 0.0, 1.0)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoStalkMismatch(p, t); }`,
  }),
  defineModule({
    name: "topoCechCochain",
    doc: "Čech 0- and 1-cochains: values on sets and on overlaps",
    glsl: /* glsl */ `
    vec3 topoCechCochain(vec2 p, float t) {
      vec2 a = vec2(0.42, 0.5), b = vec2(1.02, 0.5);
      float U = tDisk(p, a, 0.30), V = tDisk(p, b, 0.30);
      float s0 = 0.5 + 0.5 * sin(t * 0.4), s1 = 0.5 + 0.5 * cos(t * 0.35);
      vec3 col = mix(tPaper(), mix(tBirth(), tAmber(), s0), U * 0.5);
      col = mix(col, mix(tMint(), tDeath(), s1), V * 0.5);
      col = mix(col, tSaddle(), U * V * abs(s0 - s1));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCechCochain(p, t); }`,
  }),
  defineModule({
    name: "topoCoboundaryDelta",
    doc: "Čech coboundary δ: (δs)_{UV} = s_V|U∩V − s_U|U∩V on overlaps",
    glsl: /* glsl */ `
    vec3 topoCoboundaryDelta(vec2 p, float t) {
      float sU = tMorse(p), sV = tMorse(p + vec2(0.2, 0.0));
      float U = tFill(p.x - 0.28) * tFill(0.88 - p.x) * tFill(p.y - 0.18) * tFill(0.82 - p.y);
      float V = tFill(p.x - 0.56) * tFill(1.20 - p.x) * tFill(p.y - 0.18) * tFill(0.82 - p.y);
      float del = (sV - sU) * U * V;
      vec3 col = mix(tPaper(), tMint(), U * 0.3);
      col = mix(col, tBirth(), V * 0.3);
      col = mix(col, mix(tInk(), tDeath(), 0.5 + 0.5 * sin(del * 12.0 + t)), U * V * 0.85);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCoboundaryDelta(p, t); }`,
  }),
  defineModule({
    name: "topoSheafSection",
    doc: "global section attempt: a single colour that restricts to every open",
    glsl: /* glsl */ `
    vec3 topoSheafSection(vec2 p, float t) {
      float f = tMorse(p);
      float ok = 1.0 - smoothstep(0.12, 0.28, abs(f - (0.45 + 0.08 * sin(t * 0.3))));
      vec3 col = mix(tPaper(), tBirth(), 0.35 + 0.4 * f);
      col = mix(col, tMint(), ok);
      for (int i = 0; i < 4; i++) col = mix(col, tInk(), tIso(length(p - tSite(i * 2, t)), 0.2, 1.1) * 0.35);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSheafSection(p, t); }`,
  }),
  defineModule({
    name: "topoLocalToGlobal",
    doc: "local-to-global gluing: matching local sections become one global section",
    glsl: /* glsl */ `
    vec3 topoLocalToGlobal(vec2 p, float t) {
      float u = 0.5 + 0.5 * sin(t * 0.35);
      vec3 loc = mix(tBirth(), tDeath(), step(0.72, p.x));
      vec3 glob = tMint();
      vec3 col = mix(loc, glob, u * (1.0 - abs(p.x - 0.72) * 0.8));
      col = mix(tPaper(), col, 0.8);
      col = mix(col, tInk(), tIso(p.x, 0.72, 1.6) * (1.0 - u));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLocalToGlobal(p, t); }`,
  }),
  defineModule({
    name: "topoConstantSheaf",
    doc: "constant sheaf: every stalk is the same group, restriction maps are id",
    glsl: /* glsl */ `
    vec3 topoConstantSheaf(vec2 p, float t) {
      vec3 col = mix(tPaper(), tBirth(), 0.55);
      for (int i = 0; i < 6; i++) col = mix(col, tInk(), tIso(length(p - tSite(i, t)), 0.18, 1.15) * 0.4);
      col = mix(col, tAmber(), tDisk(p, vec2(0.72, 0.5), 0.04));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoConstantSheaf(p, t); }`,
  }),
  defineModule({
    name: "topoSkyscraperStalk",
    doc: "skyscraper sheaf: a single stalk at x, zero elsewhere",
    glsl: /* glsl */ `
    vec3 topoSkyscraperStalk(vec2 p, float t) {
      vec2 x = vec2(0.72 + 0.1 * sin(t * 0.3), 0.5);
      float sky = exp(-dot(p - x, p - x) * 70.0);
      vec3 col = mix(tPaper(), tInk(), 0.12);
      return tTone(mix(col, tDeath(), sky));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSkyscraperStalk(p, t); }`,
  }),
  defineModule({
    name: "topoRestrictionMap",
    doc: "restriction maps r_{U⊂V}: arrows from a large open down to a smaller one",
    glsl: /* glsl */ `
    vec3 topoRestrictionMap(vec2 p, float t) {
      float V = tFill(length(p - vec2(0.72, 0.5)) - 0.36);
      float U = tFill(length(p - vec2(0.72, 0.5)) - 0.16);
      vec3 col = mix(tPaper(), tMint(), V * 0.4);
      col = mix(col, tBirth(), U);
      float ang = atan(p.y - 0.5, p.x - 0.72);
      float ray = tIso(fract((ang / 6.28318) * 8.0), 0.5, 2.0) * (V - U);
      return tTone(mix(col, tSaddle(), ray * 0.7));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRestrictionMap(p, t); }`,
  }),
  defineModule({
    name: "topoCechH0",
    doc: "Čech H^0: equalizer of restrictions — global sections as matching colours",
    glsl: /* glsl */ `
    vec3 topoCechH0(vec2 p, float t) {
      float s = 0.45 + 0.12 * sin(t * 0.4);
      vec3 col = mix(tPaper(), tBirth(), 0.5);
      float match = 1.0 - smoothstep(0.05, 0.18, abs(tMorse(p) - s));
      col = mix(col, tMint(), match);
      for (int i = 0; i < 5; i++) col = mix(col, tInk(), tIso(length(p - tSite(i, 0.0)), 0.2, 1.1) * 0.3);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCechH0(p, t); }`,
  }),
  defineModule({
    name: "topoCechH1",
    doc: "Čech H^1: a 1-cocycle obstruction that cannot be a coboundary (colour twist)",
    glsl: /* glsl */ `
    vec3 topoCechH1(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.5);
      float ang = atan(p.y - c.y, p.x - c.x);
      float twist = fract(ang / 6.28318 + t * 0.03);
      float ring = tBand(length(p - c), 0.16, 0.34);
      vec3 col = mix(tPaper(), tMix3(twist, tBirth(), tAmber(), tDeath()), ring);
      col = mix(col, tInk(), tIso(length(p - c), 0.16, 1.3) + tIso(length(p - c), 0.34, 1.3));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCechH1(p, t); }`,
  }),
  defineModule({
    name: "topoPresheafNotSheaf",
    doc: "presheaf that fails the sheaf equalizer: local data glue on overlaps but not globally",
    glsl: /* glsl */ `
    vec3 topoPresheafNotSheaf(vec2 p, float t) {
      float left = tFill(0.78 - p.x), right = tFill(p.x - 0.66);
      vec3 col = mix(tBirth(), tDeath(), smoothstep(0.6, 0.84, p.x));
      col = mix(tPaper(), col, 0.7);
      float glue = left * right;
      col = mix(col, tSaddle(), glue * (0.5 + 0.5 * sin(t * 2.0 + p.y * 20.0)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPresheafNotSheaf(p, t); }`,
  }),
  defineModule({
    name: "topoGermPlot",
    doc: "germs at a point: equivalence classes of local sections agreeing on a neighborhood",
    glsl: /* glsl */ `
    vec3 topoGermPlot(vec2 p, float t) {
      vec2 x = vec2(0.72, 0.5);
      float r = length(p - x);
      float germ = tMorse(p) * exp(-r * 4.0);
      float rings = tIso(r, 0.08, 1.2) + tIso(r, 0.16, 1.1) + tIso(r, 0.26, 1.1);
      vec3 col = mix(tPaper(), tMix3(0.5 + germ, tInk(), tBirth(), tAmber()), 0.75);
      return tTone(mix(col, tDeath(), rings * 0.55));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGermPlot(p, t); }`,
  }),
  defineModule({
    name: "topoSheafHom",
    doc: "Hom of stalks: pairing two stalk values as a bilinear colour mix",
    glsl: /* glsl */ `
    vec3 topoSheafHom(vec2 p, float t) {
      float a = tMorse(p), b = tTerrain(p);
      float hom = a * b * 2.0;
      vec3 col = mix(tPaper(), tBirth(), a * 0.5);
      col = mix(col, tDeath(), b * 0.5);
      col = mix(col, tAmber(), clamp(hom, 0.0, 1.0) * 0.55);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSheafHom(p, t); }`,
  }),
  defineModule({
    name: "topoRestrictionExact",
    doc: "exactness of the restriction sequence: ker(δ) = im(ε) as a cancelled overlap",
    glsl: /* glsl */ `
    vec3 topoRestrictionExact(vec2 p, float t) {
      float U = tFill(0.7 - p.x + 0.05 * sin(t)), V = tFill(p.x - 0.74);
      float eps = U * V;
      float ker = eps * (1.0 - smoothstep(0.1, 0.25, abs(tMorse(p) - 0.4)));
      vec3 col = mix(tPaper(), tMint(), U * 0.35);
      col = mix(col, tBirth(), V * 0.35);
      col = mix(col, tInk(), eps * 0.25);
      return tTone(mix(col, tAmber(), ker));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRestrictionExact(p, t); }`,
  }),
];
