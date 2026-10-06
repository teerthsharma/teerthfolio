// ULTRA INSTINCT ARENA (Toei DBS, Tournament of Power). Naming still for pr-nemo-relay-481.
// A gold-seam ring and mosaic wash over the existing tile disc so t=3 names the stage.
//
// MATHS
//   ring: d = |length(xz) - 24|; on = 1 - smoothstep(0.18, 0.18+fwidth, d)
//   seams: 23 terracotta ticks (the PR's 23 files) via min_k wrap(a - k*2π/23) * R
//   cel floor: 3 tones cream / terra / navy from fbm(0.08 xz), steps 0.38 / 0.70
//   ink #2a2a3e (never #000). luma ≤ 0.92. Gold #f0c030 on the rim only.
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";

export const meta = {
  name: "mosaic-tile-disc",
  params: {
    radius: { default: 24 },
    ticks: { default: 23 },
    gold: { default: "#f0c030" },
    ink: { default: "#2a2a3e" },
  },
};

const VERT = /* glsl */ `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = (noise) => /* glsl */ `varying vec3 vL;
  ${noise}
  const vec3 INK = vec3(0.165, 0.165, 0.243);
  const vec3 CRM = vec3(0.910, 0.847, 0.753);
  const vec3 TER = vec3(0.659, 0.416, 0.282);
  const vec3 NAV = vec3(0.165, 0.165, 0.243);
  const vec3 GLD = vec3(0.941, 0.753, 0.188);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float aa(float v, float t){ float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
  void main(){
    vec2 p = vL.xz; float r = length(p); if (r > 25.2) discard;
    float n = fbm(p * 0.08);
    vec3 col = mix(mix(NAV, TER, aa(n, 0.38)), CRM, aa(n, 0.70));
    float a = atan(p.x, p.z);
    float tick = 1e5;
    for (int k = 0; k < 23; k++) {
      float t = a - float(k) * 0.27318;
      t = atan(sin(t), cos(t));
      tick = min(tick, abs(t) * r);
    }
    col = mix(col, INK, (1.0 - smoothstep(0.04, 0.04 + fwidth(tick) * 1.2, tick)) * step(7.2, r) * 0.8);
    float rim = 1.0 - smoothstep(0.18, 0.18 + fwidth(r) * 1.4, abs(r - 8.4));
    col = mix(col, GLD, rim * 0.9);
    float outer = 1.0 - smoothstep(0.22, 0.22 + fwidth(r) * 1.4, abs(r - 24.0));
    col = mix(col, GLD, outer * 0.7);
    float inner = 1.0 - smoothstep(0.08, 0.08 + fwidth(r), abs(r - 2.5));
    col = mix(col, TER, inner * 0.6);
    col *= min(1.0, 0.92 / max(dot(col, LUMA), 1e-3));
    gl_FragColor = vec4(col, 0.5);
  }`;

export function create(ctx) {
  const { THREE } = ctx;
  const mat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG(ctx.tools.glslFor(["noise"])),
    side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new Mesh(new PlaneGeometry(52, 52).rotateX(-Math.PI / 2), mat);
  mesh.position.y = 0.04; mesh.frustumCulled = false; mesh.name = "ui-arena";
  mesh.userData.layer = 0;
  return { group: mesh, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}

export function buildArena(ctx) { return create(ctx); }
