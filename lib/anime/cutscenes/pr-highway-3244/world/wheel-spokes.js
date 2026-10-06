// GORDIUS WHEEL spokes (Fate/Zero, Ufotable). Naming wheel in the RIGHT THIRD of the t=3 still.
// Camera at t=3 is left-front of the seal (az ~0.84); the seal rides the left pauldron, so the king's-right
// wheel (local -x) faces the lens. Disc lives in the YZ plane. Not Rimuru, not a slime wheel.
//
// MATHS
//   p = (vUv * 2 - 1); r = |p|; a = atan(p.y, p.x) - uSpin
//   8 spokes: dθ = min_k wrap(a - k π/4); on = 1 - smoothstep(0.11, 0.11 + fwidth(r), |dθ|)
//   field stays filled (dark bronze) so the disc reads; spokes/rim/hub are lit cel metal
//   rim band |r - 0.90| < 0.10 ; hub r < 0.24 with 6 rivets at r=0.15
//   cel: v = clamp(0.48 + 0.44 * p.x, 0, 1); 3 steps at 0.34 / 0.68 via fwidth(r)
//   ink #1a0e16 on every edge (never #000). luma ≤ 0.92.
import { V } from "./common.js";

export const meta = {
  name: "wheel-spokes",
  params: {
    spokes: { default: 8 },
    ink: { default: "#1a0e16" },
    bronze: { default: "#c98a34" },
    gold: { default: "#ffc926" },
    shade: { default: "#8a4a1c" },
    lumaCap: { default: 0.92 },
  },
};

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `varying vec2 vUv; uniform float uSpin; uniform float uA;
  const vec3 INK = ${V("#1a0e16")};
  const vec3 BRZ = ${V("#c98a34")};
  const vec3 GLD = ${V("#ffc926")};
  const vec3 SHD = ${V("#8a4a1c")};
  const vec3 HUB = ${V("#e6b04a")};
  const vec3 FIELD = ${V("#2a2036")};
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float aa(float v, float t){ float w = fwidth(v) * 0.85 + 1e-5; return smoothstep(t - w, t + w, v); }
  vec3 cap(vec3 c){ return c * min(1.0, 0.92 / max(dot(c, LUMA), 1e-3)); }
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p); if (r > 1.0) discard;
    float a = atan(p.y, p.x) - uSpin;
    float dth = 1e5;
    for (int k = 0; k < 8; k++) {
      float t = a - float(k) * 0.785398163;
      dth = min(dth, abs(atan(sin(t), cos(t))));
    }
    float wr = fwidth(r) + 1e-5;
    float onSpoke = 1.0 - smoothstep(0.12, 0.12 + wr * 1.6, dth);
    float rim = 1.0 - smoothstep(0.10, 0.10 + wr * 1.4, abs(r - 0.90));
    float inner = 1.0 - smoothstep(0.035, 0.035 + wr, abs(r - 0.72));
    float hub = 1.0 - aa(r, 0.26);
    float riv = 0.0;
    for (int k = 0; k < 6; k++) {
      float t = float(k) * 1.047197 + 0.2;
      riv = max(riv, 1.0 - smoothstep(0.032, 0.032 + wr, length(p - 0.16 * vec2(cos(t), sin(t)))));
    }
    float v = clamp(0.46 + 0.48 * p.x + 0.08 * (1.0 - r), 0.0, 1.0);
    vec3 metal = mix(mix(SHD, BRZ, aa(v, 0.34)), GLD, aa(v, 0.68));
    vec3 col = FIELD;
    col = mix(col, metal, max(onSpoke, max(rim, inner)));
    col = mix(col, HUB, hub);
    col = mix(col, SHD, riv * 0.9);
    float edge = 1.0 - smoothstep(0.0, wr * 1.8 + 0.01, abs(r - 1.0));
    edge = max(edge, (1.0 - smoothstep(0.0, wr * 1.5 + 0.008, abs(dth - 0.12))) * onSpoke);
    edge = max(edge, 1.0 - smoothstep(0.0, wr * 1.4 + 0.008, abs(r - 0.26)));
    edge = max(edge, 1.0 - smoothstep(0.0, wr * 1.2 + 0.006, abs(r - 0.90)));
    col = mix(col, INK, edge * 0.94);
    gl_FragColor = vec4(cap(col), uA);
  }`;

const CART_FRAG = /* glsl */ `varying vec2 vUv; uniform float uA;
  const vec3 INK = ${V("#1a0e16")};
  const vec3 BRZ = ${V("#c98a34")};
  const vec3 GLD = ${V("#ffc926")};
  const vec3 SHD = ${V("#6a3a14")};
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float aa(float v, float t){ float w = fwidth(v) * 0.8 + 1e-5; return smoothstep(t - w, t + w, v); }
  vec3 cap(vec3 c){ return c * min(1.0, 0.92 / max(dot(c, LUMA), 1e-3)); }
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    if (abs(p.x) > 0.92 || p.y < -0.55 || p.y > 0.62) discard;
    float v = clamp(0.4 + 0.45 * p.x + 0.2 * p.y, 0.0, 1.0);
    vec3 col = mix(mix(SHD, BRZ, aa(v, 0.36)), GLD, aa(v, 0.72));
    float rail = step(0.38, p.y) * step(p.y, 0.58) * step(abs(p.x), 0.88);
    col = mix(col, GLD, rail * 0.55);
    float deck = step(-0.15, p.y) * step(p.y, 0.22);
    col = mix(col, SHD, deck * 0.25);
    float ink = max(1.0 - smoothstep(0.0, fwidth(p.x) * 1.6 + 0.012, abs(abs(p.x) - 0.92)), 0.0);
    ink = max(ink, 1.0 - smoothstep(0.0, fwidth(p.y) * 1.6 + 0.012, abs(p.y + 0.55)));
    ink = max(ink, 1.0 - smoothstep(0.0, fwidth(p.y) * 1.6 + 0.012, abs(p.y - 0.62)));
    col = mix(col, INK, ink * 0.9);
    gl_FragColor = vec4(cap(col), uA);
  }`;

function disc(THREE, uniforms, R) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSpin: uniforms.uSpin, uA: uniforms.uA },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), mat);
  mesh.frustumCulled = false;
  return { mesh, mat };
}

export function create(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "gordius-wheel";
  const uniforms = { uSpin: { value: 0 }, uA: { value: 1 } };

  // hero wheel: king's right, lifted into the t=3 lens (right third, beside the seated seal)
  const hero = disc(THREE, uniforms, 2.15);
  hero.mesh.position.set(-1.55, 2.85, -0.15);
  hero.mesh.rotation.y = Math.PI / 2;
  group.add(hero.mesh);

  const mate = disc(THREE, uniforms, 1.55);
  mate.mesh.position.set(-1.55, 2.55, -2.05);
  mate.mesh.rotation.y = Math.PI / 2;
  group.add(mate.mesh);

  const far = disc(THREE, uniforms, 1.45);
  far.mesh.position.set(1.48, 2.55, -0.15);
  far.mesh.rotation.y = Math.PI / 2;
  group.add(far.mesh);

  const cartMat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 1 } }, vertexShader: VERT, fragmentShader: CART_FRAG,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const cart = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.2), cartMat);
  cart.position.set(0.15, 2.95, -0.85);
  cart.rotation.y = 0.55;
  cart.frustumCulled = false;
  group.add(cart);

  group.userData.layer = 1;
  return {
    group, uniforms,
    update(t, speed = 0) { uniforms.uSpin.value = t * speed * 0.12; },
    dispose() { group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}

export function buildWheel(ctx) { return create(ctx); }
