// MALEVOLENT SHRINE JAWS (Korean manhwa). Naming still: the maw must read at t=3.
// Geometry lives in shrine.js. This file is the look: inked teeth plate + one blood, rest-open so a hold names the jaws.
//
// MATHS
//   tooth row: 9 upper + 9 lower. Each tooth is a tapered capsule in card space
//     d = sdTaper(p, tip, gum, 0.012, 0.055); fill via fwidth
//   gum arc: y = ±(0.18 + 0.12 open); open floored at 0.28 from rise+0.2 so t=3 shows teeth
//   ink #0e0b0d silhouette. One blood drip: a falling capsule at x=0.12, y from 0.05 to -0.35
//   luma ≤ 0.92. Never #000.
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { SHRINE_Z, SCALE } from "./shrine.js";

export const meta = {
  name: "shrine-jaws",
  params: {
    ink: { default: "#0e0b0d" },
    tooth: { default: "#dbe4f0" },
    gum: { default: "#6a2636" },
    blood: { default: "#8a1a28" },
  },
};

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `varying vec2 vUv; uniform float uOpen; uniform float uA;
  const vec3 INK = vec3(0.055, 0.043, 0.051);
  const vec3 TOOTH = vec3(0.859, 0.894, 0.941);
  const vec3 GUM = vec3(0.416, 0.149, 0.212);
  const vec3 BLOOD = vec3(0.541, 0.102, 0.157);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float sdSeg(vec2 p, vec2 a, vec2 b, float r0, float r1){
    vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h) - mix(r0, r1, h);
  }
  float fill(float d){ return 1.0 - smoothstep(0.0, fwidth(d) + 1e-4, d); }
  void main(){
    vec2 p = vUv * 2.0 - 1.0; p.y *= 0.72;
    float open = clamp(uOpen, 0.18, 0.85);
    float gap = 0.10 + 0.22 * open;
    vec3 col = INK; float a = 0.0;
    // maw hole
    float hole = fill(length(p / vec2(0.92, 0.38 + 0.22 * open)) - 1.0);
    col = mix(col, INK, hole); a = max(a, hole * 0.92);
    // gums
    float gU = fill(sdSeg(p, vec2(-0.82, gap + 0.12), vec2(0.82, gap + 0.12), 0.09, 0.09));
    float gL = fill(sdSeg(p, vec2(-0.82, -gap - 0.12), vec2(0.82, -gap - 0.12), 0.09, 0.09));
    col = mix(col, GUM, max(gU, gL)); a = max(a, max(gU, gL));
    // teeth
    for (int i = 0; i < 9; i++) {
      float x = -0.72 + float(i) * 0.18;
      float dU = sdSeg(p, vec2(x, gap + 0.04), vec2(x * 0.96, gap - 0.16), 0.048, 0.016);
      float dL = sdSeg(p, vec2(x, -gap - 0.04), vec2(x * 0.96, -gap + 0.16), 0.048, 0.016);
      float t = max(fill(dU), fill(dL));
      col = mix(col, TOOTH, t);
      col = mix(col, INK, max(fill(abs(dU) - 0.006) * (1.0 - fill(dU - 0.002)), fill(abs(dL) - 0.006) * (1.0 - fill(dL - 0.002))) * 0.7);
      a = max(a, t);
    }
    // one blood
    float drip = fill(sdSeg(p, vec2(0.12, gap - 0.02), vec2(0.14, -0.08), 0.012, 0.006));
    col = mix(col, BLOOD, drip); a = max(a, drip);
    col *= min(1.0, 0.92 / max(dot(col, LUMA), 1e-3));
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a * uA);
  }`;

export function create(ctx) {
  const { THREE } = ctx;
  const mat = new ShaderMaterial({
    uniforms: { uOpen: { value: 0.28 }, uA: { value: 1 } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: DoubleSide,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.name = "shrine-jaws";
  const S = SCALE;
  mesh.position.set(0, 5.1 * S, SHRINE_Z + 6.6);
  mesh.scale.set(16 * S * 0.88, 11 * S, 1);
  return {
    group: mesh,
    update(t, open = 0.28) {
      mat.uniforms.uOpen.value = Math.max(0.28, open);
      mesh.visible = t >= 2.7;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
