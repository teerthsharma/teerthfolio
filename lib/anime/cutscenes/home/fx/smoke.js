// FX 6 + 3.17: SMOKE, IGLOO STEAM, MOTES.
//
// SMOKE: 5 longhouse columns x 6 puffs + 8 steam puffs from the igloo vent. Icosphere puffs, cel 2-tone with a HARD shadow side:
//     ph    = fract(0.09 t + o)                       t stepped (twos); o = i/6 + jitter, so a column is a staggered chain
//     pos   = base + (wind * ph^2, rise * ph, 0)      rise 3.4 m (smoke), 3.2 m (steam); wind 0.9 m toward +x
//     scale = s0 + s1 ph                              the puff swells as it climbs
//     ndl   = dot(N, sun);  tone = ndl > 0.12 ? lit : shade        lit #dcd8e6, shade #a8a4c0  (violet-shifted, never grey)
//     alpha = smoothstep(0, .12, ph) (1 - ph)^.8 * .92
// Smoke luma <= 0.87 so it never blooms.
//
// MOTES: 70 round points #fffaf2 / #ffe9cc, slow drift on twos, in a 16 m box about the jetty, depth-tested.
//     size px = 0.05 m * P[1][1] * H/2 / depth   (perspective-correct world size)
import * as S from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const rng = ctx.rng(31337);

  // ---------- smoke + steam ----------
  const puffs = [];
  S.SMOKE_AT.forEach(([x, y, z], c) => { for (let i = 0; i < 6; i++) puffs.push([x, y, z, 3.4, 0.22, 0.5, i / 6 + 0.04 * rng(), 0.9]); });
  for (let i = 0; i < 8; i++) puffs.push([S.IGLOO.x + 0.35, 8.1, S.IGLOO.z, 3.2, 0.35, 0.8, i / 8 + 0.03 * rng(), 1.0]);
  const NP = puffs.length;
  const aP = new Float32Array(NP * 4), aQ = new Float32Array(NP * 4);
  puffs.forEach((p, i) => { aP.set([p[0], p[1], p[2], p[3]], i * 4); aQ.set([p[4], p[5], p[6], p[7]], i * 4); });
  const sg = new THREE.InstancedBufferGeometry().copy(new THREE.IcosahedronGeometry(1, 1));
  sg.setAttribute("aP", new THREE.InstancedBufferAttribute(aP, 4));
  sg.setAttribute("aQ", new THREE.InstancedBufferAttribute(aQ, 4));
  sg.instanceCount = NP;
  const sunV = new THREE.Vector3(...S.SUN_DIR);
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uSun: { value: sunV } },
    vertexShader: /* glsl */ `
      attribute vec4 aP; attribute vec4 aQ; uniform float uT;
      varying vec3 vN; varying float vA, vSteam;
      void main() {
        float ph = fract(0.09 * uT + aQ.z);
        float sc = aQ.x + aQ.y * ph;
        vec3 w = aP.xyz + vec3(0.9 * ph * ph, aP.w * ph, 0.0) + position * sc;
        vN = normal;
        vA = smoothstep(0.0, 0.12, ph) * pow(1.0 - ph, 0.8) * 0.92;
        vSteam = aQ.w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; varying vec3 vN; varying float vA, vSteam;
      void main() {
        float ndl = dot(normalize(vN), uSun);
        float lit = step(0.12, ndl);
        vec3 cl = vec3(0.863, 0.847, 0.902), cs = vec3(0.659, 0.643, 0.753);   // #dcd8e6 / #a8a4c0
        vec3 col = mix(cs, cl, lit);
        col = mix(col, vec3(0.93, 0.93, 0.96), vSteam * 0.35 * lit);           // steam is a touch whiter on its lit side
        gl_FragColor = vec4(col, vA);
      }`,
  });
  const smoke = new THREE.Mesh(sg, smokeMat);
  smoke.frustumCulled = false; smoke.renderOrder = 12;
  group.add(smoke);

  // ---------- motes ----------
  const NM = 70;
  const mp = new Float32Array(NM * 3), mc = new Float32Array(NM * 4);
  for (let i = 0; i < NM; i++) {
    mp.set([-8 + 16 * rng(), 0.3 + 5 * rng(), -8 + 16 * rng()], i * 3);
    mc.set([rng() * 6.28, 0.3 + 0.5 * rng(), rng(), rng() < 0.5 ? 0 : 1], i * 4);
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  mg.setAttribute("aM", new THREE.BufferAttribute(mc, 4));
  const moteMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uPx: { value: 700 } },
    vertexShader: /* glsl */ `
      attribute vec4 aM; uniform float uT, uPx; varying float vC;
      void main() {
        float tw = floor(uT * 12.0) / 12.0;
        vec3 w = vec3(position.x + sin(aM.x + tw * aM.y) * 0.5, 0.3 + mod(position.y - 0.3 + tw * 0.12 * aM.y, 5.0), position.z + cos(aM.x * 1.7 + tw * aM.y * 0.8) * 0.5);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        vC = aM.w;
        gl_PointSize = clamp(0.05 * uPx / max(-mv.z, 0.3), 1.5, 9.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vC;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        gl_FragColor = vec4(mix(vec3(1.0, 0.980, 0.949), vec3(1.0, 0.914, 0.800), vC), 0.85);   // #fffaf2 / #ffe9cc
      }`,
  });
  const motes = new THREE.Points(mg, moteMat);
  motes.frustumCulled = false; motes.renderOrder = 13;
  group.add(motes);

  const sz = new THREE.Vector2();
  return {
    group,
    update(t) {
      smokeMat.uniforms.uT.value = t; moteMat.uniforms.uT.value = t;
      // perspective-correct mote size: H/2 * P[1][1] (cam fov) -> approximate with the drawing buffer height x 1.7
      const r = ctx.engine.renderer;
      if (r && r.getDrawingBufferSize) { r.getDrawingBufferSize(sz); moteMat.uniforms.uPx.value = sz.y * 1.7; }
    },
    dispose() { sg.dispose(); smokeMat.dispose(); mg.dispose(); moteMat.dispose(); },
  };
}
