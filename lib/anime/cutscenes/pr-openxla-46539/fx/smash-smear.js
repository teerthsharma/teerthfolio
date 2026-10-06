// SMASH SMEAR (MHA, Bones). Local adapter.
// TOOLKIT: engine/anime:lib/anime/fx/smear.js
//
// MATHS
//   smrStretch(p, c, dir, k): q = p-c; a = q·dir; return c + q + dir*(a/k - a)  — sdf space stretched k along vel
//   ghost draws at head - vel*{0.36, 0.7, 1.0}, alpha {0.5, 0.3, 0.15}
//   teardrop body alpha 0.55, 3 white speed lines, 1.25x stretched cel ball, 2.5 px ink #12070a
//   Held residue from Nomu rise (t=1) so the t=3 still names smash; blooms at the smash beat.
import { AdditiveBlending, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";

export const meta = {
  name: "smear-frame",
  params: {
    stretch: { default: 1.25 },
    ink: { default: "#12070a" },
    body: { default: "#ffb02e" },
    shade: { default: "#c0431a" },
  },
};

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `varying vec2 vUv; uniform float uA; uniform vec2 uVel;
  const vec3 INK = vec3(0.071, 0.027, 0.039);
  const vec3 BODY = vec3(1.0, 0.690, 0.180);
  const vec3 SHD = vec3(0.753, 0.263, 0.102);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float sdCirc(vec2 p, float r){ return length(p) - r; }
  float fill(float d){ return 1.0 - smoothstep(0.0, fwidth(d) + 1e-4, d); }
  float stroke(float d, float px){ float w = fwidth(d) * px + 1e-4; return 1.0 - smoothstep(0.0, w, abs(d)); }
  vec4 over(vec4 dst, vec3 c, float a){ return vec4(c * a + dst.rgb * (1.0 - a), a + dst.a * (1.0 - a)); }
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    vec2 vel = uVel; float L = length(vel); vec2 dir = L > 1e-4 ? vel / L : vec2(1.0, 0.0);
    vec2 head = vec2(0.18, 0.05);
    vec4 o = vec4(0.0);
    for (int i = 3; i >= 1; i--) {
      float fi = float(i);
      vec2 c = head - vel * (fi == 1.0 ? 0.36 : fi == 2.0 ? 0.7 : 1.0);
      o = over(o, BODY, fill(sdCirc(p - c, 0.16 * (1.0 - 0.08 * fi))) * (fi == 1.0 ? 0.5 : fi == 2.0 ? 0.3 : 0.15));
    }
    vec2 q = p - head; float along = dot(q, dir); vec2 ps = head + q + dir * (along / 1.25 - along);
    float db = sdCirc(ps - head, 0.18);
    o = over(o, BODY, fill(db));
    o = over(o, SHD, fill(db) * (1.0 - fill(sdCirc(ps - head + vec2(0.04, -0.05), 0.18))));
    o = over(o, INK, stroke(db, 2.5));
    vec3 rgb = o.rgb * min(1.0, 0.92 / max(dot(o.rgb, LUMA), 1e-3));
    if (o.a < 0.02) discard;
    gl_FragColor = vec4(rgb, o.a * uA);
  }`;

export function create(ctx) {
  const { THREE } = ctx;
  const mat = new ShaderMaterial({
    uniforms: { uA: { value: 0 }, uVel: { value: new THREE.Vector2(0.55, 0.12) } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: AdditiveBlending, side: DoubleSide,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 12; mesh.name = "smash-smear";
  const at = ctx.scene?.seal?.at ?? [0, 0, 0];
  mesh.position.set(at[0] + 1.2, at[1] + 1.4, at[2] + 2.4);
  return {
    group: mesh,
    update(t, cue) {
      const smash = cue?.beat?.("smash")?.t ?? 8.58;
      const rise = cue?.beat?.("rise")?.t ?? 1.0;
      const held = t >= rise ? 0.55 : 0;
      const hit = t >= smash && t < smash + 0.45 ? 1 : 0;
      mat.uniforms.uA.value = Math.max(held, hit);
      const s = 3.2 + 2.4 * hit;
      mesh.scale.set(s, s * 0.55, 1);
      mesh.lookAt(ctx.player?.camera?.position ?? mesh.position);
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
