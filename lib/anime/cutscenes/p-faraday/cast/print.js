// PRINT for p-faraday: the character in the blueprint's inks, burned to char from the feet up; each material's main() is wrapped once at build.
import { Box3, BackSide, Vector2, Vector4 } from "three";
import { TONE } from "../tone.js";

const MAIN = /void\s+main\s*\(\s*\)/;
// uBpPart: 0 fur, face and hair; 1 cloth (vest, sleeves); 2 limbs (fur grey); 3 amber (coin)
const INK = /* glsl */ `
  ${TONE}
  uniform vec4 uBp; uniform vec2 uBq; uniform float uBpPart;
  const vec3 P_FUR0 = vec3(0.357, 0.400, 0.467), P_FUR1 = vec3(0.604, 0.651, 0.710), P_FUR2 = vec3(0.875, 0.902, 0.933);
  const vec3 P_CREAM = vec3(0.945, 0.902, 0.784), P_VEST = vec3(0.624, 0.714, 0.800), P_NAVY = vec3(0.027, 0.094, 0.180);
  const vec3 P_AMBER = vec3(1.0, 0.663, 0.153), P_CHAR = vec3(0.129, 0.067, 0.031);
  void main() {
    skMain();
    if (uBp.x > 0.5) {
      vec3 c = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
      float lum = dot(c, vec3(0.299, 0.587, 0.114)), aa = fwidth(lum) + 0.02;
      float warm = smoothstep(0.06, 0.14, c.r - max(c.g, c.b));
      float k0 = smoothstep(0.30 - aa, 0.30 + aa, lum), k1 = smoothstep(0.62 - aa, 0.62 + aa, lum);
      float part0 = step(uBpPart, 0.5);
      float hair = part0 * warm * (1.0 - smoothstep(0.56 - aa, 0.56 + aa, lum));
      float iris = part0 * warm * (1.0 - smoothstep(0.26 - aa, 0.26 + aa, lum));
      float chip = smoothstep(0.70 - aa, 0.70 + aa, lum);
      vec3 col = mix(mix(P_FUR0, P_FUR1, k0), P_FUR2, k1);
      col = mix(col, mix(P_VEST, P_CREAM, k1), step(0.5, uBpPart) * step(uBpPart, 1.5));
      col = mix(col, P_AMBER, step(2.5, uBpPart));
      col = mix(col, P_NAVY, hair);
      col = mix(col, P_CREAM, hair * chip);
      col = mix(col, P_AMBER, iris);
      float edge = uBp.w * 1.2, h01 = (vWP.y - uBq.x) / uBq.y, fw = fwidth(h01) + 0.01, on = step(0.001, uBp.w);
      col = mix(col, P_CHAR, on * (1.0 - smoothstep(edge - fw, edge + fw, h01)));
      col = mix(col, P_AMBER, on * (1.0 - smoothstep(0.0, 2.0 * fw, abs(h01 - edge))));
      gl_FragColor.rgb = siteTone(pow(max(col, vec3(0.0)), vec3(2.2)));
    }
  }
`;
const HALO = /* glsl */ `
  ${TONE}
  void main() { skMain(); gl_FragColor.rgb = siteTone(pow(vec3(0.945, 0.902, 0.784), vec3(2.2))); }
`;
const PART = { vest: 1, sleeve: 1, coin: 3 };

export function printBlueprint(ctx) {
  const uBp = { value: new Vector4(0, 0, 1, 0) }, uBq = { value: new Vector2(0, 1) };
  const box = new Box3().setFromObject(ctx.seal.group);
  if (!box.isEmpty()) uBq.value.set(box.min.y, Math.max(0.5, box.max.y - box.min.y));
  const limbs = ctx.seal.parts?.limbs?.userData?.mat, seen = new Set(), undo = [];
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader, hull = m.side === BackSide;
    if (f.split(MAIN).length !== 2 || (!hull && !f.includes("varying vec3 vWP"))) return;
    undo.push([m, f]);
    m.fragmentShader = f.replace(MAIN, "void skMain()") + (hull ? HALO : INK);
    if (!hull) {
      const part = m === limbs ? 2 : PART[o.geometry?.userData?.print] ?? 0;
      m.uniforms.uBp = uBp; m.uniforms.uBq = uBq; m.uniforms.uBpPart = { value: part };
    }
    m.needsUpdate = true;
  });
  return {
    uBp,
    dispose() { for (const [m, f] of undo) { m.fragmentShader = f; m.needsUpdate = true; } },
  };
}
