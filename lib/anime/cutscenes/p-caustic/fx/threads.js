// Pale chakra threads (ref 01): 56 short + 20 long (14-30 m) bowed ribbons, white core #fbf0f0, halo #ffe8e0 at 25%.
//
// Each ribbon is a quadratic bow  p(u) = u L d + 4 u (1-u) b n   (d the lean toward the moon, n the bow normal),
// expanded in the VERTEX shader along the view-space normal of its tangent:  mv.xy += normalize(-t.y, t.x) side w
// so a thread is a constant-width camera-facing strip.  It drifts up at 2-5 m/s, wrapping every 60 m:
//   y = mod(y0 + v t, 60),  alpha = smoothstep(0, 6, y) (1 - smoothstep(45, 60, y))   (fade in over 6 m, out over 45-60 m)
// Core width .07-.11 m, halo pass 5x wider at 25%.  The threads live behind the seal (z < -25): they cannot cover it.

export function buildThreads(ctx) {
  const { THREE } = ctx;
  const rng = ctx.rng("threads");
  const g = new THREE.Group();
  const NR = 76, SEG = 14;
  const pos = [], nxt = [], side = [], inst = [], wd = [], idx = [];
  let vi = 0;
  for (let r = 0; r < NR; r++) {
    const long = r >= 56, L = long ? 14 + rng() * 16 : 5 + rng() * 8;
    const lean = [(rng() - 0.5) * 0.5, 0.75 + rng() * 0.2, -0.25 - rng() * 0.3];       // toward the moon (up and back)
    const nrm = [lean[1], -lean[0], 0], bow = (rng() - 0.5) * 6;
    const x = (rng() - 0.5) * 150, z = -28 - rng() * 110, y0 = rng() * 60, v = 2 + rng() * 3, w = 0.07 + rng() * 0.04;
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG, b = 4 * u * (1 - u) * bow;
      pts.push([u * L * lean[0] + b * nrm[0], u * L * lean[1] + b * nrm[1], u * L * lean[2]]);
    }
    for (let i = 0; i <= SEG; i++) {
      const p = pts[i], n = pts[Math.min(SEG, i + 1)], pr = pts[Math.max(0, i - 1)];
      const nx = i < SEG ? n : [p[0] + (p[0] - pr[0]), p[1] + (p[1] - pr[1]), p[2] + (p[2] - pr[2])];
      for (const s of [-1, 1]) {
        pos.push(...p); nxt.push(...nx); side.push(s); inst.push(x, y0, z, v); wd.push(w * (0.35 + 0.65 * Math.sin(Math.PI * (i / SEG))));
      }
      if (i) { const a = vi + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    vi += (SEG + 1) * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aNext", new THREE.Float32BufferAttribute(nxt, 3));
  geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geo.setAttribute("aInst", new THREE.Float32BufferAttribute(inst, 4));
  geo.setAttribute("aW", new THREE.Float32BufferAttribute(wd, 1));
  geo.setIndex(idx);

  const mk = (col, widthMul, alpha) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uM: { value: widthMul }, uA: { value: alpha }, uCol: { value: new THREE.Color(col) }, uVis: { value: 0 } },
    vertexShader: `attribute vec3 aNext; attribute float aSide; attribute vec4 aInst; attribute float aW;
      uniform float uT,uM; varying float vA;
      void main(){
        float y = mod(aInst.y + aInst.w*uT, 60.);
        vA = smoothstep(0.,6.,y)*(1.-smoothstep(45.,60.,y));
        vec3 off = vec3(aInst.x, y, aInst.z);
        vec4 a = modelViewMatrix*vec4(position+off,1.);
        vec4 b = modelViewMatrix*vec4(aNext+off,1.);
        vec2 t = normalize((b.xy/ max(.001,-b.z)) - (a.xy/ max(.001,-a.z)) + 1e-6);
        a.xy += vec2(-t.y,t.x)*aSide*aW*uM;
        gl_Position = projectionMatrix*a; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA,uVis; varying float vA;
      void main(){ gl_FragColor=vec4(uCol*vA*uA*uVis, vA*uA*uVis); }`,
  });
  const core = new THREE.Mesh(geo, mk("#fbf0f0", 1, 1.1)), halo = new THREE.Mesh(geo, mk("#ffe8e0", 5, 0.25));
  for (const m of [core, halo]) { m.frustumCulled = false; m.renderOrder = 2; g.add(m); }

  return {
    group: g,
    update(t) {
      // visible the whole pocket; they pass over the lighthouse's place at the reveal (6.6 s) and calm after the credit
      const vis = Math.min(1, t / 0.6);
      for (const m of [core, halo]) { m.material.uniforms.uT.value = t; m.material.uniforms.uVis.value = vis; }
    },
    dispose() { geo.dispose(); core.material.dispose(); halo.material.dispose(); },
  };
}
