// VOID FLOOD VOLUME: the still that names Infinite Void (MAPPA Shibuya). Not type-on-purple.
// A camera-facing plate at the core: torn white burst + hard information chips + cel void bands.
// TOOLKIT: engine/anime:lib/anime/tools/rings.js (ringAA / sunburst, local until consolidate)
//
// MATHS (p = metres on the core plane; r = |p|; th = atan(p.y, p.x); seed = floor(12 t)):
//   spike R(th)  N=28 sectors; k = (th/2π + 1/2) N; i = floor k; tri = 1 - |2 fract(k) - 1|
//                 R = 2.7 * mix(0.58, 1.0, h21(i, seed)) * (0.55 + 0.45 tri^0.55)
//   core         q = r / R; inside: cel3(1-q, 0.18, 0.62, indigo, orchid-white, still-white)
//                 7 shard wedges cut to ink #12151a where |th - a_j| < hw (1 - 0.55 q)
//   chips        polar cell (floor(r * 0.38), floor((th/2π) * 24)); on if h21 > 0.54
//                 dash = 1 - aaf(|cell uv.x| - mix(0.12, 0.38, chip)); 12% squares
//   rings        9 hard bands: |r - (3.15 + 1.48 i)| < 0.05 + 0.025 vn; ink via isoInk
//   void         outside core: 4-step cel of fbm(p * 0.07 + flow) * exp(-r * 0.045) over #030208
//   cap          luma ≤ 0.92; outer aaf(r - 21); freeze holds seed
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { CORE, OUT, TL, flowAt, hx, presence, startOf, u } from "./shared.js";

export default function voidFlood(ctx) {
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const S = 22;
  const mat = new ShaderMaterial({
    uniforms: { uS: u(S), uSeed: u(0), uFade: u(0), uFlow: u(0) },
    transparent: true, depthWrite: false, depthTest: true,
    vertexShader: `varying vec2 vP; uniform float uS; void main() { vP = position.xy * 2.0 * uS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSeed, uFade, uFlow; varying vec2 vP;
      ${tools} ${OUT}
      // TOOLKIT: engine/anime:lib/anime/tools/rings.js
      float ringAA(float phase, float duty) {
        float f = fract(phase), w = fwidth(phase) + 1e-5;
        return smoothstep(0.0, w, f) * (1.0 - smoothstep(duty, duty + w, f));
      }
      void main() {
        if (uFade < 0.004) discard;
        float r = length(vP), th = atan(vP.y, vP.x);
        float k = (th / 6.2831853 + 0.5) * 28.0, i = floor(k), f = fract(k);
        float len = mix(0.58, 1.0, h21(vec2(i, mod(uSeed, 97.0))));
        float tri = 1.0 - abs(f * 2.0 - 1.0);
        float edge = 2.7 * len * (0.55 + 0.45 * pow(tri, 0.55));
        float q = r / max(edge, 1e-4);
        float inCore = aaf(1.0 - q);
        vec3 ink = ${hx("#12151a")};
        vec3 voidC = ${hx("#030208")};
        vec3 indigo = ${hx("#0f0a36")};
        vec3 orchid = ${hx("#9942c2")};
        vec3 pale = ${hx("#ede0ff")};
        vec3 still = ${hx("#f4eeff")};
        vec3 chipA = ${hx("#e6d6ff")};
        vec3 chipB = ${hx("#8cb8ff")};
        vec3 chipC = ${hx("#c775f2")};
        vec3 col = voidC;
        float dens = fbm(vP * 0.07 + vec2(uFlow * 0.12, 1.7)) * exp(-r * 0.045);
        float bands = celSteps(dens, 4.0);
        col = mix(voidC, indigo, bands);
        col = mix(col, ink, isoInk(dens * 4.0, 2.0, 1.4) * 0.85);
        float rings = ringAA(r / 1.48 - uFlow * 0.05, 0.16) * (1.0 - aaf(3.0 - r));
        col = mix(col, mix(indigo, pale, 0.35), rings * 0.55 * (1.0 - inCore));
        // information chips: hashed polar cells, dashes not letters (L10)
        float cr = floor(r * 0.38), ca = floor((th / 6.2831853 + 0.5) * 24.0);
        float hid = h21(vec2(cr, ca + mod(uSeed, 31.0)));
        float on = step(0.54, hid);
        float chip = step(0.88, h21(vec2(ca, cr + 9.0)));
        vec2 cuv = vec2(fract(r * 0.38) - 0.5, fract((th / 6.2831853 + 0.5) * 24.0) - 0.5);
        float dash = aaf(mix(0.12, 0.36, chip) - abs(cuv.x)) * aaf(0.42 - abs(cuv.y));
        vec3 cc = hid < 0.70 ? chipA : (hid < 0.86 ? chipB : chipC);
        float chipA2 = on * dash * smoothstep(2.8, 4.2, r) * (1.0 - smoothstep(18.0, 21.0, r));
        col = mix(col, cc, chipA2 * 0.92);
        // torn white core
        vec3 coreCol = cel3(1.0 - clamp(q, 0.0, 1.0), 0.18, 0.62, indigo, mix(orchid, pale, 0.55), still);
        for (int j = 0; j < 7; j++) {
          float fj = float(j);
          float aj = (h21(vec2(fj, mod(uSeed, 97.0) + 3.0)) * 2.0 - 1.0) * 3.14159;
          float hw = 0.05 + 0.055 * h21(vec2(fj + 9.0, mod(uSeed, 97.0)));
          float da = abs(mod(th - aj + 3.14159, 6.2831853) - 3.14159);
          float cut = step(da, hw * (1.0 - 0.55 * q)) * step(0.22, q) * (1.0 - step(0.94, q));
          coreCol = mix(coreCol, ink, cut);
        }
        coreCol = mix(coreCol, ink, jaggedInk(q, 1.0, 2.2, 18.0, vP * 0.2) * 0.9);
        col = mix(col, coreCol, inCore);
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        float cover = max(inCore, max(rings * 0.7, chipA2));
        float alpha = aaf(21.0 - r) * uFade * mix(0.55, 1.0, cover);
        if (alpha < 0.01) discard;
        emit(col, alpha);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.position.set(...CORE);
  mesh.scale.setScalar(2 * S);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2;
  mesh.userData.layer = 1;
  mesh.onBeforeRender = (_r, _s, cam) => { mesh.quaternion.copy(cam.quaternion); };
  return {
    group: mesh,
    update(t, cue) {
      const a = startOf(cue, "flood", TL.floodA);
      const end = startOf(cue, "clear", TL.voidEnd);
      const fz = startOf(cue, "freeze", TL.freeze);
      mat.uniforms.uFade.value = presence(t, 0.0, end) * Math.min(1, Math.max(0, (t - a) / 0.45));
      mat.uniforms.uFlow.value = flowAt(t, fz);
      mat.uniforms.uSeed.value = t < fz ? Math.floor(t * 12) : Math.floor(fz * 12);
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
