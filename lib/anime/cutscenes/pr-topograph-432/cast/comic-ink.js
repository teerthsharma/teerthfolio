// The hero printed in the cover's ink (T11): cel bands, screen hatch, gold rim, red eye points, and a flash (T12) on each shaded material's main().
// Set once at build; set() writes the shared uTg and the engine's line width, dispose() restores the line width.
import { BackSide, Vector4 } from "three";
import { TONE } from "../tone.js";

const MAIN = /void\s+main\s*\(\s*\)/;
const COMIC = /* glsl */ `
  ${TONE}
  uniform vec4 uTg;
  void main() { skMain();
    if (uTg.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 n = normalize(NRM); if (!gl_FrontFacing) n = -n;
      vec3 b = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2)); float d = dot(n, vec3(-0.42054, 0.74763, 0.514));
      float band = d > 0.3 ? 1.25 : d > -0.2 ? 0.92 : 0.62, red = step(0.35, b.r - max(b.g, b.b)) * step(0.4, b.r);
      vec3 col = b * band; vec2 fc = gl_FragCoord.xy / uTg.z; float h1 = step(0.55, fract((fc.x + fc.y) / 6.0)), h2 = step(0.55, fract((fc.x - fc.y) / 6.0));
      col = mix(col, vec3(0.0196, 0.0078, 0.0392), (band < 0.7 ? max(h1, h2) * 0.5 : band < 1.0 ? h1 * 0.25 : 0.0));
      float rim = step(0.78, 1.0 - abs(dot(n, normalize(cameraPosition - vWP)))) * step(-0.2, d);
      col = mix(col, vec3(1.0, 0.7686, 0.2275), rim * 0.75);
      col = mix(col, b * 1.15, red);
      if (uTg.w > 0.5) col = uTg.w > 1.5 ? vec3(0.0196, 0.0078, 0.0392) : vec3(0.9412, 0.7059, 0.1608);
      gl_FragColor.rgb = siteTone(pow(max(col, vec3(0.0)), vec3(2.2)));
    }
  }`;

export function inkHero(ctx) {
  const uTg = { value: new Vector4(0, 0, 1, 0) }, sh = ctx.engine.shared, line0 = sh.uLine.value.clone(), seen = new Set();
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (m.side === BackSide || f.split(MAIN).length !== 2 || !f.includes("varying vec3 vWP")) return;
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void skMain()") + COMIC.replace("NRM", n);
    m.uniforms.uTg = uTg;
    m.needsUpdate = true;
  });
  return {
    set({ on = false, t = 0, dpr = 1, flash = 0 } = {}) {
      uTg.value.set(on ? 1 : 0, t, dpr || 1, flash);
      sh.uLine.value.set(on ? 2.6 : line0.x, line0.y, on ? 1 : line0.z, line0.w);
    },
    bounds(out = [0, 0, 0, 0]) {
      const b = ctx.player?.box;
      for (let i = 0; i < 4; i++) out[i] = b ? b[i] : 0;
      return out;
    },
    dispose() { sh.uLine.value.copy(line0); },
  };
}
