// STAR FIELDS (bible 3.2) and GALAXIES (3.3).
//
// Stars: 1500 points on three parallax layers (z -24..-36, -56..-76, -100..-135 m). The brightest 8% are 4-point sparkles, the rest hard round dots
//   (no soft glow). Parallax: x' = wrap(x + drift * speed_layer), drift = the flow clock, so everything hangs still from 8.6 s. Twinkle is stepped
//   (the layer clock is twos): tw = 0.7 + 0.3 sin(floor(6 drift + 40 s)).
//   dot:     inside if |c| < 0.55
//   sparkle: inside if |c.x|^0.6 + |c.y|^0.6 < 0.9   (astroid, concave 4-point)
// Galaxies: log-spiral arms  arm = 0.5 + 0.5 cos(N (theta - .02 t) - 7.5 ln(r + .06)), dens = arm^2.2 exp(-2.4 r)(.5 + grain) + 1.9 exp(-13 r),
//   POSTERISED to 3 flat bands, alpha capped at 0.5 (dim depth only, bible 3.3).
import { BufferAttribute, BufferGeometry, DoubleSide, Euler, Group, Mesh, PlaneGeometry, Points, ShaderMaterial } from "three";
import { ADD, NOISE, OUT, hash, hx, u, flowAt, presence, startOf, TL } from "./shared.js";

const LAYERS = [{ z: [-24, -36], half: 38, size: 6.0 }, { z: [-56, -76], half: 74, size: 4.5 }, { z: [-100, -135], half: 130, size: 3.5 }];
const GALAXIES = [
  { at: [-40, 27, -108], size: 72, rot: [-0.7, 0, 0.5], a: "#8f5cf5", b: "#eb75db", arms: 2, seed: 3 },
  { at: [48, 14, -120], size: 58, rot: [-1.0, 0, -0.6], a: "#6699ff", b: "#b380ff", arms: 3, seed: 8 },
  { at: [10, 33, -128], size: 50, rot: [-0.55, 0, 0.1], a: "#ccb3ff", b: "#8066f2", arms: 2, seed: 15 },
];

export default function stars(ctx) {
  const group = new Group();
  const shared = ctx.engine.shared;
  const n = 1500, pos = new Float32Array(n * 3), a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const l = i % 3, L = LAYERS[l], z = L.z[0] + (L.z[1] - L.z[0]) * hash(i, 1);
    pos[i * 3] = (hash(i, 2) * 2 - 1) * L.half;
    pos[i * 3 + 1] = -3 + hash(i, 3) ** 0.8 * (Math.abs(z) * 0.78 + 8);
    pos[i * 3 + 2] = z;
    a.set([l, hash(i, 4), L.size * (0.5 + 0.8 * hash(i, 5) ** 3), hash(i, 6)], i * 4);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aA", new BufferAttribute(a, 4));
  const sm = new ShaderMaterial({
    uniforms: { uDrift: u(0), uFade: u(0), uRes: shared.uRes },
    transparent: true, depthWrite: false, ...ADD,
    vertexShader: /* glsl */ `
      attribute vec4 aA; uniform float uDrift, uFade; uniform vec2 uRes; varying vec3 vC; varying float vSp;
      void main() {
        float L = aA.x, spd = L < 0.5 ? 1.7 : (L < 1.5 ? 0.7 : 0.26), rng = L < 0.5 ? 38.0 : (L < 1.5 ? 74.0 : 130.0);
        vec3 p = position; p.x = mod(p.x + uDrift * spd + rng, 2.0 * rng) - rng;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        float tw = 0.7 + 0.3 * sin(floor(uDrift * 6.0 + aA.y * 40.0) * 2.7 + aA.y * 60.0);
        float edge = 1.0 - smoothstep(0.82, 1.0, abs(p.x) / rng);
        vSp = step(0.92, aA.y);
        gl_PointSize = aA.z * (uRes.y / 720.0) * tw * edge * (1.0 + 1.6 * vSp) * uFade;
        vC = aA.w < 0.6 ? ${hx("#f2eeff")} : (aA.w < 0.86 ? ${hx("#b89eff")} : ${hx("#99c7ff")});
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vSp; ${NOISE} ${OUT}
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float d = vSp > 0.5 ? (star4(c) - 0.9) : (length(c) - 0.55);
        float w = fwidth(d) + 1e-4, cov = 1.0 - smoothstep(-w, w, d);
        emit(vC, cov);
      }`,
  });
  const pts = new Points(g, sm); pts.frustumCulled = false; pts.userData.layer = 1; group.add(pts);

  const gms = GALAXIES.map((s) => {
    const m = new ShaderMaterial({
      uniforms: { uT: u(0), uArms: u(s.arms), uSeed: u(s.seed), uFade: u(0) },
      transparent: true, depthWrite: false, side: DoubleSide, ...ADD,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform float uT, uArms, uSeed, uFade; varying vec2 vUv; ${NOISE} ${OUT}
        void main() {
          float r = length(vUv); if (r > 1.0) discard;
          float an = atan(vUv.y, vUv.x + 1e-4);
          float arm = pow(0.5 + 0.5 * cos(uArms * (an - uT * 0.02) - 7.5 * log(r + 0.06)), 2.2);
          float dens = arm * exp(-r * 2.4) * (0.5 + fbm(vUv * 7.0 + uSeed)) + exp(-r * 13.0) * 1.9;
          float band = floor(clamp(dens, 0.0, 1.0) * 3.0 + 0.5) / 3.0; // 3 flat bands
          vec3 col = mix(${hx("#f7ebff")}, mix(${hx(s.a)}, ${hx(s.b)}, smoothstep(0.1, 0.8, r)), smoothstep(0.0, 0.3, r));
          emit(col * (0.55 + 0.45 * band), band * (1.0 - smoothstep(0.78, 1.0, r)) * uFade * 0.5);
        }`,
    });
    const mesh = new Mesh(new PlaneGeometry(1, 1), m);
    mesh.position.set(...s.at); mesh.scale.setScalar(s.size); mesh.rotation.copy(new Euler(...s.rot));
    mesh.frustumCulled = false; mesh.userData.layer = 1; mesh.renderOrder = -2; group.add(mesh);
    return m;
  });

  return {
    group,
    update(t, cue) {
      const f = presence(t, 0.0, startOf(cue, "clear", TL.voidEnd));
      sm.uniforms.uDrift.value = flowAt(t, startOf(cue, "freeze", TL.freeze));
      sm.uniforms.uFade.value = f;
      for (const m of gms) { m.uniforms.uFade.value = f; m.uniforms.uT.value = sm.uniforms.uDrift.value; }
    },
    dispose() { g.dispose(); sm.dispose(); for (const m of gms) m.dispose(); },
  };
}
