// WEAPON TRAILS + IMPACT SPARKS: the barrage. Each projectile leaves a portal and flies to a ground point on the rim.
// TOOLKIT: engine/anime:speed-lines (streak variant) + lightning-fork variants.
//
// Trail maths (screen-space ribbon, all pure in uT):
//   tau   = uT - tFire ; launch on ONES: tq = tau < 3/24 ? floor(tau*24)/24 : tau (first 3 frames stepped at 24 fps)
//   u     = clamp(tq/dur) ; head = A + d*len*u ; tail = A + d*max(0, len*u - Ltail), Ltail shrinks to 0 over 0.12 s after impact
//   ribbon: clip = mix(clipTail, clipHead, along); offset = perp(screen dir) * width * side * clip.w   (taper 0.35 -> 1 toward the head)
//   colour: steel #e8f0ff at the head fading to gold #ffe27a at the tail; the Gae Bolg is red #ff2a3a / #c82040.
// Sparks: Points, p = P + v tau + 0.5 g tau^2 with g = -4.5 (local y up), 0.55 s life, gold to white.
// Star glint (flare) at every emergence and every impact. Easter egg 3: Gae Bolg red barbed spear flies at 5.0 s. Egg 6 laugh is scene.sfx.
import { instGeo } from "./common.js";

export default function volley(ctx, S) {
  const { THREE, U, flares } = S;
  const r = ctx.rng("gate-volley");
  const near = S.portals.filter((p) => p.near);
  const items = []; // {A,B,t0,dur,len,kind,wid}
  const mk = (t0, dur, kind) => {
    const src = near.filter((p) => p.open + 0.5 < t0 && p.close > t0 + dur + 0.2);
    const p = (src.length ? src : near)[Math.floor(r() * (src.length ? src.length : near.length))];
    const a = r() * Math.PI * 2, rad = 4 + r() * 5.5;
    const B = new THREE.Vector3(Math.sin(a) * rad, 0.2 + r() * 0.8, Math.cos(a) * rad);
    const A = p.pos.clone().add(B.clone().sub(p.pos).normalize().multiplyScalar(p.R * 0.4));
    items.push({ A, B, t0, dur, len: kind ? 9 : 4 + r() * 4, kind, wid: kind ? 0.017 : 0.008 + r() * 0.006 });
  };
  for (let i = 0; i < 18; i++) mk(3.0 + i * 0.26 + r() * 0.1, 0.5 + r() * 0.2, 0);       // shot 3: a few loose weapons in motion
  mk(5.0, 0.7, 1);                                                                       // egg 3: Gae Bolg, red
  for (let i = 0; i < 96; i++) mk(8.3 + Math.pow(i / 96, 0.9) * 4.9 + r() * 0.1, 0.28 + r() * 0.12, 0); // shot 5: the volley
  const n = items.length;
  const A = new Float32Array(n * 3), B = new Float32Array(n * 3), T = new Float32Array(n * 3), K = new Float32Array(n * 3);
  items.forEach((it, i) => {
    A.set(it.A.toArray(), i * 3); B.set(it.B.toArray(), i * 3);
    T.set([it.t0, it.dur, it.len], i * 3); K.set([it.kind, r(), it.wid], i * 3);
    flares.add({ c: it.A.toArray(), size: it.kind ? 2 : 1.4, t0: it.t0, t1: it.t0 + 0.3, kind: 0, col: it.kind ? "#ff4a5a" : "#ffffff", fi: 0.02, fo: 0.2 });
    flares.add({ c: it.B.toArray(), size: it.kind ? 1.8 : 1.1, t0: it.t0 + it.dur, t1: it.t0 + it.dur + 0.3, kind: 0, col: it.kind ? "#ff2a3a" : "#ffe27a", fi: 0.02, fo: 0.22 });
  });
  const base = new THREE.PlaneGeometry(2, 2);
  const geo = instGeo(THREE, base, n, { aA: [3, A], aB: [3, B], aT: [3, T], aK: [3, K] });
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uAspect: U.uAspect },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aA; attribute vec3 aB; attribute vec3 aT; attribute vec3 aK;
      uniform float uT; uniform float uAspect; varying vec2 vUV; varying float vKind;
      void main(){
        float tau = uT-aT.x, dur = aT.y;
        float tq = tau<.125 ? floor(tau*24.)/24. : tau;
        float u = clamp(tq/dur,0.,1.);
        float vis = (tau>0. && tau<dur+.12) ? 1. : 0.;
        vec3 d = normalize(aB-aA); float len = length(aB-aA);
        float Lt = aT.z*(1.-clamp((tau-dur)/.12,0.,1.));
        vec3 head = aA+d*len*u, tail = aA+d*max(0.,len*u-Lt);
        mat4 VP = projectionMatrix*viewMatrix*modelMatrix;
        vec4 ca = VP*vec4(tail,1.), cb = VP*vec4(head,1.);
        float along = position.x*.5+.5;
        vec4 c = mix(ca,cb,along);
        vec2 da = ca.xy/ca.w, db = cb.xy/cb.w;
        vec2 dir = (db-da)*vec2(uAspect,1.);
        dir = length(dir)<1e-5 ? vec2(1.,0.) : normalize(dir);
        vec2 nrm = vec2(-dir.y,dir.x)/vec2(uAspect,1.);
        float w = aK.z*(.35+.65*along);
        c.xy += nrm*position.y*w*c.w;
        vUV = vec2(along,position.y); vKind = aK.x;
        bool ok = vis>.5 && ca.w>.1 && cb.w>.1;
        gl_Position = ok ? c : vec4(2.,2.,2.,1.);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUV; varying float vKind;
      void main(){
        float a = vUV.x, s = vUV.y;
        float body = exp(-s*s*2.2);
        float core = exp(-s*s*14.);
        vec3 gold = vec3(1.,.886,.478), steel = vec3(.91,.94,1.);
        vec3 col = mix(gold, steel, smoothstep(.45,.95,a));
        if(vKind>.5) col = mix(vec3(.78,.125,.25), vec3(1.,.165,.227), smoothstep(.3,.9,a));
        float I = pow(a,1.5)*body + core*pow(a,3.)*.8;
        col += vec3(1.)*core*smoothstep(.93,1.,a)*.6;
        gl_FragColor = vec4(col*I, 1.);
      }`,
  });
  const ribbons = new THREE.Mesh(geo, mat); ribbons.frustumCulled = false; ribbons.renderOrder = 4;

  // sparks
  const PER = 7, M = n * PER;
  const sP = new Float32Array(M * 3), sV = new Float32Array(M * 3), sT = new Float32Array(M * 2);
  items.forEach((it, i) => {
    for (let k = 0; k < PER; k++) {
      const j = i * PER + k, sp = 2 + r() * 5, th = r() * Math.PI * 2, up = 0.4 + r() * 0.9;
      sP.set(it.B.toArray(), j * 3);
      sV.set([Math.cos(th) * sp, up * sp * 0.8, Math.sin(th) * sp], j * 3);
      sT.set([it.t0 + it.dur, r()], j * 2);
    }
  });
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(sP, 3));
  pg.setAttribute("aV", new THREE.BufferAttribute(sV, 3));
  pg.setAttribute("aT", new THREE.BufferAttribute(sT, 2));
  const pr = (ctx.engine && ctx.engine.renderer && ctx.engine.renderer.getPixelRatio && ctx.engine.renderer.getPixelRatio()) || 1;
  const pm = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uPx: { value: 5 * pr } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aV; attribute vec2 aT; uniform float uT; uniform float uPx; varying float vK;
      void main(){
        float tau = uT-aT.x, life = .55; float k = tau/life; vK = k;
        vec3 p = position + aV*tau + vec3(0.,-4.5,0.)*.5*tau*tau;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = uPx*(1.-k)*clamp(8./max(-mv.z,.1),.5,2.);
        gl_Position = (tau>0. && k<1.) ? projectionMatrix*mv : vec4(2.,2.,2.,1.);
      }`,
    fragmentShader: /* glsl */ `
      varying float vK;
      void main(){
        float d = length(gl_PointCoord-.5); if(d>.5) discard;
        vec3 col = mix(vec3(1.,.95,.75), vec3(1.,.69,.125), vK);
        gl_FragColor = vec4(col*(1.-vK*.6), 1.);
      }`,
  });
  const sparks = new THREE.Points(pg, pm); sparks.frustumCulled = false; sparks.renderOrder = 5;
  const group = new THREE.Group(); group.add(ribbons, sparks);
  return { group, update() {}, dispose() { geo.dispose(); mat.dispose(); pg.dispose(); pm.dispose(); } };
}
