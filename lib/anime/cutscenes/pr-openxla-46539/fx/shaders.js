// GLSL for the pr-openxla-46539 fx layer (My Hero Academia, "United States of Smash", in a golden-age comic).
// Every shader's maths is in the comment above it. Colours are the bible's hexes as linear-ish vec3 literals.
//   ink #12070a = (.071,.027,.039)   fire edge #ff8a20 = (1,.541,.125)   mid #ffcf20 = (1,.812,.125)
//   core #fff2a0 = (1,.949,.627)     hole #7a2a10 = (.478,.165,.063)    red-black #471f19 = (.278,.122,.098)

const HASH = /* glsl */`
float h11(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

// ---- billboard vertex ----------------------------------------------------------------------------------
// uSph = 0  CYLINDRICAL card, upright in the world: P = origin + right_h * p.x + up * p.y + away_h * uBack
//           (right_h / away_h are the camera's right and forward axes flattened onto the ground).
// uSph = 1  SPHERICAL card, built in view space: P_view = V * origin; P_view.xy += p; P_view.z -= uBack.
// p = Rot(uRot) * (position.xy * uSize) + uOff. uBack > 0 pushes the card BEHIND whatever is at its origin
// (so a halo never lies over the seal).
export const BB_VERT = /* glsl */`
uniform vec3 uOrigin; uniform vec2 uSize; uniform vec2 uOff; uniform float uBack, uSph, uRot;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec2 p = position.xy * uSize;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + uOff;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 fwd = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vec3 rh = normalize(vec3(right.x, 0., right.z) + vec3(1e-5, 0., 0.));
  vec3 away = normalize(vec3(fwd.x, 0., fwd.z) + vec3(0., 0., 1e-5));
  vec3 wp = uOrigin + rh * p.x + vec3(0., p.y, 0.) + away * uBack;
  vec4 mvS = viewMatrix * vec4(uOrigin, 1.);
  mvS.xy += p; mvS.z -= uBack;
  gl_Position = uSph > .5 ? projectionMatrix * mvS : projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;

// flat plane vertex (ground decals: the mesh carries its own transform)
export const FLAT_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

// ---- screen-space quad (backdrop and overlay) ------------------------------------------------------------
// clip xy = mix(uRect.xy, uRect.zw, uv): a full-screen quad is uRect = (-1,-1,1,1). uZ is the NDC depth:
//   backdrop  uZ = .99995  just in front of the far-plane plate, BEHIND every layer-1 object, so the seal (depth-written,
//             drawn first as opaque) always stays in front of a flash, a speed-line wedge or a sun wash.
//   overlay   uZ = -1 with depthTest off: the page frame and the paper shards.
export const SCREEN_VERT = /* glsl */`
uniform vec4 uRect; uniform float uZ;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec2 q = mix(uRect.xy, uRect.zw, uv);
  gl_Position = vec4(q, uZ, 1.);
}`;

// ---- fire sheet: one cel flame tongue -------------------------------------------------------------------------
// x = 2(uv.x - .5), y = uv.y base->tip.  half-width w(y) = .62 (1-y)^1.15 (1 + .22 sin(9y + ph + seed)), ph = uPhase pi/2
// centre line sway s(y) = .28 y^2 sin(ph + 1.7 seed) + uLean y^2;   r = |x - s| / w.
// bands (hard, no blend): r > .86 ink outline | r < .32 && y < .6 core #fff2a0 (x1.35, blooms) | r < .66 && y < .86 mid #ffcf20
// | else edge #ff8a20.  Two dark holes #7a2a10 cut into the edge band (ellipses that drift with the phase).
export const FLAME_FRAG = /* glsl */`
uniform float uPhase, uSeed, uAlpha, uLean;
varying vec2 vUv;
void main(){
  float x = (vUv.x - .5) * 2., y = vUv.y;
  float ph = uPhase * 1.5708;
  float sw = .28 * y * y * sin(ph + uSeed * 1.7) + uLean * y * y;
  float w = .62 * pow(max(1. - y, 0.), 1.15) * (1. + .22 * sin(9. * y + ph + uSeed));
  float r = abs(x - sw) / max(w, 1e-3);
  if (r > 1. || y > .995 || y < .0) discard;
  vec3 col = vec3(1., .541, .125);
  if (r < .66 && y < .86) col = vec3(1., .812, .125);
  if (r < .32 && y < .6) col = vec3(1., .949, .627) * 1.35;
  vec2 h1 = vec2((x - sw) / .16, (y - .26 - .16 * sin(uSeed + ph)) / .09);
  vec2 h2 = vec2((x - sw - .22 * sin(uSeed * 2. + ph)) / .1, (y - .55 - .1 * sin(ph)) / .07);
  if (r > .34 && (dot(h1, h1) < 1. || dot(h2, h2) < 1.)) col = vec3(.478, .165, .063);
  if (r > .86) col = vec3(.071, .027, .039);
  gl_FragColor = vec4(col, uAlpha);
}`;

// ---- cel glow (additive): g = floor(clamp(1 - r) * steps + .5) / steps, r = |2(uv - .5)|. rgb = uCol, alpha = g uA
export const GLOW_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uA, uSteps;
varying vec2 vUv;
void main(){
  float r = length((vUv - .5) * 2.);
  float g = clamp(1. - r, 0., 1.);
  g = floor(g * uSteps + .5) / uSteps;
  if (g <= 0.) discard;
  gl_FragColor = vec4(uCol * 1.2, g * uA);
}`;

// ---- 4 point star (the gold merge flare): s = max(sx, sy), sx = (1-|x|) exp(-14|y|), steps at .5 / .12 ----------
export const STAR_FRAG = /* glsl */`
uniform vec3 uCol, uCore; uniform float uA;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 2.;
  float s = max(max(0., 1. - abs(p.x)) * exp(-abs(p.y) * 14.), max(0., 1. - abs(p.y)) * exp(-abs(p.x) * 14.));
  s = max(s, .8 * (1. - length(p) * 3.));
  if (s < .12) discard;
  gl_FragColor = vec4(s > .5 ? uCore * 1.6 : uCol * 1.2, uA);
}`;

// ---- textured card (print type, crests, digits, the check): rgb = map.rgb * uTint, a = map.a * uA ---------------
export const TEX_FRAG = /* glsl */`
uniform sampler2D uMap; uniform vec3 uTint; uniform float uA;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(uMap, vUv);
  if (c.a < .02) discard;
  gl_FragColor = vec4(c.rgb * uTint, c.a * uA);
}`;

// ---- cel cloud puff (storm clouds blasted away, then daylight cumulus) -------------------------------------------
// five circles C_i (centre, radius); d = min_i(|p - C_i| - r_i); flat bottom d = max(d, .3 - y).  Inside d < 0.
// Lit rim = inside the union but outside the same union shifted (-.04, -.07): the up-right crescent -> uLit;
// the lower third (y < .42) -> uSh; the rest uMid.  No outline (the bible: clouds are cel edged, no line).
export const CLOUD_FRAG = /* glsl */`
uniform vec3 uLit, uMid, uSh; uniform float uA;
varying vec2 vUv;
float un(vec2 p, vec2 o){
  float d = length(p - vec2(.25, .42) - o) - .26;
  d = min(d, length(p - vec2(.5, .5) - o) - .3);
  d = min(d, length(p - vec2(.75, .4) - o) - .24);
  d = min(d, length(p - vec2(.38, .62) - o) - .2);
  return min(d, length(p - vec2(.62, .68) - o) - .18);
}
void main(){
  vec2 p = vUv;
  float d = max(un(p, vec2(0.)), .3 - p.y);
  if (d > 0.) discard;
  float dl = un(p, vec2(-.04, -.07));
  vec3 col = uMid;
  if (dl > 0.) col = uLit;
  if (p.y < .42) col = uSh;
  gl_FragColor = vec4(col, uA);
}`;

// ---- sun column (additive): x = 2(uv.x - .5); half widths  w0 = .16 + .04 sin(3y' + t)
// |x| < w0/2 white core (x1.6, blooms) | < w0 #fff3b0 | < 2 w0 soft #fff3b0 x .55; god-ray streaks s = step(.62, fract(9x + .3 sin(8y' + t)))
// add .25 to the outer band; vertical fade: bright at the base, f(y) = 1 - .65 y.
export const COLUMN_FRAG = /* glsl */`
uniform float uA, uTime;
varying vec2 vUv;
void main(){
  float x = (vUv.x - .5) * 2., y = vUv.y;
  float w0 = .16 + .04 * sin(y * 3. + uTime);
  float ax = abs(x);
  float k = 0.;
  vec3 col = vec3(1., .953, .69);
  if (ax < w0 * .5) { col *= 1.6; k = 1.; }
  else if (ax < w0) k = 1.;
  else if (ax < w0 * 2.) k = .55;
  float s = step(.62, fract(9. * x + .3 * sin(y * 8. + uTime)));
  if (ax < .85 && ax >= w0 * 2.) k = .25 * s * (1. - ax);
  k *= 1. - .65 * y;
  if (k < .05) discard;
  gl_FragColor = vec4(col, k * uA);
}`;

// ---- backdrop: red-black impact flash ------------------------------------------------------------------------------------
// p = (uv - uAt) (asp, 1), r = |p|.  Three hard bands: r < .22 #471f19 x1.4 | r < .55 #471f19 | else #12070a mixed with
// angular wedges (dark every other 1/32 turn) so the flash is a cel burst, not a gradient.  alpha = uA (replace-style: opaque).
export const FLASH_FRAG = /* glsl */`
uniform vec2 uAt; uniform float uAsp, uA, uSeed;
varying vec2 vUv;
${HASH}
void main(){
  vec2 p = (vUv - uAt) * vec2(uAsp, 1.);
  float r = length(p), a = atan(p.y, p.x);
  vec3 red = vec3(.278, .122, .098);
  vec3 col = vec3(.071, .027, .039);
  float wedge = step(.5, fract((a + 3.14159) / 6.28318 * 32. + h11(uSeed) * 4.));
  if (r < .55 + .12 * wedge) col = red;
  if (r < .22) col = red * 1.4;
  gl_FragColor = vec4(col, uA);
}`;

// ---- backdrop: black-and-white starburst (2-3 frames) ------------------------------------------------------------------------
// N = 28 spikes.  u = (atan + pi) / 2pi N, f = |fract(u) - .5| 2 (0 at a spike axis), tri = 1 - f.  Per-spike height
// h = hash(floor u).  Spike radius R = .18 + 1.4 h tri^1.6.  r < R white (uInv = 0) else black; a .06 hub reverses.  Opaque.
export const BURST_FRAG = /* glsl */`
uniform vec2 uAt; uniform float uAsp, uA, uSeed, uInv;
varying vec2 vUv;
${HASH}
void main(){
  vec2 p = (vUv - uAt) * vec2(uAsp, 1.);
  float r = length(p), a = atan(p.y, p.x);
  float u = (a + 3.14159) / 6.28318 * 28.;
  float tri = 1. - abs(fract(u) - .5) * 2.;
  float h = h11(floor(u) + uSeed * 13.);
  float R = .18 + 1.4 * h * pow(tri, 1.6);
  float star = step(r, R);
  star = abs(star - step(r, .06));
  star = abs(star - uInv);
  gl_FragColor = vec4(vec3(star), uA);
}`;

// ---- backdrop: tapered radial speed lines converging on the fist ---------------------------------------------------------------------
// 24 wedges.  u = (atan + pi) / 2pi 24, cell i = floor u, f = fract(u) - .5 - .5 (hash_i - .5) (a jittered axis per line).
// Half-width (in cell units) = (.1 + .28 hash2) * smoothstep(uR0, uR0 + .9, r): thin at the fist, wide at the rim (the taper).
// Lines start at uR0 + .15 hash3 (ragged inner ends).  Colour alternates #ffffff / #12070a by parity of i.  alpha = uA.
export const LINES_FRAG = /* glsl */`
uniform vec2 uAt; uniform float uAsp, uA, uSeed, uR0;
varying vec2 vUv;
${HASH}
void main(){
  vec2 p = (vUv - uAt) * vec2(uAsp, 1.);
  float r = length(p), a = atan(p.y, p.x);
  float u = (a + 3.14159) / 6.28318 * 24.;
  float i = floor(u);
  float f = fract(u) - .5 - .5 * (h11(i + uSeed * 5.) - .5);
  float hw = (.1 + .28 * h11(i * 3. + 1. + uSeed)) * smoothstep(uR0, uR0 + .9, r);
  float inside = step(abs(f), hw * .5) * step(uR0 + .15 * h11(i + 9. + uSeed), r);
  if (inside < .5) discard;
  vec3 col = mod(i, 2.) < .5 ? vec3(1.) : vec3(.071, .027, .039);
  gl_FragColor = vec4(col, uA);
}`;

// ---- backdrop: daylight wash (additive) -----------------------------------------------------------------------------------------------------
// p = (uv - (.5, 1.05)) (asp, 1); a = uA exp(-1.6 |p|) stepped to 4 levels; rays = .5 + .5 sin(16 atan + .4 t + 2 sin(5 atan)).
// out = #fff3b0 a (.6 + .4 rays).  The sky opening: sunlight floods from above.
export const WASH_FRAG = /* glsl */`
uniform float uAsp, uA, uTime;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - vec2(.5, 1.05)) * vec2(uAsp, 1.);
  float r = length(p), an = atan(p.x, -p.y);
  float a = floor(uA * exp(-1.6 * r) * 4. + .5) / 4.;
  float rays = .5 + .5 * sin(16. * an + .4 * uTime + 2. * sin(5. * an));
  if (a <= 0.) discard;
  gl_FragColor = vec4(vec3(1., .953, .69) * (.6 + .4 * rays), a);
}`;

// ---- shock dome (inside wall, additive): unit hemisphere, BackSide so only the far wall draws (the seal, nearer, occludes it).
// band = exp(-(y/.45)^2): bright at the ground rim.  streak = .5 + .5 sin(36 az + 9 y).  v = band (.55 + .45 streak) (1 - uK^2).
// cel: v > .55 white x1.5 | > .28 #fff3b0 | > .1 #fff3b0 x .45 | else discard.
export const DOME_VERT = /* glsl */`
varying vec3 vP;
void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
export const DOME_FRAG = /* glsl */`
uniform float uK;
varying vec3 vP;
void main(){
  float band = exp(-pow(vP.y / .45, 2.));
  float az = atan(vP.z, vP.x);
  float v = band * (.55 + .45 * (.5 + .5 * sin(az * 36. + vP.y * 9.))) * (1. - uK * uK);
  vec3 col = vec3(1., .953, .69);
  if (v > .55) col = vec3(1.5);
  else if (v > .28) col *= 1.;
  else if (v > .1) col *= .45;
  else discard;
  gl_FragColor = vec4(col, 1.);
}`;

// ---- ground shock ring (additive, flat decal): r = |2(uv - .5)| (1 at the quad edge); d = |r - uR|.
// d < uW white x1.4 | (r < uR and d < 1.8 uW) #fff3b0 x .6 inner trail.  alpha = uA.
export const RING_FRAG = /* glsl */`
uniform float uR, uW, uA;
varying vec2 vUv;
void main(){
  float r = length((vUv - .5) * 2.);
  float d = abs(r - uR);
  vec3 col = vec3(0.);
  if (d < uW) col = vec3(1.4);
  else if (r < uR && d < uW * 1.8) col = vec3(1., .953, .69) * .6;
  else discard;
  gl_FragColor = vec4(col, uA);
}`;

// ---- debris chunk (instanced): lit = step(.12, n.sun); col = lit ? vC : vC * uShadow (a coloured shadow).  Ink hull pass.
export const CHUNK_VERT = /* glsl */`
attribute vec3 aCol;
uniform float uHull, uHullW;
varying vec3 vN; varying vec3 vC;
void main(){
  vec4 wp = vec4(position, 1.); vec3 n = normal; vec3 ctr = vec3(0.);
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp; n = mat3(instanceMatrix) * n; ctr = instanceMatrix[3].xyz;
  #endif
  vN = normalize(n); vC = aCol;
  wp.xyz += normalize(wp.xyz - ctr + vec3(1e-5)) * uHull * uHullW;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const CHUNK_FRAG = /* glsl */`
uniform vec3 uSun, uShadow, uHullCol; uniform float uHull;
varying vec3 vN; varying vec3 vC;
void main(){
  if (uHull > .5) { gl_FragColor = vec4(uHullCol, 1.); return; }
  float lit = step(.12, dot(normalize(vN), uSun));
  gl_FragColor = vec4(mix(vC * uShadow, vC, lit), 1.);
}`;

// ---- rising points (embers, gold motes), animated in the vertex shader from the stepped clock uTime ---------------------
// position holds a unit-box fraction f in [0,1]^3.  y = mod(f.y H + uTime rise (.6 + .8 seed), H) (wraps), sway = .6 sin(1.3 t + 20 seed).
// world = centre - (W/2, 0, D/2) + (f.x W + sway, y, f.z D).  vFade = 1 - y / H.
// size_px = size_m (H_px / 2 P11) / -z_view, twinkled on the clock.
export const RISE_VERT = /* glsl */`
attribute float aSeed, aSize;
uniform float uH, uTime, uShow, uRise; uniform vec3 uCenter, uBox;
varying float vFade; varying float vSeed;
void main(){
  float y = mod(position.y * uBox.y + uTime * uRise * (.6 + .8 * aSeed), uBox.y);
  float sway = .6 * sin(1.3 * uTime + 20. * aSeed);
  vec3 wp = uCenter - vec3(uBox.x * .5, 0., uBox.z * .5) + vec3(position.x * uBox.x + sway, y, position.z * uBox.z);
  vFade = 1. - y / uBox.y; vSeed = aSeed;
  vec4 mv = viewMatrix * vec4(wp, 1.);
  float tw = .55 + .45 * abs(sin(uTime * 2.1 + aSeed * 6.283));
  gl_PointSize = max(0., aSize * tw * uShow * vFade * (uH * .5 * projectionMatrix[1][1]) / max(-mv.z, .05));
  gl_Position = projectionMatrix * mv;
}`;
export const RISE_FRAG = /* glsl */`
uniform vec3 uCol, uCore; uniform float uStar;
varying float vFade; varying float vSeed;
void main(){
  vec2 p = (gl_PointCoord - .5) * 2.;
  float s;
  if (uStar > .5) s = max(max(0., 1. - abs(p.x)) * exp(-abs(p.y) * 14.), max(0., 1. - abs(p.y)) * exp(-abs(p.x) * 14.));
  else s = 1. - max(abs(p.x), abs(p.y)) * 1.0 + (1. - length(p)) * .5;
  if (s < .1) discard;
  gl_FragColor = vec4(s > .5 ? uCore * 1.4 : uCol * 1.15, 1.);
}`;

// ---- camera-facing ribbon (OFA arcs, dash streaks) ------------------------------------------------------------------------------------------
// each point has the next point aNext; view-space tangent tg = normalize(V aNext - V p); offset = normalize(tg x z) * side * uWidth.
export const RIB_VERT = /* glsl */`
attribute vec3 aNext; attribute float aSide, aU;
uniform float uWidth;
varying float vSide, vU;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vec4 mn = modelViewMatrix * vec4(aNext, 1.);
  vec3 tg = normalize(mn.xyz - mv.xyz + vec3(1e-6));
  vec3 off = normalize(cross(tg, vec3(0., 0., 1.)) + vec3(1e-6)) * aSide * uWidth;
  mv.xyz += off;
  vSide = aSide; vU = aU;
  gl_Position = projectionMatrix * mv;
}`;
// core = 1 - |side|; a = smoothstep(0, .5, core) (1 - uTaper vU); the central third is the hot core (x uCoreK).
export const RIB_FRAG = /* glsl */`
uniform vec3 uCol, uCore; uniform float uA, uTaper;
varying float vSide, vU;
void main(){
  float core = 1. - abs(vSide);
  float a = smoothstep(0., .5, core) * (1. - uTaper * vU);
  if (a < .1) discard;
  gl_FragColor = vec4(core > .6 ? uCore * 1.5 : uCol * 1.15, uA * a);
}`;

// ---- rain: a streak ribbon whose motion is a closed form of the stepped clock --------------------------------------------------------------------
// position = base fraction in [0,1]^3 (fixed per drop), aEnd 0 head / 1 tail, aSide +-1, aSeed density key.
// world = wrap(base * uBox + (0, uDispY, 0) + uDispXZ) into the box centred on uCenter: q = mod(w - (c - box/2), box).
// uDispY is the integral of the vertical speed (falls, then reverses to an updraft after the sky opens).
// tail = head - uDir * uLen * aEnd.  vA = step(aSeed, uAmt) (density control), fade with distance.
export const RAIN_VERT = /* glsl */`
attribute float aEnd, aSide, aSeed;
uniform vec3 uCenter, uBox, uDir; uniform vec2 uDispXZ; uniform float uDispY, uLen, uWidth, uAmt;
varying float vA;
void main(){
  vec3 lo = uCenter - uBox * .5;
  vec3 w = position * uBox + vec3(uDispXZ.x, uDispY, uDispXZ.y);
  vec3 q = mod(w - lo + uBox * 8., uBox);
  vec3 head = lo + q;
  vec3 pt = head - uDir * uLen * aEnd;
  vec4 mv = viewMatrix * vec4(pt, 1.);
  vec3 tv = normalize((viewMatrix * vec4(uDir, 0.)).xyz);
  mv.xyz += normalize(cross(tv, vec3(0., 0., 1.)) + vec3(1e-6)) * aSide * uWidth;
  vA = step(aSeed, uAmt) * (1. - smoothstep(25., 55., -mv.z)) * (1. - aEnd * .7);
  gl_Position = projectionMatrix * mv;
}`;
export const RAIN_FRAG = /* glsl */`
uniform vec3 uCol;
varying float vA;
void main(){
  if (vA < .05) discard;
  gl_FragColor = vec4(uCol, vA * .55);
}`;

// ---- the comic page: border frame + cracks (overlay, in height units) ----------------------------------------------------------------------------------
// P = (uv.x asp, uv.y); d = distance to the nearest frame edge.  paper margin d < w = .0167 uShow (12 px at 720p) #f4ecd8,
// then the ink rule  w < d < w + .0056 (4 px) #05020a.  Cracks: 6 arms from the fist (uAt) at angles a_i = 1.047 i + .3 + .2 hash_i;
// along = q.dir, perp = q.n - (.03 sin(31 along + 2.1 i) + .015 sin(83 along + i)) (a jagged path); the arm is drawn while
// 0 < along < 1.4 uCrack: ink core |perp| < w_c (taper: w_c = .0035 (1 - along / (1.5 uCrack))), a paper-white torn edge to 2.2 w_c.
// The crack is drawn across the whole picture (it is the page tearing); the border alpha is uShow.
export const BORDER_FRAG = /* glsl */`
uniform float uAsp, uShow, uCrack, uA;
uniform vec2 uAt;
varying vec2 vUv;
${HASH}
void main(){
  vec2 P = vec2(vUv.x * uAsp, vUv.y);
  float d = min(min(P.x, uAsp - P.x), min(P.y, 1. - P.y));
  float w = .0167 * uShow;
  vec3 paper = vec3(.957, .925, .847), ink = vec3(.02, .008, .039);
  vec4 col = vec4(0.);
  if (uShow > 0.01) {
    if (d < w) col = vec4(paper, 1.);
    else if (d < w + .0056 * uShow) col = vec4(ink, 1.);
  }
  if (uCrack > 0.01) {
    vec2 q = P - uAt * vec2(uAsp, 1.);
    for (int k = 0; k < 6; k++) {
      float i = float(k);
      float a = 1.047 * i + .3 + .2 * h11(i + 4.);
      vec2 dir = vec2(cos(a), sin(a));
      float along = dot(q, dir);
      float perp = dot(q, vec2(-dir.y, dir.x)) - (.03 * sin(31. * along + 2.1 * i) + .015 * sin(83. * along + i));
      float L = 1.4 * uCrack;
      if (along > .02 && along < L) {
        float wc = .0035 * (1. - along / (1.5 * uCrack + 1e-3)) + .0008;
        if (abs(perp) < wc) col = vec4(ink, 1.);
        else if (abs(perp) < wc * 2.2 && col.a < .5) col = vec4(paper, 1.);
      }
    }
  }
  if (col.a < .5) discard;
  gl_FragColor = vec4(col.rgb, col.a * uA);
}`;

// ---- paper shards (screen space triangles that fall) -------------------------------------------------------------------------------------------------------
// per shard id s: delay = .35 h(s); local time tt = max(uT - delay, 0), uT = uTA for ids < uSplit else uTB.
// origin o = uAt + rad (cos, sin)(2pi h(s+1)) with rad = .3 + .5 h(s+2) (a ring around the punch, so shards start clear of the seal); size .05 + .08 h (height units); v = ((h-.5) .5, .15 h),
// pos = o + v tt - (0, 1.6 tt^2) (gravity); rot = (h - .5) 8 tt + 6 h; grow = smoothstep(0, .08, tt) (the chunk breaks off).
// The triangle is jittered per vertex.  Fragment: paper #f4ecd8 + Ben-Day dot (cell 6 px, CMY by hash) + ink edge from barycentrics.
export const SHARD_VERT = /* glsl */`
attribute float aId; attribute vec3 aBary;
uniform float uAsp, uTA, uTB, uSplit; uniform vec2 uAt;
varying vec3 vB; varying float vId, vOn;
${HASH}
void main(){
  float s = aId;
  float T = s < uSplit ? uTA : uTB;
  float tt = max(T - .35 * h11(s), 0.);
  vOn = (T > .35 * h11(s) && tt < 1.6) ? 1. : 0.;
  float an = 6.28318 * h11(s + 1.), rad = .3 + .5 * h11(s + 2.);
  vec2 o = uAt + vec2(cos(an) * rad / uAsp, sin(an) * rad);
  vec2 v = vec2((h11(s + 4.) - .5) * .5, .15 * h11(s + 5.));
  vec2 pos = o + v * tt - vec2(0., 1.6 * tt * tt);
  float rot = (h11(s + 6.) - .5) * 8. * tt + 6. * h11(s + 7.);
  float sz = (.05 + .08 * h11(s + 3.)) * smoothstep(0., .08, tt) * vOn;
  vec2 lp = position.xy * (1. + .35 * (h11(s * 3. + aBary.y * 5. + aBary.z * 9.) - .5));
  float c = cos(rot), sn = sin(rot);
  lp = vec2(c * lp.x - sn * lp.y, sn * lp.x + c * lp.y) * sz;
  vec2 ndc = (pos * 2. - 1.) + vec2(lp.x * 2. / uAsp, lp.y * 2.);
  vB = aBary; vId = s;
  gl_Position = vec4(ndc, -1., 1.);
}`;
export const SHARD_FRAG = /* glsl */`
varying vec3 vB; varying float vId, vOn;
${HASH}
void main(){
  if (vOn < .5) discard;
  vec3 paper = vec3(.957, .925, .847);
  vec2 cell = fract(gl_FragCoord.xy / 6.) - .5;
  float h = h11(vId * 7.);
  vec3 dot3 = h < .33 ? vec3(.098, .827, 1.) : (h < .66 ? vec3(.925, .165, .541) : vec3(1., .784, 0.));
  vec3 col = length(cell) < .3 ? mix(paper, dot3, .5) : paper;
  if (min(vB.x, min(vB.y, vB.z)) < .07) col = vec3(.02, .008, .039);
  gl_FragColor = vec4(col, 1.);
}`;

// ---- halftone fade-in (backdrop): cell 6 px, rotated 15 degrees; dot radius = uK .62 (uK 1 -> 0 over the first second).
// Three inks by cell parity (cyan #19d3ff / magenta #ec2a8a / yellow #ffc800), 70% opaque where the dot lands.
export const DOTS_FRAG = /* glsl */`
uniform float uK, uA;
varying vec2 vUv;
void main(){
  float c = .9659, s = .2588;
  vec2 f = gl_FragCoord.xy;
  vec2 r = vec2(c * f.x - s * f.y, s * f.x + c * f.y) / 6.;
  vec2 cell = fract(r) - .5, id = floor(r);
  if (length(cell) > uK * .62) discard;
  float m = mod(id.x + id.y, 3.);
  vec3 col = m < .5 ? vec3(.098, .827, 1.) : (m < 1.5 ? vec3(.925, .165, .541) : vec3(1., .784, 0.));
  gl_FragColor = vec4(col, .7 * uA);
}`;
