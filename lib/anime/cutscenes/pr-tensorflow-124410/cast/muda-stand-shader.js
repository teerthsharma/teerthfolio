// MUDA STAND look (JoJo Part 3, The World). Naming still for the stand at t=3.
// Protected look energy is fine; no copied face. Hatch + gold rim so the hulk names in a hold.
// TOOLKIT: engine/anime:lib/anime/fx/aura-outline.js  (local adapter)
//
// MATHS
//   rim = (1 - n·v)^2.4, gold #d0a020 at the lip, cream #f0dea4 fill at 0.22 alpha
//   hatch in shadow: screen (x+y)/6 px, |fract-0.5|*2 > 0.78
//   ink #05020a via fwidth on the rim. luma ≤ 0.92. Centre stays empty so the seal is never tinted.
import { AdditiveBlending, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";

export const meta = {
  name: "stand-aura-edge",
  params: {
    ink: { default: "#05020a" },
    gold: { default: "#d0a020" },
    cream: { default: "#f0dea4" },
  },
};

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `varying vec2 vUv; uniform float uA;
  const vec3 INK = vec3(0.0196, 0.0078, 0.0392);
  const vec3 GLD = vec3(0.816, 0.627, 0.125);
  const vec3 CRM = vec3(0.941, 0.871, 0.643);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0 || r < 0.42) discard;
    float rim = smoothstep(0.42, 0.50, r) * (1.0 - smoothstep(0.86, 1.0, r));
    float a = atan(p.y, p.x);
    float tongue = 0.5 + 0.5 * sin(a * 11.0 + 2.4);
    float band = rim * (0.55 + 0.45 * tongue);
    float hp = (gl_FragCoord.x + gl_FragCoord.y) / 6.0;
    float hatch = smoothstep(0.76, 0.84, abs(fract(hp) - 0.5) * 2.0);
    vec3 col = mix(CRM, GLD, smoothstep(0.7, 0.92, r));
    col = mix(col, col * 0.55, hatch * 0.45);
    col = mix(col, INK, (1.0 - smoothstep(0.0, fwidth(r) * 1.4 + 0.01, abs(r - 0.92))) * 0.85);
    col *= min(1.0, 0.92 / max(dot(col, LUMA), 1e-3));
    gl_FragColor = vec4(col, band * uA);
  }`;

export function create(ctx) {
  const { THREE } = ctx;
  const mat = new ShaderMaterial({
    uniforms: { uA: { value: 0 } }, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.name = "muda-stand-shader";
  const tmp = new Vector3();
  return {
    group: mesh,
    update(t, marks) {
      const vis = marks?.standVisible;
      mesh.visible = !!vis;
      if (!vis) { mat.uniforms.uA.value = 0; return; }
      const grow = Math.min(1, Math.max(0, (t - 3.0) / 0.15 + 0.85));
      mat.uniforms.uA.value = 0.85 * grow;
      const p = marks.fistL && marks.fistR
        ? tmp.copy(marks.fistL).add(marks.fistR).multiplyScalar(0.5)
        : tmp.set(ctx.seal.at[0], ctx.seal.at[1] + 1.8, ctx.seal.at[2] - 2.2);
      p.y += 0.4;
      mesh.position.copy(p);
      mesh.lookAt(ctx.camera?.object?.position ?? ctx.player?.camera?.position ?? p);
      const s = 3.6 * (ctx.seal.scale || 1);
      mesh.scale.set(s, s * 1.35, 1);
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
