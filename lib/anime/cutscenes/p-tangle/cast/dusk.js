// THE DUSK TWIN on the character: the live pup's twilight lighting (moves/p-tangle/pup.js twin) wrapped into each rig material's main() once at build.
// The rig is not edited; the sun and dusk values are the world layer's shared uniforms (ctx.tg.U), so the twin follows the sky.
import { BackSide } from "three";
import { TONE } from "../tone.js";

const MAIN = /void\s+main\s*\(\s*\)/;
const TWIN = /* glsl */ `
  ${TONE}
  uniform vec3 uDuskSun; uniform float uDuskTw, uDuskKeep;
  vec3 duskTwin(vec3 base, vec3 n, vec3 V) {
    vec3 L = normalize(uDuskSun + vec3(0.0, 0.18, 0.0));
    float ndl = dot(n, L), tw = 1.0 - uDuskTw;
    vec3 sky = mix(vec3(0.416, 0.471, 0.847), vec3(0.541, 0.416, 0.816), 0.35) * (0.62 + 0.38 * n.y);
    sky = mix(sky, vec3(0.227, 0.267, 0.533), uDuskTw * 0.7);
    vec3 lit = base * (sky * 0.95 + smoothstep(-0.2, 0.8, ndl) * vec3(1.0, 0.627, 0.439) * 0.8 * tw);
    lit += base * vec3(1.0, 0.478, 0.604) * 0.22 * max(-n.y, 0.0) * tw;
    lit += vec3(1.0, 0.753, 0.541) * pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 2.4) * smoothstep(-0.2, 0.7, ndl + 0.15) * 0.9 * tw;
    return mix(lit, base * (0.62 + 0.4 * clamp(ndl * 0.5 + 0.5, 0.0, 1.0)), uDuskKeep);
  }
  void main() {
    twinMain();
    vec3 n = normalize(NRM), V = normalize(cameraPosition - vWP);
    vec3 c = min(duskTwin(pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2)), n, V), vec3(0.98));
    gl_FragColor.rgb = siteTone(pow(max(c, vec3(0.0)), vec3(2.2)));
  }
`;

export function duskLook(ctx) {
  const U = ctx.tg?.U;
  if (!U) throw new Error("duskLook: ctx.tg.U is missing; the world layer must build before the cast layer");
  const seen = new Set();
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m) || m.side === BackSide) return;
    seen.add(m);
    const f = m.fragmentShader, n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("varying vec3 vN") ? "vN" : null;
    if (!n || !f.includes("varying vec3 vWP") || f.split(MAIN).length !== 2) return;
    m.fragmentShader = f.replace(MAIN, "void twinMain()") + TWIN.replace("NRM", n);
    m.uniforms.uDuskSun = U.uSun;
    m.uniforms.uDuskTw = U.uTw;
    m.uniforms.uDuskKeep = U.uKeep;
    m.needsUpdate = true;
  });
  return { dispose() {} };
}
