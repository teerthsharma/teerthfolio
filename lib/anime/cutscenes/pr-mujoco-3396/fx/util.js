// pr-mujoco-3396 FX helpers (reusable: promote ribbon + win + pxScale to a shared module).
// Cue timing: every effect reads a window through win(): if the direction layer fired the named beat,
// its own dur drives k; otherwise the bible's absolute seconds do. Scrub-safe (pure function of t / cue).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

/** @returns {{k:number,on:boolean,since:number}} k in 0..1 across the window */
export function win(cue, t, name, a, b) {
  const s = cue && cue.since ? cue.since(name) : Infinity;
  if (Number.isFinite(s)) { const k = clamp(cue.k(name)); return { k, on: k > 0 && k < 1 || cue.on(name), since: s }; }
  const k = clamp((t - a) / (b - a));
  return { k, on: t >= a && t <= b, since: t >= a ? t - a : Infinity };
}

export const GLSL_HASH = /* glsl */ `
float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
vec2  h22(vec2 p){ return vec2(h21(p), h21(p+vec2(19.7,7.3))); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
`;

/** point-size scale: pixels per metre at distance 1 (set from the camera each draw). */
export function pxScale(THREE, obj, u) {
  const v = new THREE.Vector2();
  obj.onBeforeRender = (r, s, cam) => { r.getDrawingBufferSize(v); u.uPx.value = cam.projectionMatrix.elements[5] * v.y * 0.5; };
}

/**
 * Crossed-plane ribbon: a polyline thickened on two perpendicular planes so it reads from any side.
 * set(pts[Vector3-like {x,y,z}], widthOf(u), alphaOf(u)). Vertex: p +- side * w/2.
 * Fragment modes: "add" (energy: core/mid/glow falloff on |v|) or "solid" (flat colour, dark edge).
 */
export function makeRibbon(THREE, maxPts, mode, uniforms, opts = {}) {
  const V = maxPts * 4;
  const pos = new Float32Array(V * 3), aV = new Float32Array(V), aP = new Float32Array(V), aA = new Float32Array(V);
  for (let i = 0; i < maxPts; i++) for (let j = 0; j < 4; j++) { aV[i * 4 + j] = j % 2 ? 1 : -1; aP[i * 4 + j] = i / (maxPts - 1); aA[i * 4 + j] = 1; }
  const idx = [];
  for (let i = 0; i < maxPts - 1; i++) for (const o of [0, 2]) {
    const a = i * 4 + o, b = a + 1, c = (i + 1) * 4 + o, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aV", new THREE.BufferAttribute(aV, 1));
  g.setAttribute("aP", new THREE.BufferAttribute(aP, 1));
  g.setAttribute("aA", new THREE.BufferAttribute(aA, 1).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(idx); g.setDrawRange(0, 0);
  const U = { uT: { value: 0 }, uI: { value: 1 }, uLen: { value: 60 }, uSpark: { value: 0 },
    uCore: { value: new THREE.Color("#fff0c8") }, uMid: { value: new THREE.Color("#c99a4a") }, uGlow: { value: new THREE.Color("#7fe0a0") },
    uA: { value: new THREE.Color("#e96a5a") }, uB: { value: new THREE.Color("#b8492f") }, ...uniforms };
  const solid = mode === "solid";
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: solid ? THREE.NormalBlending : THREE.AdditiveBlending, depthTest: opts.depthTest !== false,
    vertexShader: /* glsl */ `attribute float aV; attribute float aP; attribute float aA; varying float vV; varying float vP; varying float vA;
      void main(){ vV=aV; vP=aP; vA=aA; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `${GLSL_HASH}
      uniform float uT,uI,uLen,uSpark; uniform vec3 uCore,uMid,uGlow,uA,uB; varying float vV; varying float vP; varying float vA;
      void main(){ float a=abs(vV);
        ${solid ? `
        vec3 c = mix(uA,uB,smoothstep(.55,.9,a)); float al = (1.-smoothstep(.88,1.,a))*vA;
        gl_FragColor = vec4(c, al);` : `
        // energy falloff: core = hard 2px line, mid = leaf-gold shoulder, glow = soft outer halo (maths: 3 smoothsteps on |v|)
        vec3 c = uCore*smoothstep(.22,0.,a)*1.6 + uMid*smoothstep(.62,0.,a)*.8 + uGlow*pow(1.-a,2.)*.32;
        // gold-leaf dither: 4px cell hash, 25% modulation, re-rolled on twos
        float dz = mix(1., .72+.28*step(.5, h21(vec2(floor(vP*uLen*2.), floor(uT*12.)))), uSpark);
        gl_FragColor = vec4(c*vA*uI*dz, 1.);`}
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  const dir = new THREE.Vector3(), s1 = new THREE.Vector3(), s2 = new THREE.Vector3(), ref = new THREE.Vector3();
  function set(pts, widthOf = () => 0.2, alphaOf = () => 1) {
    const n = Math.min(pts.length, maxPts);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      dir.set(b.x - a.x, b.y - a.y, b.z - a.z); if (dir.lengthSq() < 1e-9) dir.set(0, 1, 0); dir.normalize();
      if (Math.abs(dir.y) > 0.9) ref.set(1, 0, 0); else ref.set(0, 1, 0);
      s1.crossVectors(dir, ref).normalize(); s2.crossVectors(dir, s1);
      const u = i / Math.max(1, n - 1), w = widthOf(u) * 0.5, q = pts[i], al = alphaOf(u);
      const o = i * 4;
      for (let j = 0; j < 4; j++) {
        const s = j < 2 ? s1 : s2, sg = j % 2 ? 1 : -1, k = (o + j) * 3;
        pos[k] = q.x + s.x * w * sg; pos[k + 1] = q.y + s.y * w * sg; pos[k + 2] = q.z + s.z * w * sg;
        aA[o + j] = al;
      }
    }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true;
    g.setDrawRange(0, Math.max(0, n - 1) * 12); U.uLen.value = n;
  }
  return { mesh, set, U, hide() { g.setDrawRange(0, 0); }, dispose() { g.dispose(); mat.dispose(); } };
}
