// Particles for the Malevolent Shrine: ink flakes (red 1 in 5), red orbs, sparks, glass, dust, debris.
// One instanced billboard system. All motion is closed-form in the stepped clock, so a scrubbed frame equals a played one:
//   age = uT - birth;  lf = age/life;  P = P0 + V age + 1/2 G age^2   (seal-local frame; G is local gravity)
// The billboard is built in VIEW space after the model-view transform: mv.xy += R(spin) corner * size.
//   flake  rotating square, spin held on twos: angle = spin * floor(age*12)/12  (fall 2 s)
//   streak stretched along the projected velocity v_view = M_mv (V + G age): corner.x along it, corner.y across (x0.25)
//   orb    soft glow  exp(-3 r^2), pulsing
//   shard  right triangle (glass)       puff  noise-edged smoke blob that grows 1 + 1.5 lf
// Every fragment is multiplied by sealMask: nothing ever lands on the seal.
import { GLSL_NOISE, GLSL_SEAL } from "./common.js";

const SHAPE = { flake: 0, streak: 1, orb: 2, shard: 3, puff: 4 };

export function particleSet(ctx, track, frame, items, o) {
  const { THREE } = ctx, n = items.length;
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute("position", base.getAttribute("position")); g.setAttribute("uv", base.getAttribute("uv"));
  const aP = new Float32Array(n * 3), aV = new Float32Array(n * 3), aT = new Float32Array(n * 4), aC = new Float32Array(n * 4);
  const col = new THREE.Color();
  items.forEach((p, i) => {
    aP.set(p.p, i * 3); aV.set(p.v, i * 3); aT.set([p.birth, p.life, p.size, p.spin || 0], i * 4);
    col.set(p.col); aC.set([col.r, col.g, col.b, p.a ?? 1], i * 4);
  });
  g.setAttribute("aP", new THREE.InstancedBufferAttribute(aP, 3));
  g.setAttribute("aV", new THREE.InstancedBufferAttribute(aV, 3));
  g.setAttribute("aT", new THREE.InstancedBufferAttribute(aT, 4));
  g.setAttribute("aC", new THREE.InstancedBufferAttribute(aC, 4));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { ...track.u, uT: { value: 0 }, uSc: { value: 1 }, uG: { value: new THREE.Vector3(0, o.gravity ?? 0, 0) }, uShape: { value: SHAPE[o.shape] } },
    vertexShader: /* glsl */ `
      attribute vec3 aP, aV; attribute vec4 aT, aC; uniform float uT, uSc, uShape; uniform vec3 uG;
      varying vec2 vUv; varying vec4 vC; varying vec2 vN; varying float vLf;
      void main(){
        float age=uT-aT.x; float lf=age/aT.y;
        if(age<0. || lf>1.){ gl_Position=vec4(2.,2.,2.,1.); return; }
        vec3 P=aP+aV*age+.5*uG*age*age;
        vec4 mv=modelViewMatrix*vec4(P,1.);
        vec2 cr=position.xy; float sz=aT.z*uSc; vec2 off;
        if(uShape<.5){ sz*=1.-.2*lf; float an=aT.w*floor(age*12.)/12.; float c=cos(an),s=sin(an); off=vec2(c*cr.x-s*cr.y,s*cr.x+c*cr.y)*sz; }
        else if(uShape<1.5){ sz*=1.-lf; vec3 vv=mat3(modelViewMatrix)*(aV+uG*age); vec2 d=normalize(vv.xy+vec2(1e-4)); vec2 pp=vec2(-d.y,d.x);
          off=d*cr.x*sz*(2.+clamp(length(vv.xy)*.12,0.,4.))+pp*cr.y*sz*.25; }
        else if(uShape<2.5){ sz*=.8+.2*sin(age*7.+aT.w*13.); off=cr*sz*2.; }
        else if(uShape<3.5){ float an=aT.w*floor(age*12.)/12.; float c=cos(an),s=sin(an); off=vec2(c*cr.x-s*cr.y,s*cr.x+c*cr.y)*sz; }
        else { sz*=1.+1.5*lf; off=cr*sz; }
        mv.xy+=off;
        gl_Position=projectionMatrix*mv; vN=gl_Position.xy/gl_Position.w;
        vUv=position.xy; vC=aC; vLf=lf;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE} ${GLSL_SEAL}
      uniform float uShape; varying vec2 vUv; varying vec4 vC; varying vec2 vN; varying float vLf;
      void main(){
        float a=1.; vec3 col=vC.rgb; float r=length(vUv*2.);
        if(uShape<.5){ a=step(max(abs(vUv.x),abs(vUv.y)),.5)*(.65+.35*step(.0,vUv.x+vUv.y*.3)); col*=.8+.2*step(0.,vUv.x); }
        else if(uShape<1.5){ float ax=abs(vUv.x*2.), ay=abs(vUv.y*2.); a=pow(max(1.-ay,0.),1.6)*(1.-.55*ax); col=mix(col,vec3(1.,.96,.88),pow(max(1.-ay,0.),4.)); }
        else if(uShape<2.5){ a=exp(-r*r*3.)+.25*smoothstep(1.,.6,r); }
        else if(uShape<3.5){ vec2 q=vUv+.5; a=step(q.y,1.-q.x)*step(.0,q.x)*step(.0,q.y); col=mix(col,vec3(.96,.98,1.),step(.82,q.x+q.y)); }
        else { a=smoothstep(1.,.2,r+(vn(vUv*4.+vLf)-.5)*.7)*(.55+.45*fbm(vUv*3.)); }
        float f=smoothstep(0.,.08,vLf)*(1.-smoothstep(.65,1.,vLf));
        gl_FragColor=vec4(col, a*vC.a*f*sealMask(vN));
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 1002;
  track.attach(mesh); frame.add(mesh);
  return { mesh, update(t, sc) { mat.uniforms.uT.value = t; mat.uniforms.uSc.value = sc; }, dispose() { g.dispose(); mat.dispose(); base.dispose(); } };
}

// the full emission plan for the cutscene (seeded, so identical on every run)
export function buildParticles(ctx, TL, track, strokes) {
  const { THREE } = ctx, r = ctx.rng("fxp"), U = (a, b) => a + (b - a) * r(), pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const frame = new THREE.Group(); frame.name = "fx-frame";
  const flakes = [], orbs = [], sparks = [], glass = [], dust = [], debris = [];
  const dir = (up = 0.4) => { const a = r() * Math.PI * 2, y = U(-0.2, 1) * up + 0.2, s = Math.sqrt(Math.max(0, 1 - y * y)); return [Math.cos(a) * s, y, Math.sin(a) * s]; };
  const flake = (p, v, birth, life = 2) => flakes.push({ p, v, birth, life, size: U(0.09, 0.26), spin: U(-7, 7), col: r() < 0.2 ? "#b3081c" : "#0e0b0d", a: 0.95 });

  // 1. draw-in wipe from the pup, 0.1-2.0 s: flakes lift off the seal's ring
  for (let i = 0; i < 60; i++) { const a = r() * 6.283, R = U(1.2, 5); flake([Math.cos(a) * R, U(0.2, 2.6), Math.sin(a) * R], [Math.cos(a) * U(0.4, 1.4), U(0.3, 1.2), Math.sin(a) * U(0.4, 1.4)], U(0.1, 2.0), U(1.4, 2.2)); }
  // 2. red orbs, 2.4-8 s, rising round the shrine side of the island
  for (let i = 0; i < 44; i++) { const a = r() * 6.283, R = U(6, 22); orbs.push({ p: [Math.cos(a) * R, U(0.5, 12), Math.sin(a) * R + 8], v: [U(-0.2, 0.2), U(0.5, 1.2), U(-0.2, 0.2)], birth: TL.bleed + 0.4 + r() * 2.6, life: U(3.5, 5.5), size: U(0.35, 1.1), spin: r() * 6, col: pick(["#e5142e", "#b3081c", "#ff3a3a"]), a: 0.85 }); }
  // 3. barrage: every stroke and the heavy hit throw sparks, glass, dust, debris from a point on the crossing
  const hits = strokes.map((s) => ({ t: s.t, heavy: s.heavy, cleave: false }));
  hits[hits.length - 1].cleave = true;
  hits.push({ t: TL.heavy, heavy: true, cleave: false });
  const spots = [];
  for (const h of hits) {
    const c = [U(-16, 16), U(1, 11), U(12, 40)]; h.at = c; spots.push(h);
    const k = h.cleave ? 5 : h.heavy ? 2.5 : 1;
    for (let i = 0; i < Math.round(9 * k); i++) { const d = dir(1), sp = U(7, 18) * (h.heavy ? 1.3 : 1); sparks.push({ p: c, v: d.map((x) => x * sp), birth: h.t + U(0, 0.05), life: U(0.4, 0.9), size: U(0.25, 0.5), col: r() < 0.5 ? "#ff9a2a" : "#f4efe2", a: 1 }); }
    for (let i = 0; i < Math.round(3 * k); i++) { const d = dir(1), sp = U(3, 9); glass.push({ p: c, v: d.map((x) => x * sp), birth: h.t + U(0, 0.08), life: U(1.1, 1.8), size: U(0.22, 0.5), spin: U(-9, 9), col: "#9fb0c0", a: 0.95 }); }
    for (let i = 0; i < Math.round(2 * k); i++) dust.push({ p: [c[0] + U(-1, 1), c[1] - 0.5, c[2] + U(-1, 1)], v: [U(-1.2, 1.2), U(0.4, 1.6), U(-1.2, 1.2)], birth: h.t + U(0, 0.15), life: U(1.4, 2.2), size: U(1.4, 3.4), col: pick(["#3a1a22", "#1f1018", "#5a0a14"]), a: 0.4 });
    for (let i = 0; i < Math.round(2 * k); i++) { const d = dir(1), sp = U(2, 8); debris.push({ p: c, v: d.map((x) => x * sp), birth: h.t + U(0, 0.06), life: U(1.2, 1.9), size: U(0.35, 0.9), spin: U(-5, 5), col: pick(["#20323c", "#0e0b0d", "#1a3a3a"]), a: 1 }); }
    // ink flakes shaken loose by the hit
    for (let i = 0; i < Math.round(8 * k); i++) { const d = dir(1); flake([...c], d.map((x) => x * U(1.5, 6)), h.t + U(0, 0.2), U(1.4, 2)); }
  }
  // 4. the shrine dissolves into ink flakes (13.75-18) and the closing flakes fall over the crossing
  for (let i = 0; i < 170; i++) flake([U(-18, 18), U(0, 34), U(10, 34)], [U(-1.2, 1.2), U(0.4, 2.4), U(-1.2, 1.2)], TL.dissolve + r() * (TL.flex - TL.dissolve - 0.2), U(1.6, 2.4));
  const total = (a) => a.length;

  const sets = [
    particleSet(ctx, track, frame, flakes, { shape: "flake", gravity: -1.6, order: 1002 }),
    particleSet(ctx, track, frame, dust, { shape: "puff", gravity: 0.4, order: 1001 }),
    particleSet(ctx, track, frame, debris, { shape: "flake", gravity: -9, order: 1003 }),
    particleSet(ctx, track, frame, glass, { shape: "shard", gravity: -7, order: 1004 }),
    particleSet(ctx, track, frame, orbs, { shape: "orb", additive: true, gravity: 0, order: 1005 }),
    particleSet(ctx, track, frame, sparks, { shape: "streak", additive: true, gravity: -6, order: 1006 }),
  ];
  return {
    frame, hits: spots, counts: { flakes: total(flakes), orbs: total(orbs), sparks: total(sparks), glass: total(glass), dust: total(dust), debris: total(debris) },
    update(t) {
      const s = ctx.seal, k = s.scale || 1;
      frame.position.set(s.at[0], s.at[1], s.at[2]); frame.rotation.y = s.yaw || 0; frame.scale.setScalar(k);
      for (const p of sets) p.update(t, k);
    },
    dispose() { for (const p of sets) p.dispose(); },
  };
}
