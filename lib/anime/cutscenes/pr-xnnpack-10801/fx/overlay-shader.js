// overlay-shader.js: ONE fullscreen picture-plane fragment program that carries every screen effect of the cutscene.
// Layers, bottom to top (premultiplied "over"): black wipe, glass crack 1, glass crack 2, Urahara hat hole, TYBW eye panel,
// reverse-swell rings, choir columns, two slash arcs, Hogyoku dot, cold flash. p is in frame-height units, y up.
//
// MATHS
//  Glass (the illusion as a picture). Crack origin o, d = p-o, r=|d|, rr=r+0.015, theta=atan2(d).
//   q = K (theta, ln rr), K = N/2pi: the LOG-POLAR map. It is CONFORMAL (|grad q| = K/rr, isotropic), so Voronoi cells in q
//   are round-ish shards that grow with r (5-18% of the frame) and cell edges read as radial spokes + ring cracks.
//   theta is periodic: the cell column is taken mod N so the seam closes. Edge distance e_q is the two-pass "distance to the
//   bisector of nearest and neighbour feature points"; screen distance = e_q * rr / K (inverse of |grad q|).
//   Crack line = 1 - smoothstep(w, w+1.2px, e), w = (0.75 + 2.2 exp(-7r)) px (thick at the strike, 1.5 px at the rim).
//   A shard is a HOLE iff hash(cell) < hole fraction; holes show the island (the real world), shards a cold-blue glass tint.
//  Slash arc: circle arc (centre c, radius R) swept over 3 frames. f = (atan2 - a0)/(a1 - a0) is the arc fraction; head at
//   f = prog, tail at f = prog-0.5; half-width w(u) = 1.5 px + 0.012 u^1.5, u in 0..1 tail->head (a tapered, bright-headed stroke).
//  Swell: five contracting rings, radius = (1-k)*0.6 + 0.07 i around the seal (the reverse of a shockwave, a breath IN).
//  Eye panel: ten crescents (ellipse minus an offset ellipse) on an ellipse about the frame centre, white, red iris smudge.
export const VERT = /* glsl */ `
varying vec2 vP;
uniform float uAsp;
void main(){ vP = position.xy * vec2(uAsp, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export const FRAG = /* glsl */ `
precision highp float;
varying vec2 vP;
uniform float uPx;
uniform vec2 uSeal;
uniform vec3 uHog;
uniform vec2 uWipe;
uniform vec4 uC1, uB1;
uniform vec4 uC2, uB2;
uniform vec4 uSl1, uSl2;
uniform float uSwell;
uniform float uChoir;
uniform float uEye;
uniform vec4 uHat;
uniform float uFlash;

const vec3 INK=vec3(0.031,0.039,0.059), BLUE=vec3(0.373,0.714,1.0), PALE=vec3(0.847,0.925,1.0), WHITE=vec3(0.957,0.957,0.941), GREY=vec3(0.667,0.694,0.749);

float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return fract(sin(p) * 43758.5453); }
vec4 over(vec4 top, vec4 bot){ return top + bot * (1.0 - top.a); }
vec4 pm(vec3 c, float a){ return vec4(c * a, a); }

vec3 vor(vec2 q, float N, float seed){
  vec2 n = floor(q), f = fract(q); float md = 8.0; vec2 mg = vec2(0.0), mr = vec2(0.0), mid = vec2(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = vec2(float(i), float(j)); vec2 cell = n + g; vec2 wid = vec2(mod(cell.x, N), cell.y);
    vec2 r = g + h22(wid + seed) * 0.8 + 0.1 - f; float d = dot(r, r);
    if(d < md){ md = d; mr = r; mg = g; mid = wid; }
  }
  md = 8.0;
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){
    vec2 g = mg + vec2(float(i), float(j)); vec2 cell = n + g; vec2 wid = vec2(mod(cell.x, N), cell.y);
    vec2 r = g + h22(wid + seed) * 0.8 + 0.1 - f;
    if(dot(mr - r, mr - r) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec3(md, mid);
}

vec3 island(vec2 p){
  vec3 sky = mix(PALE, vec3(0.56,0.77,0.93), smoothstep(-0.1, 0.5, p.y));
  vec3 snow = mix(WHITE, vec3(0.87,0.9,0.95), smoothstep(-0.12, -0.5, p.y));
  return mix(snow, sky, smoothstep(-0.13, -0.12, p.y));
}

vec4 glass(vec2 p, vec4 C, vec4 B){
  if(C.z <= 0.0 || B.x <= 0.0) return vec4(0.0);
  vec2 d = p - C.xy; float r = length(d); if(r > C.z) return vec4(0.0);
  const float N = 14.0; float K = N / 6.2831853; float rr = r + 0.015;
  vec3 v = vor(vec2(atan(d.y, d.x) * K, log(rr) * K), N, B.y);
  float e = v.x * rr / K;
  float lw = (0.75 + 2.2 * exp(-r * 7.0)) * uPx;
  float front = 1.0 - smoothstep(C.z - 0.05, C.z, r);
  float line = (1.0 - smoothstep(lw, lw + uPx * 1.2, e)) * front * B.x;
  float rim = (1.0 - smoothstep(0.0, 0.012, e)) * front * 0.22 * B.x;
  float h = h21(v.yz + B.y * 3.1);
  float hole = step(h, C.w) * step(0.035, r) * front;
  vec4 o = pm(BLUE, front * (0.12 + 0.08 * h) * B.x);
  o = over(pm(PALE, rim), o);
  o = over(pm(island(p), hole * B.z), o);
  o = over(pm(PALE, line), o);
  return o;
}

vec4 slash(vec2 p, vec4 S, float a0, float a1, float R){
  if(S.x <= 0.0 || S.y <= 0.0) return vec4(0.0);
  vec2 d = p - S.zw; float r = length(d); float f = (atan(d.y, d.x) - a0) / (a1 - a0);
  float u = (f - (S.x - 0.5)) / 0.5; if(f > S.x || u < 0.0) return vec4(0.0);
  float w = 1.5 * uPx + 0.012 * pow(u, 1.5); float dd = abs(r - R);
  float core = (1.0 - smoothstep(w * 0.35, w * 0.6, dd)) * u;
  float edge = (1.0 - smoothstep(w * 0.6, w, dd)) * u;
  return over(pm(PALE, core * S.y), pm(BLUE, edge * 0.8 * S.y));
}

float crescent(vec2 p, vec2 c, vec2 ab){
  vec2 a = (p - c) / ab, b = (p - c - vec2(ab.x * 0.55, 0.0)) / (ab * vec2(1.0, 0.92));
  return step(dot(a, a), 1.0) * (1.0 - step(dot(b, b), 1.0));
}

float box(vec2 p, vec2 c, vec2 hs){ vec2 q = abs(p - c) - hs; return step(max(q.x, q.y), 0.0); }

void main(){
  vec2 p = vP; vec4 o = vec4(0.0);
  if(uWipe.y > 0.5){
    vec2 d = p - uSeal; float r = length(d) + 0.012 * sin(atan(d.y, d.x) * 9.0 + uWipe.x * 5.0);
    float inside = 1.0 - smoothstep(uWipe.x - uPx, uWipe.x, r);
    float rimL = (1.0 - smoothstep(1.0 * uPx, 2.0 * uPx, abs(r - uWipe.x + 1.5 * uPx))) * 0.7;
    o = over(pm(BLUE, rimL), pm(INK, inside));
  }
  o = over(glass(p, uC1, uB1), o);
  o = over(glass(p, uC2, uB2), o);
  if(uHat.w > 0.5 && uHat.z > 0.0){
    vec2 d = p - uHat.xy; float a = atan(d.y, d.x);
    float R = 0.075 * uHat.z * (0.8 + 0.2 * sin(a * 7.0) + 0.1 * sin(a * 13.0 + 1.0));
    float hole = 1.0 - smoothstep(R - uPx, R, length(d));
    float rimH = (1.0 - smoothstep(0.0, 1.5 * uPx, abs(length(d) - R))) * 0.9;
    vec2 l = d / max(uHat.z, 0.3);
    float hat = box(l, vec2(0.0, 0.016), vec2(0.026, 0.022)) + step(length((l - vec2(0.0, -0.006)) / vec2(0.058, 0.011)), 1.0);
    float geta = box(l, vec2(-0.016, -0.034), vec2(0.011, 0.004)) + box(l, vec2(0.016, -0.034), vec2(0.011, 0.004))
               + box(l, vec2(-0.016, -0.043), vec2(0.0035, 0.005)) + box(l, vec2(0.016, -0.043), vec2(0.0035, 0.005));
    vec3 c = mix(island(p), INK, clamp(hat + geta, 0.0, 1.0));
    o = over(pm(PALE, rimH), over(pm(c, hole), o));
  }
  if(uEye > 0.5){
    for(int i=0;i<10;i++){
      float a = 6.2831853 * (float(i) + 0.5) / 10.0 + 1.5708; vec2 c = vec2(0.0, 0.12) + vec2(cos(a) * 0.36, sin(a) * 0.2);
      float m = crescent(p, c - vec2(0.012, 0.0), vec2(0.022, 0.045));
      float red = step(length((p - c - vec2(0.008, 0.0)) / vec2(0.008, 0.016)), 1.0);
      o = over(pm(mix(WHITE, vec3(0.70,0.15,0.18), red), m), o);
    }
  }
  if(uSwell >= 0.0){
    float r = length(p - uSeal); float s = 0.0;
    for(int i=0;i<5;i++){
      float R = (1.0 - uSwell) * 0.6 + 0.07 * float(i);
      s += (1.0 - smoothstep(1.0 * uPx, 2.2 * uPx, abs(r - R))) * (1.0 - float(i) / 5.0);
    }
    o = over(pm(PALE, clamp(s, 0.0, 1.0) * uSwell * 0.7), o);
  }
  if(uChoir > 0.0){
    float s = 0.0;
    for(int i=0;i<9;i++){
      float x = uSeal.x + (float(i) - 4.0) * 0.075; float hh = 0.35 + 0.5 * h21(vec2(float(i), 3.0));
      float w = 0.0025 + 0.01 * h21(vec2(float(i), 7.0));
      s += (1.0 - smoothstep(w * 0.5, w, abs(p.x - x))) * smoothstep(-0.5, uSeal.y - 0.1, p.y) * (1.0 - smoothstep(uSeal.y, uSeal.y + hh, p.y));
    }
    o = over(pm(PALE, clamp(s, 0.0, 1.0) * uChoir * 0.5), o);
  }
  o = over(slash(p, uSl1, -2.7, -0.5, 0.55), o);
  o = over(slash(p, uSl2, -0.4, -2.6, 0.55), o);
  if(uHog.z > 0.5){
    float r = length(p - uHog.xy);
    o = over(pm(vec3(1.0), 1.0 - smoothstep(uPx, 2.0 * uPx, r)), over(pm(vec3(0.54,0.49,1.0), 1.0 - smoothstep(4.0 * uPx, 6.0 * uPx, r)), o));
  }
  o = over(pm(GREY, uFlash), o);
  gl_FragColor = o;
}`;
