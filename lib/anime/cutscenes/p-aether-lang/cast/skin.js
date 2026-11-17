// SKIN: the seal drawn in the void's ramp (three cosmic bands, a white-violet rim, krackle dots, the blue and red lights).
// skin() wraps a rig material's main() once, as the Sukuna cast does; fur keeps most of its grey (keep 0.72), the outfit is ramped harder.
import { Vector3 } from "three";
import { HALFTONE } from "../live/halftone.js";
import { PAL } from "../palette.js";
import { HIT, T, sceneOf } from "../clock.js";

const F = (n) => n / 24;
const vec = (hex) => `vec3(${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4)).join(",")})`;
export const SKIN = {
  uCell: { value: 6 }, uTime: { value: 0 }, uLock: { value: 0 }, uBlueP: { value: new Vector3() }, uRedP: { value: new Vector3() },
  uBlueI: { value: 0 }, uRedI: { value: 0 }, uOn: { value: 0 },
};
const KEEP = { fur: 0.72, hair: 0.6, outfit: 0.3, eyes: 1, marks: 1 };
const MAIN = /void\s+main\s*\(\s*\)/;
const block = (n) => /* glsl */ `
  ${HALFTONE}
  uniform float uOn, uKeep, uBlueI, uRedI;
  uniform vec3 uBlueP, uRedP;
  void main() {
    skMain();
    vec3 N = normalize(${n}), V = normalize(cameraPosition - vWP);
    vec3 c = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
    float lu = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 ramp = lu < 0.26 ? ${vec(PAL.shadow)} : lu < 0.52 ? ${vec(PAL.mid)} : ${vec(PAL.hi)};
    float edge = max(1.0 - smoothstep(0.0, 0.04, abs(lu - 0.26)), 1.0 - smoothstep(0.0, 0.04, abs(lu - 0.52)));
    c = mix(ramp, c, uKeep);
    c = mix(c, ${vec(PAL.hi)}, halftone(edge * 0.8) * 0.4);
    c += ${vec(PAL.rim)} * pow(1.0 - abs(dot(N, V)), 2.4) * 0.55;
    vec3 dB = uBlueP - vWP, dR = uRedP - vWP;
    c += uBlueI * ${vec(PAL.blue)} * max(0.0, dot(N, normalize(dB))) / (1.0 + 0.6 * dot(dB, dB));
    c += uRedI * ${vec(PAL.red)} * max(0.0, dot(N, normalize(dR))) / (1.0 + 0.6 * dot(dR, dR));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, pow(c, vec3(2.2)), uOn);
  }`;

export function skin(material, part) {
  const f = material.fragmentShader ?? "";
  if (f.includes("skMain") || f.split(MAIN).length !== 2) return material;
  const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("varying vec3 vN") ? "vN" : null;
  if (!n || !f.includes("vWP")) return material;
  material.fragmentShader = f.replace(MAIN, "void skMain()") + block(n);
  Object.assign(material.uniforms, { uCell: SKIN.uCell, uBlueP: SKIN.uBlueP, uRedP: SKIN.uRedP, uBlueI: SKIN.uBlueI, uRedI: SKIN.uRedI, uOn: SKIN.uOn, uKeep: { value: KEEP[part] ?? 0.5 } });
  material.needsUpdate = true;
  return material;
}

// the hold light: blue and red lamps at the orbs' hands, on from the form to the fire, plus a flash at the collide
export function skinLight(t, blue, red, grow, f) {
  const tt = sceneOf(t), on = tt >= T.form[0] && tt < T.fire[0];
  SKIN.uBlueP.value.copy(blue);
  SKIN.uRedP.value.copy(red);
  SKIN.uBlueI.value = SKIN.uRedI.value = (on ? 1.6 * grow * (1 - 0.6 * f) : 0) + 2.0 * Math.max(0, 1 - Math.abs(t - HIT.collide) / F(3));
}
