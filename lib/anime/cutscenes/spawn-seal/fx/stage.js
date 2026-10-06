// spawn-seal FX / stage: glow-pool-ripple (bible 3.3, FX 1), cave light shafts (shot 2), Veldora's barrier pulse (shot 3).
// Cues read: "plop" (1.0 s), "plop2" (29.3 s), "shafts" (1.0 s), "veldora" (2.79 s), "morph" (4.375 s; drives the base ripples).
import { GLSL_NOISE, mat, VERT_STD, ageOf, clamp01, easeOut } from "./common.js";

export default function stage(ctx) {
  const { THREE } = ctx, group = new THREE.Group(), disposables = [];
  const S = ctx.seal.at;

  // ---- POOL: posterised ring bands + hard caustic polygons, additive on the pool at y = 0.17 -------------------
  // rings (bible 3.3): R_i(a) = 2.4 * easeOut(clamp((a - 4i/24) / (14/24))), echo rings i = 0..2 spaced 4 frames.
  // band level: e = |r - R| / w  ->  e<.35 : 1.0 (#e8ffff), e<.7 : .6 (#7ff8ff), else 0       (3 flat levels, no gradient)
  // caustic: F2-F1 Voronoi on (xz*0.9 + 0.15 t) ; cells whose hash > .78 fill white (the painted water shapes), edges #7ff8ff.
  const pool = mat(THREE, {
    additive: true, vert: VERT_STD,
    uniforms: { uT: { value: 0 }, uA1: { value: -1 }, uA2: { value: -1 }, uMorph: { value: 0 }, uMA: { value: 0 }, uSeal: { value: new THREE.Vector2(S[0], S[2]) } },
    frag: /* glsl */ `${GLSL_NOISE}
      uniform float uT, uA1, uA2, uMorph, uMA; uniform vec2 uSeal; varying vec3 vW;
      float ringSet(float r, float a){ float s=0.;
        for(int i=0;i<3;i++){ float aa=a-float(i)*4./24.; if(aa<=0.) continue; float p=clamp(aa/(14./24.),0.,1.);
          float R=2.4*(1.-pow(1.-p,3.)); float w=.30*(1.-.5*p); float e=abs(r-R)/w;
          float lv = e<.35 ? 1. : (e<.7 ? .6 : 0.); float fade=1.-smoothstep(.6,1.5,aa); s=max(s,lv*fade); }
        return s; }
      void main(){ vec2 xz=vW.xz; float r=length(xz); if(r>5.2) discard;
        vec3 col=vec3(0.); float a=0.;
        // caustics, locked to twos by the stepped uT
        vec2 cp=xz*.9+vec2(.15*uT,.07*uT); vec2 v=vor(cp); float ed=vedge(cp);
        float poly = step(.8,h11(v.y))*.30; float edge = step(ed,.06)*.22;
        col+=vec3(.91,1.,1.)*poly + vec3(.5,.97,1.)*edge; a+=poly+edge;
        // PLOP rings (centre = pool centre)
        float rs=max(ringSet(r,uA1),ringSet(r,uA2));
        vec3 rc = mix(vec3(.5,.97,1.),vec3(.91,1.,1.), step(.99,rs));
        col+=rc*rs; a+=rs*.9;
        // morph base ripples: three rings drifting out of the seal's feet while uMorph>0 (frames 106-155)
        float rb=length(xz-uSeal); float mm=0.;
        for(int i=0;i<3;i++){ float R=fract(uMA*1.6+float(i)/3.)*1.7; float w=.14; float e=abs(rb-R)/w; float lv=e<.4?1.:(e<.8?.55:0.); mm=max(mm,lv*(1.-R/1.7)); }
        col+=vec3(.25,.86,1.)*mm*uMorph; a+=mm*uMorph*.9;
        // hard rim so it never glows past the stones
        a*=1.-step(5.0,r)*.6;
        gl_FragColor=vec4(col,clamp(a,0.,1.)); }`,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64).rotateX(-Math.PI / 2), pool);
  disc.position.y = 0.17; disc.renderOrder = 4; group.add(disc);

  // ---- LIGHT SHAFTS (shot 2): crossed ribbons from the cave mouth, #7ff8ff at 0.12 alpha, 3 hard bands ------------
  // alpha(v) = 0.12 * post(v, 3) * fade(t);  v runs 0 at the pool end to 1 at the mouth. Additive, no depth write.
  const shaftMat = mat(THREE, {
    additive: true, side: THREE.DoubleSide, vert: VERT_STD, uniforms: { uF: { value: 0 }, uT: { value: 0 } },
    frag: /* glsl */ `${GLSL_NOISE} uniform float uF,uT; varying vec2 vUv;
      void main(){ float edge=step(.12,vUv.x)*step(vUv.x,.88); float b=post(vUv.y,3.)*.6+.4*step(.5,fract(vUv.x*3.+floor(uT*12.)*.07));
        float a=.12*edge*b*uF; if(a<=.004) discard; gl_FragColor=vec4(.5,.97,1.,a); }`,
  });
  const rg = ctx.rng(11), shafts = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const top = new THREE.Vector3(-3 + i * 1.2, 11, -13), bot = new THREE.Vector3(-2.5 + rg() * 5, 0.2, -2 + rg() * 4);
    const len = top.distanceTo(bot), g = new THREE.PlaneGeometry(0.9 + rg() * 0.8, len);
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(g, shaftMat); m.position.copy(top).add(bot).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
      m.rotateY(k * Math.PI / 2); m.renderOrder = 3; shafts.add(m);
    }
  }
  group.add(shafts);
  try { ctx.engine.sun = new THREE.Vector3(0, 11, -13); } catch { /* engine.sun optional */ }

  // ---- VELDORA barrier pulse (shot 3, 67-106 f): rim shell r 1.8*1.04 at (3.1, 2.4, -1.5), gold #ffd25a -------------
  // fresnel f = (1 - |n.v|); band = f>.78 ? 1 : f>.55 ? .45 : 0  (two flat levels); pulse = .5+.5 sin(2pi * 1.6 a); fades by 106 f.
  const vMat = mat(THREE, {
    additive: true, vert: VERT_STD, uniforms: { uF: { value: 0 }, uP: { value: 0 } },
    frag: /* glsl */ `uniform float uF,uP; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 v=normalize(cameraPosition-vW); float f=1.-abs(dot(normalize(vN),v));
        float b= f>.78?1.:(f>.55?.45:0.); float a=b*uF*(.55+.45*uP); if(a<=.01) discard; gl_FragColor=vec4(1.,.82,.35,a); }`,
  });
  const vShell = new THREE.Mesh(new THREE.SphereGeometry(1.87, 28, 20), vMat); vShell.position.set(3.1, 2.4, -1.5); vShell.renderOrder = 6; group.add(vShell);

  disposables.push(pool, shaftMat, vMat, disc.geometry, vShell.geometry);
  return {
    group,
    update(t, dt, cue) {
      pool.uniforms.uT.value = t;
      pool.uniforms.uA1.value = ageOf(cue, t, "plop", 1.0);
      pool.uniforms.uA2.value = ageOf(cue, t, "plop2", 703 / 24);
      const ma = ageOf(cue, t, "morph", 106 / 24);
      pool.uniforms.uMorph.value = clamp01(ma / 0.2) * (1 - clamp01((ma - 2.3) / 0.5)); // on for frames 106-~200, then settles
      pool.uniforms.uMA.value = Math.max(0, ma);
      const sa = ageOf(cue, t, "shafts", 1.0);
      shaftMat.uniforms.uF.value = clamp01(sa / 0.5) * (1 - clamp01((sa - 3.2) / 0.8)); shaftMat.uniforms.uT.value = t;
      const va = ageOf(cue, t, "veldora", 67 / 24);
      vMat.uniforms.uF.value = va < 0 ? 0 : clamp01(va / 0.15) * (1 - clamp01((va - 1.3) / 0.3));
      vMat.uniforms.uP.value = 0.5 + 0.5 * Math.sin(Math.PI * 2 * 1.6 * Math.max(0, va));
      vShell.scale.setScalar(1 + 0.04 * easeOut(va / 0.4));
    },
    dispose() { disposables.forEach((d) => d.dispose && d.dispose()); },
  };
}
