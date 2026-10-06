// spawn-seal FX: shared helpers (layer-local; Consolidate may promote `sparkField`, `billboard`, `ageOf`).
// Everything here is a PURE FUNCTION of the stepped clock `t`, so a scrubbed frame equals a played one.

// GLSL snippets shared by the fx shaders -------------------------------------------------------------------------
export const GLSL_NOISE = /* glsl */ `
float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
vec2  h22(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
// Voronoi: returns (F1 distance, cell id).  Cell centre c = floor(p)+h22(floor(p)+n); F1 = min |p-c|.
// Thresholding F1 (or F2-F1) with a hard step gives the flat, polygonal "painted caustic" shapes of the anime water.
vec2 vor(vec2 p){ vec2 i=floor(p), f=fract(p); float d=9., id=0.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); vec2 o=h22(i+g);
    float r=length(g+o-f); if(r<d){ d=r; id=dot(i+g,vec2(1.,57.)); } } return vec2(d,id); }
// F2-F1 (cell edge distance), for crisp polygon borders
float vedge(vec2 p){ vec2 i=floor(p), f=fract(p); float d1=9., d2=9.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); float r=length(g+h22(i+g)-f);
    if(r<d1){ d2=d1; d1=r; } else if(r<d2){ d2=r; } } return d2-d1; }
// posterise k in [0,1] to n flat levels (cel bands)
float post(float k, float n){ return floor(clamp(k,0.,.9999)*n)/(n-1.); }
`;

// ShaderMaterial factory: transparent, depth-tested, no depth write unless asked. `additive` adds light (glow, beams);
// normal blending paints (outline, void, pearl).
export function mat(THREE, { vert, frag, uniforms = {}, additive = false, side = THREE.FrontSide, depthWrite = false, depthTest = true, order = 0 }) {
  const m = new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, side, depthWrite, depthTest,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  m.userData.order = order; m.fog = false; m.toneMapped = false;
  return m;
}

export const VERT_STD = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*w; }`;

// Camera-facing quad: centre at the object origin, half-size `uSize` metres, billboarded in view space.
export const VERT_BILL = /* glsl */ `
uniform float uSize; varying vec2 vUv; varying vec2 vP;
void main(){ vUv=uv; vP=position.xy; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*uSize;
  gl_Position=projectionMatrix*mv; }`;

// age (seconds since a beat started).  Prefers the cue the direction layer wrote; falls back to the bible's fixed time.
// `t` is the stepped time passed to update(); returns negative before the event.
export function ageOf(cue, t, name, t0) {
  let s = Infinity;
  try { s = cue.since(name); } catch { /* cue name unknown: use fallback */ }
  return Number.isFinite(s) ? s - (cue.t - t) : t - t0;
}
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeOvershoot = (x) => { x = clamp01(x); const c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

// rotate a seal-local offset by the seal's yaw and add its origin
export function sealPoint(seal, THREE, x, y, z, out = new THREE.Vector3()) {
  const c = Math.cos(seal.yaw || 0), s = Math.sin(seal.yaw || 0), k = seal.scale || 1;
  return out.set(seal.at[0] + (x * c + z * s) * k, seal.at[1] + y * k, seal.at[2] + (-x * s + z * c) * k);
}

// ---- spark field: one Points object whose particles live entirely in the vertex shader -----------------------------
// p(age) = origin + v*age + 0.5*g*age^2   (mode 0, ballistic)    or    mix(origin, target, smoothstep(age/life))   (mode 1, inflow)
// shape 0 = hard disc, 1 = 4-point diamond, 2 = bokeh disc with a bright rim.  size is metres; pixel size = size * 0.5*H*P[1][1] / -z  (projection agnostic).
export function sparkField(THREE, { additive = true, depthTest = true, items, target = [0, 0, 0] }) {
  const n = items.length, A = (k) => new Float32Array(n * k);
  const o = A(3), v = A(3), c = A(3), p = A(4); // p = t0, life, size, shape+mode*2+g*0.. (packed below)
  const q = A(2); // q = gravity, mode
  items.forEach((it, i) => {
    o.set(it.o, i * 3); v.set(it.v || [0, 0, 0], i * 3); c.set(it.c, i * 3);
    p.set([it.t0, it.life, it.size, it.shape || 0], i * 4); q.set([it.g ?? 0, it.mode || 0], i * 2);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(o, 3)); g.setAttribute("aV", new THREE.BufferAttribute(v, 3));
  g.setAttribute("aC", new THREE.BufferAttribute(c, 3)); g.setAttribute("aP", new THREE.BufferAttribute(p, 4));
  g.setAttribute("aQ", new THREE.BufferAttribute(q, 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const m = mat(THREE, {
    additive, depthTest, uniforms: { uT: { value: 0 }, uH: { value: 1080 }, uTarget: { value: new THREE.Vector3(...target) }, uAlpha: { value: 1 } },
    vert: /* glsl */ `
      uniform float uT, uH; uniform vec3 uTarget; attribute vec3 aV, aC; attribute vec4 aP; attribute vec2 aQ;
      varying vec3 vC; varying float vA; varying float vS;
      void main(){ float age=uT-aP.x; float k=age/aP.y; vec3 p=position;
        if(aQ.y>.5) p=mix(position,uTarget,k*k*(3.-2.*k)); else p=position+aV*age+vec3(0.,-.5*aQ.x*age*age,0.);
        vec4 mv=viewMatrix*modelMatrix*vec4(p,1.);
        float alive=step(0.,age)*step(age,aP.y);
        gl_Position=projectionMatrix*mv; vC=aC; vS=aP.w;
        vA=alive*(1.-smoothstep(.65,1.,k))*smoothstep(0.,.06,k);        // hard-ish in, fading out
        gl_PointSize=max(aP.z*.5*uH*projectionMatrix[1][1]/max(-mv.z,.1),0.)*alive; }`,
    frag: /* glsl */ `
      uniform float uAlpha; varying vec3 vC; varying float vA; varying float vS;
      void main(){ vec2 q=gl_PointCoord*2.-1.; float d = (vS>.5 && vS<1.5) ? abs(q.x)+abs(q.y) : length(q);   // disc, diamond, or bokeh (shape 2)
        if(d>1.|| vA<=.01) discard;
        float lv = vS>1.5 ? (d>.8 ? 1. : .4) : 1.;                           // bokeh: bright hard ring, dim flat centre
        gl_FragColor=vec4(vC, vA*uAlpha*lv); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false;
  return { pts, set(t, H) { m.uniforms.uT.value = t; m.uniforms.uH.value = H; }, dispose() { g.dispose(); m.dispose(); } };
}

// ---- the Predator maw's eat front (bible 3.14): shared by maw.js (the void shell) and every fx object it consumes -------
// The maw sits MAW_LOCAL (seal-local) behind and above the seal.  Seen from the seal's chest, the eaten region is the cone of
// half-angle theta(a) around the maw direction; theta grows 0 -> pi from frame 653 (maw fully open) to 29.0 s, ease-in-out.
export const MAW_T0 = 643 / 24, MAW_OPEN = 10 / 24, MAW_LOCAL = [0, 5.5, -5.2], MAW_R = 3.2;
export function eatTheta(a) { const u = clamp01((a - MAW_OPEN) / (29.0 - MAW_T0 - MAW_OPEN)); return Math.PI * u * u * (3 - 2 * u); }
// true when world point P is inside the eaten cone (seen from `c`, the seal chest, toward the maw `m`)
export function eaten(P, c, m, theta) {
  if (theta <= 0.001) return false;
  const ax = m.x - c.x, ay = m.y - c.y, az = m.z - c.z, bx = P.x - c.x, by = P.y - c.y, bz = P.z - c.z;
  const d = (ax * bx + ay * by + az * bz) / (Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz) + 1e-6);
  return Math.acos(Math.max(-1, Math.min(1, d))) < theta;
}
