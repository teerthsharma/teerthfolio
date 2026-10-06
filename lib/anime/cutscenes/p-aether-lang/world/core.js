// THE CORE (bible 3.4): the ragged white burst of `01-gojo-unlimited-void-shibuya`: flat #ffffff, torn-paper edge, black shards cut in,
// two thin halos with a chromatic fringe. NOT a soft CG glow. Two camera-facing quads at CORE: the burst (normal blend, so the shards are black)
// and the halos (additive).
//
// MATHS (burst, P = metres from the core, a = atan(P.y, P.x)):
//   N = 32 spikes: k = (a/2pi + .5) N, i = floor k, f = fract k;  tri = 1 - |2f - 1|;  len_i = mix(.6, 1, h(i, seed))
//   edge(a) = max(R0 len_i (.55 + .45 tri^.6), .5 R0)  (a pointed spike per sector, lengths .6..1 of the radius)
//   the silhouette RE-SEEDS every 2 frames at 24 fps: seed = floor(12 t)  (sakuga step); the pulse stays smooth
//   7 shard wedges: |a - a_j| < hw_j (1 - .6 r/edge) and .25 edge < r < .95 edge  -> #04030a (negative space)
//   alpha = 1 - smoothstep(.92, 1, r/edge)   (only the outer 8% is soft);  colour #ffffff -> #ede0ff on the outer 20%
// MATHS (halos): ring_i(r) = exp(-((r - R_i)/w)^2), the channels sampled at r +/- e, e = 1.5 px (fwidth(r) 1.5): red outward, blue inward = the rainbow fringe.
// Peak output <= 1.4 and the core sits 15 m behind the seal, so it never milks it (L8).
import { Group, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { ADD, CORE, NOISE, OUT, PAL, TL, hx, presence, startOf, u } from "./shared.js";

export default function core() {
  const R0 = 3.2, S = 12;
  const group = new Group();
  group.position.set(...CORE);
  const vs = `varying vec2 vP; uniform float uS; void main() { vP = position.xy * 2.0 * uS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const burst = new ShaderMaterial({
    uniforms: { uS: u(S), uSeed: u(0), uFade: u(0), uPulse: u(0), uR0: u(R0) },
    transparent: true, depthWrite: false,
    vertexShader: vs,
    fragmentShader: /* glsl */ `
      uniform float uSeed, uFade, uPulse, uR0; varying vec2 vP; ${NOISE} ${OUT}
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x);
        float k = (a / 6.28318 + 0.5) * 32.0, i = floor(k), f = fract(k);
        float len = mix(0.6, 1.0, h21(vec2(i, mod(uSeed, 97.0))));
        float tri = 1.0 - abs(f * 2.0 - 1.0);
        float edge = max(uR0 * len * (0.55 + 0.45 * pow(tri, 0.6)), 0.5 * uR0) * (1.0 + 0.05 * uPulse);
        float q = r / edge;
        float alpha = (1.0 - smoothstep(0.92, 1.0, q)) * uFade;
        vec3 col = mix(vec3(1.0), ${hx(PAL.white)}, smoothstep(0.8, 1.0, q));
        for (int j = 0; j < 7; j++) {
          float fj = float(j), aj = (h21(vec2(fj, mod(uSeed, 97.0) + 3.0)) * 2.0 - 1.0) * 3.14159;
          float hw = 0.05 + 0.06 * h21(vec2(fj + 9.0, mod(uSeed, 97.0)));
          float da = abs(mod(a - aj + 3.14159, 6.28318) - 3.14159);
          float cut = step(da, hw * (1.0 - 0.6 * q)) * step(0.25, q) * (1.0 - step(0.95, q));
          col = mix(col, ${hx(PAL.shard)}, cut);
        }
        emit(col, alpha);
      }`,
  });
  const halo = new ShaderMaterial({
    uniforms: { uS: u(S * 2.4), uFade: u(0), uPulse: u(0), uR0: u(R0) },
    transparent: true, depthWrite: false, ...ADD,
    vertexShader: vs,
    fragmentShader: /* glsl */ `
      uniform float uFade, uPulse, uR0; varying vec2 vP; ${NOISE} ${OUT}
      float ring(float r, float R, float w) { return exp(-sq((r - R) / w)); }
      void main() {
        float r = length(vP), e = fwidth(r) * 1.5;
        float R1 = uR0 * 1.8 * (1.0 + 0.02 * uPulse), R2 = uR0 * 2.6, w = 0.07;
        vec3 c = vec3(ring(r - e, R1, w) + 0.7 * ring(r - e, R2, w),
                      ring(r, R1, w) + 0.7 * ring(r, R2, w),
                      ring(r + e, R1, w) + 0.7 * ring(r + e, R2, w));
        c *= mix(${hx("#cfd8ff")}, vec3(1.0), 0.3) * 0.9;
        c += ${hx(PAL.violet)} * exp(-r / (1.4 * uR0)) * 0.22;
        emit(c, uFade);
      }`,
  });
  const mk = (m, order) => {
    const q = new Mesh(new PlaneGeometry(1, 1), m);
    q.scale.setScalar(2 * m.uniforms.uS.value); // side 2S metres; the vertex shader maps position.xy * 2S to metres from the centre
    q.frustumCulled = false; q.renderOrder = order; q.userData.layer = 1;
    q.onBeforeRender = (_r, _s, cam) => { q.quaternion.copy(cam.quaternion); };
    group.add(q);
    return q;
  };
  mk(halo, -1); mk(burst, 0);

  return {
    group,
    update(t, cue) {
      const f = presence(t, 0.05, startOf(cue, "clear", TL.voidEnd));
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      burst.uniforms.uFade.value = f; halo.uniforms.uFade.value = f;
      burst.uniforms.uPulse.value = halo.uniforms.uPulse.value = pulse;
      burst.uniforms.uSeed.value = Math.floor(t * 12);
    },
    dispose() { burst.dispose(); halo.dispose(); for (const c of group.children) c.geometry.dispose(); },
  };
}
