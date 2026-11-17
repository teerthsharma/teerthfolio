// THE PAINTED SURFACES: GLSL bodies for bgMaterial (material.js). Each defines bgSurf and paints in world space, so nothing tiles or seams.
//   FACADE  a city block face: window styles (punched, ribbon, curtain, balcony), lit floors, glass that reflects the sky, sills, lintels,
//           cornice, corner pilasters, pipes, AC units, vertical signs that glow on the wall, a shopfront at the foot, grime streaks.
//   STONE   masonry and flagstones: running-bond blocks with chipped edges, per-block value, cracks, damp foot, moss.
//   GROUND  asphalt (wear, lane lines, zebra, puddles), grass, sand, snow, paving.
//   WATER   depth ramp, sky reflection through wave normals, glints, foam.
//   WOOD    planks with grain and polish.
// Palette arrives as uniforms, set from JS by the generator that makes the material.
export const FACADE = /* glsl */ `
  varying vec4 vB; varying vec4 vS;
  uniform vec3 uWall0; uniform vec3 uWall1; uniform vec3 uTrim; uniform vec3 uLitA; uniform vec3 uLitB; uniform vec3 uLitC;
  uniform vec3 uSign0; uniform vec3 uSign1; uniform vec3 uSign2; uniform vec3 uSky0; uniform vec3 uSky1; uniform vec4 uFac; uniform vec4 uFac2;
  // uFac: x night 0..1, y share of windows lit, z share of bays with a sign, w bay width scale.  uFac2: x card mode, y card w, z card h, w seed
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    emit = vec3(0.0); ao = 1.0; wet = 0.0;
    vec2 duv = uFac2.x > 0.5 ? fwidth(vUv * uFac2.yz) : fwidth(vec2(dot(P - vB.xyz, vec3(N.z, 0.0, -N.x)), P.y));
    float seed = uFac2.x > 0.5 ? uFac2.w : vB.w;
    float r0 = h21(vec2(seed, 1.7)), r1 = h21(vec2(seed, 5.1)), r2 = h21(vec2(seed, 9.3)), r3 = h21(vec2(seed, 13.9));
    vec3 wall = mix(uWall0, uWall1, r0) * (0.8 + 0.4 * r1);
    float night = uFac.x;
    float H = uFac2.x > 0.5 ? uFac2.z : vS.y;
    vec2 uv; float half_ = 9.0, lu = 0.0;
    if (uFac2.x > 0.5) { uv = vUv * vec2(uFac2.y, uFac2.z); half_ = uFac2.y * 0.5; lu = uv.x - half_; }
    else {
      if (N.y > 0.7) {
        vec3 d = P - vB.xyz; float gv = bgF3(vec3(d.x * 1.3, 0.0, d.z * 1.3) + seed);
        alb = wall * (0.55 + 0.35 * gv) * vec3(0.95, 0.97, 1.0);
        vec2 q = abs(vec2(d.x / max(vS.x * 0.5, 0.1), d.z / max(vS.z * 0.5, 0.1)));
        float lip = smoothstep(0.93, 0.965, max(q.x, q.y)); alb = mix(alb, wall * 0.35, lip);
        vec2 c = vec2(vS.x * 0.5 - 0.7, vS.z * 0.5 - 0.7) * sign(vec2(d.x, d.z));
        float red = 1.0 - smoothstep(0.25, 0.5, length(vec2(d.x, d.z) - c));
        emit = vec3(1.6, 0.04, 0.05) * red * (0.4 + 0.6 * night) * step(40.0, H) * (0.5 + 0.5 * sin(uTime * 2.2 + seed * 9.0));
        return;
      }
      vec3 d = P - vB.xyz;
      lu = dot(d, vec3(N.z, 0.0, -N.x)); uv = vec2(lu, P.y);
      half_ = abs(N.x) > abs(N.z) ? vS.z * 0.5 : vS.x * 0.5;
      float face = floor(atan(N.z, N.x) * 0.6366 + 0.5);
      uv.x += face * 17.3 + r2 * 31.0;
    }
    float fh = mix(3.2, 4.4, r1) * uFac.w, cw = mix(2.2, 3.8, r2) * uFac.w;
    vec2 g = vec2(uv.x / cw, uv.y / fh), id = floor(g), f = fract(g);
    float style = floor(r3 * 4.0);
    float dy = uFac2.x > 0.5 ? uv.y : P.y;

    // masonry and panel texture: vertical bristle, panel value, joints
    float panel = h21(id * 1.31 + seed);
    alb = wall * (0.88 + 0.08 * floor(panel * 4.0));
    float st = bgN3(vec3(uv.x * 2.3, uv.y * 0.07, seed));
    alb *= 1.0 - 0.2 * smoothstep(0.55, 0.85, st);
    alb *= 1.0 - 0.14 * smoothstep(0.6, 0.9, bgF3(vec3(uv * 0.35, seed * 2.0))) * bgLod(1.0);
    float slab = 1.0 - smoothstep(0.0, 0.05, f.y);
    alb = mix(alb, wall * 0.45, slab);

    // window rectangle by style
    vec2 lo = vec2(0.18, 0.22), hi = vec2(0.82, 0.78);
    if (style < 0.5) { lo = vec2(0.18, 0.2); hi = vec2(0.82, 0.8); }
    else if (style < 1.5) { lo = vec2(0.0, 0.24); hi = vec2(1.0, 0.74); }
    else if (style < 2.5) { lo = vec2(0.03, 0.03); hi = vec2(0.97, 0.97); }
    else { lo = vec2(0.14, 0.2); hi = vec2(0.86, 0.84); }
    float win = bgBox(f, lo, hi);
    float frame = win * (1.0 - bgBox(f, lo + vec2(0.05, 0.04), hi - vec2(0.05, 0.04)));
    float sill = bgBox(f, vec2(lo.x - 0.03, lo.y - 0.07), vec2(hi.x + 0.03, lo.y - 0.005));
    float lintel = bgBox(f, vec2(lo.x - 0.03, hi.y), vec2(hi.x + 0.03, hi.y + 0.06));
    float floorBand = step(dy, 4.4);
    // the lit state: whole floors dim, then each pane
    float fl = h21(vec2(id.y * 1.9, seed * 3.3));
    float share = uFac.y * (fl < 0.22 ? 0.12 : fl > 0.78 ? 1.0 : 0.55);
    float wr = h21(id * 1.37 + seed * 7.1);
    float lit = step(1.0 - share, wr) * night;
    float cc = h21(id + 11.0 + seed);
    vec3 litC = cc < 0.6 ? uLitA : cc < 0.86 ? uLitB : uLitC;
    // glass reflecting the sky, with the anime diagonal sheen across panes
    vec3 refl = mix(uSky0, uSky1, smoothstep(0.0, 70.0, dy));
    float streak = smoothstep(0.0, 0.09, fract((uv.x * 0.7 + uv.y * 0.42) * 0.085 + r0 * 3.0) - 0.84);
    float paneV = 0.55 + 0.45 * h21(id + seed);
    vec3 glass = refl * (0.2 + 0.32 * paneV) * mix(1.1, 0.45, night) + refl * streak * mix(0.6, 0.25, night);
    float curtain = 0.0;
    vec3 inner = litC * (1.25 + 0.4 * h21(id.yx + 3.0)) * (1.0 - 0.85 * curtain * smoothstep(0.35, 0.5, abs(f.x - 0.5)) * 0.0);
    inner *= 1.0 - 0.5 * curtain * (1.0 - smoothstep(0.0, 0.2, abs(f.x - 0.5)));
    vec3 paneAlb = glass; vec3 paneEmit = inner * lit;
    // the shopfront at the foot: big lit glass, an awning strip, a dark door
    if (dy < 4.4 && uFac2.x < 0.5) {
      float sw = h21(vec2(floor(uv.x / 2.6), seed));
      vec2 sf = vec2(fract(uv.x / 2.6), dy / 4.4);
      float shop = bgBox(sf, vec2(0.08, 0.1), vec2(0.92, 0.52));
      float door = step(0.9, sw) * bgBox(sf, vec2(0.36, 0.0), vec2(0.64, 0.72));
      vec3 shopC = sw < 0.45 ? uLitA : sw < 0.8 ? uLitB : uLitC;
      float shelf = 0.85;
      alb = mix(alb, uTrim * 0.4, bgBox(sf, vec2(0.0, 0.52), vec2(1.0, 0.84)));
      alb = mix(alb, glass * 0.6, shop);
      emit += shopC * shelf * shop * (1.0 - door) * mix(0.25, 1.35, night) * (0.9 + 0.1 * step(0.5, h21(floor(sf * vec2(3.0, 2.0)) + sw)));
      alb = mix(alb, vec3(0.012), door);
      float aw = bgBox(sf, vec2(0.02, 0.54), vec2(0.98, 0.64));
      alb = mix(alb, mix(uSign2, uSign0, step(0.5, fract(uv.x * 0.8))) * 0.55, aw);
      emit += mix(uSign2, uSign0, step(0.5, fract(uv.x * 0.8))) * aw * 0.3 * night;
    } else {
      alb = mix(alb, paneAlb, win);
      emit += paneEmit * win;
      alb = mix(alb, uTrim * 0.16, frame);
      float mull = win * step(f.x, 0.5 + 0.02) * step(0.5 - 0.02, f.x) * step(style, 2.5);
      alb = mix(alb, uTrim * 0.16, mull * (1.0 - step(1.5, style) * 0.0));
      alb = mix(alb, uTrim * 0.95, sill * (1.0 - win));
      alb = mix(alb, wall * 0.35, lintel * (1.0 - win));
      // the balcony style: a rail, a slab, a lit door inside
      if (style > 2.5) {
        float rail = bgBox(f, vec2(0.08, 0.0), vec2(0.92, 0.16));
        alb = mix(alb, uTrim * 0.3, rail * (1.0 - step(0.5, fract(f.x * 14.0))));
        alb = mix(alb, uTrim * 0.8, bgBox(f, vec2(0.04, 0.13), vec2(0.96, 0.17)));
      }
      // an AC unit under some windows
      float acR = h21(id + 21.0 + seed);
      if (acR > 0.85 && style != 2.0) {
        float ac = bgBox(f, vec2(0.55, 0.03), vec2(0.93, 0.19));
        float fan = 1.0 - smoothstep(0.03, 0.045, length((f - vec2(0.74, 0.11)) * vec2(1.0, 0.6)));
        alb = mix(alb, uTrim * 0.55, ac);
        alb = mix(alb, vec3(0.01), fan * ac);
      }
    }
    float cellPx = max(duv.x / cw, duv.y / fh), aa = smoothstep(0.05, 0.3, cellPx);
    alb = mix(alb, mix(wall, paneAlb, 0.28), aa); emit *= 1.0 - 0.75 * aa;
    // corner pilasters and the cornice
    float edge = smoothstep(half_ - 0.9, half_ - 0.55, abs(lu));
    alb = mix(alb, uTrim * 0.8, edge * 0.55);
    float cor = smoothstep(H - 1.2, H - 1.05, dy);
    alb = mix(alb, uTrim * 0.9, cor * step(dy, H - 0.4));
    alb *= 1.0 - 0.45 * smoothstep(H - 1.05, H - 0.9, dy) * (1.0 - step(H - 0.4, dy));
    // vertical pipes
    float pu = fract(uv.x / (cw * 3.0) + r0), pipe = (1.0 - smoothstep(0.006, 0.012, abs(pu - 0.02))) * step(r1, 0.62);
    alb = mix(alb, uTrim * 0.2, pipe * step(4.4, dy));
    alb = mix(alb, uTrim * 0.7, (1.0 - smoothstep(0.003, 0.006, abs(pu - 0.027))) * step(r1, 0.62) * step(4.4, dy));
    // vertical signs: glyph rhythm, glowing, spilling light on the wall beside
    float bid = floor(uv.x / cw), sb = h21(vec2(bid, seed + 0.5));
    float y0 = 4.6 + floor(h21(vec2(bid, seed + 2.5)) * 5.0) * fh * 0.6, len = (1.0 + floor(h21(vec2(bid, seed + 4.5)) * 3.0)) * fh;
    float sx = fract(uv.x / cw);
    if (sb < uFac.z && uFac2.x < 0.5) {
      float inY = step(y0, dy) * step(dy, y0 + len), inX = bgBox(vec2(sx, 0.5), vec2(0.7, 0.0), vec2(0.94, 1.0));
      float sg = h21(vec2(bid, seed + 6.5));
      vec3 sc = sg < 0.4 ? uSign0 : sg < 0.75 ? uSign1 : uSign2;
      vec2 cell = floor(vec2((sx - 0.7) * cw * 3.4, (dy - y0) / 0.8));
      float gp = h21(cell + bid * 3.1), glyph = step(0.42, gp) * bgBox(fract(vec2((sx - 0.7) * cw * 3.4, (dy - y0) / 0.8)), vec2(0.2, 0.18), vec2(0.8, 0.82));
      float body = inY * inX;
      alb = mix(alb, sc * 0.3, body);
      emit += sc * body * (1.0 + 0.7 * glyph) * mix(0.3, 1.5, night);
      float halo = exp(-max(0.0, abs(sx - 0.82) - 0.12) * cw * 0.9) * inY * (1.0 - inX);
      emit += sc * halo * 0.22 * night * (1.0 - win);
    }
    // the foot and the wet: nothing here, the frame darkens and the pools mirror
    ao = 0.78 + 0.22 * smoothstep(0.0, 12.0, dy);
    wet = 0.0;
  }
`;

export const STONE = /* glsl */ `
  uniform vec3 uSt0; uniform vec3 uSt1; uniform vec3 uMortar; uniform vec3 uMoss; uniform vec4 uBlk; uniform vec4 uSt;
  // uBlk: x block w, y block h, z chip, w crack.  uSt: x moss, y gloss 0..1 (polished floor), z seed, w mottle
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    emit = vec3(0.0); ao = 1.0;
    vec3 an = abs(N); vec2 uv = an.y > max(an.x, an.z) ? P.xz : (an.x > an.z ? P.zy : P.xy);
    bool floorish = an.y > max(an.x, an.z);
    vec2 bs = floorish ? vec2(uBlk.x * 1.4, uBlk.x * 1.4) : uBlk.xy;
    vec2 b = uv / bs; b.x += floor(b.y) * 0.5 + h21(vec2(floor(b.y), uSt.z)) * 0.3;
    vec2 bi = floor(b), bf = fract(b);
    float m = min(min(bf.x * bs.x, (1.0 - bf.x) * bs.x), min(bf.y * bs.y, (1.0 - bf.y) * bs.y));
    float chip = ((bgN3(vec3(P * 11.0)) - 0.5) * uBlk.z + (bgN3(vec3(P * 27.0)) - 0.5) * uBlk.z * 0.5) * bgLod(14.0);
    float seam = smoothstep(0.012, 0.03, m + chip);
    float bv = h21(bi + uSt.z);
    vec3 base = mix(uSt0, uSt1, bv) * (0.82 + 0.3 * bv);
    float edge = 1.0 - smoothstep(0.0, 0.1, m + chip * 0.5);
    float topEdge = step(0.5, bf.y);
    base *= 1.0 + edge * (topEdge > 0.5 ? 0.34 : -0.3);
    float mott = bgF3(P * 1.1 + uSt.z) * 0.6 + bgF3(P * 4.6) * 0.3 * bgLod(5.0) + 0.15 * bgLod(5.0) + bgF3(P * 14.0) * 0.12 * bgLod(14.0) + 0.06 * (1.0 - bgLod(14.0));
    base *= 1.0 - uSt.w * 0.45 + uSt.w * 0.9 * mott;
    vec2 vv = vor(uv * 1.6 + bi * 0.0);
    float crack = (1.0 - smoothstep(0.0, 0.05, vv.y)) * step(0.55, bgN3(P * 1.6 + 5.0));
    base *= 1.0 - uBlk.w * crack;
    float stain = bgN3(vec3(uv.x * 2.6, uv.y * 0.22, uSt.z));
    base *= 1.0 - 0.3 * smoothstep(0.55, 0.85, stain) * (floorish ? 0.4 : 1.0);
    float damp = (1.0 - smoothstep(0.0, 1.8, P.y)) * (0.35 + 0.65 * bgF3(P * 2.3));
    base = mix(base, uMoss * (0.7 + 0.5 * bgF3(P * 6.0)), uSt.x * damp * smoothstep(0.35, 0.65, bgF3(P * 1.7 + 3.0)));
    alb = mix(uMortar, base, seam);
    wet = uSt.y * (floorish ? 1.0 : 0.15) * seam;
    ao = mix(0.55, 1.0, seam) * (0.8 + 0.2 * smoothstep(0.0, 0.35, m));
  }
`;

export const GROUND = /* glsl */ `
  uniform vec3 uG0; uniform vec3 uG1; uniform vec3 uG2; uniform vec3 uG3; uniform vec4 uGr; uniform vec4 uMk; uniform vec3 uRefl;
  // uGr: x kind (0 asphalt 1 grass 2 sand 3 snow 4 paving), y scale, z puddle cover 0..1, w seed.  uMk: x zebra z0, y zebra z1, z road half width (0 = none), w stripe m
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    emit = vec3(0.0); ao = 1.0; wet = 0.0;
    vec2 p = P.xz * uGr.y; float k = uGr.x;
    float big = bgF3(vec3(p * 0.35, uGr.w)), mid = mix(0.5, bgF3(vec3(p * 1.7, uGr.w + 4.0)), bgLod(1.7 * uGr.y)), fine = mix(0.5, bgN3(vec3(p * 22.0, 3.0)), bgLod(22.0 * uGr.y));
    if (k < 0.5) {
      alb = mix(uG0, uG1, smoothstep(0.3, 0.75, big)) * (0.82 + 0.3 * mid);
      alb *= 0.96 + 0.08 * smoothstep(0.78, 0.9, fine);
      float lane = abs(fract(P.x / 3.6 + 0.5) - 0.5);
      alb *= 1.0 - 0.28 * smoothstep(0.1, 0.0, abs(lane - 0.22)) * (0.5 + big);
      float patch_ = smoothstep(0.62, 0.7, bgF3(vec3(p * 0.6, uGr.w + 9.0)));
      alb = mix(alb, uG0 * 0.55, patch_ * 0.7);
      float crk = 1.0 - smoothstep(0.0, 0.035, vor(p * 0.9).y); alb *= 1.0 - 0.5 * crk * step(0.5, bgN3(vec3(p * 0.7, 1.0)));
      if (uMk.z > 0.0) {
        float ax = abs(P.x), inRoad = step(ax, uMk.z);
        float edgeL = (1.0 - smoothstep(0.06, 0.1, abs(ax - (uMk.z - 0.45)))) * inRoad;
        float dash = step(0.5, fract(P.z / 6.0)) * (1.0 - smoothstep(0.05, 0.09, ax));
        alb = mix(alb, uG3 * 0.85, max(edgeL, dash * inRoad) * (0.65 + 0.35 * mid));
        float zb = step(uMk.x, P.z) * step(P.z, uMk.y) * step(0.5, fract(P.x / (uMk.w * 1.4))) * inRoad;
        alb = mix(alb, uG3 * (0.55 + 0.2 * mid) * (0.8 + 0.2 * smoothstep(0.25, 0.55, bgF3(vec3(p * 3.0, 2.0)))), zb * 0.7);
        float kerb = step(uMk.z, ax) * (1.0 - step(uMk.z + 1.4, ax));
        alb = mix(alb, mix(uG2, uG1, bgF3(vec3(p * 2.1, 8.0))) * 1.3, kerb);
      }
      float pud = smoothstep(0.56, 0.62, bgF3(vec3(p * 0.22, uGr.w + 20.0)) + (uGr.z - 0.5) * 0.45) * step(0.001, uGr.z);
      wet = pud;
      alb = mix(alb, alb * 0.7, pud);
      emit += uRefl * pud * (0.35 + 0.7 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0)) * (0.7 + 0.3 * bgN3(vec3(P.x * 3.0, 0.0, P.z * 0.4)));
    } else if (k < 1.5) {
      float s1 = bgBrush(P.xz * 2.6, 1.15, 0.9), s2 = bgBrush(P.xz * 6.0 + 4.0, 1.5, 0.5);
      float v = bgTone(0.42 * s1 + 0.3 * s2 + 0.3 * big, 4.0, 0.12);
      alb = bgRamp5(v, uG2 * 0.7, uG1, uG0, uG0 * 1.3, uG3);
      alb *= 0.85 + 0.3 * mid;
      float flower = step(0.992, h21(floor(P.xz * 7.0))) * (0.5 + 0.5 * bgN3(P * 9.0));
      alb = mix(alb, uG3, flower);
    } else if (k < 2.5) {
      float rip = sin((P.x * 0.7 + P.z * 0.4 + big * 4.0) * 5.0) * 0.5 + 0.5;
      alb = mix(uG0, uG1, bgTone(0.5 * big + 0.35 * rip + 0.15 * mid, 4.0, 0.1)) * (0.9 + 0.2 * fine);
      alb = mix(alb, uG2, step(0.97, fine) * 0.6);
    } else if (k < 3.5) {
      alb = mix(uG1, uG0, bgTone(0.6 * big + 0.4 * mid, 3.0, 0.14)); alb = mix(alb, uG3, step(0.985, fine) * 0.9);
      emit += uG3 * step(0.996, bgN3(vec3(P.xz * 60.0, floor(uTime * 4.0)))) * 0.9;
    } else {
      vec2 b = P.xz * uGr.y / 1.1; b.x += floor(b.y) * 0.5; vec2 bf = fract(b), bi = floor(b);
      float m = min(min(bf.x, 1.0 - bf.x), min(bf.y, 1.0 - bf.y)); float seam = smoothstep(0.012, 0.045, m);
      alb = mix(uG2 * 0.5, mix(uG0, uG1, h21(bi + uGr.w)) * (0.85 + 0.3 * mid), seam);
      wet = uGr.z * 0.6 * seam;
    }
  }
`;

export const WATER = /* glsl */ `
  uniform vec3 uW0; uniform vec3 uW1; uniform vec3 uSky0; uniform vec3 uSky1; uniform vec3 uFoam; uniform vec4 uWv;
  // uWv: x wave scale, y wave height, z speed, w glint power
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    ao = 1.0; wet = 0.0; vec2 q = P.xz * uWv.x; float t = uTime * uWv.z;
    float h1 = bgF3(vec3(q * 1.0 + vec2(t, 0.0), 1.0)), h2 = bgF3(vec3(q * 2.7 - vec2(0.0, t * 1.3), 7.0));
    vec2 e = vec2(0.03, 0.0);
    float hx = bgF3(vec3((q + e.xy) * 1.0 + vec2(t, 0.0), 1.0)) + bgF3(vec3((q + e.xy) * 2.7 - vec2(0.0, t * 1.3), 7.0)) * 0.5;
    float hz = bgF3(vec3((q + e.yx) * 1.0 + vec2(t, 0.0), 1.0)) + bgF3(vec3((q + e.yx) * 2.7 - vec2(0.0, t * 1.3), 7.0)) * 0.5;
    float h0 = h1 + h2 * 0.5;
    vec3 Nw = normalize(vec3(-(hx - h0) * uWv.y * 8.0, 1.0, -(hz - h0) * uWv.y * 8.0));
    float fres = pow(1.0 - clamp(dot(Nw, V), 0.0, 1.0), 3.0);
    vec3 R = reflect(-V, Nw);
    vec3 skyC = mix(uSky0, uSky1, smoothstep(0.0, 0.6, R.y));
    vec3 deep = mix(uW0, uW1, bgTone(h0 * 0.7, 4.0, 0.1));
    alb = deep;
    emit = skyC * (0.2 + 0.8 * fres) ;
    float sp = pow(max(dot(R, normalize(uLightDir)), 0.0), 160.0 * uWv.w);
    emit += uLightCol * smoothstep(0.35, 0.5, sp) * 2.2 * (0.6 + 0.4 * h2);
    float foam = smoothstep(0.74, 0.8, h1 * 0.6 + h2 * 0.5) * 0.9;
    alb = mix(alb, uFoam, foam); emit += uFoam * foam * 0.2;
    wet = 1.0;
  }
`;

export const WOOD = /* glsl */ `
  uniform vec3 uWd0; uniform vec3 uWd1; uniform vec4 uWd;
  // uWd: x plank width, y grain scale, z gloss, w seed
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    emit = vec3(0.0); vec3 an = abs(N); bool fl = an.y > max(an.x, an.z);
    vec2 uv = fl ? P.xz : (an.x > an.z ? P.zy : P.xy);
    float pw = uWd.x; float pi_ = floor(uv.y / pw), pf = fract(uv.y / pw);
    float off = h21(vec2(pi_, uWd.w)) * 5.0, lenP = 1.6 + 1.4 * h21(vec2(pi_, 3.3));
    float bi = floor((uv.x + off) / lenP), bf = fract((uv.x + off) / lenP);
    float id = h21(vec2(pi_ * 7.0 + bi, uWd.w));
    float grain = sin((uv.y * uWd.y + bgF3(vec3(uv.x * 0.6, uv.y * 3.0, id * 10.0)) * 9.0) * 3.0) * 0.5 + 0.5;
    alb = mix(uWd0, uWd1, id) * (0.78 + 0.3 * grain);
    float gap = min(min(pf, 1.0 - pf) * pw, min(bf, 1.0 - bf) * lenP);
    float seam = smoothstep(0.004, 0.014, gap);
    alb = mix(alb * 0.18, alb, seam);
    alb *= 0.92 + 0.12 * bgBrush(uv * 4.0, 0.0, 3.0);
    wet = uWd.z * (fl ? 1.0 : 0.2) * seam; ao = mix(0.6, 1.0, seam);
  }
`;

export const PLASTER = /* glsl */ `
  uniform vec3 uPl0; uniform vec3 uPl1; uniform vec4 uPl;
  // uPl: x wainscot height (m), y seed, z grime, w crack
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    emit = vec3(0.0); wet = 0.0; vec3 an = abs(N); vec2 uv = an.x > an.z ? P.zy : P.xy;
    float wain = 1.0 - smoothstep(uPl.x - 0.01, uPl.x + 0.01, P.y);
    float tr = 0.5, mott = bgF3(vec3(uv * 0.8, uPl.y));
    vec3 base = mix(uPl0, uPl1, wain) * (0.88 + 0.2 * tr) * (0.9 + 0.2 * mott);
    float rail = smoothstep(0.03, 0.0, abs(P.y - uPl.x)) ; base = mix(base, uPl1 * 0.5, rail * 0.6);
    float rail2 = smoothstep(0.02, 0.0, abs(P.y - uPl.x - 0.06)); base = mix(base, uPl0 * 1.15, rail2 * 0.5);
    base *= 1.0 - uPl.z * smoothstep(0.55, 0.85, bgN3(vec3(uv.x * 2.0, uv.y * 0.3, uPl.y)));
    float crk = 1.0 - smoothstep(0.0, 0.03, vor(uv * 0.7).y); base *= 1.0 - uPl.w * crk * step(0.6, bgN3(vec3(uv, 4.0)));
    alb = base; ao = 0.9 + 0.1 * smoothstep(0.0, 1.2, P.y);
  }
`;

export const GLOWPANE = /* glsl */ `
  uniform vec3 uGl; uniform vec4 uGlP;
  // uGlP: x strength, y mullion cols, z mullion rows, w night
  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet) {
    alb = vec3(0.02); ao = 1.0; wet = 0.0;
    vec2 q = vUv * vec2(max(uGlP.y, 1.0), max(uGlP.z, 1.0)); vec2 f = fract(q);
    float bar = 1.0 - bgBox(f, vec2(0.04), vec2(0.96));
    float haze = 0.75 + 0.25 * smoothstep(0.0, 1.0, vUv.y);
    emit = uGl * uGlP.x * haze * (1.0 - bar * step(1.5, uGlP.y)) + vec3(0.02) * bar;
  }
`;
