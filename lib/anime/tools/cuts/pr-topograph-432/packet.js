// Packet shaders for pr-topograph-432 (Overlord S1E4, the throne of Nazarick, Madhouse TV cel); layered plates, each over the one before.
import { defineCut } from "../kit.glsl.js";

const F = "pr-topograph-432";
const SUITS = [F];
const T = (name, doc, glsl, demo, draws, use, params) => ({ ...defineCut(name, F, doc, glsl, demo), draws, use, suits: SUITS, params });

export const tgNavePlate = T("tgNavePlate", "Nazarick nave: violet stone floor joints, crimson carpet with gold edge, pillar rows with arches, dark ribbed ceiling",
  `vec3 tgWall(vec2 p) {
    vec2 q = p - vec2(0.5, 0.52);
    float dy = max(abs(q.y), 0.004);
    float zw = 0.225 / max(abs(q.x), 0.004);
    return vec3(zw, q.y * zw * 40.0, cAA(abs(q.x) - 1.875 * dy, 0.0));
  }
  vec3 tgNavePlate(vec2 p, float t) {
    vec2 q = p - vec2(0.5, 0.52);
    float dy = max(abs(q.y), 0.004);
    float z = 0.12 / dy;
    float X = q.x * z * 40.0;
    vec3 deep = vec3(0.043, 0.039, 0.055), lo = vec3(0.118, 0.114, 0.137), mid = vec3(0.188, 0.216, 0.306), hi = vec3(0.235, 0.329, 0.600);
    vec3 gold = vec3(0.851, 0.643, 0.255), crimLit = vec3(0.478, 0.141, 0.282), crimShade = vec3(0.224, 0.110, 0.184);
    float near = clamp(dy * 2.4, 0.0, 1.0);
    float fz = z * 1.1;
    float joint = cLine(min(fract(fz), 1.0 - fract(fz)), 1.2);
    vec3 fl = cCel3(near, 0.30, 0.72, lo, mid, hi * 0.8);
    fl = mix(fl, fl * 0.62, joint);
    vec3 cp = mix(crimShade, crimLit, cAA(near, 0.30));
    cp = mix(cp, gold * 0.78, cFill(abs(abs(X) - 2.75) - 0.2));
    fl = mix(fl, cp, cFill(abs(X) - 3.0));
    float cz = z * 0.55;
    vec3 ce = mix(deep, lo * 0.5, cLine(min(fract(cz), 1.0 - fract(cz)), 1.4) * 0.5);
    vec3 w = tgWall(p);
    float u = fract(w.x / 0.9);
    vec3 pc = cCel3(1.0 - u / 0.22, 0.38, 0.78, lo, mid, hi * 0.8);
    float ad = length(vec2((u - 0.61) * 7.0, w.y - 9.0)) - 2.6;
    vec3 wl = mix(lo * 0.7, mid, cLine(ad, 1.8) * cAA(w.y, 9.0));
    vec3 wall = mix(wl, pc, cFill(u - 0.22));
    wall = mix(wall, deep, cAA(w.y, 13.0));
    wall *= mix(0.55, 1.0, clamp(1.0 / (w.x * 1.2), 0.0, 1.0));
    vec3 c = mix(mix(fl, ce, cAA(q.y, 0.0)), wall, w.z);
    return cCap(c * vec3(1.05, 0.95, 1.15));
  }`, "tgNavePlate(p, t)",
  "the long violet nave in one-point view: flat stone floor with a crimson gold-edged carpet, two pillar rows with arches, a dark ceiling",
  "plate", "p = frame uv (y up); t = pocket seconds (unused, the plate is static)");

export const tgBannerRows = T("tgBannerRows", "41 guild banners hanging on the pillars with gold hem and emblem, one bare hook with a ghost rectangle, swaying on twos",
  `vec3 tgGuild(float h) {
    vec3 k = clamp(abs(fract(h + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    return mix(vec3(0.62), k, 0.80) * 0.62;
  }
  vec3 tgBannerRows(vec2 p, float t) {
    vec3 c = tgNavePlate(p, t);
    vec3 w = tgWall(p);
    float ts = floor(t * 12.0 + 1e-4) / 12.0;
    float i = floor(w.x / 0.9);
    float side = step(p.x, 0.5);
    float h = cH21(vec2(i, side + 3.0));
    float sway = 0.02 * sin(ts * 6.2832 / (2.5 + 1.5 * h) + 6.2832 * h);
    float u = fract(w.x / 0.9);
    float hh = w.y - 6.0;
    float hang = clamp((9.0 - w.y) / 6.0, 0.0, 1.0);
    float lx = (u - 0.11 - sway * hang * 2.0) / 0.075;
    float d = max(abs(lx) - 1.0, (abs(hh) - 3.0) / 3.0);
    d = max(d, 0.8 * (1.0 - abs(lx)) - (hh + 3.0));
    vec3 gold = vec3(0.851, 0.643, 0.255);
    vec3 base = tgGuild(h);
    vec3 col = cCel3(lx * 0.5 + 0.5, 0.35, 0.85, base * 0.55, base, base * 1.2);
    col = mix(col, gold * 0.8, cFill(hh + 2.4) + cFill(abs(lx) + abs(hh - 1.0) * 0.35 - 0.6));
    float bare = step(abs(i - 8.0), 0.5) * side;
    vec3 ghost = vec3(0.150, 0.146, 0.178);
    c = mix(c, col, cFill(d) * w.z * (1.0 - bare));
    c = mix(c, ghost, cFill(d) * w.z * bare);
    c = mix(c, vec3(0.047, 0.051, 0.071), cLine(d, 1.2) * w.z * bare * 0.6);
    float hook = length(vec2(lx * 0.075, (hh - 3.1) * 0.06)) - 0.012;
    c = mix(c, gold * 0.8, cFill(hook) * w.z * bare);
    return cCap(c);
  }`, "tgBannerRows(p, t)",
  "saturated banners in mixed guild colours hung on the pillars with a gold hem and diamond emblem, swallowtail ends, one empty hook with a pale ghost rectangle",
  "plate", "p = frame uv; t = pocket seconds, sway steps at 12 fps with a per-banner period of 2.5 to 4 s");

export const tgChandelierBlue = T("tgChandelierBlue", "three blue crystal chandeliers on gold frames with a soft emissive glow, crystals twinkling on twos",
  `vec3 tgChandelierBlue(vec2 p, float t) {
    vec3 c = tgBannerRows(p, t);
    float ts = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 gold = vec3(0.851, 0.643, 0.255), blue = vec3(0.553, 0.667, 0.871), blueD = vec3(0.235, 0.345, 0.639);
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      float s = 1.0 - 0.36 * fj;
      vec2 q = (p - vec2(0.5, 0.84 - 0.10 * fj)) / s;
      c += blue * exp(-length(q / vec2(0.14, 0.09)) * 2.4) * 0.13;
      c = mix(c, gold * 0.5, cFill(abs(q.x) - 0.002) * cAA(q.y, 0.0) * cAA(0.16 - q.y, 0.0));
      float ring = abs(length(q / vec2(0.085, 0.022)) - 1.0) * 0.022 - 0.004;
      c = mix(c, gold * (0.55 + 0.35 * cAA(q.y, 0.0)), cFill(ring));
      for (int k = 0; k < 9; k++) {
        float fk = float(k);
        vec2 cq = q - vec2((fk - 4.0) * 0.0185, -0.026 - 0.010 * (4.0 - abs(fk - 4.0)));
        float d = abs(cq.x) / 0.0075 + abs(cq.y) / 0.024 - 1.0;
        float tw = step(0.8, cH21(vec2(fk + fj * 9.0, ts * 12.0)));
        c = mix(c, mix(blueD, blue, cAA(-cq.x, 0.0)) * (1.0 + 0.15 * tw), cFill(d));
      }
    }
    return cCap(c);
  }`, "tgChandelierBlue(p, t)",
  "three blue crystal chandeliers high in the nave, each a gold ring with nine hard-faceted blue crystals and a cool glow, shrinking with distance",
  "plate", "p = frame uv; t = pocket seconds, crystal twinkle re-rolls at 12 fps");

export const tgStairWedge = T("tgStairWedge", "seven carved steps as one pale light wedge whose apex is the throne seat",
  `vec3 tgStairWedge(vec2 p, float t) {
    vec3 c = tgChandelierBlue(p, t);
    float v = (0.60 - p.y) / 0.045;
    float hw = 0.022 + (0.60 - p.y) * 0.34;
    float inside = cFill(abs(p.x - 0.5) - hw) * cFill(v - 7.0) * cAA(v, 0.0);
    float tread = cFill(fract(v) - 0.58);
    vec3 lit = vec3(0.62, 0.60, 0.74) * (1.0 - 0.05 * floor(v));
    vec3 s = mix(vec3(0.26, 0.25, 0.38), lit, tread);
    s = mix(s, vec3(0.047, 0.051, 0.071), cLine(abs(p.x - 0.5) - hw, 1.6) * 0.8);
    return cCap(mix(c, s, inside));
  }`, "tgStairWedge(p, t)",
  "a bright pale wedge of seven alternating tread and riser bands narrowing to a point at the throne seat, ink lines on its flanks",
  "plate", "p = frame uv; t = pocket seconds (unused, the stair is static)");

export const tgThroneBack = T("tgThroneBack", "empty gold-edged throne: black-violet carved back with tooth spikes, three gold lancet tracery arches, a crimson gem in the crest, a gold seat",
  `vec3 tgThroneBack(vec2 p, float t) {
    vec3 c = tgStairWedge(p, t);
    vec3 gold = vec3(0.851, 0.643, 0.255), lan = vec3(0.120, 0.070, 0.170), crimson = vec3(0.478, 0.141, 0.282);
    vec2 q = p - vec2(0.5, 0.60);
    float tooth = 0.022 * (1.0 - abs(fract(q.x * 26.0 + 0.5) * 2.0 - 1.0));
    float d = max(max(abs(q.x) - 0.14, q.y - (0.27 - 0.85 * abs(q.x) + tooth)), -(q.y + 0.01));
    vec3 b = vec3(0.075, 0.047, 0.110);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float x = abs(q.x - (fi - 1.0) * 0.07);
      float ld = max(max(x - 0.022, q.y - (0.17 + 0.04 * (1.0 - abs(fi - 1.0)) - 2.6 * x)), 0.04 - q.y);
      b = mix(b, lan, cFill(ld));
      b = mix(b, gold * 0.75, cLine(ld, 1.4));
    }
    c = mix(c, b, cFill(d));
    c = mix(c, gold * 0.85, cLine(d, 2.0));
    float gem = abs(q.x) / 0.011 + abs(q.y - 0.205) / 0.016 - 1.0;
    c = mix(c, crimson, cFill(gem));
    c = mix(c, gold * 0.55, cFill(max(abs(q.x) - 0.06, abs(q.y + 0.005) - 0.012)));
    return cCap(c);
  }`, "tgThroneBack(p, t)",
  "a tall black-violet throne back with a pointed spiked top, three gold-edged lancet windows, a red gem in the crest and a gold seat at the stair apex",
  "plate", "p = frame uv; t = pocket seconds (unused, the throne is static)");

export const tgGuardianRim = T("tgGuardianRim", "six small costumed kneeling seals in two rows, dark costume masses lit only by a hard gold rim from the throne",
  `vec3 tgGuardCol(float k) {
    if (k < 0.5) return vec3(0.910, 0.894, 0.933);
    if (k < 1.5) return vec3(0.165, 0.059, 0.102);
    if (k < 2.5) return vec3(0.553, 0.667, 0.871);
    if (k < 3.5) return vec3(0.141, 0.102, 0.188);
    if (k < 4.5) return vec3(0.227, 0.541, 0.353);
    return vec3(0.082, 0.086, 0.122);
  }
  float tgKneel(vec2 q, float s, float dir) {
    float body = length(q / vec2(s * 0.9, s * 0.75)) - 1.0;
    float head = length((q - vec2(dir * s * 0.55, -s * 0.15)) / (s * 0.45)) - 1.0;
    return min(body, head * 0.45);
  }
  vec3 tgGuardianRim(vec2 p, float t) {
    vec3 c = tgThroneBack(p, t);
    vec3 gold = vec3(0.851, 0.643, 0.255);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      for (int j = 0; j < 2; j++) {
        float fj = float(j);
        float sd = fj * 2.0 - 1.0;
        float s = (0.040 + 0.016 * fi) * (0.9 + 0.2 * cH21(vec2(fi, fj)));
        vec2 q = p - vec2(0.5 + sd * (0.12 + 0.07 * fi), 0.40 - 0.09 * fi);
        float body = cFill(tgKneel(q, s, -sd));
        float rim = body * (1.0 - cFill(tgKneel(q + vec2(0.0, 0.009 + 0.003 * fi), s, -sd)));
        c = mix(c, tgGuardCol(fi * 2.0 + fj) * 0.30, body);
        c = mix(c, gold * 0.85, rim);
      }
    }
    return cCap(c);
  }`, "tgGuardianRim(p, t)",
  "six dark kneeling masses with bowed heads, three each side of the carpet, each with a hard gold edge on its top and no face",
  "plate", "p = frame uv; t = pocket seconds (unused, the guardians hold still)");

export const tgThroneHaze = T("tgThroneHaze", "six-step violet haze rising with height and hard gold shafts fanning down from the throne, over the full hall",
  `vec3 tgThroneHaze(vec2 p, float t) {
    vec3 c = tgGuardianRim(p, t);
    float ts = floor(t * 12.0 + 1e-4) / 12.0;
    float band = floor(clamp((p.y - 0.30) / 0.70, 0.0, 0.999) * 6.0) / 6.0;
    c = mix(c, vec3(0.635, 0.235, 1.0) * 0.60, 0.18 * (0.35 + band));
    vec2 r = p - vec2(0.5, 0.66);
    float ang = atan(r.y, r.x) + 0.05 * sin(ts * 0.5);
    float sh = cFill(fract(ang * 7.0 / 6.2832 + 0.5) - 0.14) * cAA(-r.y, 0.0);
    float fade = 1.0 - smoothstep(0.10, 0.62, length(r));
    return cCap(mix(c, vec3(0.851, 0.643, 0.255) * 0.70, sh * fade * 0.12));
  }`, "tgThroneHaze(p, t)",
  "stepped violet haze thickening toward the top of the frame and seven pale gold shafts radiating down and out from behind the throne seat",
  "plate", "p = frame uv; t = pocket seconds, the shafts drift slowly on twos; this is the whole 3 s hall still");

export const tgMomongaFlag = T("tgMomongaFlag", "Flag of Momonga: saturated crimson cloth with a lilac skull-and-flame sigil between two pale poles, on a rod and hook, folds swaying on twos",
  `float tgFlagSway(vec2 p, float ts) { return 0.004 * sin(ts * 2.5 + p.y * 9.0) * (0.3 + (0.62 - p.y) * 2.0); }
  float tgFlagD(vec2 p, float ts) {
    vec2 q = p - vec2(0.79 + tgFlagSway(p, ts), 0.46);
    return max(abs(q.x) - 0.070, abs(q.y) - 0.160);
  }
  vec3 tgFlagCol(vec2 p, float ts) {
    vec2 q = p - vec2(0.79 + tgFlagSway(p, ts), 0.46);
    vec3 crimLit = vec3(0.478, 0.141, 0.282), crimShade = vec3(0.224, 0.110, 0.184);
    vec3 col = mix(crimLit, crimShade, cAA(sin(q.x * 70.0 + ts * 1.7 + q.y * 5.0), 0.35));
    vec2 s = q - vec2(0.0, 0.03);
    float skull = min(length(s / vec2(0.032, 0.036)) - 1.0, max(abs(s.x) - 0.020, abs(s.y + 0.040) - 0.014));
    float fl = 1.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      fl = min(fl, length((s - vec2((fi - 1.0) * 0.022, 0.060 + 0.016 * (1.0 - abs(fi - 1.0)))) / vec2(0.009, 0.026)) - 1.0);
    }
    float sig = min(skull, fl);
    float eye = min(length(s - vec2(-0.013, 0.004)), length(s - vec2(0.013, 0.004))) - 0.0085;
    col = mix(col, vec3(0.478, 0.361, 0.451), cFill(sig - 0.003));
    col = mix(col, vec3(0.686, 0.639, 0.690), cFill(sig));
    return mix(col, crimShade * 0.5, cFill(eye));
  }
  vec3 tgFlagRig(vec3 c, vec2 p, float t) {
    float ts = floor(t * 12.0 + 1e-4) / 12.0;
    float p1 = max(abs(p.x - 0.705) - 0.004, abs(p.y - 0.40) - 0.22);
    float p2 = max(abs(p.x - 0.875) - 0.004, abs(p.y - 0.40) - 0.22);
    float rod = max(abs(p.y - 0.625) - 0.003, abs(p.x - 0.79) - 0.095);
    float tt = max(ts - 8.5, 0.0);
    float ang = 0.105 * exp(-tt / 0.9) * cos(6.2832 * tt / 1.2) * step(8.5, ts);
    vec2 pv = vec2(0.79, 0.625), h = pv + 0.022 * vec2(sin(ang), -cos(ang));
    vec2 pa = p - pv, ba = h - pv;
    float hook = length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - 0.003;
    return mix(c, vec3(0.74, 0.70, 0.74), cFill(min(min(p1, p2), min(rod, hook))));
  }
  vec3 tgMomongaFlag(vec2 p, float t) {
    float ts = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 c = tgNavePlate(p, t);
    float d = tgFlagD(p, ts);
    c = mix(c, tgFlagCol(p, ts), cFill(d));
    c = mix(c, vec3(0.047, 0.051, 0.071), cLine(d, 1.4) * 0.5);
    return cCap(tgFlagRig(c, p, t));
  }`, "tgMomongaFlag(p, t)",
  "a crimson banner with folds and a pale skull crowned by three flame tongues, hanging between two pale poles from a rod with one small hook",
  "card", "p = frame uv; t = pocket seconds, folds sway at 12 fps; after 8.5 s the hook swings 6 degrees and damps out over 2 s");

export const tgBlueFireBurn = T("tgBlueFireBurn", "blue fire eats the flag from the pole foot on a slant: cloth cells shrink ahead of a three-band flame front, the cloth is gone behind it, the poles stay",
  `vec3 tgBlueFireBurn(vec2 p, float t) {
    float ts = (t >= 8.0 && t < 8.5) ? floor(t * 24.0 + 1e-4) / 24.0 : floor(t * 12.0 + 1e-4) / 12.0;
    float s = clamp((ts - 8.1) / 1.2, 0.0, 1.0);
    vec3 c = tgNavePlate(p, t);
    vec2 dir = normalize(vec2(0.45, 0.89));
    float d = dot(p - vec2(0.875, 0.26), dir) - (-0.10 + s * 0.48);
    vec2 f = fract(p / 0.022) - 0.5;
    float r = mix(0.0, 0.62, clamp(d / 0.06, 0.0, 1.0));
    float cloth = cFill(tgFlagD(p, ts)) * cFill(max(abs(f.x), abs(f.y)) - r) * cAA(d, 0.0);
    vec3 col = tgFlagCol(p, ts);
    col = mix(col, vec3(0.620, 0.800, 1.0), 1.0 - cAA(d, 0.012));
    c = mix(c, col, cloth);
    float fr = d + (cVn(vec2(p.x * 60.0, ts * 10.0 + p.y * 20.0)) - 0.5) * 0.03;
    float live = step(8.1, ts) * cFill(tgFlagD(p, ts) - 0.012);
    c = mix(c, vec3(0.110, 0.184, 0.541), cFill(abs(fr + 0.010) - 0.024) * live);
    c = mix(c, vec3(0.180, 0.420, 0.949), cFill(abs(fr + 0.010) - 0.014) * live);
    c = mix(c, vec3(0.620, 0.800, 1.0), cFill(abs(fr + 0.008) - 0.0055) * live);
    float yf = 0.26 + (-0.10 + s * 0.48) / 0.89;
    float pole = cFill(abs(abs(p.x - 0.79) - 0.085) - 0.01) * cFill(abs(p.y - 0.40) - 0.22);
    c += vec3(0.180, 0.420, 0.949) * exp(-abs(p.y - yf) * 14.0) * pole * 0.6 * step(8.1, ts) * (1.0 - step(9.4, ts));
    return cCap(tgFlagRig(c, p, t));
  }`, "tgBlueFireBurn(p, t)",
  "a slanted wall of three-band blue flame climbing the crimson flag from the right pole foot, cloth squares shrinking ahead of it with a pale blue edge, bare poles and a swinging hook behind",
  "card", "p = frame uv; t = pocket seconds, 24 fps from 8.0 to 8.5 then 12 fps, front crosses the flag 8.1 to 9.3 s");

export const tgBreakCircle = T("tgBreakCircle", "gold floor circle drawn on in twelve 24 fps drawings: four rings, 48 rune ticks, a seven-point star, seven coloured gems, then a flare",
  `vec2 tgCircleU(vec2 p) { return (p - vec2(0.40, 0.50)) / vec2(0.27, 0.121); }
  vec3 tgGem(float j) {
    if (j < 0.5) return vec3(0.784, 0.125, 0.251);
    if (j < 1.5) return vec3(0.227, 0.541, 0.353);
    if (j < 2.5) return vec3(0.184, 0.416, 0.690);
    if (j < 3.5) return vec3(0.941, 0.706, 0.161);
    if (j < 4.5) return vec3(0.706, 0.420, 1.0);
    if (j < 5.5) return vec3(0.878, 0.878, 0.878);
    return vec3(1.0, 0.541, 0.227);
  }
  vec3 tgBreakCircle(vec2 p, float t) {
    vec3 c = tgNavePlate(p, t);
    float ts = t < 8.5 ? floor(t * 24.0 + 1e-4) / 24.0 : floor(t * 12.0 + 1e-4) / 12.0;
    float kk = floor((ts - 8.0) * 24.0 + 0.5);
    if (kk < -0.5) return c;
    float k = min(kk, 11.0);
    vec3 gold = vec3(0.851, 0.643, 0.255) * (1.0 + 0.35 * step(10.5, kk) * (1.0 - step(11.5, kk)));
    vec2 u = tgCircleU(p);
    float r = length(u);
    float ang = atan(u.y, u.x);
    float a01 = ang / 6.2832 + 0.5;
    c = mix(c, gold * 0.25, cFill(r - 1.0) * 0.16 * step(0.5, k));
    float ringR[4] = float[4](0.38, 0.60, 0.86, 1.0);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float prog = clamp((k - 2.0 * fi + 1.0) / 2.0, 0.0, 1.0);
      c = mix(c, gold, cLine(r - ringR[i], 2.5) * step(a01, prog) * step(0.01, prog));
    }
    float on8 = step(7.5, k);
    float tickf = fract((ang + 0.349 * max(ts - 8.5, 0.0)) * 48.0 / 6.2832);
    c = mix(c, gold * 0.9, cFill(abs(tickf - 0.5) - 0.13) * cFill(abs(r - 0.928) - 0.048) * on8);
    float dmin = 9.0;
    for (int j = 0; j < 7; j++) {
      float fj = float(j);
      float a0 = 6.2832 * fj / 7.0 - 1.5708, a1 = 6.2832 * (fj + 3.0) / 7.0 - 1.5708;
      vec2 A = 0.58 * vec2(cos(a0), sin(a0)), B = 0.58 * vec2(cos(a1), sin(a1));
      vec2 pa = u - A, ba = B - A;
      dmin = min(dmin, length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)));
    }
    c = mix(c, gold, cLine(dmin, 2.2) * on8);
    for (int j = 0; j < 7; j++) {
      float fj = float(j);
      float a = 6.2832 * fj / 7.0 - 1.5708;
      float dg = length(u - 0.728 * vec2(cos(a), sin(a))) - 0.05;
      float vis = step((fj < 2.5 ? 9.0 : 10.0) - 0.5, k);
      c = mix(c, tgGem(fj), cFill(dg) * vis);
      c = mix(c, gold, cLine(dg, 1.6) * vis);
    }
    return cCap(c);
  }`, "tgBreakCircle(p, t)",
  "a foreshortened gold magic circle drawn ring by ring on the stone floor: four concentric rings sweeping on, a band of 48 slowly turning ticks, a seven-point star and seven gems in their own colours",
  "plate", "p = frame uv; t = pocket seconds, bare floor before 8.0 s, drawings k = 0 to 11 at 24 fps to 8.5 s, rings at k 0 2 4 6, ticks and star k 8, gems k 9 and 10, flare k 11");

export const tgHallDim = T("tgHallDim", "hall darkens outside the outer ring when the circle lights: x0.80 on the first drawing, x0.55 held, recovering to x1.0 from 10.5 to 11.0 s, circle and seal exempt",
  `vec3 tgHallDim(vec3 col, vec2 p, float t) {
    float kk = floor((floor(t * 24.0 + 1e-4) / 24.0 - 8.0) * 24.0 + 0.5);
    float m = (kk < -0.5) ? 1.0 : ((kk < 0.5) ? 0.80 : 0.55);
    m = mix(m, 1.0, smoothstep(10.5, 11.0, t));
    float ex = max(cFill(length(tgCircleU(p)) - 1.0), cFill(length((p - vec2(0.50, 0.22)) / vec2(0.10, 0.18)) - 1.0));
    return col * mix(m, 1.0, ex);
  }`, "tgHallDim(tgBreakCircle(p, t), p, t)",
  "everything outside the gold circle and the seal drops to about half brightness at the spell and stays dim, the circle and the seal stay lit",
  "mask", "col = plate colour; p = frame uv; t = pocket seconds, steps at 24 fps in the 8.0 to 8.5 s window");

export const tgAinzSkull = T("tgAinzSkull", "Ainz seal head: purple hood with gold interlace border, bone-grey skull face with brow ridges, stitch seam, hollow sockets and red pin-prick eye lights that flare at the spell",
  `vec3 tgAinzSkull(vec2 p, float t) {
    float ts = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 robe = vec3(0.169, 0.102, 0.267), hood = vec3(0.208, 0.125, 0.310), gold = vec3(0.784, 0.635, 0.290);
    vec3 bone = vec3(0.541, 0.525, 0.502), ink = vec3(0.047, 0.051, 0.071), red = vec3(0.922, 0.118, 0.157);
    float lit = cNdL(p);
    vec3 c = vec3(0.051, 0.051, 0.078);
    float body = length((p - vec2(0.72, 0.47)) / vec2(0.19, 0.27)) - 1.0;
    c = mix(c, cCel3(lit, 0.40, 0.74, robe * 0.7, robe, robe * 1.5), cFill(body));
    vec2 hq = p - vec2(0.72, 0.62);
    float hd = length(hq / 0.17) - 1.0;
    float tip = max(abs(hq.x) - 0.12 * (1.0 - (hq.y - 0.05) / 0.25), max(0.05 - hq.y, hq.y - 0.30));
    float hoodD = min(hd, tip);
    c = mix(c, cCel3(lit, 0.40, 0.74, hood * 0.6, hood, hood * 1.45), cFill(hoodD));
    float dash = 0.6 + 0.4 * step(0.0, sin(atan(hq.y, hq.x) * 28.0));
    c = mix(c, gold * dash, cFill(abs(hd + 0.012) - 0.008) * cFill(hd));
    vec2 fq = p - vec2(0.72, 0.60);
    float face = length(fq / vec2(0.105, 0.12)) - 1.0;
    vec3 fc = mix(bone * 0.72, bone, cAA(-fq.x + fq.y * 0.3, 0.0));
    float brow = cLine(fq.y - (0.055 - 0.35 * abs(abs(fq.x) - 0.04)), 1.6) * cFill(abs(fq.x) - 0.085);
    float seam = cLine(fq.x, 1.0) * cFill(abs(fq.y - 0.08) - 0.03);
    float crack = cLine(fq.y - 0.07 - 0.9 * (fq.x + 0.05), 1.0) * cFill(length(fq - vec2(-0.07, 0.05)) - 0.03);
    fc = mix(fc, ink, max(max(brow, seam), crack) * 0.7);
    c = mix(c, fc, cFill(face));
    float sw = (ts < 8.0) ? 1.0 : ((ts < 9.0) ? 1.6 : mix(1.6, 1.0, clamp(ts - 9.0, 0.0, 1.0)));
    vec3 catchc = mix(vec3(0.95, 0.93, 0.88), vec3(0.851, 0.643, 0.255), step(6.5, ts));
    for (int i = 0; i < 2; i++) {
      vec2 e = fq - vec2((float(i) * 2.0 - 1.0) * 0.038, 0.01);
      c = mix(c, ink, cFill(length(e / vec2(0.026, 0.030)) - 1.0) * cFill(face));
      c = mix(c, red, cFill(length(e) - 0.0065 * sw));
      c = mix(c, catchc, cFill(length(e - vec2(-0.004, 0.004)) - 0.0022));
    }
    vec2 mq = fq - vec2(0.0, -0.055);
    c = mix(c, vec3(0.941, 0.851, 0.741), cFill(length(mq / vec2(0.045, 0.028)) - 1.0) * cFill(face));
    c = mix(c, ink, cFill(min(length(mq - vec2(-0.012, 0.004)), length(mq - vec2(0.012, 0.004))) - 0.004) * cFill(face));
    c = mix(c, ink, cLine(abs(fq.y + 0.092) - 0.0, 1.0) * cFill(abs(fq.x) - 0.03) * cFill(face));
    float collar = abs(length((p - vec2(0.72, 0.50)) / vec2(0.13, 0.045)) - 1.0) * 0.045 - 0.012;
    c = mix(c, gold, cFill(collar) * cAA(0.50 - p.y, 0.0));
    c = mix(c, ink, cLine(min(body, hoodD), 1.8) * 0.8);
    return cCap(c);
  }`, "tgAinzSkull(p, t)",
  "a hooded seal head with a pointed purple hood edged in gold, a grey skull face with two brow ridges and a seam, black eye sockets with a small red light in each, a seal muzzle and a gold collar",
  "card", "p = frame uv (seal centred as in the cast kit); t = pocket seconds, eye lights x1.0 to x1.6 at 8.0 s easing to x1.0 by 10.0 s, catchlight turns gold at 6.5 s");

export const tgGradeNazarick = T("tgGradeNazarick", "Nazarick grade: cool violet shadow tint, split tone at mix 0.20, luma cap 0.92, ink floor lift so nothing is pure black",
  `vec3 tgGradeNazarick(vec3 col) {
    float w = smoothstep(0.2, 0.8, cLuma(col));
    vec3 c = mix(col, col * vec3(0.94, 0.92, 1.08), 0.35 * (1.0 - w));
    c = mix(c, mix(vec3(0.086, 0.094, 0.133), vec3(0.314, 0.325, 0.404), w), 0.20);
    c = cCap(c);
    return mix(vec3(0.047, 0.051, 0.071), c, smoothstep(0.035, 0.08, cLuma(c)));
  }`, "tgGradeNazarick(tgThroneHaze(p, t))",
  "the whole frame cooled toward blue-violet shadows with no crushed black and no blown highlight, violet and gold kept saturated",
  "grade", "col = colour in; no other inputs, tint strengths are fixed at the packet values (split-tone mix 0.20)");

export const tgFrameInk = T("tgFrameInk", "TV frame ink: 2.39:1 letterbox bars and a stepped iris, opening on the seal over 12 drawings by 0.917 s and closing on it over 12 drawings from 11.0 s",
  `vec3 tgFrameInk(vec3 col, vec2 p, float t) {
    vec3 ink = vec3(0.047, 0.051, 0.071);
    vec3 c = mix(ink, col, cAA(p.y, 0.165) * cAA(0.835 - p.y, 0.0));
    float f = floor(t * 12.0 + 0.5);
    float fin = (t < 1.0) ? clamp((f + 1.0) / 12.0, 0.0, 1.0) : 1.0;
    float fout = (t >= 11.0) ? clamp((143.0 - f) / 12.0, 0.0, 1.0) : 1.0;
    float d = length((p - vec2(0.5, 0.36)) * vec2(1.6, 1.0)) - min(fin, fout) * 1.1;
    c = mix(ink, c, cFill(d));
    return mix(c, ink, cLine(d, 3.0));
  }`, "tgFrameInk(tgGradeNazarick(tgThroneHaze(p, t)), p, t)",
  "solid ink bars top and bottom, and a circular TV iris with a thin ink ring that opens from a small circle at the seal and later shrinks back onto it",
  "screen", "col = graded colour; p = full frame uv incl. bars (bars 16.5 percent each); t = pocket seconds, iris centre fixed at (0.5, 0.36) so the seal stays last in view");

export const CUT_SHADERS = [
  tgNavePlate, tgBannerRows, tgChandelierBlue, tgStairWedge, tgThroneBack, tgGuardianRim, tgThroneHaze,
  tgMomongaFlag, tgBlueFireBurn, tgBreakCircle, tgHallDim, tgAinzSkull, tgGradeNazarick, tgFrameInk,
];
const owner = new Map();
for (const t of CUT_SHADERS) for (const m of t.glsl.matchAll(/^\s*(?:float|vec[234]|void)\s+(tg\w+)\s*\(/gm)) owner.set(m[1], t);
for (const t of CUT_SHADERS) for (const m of (t.glsl + t.demo).matchAll(/(tg\w+)\s*\(/g)) {
  const o = owner.get(m[1]);
  if (o && o !== t && !t.deps.includes(o.name)) t.deps.push(o.name);
}

export const CUT_SHADER_COUNT = 14;
export default CUT_SHADERS;
