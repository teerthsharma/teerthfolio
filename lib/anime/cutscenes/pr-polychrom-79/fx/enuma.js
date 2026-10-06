// EA + ENUMA ELISH (shots 6 and 7, 14.0 to 23.0 s): the three spinning red segments, the red spiral wind, space cracking.
// TOOLKIT: engine/anime:shockwave-dome + aura-flame (local adapters). The impact frame (2 frames, gold/black then red mono) is the scene.js `impact` beat at 21.17.
//
// Spiral wind (a scrolled cone along the blade axis, +z seal-local, from the blade tip):
//   radius factor f(z) = mix(f0, 1, z^.7);  ang = atan(y, x);  stripe phase s = ang/2pi * 3 + z*twist - spin(t)
//   3-tone cel: band = floor(fract(s)*3) -> deep #8a0c1e / red #ff4a5a / gold #ffe27a (hard steps, fwidth-free by construction)
//   hard rim = step(.8, 1 - |N.V|) in gold; grain = hash(ang, z, ts) * .25 on the stepped clock; ends fade smoothstep.
//   windup t in [15, 21.17]: R .35 -> .9, K .15 -> .5. Blast at 21.17: R -> 6 m over 48 frames (2 s) easeOut, K = 1, gone by 23.8.
// Segments: 3 short glow sleeves on the blade, turns(t) = 3 tau + 9 tau^2 / (2 T) (3 -> 12 turns/s over T = 6.77 s), then 12 turns/s.
// Space crack: BackSide dome r 110. 3D voronoi on dir*5.5, edge = F2 - F1, crack = 1 - smoothstep(0,.045,edge); grows from the +z axis as a
// polar-angle front, cells flash gold or red by hash; the seal stands inside the dome so nothing here can cover it.
import { GLSL_NOISE, smooth } from "./common.js";

const EA_BASE = [0.32, 0.78, 0.55], TIP_DIST = 1.45, PITCH = 0.12; // blade axis points +z, pitched up

export default function enuma(ctx, S) {
  const { THREE, U, flares } = S;
  const group = new THREE.Group();
  const axis = new THREE.Group();
  axis.position.set(...EA_BASE); axis.rotation.x = -PITCH;
  group.add(axis);
  const tipLocal = new THREE.Vector3(0, 0, TIP_DIST).applyEuler(axis.rotation).add(new THREE.Vector3(...EA_BASE));
  const tip = tipLocal.toArray();

  // --- tip glow, charge and the blast flashes (flares)
  flares.add({ c: tip, size: 0.9, t0: 15.0, t1: 21.2, kind: 1, col: "#ff2a3a", fi: 4.0, fo: 0.05, flick: 0.15 });
  flares.add({ c: tip, size: 6.0, t0: 21.17, t1: 21.5, kind: 0, col: "#ffe27a", fi: 0.02, fo: 0.25 });
  flares.add({ c: tip, size: 9.0, t0: 21.17, t1: 22.5, kind: 1, col: "#d3122e", fi: 0.04, fo: 1.0 });
  flares.add({ c: tip, size: 3.5, t0: 21.17, t1: 22.0, kind: 2, col: "#ffe27a", fi: 0.04, fo: 0.8 });

  // --- three segment sleeves
  const sleeveGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24, 1, true);
  sleeveGeo.rotateX(Math.PI / 2); // axis -> z
  const sleeveMats = [];
  const sleeves = [0.95, 1.35, 1.75].map((z, i) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { uTurns: { value: 0 }, uA: { value: 0 }, uDir: { value: i % 2 ? -1 : 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vA; void main(){ vA=vec2(atan(position.y,position.x), position.z); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uTurns, uA, uDir; varying vec2 vA;
        void main(){
          float s = fract(vA.x/6.28318*3. + uTurns*uDir);
          float lug = smoothstep(.0,.04,s)*(1.-smoothstep(.3,.34,s));            // three red lugs spinning
          vec3 col = mix(vec3(.82,.07,.18)*.35, mix(vec3(.82,.07,.18), vec3(1.,.165,.227), lug), .35+.65*lug);
          col += vec3(1.,.886,.478)*smoothstep(.97,1.,abs(vA.y)/.15)*.5;       // gold seam at the sleeve ends
          gl_FragColor = vec4(col*uA, 1.);
        }`,
    });
    sleeveMats.push(m);
    const mesh = new THREE.Mesh(sleeveGeo, m); mesh.position.set(0, 0, z - 0.55); mesh.renderOrder = 4;
    axis.add(mesh); return mesh;
  });

  // --- spiral wind (outer red + inner gold)
  const cone = new THREE.CylinderGeometry(1, 1, 1, 72, 8, true);
  cone.rotateX(Math.PI / 2); cone.translate(0, 0, 0.5); // axis z in [0,1]
  const mkWind = (inner) => new THREE.ShaderMaterial({
    uniforms: { uTs: U.uTs, uK: { value: 0 }, uSpin: { value: 0 }, uF0: { value: inner ? 0.2 : 0.3 }, uInner: { value: inner ? 1 : 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uF0; varying vec2 vA; varying vec3 vN; varying vec3 vV;
      void main(){
        float z = position.z; float f = mix(uF0, 1., pow(z,.7));
        vec3 p = vec3(position.xy*f, z);
        vA = vec2(atan(position.y,position.x), z);
        vN = normalize(normalMatrix*vec3(position.xy,0.));
        vec4 mv = modelViewMatrix*vec4(p,1.); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTs, uK, uSpin, uInner; varying vec2 vA; varying vec3 vN; varying vec3 vV;
      ${GLSL_NOISE}
      void main(){
        float s = vA.x/6.28318*3. + vA.y*(3.+uInner*2.) - uSpin;
        float band = floor(fract(s)*3.);
        vec3 deep = vec3(.541,.047,.118), red = vec3(1.,.29,.353), gold = vec3(1.,.886,.478);
        vec3 col = band<.5 ? deep : (band<1.5 ? red : gold);
        if(uInner>.5) col = band<.5 ? red : (band<1.5 ? gold : vec3(1.,.949,.753));
        float rim = step(.8, 1.-abs(dot(normalize(vN), normalize(vV))));
        col = mix(col, gold, rim*.8);
        float grain = h21(vec2(vA.x*40., vA.y*60.+uTs*17.));
        col *= .8+.35*grain;
        float ends = smoothstep(0.,.06,vA.y)*(1.-smoothstep(.75,1.,vA.y));
        float a = uK*ends*(band<.5 ? .45 : 1.);
        gl_FragColor = vec4(col*a*.85, 1.);
      }`,
  });
  const windMats = [mkWind(false), mkWind(true)];
  const winds = windMats.map((m) => { const w = new THREE.Mesh(cone, m); w.position.copy(tipLocal); w.rotation.x = -PITCH; w.renderOrder = 3; w.frustumCulled = false; group.add(w); return w; });

  // --- space crack dome
  const dg = new THREE.SphereGeometry(110, 48, 24);
  const dm = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uFront: { value: 0 }, uA: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uFront, uA; varying vec3 vD;
      ${GLSL_NOISE}
      void main(){
        vec3 dir = normalize(vD);
        vec3 q = dir*5.5; vec3 ip = floor(q), fp = fract(q);
        float f1 = 9., f2 = 9.; vec3 cid = vec3(0.);
        for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) for(int k=-1;k<=1;k++){
          vec3 o = vec3(float(i),float(j),float(k));
          vec3 c = h33(ip+o);
          float d = length(o+c-fp);
          if(d<f1){ f2=f1; f1=d; cid=ip+o; } else if(d<f2){ f2=d; }
        }
        float edge = f2-f1;
        float crack = 1.-smoothstep(0.,.045,edge);
        float ang = acos(clamp(dir.z,-1.,1.));
        float mask = smoothstep(uFront, uFront-.18, ang);
        float hc = h21(cid.xy+cid.z*7.);
        float flash = step(.72, fract(hc*13.+uT*1.7));
        vec3 gold = vec3(1.,.886,.478), red = vec3(.827,.07,.18);
        vec3 col = crack*mix(gold, vec3(1.,.95,.75), .5)*2.0 + (hc<.5?red:gold)*flash*.35 + red*.12;
        gl_FragColor = vec4(col*mask*uA, 1.);
      }`,
  });
  const dome = new THREE.Mesh(dg, dm); dome.renderOrder = 1; dome.frustumCulled = false; group.add(dome);

  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  return {
    group,
    update(t, dt, cue) {
      const T = cue.t;
      // sleeves: spin 3 -> 12 turns/s
      const tau = Math.max(0, T - 14.4), Tw = 6.77;
      const turns = tau < Tw ? 3 * tau + (9 * tau * tau) / (2 * Tw) : 3 * Tw + 4.5 * Tw + 12 * (tau - Tw);
      const aS = smooth(14.3, 14.8, T) * (1 - smooth(23.0, 23.5, T));
      sleeveMats.forEach((m) => { m.uniforms.uTurns.value = turns; m.uniforms.uA.value = aS * 1.1; });
      sleeves.forEach((s) => { s.visible = aS > 0.002; });
      // spiral wind
      const s = smooth(15.0, 21.17, T), b = ease((T - 21.17) / 2.0);
      const out = 1 - smooth(23.0, 23.8, T);
      const K = T < 15 ? 0 : (T < 21.17 ? 0.15 + 0.35 * s : 1) * out;
      const R = T < 21.17 ? 0.35 + 0.55 * s : 0.9 + 5.1 * b;
      const spin = 1.5 * T + 5 * s * s * 4;
      winds.forEach((w, i) => {
        const k = i ? 0.45 : 1;
        w.scale.set(R * k, R * k, 22 * (T < 21.17 ? 0.6 + 0.4 * s : 1));
        windMats[i].uniforms.uK.value = K * (i ? 0.85 : 1);
        windMats[i].uniforms.uSpin.value = i ? -spin * 1.3 : spin;
        w.visible = K > 0.002;
      });
      // crack dome
      const front = 3.14 * 0.95 * ease((T - 21.17) / 1.0);
      dm.uniforms.uFront.value = front;
      dm.uniforms.uA.value = smooth(21.17, 21.22, T) * (1 - smooth(23.0, 23.9, T));
      dome.visible = dm.uniforms.uA.value > 0.002;
    },
    dispose() { sleeveGeo.dispose(); sleeveMats.forEach((m) => m.dispose()); cone.dispose(); windMats.forEach((m) => m.dispose()); dg.dispose(); dm.dispose(); },
  };
}
