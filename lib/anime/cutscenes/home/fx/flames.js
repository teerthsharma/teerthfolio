// FX 3: THE ELEVEN BEACONS (flames, glow, embers, cairn key light).
//
// Each beacon is a view-aligned flame drawn as 2D anime fire (ref-05 hearth), lit one per 0.5 s from 19.0 s, on twos.
// Quad: x in [-.9,.9] S, y in [-.35,1.15] S, S = flame height 1.4 m (nearest) .. 3.2 m (farthest) so the far ones still read.
// Tongue (q = quad coords in S units, v = clamp(q.y)):
//     sway    = (h(tw,1) - .5) * .10 * q.y                       tw = floor(t*12) + seed   (twos)
//     hw(v)   = .16 (1 - v)^.75 (.85 + .2 h(tw,2))               half-width, pointed tip
//     outer   = |q.x - sway| < hw          #db6128   height 1.0
//     mid     = |q.x - sway'| < .66 hw     #fba83d   height .78, sway' from the PREVIOUS step (the second inner tongue offset one step)
//     core    = |q.x - sway'| < .18 hw     #fff0b3   18% of the width, height .45
//   The first beacon's mid tone is the ref-05 hearth orange #f2a53a (egg 3).
//   Edges are hard (fwidth AA): a flat cel flame, not a soft blob. Flame luma stays <= 0.93 (L8).
// GLOW (separate draw): g = .45 exp(-5.2 r) + .10 exp(-3 |q - (0,0)|^2)  (r about the flame heart; the 2nd term is the +10% #ffb070 key on
//     the cairn stones and snow within ~3 m). Blended SCREEN: dst' = dst + src (1 - dst), which can never exceed 1.0 (flames never bloom).
// EMBERS: 4 per beacon, y = S (.4 + 1.6 fract(.35 tw + ph)), drift sin; round, #ffb36a, fade with height; on twos.
// LIGHT-UP: k = clamp((t - lit)/.25), scale = k (1 + .18 sin(pi k)) so a flame pops and settles; before lit: scale 0.
import * as S from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const C = S.clock(ctx.scene);
  const spots = ctx.scene.beacons?.length >= 11 ? ctx.scene.beacons : S.beaconSpots();
  const N = 11;
  const aA = new Float32Array(N * 4), aB = new Float32Array(N * 4);
  spots.slice(0, N).forEach(([x, y, z], j) => {
    const size = 1.4 + 1.8 * (j / (N - 1));
    aA.set([x, y + 1.15, z, size], j * 4);          // flame base sits on top of the cairn (cairn is ~1.3 m)
    aB.set([C.lit[j], j === 0 ? 1 : 0, j * 3.17 + 0.5, 0], j * 4);
  });
  const mkGeo = () => {
    const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0));
    g.setAttribute("aA", new THREE.InstancedBufferAttribute(aA, 4));
    g.setAttribute("aB", new THREE.InstancedBufferAttribute(aB, 4));
    g.instanceCount = N;
    return g;
  };
  const VERT = /* glsl */ `
    attribute vec4 aA; attribute vec4 aB; uniform float uT;
    varying vec2 vQ; varying float vSeed, vFirst, vLit;
    ${S.GLSL_BILL}
    void main() {
      float k = clamp((uT - aB.x) / 0.25, 0.0, 1.0);
      float sc = k * (1.0 + 0.18 * sin(3.14159 * k));
      vLit = step(0.0001, k);
      vQ = vec2(position.x * 1.8, position.y * 1.5 - 0.35);
      vSeed = aB.z; vFirst = aB.y;
      float S = aA.w * sc;
      vec3 w = aA.xyz + (camRight() * vQ.x + camUp() * vQ.y) * S;
      gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
    }`;
  const HASH = "float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }";

  const tongueMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uT; varying vec2 vQ; varying float vSeed, vFirst, vLit;
      ${HASH}
      float tongue(vec2 q, float sway, float hw, float top) {
        float v = clamp(q.y / top, 0.0, 1.0);
        float w = hw * pow(1.0 - v, 0.75);
        float d = abs(q.x - sway * q.y) - w;
        float aa = fwidth(q.x) * 1.2 + 1e-4;
        return (1.0 - smoothstep(-aa, aa, d)) * step(0.0, q.y) * step(q.y, top);
      }
      void main() {
        if (vLit < 0.5) discard;
        float tw = floor(uT * 12.0) + vSeed;
        float s0 = (h21(vec2(tw, 1.0)) - 0.5) * 0.10;                                  // current step sway
        float s1 = (h21(vec2(tw - 1.0, 1.0)) - 0.5) * 0.10;                    // previous step: the inner tongue lags one step
        float wob = 0.85 + 0.2 * h21(vec2(tw, 2.0));
        float hw = 0.16 * wob;
        float mOut = tongue(vQ, s0, hw, 1.0);
        float mMid = tongue(vQ, s1, hw * 0.66, 0.78);
        float mCor = tongue(vQ, s1, hw * 0.18, 0.45);
        vec3 cOut = vec3(0.859, 0.380, 0.157);                                 // #db6128
        vec3 cMid = mix(vec3(0.984, 0.659, 0.239), vec3(0.949, 0.647, 0.227), vFirst); // #fba83d | #f2a53a hearth for the first
        vec3 cCor = vec3(1.0, 0.941, 0.702);                                   // #fff0b3
        vec3 c = cOut;
        c = mix(c, cMid, mMid);
        c = mix(c, cCor, mCor);
        gl_FragColor = vec4(min(c, vec3(0.93)), mOut);                          // luma cap
      }`,
  });
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcColorFactor,
    uniforms: { uT: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uT; varying vec2 vQ; varying float vSeed, vFirst, vLit;
      ${HASH}
      void main() {
        if (vLit < 0.5) discard;
        float tw = floor(uT * 12.0) + vSeed;
        float flick = 0.92 + 0.08 * h21(vec2(tw, 5.0));
        float r = length(vQ - vec2(0.0, 0.3));
        float g = 0.45 * exp(-r * 5.2) + 0.10 * exp(-3.0 * dot(vQ, vQ));
        vec3 col = vec3(1.0, 0.690, 0.439) * g * flick;                       // #ffb070 warm key
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const glow = new THREE.Mesh(mkGeo(), glowMat);
  const tongues = new THREE.Mesh(mkGeo(), tongueMat);
  glow.frustumCulled = false; tongues.frustumCulled = false;
  glow.renderOrder = 20; tongues.renderOrder = 21;
  group.add(glow, tongues);

  // ---- embers: 4 per beacon ----
  const NE = N * 4;
  const eA = new Float32Array(NE * 4), eB = new Float32Array(NE * 4);
  const rng = ctx.rng(4242);
  for (let j = 0; j < N; j++) for (let e = 0; e < 4; e++) {
    const i = j * 4 + e;
    eA.set([aA[j * 4], aA[j * 4 + 1], aA[j * 4 + 2], aA[j * 4 + 3]], i * 4);
    eB.set([aB[j * 4], e / 4 + 0.2 * rng(), rng() * 6.28, 0.6 + 0.8 * rng()], i * 4);
  }
  const eg = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  eg.setAttribute("aA", new THREE.InstancedBufferAttribute(eA, 4));
  eg.setAttribute("aB", new THREE.InstancedBufferAttribute(eB, 4));
  eg.instanceCount = NE;
  const emberMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec4 aA; attribute vec4 aB; uniform float uT; varying vec2 vP; varying float vF;
      ${S.GLSL_BILL}
      void main() {
        float lit = step(aB.x, uT);
        float tw = floor(uT * 12.0);
        float ph = fract(0.35 * (tw / 12.0) * aB.w + aB.y);
        float S = aA.w;
        vec3 base = aA.xyz + vec3(sin(aB.z + tw * 0.4) * 0.12 * S * ph, S * (0.4 + 1.6 * ph), cos(aB.z * 1.3 + tw * 0.3) * 0.06 * S * ph);
        float sz = 0.045 * S * lit * (1.0 - 0.6 * ph);
        vP = position.xy * 2.0; vF = (1.0 - ph) * lit;
        gl_Position = projectionMatrix * viewMatrix * vec4(base + (camRight() * position.x + camUp() * position.y) * sz * 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vP; varying float vF;
      void main() {
        float r = length(vP), aa = fwidth(r) + 1e-4;
        float m = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
        gl_FragColor = vec4(1.0, 0.702, 0.416, m * vF * 0.95);                 // #ffb36a, round, hard
      }`,
  });
  const embers = new THREE.Mesh(eg, emberMat);
  embers.frustumCulled = false; embers.renderOrder = 22;
  group.add(embers);

  return {
    group,
    update(t) {
      tongueMat.uniforms.uT.value = t; glowMat.uniforms.uT.value = t; emberMat.uniforms.uT.value = t;
      glow.visible = tongues.visible = embers.visible = t >= C.lit[0] - 0.05;
    },
    dispose() { glow.geometry.dispose(); tongues.geometry.dispose(); eg.dispose(); tongueMat.dispose(); glowMat.dispose(); emberMat.dispose(); },
  };
}
