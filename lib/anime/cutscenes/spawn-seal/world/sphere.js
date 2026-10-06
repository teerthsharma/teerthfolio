// spawn-seal WORLD: Veldora's barrier sphere (S1E1). A pale pearl shell, translucent so the cast can put the dragon inside it, with painted
// white water-polygons on #cfe0ff / #8aa0e0 (ref 05), a gold rim on each pulse, and ONE gold eye that opens at 2.8 s (frames 67-75).
// Layer 1. Centre SPH = (-4.6, gy + 3.3, -9.0), radius 2.4 m (exported as SPH for the other layers to read from ctx? they must not import this;
// the cast agent may place its dragon at the same numbers).
//
// SHELL SHADER (maths), d = normalize(P - C):
//   body  = mix(#8aa0e0, #cfe0ff, step(0.35, 0.5 + 0.5 d . L)),  alpha 0.16
//   water polygons: cell(d.xy * 2.4 + d.z * 1.7 + 0.05 t): white where id > 0.74 && d1 < 0.5 && edge > 0.12, alpha 0.9
//   rim = step(0.62, 1 - |N . V|)  -> #cfe0ff alpha 0.7; on a pulse (uShell) the rim goes #ffd25a
//   eye (axis e toward the seal; u = d . right, v = d . up2): almond |v| < lid (1 - (u / 0.42)^2), lid = 0.30 uEye;
//   iris #fff1a8 for |(u, v)| < 0.2 (values to 1.15: eyes bloom), slit pupil |u| < 0.03 #14102c, sclera ring #ffd25a, one white glint.
import { Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { C, SHARED_GLSL, V, win, clamp, smooth } from "./common.js";

export function buildSphere(ctx, S) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const centre = new Vector3(-4.6, S.gy + 3.3, -9.0);
  const U = { uC: { value: centre.clone() }, uEyeDir: { value: new Vector3(0.5, -0.1, 0.85).normalize() }, uEye: { value: 0 }, uShell: { value: 0 } };
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201, // over, keeping the target alpha (the set id)
    uniforms: { ...S.U, ...U },
    vertexShader: "varying vec3 vP, vN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP, vN; uniform vec3 uC, uEyeDir; uniform float uEye, uShell; ${SHARED_GLSL}
      vec2 hh(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      vec3 cell(vec2 p) {
        vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y)); vec2 o = hh(i + g); float d = length(g + o - f);
          if (d < d1) { d2 = d1; d1 = d; id = o.x; } else if (d < d2) d2 = d;
        }
        return vec3(d1, d2 - d1, id);
      }
      void main() {
        vec3 d = normalize(vP - uC), Vd = normalize(cameraPosition - vP), N = normalize(vN);
        vec3 col = mix(${V(C.pearlSh)}, ${V(C.pearl)}, step(0.35, 0.5 + 0.5 * dot(d, normalize(vec3(-0.4, 0.8, 0.45)))));
        float a = 0.16;
        vec3 c = cell(d.xy * 2.4 + d.z * 1.7 + 0.05 * uT);
        float poly = step(0.74, c.z) * step(c.x, 0.5) * step(0.12, c.y);
        col = mix(col, vec3(1.0), poly); a = max(a, poly * 0.9);
        float rim = step(0.62, 1.0 - abs(dot(N, Vd)));
        col = mix(col, mix(${V(C.pearl)}, ${V(C.shell)}, uShell), rim); a = max(a, rim * 0.7);
        vec3 e = normalize(uEyeDir), rt = normalize(cross(vec3(0.0, 1.0, 0.0), e)), up2 = cross(e, rt);
        float u = dot(d, rt), v = dot(d, up2), lid = 0.30 * uEye;
        float alm = step(0.0, dot(d, e)) * step(abs(u), 0.42) * step(abs(v), lid * (1.0 - (u / 0.42) * (u / 0.42)));
        vec3 ec = mix(${V(C.shell)}, ${V(C.veldora)} * 1.15, step(length(vec2(u, v * 1.4)), 0.2));
        ec = mix(ec, ${V("#14102c")}, step(abs(u), 0.03) * step(abs(v), lid * 0.9));
        ec = mix(ec, vec3(1.0), step(length(vec2(u + 0.08, v - 0.05 * uEye)), 0.022));
        col = mix(col, ec, alm); a = max(a, alm);
        gl_FragColor = vec4(worldFinish(col, vP), a);
      }`,
  });
  const geo = new SphereGeometry(2.4, 48, 32);
  const mesh = new Mesh(geo, mat); mesh.position.copy(centre); mesh.frustumCulled = false; mesh.renderOrder = 5;
  group.add(mesh);

  function update(cue, S2) {
    const t = cue.ts;
    // eye: opens over 8 frames from 2.8 s, holds, closes by 4.4 s (one gold-eye event)
    const open = smooth(win(cue, "veldora_eye", 2.8, 3.1) * 1.0), close = smooth((t - 4.1) / 0.3);
    U.uEye.value = clamp(open - close);
    // pulses: period 0.6 s from 2.8 s to 4.4 s (the sphere pulses as the pup looks up); a faint idle breath after
    const p = t >= 2.8 && t < 4.4 ? 0.5 + 0.5 * Math.sin((t - 2.8) * Math.PI * 2 / 0.6 - Math.PI / 2) : 0;
    U.uShell.value = p;
    mesh.scale.setScalar(1 + 0.035 * p + 0.008 * Math.sin(t * 1.7));
    const sp = S2.sealPos; U.uEyeDir.value.set(sp.x - centre.x, sp.y + 1.0 - centre.y, sp.z - centre.z).normalize();
  }
  return { group, mesh, centre, update, dispose() { geo.dispose(); mat.dispose(); } };
}
