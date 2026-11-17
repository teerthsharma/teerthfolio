// The sunset sphere the classroom is drawn inside: the live shell with its gradient and sun kept, its bands stepped and its clouds
// taken from the shader table (ptvSkyCloud). It grows out of the pup at the swell and shrinks at the collapse; world/index.js calls set().
import { DoubleSide, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { skyShell } from "../live/room.js";

await loadPack("prettytv");
const SKY = glslFor(["ptvSkyBands"]);

const VERT = "varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FRAG = /* glsl */ `
  varying vec3 vD;
  ${SKY}
  void main() {
    float h = clamp(vD.y * 0.5 + 0.5, 0.0, 1.0);
    float band = floor(smoothstep(0.3, 0.85, h) * 7.0) / 6.0;
    vec3 c = mix(vec3(1.0, 0.8, 0.5), vec3(0.62, 0.62, 0.95), band);
    float cl = step(0.55, ptvSkyCloud(vec2(atan(vD.x, vD.z) * 1.6, vD.y * 5.0), h)) * smoothstep(0.52, 0.4, h) * smoothstep(0.28, 0.36, h);
    c = mix(c, mix(vec3(1.0, 0.84, 0.72), vec3(0.72, 0.62, 0.9), step(0.46, h)), cl * 0.9);
    c = mix(c, vec3(1.0, 0.96, 0.78), step(length(vec2(vD.x + 0.6, vD.y - 0.18)), 0.07));
    gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
  }`;

export function buildShell(ctx) {
  const mesh = skyShell();
  mesh.material.dispose();
  mesh.material = new ShaderMaterial({
    side: DoubleSide,
    depthWrite: false,
    uniforms: { uPtvSeed: { value: 0 }, uPtvSkyBands: { value: 7 }, uPtvSkyDusk: { value: 1 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  mesh.position.set(0, 0.9, 0);
  const set = (r, inside) => {
    mesh.visible = r > 0.02;
    mesh.scale.setScalar(inside ? 150 : Math.max(r, 0.02));
  };
  return { mesh, set, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } };
}
