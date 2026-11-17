// S4b PHOTO: the director of photography. Runs on the satsuei composite (HDR, id in alpha) before the lens and the bloom:
//   G    view normal xy, linear z, id from the two depth buffers
//   PROBE the colours round the hero (behind, below, above): the rig's auto rim, fill, bounce and haze
//   LIGHT key terminator + screen-space contact shadows (the face takes the brow and nose shadow), coloured rim(s),
//        fill and bounce, the value pattern (darks, one focal pool), halo, haze, mist floor, shafts, embers, paint
//   GLOW  dual-Kawase halation of hot pixels, tinted, bleeding over the set and spilling thinly on the hero
//   COMP  glow, the lens response to a hit (flash, chromatic split, blown frame), the colour script, the hero luma cap
import { Color, HalfFloatType, LinearFilter, Matrix4, NearestFilter, Vector2, Vector3, Vector4, WebGLRenderTarget } from "three";
import { Quad } from "./pass.js";
import { RX } from "./common.glsl.js";
import { merge, moodFor, photoAt, resolvePhoto } from "./photo-presets.js";

const h2f = (h) => { const e = (h >> 10) & 31, m = h & 1023, s = h & 32768 ? -1 : 1; return e === 0 ? s * m * 5.960464477539063e-8 : e === 31 ? s * 65504 : s * (1 + m / 1024) * 2 ** (e - 15); };

const G_FS = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tDA; uniform sampler2D tDB; uniform mat4 uInvProj; uniform vec2 uPx; varying vec2 vUv;
  ${RX}
  float dep(vec2 uv) { return min(texture2D(tDA, uv).r, texture2D(tDB, uv).r); }
  vec3 vpos(vec2 uv) { return rxViewPos(uv, dep(uv), uInvProj); }
  void main() {
    float d = dep(vUv), id = texture2D(tCol, vUv).a;
    if (d >= 0.99999) { gl_FragColor = vec4(0.0, 0.0, -1.0, id); return; }
    vec2 uv = clamp(vUv, 1.5 * uPx, 1.0 - 1.5 * uPx);
    vec3 c = vpos(uv), l = vpos(uv - vec2(uPx.x, 0.0)), r = vpos(uv + vec2(uPx.x, 0.0)), b = vpos(uv - vec2(0.0, uPx.y)), t = vpos(uv + vec2(0.0, uPx.y));
    vec3 dx = abs(l.z - c.z) < abs(r.z - c.z) ? c - l : r - c;
    vec3 dy = abs(b.z - c.z) < abs(t.z - c.z) ? c - b : t - c;
    vec3 N = normalize(cross(dx, dy));
    gl_FragColor = vec4(N.xy, -c.z, id);
  }`;

const PROBE_FS = /* glsl */ `
  uniform sampler2D tCol; uniform vec4 uHero; varying vec2 vUv;
  void main() {
    float k = floor(vUv.x * 3.0);
    vec2 c = uHero.xy + vec2(0.0, k < 0.5 ? 0.0 : (k < 1.5 ? -1.5 : 1.5) * uHero.z);
    float R = uHero.z * (k < 0.5 ? 1.9 : 1.1);
    vec3 s = vec3(0.0); float w = 0.0;
    for (int i = 0; i < 24; i++) {
      float a = float(i) * 2.39996323, rr = R * sqrt((float(i) + 0.5) / 24.0);
      vec2 uv = clamp(c + vec2(cos(a) * rr / uHero.w, sin(a) * rr), 0.01, 0.99);
      vec4 t = texture2D(tCol, uv);
      float m = (t.a < 0.98 ? 1.0 : 0.0) * (k < 0.5 ? smoothstep(0.7 * uHero.z, 1.4 * uHero.z, length(vec2((uv.x - uHero.x) * uHero.w, uv.y - uHero.y))) : 1.0);
      s += min(t.rgb, vec3(3.0)) * m; w += m;
    }
    gl_FragColor = vec4(w > 0.0 ? s / w : vec3(0.05), 1.0);
  }`;

const LIGHT_FS = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tG; uniform sampler2D tProbe;
  uniform mat4 uProj; uniform mat4 uCamW; uniform vec2 uRes; uniform float uFar; uniform float uTime; uniform float uAsp;
  uniform vec4 uHero; uniform float uFigPx;
  uniform vec3 uKeyV; uniform vec3 uKeyCol; uniform vec4 uKeyP;
  uniform vec3 uShCol; uniform float uShAmt;
  uniform vec3 uRimV; uniform vec3 uRimCol; uniform vec4 uRimP; uniform vec3 uRim2V; uniform vec3 uRim2Col; uniform vec4 uRim2P;
  uniform vec3 uFillCol; uniform vec3 uBounceCol; uniform vec4 uFB;
  uniform vec4 uVal; uniform vec2 uValAt; uniform vec3 uHaloCol; uniform vec2 uHalo;
  uniform vec3 uHazeCol; uniform vec4 uHaze;
  uniform vec3 uMistCol; uniform vec4 uMist; uniform vec2 uMistW;
  uniform vec3 uMoteCol; uniform vec4 uMote; uniform vec3 uShaftCol; uniform vec4 uShaft; uniform vec4 uPaint; uniform vec3 uHatchCol;
  uniform vec4 uTier; uniform vec4 uThin; uniform float uAuto; uniform vec3 uBud; uniform vec4 uFx;
  uniform vec4 uHeroP; uniform vec3 uHeroFloor; uniform vec4 uVein; uniform vec3 uVeinCol;
  varying vec2 vUv;
  ${RX}
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  float fbm(vec2 p) { return 0.55 * rxNoise(p) + 0.3 * rxNoise(p * 2.1 + 7.0) + 0.15 * rxNoise(p * 4.3 + 3.0); }
  vec3 probe(float k) { return texture2D(tProbe, vec2((k + 0.5) / 3.0, 0.5)).rgb; }
  float heroAt(vec2 uv) { return step(0.98, texture2D(tG, uv).a); }
  float rimBand(vec2 dir, float wPx) {
    vec2 px = 1.0 / uRes; float e = 0.0, wt = 0.0;
    for (int i = 0; i < 7; i++) {
      float f = (float(i) + 0.5) / 7.0, w = 1.0 - 0.6 * f;
      vec2 q = vUv + dir * wPx * f * px;
      float out0 = 1.0 - heroAt(q);
      e += out0 * w; wt += w;
    }
    return e / wt;
  }
  float rimForm(vec2 d) {
    vec4 g0 = texture2D(tG, vUv); vec2 nn = g0.xy; float f = smoothstep(-0.15, 0.65, dot(nn, d) / max(length(nn), 0.25));
    float br = fbm(vUv * vec2(uAsp, 1.0) * 7.0 + d * 3.0);
    return mix(0.2, 1.0, f) * clamp(0.35 + 1.5 * br, 0.2, 1.4);
  }
  void main() {
    vec4 c = texture2D(tCol, vUv); vec3 col = c.rgb; float id = c.a;
    vec4 g = texture2D(tG, vUv);
    bool sky = g.z < 0.0;
    float z = sky ? uFar : g.z;
    float H = step(0.98, id), S = 1.0 - H;
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 vp = vec3(z * (ndc.x + uProj[2][0]) / uProj[0][0], z * (ndc.y + uProj[2][1]) / uProj[1][1], -z);
    vec3 N = vec3(g.xy, sqrt(max(1.0 - dot(g.xy, g.xy), 0.0)));
    if (sky) N = vec3(0.0, 0.0, 1.0);
    vec3 Nw = mat3(uCamW) * N;
    vec3 cam = uCamW[3].xyz;
    vec3 wp = cam + (mat3(uCamW) * vp) * (min(z, 140.0) / z);
    float dist = min(z, 140.0);
    float L0 = rxLuma(col);

    // ---- value pattern: one focal pool, everything else subordinated
    vec2 fa = uValAt.x > -0.5 ? uValAt : uHero.xy;
    vec2 q = (vUv - fa) * vec2(uAsp, 1.0) / clamp(uHero.z * 3.4, 0.2, max(uVal.w, 0.2));
    float focal = exp(-dot(q, q));
    float dim = mix(uVal.x, 1.0, focal);
    float setK = mix(1.0, uVal.y, H);
    float hot = smoothstep(1.0, 2.4, max(col.r, max(col.g, col.b))) * (1.0 - 0.6 * (sky ? 1.0 : 0.0));
    col *= mix(mix(1.0, dim, setK), 1.0, hot);
    float L1 = rxLuma(col);
    float away = (1.0 - focal) * (1.0 - hot) * S;
    if (L1 > uBud.x) col *= mix(1.0, (uBud.x + (L1 - uBud.x) * 0.22) / L1, away);
    col = mix(col, vec3(rxLuma(col)), (1.0 - uBud.y) * away);
    col *= 1.0 + uBud.z * focal * H;
    L1 = rxLuma(col);
    float ck = clamp(pow(max(L1, 1e-3) / 0.38, uVal.z * (1.0 - 0.8 * H)), 0.45, 1.7);
    col *= mix(ck, 1.0, hot);
    // power is thin: a bright set pixel keeps its value only if it is a thin line (the ring round it is dark); a broad bright body, whatever made it, is held to the body cap
    if (S > 0.5 && uThin.w > 0.0) {
      float Lb = rxLuma(col);
      if (Lb > uThin.z) {
        float ring = 0.0, rad = uThin.x / uRes.y;
        for (int i = 0; i < 8; i++) { if (float(i) >= uThin.y) break; float a = float(i) * 0.7854 + 0.4; ring += min(rxLuma(texture2D(tCol, vUv + vec2(cos(a) / uAsp, sin(a)) * rad).rgb), 4.0); }
        ring /= uThin.y;
        float thin = smoothstep(0.35, 0.7, 1.0 - ring / max(min(L0, 4.0), 0.05));
        col *= mix(uThin.z / Lb, 1.0, thin);
      }
    }

    // ---- the rig on every surface: key terminator, contact shadow, fill and bounce
    float ndl = dot(N, uKeyV);
    float wdt = mix(0.4, 0.03, uKeyP.y);
    float lit = sky ? 1.0 : smoothstep(-wdt, wdt + 0.04, ndl);
    float occ = 0.0;
    int steps = int(uTier.x);
    if (steps > 0 && !sky && uKeyP.w > 0.0) {
      float reach = uKeyP.z * mix(1.6, 1.0, H), jit = ign(gl_FragCoord.xy);
      float hits = 0.0;
      for (int i = 0; i < 24; i++) {
        if (i >= steps) break;
        float s = reach * (float(i) + 0.3 + 0.7 * jit) / float(steps);
        vec3 P = vp + uKeyV * s;
        vec4 cl = uProj * vec4(P, 1.0);
        vec2 uvi = cl.xy / cl.w * 0.5 + 0.5;
        if (uvi.x < 0.0 || uvi.x > 1.0 || uvi.y < 0.0 || uvi.y > 1.0 || cl.w <= 0.0) break;
        vec4 gs = texture2D(tG, uvi);
        float dz = -P.z - gs.z;
        hits += step(0.0, gs.z) * smoothstep(0.006 * z + 0.004, 0.02 * z + 0.03, dz) * step(dz, reach * 0.9);
      }
      occ = smoothstep(0.0, 0.6, hits / float(steps) * 4.0) * uKeyP.w * mix(1.0, 0.7, H);
    }
    float shade = max(1.0 - lit, occ) * (sky ? 0.0 : 1.0);
    vec3 envUp = uAuto > 0.5 ? probe(2.0) : vec3(0.0), envDn = uAuto > 0.5 ? probe(1.0) : vec3(0.0);
    vec3 fillC = uFillCol.r < 0.0 ? envUp : uFillCol; fillC = mix(fillC, uFx.rgb, uFx.w * 0.7); vec3 bounceC = uBounceCol.r < 0.0 ? envDn : uBounceCol;
    col *= mix(vec3(1.0), uShCol, shade * uShAmt);
    col *= 1.0 + uKeyCol * uKeyP.x * lit * (1.0 - shade) * 0.55 * mix(1.0, 1.5, H);
    col += col * (fillC * uFB.x * shade * (0.55 + 0.45 * Nw.y) + bounceC * uFB.y * (0.45 - 0.45 * Nw.y) * (0.4 + 0.6 * shade));
    col += fillC * uFB.x * 0.06 * shade * H;

    // ---- rims: the silhouette facing each light takes its colour
    if (H > 0.5) {
      vec3 e0 = probe(0.0);
      float el = max(rxLuma(e0), 1e-3);
      vec3 eAuto = e0 * clamp(0.55 / el, 1.0, 9.0);
      float wScale = max(max(uFigPx / 420.0, 0.35), 0.9 * uFx.w) * (1.0 + 0.5 * uFx.w);
      if (uRimP.x > 0.0) {
        vec2 d = normalize(uRimV.xy + 1e-5); float b = rimBand(d, uRimP.y * wScale);
        float fr = pow(b, 1.7) * (0.35 + 0.65 * (1.0 - N.z)) * rimForm(d);
        vec3 rc = uRimCol.r < 0.0 ? eAuto * uRimP.w : uRimCol; rc = mix(rc, uFx.rgb * 1.6, uFx.w * 0.85); float ra = uRimP.x * (1.0 + 1.4 * uFx.w);
        col = mix(col, rc, clamp(fr * ra, 0.0, 1.0)) + rc * fr * ra * 0.18;
      }
      if (uRim2P.x > 0.0) {
        vec2 d = normalize(uRim2V.xy + 1e-5); float b = rimBand(d, uRim2P.y * wScale);
        float fr = pow(b, 1.7) * (0.35 + 0.65 * (1.0 - N.z)) * rimForm(d);
        vec3 rc = uRim2Col.r < 0.0 ? eAuto * uRim2P.w : uRim2Col;
        col = mix(col, rc, clamp(fr * uRim2P.x, 0.0, 1.0)) + rc * fr * uRim2P.x * 0.18;
      }
    }

    // ---- hero: a coloured floor under the darks (no dead black coat), fold light off the key, a shoulder on the highlights
    if (H > 0.5) {
      float Lc = rxLuma(col), nl = clamp(ndl, 0.0, 1.0);
      col += uHeroFloor * uHeroP.y * (0.3 + 0.9 * nl * (1.0 - shade * 0.6) + 0.5 * max(-N.y, 0.0)) * (1.0 - smoothstep(0.04, 0.4, Lc));
      Lc = rxLuma(col);
      float cap = uHeroP.x;
      if (Lc > cap) col *= (cap + (Lc - cap) * 0.22) / Lc;
      vec3 kt = uKeyCol / max(max(uKeyCol.r, max(uKeyCol.g, uKeyCol.b)), 1e-3);
      col = mix(col, col * kt * 1.15, smoothstep(0.3, 0.8, Lc) * uHeroP.z * (1.0 - shade));
      Lc = rxLuma(col); col = mix(col, vec3(Lc) * vec3(0.96, 0.9, 1.04), smoothstep(0.22, 0.55, Lc) * uHeroP.w);
    }

    // ---- halo: the light behind the hero
    if (uHalo.y > 0.0) { vec2 h = (vUv - uHero.xy - vec2(0.0, 0.05)) * vec2(uAsp, 1.0) / max(uHalo.x, 0.05); col += uHaloCol * uHalo.y * exp(-dot(h, h) * 1.6) * mix(1.0, 0.12, H) * (0.35 + 0.65 * smoothstep(0.0, 0.2, L0 + (sky ? 0.2 : 0.0))); }

    // ---- air: depth haze, mist floor, shafts, embers
    vec3 hazeC = uHazeCol.r < 0.0 ? envUp * 0.6 + vec3(0.01) : uHazeCol;
    if (uHaze.w > 0.0) {
      float f = (1.0 - exp(-uHaze.x * max(dist - uHaze.y, 0.0))) * uHaze.z;
      f = sky ? uHaze.w * uHaze.z : f;
      col = mix(col, hazeC * (0.6 + 0.8 * L0), f * mix(1.0, 0.25, H));
    }
    if (uMist.z > 0.0) {
      vec2 mp = wp.xz * uMist.w + vec2(uMistW.x, uMistW.x * 0.5) * uTime * uMistW.y;
      float nz = fbm(mp * 3.0 + uTime * 0.03 * uMistW.y) * 0.9 + 0.35;
      float dc = exp(-max(cam.y - uMist.x, 0.0) / uMist.y), ds = exp(-max(wp.y - uMist.x, 0.0) / uMist.y);
      float f = 1.0 - exp(-uMist.z * min(dist, 12.0) * 0.5 * (dc + ds) * nz * 0.09);
      col = mix(col, uMistCol * (0.55 + 0.9 * rxLuma(uKeyCol) + 0.5 * L0), f * mix(1.0, 0.5, H));
    }
    if (uShaft.z > 0.0 && uTier.y > 0.0) {
      vec2 dl = (vUv - uShaft.xy) * uShaft.w / uTier.y; vec2 uv = vUv; float w = 1.0, s = 0.0;
      for (int i = 0; i < 24; i++) {
        if (float(i) >= uTier.y) break;
        uv -= dl; vec4 t = texture2D(tG, uv); vec3 tc = texture2D(tCol, uv).rgb;
        s += (t.z < 0.0 ? 1.0 : max(rxLuma(tc) - 0.8, 0.0) * 0.6) * w; w *= 0.94;
      }
      col += uShaftCol * uShaft.z * s / uTier.y * mix(1.0, 0.3, H) * 1.6;
    }
    if (uMote.x > 0.0) {
      vec3 add = vec3(0.0);
      for (int l = 0; l < 3; l++) {
        if (float(l) >= uTier.z) break;
        float fl = float(l), zl = mix(2.2, 22.0, fl / 2.0), cells = mix(7.0, 26.0, fl / 2.0);
        vec2 g2 = vec2(vUv.x * uAsp, vUv.y) * cells; g2.y -= uTime * uMote.z * cells * (0.6 + 0.4 * fl) * 3.0; g2.x += sin(uTime * 0.4 + fl * 2.0) * 0.5;
        vec2 id2 = floor(g2), f2 = fract(g2);
        float h1 = rxHash(id2 + fl * 17.0), h2 = rxHash(id2 + 3.7 + fl * 9.0), h3 = rxHash(id2 + 8.1);
        vec2 cc = vec2(0.5) + (vec2(h2, h3) - 0.5) * 0.7 + vec2(sin(uTime * (0.7 + h1) + h2 * 6.0), cos(uTime * (0.5 + h2) + h3 * 6.0)) * 0.12;
        float r = (0.04 + 0.07 * h3) * uMote.y * mix(1.0, 2.6, fl == 0.0 ? 1.0 : 0.0);
        float soft = fl == 0.0 ? 0.9 : 0.35;
        float disc = 1.0 - smoothstep(r * (1.0 - soft), r, length(f2 - cc));
        float on = step(1.0 - uMote.x * 0.5, h1);
        float vis = step(zl, z);
        float fk = 0.55 + 0.45 * sin(uTime * (6.0 + 9.0 * h2) + h1 * 40.0);
        add += uMoteCol * disc * on * vis * fk * (fl == 0.0 ? 0.35 : 1.0);
      }
      col += add * uMote.w;
    }

    // ---- veins: energy filaments that converge on the hero, ridged noise in polar flow, hot (above 1) so the glow takes them
    if (uVein.x > 0.0 && S > 0.5) {
      vec2 p = (vUv - uHero.xy) * vec2(uAsp, 1.0); float rr = length(p) + 1e-4; vec2 dir = p / rr;
      float lr = log(rr + 0.06) * uVein.z - uTime * uVein.w;
      vec2 wp2 = dir * uVein.y + vec2(lr, lr * 0.63);
      if (uTier.w > 0.5) wp2 += (vec2(rxNoise(wp2 * 1.7 + 3.1), rxNoise(wp2 * 1.7 + 9.4)) - 0.5) * 1.3 + (vec2(rxNoise(wp2 * 6.0 + 1.3), rxNoise(wp2 * 6.0 + 7.7)) - 0.5) * 0.55;
      float nv = rxNoise(wp2) * 0.65 + rxNoise(wp2 * 2.3 + 5.0) * 0.35;
      float rid = pow(clamp(1.0 - abs(2.0 * nv - 1.0), 0.0, 1.0), 18.0) * smoothstep(0.38, 0.72, rxNoise(wp2 * 0.45 + dir * 2.0 + 11.0));
      float reach = smoothstep(0.16, 0.5, rr) * (1.0 - 0.5 * smoothstep(0.9, 1.4, rr));
      float depth = sky ? 1.0 : 0.45 + 0.55 * smoothstep(3.0, 40.0, dist);
      col += uVeinCol * rid * reach * depth * uVein.x * 3.2 * (0.45 + 0.55 * smoothstep(0.5, 0.0, L0));
    }

    // ---- paint: a brushed grain on the set, manga hatching in its shadow
    if (S > 0.5 && !sky) {
      float gr = (rxNoise(gl_FragCoord.xy / 5.0) - 0.5) * 0.7 + (rxNoise(gl_FragCoord.xy / 23.0 + 5.0) - 0.5) * 0.9;
      col *= 1.0 + gr * uPaint.x;
      if (uPaint.y > 0.0) {
        float Lh = rxLuma(col);
        float hmask = (1.0 - smoothstep(0.05, 0.3, Lh)) * smoothstep(0.0, 0.05, Lh + 0.02);
        float ln = abs(fract((gl_FragCoord.x * 0.7 + gl_FragCoord.y) / (uRes.y / 110.0)) - 0.5);
        col = mix(col, uHatchCol, uPaint.y * hmask * (1.0 - smoothstep(0.1, 0.18, ln)) * 0.8);
      }
    } else if (S > 0.5) {
      float gr = (rxNoise(gl_FragCoord.xy / 7.0) - 0.5) * 0.5;
      col *= 1.0 + gr * uPaint.x * 0.6;
    }
    gl_FragColor = vec4(max(col, vec3(0.0)), id);
  }`;

const PRE_FS = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; uniform vec4 uGl; varying vec2 vUv;
  vec4 f(vec2 uv) { vec4 t = texture2D(tIn, uv); float l = dot(t.rgb, vec3(0.2126, 0.7152, 0.0722));
    float hot = smoothstep(uGl.x, uGl.x + 0.5, l) * (t.a >= 0.98 ? 0.0 : 1.0);
    return vec4(min(t.rgb, vec3(6.0)) * hot, 1.0); }
  void main() { vec2 o = uTexel; gl_FragColor = (f(vUv + vec2(-o.x, -o.y)) + f(vUv + vec2(o.x, -o.y)) + f(vUv + vec2(-o.x, o.y)) + f(vUv + o)) * 0.25; }`;
const DOWN_FS = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; varying vec2 vUv;
  void main() { vec2 o = uTexel;
    gl_FragColor = texture2D(tIn, vUv) * 0.5 + (texture2D(tIn, vUv - o) + texture2D(tIn, vUv + o) + texture2D(tIn, vUv + vec2(o.x, -o.y)) + texture2D(tIn, vUv - vec2(o.x, -o.y))) * 0.125; }`;
const UP_FS = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; varying vec2 vUv;
  void main() { vec2 o = uTexel;
    vec4 s = texture2D(tIn, vUv + vec2(-2.0 * o.x, 0.0)) + texture2D(tIn, vUv + vec2(2.0 * o.x, 0.0)) + texture2D(tIn, vUv + vec2(0.0, -2.0 * o.y)) + texture2D(tIn, vUv + vec2(0.0, 2.0 * o.y));
    s += 2.0 * (texture2D(tIn, vUv + vec2(-o.x, o.y)) + texture2D(tIn, vUv + o) + texture2D(tIn, vUv - o) + texture2D(tIn, vUv + vec2(o.x, -o.y)));
    gl_FragColor = s / 12.0; }`;

const COMP_FS = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tGlowA; uniform sampler2D tGlowB; uniform vec2 uRes; uniform float uAsp;
  uniform vec4 uGl; uniform vec3 uGlCol; uniform vec4 uHit; uniform vec3 uHitCol;
  uniform sampler2D tProbe; uniform vec4 uGr; uniform vec3 uSh; uniform vec3 uMid; uniform vec3 uHi; uniform vec4 uHar; uniform vec4 uHarH;
  varying vec2 vUv;
  ${RX}
  vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x); }
  vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
  void main() {
    vec2 d = vUv - 0.5; float r2 = dot(d * vec2(uAsp, 1.0), d * vec2(uAsp, 1.0));
    vec2 px = 1.0 / uRes;
    float ca = uHit.y * uHit.x;
    vec4 c0 = texture2D(tCol, vUv);
    vec3 col = c0.rgb; float id = c0.a;
    if (ca > 0.0) { vec2 o = normalize(d + 1e-6) * ca * px * (0.4 + 2.2 * r2); col.r = texture2D(tCol, vUv + o).r; col.b = texture2D(tCol, vUv - o).b; }
    float H = step(0.98, id);
    vec3 gl = (texture2D(tGlowA, vUv).rgb + texture2D(tGlowB, vUv).rgb * uGl.w) * uGlCol;
    col += gl * uGl.y * mix(1.0, 0.22, H);
    float hk = uHit.x * uHit.x, Lh = rxLuma(col);
    col *= 1.0 + uHit.z * hk * smoothstep(0.08, 0.7, Lh) * mix(1.0, 0.3, H);
    col += uHitCol * hk * uHit.w * mix(1.0, 0.3, H) * (0.9 * smoothstep(0.05, 0.9, Lh));
    col *= uGr.x;
    float L = rxLuma(col);
    col = mix(vec3(L), col, uGr.y);
    float sm = smoothstep(0.0, 0.7, L);
    col = mix(col, col * (uMid * 2.0) , uGr.w * (1.0 - abs(sm - 0.5) * 2.0));
    col = col * mix(vec3(1.0), uSh * 4.0 + 0.2, uGr.w * (1.0 - sm) * 0.6) ;
    col = col * mix(vec3(1.0), uHi * 1.0 + 0.0, uGr.w * smoothstep(0.35, 1.2, L) * 0.5);
    col = mix(col, col * (0.7 + 0.6 * smoothstep(0.0, 0.6, L)), uGr.z);
    vec4 hh4 = uHarH; float hy = uHar.y;
    if (uHar.w > 0.5) { vec3 pr = texture2D(tProbe, vec2(0.1667, 0.5)).rgb; vec3 ph = rgb2hsv(pr / max(rxLuma(pr) * 2.0, 0.5)); float h0 = ph.x * 360.0; hh4 = vec4(h0, h0 + 26.0, h0 - 26.0, h0); hy = ph.y > 0.3 ? 3.0 : 0.0; }
    if (uHar.x > 0.0 && hy > 0.0 && L > 0.004) {
      vec3 hsv = rgb2hsv(min(col / max(L * 2.0, 0.5), vec3(1.0))); float hue = hsv.x * 360.0, best = 1e9, tgt = hue;
      for (int i = 0; i < 4; i++) { if (float(i) >= hy) break; float hh = i == 0 ? hh4.x : i == 1 ? hh4.y : i == 2 ? hh4.z : hh4.w; float df = mod(hh - hue + 540.0, 360.0) - 180.0; if (abs(df) < best) { best = abs(df); tgt = hue + df; } }
      float amt = uHar.x * mix(1.0, uHar.z, H) * smoothstep(0.03, 0.2, hsv.y);
      float nh = mix(hue, tgt, amt) / 360.0;
      vec3 shifted = hsv2rgb(vec3(fract(nh), rgb2hsv(col).y, rgb2hsv(col).z));
      col = shifted;
    }
    if (H > 0.5) { float Y = rxLuma(col); if (Y > 0.92) col *= 0.92 / Y; }
    gl_FragColor = vec4(max(col, vec3(0.0)), id);
  }`;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const AUTO = new Color(-1, -1, -1);

export class Photo {
  constructor(renderer, { type = HalfFloatType, tier = 2 } = {}) {
    this.r = renderer; this.tier = tier; this.type = type;
    this.q = new Quad(renderer);
    this.w = 0; this.h = 0;
    this.rig = resolvePhoto("auto"); this.state = null;
    const rt = (f = LinearFilter, t = type) => new WebGLRenderTarget(4, 4, { type: t, minFilter: f, magFilter: f, depthBuffer: false });
    this.gRT = rt(NearestFilter); this.lightRT = rt(); this.probeRT = new WebGLRenderTarget(3, 1, { type, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false });
    this.down = [0, 1, 2, 3].map(() => rt()); this.up = [0, 1, 2].map(() => rt());
    const v = (x) => ({ value: x });
    this.ug = { tCol: v(null), tDA: v(null), tDB: v(null), uInvProj: v(new Matrix4()), uPx: v(new Vector2()) };
    this.up_ = { tCol: v(null), uHero: v(new Vector4()) };
    this.ul = {
      tCol: v(null), tG: v(this.gRT.texture), tProbe: v(this.probeRT.texture), uProj: v(new Matrix4()), uCamW: v(new Matrix4()), uRes: v(new Vector2()), uFar: v(1500), uTime: v(0), uAsp: v(1.7),
      uHero: v(new Vector4(0.5, 0.5, 0.3, 1.7)), uFigPx: v(400),
      uKeyV: v(new Vector3()), uKeyCol: v(new Color()), uKeyP: v(new Vector4()), uShCol: v(new Color()), uShAmt: v(0),
      uRimV: v(new Vector3()), uRimCol: v(new Color()), uRimP: v(new Vector4()), uRim2V: v(new Vector3()), uRim2Col: v(new Color()), uRim2P: v(new Vector4()),
      uFillCol: v(new Color()), uBounceCol: v(new Color()), uFB: v(new Vector4()),
      uVal: v(new Vector4()), uValAt: v(new Vector2(-1, -1)), uHaloCol: v(new Color()), uHalo: v(new Vector2()),
      uHazeCol: v(new Color()), uHaze: v(new Vector4()), uMistCol: v(new Color()), uMist: v(new Vector4()), uMistW: v(new Vector2()),
      uMoteCol: v(new Color()), uMote: v(new Vector4()), uShaftCol: v(new Color()), uShaft: v(new Vector4()), uPaint: v(new Vector4()), uHatchCol: v(new Color()),
      uTier: v(new Vector4()), uThin: v(new Vector4(9, 8, 0.7, 1)), uAuto: v(1), uBud: v(new Vector3(0.46, 0.72, 0.22)), uFx: v(new Vector4()), uHeroP: v(new Vector4()), uHeroFloor: v(new Color()), uVein: v(new Vector4()), uVeinCol: v(new Color()),
    };
    this.pg = { tIn: v(null), uTexel: v(new Vector2()), uGl: v(new Vector4()) };
    this.uc = {
      tCol: v(null), tGlowA: v(null), tGlowB: v(null), uRes: v(new Vector2()), uAsp: v(1.7), uGl: v(new Vector4()), uGlCol: v(new Color()), uHit: v(new Vector4()), uHitCol: v(new Color()),
      tProbe: v(null), uGr: v(new Vector4()), uSh: v(new Color()), uMid: v(new Color()), uHi: v(new Color()), uHar: v(new Vector4()), uHarH: v(new Vector4()),
    };
    this.mG = this.q.material(G_FS, this.ug);
    this.mProbe = this.q.material(PROBE_FS, this.up_);
    this.mLight = this.q.material(LIGHT_FS, this.ul);
    this.mPre = this.q.material(PRE_FS, this.pg);
    this.mDown = this.q.material(DOWN_FS, { tIn: v(null), uTexel: v(new Vector2()) });
    this.mUp = this.q.material(UP_FS, { tIn: v(null), uTexel: v(new Vector2()) });
    this.mComp = this.q.material(COMP_FS, this.uc);
    this.tmp = { c: new Color(), v: new Vector3(), m: new Matrix4(), fv: new Vector3() };
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.gRT);
    for (const m of [this.mG, this.mProbe, this.mLight, this.mPre, this.mDown, this.mUp, this.mComp]) { this.q.mesh.material = m; renderer.compile(this.q.scene, this.q.cam); }
    renderer.setRenderTarget(prev);
  }
  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    for (const t of [this.gRT, this.lightRT]) t.setSize(w, h);
    this.down.forEach((t, i) => t.setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))));
    this.up.forEach((t, i) => t.setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))));
    this.ul.uRes.value.set(w, h); this.uc.uRes.value.set(w, h); this.ug.uPx.value.set(1 / w, 1 / h);
  }
  // the scene's look.photo: a preset name or { preset, ...overrides }
  configure(spec, flat = false) { this.rig = resolvePhoto(spec, flat); this.vote = { mood: null, n: 0 }; this.frames = 0; this.buf = null; }
  // "auto" with nothing asked: sample the colour round the hero every 12 frames, switch mood once two samples agree
  sniff() {
    const R0 = this.rig;
    if (R0.preset !== "auto" || !R0.on) return;
    if (this.frames++ % 12 !== 3 || this.type !== HalfFloatType) return;
    const buf = this.buf ?? (this.buf = new Uint16Array(12));
    try { this.r.readRenderTargetPixels(this.probeRT, 0, 0, 3, 1, buf); } catch { return; }
    const m = moodFor(h2f(buf[0]), h2f(buf[1]), h2f(buf[2])), v = this.vote;
    if (m === v.mood) v.n++; else { v.mood = m; v.n = 1; }
    if (v.n < 4 || m === (R0.auto ?? null)) return;
    const { own } = R0;
    const R = m ? merge(merge(resolvePhoto({ preset: m }), { veins: { amt: 0 } }), own) : resolvePhoto(own);
    R.auto = m; R.own = own; R.preset = "auto"; this.rig = R;
  }
  col(u, hex) {
    if (hex === "auto") { u.value.copy(AUTO); return; }
    u.value.set(hex);
  }
  // the rig now, as uniform writes; returns the resolved params (dof reads them)
  at(t, hitIn = 0, viewToWorld = null) {
    const { P, beat, beatCol } = photoAt(this.rig, t);
    this.beat = beat; this.beatCol = beatCol;
    return P;
  }
  render({ src, tPlateD, tCelD, camera, focus, P, t, hit = 0, beat = 0, beatCol = null, light = null, fx = null }) {
    const r = this.r, prev = r.getRenderTarget(), u = this.ul, tier = this.tier;
    if (src.width !== this.w || src.height !== this.h) this.setSize(src.width, src.height);
    const { w, h } = this, asp = w / h, T = this.tmp;
    let hx = 0.5, hy = 0.5, hr = 0.3, fig = h * 0.3;
    if (focus) {
      const v = T.fv.copy(focus).applyMatrix4(camera.matrixWorldInverse), E = camera.projectionMatrix.elements;
      if (v.z < -1e-3) { hx = 0.5 - 0.5 * E[0] * v.x / v.z - 0.5 * E[8]; hy = 0.5 - 0.5 * E[5] * v.y / v.z - 0.5 * E[9]; hr = 0.55 * 0.5 * E[5] / -v.z; fig = 2 * hr * h; }
    }
    const heroV = this.ul.uHero.value.set(hx, hy, hr, asp); this.up_.uHero.value.copy(heroV);
    this.ug.tCol.value = src.texture; this.ug.tDA.value = tPlateD; this.ug.tDB.value = tCelD ?? tPlateD;
    this.ug.uInvProj.value.copy(camera.projectionMatrixInverse);
    this.q.draw(this.mG, this.gRT);
    this.up_.tCol.value = src.texture;
    this.q.draw(this.mProbe, this.probeRT);
    this.sniff();

    const view = (d) => { const o = T.v.set(d[0], d[1], d[2]); if (P.space === "world") o.transformDirection(camera.matrixWorldInverse); else o.normalize(); return o; };
    const kd = P.key.dir ? view(P.key.dir) : (light ? T.v.copy(light).transformDirection(camera.matrixWorldInverse) : T.v.set(-0.5, 0.6, 0.6).normalize());
    u.uKeyV.value.copy(kd);
    u.uKeyCol.value.set(P.key.col); u.uKeyP.value.set(P.key.amt, P.key.hard, P.key.reach, tier >= 2 ? P.key.contact : 0);
    u.uShCol.value.set(P.shadow.col); u.uShAmt.value = P.shadow.amt;
    const rim = (Vv, Cu, Pu, R) => { if (!R || R.amt <= 0) { Pu.value.set(0, 0, 0, 1); return; } Vv.value.copy(view(R.dir)); this.col(Cu, R.col); Pu.value.set(R.amt, R.w, 0, R.gain ?? 1); };
    rim(u.uRimV, u.uRimCol, u.uRimP, P.rim); rim(u.uRim2V, u.uRim2Col, u.uRim2P, P.rim2);
    this.col(u.uFillCol, P.fill.col); this.col(u.uBounceCol, P.bounce.col); u.uFB.value.set(P.fill.amt, P.bounce.amt, 0, 0);
    const V = P.value;
    u.uVal.value.set(V.darks, V.hero, V.contrast, V.r); u.uBud.value.set(V.ceil ?? 1, V.sat ?? 1, V.lift ?? 0); if (fx) u.uFx.value.copy(fx); else u.uFx.value.set(0, 0, 0, 0);
    if (Array.isArray(V.at)) u.uValAt.value.set(V.at[0], 1 - V.at[1]); else u.uValAt.value.set(-1, -1);
    u.uHaloCol.value.set(P.halo.col); u.uHalo.value.set(P.halo.r, P.halo.amt);
    this.col(u.uHazeCol, P.haze.col); u.uHaze.value.set(P.haze.k, P.haze.start, P.haze.max, P.haze.sky);
    u.uMistCol.value.set(P.mist.col); u.uMist.value.set(P.mist.y, P.mist.h, P.mist.amt, P.mist.scale); u.uMistW.value.set(P.mist.wind, P.mist.speed);
    u.uMoteCol.value.set(P.motes.col); u.uMote.value.set(P.motes.n, P.motes.size, P.motes.rise, P.motes.amt);
    u.uShaftCol.value.set(P.shafts.col);
    const sa = P.shafts.at; u.uShaft.value.set(sa ? sa[0] : hx, sa ? 1 - sa[1] : Math.min(0.98, hy + hr * 1.8), P.shafts.amt, 0.85);
    u.uPaint.value.set(P.paint.grain, tier >= 2 ? P.paint.hatch : 0, 0, 0); u.uHatchCol.value.set(P.paint.hatchCol);
    u.uTier.value.set(tier >= 3 ? 20 : tier >= 2 ? 12 : 0, tier >= 3 ? 24 : tier >= 2 ? 14 : 0, tier >= 3 ? 3 : tier >= 2 ? 3 : 2, tier >= 2 ? 1 : 0);
    u.uThin.value.set(0.013 * h, tier >= 2 ? 8 : 4, V.body ?? 0.5, V.thin ?? 1);
    const Hh = P.hero, Vn = P.veins;
    u.uHeroP.value.set(Hh.cap, Hh.floorAmt, Hh.tint, Hh.desat ?? 0); u.uHeroFloor.value.set(Hh.floor);
    u.uVein.value.set(Vn.amt, Vn.n, Vn.flow, Vn.speed); u.uVeinCol.value.set(Vn.col);
    u.uAsp.value = asp; u.uTime.value = t; u.uProj.value.copy(camera.projectionMatrix); u.uCamW.value.copy(camera.matrixWorld); u.uFar.value = camera.far;
    u.tCol.value = src.texture; u.uFigPx.value = fig;
    this.q.draw(this.mLight, this.lightRT);

    const G = P.glow, pg = this.pg;
    pg.uGl.value.set(G.thr, 0, 0, 0);
    const lv = tier <= 1 ? 3 : 4;
    pg.tIn.value = this.lightRT.texture; pg.uTexel.value.set(0.5 / w, 0.5 / h); this.q.draw(this.mPre, this.down[0]);
    for (let i = 1; i < lv; i++) { const m = this.mDown.uniforms; m.tIn.value = this.down[i - 1].texture; m.uTexel.value.set(1 / this.down[i - 1].width, 1 / this.down[i - 1].height); this.q.draw(this.mDown, this.down[i]); }
    let up = this.down[lv - 1];
    for (let i = lv - 2; i >= 0; i--) { const m = this.mUp.uniforms; m.tIn.value = up.texture; m.uTexel.value.set(0.5 / up.width, 0.5 / up.height); this.q.draw(this.mUp, this.up[i]); up = this.up[i]; }

    const c = this.uc, flashAmt = Math.max(hit * P.hit.flash, beat);
    c.tCol.value = this.lightRT.texture; c.tGlowA.value = up.texture; c.tGlowB.value = this.down[lv - 1].texture; c.uAsp.value = asp;
    c.uGl.value.set(G.thr, G.amt, 0, G.wide); c.uGlCol.value.set(G.col);
    c.uHit.value.set(clamp01(flashAmt), (hit > 0.02 ? P.hit.ca * hit : 0) , P.hit.blow, 1.4); c.uHitCol.value.set(beatCol ?? P.hit.col);
    const Gr = P.grade;
    c.uGr.value.set(Gr.exposure, Gr.sat, Gr.contrast, Gr.tone); c.uSh.value.set(Gr.sh); c.uMid.value.set(Gr.mid); c.uHi.value.set(Gr.hi);
    const auto = Gr.harmony?.hues === "auto", hu = Array.isArray(Gr.harmony?.hues) ? Gr.harmony.hues : [];
    c.tProbe.value = this.probeRT.texture;
    c.uHar.value.set(hu.length || auto ? Gr.harmony.amt : 0, Math.min(4, hu.length), Gr.harmony?.hero ?? 0.15, auto ? 1 : 0);
    c.uHarH.value.set(hu[0] ?? 0, hu[1] ?? hu[0] ?? 0, hu[2] ?? hu[0] ?? 0, hu[3] ?? hu[0] ?? 0);
    this.q.draw(this.mComp, src);
    r.setRenderTarget(prev);
    return src;
  }
  dispose() {
    for (const t of [this.gRT, this.lightRT, this.probeRT, ...this.down, ...this.up]) t.dispose();
    for (const m of [this.mG, this.mProbe, this.mLight, this.mPre, this.mDown, this.mUp, this.mComp]) m.dispose();
    this.q.mesh.geometry.dispose();
  }
}
