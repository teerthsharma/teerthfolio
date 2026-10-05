// Bruno Simon's world material (phase3/playable-worlds.md, steal 1 and 2), as a patch for any
// MeshStandardMaterial: the shade side is the albedo times a cool tint, never grey; a
// smoothstep N.L core term gives the terminator a soft edge; undersides take the ground's warm
// bounce, fading with height. One shared uniform set, so a look change is one assignment.
import { Color, ShaderChunk, Vector3 } from "three";

export const TINT = {
  uShadowTint: { value: new Color("#7f95ff") }, // what the shade side of any albedo is multiplied by (cool violet-blue)
  uShadowK: { value: 0.3 }, // share of that tint added where the sun does not reach
  uBounce: { value: new Color("#ffd9b0") }, // the snow's warm bounce on undersides
  uBounceK: { value: 0.45 },
  // The cutaway: whatever stands between the eye and the pup, above its head, inside a cone round the
  // line of sight, dissolves (dithered rim), so a wall or roof is a window onto the pup, never a wall.
  uPup: { value: new Vector3() },
  uCut: { value: 0 }, // 0 off (overview, cutscene, docked), 1 on
  uCutR: { value: 4.2 }, // m, cone radius at the pup
};

const PATCH = "litTint";
// lights_fragment_begin with the sun's shadow term kept in gSunVis as well as applied.
const SUN_CHUNK = ShaderChunk.lights_fragment_begin.replace(
  /directLight\.color \*= (\( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap[^;]*: 1\.0);/,
  "gSunVis = $1; directLight.color *= gSunVis;"
);

const CUT = `
        if (uCut > 0.0) {
          vec3 ray = uPup - cameraPosition;
          float L = length(ray);
          vec3 dir = ray / L;
          vec3 rel = vTintW - cameraPosition;
          float t = dot(rel, dir);
          float R = uCutR * t / L;
          float perp = length(rel - dir * t);
          float p = smoothstep(R, R * 0.4, perp) * step(t, L - 0.8) * step(uPup.y + 0.5, vTintW.y) * uCut;
          float dth = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (p > dth) discard;
        }`;

export function litTint(m, { cut = true } = {}) {
  if (m.userData[PATCH]) return m;
  m.userData[PATCH] = true;
  const prev = m.onBeforeCompile;
  const key = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    prev?.call(m, shader, renderer);
    Object.assign(shader.uniforms, TINT);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTintW;")
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        {
          vec4 tp = vec4(transformed, 1.0);
          #ifdef USE_BATCHING
            tp = batchingMatrix * tp;
          #endif
          #ifdef USE_INSTANCING
            tp = instanceMatrix * tp;
          #endif
          vTintW = (modelMatrix * tp).xyz;
        }`
      );
    // The sun is the first directional light (shadow casters sort first): catch its shadow term.
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTintW;\nuniform vec3 uPup;\nuniform float uCut;\nuniform float uCutR;\nuniform vec3 uShadowTint;\nuniform float uShadowK;\nuniform vec3 uBounce;\nuniform float uBounceK;\nfloat gSunVis = 1.0;")
      .replace("#include <lights_fragment_begin>", SUN_CHUNK)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        ${cut ? CUT : ""}`
      )
      .replace(
        "#include <opaque_fragment>",
        `#if NUM_DIR_LIGHTS > 0
        {
          float nl = dot(normal, directionalLights[0].direction);
          float lit = smoothstep(-0.05, 0.3, nl) * gSunVis;
          outgoingLight += diffuseColor.rgb * uShadowTint * (1.0 - lit) * uShadowK;
          vec3 wn = inverseTransformDirection(normal, viewMatrix);
          float under = clamp(0.3 - 0.7 * wn.y, 0.0, 1.0) * exp(-max(vTintW.y, 0.0) / 5.0);
          outgoingLight += diffuseColor.rgb * uBounce * under * uBounceK;
        }
        #endif
        #include <opaque_fragment>`
      );
  };
  m.customProgramCacheKey = () => `${key ? key() : ""}|${PATCH}`;
  // Material.clone() copies neither onBeforeCompile nor the cache key: a clone (an animated material) keeps the look.
  const clone = m.clone;
  m.clone = function () {
    const c = clone.call(this);
    delete c.userData[PATCH];
    return litTint(c, { cut });
  };
  return m;
}
