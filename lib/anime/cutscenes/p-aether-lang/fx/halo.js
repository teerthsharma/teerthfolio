// MAPPA halos on the blue and red orbs (tier 2 and up): the pack rings as one full-frame additive quad.
import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";

await loadPack("mappa");
const PULL = ["mappaOrbBlue", "mappaRedCore"];
const GLSL = glslFor(PULL);

const VS = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FS = /* glsl */ `
  uniform vec2 uRes; uniform vec2 uBC; uniform vec2 uRC; uniform float uBR; uniform float uRR; uniform float uI; uniform float uT;
  ${GLSL}
  void main() {
    vec2 p = vec2(gl_FragCoord.x / uRes.y, gl_FragCoord.y / uRes.y);
    vec3 c = mpOrbBlue(vec3(0.0), p, uBC, uBR * 0.8, uBR * 1.76, uI);
    c = mpRedCore(c, p, uRC, uRR * 0.8, uI, 1.6, floor(uT * 12.0) / 12.0);
    gl_FragColor = vec4(c, 1.0);
  }`;

export function buildHalo(ctx) {
  if (!ctx.atTier(2)) return null;
  const uRes = ctx.engine?.shared?.uRes ?? { value: new Vector2(1280, 720) };
  const u = { uRes, uBC: { value: new Vector2() }, uRC: { value: new Vector2() }, uBR: { value: 0 }, uRR: { value: 0 }, uI: { value: 0 }, uT: { value: 0 }, ...uniformsFor(PULL) };
  const mat = new ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, blending: AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 30; mesh.visible = false;
  return {
    mesh,
    update(blue, red, I, t) {
      mesh.visible = I > 0.001;
      u.uBC.value.set(blue.c[0], blue.c[1]); u.uBR.value = blue.r;
      u.uRC.value.set(red.c[0], red.c[1]); u.uRR.value = red.r;
      u.uI.value = I; u.uT.value = t;
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
