// GORDIUS ROAD (Fate/Zero, Ufotable). Naming still for pr-highway-3244.
// One painted plane in the chariot frame (x across, +z travel). Not Tensura, not a slime road.
//
// MATHS
//   half-width  hw = 7.4 + 5.2 smoothstep(28, 42, z)     apron opens past the far chequer
//   desert      3-tone cel of fbm(0.11 P): hollow #e07f47, lit #f2ad66, crest #ffd18c
//               key from the sunset: k = clamp(Nfake · L, 0, 1), L = normalize(0.78, 0.09, -0.62)
//               Nfake = normalize((-dFbm/dx, 0.55, -dFbm/dz)); steps at 0.34 / 0.68 via fwidth
//   asphalt     |x| < hw: two flat tones #3a3440 / #241e2e where fbm(0.55 P) > 0.58
//   kerb        |x| in [hw, hw+0.85]: 2 m #e23a2e / #fbf5ea stripes, 1 px ink via fwidth
//   mint slice  x in [1.05, 3.15], z in [1.2, 16]: #5dffc2 at 0.14 + chevron step(0.5, fract(14z - D))
//   luma        cap 0.92 so the cream paint never blooms. Ink #1a0e16, never #000.
import { PAL, V, SUN } from "./common.js";

export const meta = {
  name: "gordius-road",
  params: {
    ink: { default: "#1a0e16" },
    mint: { default: "#5dffc2" },
    cream: { default: "#fbf5ea" },
    lumaCap: { default: 0.92 },
  },
};

const VERT = /* glsl */ `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = (noise) => /* glsl */ `varying vec3 vL;
  uniform float uD; uniform vec3 uSun;
  ${noise}
  const vec3 INK = ${V("#1a0e16")};
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float aa(float v, float t){ float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
  float line(float d, float h){ float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(h - w, h + w, abs(d)); }
  vec3 cap(vec3 c){ return c * min(1.0, 0.92 / max(dot(c, LUMA), 1e-3)); }
  void main(){
    float x = vL.x, z = vL.z, ax = abs(x);
    float hw = 7.4 + 5.2 * smoothstep(28.0, 42.0, z);
    if (ax > 22.0) discard;
    vec2 P = vec2(x, z);
    float n = fbm(P * 0.11);
    float e = 0.08;
    vec3 N = normalize(vec3(fbm(P * 0.11 + vec2(e, 0.0)) - n, 0.55, fbm(P * 0.11 + vec2(0.0, e)) - n));
    float lit = dot(N, normalize(uSun)) * 0.5 + 0.5;
    vec3 desert = mix(mix(${V(PAL.groundHollow)}, ${V(PAL.groundLit)}, aa(lit, 0.34)), ${V(PAL.groundCrest)}, aa(lit, 0.68));
    desert = mix(desert, ${V(PAL.groundInk)}, 0.18 * aa(n, 0.72));
    vec3 col = desert;
    float onRoad = 1.0 - aa(ax, hw);
    vec3 tar = mix(${V(PAL.asphalt)}, ${V(PAL.asphaltShadow)}, aa(fbm(P * 0.55), 0.58));
    tar = mix(tar, ${V(PAL.asphaltShadow)}, 0.5 * line(fract(z / 12.0) * 12.0, 0.045));
    float dash = step(fract((z + uD) / 6.0), 0.5);
    tar = mix(tar, ${V(PAL.cream)} * 0.88, max(line(ax - 2.55, 0.055), line(ax - 5.1, 0.055)) * dash);
    col = mix(col, tar, onRoad);
    float kb = aa(ax, hw) * (1.0 - aa(ax, hw + 0.85));
    vec3 kc = mix(${V(PAL.kerbRed)}, ${V(PAL.cream)} * 0.88, mod(floor(z / 2.0), 2.0));
    col = mix(col, kc, kb);
    col = mix(col, INK, 0.8 * max(line(ax - hw, 0.035), line(ax - hw - 0.85, 0.035)));
    float slice = step(1.05, x) * step(x, 3.15) * step(1.2, z) * step(z, 16.0);
    float chev = step(0.5, fract(z * 14.0 - uD * 0.35));
    col = mix(col, ${V("#5dffc2")}, slice * (0.12 + 0.06 * chev));
    gl_FragColor = vec4(cap(col), 0.5);
  }`;

export function create(ctx, opts = {}) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "gordius-road";
  const uniforms = { uD: { value: 0 }, uSun: { value: new THREE.Vector3(...SUN) } };
  const noise = ctx.tools.glslFor(["noise"]);
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG(noise),
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(48, 90).rotateX(-Math.PI / 2).translate(0, 0, 18), mat);
  mesh.position.y = 0.018; mesh.frustumCulled = false; mesh.userData.layer = 1;
  group.add(mesh);
  // receding plate so the t=3 up-shot still names the road (behind the chariot, facing the lens)
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(36, 22), mat);
  plate.position.set(0.4, 4.2, -9.5);
  plate.rotation.x = -0.38;
  plate.frustumCulled = false; plate.userData.layer = 1;
  group.add(plate);
  return {
    group, mesh: group, uniforms,
    update(t, D = 0) { uniforms.uD.value = D; },
    dispose() { mesh.geometry.dispose(); plate.geometry.dispose(); mat.dispose(); },
  };
}

export function buildRoad(ctx) { return create(ctx); }
