// The live lake's sun path, impact ring and mirrored ranges: glitter only above the lake's own colour, the ring in the film's accent, the ranges faded toward the picture's sides.
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";

await loadPack("shinkai");

const WATER = glslFor(["shinGlitterWater"]);
const ANCHOR = "float e = dissolveEdge(";
const RING = `float age1 = uTime - uRip[1].z; float d1 = length(p - uRip[1].xy);
      float ring = exp(-pow(d1 - age1 * 22.0, 2.0) * 0.004) * step(0.0, age1) * exp(-age1 * 1.1) * uRip[1].w * (1.0 - smoothstep(0.0, 0.6, uDis));
      col += vec3(1.0, 0.235, 0.306) * ring * 0.9 + vec3(1.0, 0.878, 0.659) * ring * 0.25 * exp(-age1 * 4.0);`;
const PATH = `col += max(shnWater(vec2(az * 0.159 + 0.5, R.y), uTime, col) - col, vec3(0.0)) * uShinGlitter * (1.0 - uTw) * smoothstep(0.55, 0.95, dot(normalize(vec3(R.x, 0.0, R.z)), normalize(vec3(uSun.x, 0.0, uSun.z))));
      ${RING}
      ${ANCHOR}`;
const MOUNT = "col = mix(col, mount, m);";
const MOUNT_SIDES = `float dl = mod(az - uAzC + 3.14159265, 6.2831853) - 3.14159265;
      m *= 1.0 - 0.85 * smoothstep(0.2, 0.42, abs(dl));
      col = mix(col, mount, m);`;

export function patchLake(W) {
  const m = W.lake.m;
  Object.assign(m.uniforms, uniformsFor(["shinGlitterWater"]));
  m.uniforms.uShinGlitter = { value: 0.6 };
  m.uniforms.uAzC = { value: 0 };
  m.fragmentShader = m.fragmentShader
    .replace(ANCHOR, PATH)
    .replace(MOUNT, MOUNT_SIDES)
    .replace(/void\s+main\s*\(\s*\)/, `${WATER}\nuniform float uAzC;\nvoid main()`);
  m.needsUpdate = true;
}
