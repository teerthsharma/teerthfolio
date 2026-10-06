// GLSL for the fx layer. Every shader's maths is in comments.

// ---- billboard vertex ----------------------------------------------------------------------------
// Two modes, one program.
//  uSph=0 CYLINDRICAL card: vertical in the world (flames must stand upright), turned about Y to face the camera.
//     rh   = horizontal projection of the camera's right axis
//     away = horizontal projection of the camera's forward axis (pointing AWAY from the lens)
//     P    = uOrigin + rh*p.x + up*p.y + away*uBack      (uBack>0 pushes the card BEHIND the seal)
//  uSph=1 SPHERICAL card: built in view space, P_view = V*origin; P_view.xy += p; P_view.z -= uBack.
//  p = rot(uRot) * (position.xy * uSize) + uOff.
// Cards are always pushed behind the seal (uBack ~ 0.5..0.8 x seal.scale), depth-tested, so nothing covers the seal.
export const BB_VERT = /* glsl */`
uniform vec3 uOrigin; uniform vec2 uSize; uniform vec2 uOff; uniform float uBack; uniform float uSph; uniform float uRot;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec2 p = position.xy * uSize;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + uOff;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 fwd = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vec3 rh = normalize(vec3(right.x, 0., right.z) + vec3(1e-5, 0., 0.));
  vec3 away = normalize(vec3(fwd.x, 0., fwd.z) + vec3(0., 0., 1e-5));
  vec3 wp = uOrigin + rh*p.x + vec3(0., p.y, 0.) + away*uBack;
  vec4 mvS = viewMatrix * vec4(uOrigin, 1.);
  mvS.xy += p; mvS.z -= uBack;
  gl_Position = uSph > .5 ? projectionMatrix * mvS : projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;

// ---- aura flame tongue ----------------------------------------------------------------------------
// uv.x in [0,1] across the card, uv.y in [0,1] base->tip. x = 2*(uv.x-.5).
// Tongue half-width   w(y) = 0.62 * (1-y)^1.15 * (1 + .22 sin(9y + phase + seed))      (tapers to a point, wobbles)
// Centre-line sway    s(y) = .28 y^2 sin(phase + 1.7 seed)                                (leans like a flame)
// r = |x - s| / w. Bands (flat, 3 + core):   r<.38 && y<.72 core | r<.72 mid | r<1 edge | outline at r>0.88.
// Inner swirl cut-out: a crescent (circle A minus offset circle B) at y~.38 recoloured to the edge tone.
// phase = tw * pi/2 where tw cycles 0..3: the 4-drawing cycle on twos.
// Glow: d = |x-s|-w; outside the tongue alpha = .38 * (1 - d/.24)^2 * (1-y)  (the "6 px glow").
export const FLAME_FRAG = /* glsl */`
uniform float uPhase, uSeed, uAlpha; uniform vec3 uC0, uC1, uC2, uOut;
varying vec2 vUv;
void main(){
  float x = (vUv.x - .5) * 2., y = vUv.y;
  float ph = uPhase * 1.5708;
  float w = .62 * pow(max(1. - y, 0.), 1.15) * (1. + .22 * sin(y * 9. + ph + uSeed));
  float sw = .28 * y * y * sin(ph + uSeed * 1.7);
  float dx = x - sw;
  float r = abs(dx) / max(w, 1e-3);
  float d = abs(dx) - w;
  vec3 col; float a;
  if (r <= 1.) {
    col = (r < .38 && y < .72) ? uC0 * 1.45 : (r < .72 ? uC1 : uC2);
    float sg = uSeed > 3.14 ? 1. : -1.;
    vec2 q = vec2(dx / max(w, .06) - .46 * sg, (y - .38) * 3.2);
    float cres = step(length(q), .34) * (1. - step(length(q + vec2(.14 * sg, 0.)), .3));
    col = mix(col, uC2, cres);
    if (r > .88) col = uOut;
    a = 1. - smoothstep(.96, 1., y);
  } else {
    float g = clamp(1. - d / .24, 0., 1.);
    col = uC1; a = .38 * g * g * (1. - y);
  }
  if (a < .01) discard;
  gl_FragColor = vec4(col, a * uAlpha);
}`;

// ---- flare: soft glow + flat 4-point star (additive) ----------------------------------------------
// p in [-1,1]. glow = G * exp(-4.5 r^2) * (1 - smoothstep(.85, 1, r)).
// star arms: sx = (1-|x|) * exp(-22|y|), sy = swapped; s = max(sx,sy). Cel: core step(.5,s) white-hot, outer step(.12,s) gold.
export const FLARE_FRAG = /* glsl */`
uniform vec3 uCol, uCore; uniform float uGlow, uStar, uA;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p);
  float g = uGlow * exp(-r*r*4.5) * (1. - smoothstep(.85, 1., r));
  float sx = max(0., 1. - abs(p.x)) * exp(-abs(p.y) * 22.);
  float sy = max(0., 1. - abs(p.y)) * exp(-abs(p.x) * 22.);
  float s = max(sx, sy);
  vec3 c = uCol * g;
  if (uStar > 0.) { c += uCol * step(.12, s) * uStar * 1.1; c = mix(c, uCore * 1.7, step(.5, s) * clamp(uStar, 0., 1.)); }
  float a = max(g, step(.12, s) * uStar) * uA;
  gl_FragColor = vec4(c * uA, a);
}`;

// ---- ring: a flat cream ring (normal blending) ----------------------------------------------------
// |r - R| < W is the ring; a thin dark outline hugs it: |r - R| < 1.55 W.
export const RING_FRAG = /* glsl */`
uniform vec3 uCol, uOutline; uniform float uR, uW, uA;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p);
  float d = abs(r - uR);
  float body = 1. - step(uW, d);
  float line = (1. - step(uW * 1.55, d)) * (1. - body);
  float a = max(body, line) * uA;
  if (a < .01) discard;
  gl_FragColor = vec4(mix(uOutline, uCol * 1.15, body), a);
}`;

// ---- shock dome rim (world sphere, additive) ------------------------------------------------------
// Only the silhouette rim is lit so the dome never veils the seal: rim = 1 - |n.v|; alpha = smoothstep(.62,.95,rim)
// times a height fade. Interior alpha is exactly 0.
export const DOME_VERT = /* glsl */`
varying vec3 vN; varying vec3 vV; varying float vH;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vH = position.y;
  gl_Position = projectionMatrix * mv;
}`;
export const DOME_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uA;
varying vec3 vN; varying vec3 vV; varying float vH;
void main(){
  float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
  float a = smoothstep(.62, .95, rim) * (1. - .55 * vH) * uA;
  gl_FragColor = vec4(uCol * 1.5 * a, a);
}`;

// ---- ground decal: five-armed fissure star + ink ring --------------------------------------------
// plane XZ, p in [-1,1]. uMode 0 = crack: five arms at angle a_i = i*2pi/5 + .3, each wobbled by sin(28 r + 3 i)*.06,
//   half-width .045 (1-r/reach); core ink #1b1530, gold rim (#ffd84a) .55 wider; spreads to uReach; alpha uA.
// uMode 1 = ink ring: cream band |r-R|<W with a #22163f outline.
export const GROUND_FRAG = /* glsl */`
uniform float uMode, uReach, uA, uR, uW;
varying vec2 vUv;
const float TAU = 6.2831853;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p); float ang = atan(p.y, p.x);
  if (uMode < .5) {
    if (r > uReach) discard;
    float best = 1e3;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float a0 = fi * TAU / 5. + .3 + sin(r * 28. + fi * 3.) * .06;
      float da = abs(mod(ang - a0 + 3.14159, TAU) - 3.14159);
      float d = r * sin(min(da, 1.5));
      float wid = .045 * (1. - r / max(uReach, .01)) + .004;
      best = min(best, d / wid);
    }
    vec3 col;
    if (best < 1.) col = vec3(.106, .082, .188);
    else if (best < 1.55) col = vec3(1., .847, .29) * 1.6;
    else discard;
    gl_FragColor = vec4(col, uA);
  } else {
    float d = abs(r - uR);
    float body = 1. - step(uW, d);
    float line = (1. - step(uW * 1.7, d)) * (1. - body);
    float a = max(body, line) * uA;
    if (a < .01) discard;
    gl_FragColor = vec4(mix(vec3(.133, .086, .247), vec3(.984, .98, .969), body), a);
  }
}`;

// ---- chunks (shards + rocks), hard 2-tone with an outline hull ------------------------------------
// Lit/shadow: lit = step(.12, n.sun); col = mix(base*uShadow, base, lit)  (shadow is a coloured multiplier, never grey).
// Hull pass (uHull=1, BackSide): every vertex pushed out from the instance centre by uHullW metres, flat outline colour.
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

// ---- sparkles: 4-point cel stars as points ----------------------------------------------------------
// size_px = size_m * (H/2 * P11) / -z_view. Twinkle on twos: size *= .45 + .55 |sin(tw*2.1 + seed*2pi)|.
export const SPARK_VERT = /* glsl */`
attribute float aSeed, aSize;
uniform float uH, uTw, uShow;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  float tw = .45 + .55 * abs(sin(uTw * 2.1 + aSeed * 6.283));
  gl_PointSize = max(0., aSize * tw * uShow * (uH * .5 * projectionMatrix[1][1]) / max(-mv.z, .05));
  gl_Position = projectionMatrix * mv;
}`;
export const SPARK_FRAG = /* glsl */`
uniform vec3 uCol, uCore;
void main(){
  vec2 p = (gl_PointCoord - .5) * 2.;
  float sx = max(0., 1. - abs(p.x)) * exp(-abs(p.y) * 14.);
  float sy = max(0., 1. - abs(p.y)) * exp(-abs(p.x) * 14.);
  float s = max(sx, sy);
  if (s < .1) discard;
  gl_FragColor = vec4(s > .5 ? uCore * 1.6 : uCol * 1.2, 1.);
}`;

// ---- sky violet shift: multiply tint, zenith weighted ---------------------------------------------
// w = smoothstep(-.05,.9,dir.y); out = mix(1, tint, .55 * amt * w); blend dst*src (CustomBlending Zero, SrcColor).
// Only sky pixels are hit; nearer geometry (ground, seal) is depth-occluded.
export const SKY_VERT = /* glsl */`
varying float vY;
void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
export const SKY_FRAG = /* glsl */`
uniform float uAmt; uniform vec3 uTint;
varying float vY;
void main(){
  float w = smoothstep(-.05, .9, vY);
  gl_FragColor = vec4(mix(vec3(1.), uTint, .55 * uAmt * w), 1.);
}`;
