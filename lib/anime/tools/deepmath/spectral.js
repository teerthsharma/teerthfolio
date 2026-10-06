// Spectral: Fourier bands, wavelet packets — 6 operators.
import { D } from "./define.js";

export default [
  D("spectral", "deepFourierBand", "band-limited Fourier sum: three modes under a cutoff disk", /* glsl */ `
    vec3 deepFourierBand(vec2 p, float t) {
      float u = 0.45 * sin(p.x * 6.2 + t * 0.4) + 0.28 * sin(p.y * 8.4 - t * 0.25)
        + 0.18 * sin((p.x + p.y) * 11.0 + t * 0.15);
      vec2 f = (p - vec2(0.72, 0.50)) * 2.2;
      float cut = dmFill(length(f) - 0.55);
      vec3 col = mix(DM_COOL, DM_MINT, 0.5 + 0.5 * u);
      col = mix(dmPaper(p), col, 0.7 + 0.15 * cut);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.2) * 0.75);
      col = mix(col, DM_RUST, dmLine(length(f) - 0.55, 1.4) * 0.55);
      return dmTone(col);
    }`),
  D("spectral", "deepWaveletPacket", "Morlet packets at three scales: Re(e^{ikx} e^{−x²}) tiling", /* glsl */ `
    vec3 deepWaveletPacket(vec2 p, float t) {
      float u = 0.0;
      for (int i = 0; i < 3; i++) {
        float sc = exp2(float(i));
        vec2 c = vec2(0.32 + 0.36 * float(i), 0.50 + 0.08 * sin(t * 0.3 + float(i)));
        vec2 q = (p - c) * sc * 6.0;
        u += exp(-dot(q, q)) * cos(q.x * 6.0 + t * 0.8) / sc;
      }
      vec3 col = mix(DM_VIOLET, DM_TEAL, 0.5 + 0.5 * tanh(u * 2.2));
      col = mix(dmPaper(p), col, 0.84);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.2) * 0.7);
      return dmTone(col);
    }`),
  D("spectral", "deepGaborAtom", "one Gabor atom: Gaussian window × complex exponential", /* glsl */ `
    vec3 deepGaborAtom(vec2 p, float t) {
      vec2 c = vec2(0.70 + 0.08 * sin(t * 0.3), 0.50);
      vec2 q = (p - c) * vec2(7.5, 9.0);
      float g = exp(-dot(q, q));
      float re = g * cos(q.x * 7.0 - t * 2.0);
      vec3 col = mix(DM_COOL, DM_AMBER, 0.5 + 0.5 * re);
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(re, 0.0, 1.15) * 0.8);
      col = mix(col, DM_TEAL, dmLine(length(p - c) - 0.18, 1.2) * 0.35);
      return dmTone(col);
    }`),
  D("spectral", "deepBesselEigen", "Laplacian eigenfunction on a disk: J_n(λ r) cos(nθ)", /* glsl */ `
    vec3 deepBesselEigen(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q) / 0.34;
      float th = atan(q.y, q.x);
      float n = 3.0;
      float lam = 8.65;
      float u = dmJ0(lam * r) * cos(n * th - t * 0.4);
      float disk = dmFill(r - 1.0);
      vec3 col = mix(dmPaper(p), mix(DM_VIOLET, DM_AMBER, 0.5 + 0.5 * u), disk);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.2) * disk * 0.8);
      col = mix(col, DM_INK, dmLine(r - 1.0, 1.6) * 0.85);
      return dmTone(col);
    }`),
  D("spectral", "deepChebyshevAlias", "Chebyshev T_n clustered nodes: oscillation packs at the ends", /* glsl */ `
    vec3 deepChebyshevAlias(vec2 p, float t) {
      float x = clamp(p.x / 1.44 * 2.0 - 1.0, -0.999, 0.999);
      float n = 9.0;
      float Tn = cos(n * acos(x) + t * 0.2);
      float nodes = abs(cos((n + 0.5) * acos(x)));
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.5 * Tn);
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmIso(Tn, 0.0, 1.15) * 0.75);
      col = mix(col, DM_RUST, dmLine(p.y - (0.50 + 0.28 * Tn), 1.3) * 0.55);
      col = mix(col, DM_AMBER, dmBand(nodes, 0.0, 0.08) * 0.45);
      return dmTone(col);
    }`),
  D("spectral", "deepShannonCardinal", "Shannon–Whittaker: cardinal sinc train through impulse samples", /* glsl */ `
    vec3 deepShannonCardinal(vec2 p, float t) {
      float u = 0.0;
      for (int i = 0; i < 7; i++) {
        float xi = 0.16 + 0.18 * float(i);
        float ai = mix(-1.0, 1.0, dmH21(vec2(float(i), floor(t * 0.2))));
        float z = (p.x - xi) * 14.0;
        float sinc = abs(z) < 0.02 ? 1.0 : sin(z) / z;
        u += ai * sinc * exp(-abs(p.y - 0.50) * 3.5);
      }
      vec3 col = mix(DM_TEAL, DM_AMBER, 0.5 + 0.5 * tanh(u));
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.2) * 0.7);
      return dmTone(col);
    }`),
];
