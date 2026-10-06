// THE INFORMATION FLOOD (bible 3.5, 6.3): 440 hard-edged, flat-colour star-line streaks converging on the core. Taper to a point (the quad IS the
// tapered triangle), no soft falloff; 12% are tiny square CHIPS (dashed squares, no letters, L10). Moves on threes (8/s); freezes with the flow clock at 8.6 s.
//
// MATHS (vertex): ribbon i has a far anchor F_i (24..119 m, upper hemisphere biased); path(s) = core + R(ang(s)) F_i k(s), k = (1 - s)^1.7
//   (s = 0 far, 1 at the core), ang = (1 - k)(.8 + 1.4 w) +/- (swirl);  head = fract(z_i + flow (.15 + .2 w)); tail s = head - len (1 - uv.y).
//   screen-facing width: side = normalize(T x toCam); wp += side x_local 2 w, w = (.0016 + .0022 y)(1.4) dist (uv.y)  -> constant pixel width, point at the tail.
//   flow = floor(8 * flowAt(t)) / 8 (threes).  SEAL GUARD: alpha *= sealGuard(): streaks in front of the seal fade out (L1/L2: never covered).
// Colours flat: #e6d6ff 70%, #8cb8ff 16%, #c775f2 14%. Fully frozen from the freeze on, dimmed to 35% so the Void hangs behind the hold.
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { ADD, CORE, GUARD_V, NOISE, OUT, TL, flowAt, hash, hx, presence, smooth, startOf, u } from "./shared.js";

export default function flood(ctx) {
  const n = 440, tpl = new PlaneGeometry(1, 1, 1, 8), vc = tpl.attributes.position.count, ic = tpl.index.count;
  const gp = new Float32Array(n * vc * 3), guv = new Float32Array(n * vc * 2), gi = new Uint32Array(n * ic), seed = new Float32Array(n * vc * 4), far = new Float32Array(n * vc * 3);
  for (let i = 0; i < n; i++) {
    let x, y, z, l, k = 0;
    do { x = hash(i, 11 + k) * 2 - 1; y = hash(i, 31 + k) * 2 - 1; z = hash(i, 51 + k) * 2 - 1; l = Math.hypot(x, y, z); k += 3; } while ((l > 1 || l < 0.2) && k < 60);
    const R = 24 + 95 * hash(i, 71) ** 1.4;
    x = (x / l) * R; y = (Math.abs(y / l) * 0.95 - 0.05) * R * 0.8; z = (z / l) * R;
    if (CORE[2] + z > 2.5) z = -Math.abs(z) * 0.5 - 8;
    for (let v = 0; v < vc; v++) {
      const o = i * vc + v;
      gp.set(tpl.attributes.position.array.subarray(v * 3, v * 3 + 3), o * 3);
      guv.set(tpl.attributes.uv.array.subarray(v * 2, v * 2 + 2), o * 2);
      seed.set([hash(i, 1), hash(i, 2), hash(i, 3), hash(i, 4)], o * 4);
      far.set([x, y, z], o * 3);
    }
    for (let q = 0; q < ic; q++) gi[i * ic + q] = tpl.index.array[q] + i * vc;
  }
  tpl.dispose();
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(gp, 3)); g.setAttribute("uv", new BufferAttribute(guv, 2));
  g.setAttribute("aSeed", new BufferAttribute(seed, 4)); g.setAttribute("aFar", new BufferAttribute(far, 3));
  g.setIndex(new BufferAttribute(gi, 1));
  const m = new ShaderMaterial({
    uniforms: { uFlow: u(0), uFade: u(0), uCoreL: u(new ctx.THREE.Vector3(...CORE)), uSeal: u(new ctx.THREE.Vector3()), uSealS: u(1), uRes: ctx.engine.shared.uRes },
    transparent: true, depthWrite: false, side: DoubleSide, ...ADD,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; attribute vec3 aFar; uniform float uFlow; uniform vec3 uCoreL;
      varying vec2 vUv; varying vec4 vSeed; varying float vHead, vGuard;
      ${GUARD_V}
      vec3 pathAt(float s) {
        float k = pow(1.0 - s, 1.7), ang = (1.0 - k) * (0.8 + 1.4 * aSeed.w) * (aSeed.x > 0.5 ? 1.0 : -1.0);
        vec3 r = aFar * k; float c = cos(ang), sn = sin(ang);
        return uCoreL + vec3(r.x * c - r.y * sn, r.x * sn + r.y * c, r.z);
      }
      void main() {
        float chip = step(0.88, aSeed.y);
        float head = fract(aSeed.z + uFlow * (0.15 + 0.2 * aSeed.w));
        float len = 0.06 + 0.11 * aSeed.y;
        float s = max(head - len * (1.0 - uv.y), 0.0);
        vec3 P = pathAt(s), T = pathAt(min(s + 0.012, 1.0)) - pathAt(max(s - 0.012, 0.0));
        vec4 wp = modelMatrix * vec4(P, 1.0);
        vec3 Tw = normalize(mat3(modelMatrix) * T + 1e-5), toCam = cameraPosition - wp.xyz;
        float dist = length(toCam);
        vec3 side = cross(Tw, toCam); side = length(side) > 1e-4 ? normalize(side) : vec3(0.0, 1.0, 0.0);
        float w = (0.0016 + 0.0022 * aSeed.y) * 1.4 * dist * mix(uv.y, 1.3, chip); // taper to a point; chips keep a square
        wp.xyz += side * position.x * 2.0 * w;
        vUv = uv; vSeed = aSeed; vHead = head;
        gl_Position = projectionMatrix * viewMatrix * wp;
        vGuard = sealGuard(gl_Position);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFade, uFlow; varying vec2 vUv; varying vec4 vSeed; varying float vHead, vGuard; ${NOISE} ${OUT}
      void main() {
        float chip = step(0.88, vSeed.y);
        float dash = step(0.5, fract(vUv.y * 6.0 - uFlow * 1.5 * (0.5 + vSeed.y) + vSeed.z * 9.0));
        float life = smoothstep(0.0, 0.1, vHead) * (1.0 - smoothstep(0.88, 1.0, vHead));
        vec3 col = vSeed.x < 0.7 ? ${hx("#e6d6ff")} : (vSeed.x < 0.86 ? ${hx("#8cb8ff")} : ${hx("#c775f2")});
        emit(col, mix(1.0, dash, chip) * life * uFade * vGuard);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false; mesh.userData.layer = 1; mesh.renderOrder = -1;
  const tmp = new ctx.THREE.Vector3();
  return {
    group: mesh,
    update(t, cue) {
      const fz = startOf(cue, "freeze", TL.freeze);
      m.uniforms.uFlow.value = Math.floor(flowAt(t, fz) * 8) / 8; // threes
      ctx.seal.chest(tmp); m.uniforms.uSeal.value.copy(tmp); m.uniforms.uSealS.value = ctx.seal.scale ?? 1;
      const a = startOf(cue, "flood", TL.floodA);
      m.uniforms.uFade.value = presence(t, 0.0, startOf(cue, "clear", TL.voidEnd)) * smooth((t - a) / 0.5) * (1 - 0.65 * smooth((t - fz) / 0.5));
    },
    dispose() { g.dispose(); m.dispose(); },
  };
}
