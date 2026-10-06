// SCREEN-SPACE FX: the Tsukuyomi wires, the anamorphic flare, the slash that opens the sky onto the island, the wipe home.
// One clip-space quad, one program, depth-placed just behind the seal (kit.screenQuad) so the hero is never covered.
// All time here is the DISPLAY clock (cue.t) so edges and fades stay smooth; every window is a pure function of it.
//
// MATHS
//   frame coords   q = vN in NDC (-1..1, y up); p = q * (asp/2, 1/2) in frame-height units; one pixel = 1/H in p, 2/H in q.
//   wires          quadratic Bezier B(t) = (1-t)^2 a + 2(1-t)t c + t^2 b, sampled as 20 segments; distance = min over segments of
//                  |p - closest point|; the parameter of the nearest sample gives a reveal front:  visible iff t <= 1.1 * uWire.
//                  core = 3 px each side (6 px line, #ffffff), halo = next 8 px at 25% as a 2x2 halftone stipple.
//                  wire 3 is tangent to the eye's limb: it passes at distance R from the eye centre E along normal n:  m = E + R n.
//   slash          N = normalize(0.62, 0.78), T = (-N.y, N.x); d = q.N (signed distance to the line), s = q.T (along it).
//                  Lens half-width  hw(s, age) = W(age) * (1 - (s/L)^2)^0.75 * (0.82 + 0.3 jag(s)),   W = 0.55 (1 - (1 - k)^3), k = age/0.45,
//                  the length reveals over the first 0.10 s (L = 1.75 smoothstep), jag = 3-level hard-cut value noise (cel, not smooth).
//                  inside |d| < hw: the painted island. burn band 6 px outside: crimson #e11d2e -> gold #ffb524 by heat = 2.2 age + 0.5 (1-u),
//                  hot pale lip in its first quarter; one frame of Susanoo purple #7a3fc0 when uPhase = 1. ink line 2 px, stipple halo 14 px.
//   wipe home      chevron coordinate m = s - 0.5 |d|; the band m in [front - 0.9, front] sweeps front = mix(-2.6, 2.4, k) in 0.3 s, ink fill,
//                  crimson-gold leading edge 6 px, gold trailing line 2 px.
import { screenQuad } from "./kit.js";

const FRAG = /* glsl */ `
  uniform vec3 uPal[12];            // 0 crimson 1 gold 2 purple 3 ink 4 snow lit 5 snow shade 6 sky top 7 sky low 8 mtn far 9 mtn near 10 pine 11 pale gold
  uniform float uWire; uniform float uWT; uniform vec3 uEye; uniform float uFlare;
  uniform float uSlash; uniform float uPhase; uniform float uHeat; uniform float uWipe;
  const vec2 N = vec2(0.6246, 0.7857);
  const vec2 T = vec2(-0.7857, 0.6246);

  float stip() { vec2 g = floor(gl_FragCoord.xy); return (mod(g.x, 2.0) < 0.5 && mod(g.y, 2.0) < 0.5) ? 1.0 : 0.0; }
  float segd(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  vec2 bez(vec2 p, vec2 a, vec2 c, vec2 b) {            // (distance, parameter of the nearest sample)
    float best = 1e5, bt = 0.0; vec2 q = a;
    for (int i = 1; i <= 20; i++) { float t = float(i) / 20.0; vec2 r = mix(mix(a, c, t), mix(c, b, t), t);
      float d = segd(p, q, r); if (d < best) { best = d; bt = t; } q = r; }
    return vec2(best, bt);
  }

  // the island seen through the cut: banded sky, pale sun, two snow ridges (lit/shade by slope), snow drifts, small pines. Cel, no gradients.
  vec3 island(vec2 q) {
    float sh = -0.18 + 0.03 * vn1(q.x * 2.0);
    float g = smoothstep(sh, 1.0, q.y);
    vec3 c = mix(uPal[7], uPal[6], floor(g * 5.0) / 4.0);
    float cl = vn2(vec2(q.x * 2.5, q.y * 9.0)); if (cl > 0.64 && q.y > sh + 0.25) c = uPal[4];                    // flat cloud strips
    float sd = length(q - vec2(0.42, 0.42)); if (sd < 0.09) c = uPal[11]; else if (sd < 0.115) c = mix(c, uPal[11], 0.5);
    float r1 = sh + 0.10 + 0.20 * vn1(q.x * 1.6 + 4.0) + 0.05 * vn1(q.x * 5.0);
    if (q.y < r1) { float sl = vn1((q.x + 0.02) * 1.6 + 4.0) - vn1((q.x - 0.02) * 1.6 + 4.0); c = sl < 0.0 ? uPal[9] : uPal[8]; if (r1 - q.y < 0.012) c = uPal[4]; }
    float r2 = sh + 0.03 + 0.09 * vn1(q.x * 2.7 + 9.0);
    if (q.y < r2) { float sl = vn1((q.x + 0.02) * 2.7 + 9.0) - vn1((q.x - 0.02) * 2.7 + 9.0); c = sl < 0.0 ? uPal[4] : uPal[5]; }
    if (q.y < sh) { float b = vn2(vec2(q.x * 3.0, (q.y - sh) * 14.0)); c = b > 0.62 ? uPal[5] : uPal[4]; if (b > 0.85) c = mix(uPal[5], uPal[8], 0.4); }
    float cell = floor(q.x * 11.0), hc = hh(cell);                                                                  // pines
    if (hc > 0.55) { float tx = (cell + 0.3 + 0.4 * hh(cell + 9.0)) / 11.0, by = sh - 0.02 - 0.12 * hh(cell + 3.0), th = 0.09 + 0.06 * hh(cell + 5.0);
      float dy = (q.y - by) / th; float w = 0.016 * (1.0 - fract(dy * 3.0)) * (1.0 - dy * 0.4);
      if (dy > 0.0 && dy < 1.0 && abs(q.x - tx) < w) c = fract(dy * 3.0) > 0.7 ? uPal[4] : uPal[10]; }
    return c;
  }

  void main() {
    vec2 q = vN, p = q * 0.5 * vec2(uAsp, 1.0);
    float pxH = 1.0 / uRes.y, pxN = 2.0 / uRes.y;
    float s = dot(q, T), d = dot(q, N);

    // 1. the wipe home (on top of everything)
    if (uWipe >= 0.0) {
      float m = s - 0.5 * abs(d), front = mix(-2.6, 2.4, uWipe);
      if (m < front && m > front - 0.9) {
        float e = front - m; vec3 c = uPal[3];
        if (e < 6.0 * pxN) c = mix(uPal[0] * 2.4, uPal[1] * 2.8, clamp(uWipe * 2.0 + e / (6.0 * pxN), 0.0, 1.0));
        if (m < front - 0.9 + 2.0 * pxN) c = uPal[1] * 2.0;
        gl_FragColor = vec4(c, 1.0); return;
      }
    }

    // 2. the slash
    if (uSlash >= 0.0) {
      float k = clamp(uSlash / 0.45, 0.0, 1.0), W = 0.55 * (1.0 - pow(1.0 - k, 3.0));
      float L = 1.75 * smoothstep(0.0, 0.10, uSlash), lens = L > 0.0 ? max(1.0 - (s / L) * (s / L), 0.0) : 0.0;
      if (lens > 0.0) {
        float jag = floor(vn1(s * 11.0 + 3.7 + sign(d) * 17.0) * 3.0) / 3.0;
        float hw = max(W * pow(lens, 0.75) * (0.82 + 0.3 * jag), 0.006 * pow(lens, 0.5)), e = abs(d) - hw;
        if (e < 0.0) { gl_FragColor = vec4(island(q), 1.0); return; }                                  // the island, through the cut
        if (e < 6.0 * pxN) {                                                                          // burn band
          float u = e / (6.0 * pxN), heat = clamp(2.2 * uSlash + 0.5 * (1.0 - u), 0.0, 1.0);
          vec3 c = mix(uPal[0] * 2.4, uPal[1] * 2.8, heat);
          if (u < 0.25) c = vec3(1.0, 0.95, 0.82) * 3.2;
          if (uPhase > 0.5) c = (u < 0.25 ? uPal[11] : uPal[2]) * 1.9;
          c = mix(uPal[0] * 0.9, c, uHeat);                                                           // cools to an ember
          gl_FragColor = vec4(c, 1.0); return;
        }
        if (e < 8.0 * pxN) { gl_FragColor = vec4(uPal[3], 1.0); return; }                              // ink line
        if (e < 22.0 * pxN && stip() > 0.5) { gl_FragColor = vec4(uPal[0] * 1.3 * uHeat, 1.0); return; } // halftone halo
      }
    }

    // 3. the anamorphic flare on the photon ring
    if (uFlare > 0.0) {
      vec2 v = p - uEye.xy; float L = 0.62 * uFlare, ax = abs(v.x), ay = abs(v.y);
      if (ax < L) { float th = 0.0035 * pow(1.0 - ax / L, 2.0);
        if (ay < th) { gl_FragColor = vec4(vec3(1.0, 0.89, 0.64) * 3.0, 1.0); return; }
        if (ay < th * 3.0 && stip() > 0.5) { gl_FragColor = vec4(uPal[1] * 1.6, 1.0); return; } }
      if (ax < 0.004 && ay < L * 0.22 * (1.0 - ay / (L * 0.5))) { gl_FragColor = vec4(vec3(1.0, 0.89, 0.64) * 2.2, 1.0); return; }
    }

    // 4. the three white wires
    if (uWire > 0.0) {
      float sw = sin(uWT * 0.7), a = uAsp;
      vec2 r1 = bez(p, vec2(-a * 0.58, -0.56), vec2(0.05 + 0.04 * sw, -0.02), vec2(a * 0.58, 0.56));
      vec2 r2 = bez(p, vec2(-a * 0.58, 0.50), vec2(-0.06, 0.04 + 0.03 * sw), vec2(a * 0.58, -0.54));
      vec2 dr = vec2(cos(0.16), sin(0.16)), nr = vec2(-dr.y, dr.x), mm = uEye.xy + nr * uEye.z;     // tangent to the limb
      vec2 r3 = bez(p, mm - dr * a * 0.7, mm + nr * 0.01 * sw, mm + dr * a * 0.7);
      vec2 r = r1; if (r2.x < r.x) r = r2; if (r3.x < r.x) r = r3;
      if (r.y <= 1.1 * uWire) {
        float dpx = r.x / pxH;
        if (dpx < 3.0) { gl_FragColor = vec4(vec3(1.6), 1.0); return; }
        if (dpx < 11.0 && stip() > 0.5) { gl_FragColor = vec4(vec3(1.0), 1.0); return; }
      }
    }
    discard;
  }`;

export function buildScreen(ctx, T) {
  const { THREE } = ctx, P = (h) => new THREE.Color(h);
  const pal = ["#e11d2e", "#ffb524", "#7a3fc0", "#0d0714", "#f2efe6", "#b9c9dc", "#8fb8dc", "#e8f0f4", "#8aa3c0", "#c6d4e4", "#2c3e4a", "#ffe7a8"].map(P);
  const eye = ctx.scene.fx?.eye ?? [0, 0.12, 0.19]; // frame-height units: x, y (up), limb radius. The wide has the disc ~38% of frame height
  const mesh = screenQuad(ctx, {
    behind: 0.6,
    frag: FRAG,
    uniforms: { uPal: { value: pal }, uWire: { value: 0 }, uWT: { value: 0 }, uEye: { value: new THREE.Vector3(...eye) }, uFlare: { value: 0 }, uSlash: { value: -1 }, uPhase: { value: 0 }, uHeat: { value: 1 }, uWipe: { value: -1 } },
  });
  const u = mesh.material.uniforms, sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const F = 1 / 24, FADE = 12 * F;
  return {
    mesh,
    update(t) {
      // wires: shots 2-3, 12-frame fades; the reveal runs along each wire, the fade-out erases it from the far end back
      const [w0, w1] = T.wires;
      u.uWire.value = t < w0 || t > w1 ? 0 : Math.min(sstep(w0, w0 + FADE, t), 1 - sstep(w1 - FADE, w1, t) * 0.999);
      u.uWT.value = t;
      const [f0, f1] = T.flare;
      u.uFlare.value = t < f0 || t > f1 ? 0 : Math.min(sstep(f0, f0 + 0.2, t), 1 - sstep(f1 - 0.2, f1, t));
      // slash: opens one frame after the impact frame; the cut closes onto the wipe at 28.5
      const sa = t - T.slash[0] - F;
      const on = sa >= 0 && t < T.wipe[0];
      u.uSlash.value = on ? sa : -1;
      u.uPhase.value = on && sa < F ? 1 : 0; // Susanoo purple: exactly one frame (egg 3)
      u.uHeat.value = 1 - 0.75 * sstep(1.2, 2.0, sa);
      u.uWipe.value = t >= T.wipe[0] && t <= T.wipe[1] ? (t - T.wipe[0]) / (T.wipe[1] - T.wipe[0]) : -1;
      mesh.visible = u.uWire.value > 0 || u.uFlare.value > 0 || on || u.uWipe.value >= 0;
    },
  };
}
