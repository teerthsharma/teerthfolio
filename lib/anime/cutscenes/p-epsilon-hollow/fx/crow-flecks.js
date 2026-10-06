// CROW FLECKS: small Itachi flock motes. Ink wedges, gold rim, drift on threes.
// Not a statue. Composes noise hash for cell placement.
//
// MATHS: 48 camera-facing chips; p_i = hash direction * (8..28 m) + 0.35 m/s up;
//   shape = |x| + 0.6 |y| < 1 (crow-wedge); fill #0e0d12, rim #ffb524 via iso-ish fwidth
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial } from "three";

export function buildCrowFlecks(ctx) {
  const { THREE } = ctx;
  const N = 48, rng = ctx.rng("crow-flecks");
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = rng() * 2 - 1, az = rng() * Math.PI * 2, rr = Math.sqrt(Math.max(0, 1 - z * z));
    seed.set([rr * Math.cos(az), Math.abs(z) * 0.7 + 0.15, rr * Math.sin(az), rng()], i * 4);
  }
  const geo = new BufferGeometry();
  const pos = new Float32Array(N * 12), uv = new Float32Array(N * 8), aS = new Float32Array(N * 16), idx = new Uint32Array(N * 6);
  const C = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  for (let i = 0; i < N; i++) {
    for (let v = 0; v < 4; v++) {
      uv.set(C[v], i * 8 + v * 2);
      aS.set(seed.subarray(i * 4, i * 4 + 4), i * 16 + v * 4);
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
  geo.setAttribute("aS", new BufferAttribute(aS, 4));
  geo.setIndex(new BufferAttribute(idx, 1));
  const mat = new ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uT; attribute vec4 aS; varying vec2 vUv; varying float vH;
      void main() {
        float R = 8.0 + 20.0 * aS.w;
        vec3 P = aS.xyz * R;
        P.y += fract(uT * 0.12 + aS.w) * 6.0;
        vec4 mv = modelViewMatrix * vec4(P, 1.0);
        mv.xy += uv * (0.09 + 0.06 * aS.w);
        vUv = uv * 2.0; vH = aS.w;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK; varying vec2 vUv; varying float vH;
      void main() {
        float d = abs(vUv.x) + 0.6 * abs(vUv.y) - 1.0;
        float w = fwidth(d) * 0.8 + 1e-5;
        float m = 1.0 - smoothstep(-w, w, d);
        if (m < 0.01) discard;
        vec3 ink = vec3(0.055, 0.051, 0.071);
        vec3 gold = vec3(1.0, 0.710, 0.141);
        float rim = 1.0 - smoothstep(0.0, w * 2.4, abs(d));
        vec3 col = mix(ink, gold, rim * 0.7);
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        gl_FragColor = vec4(col, m * uK * (0.55 + 0.45 * vH));
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.userData.layer = 1;
  return {
    mesh,
    update(ts3) {
      mat.uniforms.uT.value = ts3;
      mat.uniforms.uK.value = 1;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
