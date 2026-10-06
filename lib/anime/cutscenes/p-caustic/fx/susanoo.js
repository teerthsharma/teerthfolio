// The Perfect Susanoo (PROTECTED look: it burns BLUE). Madara state: two swords, two flame-wing columns, tengu face,
// 9-spike crest, pleated hakama (11 ribs), 4x3 lamellar right pauldron. No fill shading; one additive pass.
//
// Shader maths (single pass, replaces the old two-pass overdraw):
//   fr   = (1 - |N.V|)^1.6                                  fresnel rim
//   fire = vn(x', y*.5 - 1.6 t) * vn(x'', y*.95 - 2.1 t)    blue fire scrolling up at 1.6 u/s
//   seam = grid lines of constant pixel width (gl1) in group space (SDF-line art, no fract() aliasing)
//   col  = (dim*(.55+.9 fire) + mix(deep,hot,fire)*fr*1.35) * (1 - .7 seam)    body + rim, seams multiply value down 70%
//        + edge * seam * (.8+.6 fr)                                           pale-cyan line-art
//        all * (1 + 1.2 flare) * rise                                         flare at 3.45 s and 6.42 s
// Palette (protected): dim #121f57, deep #1f4dff, hot #59bfff, edge #ccebff, blade #8cccff, eyes #ff2a3a.
import { NOISE } from "./glsl.js";
import { sstep, glowCard } from "./util.js";

export const SUS_S = 2.5;
export const SUS_AT = [0.9, 0, -17];

const VERT = /* glsl */ `
varying vec3 vS; varying vec3 vN; varying vec3 vV; varying float vWy;
uniform float uTw;
void main(){
  vec3 p = position;
  #if PART==3
    float h = clamp(p.y/15.,0.,1.);
    p.x += sin(p.y*.4 + uTw*3.1 + p.x*.5)*.35*h*h;            // wing flutter 0.35 m at 3.1 rad/s
    p.z += sin(p.y*.3 + uTw*2.1)*.18*h;
  #endif
  #if PART==1
    vec3 rad = normalize(vec3(p.x,0.,p.z)+1e-4);
    p += rad*.15*sin(uTw*2.3 + atan(p.x,p.z)*3.)*(1.-clamp(p.y/5.2,0.,1.)); // skirt flutter at 2.3 rad/s
  #endif
  vS = p;
  vec4 w = modelMatrix*vec4(p,1.);
  vWy = w.y;
  vN = normalize(mat3(modelMatrix)*normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
${NOISE}
varying vec3 vS; varying vec3 vN; varying vec3 vV; varying float vWy;
uniform float uT, uRise, uFlare;
void main(){
  if(vWy < 0.) discard;                                       // the ground clips the rise
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV);
  float fr = pow(1. - clamp(abs(dot(N,V)),0.,1.), 1.6);
  float fire = vn(vec2(vS.x*.55+vS.z*.3, vS.y*.5 - uT*1.6)) * vn(vec2(vS.x*1.2-3., vS.y*.95 - uT*2.1 + vS.z*.4));
  fire = clamp(fire*2.2, 0., 1.);
  float seam = 0., win = 0.;
  #if PART==0
    seam = max(gl1(vS.y*.75), gl1((vS.x+vS.z)*.7));
  #elif PART==1
    seam = max(gl1(atan(vS.x,vS.z)*11./6.28318), step(vS.y,.35)*.9);   // 11 vertical fold ribs + hem band
  #elif PART==2
    seam = max(gl1((vS.x-3.6)*1.1), gl1(vS.y*3.));                      // 4x3 lamellar grid
  #elif PART==3
    float row = floor(vS.y*.9);
    seam = max(gl1(vS.y*.9), gl1(vS.x*1.1 + mod(row,2.)*.5));           // feather tiles, staggered rows (ref 04)
    float fy = fract(vS.y*.45), fx = fract(vS.x*.55+.25);
    win = step(.3,fy)*step(fy,.7)*step(.25,fx)*step(fx,.75);            // window rectangles (ref 03)
  #elif PART==5
    seam = gl1(atan(vS.x,vS.z)*4./6.28318);
  #endif
  vec3 dim=vec3(.07,.12,.34), deep=vec3(.12,.30,1.), hot=vec3(.35,.75,1.), edge=vec3(.8,.92,1.);
  vec3 col;
  #if PART==4
    col = mix(vec3(.55,.8,1.), vec3(.9,.97,1.), 1.-fr)*1.15;          // blade core white-blue
  #else
    col = (dim*(.55+.9*fire) + mix(deep,hot,fire)*fr*1.35) * (1. - .7*seam);
    col += edge*seam*(.8+.6*fr);
    col *= 1. - .55*win;
  #endif
  col *= (1. + 1.2*uFlare) * clamp(uRise,0.,1.);
  col *= .55 + .45*smoothstep(0., 2.5, vWy);                          // fire thins to the ground
  gl_FragColor = vec4(col, 1.);
}`;

export function buildSusanoo(ctx) {
  const { THREE } = ctx;
  const g = new THREE.Group();
  const uni = { uT: { value: 0 }, uTw: { value: 0 }, uRise: { value: 0 }, uFlare: { value: 0 } };
  const mats = {};
  const mat = (part) => (mats[part] ||= new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, defines: { PART: part },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }));
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  ctx.engine.renderer.localClippingEnabled = true; // line-art is clipped by the ground like the body (shader discard)
  const lineMat = new THREE.LineBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [plane] });
  const haloMat = new THREE.LineBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [plane] });

  // add(geo, part, opts): bake the transform into the geometry so object space == Susanoo space.
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V3 = new THREE.Vector3(), SC = new THREE.Vector3();
  function add(geo, part, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], lines = true, ang = 32 } = {}) {
    E.set(r[0], r[1], r[2]);
    M4.compose(V3.set(p[0], p[1], p[2]), Q.setFromEuler(E), SC.set(s[0], s[1], s[2]));
    geo.applyMatrix4(M4);
    const m = new THREE.Mesh(geo, mat(part));
    m.frustumCulled = false; m.renderOrder = 5;
    g.add(m);
    if (lines) {
      const eg = new THREE.EdgesGeometry(geo, ang);
      const l = new THREE.LineSegments(eg, lineMat); l.frustumCulled = false; l.renderOrder = 6; g.add(l);
      const h = new THREE.LineSegments(eg, haloMat); h.frustumCulled = false; h.renderOrder = 4; g.add(h);
    }
    return m;
  }
  const UP = new THREE.Vector3(0, 1, 0);
  // a limb between two points
  function bone(a, b, r0, r1, part = 0) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const geo = new THREE.CylinderGeometry(r1, r0, len, 12, 1, false);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize()));
    add(geo, part, { p: mid.toArray(), r: [e.x, e.y, e.z] });
  }

  // ---- body (facing +z; crest to hem 12.8 u, x SUS_S = 32 m) ----
  add(new THREE.LatheGeometry([[4.9, 0], [4.6, 1.2], [3.9, 3], [3.1, 4.6], [2.9, 5.3]].map(([x, y]) => new THREE.Vector2(x, y)), 44), 1, { lines: false });
  add(new THREE.LatheGeometry([[4.92, 0.02], [4.92, 0.05]].map(([x, y]) => new THREE.Vector2(x, y)), 44), 0, { ang: 5 }); // hem outline
  add(new THREE.CylinderGeometry(2.7, 2.2, 4.6, 24), 0, { p: [0, 7.5, 0], s: [1.25, 1, 0.8] });                         // torso
  add(new THREE.SphereGeometry(1.7, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 2, { p: [3.6, 9.5, 0], s: [1.6, 0.9, 1.3] }); // right pauldron (lamellar 4x3)
  add(new THREE.SphereGeometry(1.7, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, { p: [-3.6, 9.5, 0], s: [1.6, 0.9, 1.3] });
  add(new THREE.SphereGeometry(1.55, 20, 14), 5, { p: [0, 11.1, 0.1], s: [1, 1.12, 1] });                                 // helm
  add(new THREE.ConeGeometry(0.34, 1.4, 8), 5, { p: [0, 10.55, 1.75], r: [Math.PI / 2, 0, 0] });                         // tengu nose
  for (let i = 0; i < 9; i++) {                                                                                           // 9-spike crest (ref 03)
    const th = ((i - 4) / 4) * 1.15, hgt = 3.2 - Math.abs(i - 4) * 0.28;
    add(new THREE.ConeGeometry(0.34, hgt, 6), 5, { p: [Math.sin(th) * 1.25, 12.2 + Math.cos(th) * 0.55 + hgt * 0.35, -0.25], r: [-0.18, 0, -th], lines: false });
  }
  // arms: right holds the sword vertical, left low and angled (ref 03; easter egg 4)
  bone([3.9, 9.3, 0.2], [4.8, 6.7, 1.9], 0.8, 0.65); bone([4.8, 6.7, 1.9], [4.6, 7.7, 3.4], 0.65, 0.55);
  bone([-3.9, 9.3, 0.2], [-4.7, 6.4, 1.6], 0.8, 0.65); bone([-4.7, 6.4, 1.6], [-4.4, 5.2, 3.2], 0.65, 0.55);
  add(new THREE.SphereGeometry(0.78, 12, 8), 0, { p: [4.6, 7.7, 3.4] });
  add(new THREE.SphereGeometry(0.78, 12, 8), 0, { p: [-4.4, 5.2, 3.2] });

  // blade: tapered kite (width .76 to a point). Right sword tip y = 18.1 u = 45 m / SUS_S (1.4 x body height).
  function blade(len, from, dir) {
    const s = new THREE.Shape();
    s.moveTo(-0.38, 0); s.lineTo(0.38, 0); s.lineTo(0.3, len * 0.92); s.lineTo(0, len); s.lineTo(-0.3, len * 0.92); s.closePath();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize()));
    add(new THREE.ShapeGeometry(s), 4, { p: from, r: [e.x, e.y, e.z], ang: 1 });
    add(new THREE.BoxGeometry(1.7, 0.22, 0.5), 0, { p: from, r: [e.x, e.y, e.z] }); // tsuba
  }
  blade(10.4, [4.6, 7.7, 3.4], [0, 1, 0]);        // right: vertical
  blade(9, [-4.4, 5.2, 3.2], [-0.9, -0.3, 0.3]);  // left: low, angled; tip stays behind the seal's plane

  // red slit eyes (#ff2a3a)
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2a3a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.16), eyeM);
    e.position.set(sx * 0.58, 11.15, 1.5); e.rotation.set(0, sx * 0.35, -sx * 0.32); e.renderOrder = 7; g.add(e);
  }

  // flame-wing columns: stair-step teeth (ref 04); feather tiles + window rectangles are in the shader
  const wingShape = () => {
    const pts = [[0, 1], [0, 15]];
    for (let i = 0; i < 8; i++) { const yT = 15 - i * 1.75, x = 0.5 + i * 0.3; pts.push([x, yT], [x, yT - 1.75]); }
    pts.push([2.6, 1]);
    const s = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return s;
  };
  for (const sx of [-1, 1]) {
    const shape = wingShape();
    const geo = new THREE.ShapeGeometry(shape);
    geo.scale(sx, 1, 1); // mirror the left wing
    const place = new THREE.Matrix4().compose(new THREE.Vector3(sx * 4.3, 0, -2.0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, -sx * 0.14)), new THREE.Vector3(1, 1, 1));
    const lg = new THREE.BufferGeometry().setFromPoints(shape.getPoints().map((p) => new THREE.Vector3(p.x * sx, p.y, 0)));
    lg.applyMatrix4(place);
    add(geo, 3, { p: [sx * 4.3, 0, -2.0], r: [-0.1, 0, -sx * 0.14], lines: false });
    const loop = new THREE.LineLoop(lg, lineMat); loop.frustumCulled = false; loop.renderOrder = 6; g.add(loop);
  }

  // outer halo (30 px at 25% analogue) and the 15% blue ground wrap (#2a5be0)
  const halo = glowCard(THREE, { size: 62, col: "#4aa8ff", a: 0.22, pow: 2.2 });
  halo.position.set(0, 9, -3); halo.renderOrder = 2; g.add(halo);
  const wrap = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader: "varying vec2 vQ; void main(){vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "varying vec2 vQ; uniform float uA; void main(){float a=pow(1.-length(vQ),1.6)*uA; gl_FragColor=vec4(vec3(.165,.357,.878)*a,a);}",
  }));
  wrap.rotation.x = -Math.PI / 2; wrap.scale.setScalar(9); wrap.position.y = 0.06; wrap.renderOrder = 3; g.add(wrap);

  // ground cracks that glow ember while the giant rises (1.7-3.0 s), jagged random walks from the base outward
  const rng = ctx.rng("sus-crack");
  const segs = [];
  for (let i = 0; i < 22; i++) {
    let a = (i / 22) * Math.PI * 2 + (rng() - 0.5) * 0.2, r = 3.2 + rng() * 2;
    for (let j = 0; j < 9; j++) {
      const na = a + (rng() - 0.5) * 0.6, nr = r + 1.2 + rng() * 1.6;
      segs.push(Math.cos(a) * r, 0.05, Math.sin(a) * r, Math.cos(na) * nr, 0.05, Math.sin(na) * nr);
      a = na; r = nr;
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
  const crackM = new THREE.LineBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const cracks = new THREE.LineSegments(cg, crackM); cracks.frustumCulled = false; cracks.renderOrder = 3; g.add(cracks);

  g.scale.setScalar(SUS_S);
  g.position.set(SUS_AT[0], SUS_AT[1], SUS_AT[2]);
  g.visible = false;

  return {
    group: g,
    update(t, dt, cue, win) {
      const rk = win(cue, "susanoo", 1.7, 1.1).k;         // 1.7-2.8 s smoothstep rise from under the ground
      const r = sstep(0, 1, rk), vis = Math.min(1, rk * 2.2);
      g.visible = rk > 0;
      uni.uT.value = t;
      uni.uTw.value = Math.floor(cue.t * 8) / 8;           // wing and skirt flutter on threes
      uni.uRise.value = vis;
      const f1 = win(cue, "flareCast", 3.45, 0.45), f2 = win(cue, "flareHit", 6.42, 0.45);
      uni.uFlare.value = (f1.on ? 1 - f1.k : 0) + (f2.on ? 1 - f2.k : 0);
      const sh = win(cue, "hit", 6.42, 0.17);               // shake 0.25 m at 90 Hz for 0.17 s, on twos
      const hs = sh.on ? (1 - sh.k) * 0.25 * Math.sin(t * 90 * 6.2832) : 0;
      g.scale.setScalar(SUS_S * (1 + 0.008 * Math.sin(t * 1.9)));   // breathing 0.8 %
      g.position.set(SUS_AT[0] + hs, SUS_AT[1] - 14 * SUS_S * (1 - r), SUS_AT[2]);
      lineMat.opacity = 0.9 * vis; haloMat.opacity = 0.4 * vis;
      eyeM.opacity = vis * (0.85 + 0.15 * Math.sin(t * 9));
      halo.material.uniforms.uA.value = 0.22 * r * (1 + 0.5 * uni.uFlare.value);
      wrap.material.uniforms.uA.value = 0.15 * r;
      const ck = win(cue, "susanoo", 1.7, 1.5).k, fade = 1 - sstep(0.8, 1, win(cue, "susanoo", 1.7, 3.2).k);
      crackM.opacity = Math.sin(Math.min(1, ck * 1.3) * Math.PI * 0.5) * fade;
      cracks.visible = rk > 0 && fade > 0;
      cracks.position.y = 14 * (1 - r); wrap.position.y = 0.06 + 14 * (1 - r); // both stay on the ground while the group rises
    },
  };
}
