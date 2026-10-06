// E01 SKY VAULT: a baked fresco dome (the golden-hour recipe, re-pigmented). Violet-to-peach, a low sun 12 deg right of the Wall's
// centre at 6 deg elevation, flat cloud banks with a HARD value cut (sfumato only in the seam between two tones), sepia
// spolvero pounce dots on the shadow rims. Fresco rule: shadows go to ultramarine-violet, never grey.
//
// MATHS
//  vertical ramp: h = clamp(el, 0, 1.2); colour = chain of smoothsteps gold -> peach -> rose -> mid violet -> upper violet -> lapis.
//  sun bloom: d = |(p - S) * (0.85, 1.25)|;  c = mix(c, mix(gold, core, e^{-6d}), 0.7 e^{-3.2d});  disc: c += core * (1.3 e^{-10d} + 2.2 (1 - smoothstep(.018,.024,d)))
//  clouds: q = warp(3.1 az, 9.5 el);  f = fbm(q * (0.8, 1.7));  mask = smoothstep(.53,.545,f) * window(el)
//          lit test: f2 = fbm((q - toSun * 0.22) * (0.8, 1.7)); diff = f - f2.  diff > 0 means density FALLS toward the sun: the sun face.
//          tone = mix(shade, lit, smoothstep(-.015,.015,diff))   (the .03 wide smoothstep is the 0.16 sfumato in density units)
//          deep shade where diff < -.045.
//  rim line: |f - .5375| < .012 on the shade side, sepia at 55%, broken by vn(q*3.7) so it tapers to nothing at both ends.
//  spolvero: dots at 1/135 rad pitch (about 6 px at 800 px/rad) inside 0.05 of the rim on the shade side only.
//  uDark / uFlash (patched into the dome shader): the strike darkens the vault 20% toward ultramarine, a bolt flash lifts it.
import { V } from "../../../paint.js";
import { C, T, smooth } from "./pal.js";

const SUN = [0.21, 0.105]; // az rad (12 deg right of the Wall centre), el rad (6 deg)

export const sunDir = () => {
  const [a, e] = SUN;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)];
};

const BODY = /* glsl */ `
  const vec3 GOLD = ${V(C.gold)}; const vec3 PEACH = ${V(C.peach)}; const vec3 ROSE = ${V(C.rose)}; const vec3 VMID = ${V(C.skyMid)};
  const vec3 VUP = ${V(C.skyUp)}; const vec3 LAPIS = ${V(C.lapis)}; const vec3 CORE = ${V(C.sun)};
  const vec3 CLIT = ${V(C.cloudLit)}; const vec3 CSHADE = ${V(C.cloudShade)}; const vec3 CDEEP = ${V(C.cloudDeep)};
  const vec3 SEPIA = ${V(C.sepia)}; const vec3 HAZE = ${V(C.haze)};
  vec3 sky(float az, float el) {
    const vec2 S = vec2(${SUN[0].toFixed(4)}, ${SUN[1].toFixed(4)});
    vec2 p = vec2(az, el);
    if (el < 0.0) return GOLD * 0.45;                       // under the horizon: hidden by the ground, kept dark and warm
    float d = length((p - S) * vec2(0.85, 1.25));
    float h = clamp(el, 0.0, 1.2);
    vec3 c = mix(GOLD, PEACH, smoothstep(0.0, 0.07, h));
    c = mix(c, ROSE, smoothstep(0.05, 0.2, h));
    c = mix(c, VMID, smoothstep(0.16, 0.38, h));
    c = mix(c, VUP, smoothstep(0.34, 0.65, h));
    c = mix(c, LAPIS, smoothstep(0.6, 1.1, h));
    c = mix(c, mix(GOLD, CORE, exp(-d * 6.0)), exp(-d * 3.2) * 0.7);   // sun-side warm flood

    // cloud banks, 8-15% of frame height each: long flat bands (the el axis is stretched)
    vec2 q = warp(vec2(az * 3.1, el * 9.5), 0.28);
    float f = fbm(q * vec2(0.8, 1.7));
    float win = smoothstep(0.02, 0.07, el) * (1.0 - smoothstep(0.7, 1.0, el));
    float cl = smoothstep(0.53, 0.545, f) * win;
    vec2 toS = normalize((S - p) * vec2(3.1, 9.5) + vec2(1e-4));
    float f2 = fbm((q - toS * 0.22) * vec2(0.8, 1.7));
    float diff = f - f2;
    float lit = smoothstep(-0.015, 0.015, diff);
    vec3 shade = mix(CDEEP, CSHADE, smoothstep(-0.07, -0.02, diff));
    vec3 cc = mix(shade, CLIT, lit);
    cc = mix(cc, GOLD, exp(-d * 4.0) * 0.35 * lit);                       // the sun side takes the gold
    c = mix(c, cc, cl * 0.92);
    // hand-rimmed edge, 1.3 px sepia at 55%, only on the shade side, tapering out where the noise drops
    float rim = (1.0 - smoothstep(0.0, 0.012, abs(f - 0.5375))) * win * smoothstep(0.25, 0.6, vn(q * 3.7));
    c = mix(c, SEPIA, rim * 0.55 * (1.0 - lit));
    // spolvero pounce dots along the shadow side of the rim
    vec2 g = fract(p * 135.0) - 0.5;
    float dots = 1.0 - smoothstep(0.16, 0.22, length(g));
    float band = (1.0 - smoothstep(0.0, 0.05, abs(f - 0.55))) * win;
    c = mix(c, SEPIA, dots * band * (1.0 - lit) * 0.5);
    // dust of the Rumbling thickens the low sky; gold haze, then luma cap, then the sun disc (intentional bloom)
    c = mix(c, HAZE, (1.0 - smoothstep(0.0, 0.08, el)) * 0.42);
    c = mix(c, GOLD, (1.0 - smoothstep(0.0, 0.10, el)) * 0.12);
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c *= min(1.0, 0.92 / max(Y, 1e-4));
    c += CORE * (exp(-d * 10.0) * 1.3 + (1.0 - smoothstep(0.018, 0.024, d)) * 2.2);
    return c;
  }`;

export function buildSky(ctx) {
  const { THREE } = ctx;
  const dome = ctx.bake.dome(BODY, { tools: ["noise"], az: [-1.7, 1.7], el: [-0.05, 1.15], pxPerRad: 760 });
  // patch the dome's output: darken toward ultramarine and add a flash (uniforms driven from update)
  const m = dome.material;
  const needle = "gl_FragColor = vec4(texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, 0.0);";
  if (m.fragmentShader.includes(needle)) {
    m.uniforms.uDark = { value: 0 }; m.uniforms.uFlash = { value: 0 };
    m.fragmentShader = m.fragmentShader
      .replace("uniform sampler2D tSky;", "uniform sampler2D tSky; uniform float uDark; uniform float uFlash;")
      .replace(needle, `vec3 c0 = texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb;
        c0 = mix(c0, c0 * vec3(0.5, 0.54, 0.78), uDark);   // value drops 20%+ and goes ultramarine (shot 5)
        c0 += vec3(1.0, 0.93, 0.7) * uFlash;               // the bolt's flash
        gl_FragColor = vec4(c0, 0.0);`);
    m.needsUpdate = true;
  }
  const g = new THREE.Group();
  g.add(dome);
  return {
    group: g,
    update(t) {
      if (!m.uniforms.uDark) return;
      // dark rises over the pre-strike beat, holds through the bolt, and releases as the swell lands
      // the dome is a layer-0 plate (baked at the cut), so the drop is a STEP at the shot-5 cut; the release is a ramp (shot 6 moves, so it re-bakes)
      const up = t >= T.dark[0] ? 1 : 0, down = 1 - smooth(7.1, 8.0, t);
      m.uniforms.uDark.value = 0.55 * up * down;
      m.uniforms.uFlash.value = t >= T.strike[0] && t < T.strike[0] + 0.17 ? 0.4 : 0;
    },
    dispose() { dome.userData.target?.dispose?.(); m.dispose(); dome.geometry.dispose(); },
  };
}
