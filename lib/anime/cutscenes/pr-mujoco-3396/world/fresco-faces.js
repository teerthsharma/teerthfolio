// CHARCOAL-ON-GOLD TRIPTYCH: three Giotto-weight pup faces on one gold-ground fresco register.
// Names the three PRs of this play (do not split into three mountains): 3396 | 1541 | 3450.
// Baked card: paint(p) with p.x in [0, 3] (one slot per face), p.y in [0, 1] up. Coverage in alpha.
//
// MATHS
//   slot s = floor(p.x), q = (fract(p.x), p.y). Pear head: min(ellipse dome, ellipse belly).
//   turn o.x = (s - 1) * 0.045. Height field h = 0.62 fill(head) - 0.48 eyes - 0.22 muzzle - 0.18 mouth.
//   shade = clamp(0.52 - 0.08 grad h · (-0.62, 0.78)). Egg-tempera three-tone via cel3 (sinopia / ochre / plaster).
//   charcoal: jaggedInk on head / eye / muzzle iso, graphite #3a3228 (never #000). Gold ground: fbm leaf + vor scratches.
//   craquelure: 1 - smoothstep(0, 1.6 fwidth(F2-F1), F2-F1). Luma cap 0.92: c *= min(1, 0.92 / Y).
// TOOLKIT: compose noise (fbm, vor, aaf), cel (cel3, celStep), ink (isoInk, jaggedInk), grunge (grunge2).

export const FACE_TOOLS = ["noise", "cel", "ink", "grunge"];

export const meta = {
  name: "charcoal-face",
  params: {
    paper: { def: "#d4c4b0" },
    gold: { def: "#d4a017" },
    graphite: { def: "#3a3228" },
    lumaMax: { def: 0.92 },
  },
};

// WebGL1: no GLSL arrays. Each slot is an if-chain, rows top (row 0) to bottom (row 4).
function nameGLSL() {
  return /* glsl */ `
        if (s < 0.5) {
          if (di < 0.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 1.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 7.0;
          else if (di < 1.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 1.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 7.0;
          else if (di < 2.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 5.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 7.0;
          else code = row < 0.5 ? 7.0 : row < 1.5 ? 4.0 : row < 2.5 ? 7.0 : row < 3.5 ? 5.0 : 7.0;
        } else if (s < 1.5) {
          if (di < 0.5) code = row < 0.5 ? 2.0 : row < 1.5 ? 6.0 : row < 2.5 ? 2.0 : row < 3.5 ? 2.0 : 7.0;
          else if (di < 1.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 4.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 7.0;
          else if (di < 2.5) code = row < 0.5 ? 5.0 : row < 1.5 ? 5.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 1.0;
          else code = row < 0.5 ? 2.0 : row < 1.5 ? 6.0 : row < 2.5 ? 2.0 : row < 3.5 ? 2.0 : 7.0;
        } else {
          if (di < 0.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 1.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 7.0;
          else if (di < 1.5) code = row < 0.5 ? 5.0 : row < 1.5 ? 5.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 1.0;
          else if (di < 2.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 4.0 : row < 2.5 ? 7.0 : row < 3.5 ? 1.0 : 7.0;
          else code = row < 0.5 ? 7.0 : row < 1.5 ? 5.0 : row < 2.5 ? 5.0 : row < 3.5 ? 5.0 : 7.0;
        }`;
}

export function frescoTriptychGLSL() {
  return /* glsl */ `
  const vec3 PAPER = vec3(0.8314, 0.7686, 0.6902);
  const vec3 PLASTER = vec3(0.9373, 0.8941, 0.8118);
  const vec3 GOLD_A = vec3(0.7216, 0.5176, 0.1804);
  const vec3 GOLD_B = vec3(0.8941, 0.7059, 0.3216);
  const vec3 GRAPH = vec3(0.2275, 0.1961, 0.1569);
  const vec3 SINOP = vec3(0.7216, 0.2863, 0.1843);
  const vec3 OCHRE = vec3(0.7882, 0.6039, 0.2902);
  const vec3 FLESH = vec3(0.8941, 0.7216, 0.5294);
  const vec3 LAPIS = vec3(0.1843, 0.3098, 0.5608);
  const vec3 SEPIA = vec3(0.3529, 0.2314, 0.1333);

  vec3 capLuma(vec3 c) {
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.920 / max(Y, 1e-4));
  }
  float sdEll(vec2 p, vec2 c, vec2 r) {
    return (length((p - c) / r) - 1.0) * min(r.x, r.y);
  }
  float pear(vec2 q, float turn) {
    q.x -= turn;
    float dome = sdEll(q, vec2(0.50, 0.58), vec2(0.34, 0.30));
    float belly = sdEll(q, vec2(0.50, 0.36), vec2(0.41, 0.30));
    return min(dome, belly);
  }
  float tuft(vec2 q, float turn) {
    q.x -= turn;
    float d = 1e3;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      d = min(d, sdEll(q, vec2(0.38 + fi * 0.12, 0.86 + 0.04 * (1.0 - abs(fi - 1.0))), vec2(0.055, 0.08)));
    }
    return d;
  }
  float eye(vec2 q, float s, float turn, float look) {
    q.x -= turn;
    return sdEll(q, vec2(0.50 + s * 0.16 + look, 0.56), vec2(0.085, 0.10));
  }
  float muzzle(vec2 q, float turn) {
    q.x -= turn;
    return sdEll(q, vec2(0.50, 0.40), vec2(0.10, 0.055));
  }
  float mouth(vec2 q, float turn) {
    q.x -= turn;
    vec2 c = vec2(0.50, 0.318);
    return q.y < c.y ? abs(length(q - c) - 0.055) - 0.007 : 1e3;
  }
  float height(vec2 q, float turn, float look) {
    float h = aaf(min(pear(q, turn), tuft(q, turn))) * 0.62;
    h -= aaf(eye(q, -1.0, turn, look)) * 0.48 + aaf(eye(q, 1.0, turn, look)) * 0.48;
    h -= aaf(muzzle(q, turn)) * 0.22 + aaf(-mouth(q, turn)) * 0.18;
    return h;
  }
  float bit(float code, float col) { return mod(floor(code / pow(2.0, 2.0 - col)), 2.0); }
  vec3 goldLeaf(vec2 p) {
    float leaf = fbm(p * 14.0);
    vec3 g = mix(GOLD_A, GOLD_B, smoothstep(0.32, 0.74, leaf));
    vec2 vc = vor(p * 8.5);
    float scratch = 1.0 - smoothstep(0.0, max(0.03, fwidth(vc.y) * 1.8), vc.y);
    g = mix(g, SEPIA, scratch * 0.45);
    g *= 0.88 + 0.12 * grunge2(p * 5.0, 0.4, 0.15);
    return g;
  }
  vec3 plaster(vec2 p) {
    vec3 c = mix(PAPER, PLASTER, fbm(p * 5.5));
    c *= grunge2(p * 3.4, 0.28, 0.18);
    vec2 vc = vor(p * 6.2);
    float cr = 1.0 - smoothstep(0.0, max(0.025, fwidth(vc.y) * 1.6), vc.y);
    c = mix(c, SEPIA, cr * 0.4);
    return c;
  }
  vec4 paint(vec2 p) {
    float s = clamp(floor(p.x), 0.0, 2.0);
    vec2 q = vec2(fract(p.x), p.y);
    float turn = (s - 1.0) * 0.045;
    float look = (s - 1.0) * 0.018;
    float dh = min(pear(q, turn), tuft(q, turn));
    float inHead = aaf(dh);

    vec3 col = mix(plaster(p), goldLeaf(p), 0.82);
    if (s > 0.5 && s < 1.5) {
      float nimbus = sdEll(q, vec2(0.50, 0.58), vec2(0.46, 0.48));
      col = mix(col, goldLeaf(p + 1.7), aaf(nimbus) * 0.55);
    }

    float e = 0.004;
    vec2 grad = vec2(
      height(q + vec2(e, 0.0), turn, look) - height(q - vec2(e, 0.0), turn, look),
      height(q + vec2(0.0, e), turn, look) - height(q - vec2(0.0, e), turn, look)
    ) / (2.0 * e);
    float sh = clamp(0.52 - 0.08 * dot(grad, vec2(-0.62, 0.78)), 0.0, 1.0);
    vec3 flesh = cel3(sh, 0.36, 0.70, SINOP, OCHRE, FLESH);
    flesh = mix(flesh, PAPER, 0.12);
    col = mix(col, flesh, inHead);

    float el = min(eye(q, -1.0, turn, look), eye(q, 1.0, turn, look));
    col = mix(col, mix(GRAPH, LAPIS, 0.35), aaf(el) * 0.72);
    vec2 qc = q; qc.x -= turn;
    float pupil = min(
      length((qc - vec2(0.50 - 0.16 + look, 0.555)) / vec2(0.032, 0.048)),
      length((qc - vec2(0.50 + 0.16 + look, 0.555)) / vec2(0.032, 0.048))
    );
    col = mix(col, GRAPH, 1.0 - smoothstep(0.88, 1.02, pupil));
    float hl = min(length(qc - vec2(0.46 + look, 0.60)), length(qc - vec2(0.78 + look, 0.60)));
    col = mix(col, PLASTER, 1.0 - smoothstep(0.014, 0.022, hl));

    float ink = max(jaggedInk(dh, 0.0, 1.6, 28.0, q), isoInk(el, 0.0, 1.35));
    ink = max(ink, isoInk(muzzle(q, turn), 0.0, 1.1));
    ink = max(ink, isoInk(mouth(q, turn), 0.0, 1.2));
    col = mix(col, GRAPH, clamp(ink, 0.0, 1.0));
    col = mix(col, GRAPH, (1.0 - aaf(dh + 0.02)) * inHead * 0.25);

    vec2 vc = vor(q * 7.4 + s * 3.1);
    float craze = 1.0 - smoothstep(0.0, max(0.028, fwidth(vc.y) * 1.7), vc.y);
    col = mix(col, SEPIA, craze * mix(0.22, 0.45, inHead));

    // spolvero pounce on the shade rim
    vec2 g = fract(p * 90.0) - 0.5;
    float dots = 1.0 - smoothstep(0.14, 0.22, length(g));
    col = mix(col, GRAPH, dots * craze * 0.35 * (1.0 - sh));

    if (s > 1.5) {
      float scratch = abs(q.y - (0.50 + 0.08 * sin(q.x * 9.0))) - 0.012;
      col = mix(col, GOLD_B, aaf(scratch) * inHead * 0.7);
    }

    // name cartouche: 4-digit PR id in graphite on a gold strip
    float s0 = 0.055;
    vec2 nq = (q - vec2(0.28, 0.045)) / s0;
    vec2 c = floor(nq);
    if (c.x >= 0.0 && c.x < 16.0 && c.y >= 0.0 && c.y < 5.0) {
      col = mix(col, GOLD_A, 0.85);
      float di = floor(c.x / 4.0), cx = c.x - di * 4.0, row = 4.0 - c.y;
      if (cx < 3.0 && di < 4.0) {
        float code = 0.0;
        ${nameGLSL()}
        if (bit(code, cx) > 0.5) col = mix(col, GRAPH, 1.0 - smoothstep(0.24, 0.34, length(fract(nq) - 0.5)));
      }
    }

    float pillar = min(abs(p.x - 1.0), abs(p.x - 2.0));
    col = mix(col, SEPIA, (1.0 - smoothstep(0.0, 0.012, pillar)) * 0.55);

    return vec4(capLuma(col), 1.0);
  }`;
}

