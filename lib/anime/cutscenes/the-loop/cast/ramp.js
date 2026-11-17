// The SILVER LINK. look on the rig: a three-band ramp (lit 1, shade 0.86, deep 0.66), a crimson rim and overlay, a plum line.
// The rig is not edited: each rig material's main() is wrapped once, here, at build, as the Sukuna cast wraps its ink.
import { BackSide, Vector4 } from "three";

export const LINE_ON = 1.4;
const KEY = "normalize(vec3(-0.5, 0.62, 0.6))";
const CRM = "vec3(0.8588, 0.1255, 0.1686)";
const PLUM = "vec3(0.2588, 0.1961, 0.1725)";
const LUMA = "vec3(0.2126, 0.7152, 0.0722)";
const MAIN = /void\s+main\s*\(\s*\)/;

export const rampBlock = (n, rimOn) => /* glsl */ `
  uniform vec4 uLp;
  void main() {
    skMain();
    if (uLp.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 c = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2)), nn = normalize(${n});
      float k = dot(nn, ${KEY}), s1 = smoothstep(-0.112, -0.088, k), s2 = smoothstep(0.338, 0.362, k);
      c *= 0.66 + 0.2 * s1 + 0.14 * s2;
      float rim = ${rimOn ? `step(0.5, pow(1.0 - max(dot(nn, normalize(cameraPosition - vWP)), 0.0), 5.0)) * uLp.z` : "0.0"};
      c += 0.6 * rim * (${CRM} - c);
      c = mix(c, ${CRM} * dot(c, ${LUMA}), 0.55 * uLp.w);
      gl_FragColor.rgb = pow(c, vec3(2.2));
      float Y = dot(gl_FragColor.rgb, ${LUMA});
      if (Y > 0.92) gl_FragColor.rgb *= 0.92 / Y;
    }
  }`;
export const hullBlock = /* glsl */ `
  uniform vec4 uLp;
  void main() { skMain(); if (uLp.x > 0.5) gl_FragColor.rgb = pow(${PLUM}, vec3(2.2)); }`;

export function wrapRig(ctx) {
  const u = { value: new Vector4(0, 0, 0, 0) }, seen = new Set(), list = [], undo = [];
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) return;
    const back = m.side === BackSide, vN = f.includes("varying vec3 vWN") ? "vWN" : f.includes("varying vec3 vN") ? "vN" : null;
    list.push({ name: m.name || o.name || "(unnamed)", uniforms: Object.keys(m.uniforms).join(" "), vN, side: back ? "back" : "front" });
    if (!back && !vN) return;
    undo.push([m, f]);
    const block = back ? hullBlock : rampBlock(vN, f.includes("varying vec3 vWP"));
    m.fragmentShader = f.replace(MAIN, "void skMain()") + block;
    m.uniforms.uLp = u;
    m.needsUpdate = true;
  });
  return {
    u, list,
    dispose() {
      for (const [m, f] of undo) { m.fragmentShader = f; delete m.uniforms.uLp; m.needsUpdate = true; }
    },
  };
}
