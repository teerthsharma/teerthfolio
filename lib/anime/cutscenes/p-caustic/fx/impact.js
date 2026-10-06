// Impacts: cast flash (3.45 s), M1 landing (4.7 s), M2 slam (6.42 s): flash, shock ring, dust plume, crater + crack web, debris.
// Impact FRAMES (white / inverted / normal) and the camera shake are reserved sakuga beats owned by scene.js; this file
// draws the world-space light and matter only. Flash is warm #fff4e4 at 0.35 or blue-white #cfe6ff at 0.12: never a white-out,
// and every card sits at the impact point behind the seal, depth-tested, so the seal can never be covered.
//
// Maths
//   ring radius  R(k) = Rmax (1 - (1-k)^3),  alpha = (1-k)^1.3 * band,  band = smoothstep(1-w, 1-.2w, r) (1 - smoothstep(1-.1w, 1, r)),  w = 1.4 m / R
//   puff i       P = I + (cos a, 0, sin a)(r0 + 14 e(s)) + (0, .35 size + 2 s, 0),  size = s0 (1 + 3.2 s^.6),  alpha = (1 - s/life)
//   puff shading 2-tone: tone = dot(q, (.3,.9)) > -.15 ? c : .72 c, edge wobble r < .9 - .25 vn(3q + seed)
//   debris       P = P0 + v s + (0, -4.9 s^2, 0), clamped to the ground; spin by Rodrigues about a per-chip axis
//   crack web    18 jagged radial random walks; fragment discards where radius > reveal(t); colour #ff8a2a -> #ffd27a toward the rim
import { NOISE, BILL } from "./glsl.js";
import { glowCard, instanced, clamp01, sstep } from "./util.js";

const I2 = [5, 0, -38];

export function buildImpact(ctx) {
  const { THREE } = ctx;
  const g = new THREE.Group();
  const rng = ctx.rng("impact");
  const disposables = [];

  // ---- flash cards ----
  const mkFlash = (size, col, pos) => { const c = glowCard(THREE, { size, col, a: 0, pow: 1.6 }); c.position.set(...pos); c.renderOrder = 8; g.add(c); return c; };
  const flashCast = mkFlash(170, "#cfe6ff", [0.9, 16, -22]);       // blue-white 12% at the cast, behind the Susanoo
  const flashM1 = mkFlash(46, "#fff4e4", [-13, 6, -44]);            // 0.15 at M1
  const flashM2 = mkFlash(190, "#fff4e4", [I2[0], 9, I2[2] - 2]);   // 0.35 warm at M2

  // ---- puff field (billboards) ----
  function puffField(n, c, spread, size0, speed) {
    const seed = new Float32Array(n * 4), col = new Float32Array(n * 3);
    const c0 = new THREE.Color("#9c8a72"), c1 = new THREE.Color("#bfa98b"), tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      seed.set([rng() * 6.2832, spread * (0.4 + rng() * 0.8), size0 * (0.7 + rng() * 0.6), rng()], i * 4);
      tmp.copy(c0).lerp(c1, rng()); col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const geo = instanced(THREE, new THREE.PlaneGeometry(1, 1), n, { aSeed: [4, seed], aCol: [3, col] });
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uS: { value: -1 }, uC: { value: new THREE.Vector3(...c) }, uSpd: { value: speed }, uLife: { value: 3 } },
      vertexShader: `${BILL} attribute vec4 aSeed; attribute vec3 aCol; uniform float uS,uSpd,uLife; uniform vec3 uC; varying vec2 vQ; varying vec3 vC; varying float vA; varying float vR;
        void main(){ float s=max(uS,0.); float e=1.-pow(1.-clamp(s/.6,0.,1.),2.);
          float size=aSeed.z*(1.+3.2*pow(s,.6));
          vec3 P=uC+vec3(cos(aSeed.x),0.,sin(aSeed.x))*(aSeed.y+uSpd*e*.6+uSpd*.15*s)+vec3(0.,size*.35+s*2.,0.);
          vQ=position.xy*2.; vC=aCol; vR=aSeed.w; vA=(uS<0.)?0.:clamp(1.-s/uLife,0.,1.)*clamp(s*8.,0.,1.);
          gl_Position=projectionMatrix*viewMatrix*vec4(bill(P,position.xy*2.,size),1.); }`,
      fragmentShader: `${NOISE} varying vec2 vQ; varying vec3 vC; varying float vA; varying float vR;
        void main(){ float r=length(vQ); float w=.25*vn(vQ*3.+vR*17.); if(r>.9-w||vA<=0.) discard;
          float tone=dot(vQ,vec2(.3,.9))>-.15?1.:.72;
          gl_FragColor=vec4(vC*tone,.92*vA); }`,
    });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6; g.add(m);
    return { m, mat, geo };
  }
  const pf2 = puffField(24, I2, 14, 6, 14), pf1 = puffField(8, M1_C(), 5, 3, 10);
  function M1_C() { return [-13, 0, -44]; }

  // ---- shock rings (ground) ----
  const ringMat = (col) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 1 }, uW: { value: 0.02 }, uCol: { value: new THREE.Color(col) } },
    vertexShader: "varying vec2 vQ; void main(){vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vQ; uniform float uK,uW; uniform vec3 uCol;
      void main(){ float r=length(vQ); float band=smoothstep(1.-uW,1.-.2*uW,r)*(1.-smoothstep(1.-.1*uW,1.,r));
        float a=band*pow(1.-uK,1.3); gl_FragColor=vec4(uCol*a*1.4,a); }`,
  });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(1, 96), ringMat("#fff4e4"));
  ring.rotation.x = -Math.PI / 2; ring.position.set(I2[0], 0.5, I2[2]); ring.renderOrder = 7; ring.frustumCulled = false; g.add(ring);
  const ring1 = new THREE.Mesh(new THREE.CircleGeometry(1, 64), ringMat("#fff4e4"));
  ring1.rotation.x = -Math.PI / 2; ring1.position.set(-13, 0.5, -44); ring1.renderOrder = 7; ring1.frustumCulled = false; g.add(ring1);

  // ---- crater: dark bowl + ember crack web ----
  const crater = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uR: { value: 0 }, uA: { value: 0 } },
    vertexShader: "varying vec2 vQ; void main(){vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `${NOISE} varying vec2 vQ; uniform float uA; void main(){ float r=length(vQ); if(r>1.) discard;
      float rim=smoothstep(.55,1.,r); vec3 c=mix(vec3(.04,.02,.015),vec3(.35,.14,.05),rim*(.5+.5*vn(vQ*9.)));
      gl_FragColor=vec4(c,uA*(1.-smoothstep(.85,1.,r))*.85);}`,
  }));
  crater.rotation.x = -Math.PI / 2; crater.position.set(I2[0], 0.12, I2[2]); crater.renderOrder = 4; crater.frustumCulled = false; g.add(crater);
  const segs = [], rr = [];
  const MAXR = 34;
  for (let i = 0; i < 18; i++) {
    let a = (i / 18) * Math.PI * 2 + (rng() - 0.5) * 0.25, r = 2;
    for (let j = 0; j < 10; j++) {
      const na = a + (rng() - 0.5) * 0.5, nr = r + 2.2 + rng() * 1.8;
      segs.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(na) * nr, 0, Math.sin(na) * nr); rr.push(r, nr);
      if (rng() < 0.3) { const ba = a + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.5), br = r + 3 + rng() * 3; segs.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(ba) * br, 0, Math.sin(ba) * br); rr.push(r, br); }
      a = na; r = nr;
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3)); cg.setAttribute("aR", new THREE.Float32BufferAttribute(rr, 1));
  const crackMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uR: { value: 0 }, uA: { value: 0 } },
    vertexShader: "attribute float aR; varying float vR; void main(){vR=aR; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying float vR; uniform float uR,uA; void main(){ if(vR>uR) discard;
      gl_FragColor=vec4(mix(vec3(1.,.54,.16),vec3(1.,.82,.48),vR/${MAXR.toFixed(1)})*uA*1.3,1.);}`,
  });
  const web = new THREE.LineSegments(cg, crackMat); web.position.set(I2[0], 0.2, I2[2]); web.renderOrder = 5; web.frustumCulled = false; g.add(web);
  // second, wider web for the 2 px read
  const web2 = new THREE.LineSegments(cg, crackMat); web2.position.set(I2[0] + 0.12, 0.2, I2[2] + 0.12); web2.renderOrder = 5; web2.frustumCulled = false; g.add(web2);

  // ---- debris chips ----
  function debrisField(n, c, speed) {
    const a = new Float32Array(n * 4), b = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const ang = rng() * 6.2832;
      a.set([ang, speed * (0.35 + rng() * 0.9), 6 + rng() * 14, 0.5 + rng() * 1.8], i * 4);   // angle, horizontal speed, vertical speed, size
      b.set([rng() - 0.5, rng() - 0.5, rng() - 0.5, (rng() - 0.5) * 8], i * 4);                 // spin axis, rate
    }
    const geo = instanced(THREE, new THREE.IcosahedronGeometry(1, 0), n, { aA: [4, a], aB: [4, b] });
    const mat = new THREE.ShaderMaterial({
      uniforms: { uS: { value: -1 }, uC: { value: new THREE.Vector3(...c) } },
      vertexShader: `attribute vec4 aA; attribute vec4 aB; uniform float uS; uniform vec3 uC; varying vec3 vN; varying float vE;
        vec3 rot(vec3 v, vec3 ax, float an){ ax=normalize(ax+1e-3); float c=cos(an),s=sin(an); return v*c+cross(ax,v)*s+ax*dot(ax,v)*(1.-c); }
        void main(){ float s=max(uS,0.);
          vec3 v=rot(position*aA.w, aB.xyz, s*aB.w);
          vec3 P=uC+vec3(cos(aA.x)*aA.y*s, aA.z*s-4.9*s*s, sin(aA.x)*aA.y*s); P.y=max(P.y,0.15)+v.y; P.xz+=v.xz;
          vN=normalize(rot(normal,aB.xyz,s*aB.w)); vE=1.-clamp(s/.7,0.,1.);
          gl_Position=(uS<0.)? vec4(2.,2.,2.,1.) : projectionMatrix*viewMatrix*vec4(P,1.); }`,
      fragmentShader: `varying vec3 vN; varying float vE;
        void main(){ float d=dot(normalize(vN),normalize(vec3(.5,.7,.4))); float tone=d>.35?1.:(d>-.1?.62:.32);
          vec3 c=vec3(.165,.129,.102)*tone*1.5; c=mix(c,vec3(1.,.54,.16)*1.3,vE*.8); gl_FragColor=vec4(c,1.); }`,
    });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6; g.add(m);
    return { mat, geo };
  }
  const db2 = debrisField(40, I2, 22), db1 = debrisField(12, [-13, 0, -44], 12);

  const fl = (w, peak) => (w.s >= 0 ? peak * Math.pow(1 - clamp01(w.s / w.dur), 2) : 0);
  return {
    group: g,
    update(t, dt, cue, win) {
      const W = (n, t0, d) => { const w = win(cue, n, t0, d); w.dur = d; return w; };
      flashCast.material.uniforms.uA.value = fl(W("flareCast", 3.45, 0.5), 0.12);
      flashM1.material.uniforms.uA.value = fl(W("land1", 4.7, 0.35), 0.15);
      flashM2.material.uniforms.uA.value = fl(W("flareHit", 6.42, 0.35), 0.35);
      // M1 landing
      const l1 = win(cue, "land1", 4.7, 3);
      pf1.mat.uniforms.uS.value = l1.s; db1.mat.uniforms.uS.value = l1.s;
      const r1 = win(cue, "land1", 4.7, 0.6);
      ring1.visible = r1.s >= 0 && r1.k < 1; ring1.scale.setScalar(Math.max(0.01, 40 * (1 - Math.pow(1 - r1.k, 3))));
      ring1.material.uniforms.uK.value = r1.k; ring1.material.uniforms.uW.value = Math.min(0.5, 1.2 / Math.max(1, ring1.scale.x));
      // M2 slam
      const h = win(cue, "hit", 6.42, 3);
      pf2.mat.uniforms.uS.value = h.s; db2.mat.uniforms.uS.value = h.s;
      const rk = win(cue, "hit", 6.42, 0.9);
      ring.visible = rk.s >= 0 && rk.k < 1;
      ring.scale.setScalar(Math.max(0.01, 130 * (1 - Math.pow(1 - rk.k, 3))));
      ring.material.uniforms.uK.value = rk.k; ring.material.uniforms.uW.value = Math.min(0.5, 1.4 / Math.max(1, ring.scale.x));
      // crater + crack web reveal 6.42-6.6, glow fades after 7.5
      const c = win(cue, "hit", 6.42, 0.18).k, fade = 1 - sstep(0, 1, win(cue, "hit", 7.4, 1.4).k);
      const on = h.s >= 0 ? 1 : 0;
      crater.visible = web.visible = web2.visible = on > 0;
      crater.scale.setScalar(Math.max(0.01, 24 * c)); crater.material.uniforms.uA.value = fade;
      crackMat.uniforms.uR.value = MAXR * c; crackMat.uniforms.uA.value = fade * (0.85 + 0.15 * Math.sin(Math.floor(t * 12) * 3.1));
    },
    dispose() { pf1.geo.dispose(); pf2.geo.dispose(); db1.geo.dispose(); db2.geo.dispose(); cg.dispose(); },
  };
}
