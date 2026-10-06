// p-caustic WORLD / the Limbo moon (bible 3.2): a billboard disc r 19 m at 118 m. Layer 1 (it spins, pulses, cracks, shatters).
//   p = uv*2-1, r = |p|, z = sqrt(1 - r^2)            limb height of the sphere
//   body   = RED lit (z > .55) | RED mid (z > .28) | RED dark, three hard cuts (flat red, limb darkening)
//   mottle = 18 % #7a6a52 from fbm(p*9) > .55 and vcell(p*5.5) crater pits (ref 01 photographic mottle)
//   rings  = |r - R_i| < .008 with R = (.30, .55, .80)(1 + .012 sin(2.4 t))   ink #140003
//   tomoe  = per ring 3 commas 120 deg apart, each 4 circles: head at R(cos a, sin a), tail trailing along the ring at
//            a - j*.16/(R+.1), radii shrinking .72^j; a_k = spin*(+-1) + k 2pi/3 + i pi/6, spin = .12 t
//   pupil  = r < .08 ink
//   rim    = smoothstep(.93, 1, r) .5 of #ffe8e0 (3 px pale rim glow)
//   crack  = F2-F1 of vcell(p*3.4) < .035, reaching out from P0 (-.55,.62) as uCrack*1.9 (ragged edge); ink + light leak core
//   break  = the same cells fall (shardGone) with the bright edge
import { PAL, V, GEO, GLSL_HASH, GLSL_BREAK, EV, since, sm, clamp01 } from "./common.js";

const FRAG = (noise) => /* glsl */ `
  uniform float uT; uniform float uCrack; uniform float uBreak; varying vec2 vUv;
  ${noise}
  ${GLSL_HASH}
  ${GLSL_BREAK}
  float cd(vec2 p, vec2 c, float r) { return length(p - c) - r; }
  void main() {
    vec2 p = vUv * 2.0 - 1.0; float r = length(p);
    if (r > 1.0) discard;
    vec3 cells = vcell(p * 3.4);
    if (uBreak > 0.0 && shardGone(cells.z)) discard;
    float z = sqrt(1.0 - r * r);
    vec3 col = z > 0.55 ? ${V(PAL.moonRed)} : (z > 0.28 ? ${V(PAL.moonRed)} * 0.72 : ${V(PAL.moonDark)});
    // crater mottle
    vec3 pit = vcell(p * 5.5 + vec2(3.0, 1.0));
    float mot = max(step(0.55, fbm(p * 9.0 + 2.0)) * 0.7, smoothstep(0.26, 0.2, pit.x) * 0.6 + (1.0 - smoothstep(0.0, 0.03, abs(pit.x - 0.26))) * 0.3);
    col = mix(col, ${V(PAL.moonMottle)}, 0.18 * mot);
    float pulse = 1.0 + 0.06 * sin(uT * 2.4);
    col *= pulse;
    // rings and tomoe
    float ink = 0.0;
    float spin = uT * 0.12;
    for (int i = 0; i < 3; i++) {
      float R = (0.30 + 0.25 * float(i)) * (1.0 + 0.012 * sin(uT * 2.4));
      ink = max(ink, 1.0 - smoothstep(0.006, 0.010, abs(r - R)));
      float sgn = (i == 1) ? -1.0 : 1.0;
      for (int k = 0; k < 3; k++) {
        float a = spin * sgn + float(k) * 2.0944 + float(i) * 0.5236;
        float rh = 0.05 + 0.012 * float(i), dm = 9.0;
        for (int j = 0; j < 4; j++) {
          float aj = a - float(j) * 0.16 / (R + 0.1);
          dm = min(dm, cd(p, R * vec2(cos(aj), sin(aj)), rh * pow(0.72, float(j))));
        }
        ink = max(ink, 1.0 - smoothstep(-0.003, 0.003, dm));
      }
    }
    ink = max(ink, 1.0 - smoothstep(0.075, 0.085, r));      // pupil
    col = mix(col, ${V(PAL.moonInk)}, ink);
    // cracks from the upper left
    float reach = uCrack * 1.9;
    float l0 = length(p - vec2(-0.55, 0.62)) + 0.25 * (vn(p * 6.0) - 0.5);
    float cm = (1.0 - smoothstep(0.0, 0.035, cells.y)) * (1.0 - smoothstep(reach - 0.05, reach, l0)) * step(0.001, uCrack);
    col = mix(col, ${V(PAL.moonInk)}, cm * 0.9);
    col = mix(col, ${V(PAL.seam)} * 0.8, (1.0 - smoothstep(0.0, 0.012, cells.y)) * cm * 0.6);
    col = mix(col, ${V(PAL.halo)}, smoothstep(0.93, 1.0, r) * 0.5);
    col = mix(col, ${V(PAL.flash)} * 0.92, shardEdge(cells.y));
    gl_FragColor = vec4(min(col, vec3(0.9)), 0.0);   // alpha 0: the sky id, so the set-line pass draws no ink around it
  }`;

export function buildMoon(ctx, env) {
  const { THREE, tools } = ctx;
  const R = GEO.MOON_R * env.S;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCrack: { value: 0 }, uBreak: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: FRAG(tools.glslFor(["noise"])),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R), mat);
  mesh.frustumCulled = false; mesh.userData.layer = 1; mesh.renderOrder = -9;
  mesh.onBeforeRender = (_r, _s, cam) => { mesh.quaternion.copy(cam.quaternion); };
  const pos = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  return {
    obj: mesh,
    // the moon sits at WIDE, and at TALL in the arc shot so the low look-up still sees it
    update(t, dt, cue, S) {
      const u = mat.uniforms;
      u.uT.value = cue.ts;
      u.uCrack.value = clamp01(since(cue, "crack") / 0.75) * (since(cue, "crack") >= 0 ? 1 : 0);
      u.uBreak.value = clamp01(since(cue, "break") / 1.5) * (since(cue, "break") >= 0 ? 1 : 0);
      const tall = cue.law === "arc" ? 1 : 0;
      a.set(...GEO.MOON_WIDE); b.set(...GEO.MOON_TALL);
      pos.copy(a).lerp(b, tall);
      pos.y = THREE.MathUtils.lerp(pos.y - 30, pos.y, sm((cue.ts - EV.limbo) / 1.3)); // it rises in shot 1
      S.moonPos = pos.clone();
      mesh.position.copy(env.toWorld(pos));
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
