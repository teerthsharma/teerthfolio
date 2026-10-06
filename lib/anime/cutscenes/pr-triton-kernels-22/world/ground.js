// GROUND: the island (the pocket's own ground, white-teal), the black wet road, kerbs, zebra bars, the lake embankment, and the
// POOL (the mirror-water-plane: a dark translucent plane over the mirrored shrine).
//
// POOL shader (screen-space-free, world-space maths):
//   d      = |p.xz - C|                          distance from the seal
//   spread = 1 - smoothstep(drawR - 8, drawR, d)  the pool spreads out from the pup with the draw-in wipe
//   rub    = 1 - smoothstep(rubR - 8, rubR, d)    and is rubbed out from the horizon inward
//   lake   = 1 - smoothstep(-54, -50, p.z)        the open water beyond the embankment (z < -52)
//   dz     = |p.z - Zshrine|                      distance from the shrine's base line
//   alpha  = mix(streetA, lakeA, lake) ,  lakeA = 0.38 + 0.40 smoothstep(0, 70, dz)   the reflection is strongest at the shrine
//            and fades to ~55% toward the viewer (the dark overlay thickens);  streetA = 0.30 (1 - smoothstep(10.5, 13, |x|))
//   ripple = smoothstep(0.93, 1, sin(0.8 r - 2 pi t)) , r = |(0.6 x, z - Zshrine)|   rings leave the shrine base, 24-frame period
//   col    = (0.012, 0.004, 0.010) + ripple (0.19, 0.17, 0.17) + (0.5, 0, 0.05) exp(-dz/22) (0.5 + 0.5 sin(0.9 x + 2 t)) 0.25 lake
// Blending keeps the destination alpha (the set-line id channel): rgb = src.a src + (1 - src.a) dst, alpha unchanged.
//
// Easter egg 3: the zebra crossing at z = +8 has 14 bars where 15 belong; the 56th is the gap (bar 7 is missing).
import { BoxGeometry, CircleGeometry, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { merge } from "../../../kit3d.js";
import { SHRINE_Z } from "./shrine.js";
import { sm, surf } from "./util.js";

export function buildGround(ctx, T, U) {
  const { engine } = ctx;
  const dyn = [], stat = [];
  // the island: static art (layer 0). Below the road, so the rub reveals it.
  const island = surf(engine, new CircleGeometry(38, 72).rotateX(-Math.PI / 2).translate(0, -0.02, 0), "#cfd9de", "#8fa3b0", 0.4, { stone: [3, 0.9, 0.14, 0.05] });
  stat.push(island);
  const rim = surf(engine, new CircleGeometry(38.6, 72).rotateX(-Math.PI / 2).translate(0, -0.05, 0), "#0e0b0d", "#0e0b0d", 0.41);
  stat.push(rim);
  const fog = [0.5, 0, 22, 170, "#1a1a2a"];                       // the distance haze plate tint (#1a1a2a)
  const R = { reveal: U, fog };
  // the black wet road (drawn in from the pup, rubbed out from the horizon)
  dyn.push(surf(engine, new PlaneGeometry(350, 237).rotateX(-Math.PI / 2).translate(0, 0, 66.5), "#101018", "#040408", 0.45, { ...R, stone: [3, 0.7, 0.35, 0.3], gloss: [0.3, 18, 0.3, 0] }));
  // kerbs along both sides of the avenue (half width 10.5 m)
  const kerb = [];
  for (const s of [-1, 1]) kerb.push(new BoxGeometry(2.2, 0.16, 237).translate(s * 11.6, 0.08, 66.5));
  dyn.push(surf(engine, merge(kerb, "kerbs"), "#2a2a38", "#0a0a12", 0.46, { ...R, ink: 0.6 }));
  // the lake embankment: a stone lip across the avenue's far end (z = -52)
  dyn.push(surf(engine, new BoxGeometry(350, 1.4, 3).translate(0, 0.0, -52.5), "#1d2c36", "#04080c", 0.47, { ...R, stone: [1, 0.5, 0.8, 0.5], ink: 1.0 }));
  // zebra bars (two crossings, 4.5 m long, 0.7 m wide, pitch 1.4 m); the 56th is missing at z = +8
  const bars = [];
  for (const zc of [8.5, -8.5]) for (let i = 0; i < 15; i++) {
    if (zc > 0 && i === 7) continue;
    bars.push(new BoxGeometry(0.7, 0.03, 4.5).translate(-9.8 + i * 1.4, 0.02, zc));
  }
  dyn.push(surf(engine, merge(bars, "zebra"), "#ece5d2", "#9a9484", 0.48, R));

  // the pool
  const pool = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    uniforms: { uTime: { value: 0 }, uDrawR: U.drawR, uRubR: U.rubR, uC: U.C },
    vertexShader: "varying vec3 vWP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `uniform float uTime; uniform float uDrawR; uniform float uRubR; uniform vec2 uC; varying vec3 vWP;
      void main() {
        float d = length(vWP.xz - uC);
        float spread = 1.0 - smoothstep(uDrawR - 8.0, uDrawR, d), rub = 1.0 - smoothstep(uRubR - 8.0, uRubR, d);
        float lake = 1.0 - smoothstep(-54.0, -50.0, vWP.z);
        float dz = abs(vWP.z - (${SHRINE_Z.toFixed(1)}));
        float aL = 0.38 + 0.40 * smoothstep(0.0, 70.0, dz);
        float aS = 0.30 * (1.0 - smoothstep(10.5, 13.0, abs(vWP.x)));
        float r = length(vec2(0.6 * vWP.x, vWP.z - (${SHRINE_Z.toFixed(1)})));
        float ripple = smoothstep(0.93, 1.0, sin(0.8 * r - 6.28318 * uTime)) * (1.0 - smoothstep(0.0, 60.0, r)) * lake;
        vec3 col = vec3(0.012, 0.004, 0.010) + ripple * vec3(0.19, 0.17, 0.17)
                 + vec3(0.5, 0.0, 0.05) * exp(-dz / 22.0) * (0.5 + 0.5 * sin(0.9 * vWP.x + 2.0 * uTime)) * 0.25 * lake;
        float a = clamp(mix(aS, aL, lake) + ripple * 0.4, 0.0, 0.92) * spread * rub;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const poolMesh = new Mesh(new PlaneGeometry(350, 200).rotateX(-Math.PI / 2).translate(0, 0.05, -40), pool);
  poolMesh.renderOrder = 5; poolMesh.frustumCulled = false;
  dyn.push(poolMesh);

  return {
    dynamic: dyn, static: stat,
    update(t) {
      pool.uniforms.uTime.value = t;
      const k = (t - T.draw) / T.drawDur;
      U.drawR.value = k <= 0 ? 0 : 170 * sm(k);
      const r = (t - T.rub) / T.rubDur;
      U.rubR.value = r <= 0 ? 1e5 : 190 * (1 - sm(r)) ** 1.0;
    },
    dispose() { for (const m of [...dyn, ...stat]) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
