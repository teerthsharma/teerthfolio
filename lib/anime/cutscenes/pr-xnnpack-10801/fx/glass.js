// The glass occlusion: the crack star (kind 1) and the hold's focus lines (kind 2), the occlude pack's masks drawn in ink or cold blue
// on one flat quad behind the seal. The quad passes no frame colour: the mask is read as .r and thresholded.
import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";

await loadPack("occlude");

const vec = (hex) => { const n = parseInt(hex.slice(1), 16); return `vec3(${[16, 8, 0].map((s) => (((n >> s) & 255) / 255).toFixed(4)).join(", ")})`; };
const FRAG = /* glsl */ `
  ${glslFor(["shatterStar", "focusLines"])}
  uniform vec2 uC; uniform float uKind, uN, uHole, uSeed, uBlue;
  const vec3 XC_INK = ${vec("#080a0f")}; const vec3 XC_BLUE = ${vec("#5fb6ff")};
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes; vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
    vec2 c = vec2(uC.x * uRes.x / uRes.y, uC.y);
    float m = uKind < 1.5 ? shatterStar(p, vec3(0.0), vec3(1.0), c, uN).r
                          : focusLines(p, vec3(0.0), vec3(1.0), c, uHole, uSeed).r;
    if (m < 0.5) discard;
    gl_FragColor = vec4(mix(XC_INK, XC_BLUE, uBlue * step(0.985, fract(atan(p.y - c.y, p.x - c.x) * 9.549))), 0.99);
  }`;

// c is in frame fractions with y up (the gl_FragCoord frame); kind 0 hides the quad
export function makeGlass(ctx) {
  const u = { uRes: ctx.engine.shared.uRes, uKind: { value: 0 }, uC: { value: new Vector2(0.5, 0.5) }, uN: { value: 18 }, uHole: { value: 0.6 }, uSeed: { value: 1 }, uBlue: { value: 0 } };
  const mat = new ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: true,
    vertexShader: "void main() { gl_Position = vec4(position.xy, 0.9995, 1.0); }",
    fragmentShader: FRAG,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1210; mesh.visible = false; // above the panels (1200), or the paper field hides it
  return {
    mesh,
    set(kind, c, k, n) {
      mesh.visible = kind > 0;
      if (!kind) return;
      u.uKind.value = kind; u.uC.value.set(c[0], c[1]); u.uBlue.value = kind === 2 ? 1 : 0;
      u.uN.value = n; u.uHole.value = k; u.uSeed.value = n;
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
