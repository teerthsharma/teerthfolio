// HOLLOW PURPLE CORE: the still that names the merge (MAPPA ref 06). White-hot core, 4 cel bands, pink flare.
// Not a cream wash. TOOLKIT: engine/anime:lib/anime/tools/orb.js (cel stand-in; the shared orb blooms past 0.92).
//
// MATHS (p in -1..1 on a 4.2 R card; r = |p|; nd = 1 - r):
//   bands   cel3(nd, 0.22, 0.62, #2a1480, #b84dff, #ede0ff); nd > 0.78 -> still-white #f4eeff
//   swirl   sin(4 th + 14 (1-nd) - 5 t) > 0.80 inside mid bands -> ink #12151a
//   rim     isoInk(r, 0.98, 1.8) * #ede0ff
//   flare   6 thin spikes (len 0.55) + 2 long (len 1.0), #ff5a8a at 0.42
//   cap     luma ≤ 0.92; alpha = inOrb * uK
import { BILLBOARD_VS, hexLin, sstep } from "./lib.js";

const D_KEYS = [[17.79, 0.9], [17.92, 1.2], [18.42, 6.5], [18.71, 7.8], [19.0, 9.5], [19.5, 14]];
const R_KEYS = [[17.79, 0.35], [18.1, 1.3], [18.6, 2.6], [19.0, 4.2], [19.5, 5.7]];
const lerp = (a, b, k) => a + (b - a) * k;
function keys(K, t) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) {
    if (t <= K[i][0]) {
      const k = (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
      return lerp(K[i - 1][1], K[i][1], 0.5 - 0.5 * Math.cos(Math.PI * k));
    }
  }
  return K[K.length - 1][1];
}

export default function make(ctx, L) {
  const { THREE } = ctx;
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const V = (h) => new THREE.Vector3(...hexLin(h));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uPos: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(1, 1) },
      uRot: { value: 0 }, uPush: { value: 0 }, uK: { value: 0 }, uTime: { value: 0 },
      uDeep: { value: V("#2a1480") }, uEnv: { value: V("#b84dff") }, uPale: { value: V("#ede0ff") },
      uHot: { value: V("#f4eeff") }, uInk: { value: V("#12151a") }, uPink: { value: V("#ff5a8a") },
    },
    vertexShader: BILLBOARD_VS,
    fragmentShader: /* glsl */ `
      ${tools}
      uniform float uK, uTime; uniform vec3 uDeep, uEnv, uPale, uHot, uInk, uPink;
      varying vec2 vP;
      float spike(vec2 p, float ang, float len, float wid) {
        vec2 d = vec2(cos(ang), sin(ang)); float al = abs(dot(p, d)); float pe = abs(p.x * d.y - p.y * d.x);
        float tp = wid * (1.0 - clamp(al / len, 0.0, 1.0));
        return step(al, len) * (1.0 - smoothstep(tp * 0.35, tp + 1e-4, pe)) * (1.0 - al / len);
      }
      float flare8(vec2 p) {
        float s = spike(p, 0.0, 1.00, 0.030) + spike(p, 3.14159, 1.00, 0.030);
        s += spike(p, 0.7854, 0.55, 0.020) + spike(p, 2.3562, 0.55, 0.020);
        s += spike(p, 3.9270, 0.55, 0.020) + spike(p, 5.4978, 0.55, 0.020);
        s += spike(p, 1.5708, 0.55, 0.020) + spike(p, 4.7124, 0.55, 0.020);
        return min(s, 1.0);
      }
      void main() {
        if (uK < 0.004) discard;
        vec2 p = vP; float r = length(p); float nd = 1.0 - r;
        float px = fwidth(r);
        float fl = flare8(p);
        float inOrb = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
        if (inOrb < 0.01 && fl < 0.01) discard;
        vec3 col = cel3(clamp(nd, 0.0, 1.0), 0.22, 0.62, uDeep, uEnv, uPale);
        col = mix(col, uHot, celStep(nd, 0.78));
        float th = atan(p.y, p.x);
        float sw = sin(th * 4.0 + (1.0 - nd) * 14.0 - uTime * 5.0);
        col = mix(col, uInk, step(0.80, sw) * step(0.18, nd) * step(nd, 0.76) * 0.88);
        col = mix(col, uPale, isoInk(r, 0.98, 1.8) * 0.9);
        col = mix(col, uPink, fl * 0.42);
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (luma > 0.92) col *= 0.92 / luma;
        float a = max(inOrb, fl * 0.7) * uK;
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  const group = new THREE.Group();
  group.name = "fx-hollow-core";
  group.add(mesh);
  const pos = new THREE.Vector3(), cen = new THREE.Vector3();
  const u = mat.uniforms;
  return {
    group,
    update(t) {
      L.chest(cen);
      const d = keys(D_KEYS, t), R = keys(R_KEYS, t);
      pos.copy(cen).addScaledVector(L.dirCore, d); pos.y += 0.2;
      const alive = t >= 17.79 && t < 19.55;
      u.uPos.value.copy(pos);
      u.uSize.value.set(4.2 * R, 4.2 * R);
      u.uK.value = alive ? 1 - sstep(19.2, 19.5, t) : 0;
      u.uTime.value = t;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
