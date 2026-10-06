// LOW SUKUNA VOLUME: the still that names the shrine-shadow titan. Four arms, slat shrine, manhwa ink.
// Blue Susanoo stays the only cold object (FX). This mass sits behind it as the war's dark god.
//
// MATHS (p metres on a camera-facing plane; r = |p|; th = atan):
//   torso    blob(p, (0, 1.2), (4.2, 5.6), 0.28)
//   head     blob(p, (0, 6.4), (2.1, 1.8), 0.2); grin = |p.y-5.9| < 0.18 and |p.x| < 1.4 * (1 - (p.y-5.9))
//   arms     four blobs at (±5.2, 3.4) and (±6.0, 0.6)
//   slats    9 capsules x = -4.8 + 1.2 i, y in [-4.2, -0.4]
//   fill     cel3(lit, 0.38, 0.72, soot, ash, ember) ; hatch strokes ; ink jagged rim
//   cap      luma ≤ 0.92; alpha = aaf(-d) * fade * (1 - break)
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { PAL, V, since, sm } from "./common.js";

export function buildSukunaVolume(ctx, env) {
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const mat = new ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false,
    uniforms: { uFade: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: `varying vec2 vP; void main() { vP = position.xy * vec2(16.0, 20.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${tools}
      uniform float uFade, uSeed; varying vec2 vP;
      void main() {
        if (uFade < 0.004) discard;
        float d = blob(vP, vec2(0.0, 1.2), vec2(4.2, 5.6), 0.28);
        d = min(d, blob(vP, vec2(0.0, 6.4), vec2(2.1, 1.8), 0.20));
        d = min(d, blob(vP, vec2(-5.2, 3.4), vec2(2.4, 1.1), 0.30));
        d = min(d, blob(vP, vec2(5.2, 3.5), vec2(2.4, 1.1), 0.30));
        d = min(d, blob(vP, vec2(-6.0, 0.4), vec2(1.8, 1.0), 0.32));
        d = min(d, blob(vP, vec2(6.1, 0.3), vec2(1.8, 1.0), 0.32));
        float slat = 9.0;
        for (int i = 0; i < 9; i++) {
          float x = -4.8 + 1.2 * float(i);
          slat = min(slat, max(abs(vP.x - x) - 0.16, abs(vP.y + 2.2) - 2.0));
        }
        d = min(d, slat);
        float a = aaf(d) * uFade;
        if (a < 0.01) discard;
        float lit = (0.2 - vP.x * 0.04) + (vP.y + 2.0) * 0.05 + fbm(vP * 0.18 + uSeed * 0.01) * 0.35;
        vec3 soot = ${V("#433a30")};
        vec3 ash = ${V(PAL.ash)};
        vec3 ember = ${V(PAL.ember)};
        vec3 ink = ${V("#2a1f1a")};
        vec3 blood = ${V("#b80a17")};
        vec3 col = cel3(clamp(lit, 0.0, 1.0), 0.38, 0.72, soot, ash, ember);
        col = mix(col, ink, 0.42 * strokes(vP * 1.6, 1.1, 1.5, 0.3));
        float grin = step(abs(vP.y - 5.85), 0.22) * step(abs(vP.x), 1.35) * aaf(-d);
        col = mix(col, ink, grin * 0.9);
        col = mix(col, blood, grin * step(abs(vP.y - 5.85), 0.07) * 0.45);
        col = mix(col, ink, jaggedInk(d, 0.0, 2.4, 16.0, vP * 0.12));
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.scale.set(2, 2, 1);
  mesh.frustumCulled = false;
  mesh.renderOrder = -4;
  mesh.userData.layer = 1;
  mesh.onBeforeRender = (_r, _s, cam) => { mesh.quaternion.copy(cam.quaternion); };
  mesh.position.copy(env.toWorld(new ctx.THREE.Vector3(0.9, 7.2, -22)));
  return {
    obj: mesh,
    update(t, dt, cue) {
      const br = since(cue, "break");
      const k = sm(Math.min(1, Math.max(0, (cue.ts - 0.4) / 0.8))) * (br < 0 ? 1 : 1 - sm(br / 0.35));
      mat.uniforms.uFade.value = k;
      mat.uniforms.uSeed.value = Math.floor(cue.ts * 8);
      mesh.visible = k > 0.01;
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
