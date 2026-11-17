// Surface finish for home's set: broken bedding and the sunrise on the walls, pigment pooled round each beacon as it catches on the land;
// swell, wind strokes and the wall's glaze on the water; cool undersides on the floes. Each runs after its live material's own wash
// and before the site's tone map.
import { Vector4 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { beaconSpots } from "../live/farm.js";
import { T, smooth } from "../clock.js";

await loadPack("prettytv");
await loadPack("dock");
const GRANULE = glslFor(["ptvPaperWash"]);
const SWELL = glslFor(["dockSlipSwell"]);
const MAIN = /void\s+main\s*\(\s*\)/;

const LAND = /* glsl */ `
  vec3 landSurface(vec3 col, vec3 W, vec3 N) {
    float band = sin(W.y * 2.1 + fbm(W.xz * 0.4) * 3.0 + 2.0 * fbm(W.xz * 0.15));
    col *= 1.0 - 0.03 * smoothstep(0.3, 0.9, band) * step(N.y, 0.55);
    col = mix(col, col * vec3(0.8, 0.76, 0.95), 0.25 * smoothstep(0.2, -0.2, N.y));
    float f = fract(W.y / 3.4);
    col *= 1.0 - 0.05 * smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.06, 0.16, f)) * (0.6 + 0.8 * fbm(W.xz * 0.2));
    float k = 1.0 - smoothstep(-90.0, -20.0, W.z);
    col = mix(col, col * vec3(1.14, 1.0, 0.84) + vec3(0.05, 0.02, 0.0), 0.5 * k * (1.0 - step(0.6, N.y)));
    float gr = ptvVn(W.xy * 9.0) * 0.6 + ptvVn(W.xy * 23.0 + 3.1) * 0.4;
    col *= 1.0 + 0.06 * (gr - 0.5) * 2.0;
    return col;
  }`;

const BEACON = /* glsl */ `
  uniform vec4 uBeacon[11];
  uniform float uWide;
  vec3 beaconPool(vec3 col, vec3 W) {
    float lit = 0.0;
    for (int i = 0; i < 11; i++) {
      float a = clamp(uBeacon[i].w / 0.5, 0.0, 1.0);
      float r = i == 10 ? uWide : 16.0;
      lit += a * (1.0 - smoothstep(2.0, r, distance(W, uBeacon[i].xyz)));
    }
    return mix(col, col * vec3(1.0, 0.72, 0.38) + vec3(0.06, 0.03, 0.0), 0.5 * clamp(lit, 0.0, 1.0) * (1.0 - uRun));
  }`;

const WATER = /* glsl */ `
  vec3 waterSurface(vec3 col, vec3 W) {
    vec2 q = W.xz * 0.35 + vec2(0.0, uTime * 0.07);
    float e = 0.012;
    float hx = dkFbm(q + vec2(e, 0.0)) - dkFbm(q - vec2(e, 0.0));
    float hy = dkFbm(q + vec2(0.0, e)) - dkFbm(q - vec2(0.0, e));
    col *= 1.0 + 0.06 * clamp((hx + hy) * 6.0, -1.0, 1.0);
    float st = fbm(vec2(W.x * 0.9, W.z * 6.0 + uTime * 0.1));
    col = mix(col, uPaper, smoothstep(0.62, 0.8, st) * 0.10);
    float bl = fbm(W.xz * vec2(0.06, 0.09) + 3.0);
    col = mix(col, col * vec3(0.84, 0.86, 1.0), 0.45 * smoothstep(0.35, 0.75, bl));
    col *= vec3(0.93, 0.92, 0.965);
    return mix(col, col * vec3(0.64, 0.68, 0.9), 0.28 * smoothstep(-6.0, -14.0, W.x));
  }`;

const FLOE = /* glsl */ `
  vec3 floeSurface(vec3 col, vec3 N) {
    return mix(col, col * vec3(0.64, 0.68, 0.9), 0.3 * smoothstep(0.5, 0.0, N.y));
  }`;

function wrap(m, glsl, body) {
  const f = m.fragmentShader;
  if (m.userData.dressed || f.split(MAIN).length !== 2) return m;
  m.fragmentShader = f.replace(MAIN, "void sfcMain()") + glsl + `\nvoid main() { sfcMain(); ${body} }\n`;
  m.userData.dressed = true;
  m.needsUpdate = true;
  return m;
}

export function dress({ landM, waterM, floeM }) {
  const beacons = Array.from({ length: 11 }, () => new Vector4());
  const wide = { value: 16 };
  if (landM) {
    landM.uniforms.uBeacon = { value: beacons };
    landM.uniforms.uWide = wide;
    wrap(landM, GRANULE + LAND + BEACON, "gl_FragColor.rgb = landSurface(gl_FragColor.rgb, vW, normalize(vN)); gl_FragColor.rgb = beaconPool(gl_FragColor.rgb, vW);");
  }
  if (waterM) wrap(waterM, SWELL + WATER, "gl_FragColor.rgb = waterSurface(gl_FragColor.rgb, vW);");
  if (floeM) wrap(floeM, FLOE, "gl_FragColor.rgb = floeSurface(gl_FragColor.rgb, normalize(vN));");
  const spots = beaconSpots();
  return {
    update(t) {
      spots.forEach(([x, y, z], i) => beacons[i].set(x, y, z, Math.max(0, t - (T.beacon + i * T.step))));
      wide.value = 16 + 10 * smooth(T.rain[0] - 0.4, T.rain[0], t);
    },
    dispose() {},
  };
}

export default dress;
