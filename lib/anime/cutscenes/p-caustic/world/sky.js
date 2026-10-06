// p-caustic WORLD / sky shell (bible 3.1, 3.2 halo, 3.8 sky tear). A baked dome over the az/el window the shots can see,
// plus a live pass inside the dome material (limbo red, moon halo, the rip, the shatter).
//
// BAKED sky(az, el)  (hard-cel war sunset, ref 03 + ref 01):
//   t      = smoothstep(0, .85, el)
//   base   = ramp4(t, haze #bfa98b, #8b7560, mid #6a5c4d, top #2a241f);  gold = exp(-el/.06) toward #e8c25a (horizon band)
//   cloud  = fbm(warp((az*3.2, el*14), .5) * (1, 2.2))            horizontal masses, ~4:1
//   lit    = clamp((cloud - cloud(shifted up-left)) * 6 + .5)     light from the moon, up-left; undersides dark
//   band   = floor(lit*4 + .5)/4                                  FOUR value cuts so soft tops hold
//   cloudC = ramp4(band, dark #2c1d1a, #5a3a30, bruise #7a4a3c, top #b88a64); base = mix(base, cloudC, mask*.9)
//   strips = smoothstep(.58,.62, fbm((az*1.4, el*34)))            dark cloud strips #1a0b0b, ~25 % coverage (ref 01)
//   hills  = el < .018 + .03 ridged(az*2.6)  -> low #4a3f34 toward haze with distance; dry-brush = strokes(az*40, el*160)
// LIVE (dome fragment, object space = war space):
//   limbo  c = mix(c, c * (1.18,.5,.46) + (.12,0,.015), .6 uLimbo)            the sky goes blood red as the moon rises
//   halo   c += #ffe8e0 * .15 uLimbo uPulse exp(-ang^2 / .012), ang = acos(d . moonDir)
//   tear   segment A->B in (az, el); s = projection, jag = nn(16s) + nn(47s); half width w = uTear .03 sin(pi s)^.6;
//          |dist| < w -> #0a0408 (dark gap); w < |dist| < w + .004 -> #fff2d8 seam
//   break  vcell((az,el)*(14,22)): a cell with id*.8+.02 < uBreak is discarded; bright #fff4e4 cell edges (see common.js)
import { PAL, V, GLSL_HASH, GLSL_BREAK, EV, since, sm, clamp01 } from "./common.js";

const SKY = /* glsl */ `
  vec3 sky(float az, float el) {
    float e = el;
    float t = smoothstep(0.0, 0.85, max(e, 0.0));
    vec3 col = ramp4(t, ${V(PAL.haze)}, vec3(0.30, 0.24, 0.17), ${V(PAL.skyMid)}, ${V(PAL.skyTop)});
    float g = exp(-max(e, 0.0) / 0.06);
    col = mix(col, ${V(PAL.gold)}, g * 0.5 * (0.6 + 0.4 * fbm(vec2(az * 4.0, e * 40.0))));
    // clouds: elongated masses, four hard value bands, dark undersides, light from up-left
    vec2 cp = warp(vec2(az * 3.2, e * 14.0), 0.5);
    float d = fbm(cp * vec2(1.0, 2.2));
    float dUp = fbm((cp + vec2(0.08, 0.25)) * vec2(1.0, 2.2));
    float lit = clamp((d - dUp) * 6.0 + 0.5, 0.0, 1.0);
    float band = floor(lit * 4.0 + 0.5) / 4.0;
    vec3 cc = ramp4(band, ${V(PAL.cloudDark)}, ${V(PAL.cloudMid)}, ${V(PAL.cloudBruise)}, ${V(PAL.cloudTop)});
    float m = smoothstep(0.42, 0.55, d) * smoothstep(0.0, 0.06, e);
    col = mix(col, cc, m * 0.9);
    // dark cloud strips (ref 01), long and thin
    float s = fbm(vec2(az * 1.4 + 2.0, e * 34.0));
    float strip = smoothstep(0.58, 0.62, s) * smoothstep(0.03, 0.12, e) * (1.0 - smoothstep(0.7, 1.0, e));
    col = mix(col, ${V(PAL.strip)}, strip * 0.85);
    // dry-brush value flecks, screen-ish stroke texture in dome space
    col *= 0.94 + 0.12 * strokes(vec2(az * 36.0, e * 140.0), 0.12, 1.6, 0.4);
    // far hills on the whole horizon, hazed with distance
    float hh0 = 0.018 + 0.03 * ridged(vec2(az * 2.6, 3.1));
    float hz = 1.0 - smoothstep(hh0 - 0.0012, hh0, e);
    float depth = smoothstep(0.0, 0.03, hh0 - e);
    vec3 hill = mix(${V(PAL.haze)} * 0.62, ${V(PAL.low)}, depth);
    hill *= 0.92 + 0.14 * strokes(vec2(az * 40.0, e * 160.0), 0.1, 1.4, 0.4);
    col = mix(col, hill, hz);
    return min(col, vec3(0.9));
  }`;

const WINDOWS = [[EV.limbo, 1.7], [EV.tear - 0.05, 4.0], [EV.break - 0.05, 8.4]]; // when the dome animates

export function buildSky(ctx, env) {
  const { engine, bake } = ctx;
  const dome = bake.sky(SKY, { tools: ["noise"], az: [-2.7, 2.7], el: [-0.25, 1.05], pxPerRad: 700 });
  const mat = dome.material;
  Object.assign(mat.uniforms, {
    uBreak: { value: 0 }, uLimbo: { value: 0 }, uTear: { value: 0 }, uPulse: { value: 1 }, uMoonD: { value: new ctx.THREE.Vector3(0, 0, -1) },
  });
  const live = /* glsl */ `
    uniform float uBreak; uniform float uLimbo; uniform float uTear; uniform float uPulse; uniform vec3 uMoonD;
    ${GLSL_HASH}
    ${GLSL_BREAK}
    void main() {`;
  const body = /* glsl */ `
    vec3 c = texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb;
    float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
    c = mix(c, c * vec3(1.18, 0.5, 0.46) + vec3(0.12, 0.0, 0.015), uLimbo * 0.6);
    float ang = acos(clamp(dot(d, uMoonD), -1.0, 1.0));
    c += ${V(PAL.halo)} * 0.15 * uLimbo * uPulse * exp(-ang * ang / 0.012);
    if (uTear > 0.0) {
      vec2 A = vec2(-0.46, 0.44), B = vec2(-0.12, 0.09), ab = B - A, q = vec2(az, el);
      float s = clamp(dot(q - A, ab) / dot(ab, ab), 0.0, 1.0);
      vec2 nrm = normalize(vec2(-ab.y, ab.x));
      float jag = (nn(vec2(s * 16.0, 1.7)) - 0.5) * 0.05 + (nn(vec2(s * 47.0, 3.3)) - 0.5) * 0.012;
      float dist = dot(q - (A + ab * s), nrm) - jag;
      float w = uTear * 0.03 * pow(sin(3.14159 * s) + 0.0001, 0.6);
      float ad = abs(dist);
      float seam = (1.0 - smoothstep(w, w + 0.004, ad)) * smoothstep(w - 0.003, w, ad);
      c = ad < w ? ${V(PAL.gap)} : mix(c, ${V(PAL.seam)} * 0.92, seam * clamp(uTear * 1.5, 0.0, 1.0));
    }
    if (uBreak > 0.0) {
      vec3 v = vcell(vec2(az, el) * vec2(14.0, 22.0));
      if (shardGone(v.z)) discard;
      c = mix(c, ${V(PAL.flash)} * 0.92, shardEdge(v.y));
    }
    gl_FragColor = vec4(min(c, vec3(0.92)), 0.0);`;
  const fs = mat.fragmentShader;
  const tail = "gl_FragColor = vec4(texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, 0.0);";
  if (fs.includes(tail) && fs.includes("void main() {")) {
    mat.fragmentShader = fs.replace("void main() {", live).replace(tail, body);
    mat.needsUpdate = true;
  } else console.warn("[p-caustic world] dome shader changed shape; the live sky pass is off");
  dome.userData.layer = 0;
  const moonDir = new ctx.THREE.Vector3();

  return {
    obj: dome,
    update(t, dt, cue, S) {
      const u = mat.uniforms;
      u.uLimbo.value = sm((cue.ts - EV.limbo) / 1.3);
      u.uTear.value = since(cue, "tear") < 0 ? 0 : sm(since(cue, "tear") / 0.5) * (1 - 0.35 * sm((since(cue, "meteor2") - 1.25) / 0.5));
      u.uBreak.value = clamp01(since(cue, "break") / 1.5) * (since(cue, "break") >= 0 ? 1 : 0);
      u.uPulse.value = 0.85 + 0.15 * Math.sin(cue.ts * 2.4);
      moonDir.set(...S.moonPos).normalize(); u.uMoonD.value.copy(moonDir);
      // the dome only redraws live while it animates; the plate bakes it otherwise. A window holds until the shot ends.
      const shots = ctx.scene.shots ?? [];
      const t0 = (shots.find((s) => t >= s.t[0] && t < s.t[1]) ?? { t: [0] }).t[0];
      dome.userData.layer = WINDOWS.some((w) => w[0] <= t && w[1] > t0) ? 1 : 0;
    },
    dispose() { dome.userData.target?.dispose?.(); mat.dispose(); dome.geometry.dispose(); },
  };
}
