// THE GLASS OCCLUSIONS: the occlude pack's shatter star (kind 0), focus lines (kind 1) and comic rings (kind 2) on one flat quad behind the seal.
// The masks are read as .r. Kind 0 is CORE with an INK halo, kind 1 ACCENT, kind 2 INK. `c` is a frame fraction with y down.
import { Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector4 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { TONE } from "../tone.js";

await loadPack("occlude");

const vec = (h) => { const n = parseInt(h.slice(1), 16); return `vec3(${[16, 8, 0].map((s) => (((n >> s) & 255) / 255).toFixed(4)).join(", ")})`; };
const FRAG = /* glsl */ `
  ${glslFor(["shatterStar", "focusLines", "ringStack"])}
  ${TONE}
  uniform vec2 uC; uniform vec4 uBox; uniform float uKind, uN, uHole, uSeed, uR0;
  const vec3 INK = ${vec("#06101c")}; const vec3 CORE = ${vec("#e9fdff")}; const vec3 ACCENT = ${vec("#37e8ff")};
  float occ(vec2 p, vec2 c) {
    if (uKind < 0.5) return shatterStar(p, vec3(0.0), vec3(1.0), c, uN).r;
    if (uKind < 1.5) return focusLines(p, vec3(0.0), vec3(1.0), c, uHole, uSeed).r;
    return ringStack(p, vec3(0.0), vec3(1.0), c, uR0).r;
  }
  float dil(vec2 p, vec2 c, float r) {
    float m = 0.0;
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982; m = max(m, occ(p + r * vec2(cos(a), sin(a)), c)); }
    return m;
  }
  void main() {
    vec2 p = gl_FragCoord.xy / uRes.y;
    if (uBox.z > 0.0 && length((gl_FragCoord.xy / uRes * 2.0 - 1.0 - uBox.xy) / uBox.zw) < 0.86) discard;
    vec2 c = vec2(uC.x * uRes.x / uRes.y, uC.y);
    vec3 col;
    if (uKind < 0.5) { if (occ(p, c) > 0.5) col = CORE; else if (dil(p, c, 0.007) > 0.5) col = INK; else discard; }
    else if (uKind < 1.5) { if (dil(p, c, 0.003) < 0.5) discard; col = ACCENT; }
    else { if (dil(p, c, 0.0035) < 0.5) discard; col = INK; }
    gl_FragColor = vec4(siteTone(col), 0.99);
  }`;

export function makeGlass(ctx) {
  const u = { uRes: ctx.engine.shared.uRes, uKind: { value: 0 }, uC: { value: new Vector2(0.5, 0.5) }, uBox: { value: new Vector4() }, uN: { value: 14 }, uHole: { value: 0.22 }, uSeed: { value: 1 }, uR0: { value: 0.1 } };
  const mat = new ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: "void main() { gl_Position = vec4(position.xy, 0.9995, 1.0); }",
    fragmentShader: FRAG,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1210; mesh.visible = false;
  return {
    mesh,
    set(kind, c, k, n) {
      const b = ctx.player?.box;
      u.uBox.value.set(b ? b[0] + b[2] - 1 : 0, b ? 1 - b[1] - b[3] : 0, b ? b[2] - b[0] : 0, b ? b[3] - b[1] : 0);
      mesh.visible = kind >= 0;
      if (kind < 0) return;
      u.uKind.value = kind; u.uC.value.set(c[0], 1 - c[1]);
      u.uN.value = n; u.uSeed.value = n; u.uHole.value = 0.22 + 0.6 * (1 - k); u.uR0.value = k;
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
