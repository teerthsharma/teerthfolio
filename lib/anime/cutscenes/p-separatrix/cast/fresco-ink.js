// The Giorno hero inside the fresco: each hero material's main() is wrapped once at build; fur stays grey, cloth and hands keep their colour.
import { BackSide, Vector4 } from "three";
import { TONE } from "../tone.js";

const MAIN = /void\s+main\s*\(\s*\)/;
const FRESCO = /* glsl */ `
  ${TONE}
  uniform vec4 uSk; uniform float uSkPart;
  void main() {
    skMain();
    if (uSk.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 n = normalize(SK_NRM); float d = dot(n, vec3(0.5,0.2,-0.84));
      vec3 c = gl_FragColor.rgb; float L = dot(c, vec3(0.299,0.587,0.114));
      c = uSkPart < 0.5 ? mix(vec3(L), c, 0.3) : c;
      vec3 k = d < -0.1 ? vec3(0.70,0.64,0.76) : d < 0.35 ? vec3(0.96,0.93,0.95) : vec3(1.08,1.04,0.98);
      c *= k;
      float e = clamp(length(fwidth(n)) * 2.6, 0.0, 1.0);
      c = mix(c, vec3(0.24,0.14,0.16), clamp(e * 0.8, 0.0, 0.85));
      c += vec3(1.0,0.78,0.38) * pow(1.0 - abs(dot(n, normalize(cameraPosition - vWP))), 2.2) * 0.5 * step(0.0, d + 0.35);
      gl_FragColor.rgb = siteTone(clamp(c, 0.0, 1.0));
    }
  }
`;
const HULL = /* glsl */ `
  ${TONE}
  uniform vec4 uSk;
  void main() { skMain(); if (uSk.x > 0.5) gl_FragColor.rgb = siteTone(vec3(0.24, 0.14, 0.16)); }
`;

export default function inkHero(ctx) {
  const uSk = { value: new Vector4(0, 0, 1, 0) }, seen = new Set();
  const figs = ctx.seal.hero.figs, limbs = ctx.seal.parts.limbs?.userData, wear = figs[figs.indexOf(ctx.seal.parts.limbs) + 1]?.userData;
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) return;
    if (m.side === BackSide) { if (m === wear?.hull) { m.fragmentShader = f.replace(MAIN, "void skMain()") + HULL; m.uniforms.uSk = uSk; m.needsUpdate = true; } return; }
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void skMain()") + FRESCO.replaceAll("SK_NRM", n);
    m.uniforms.uSk = uSk;
    m.uniforms.uSkPart = { value: m === wear?.mat ? 1 : m === limbs?.mat ? 2 : 0 };
    m.needsUpdate = true;
  });
  return {
    set(on, panel, t = uSk.value.y, ratio = uSk.value.z) { uSk.value.set(on ? 1 : 0, t, ratio, panel ? 1 : 0); },
    handle: uSk,
  };
}
