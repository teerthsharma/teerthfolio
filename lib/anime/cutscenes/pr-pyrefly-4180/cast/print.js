// THE CHARACTER IN THE PAPER PRINT: the hero rig (look pr-pyrefly-4180, untouched) stepped to the live TOON_F's three card values, with the fox's ember
// in one hard step and a flat cream die-cut hull. Each rig material's main() is wrapped once at build, as Sukuna's cast/index.js does.
import { BackSide, Vector4 } from "three";
import { T, bump, remap } from "../clock.js";
import { TONE } from "../tone.js";

const MAIN = /void\s+main\s*\(\s*\)/;
const toon = (n) => /* glsl */ `
  ${TONE}
  uniform vec4 uPf;
  void main() {
    pfMain();
    if (uPf.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 nn = normalize(${n});
      vec3 c = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
      float l = dot(c, vec3(0.3, 0.59, 0.11));
      float v = l < 0.3 ? 0.26 : (l < 0.62 ? 0.5 : 0.82);
      c = mix(c * (v / max(l, 0.02)), vec3(v), 0.18);
      float d = dot(nn, normalize(vec3(-0.35, 0.55, 0.75))) * 0.5 + 0.5;
      c *= d < 0.4 ? 0.62 : (d < 0.66 ? 0.82 : 1.0);
      c += vec3(1.0, 0.4, 0.12) * step(0.62, dot(nn, normalize(vec3(0.9, 0.2, -0.3))) * 0.5 + 0.5) * 0.28 * uPf.y;
      gl_FragColor.rgb = siteTone(pow(max(c, vec3(0.0)), vec3(2.2)));
    }
  }`;
const hullMain = /* glsl */ `
  ${TONE}
  uniform vec4 uPf;
  void main() {
    pfMain();
    if (uPf.x > 0.5) gl_FragColor = vec4(siteTone(pow(vec3(0.93, 0.87, 0.74), vec3(2.2))), 1.0);
  }`;

export function printCharacter(ctx, opts = {}) {
  const base = opts.ember ?? 0.55, uPf = { value: new Vector4(0, base, 0, 0) }, seen = new Set();
  const figs = ctx.seal.hero?.figs ?? [], wear = figs[figs.indexOf(ctx.seal.parts?.limbs) + 1]?.userData;
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (!f || f.split(MAIN).length !== 2) return;
    if (m.side === BackSide) {
      if (m === wear?.hull) { m.fragmentShader = f.replace(MAIN, "void pfMain()") + hullMain; m.uniforms.uPf = uPf; m.needsUpdate = true; }
      return;
    }
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void pfMain()") + toon(n);
    m.uniforms.uPf = uPf;
    m.needsUpdate = true;
  });
  return {
    uPf,
    update(t) {
      const p = remap(t), roar = Math.max(bump(...T.roarA, p), bump(...T.roarB, p));
      uPf.value.y = base + 0.35 * roar + 0.5 * bump(T.burst - 0.1, T.burst + 0.1, T.burst + 0.4, T.burst + 1.0, p);
    },
    dispose() { uPf.value.set(0, 0, 0, 0); },
  };
}
