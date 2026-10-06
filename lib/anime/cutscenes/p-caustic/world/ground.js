// p-caustic WORLD / battlefield ground (bible 3.3): a burnt, cracked war plain, 180 m, hard 3-cut cel lit by the moon.
// Height (vertex AND fragment):
//   h(p) = ridge + sum craters + hit craters
//   ridge  = 1.7 exp(-((z + 33)/4.5)^2) (.65 + .5 nn(.08 x)) (.8 + .2 nn(.5 p))           the allied ridge band at z -33
//   crater = -d (1 - k^2) for k < 1, + .3 d exp(-((k - 1.05)/.2)^2) rim, k = |p - c| / R   (five old, two new HIT1 HIT2 that open)
// Shading:
//   n = normalize((h(x-e) - h(x+e), 2e, h(z-e) - h(z+e)));  l = n . normalize(-.45, .75, -.5)
//   col = l > .70 ? ash #9c8a72 : l > .50 ? #6a5c4d : soot #433a30          (hard cuts; wine-shifted shadow)
//   burn   : fbm(p .12) > .55 darkens to .62 (soot patches)                dry-brush : strokes(p) +-5 % value
//   ridge  : exp(-((z + 33)/5)^2) pulls toward olive #5a5a28 / #2c2c14 (ref 03 hill)
//   cracks : vor(p .55) F2-F1 < w, w = mix(.03, .09, vn(.3 p)) -> ink #2a231c; creases darken 12 % (fake AO)
//   craters: ember #e8c9a0 inside HIT k<1 by uG, plus lit cracks; the crack web is vor((p - HIT2) .35) cut to a radius 42 uWeb
//   Susanoo light wrap: 15 % #2a5be0 within ~24 m of (.9, -17) while it stands
//   far haze: .6 #bfa98b over 40..115 m from the camera (the far field keeps value)
//   break  : vcell(p .45) cells fall, 2 px bright edge
import { PAL, V, GEO, GLSL_HASH, GLSL_BREAK, EV, since, sm, clamp01 } from "./common.js";

const f2 = (x) => x.toFixed(2);
const CR = `const vec4 CR[5] = vec4[5](${GEO.CRATERS.map((c) => `vec4(${c.map(f2).join(",")})`).join(",")});`;

const HEIGHT = /* glsl */ `
  uniform float uH1; uniform float uH2; uniform float uG1; uniform float uG2; uniform float uWeb; uniform float uWebG;
  uniform float uBreak; uniform float uSus; uniform float uLimbo;
  ${GLSL_HASH}
  ${CR}
  const vec2 HIT1 = vec2(${GEO.HIT1.map(f2)}); const vec2 HIT2 = vec2(${GEO.HIT2.map(f2)});
  float crater(vec2 p, vec2 c, float R, float d) {
    float k = length(p - c) / R;
    float bowl = k < 1.0 ? -d * (1.0 - k * k) : 0.0;
    float rim = 0.3 * d * exp(-pow((k - 1.05) / 0.2, 2.0));
    return bowl + rim;
  }
  float hgt(vec2 p) {
    float rz = (p.y - (${f2(GEO.RIDGE_Z)})) / 4.5;
    float h = 1.7 * exp(-rz * rz) * (0.65 + 0.5 * nn(vec2(p.x * 0.08, 1.3))) * (0.8 + 0.2 * nn(p * 0.5));
    for (int i = 0; i < 5; i++) h += crater(p, CR[i].xy, CR[i].z, CR[i].w);
    h += crater(p, HIT1, ${f2(GEO.HIT_R[0])}, ${f2(GEO.HIT_D[0])} * uH1);
    h += crater(p, HIT2, ${f2(GEO.HIT_R[1])}, ${f2(GEO.HIT_D[1])} * uH2);
    return h;
  }`;

const VERT = /* glsl */ `
  varying vec3 vL; varying vec3 vW;
  ${HEIGHT}
  void main() { vec3 pos = position; pos.y += hgt(pos.xz); vL = pos; vW = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;

const FRAG = (noise) => /* glsl */ `
  varying vec3 vL; varying vec3 vW;
  ${noise}
  ${HEIGHT}
  ${GLSL_BREAK}
  void main() {
    vec2 P = vL.xz;
    vec3 cell = vcell(P * 0.45);
    if (uBreak > 0.0 && shardGone(cell.z)) discard;
    float e = 0.7;
    vec3 n = normalize(vec3(hgt(P - vec2(e, 0.0)) - hgt(P + vec2(e, 0.0)), 2.0 * e, hgt(P - vec2(0.0, e)) - hgt(P + vec2(0.0, e))));
    float l = dot(n, normalize(vec3(-0.45, 0.75, -0.5)));
    vec3 col = l > 0.70 ? ${V(PAL.ash)} : (l > 0.50 ? ${V(PAL.skyMid)} : ${V(PAL.soot)});
    float dcam = length(vW - cameraPosition);
    // burn patches and dry-brush
    col = mix(col, col * 0.62, smoothstep(0.5, 0.65, fbm(P * 0.12 + 3.0)) * 0.7);
    col *= 0.95 + 0.1 * strokes(P * 0.9, 0.35, 3.2, 0.35);
    // olive hill on the ridge band (ref 03)
    float rm = exp(-pow((P.y - (${f2(GEO.RIDGE_Z)})) / 5.0, 2.0));
    col = mix(col, l > 0.55 ? ${V(PAL.olive)} : ${V(PAL.oliveShade)}, 0.55 * rm);
    // cracked earth: voronoi borders, fake AO in the creases
    vec2 v = vor(P * 0.55);
    float w = mix(0.03, 0.09, vn(P * 0.3));
    float cl = (1.0 - smoothstep(w, w + fwidth(v.y) * 1.2 + 0.01, v.y)) * (1.0 - smoothstep(60.0, 100.0, dcam));
    col *= 1.0 - 0.12 * (1.0 - smoothstep(0.0, 0.3, v.y));
    col = mix(col, ${V(PAL.ink)}, cl * 0.9);
    // the two new craters glow ember, the lit cracks run out of them
    float k1 = length(P - HIT1) / ${f2(GEO.HIT_R[0])}, k2 = length(P - HIT2) / ${f2(GEO.HIT_R[1])};
    float in1 = 1.0 - smoothstep(0.0, 1.0, k1), in2 = 1.0 - smoothstep(0.0, 1.0, k2);
    col = mix(col, ${V(PAL.ember)}, uG1 * (in1 * 0.5 + cl * 0.9 * (1.0 - smoothstep(0.0, 1.6, k1))));
    col = mix(col, ${V(PAL.ember)}, uG2 * (in2 * 0.5 + cl * 0.9 * (1.0 - smoothstep(0.0, 1.6, k2))));
    // the crack web from HIT2
    float webR = uWeb * 42.0, d2 = length(P - HIT2);
    float wl = 1.0 - smoothstep(0.0, 0.06, vor((P - HIT2) * 0.35 + 7.0).y);
    float wmask = (1.0 - smoothstep(webR - 3.0, webR, d2)) * step(0.001, uWeb);
    col = mix(col, ${V(PAL.ink)}, wl * wmask * 0.6 * (1.0 - uWebG));
    col = mix(col, ${V(PAL.emberHot)} * 0.9, wl * wmask * uWebG);
    // Susanoo light wrap: the one cold bounce
    float sd = length(P - vec2(${f2(GEO.SUS_AT[0])}, ${f2(GEO.SUS_AT[2])}));
    col = mix(col, ${V(PAL.susBlue)}, 0.15 * uSus * exp(-pow(sd / 24.0, 2.0)));
    col = mix(col, ${V(PAL.haze)}, 0.6 * smoothstep(40.0, 115.0, dcam));
    col *= mix(vec3(1.0), vec3(1.08, 0.82, 0.78), uLimbo * 0.5);
    col = mix(col, ${V(PAL.flash)} * 0.92, shardEdge(cell.y));
    gl_FragColor = vec4(min(col, vec3(0.9)), 0.5);
  }`;

export function buildGround(ctx, env) {
  const { THREE, tools } = ctx;
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.fromEntries(["uH1", "uH2", "uG1", "uG2", "uWeb", "uWebG", "uBreak", "uSus", "uLimbo"].map((k) => [k, { value: 0 }])),
    vertexShader: VERT, fragmentShader: FRAG(tools.glslFor(["noise"])),
  });
  const main = new THREE.Mesh(new THREE.PlaneGeometry(180, 180, 200, 200).rotateX(-Math.PI / 2), mat);
  const skirt = new THREE.Mesh(new THREE.RingGeometry(89.5, 520, 96, 1).rotateX(-Math.PI / 2), mat); // flat far plain, same shader
  for (const m of [main, skirt]) { m.frustumCulled = false; m.userData.layer = 1; }
  const g = new THREE.Group(); g.add(main, skirt);
  return {
    obj: g,
    update(t, dt, cue) {
      const u = mat.uniforms;
      const h1 = since(cue, "hit1"), h2 = since(cue, "impact"), web = since(cue, "impact");
      u.uH1.value = h1 < 0 ? 0 : sm(h1 / 0.25);
      u.uH2.value = h2 < 0 ? 0 : sm(h2 / 0.2);
      u.uG1.value = h1 < 0 ? 0 : sm(h1 / 0.1) * (1 - 0.6 * sm((h1 - 0.8) / 1.5));
      u.uG2.value = h2 < 0 ? 0 : sm(h2 / 0.1) * (1 - 0.6 * sm((h2 - 0.6) / 1.5));
      u.uWeb.value = web < 0 ? 0 : sm(web / 0.18);
      u.uWebG.value = web < 0 ? 0 : 1 - sm((web - 0.18) / 0.5);
      const b = since(cue, "break");
      u.uBreak.value = b < 0 ? 0 : clamp01(b / 1.5);
      const rise = sm((cue.ts - EV.rise) / 1.1);
      u.uSus.value = rise * (1 - u.uBreak.value);
      u.uLimbo.value = sm((cue.ts - EV.limbo) / 1.3);
    },
    dispose() { main.geometry.dispose(); skirt.geometry.dispose(); mat.dispose(); },
  };
}
