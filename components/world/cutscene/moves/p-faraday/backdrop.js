// THE SKY AND THE RIVER, in the cyanotype: a Prussian-blue night with a half moon, thin cloud strokes, a few
// stars and faint compass construction rings round the moon (the engineers' own marks); a dark river drawn with
// ripple contour lines and a drafting grid, that takes the shot's char line and its twin wake of spray.
// Both use the shared uniforms (blue.js), so the scorch and the final burn reach them too.

import { CircleGeometry, DoubleSide, IcosahedronGeometry, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { COMMON, DECL, CREAM, GRIDC, U, rgb } from "./blue";
import { WATER_Y } from "./scenery";

export const SKY_R = 140;

export function skyShell() {
  const g = new IcosahedronGeometry(1, 3);
  const m = new ShaderMaterial({
    uniforms: { ...U, uOff: { value: new Vector3() }, uMoon: { value: new Vector3(0, 0.4, -0.9).normalize() }, uInside: { value: 0 }, uCream: { value: rgb(CREAM) } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${DECL}
      varying vec3 vP;
      void main() {
        vP = position;
        vL = position * ${SKY_R.toFixed(1)} + vec3(0.0, 0.9, 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uMoon, uCream;
      uniform float uInside;
      varying vec3 vP;
      void main() {
        vec3 v = normalize(vP);
        float h = v.y;
        vec3 horizon = vec3(0.1, 0.26, 0.42);
        vec3 mid = vec3(0.02, 0.09, 0.2);
        vec3 zen = vec3(0.008, 0.03, 0.17);
        vec3 c = mix(horizon, mix(mid, zen, smoothstep(0.12, 0.7, h)), smoothstep(-0.02, 0.22, h));
        c = mix(c, vec3(1.0, 0.706, 0.227), 0.95 * smoothstep(0.1, 0.0, abs(h - 0.03)));
        if (h < 0.0) c = mix(horizon, vec3(0.05, 0.16, 0.3), smoothstep(0.0, -0.2, h));
        float az = atan(v.x, -v.z);
        c *= 0.93 + 0.14 * texture2D(uGrain, vec2(az * 3.0, h * 6.0)).r;
        // thin cloud: flat lighter strokes with a cream edge, in the lower sky
        float band = smoothstep(0.04, 0.1, h) * smoothstep(0.5, 0.2, h);
        float cl = vn(vec2(az * 4.0 + h * 5.0, h * 30.0 + vn(vec2(az * 3.0, 2.0)) * 3.0));
        float body = smoothstep(0.62, 0.64, cl) * band;
        float edge = (smoothstep(0.62, 0.64, cl) - smoothstep(0.655, 0.675, cl)) * band;
        c = mix(c, vec3(0.1, 0.26, 0.45), body * 0.55);
        c = mix(c, uCream, edge * 0.4);
        // stars
        vec2 sc = vec2(az * 60.0, h * 60.0);
        c += uCream * step(0.9965, h21(floor(sc))) * smoothstep(0.2, 0.45, h) * 0.8;
        // the half moon: a lit left half, a drawn right half, a cream outline, compass rings and a centre cross
        vec3 r = normalize(cross(uMoon, vec3(0.0, 1.0, 0.0)));
        vec3 u = cross(r, uMoon);
        vec2 p = vec2(dot(v, r), dot(v, u));
        float facing = step(0.0, dot(v, uMoon));
        float R = 0.075;
        float len = length(p);
        float disc = (1.0 - smoothstep(R - 0.002, R, len)) * facing;
        vec3 mc = p.x < 0.0 ? vec3(0.83, 0.9, 0.9) : vec3(0.08, 0.26, 0.45);
        mc = mix(mc, vec3(0.72, 0.82, 0.84), (1.0 - smoothstep(0.0, 0.05, length(p - vec2(-0.025, 0.02)))) * 0.5 * step(p.x, 0.0));
        c = mix(c, mc, disc);
        float ring = (1.0 - smoothstep(0.0012, 0.0024, abs(len - R))) * facing;
        c = mix(c, uCream, ring);
        for (int i = 0; i < 2; i++) {
          float rr = R * (1.7 + 0.9 * float(i));
          c = mix(c, uCream, (1.0 - smoothstep(0.0006, 0.0014, abs(len - rr))) * facing * (0.34 - 0.1 * float(i)));
        }
        float crs = (1.0 - smoothstep(0.0004, 0.001, min(abs(p.x), abs(p.y)))) * step(len, R * 2.9) * step(R * 1.05, len) * facing;
        c = mix(c, uCream, crs * 0.3);
        c = burnAway(c);
        gl_FragColor = vec4(c, mix(0.9, 1.0, uInside));
      }`,
  });
  return { g, m };
}

export function riverMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U, uOff: { value: new Vector3() }, uGridC: { value: rgb(GRIDC) }, uCream: { value: rgb(CREAM) } },
    vertexShader: /* glsl */ `
      ${DECL}
      void main() {
        vL = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uGridC, uCream;
      void main() {
        vec3 c = vec3(0.04, 0.17, 0.31);
        c *= 0.9 + 0.2 * texture2D(uGrain, vL.xz * 0.2).r;
        // ripple contour lines, drifting
        float f = vn(vL.xz * vec2(0.12, 0.34) + vec2(uTime * 0.05, 0.0)) * 7.0 + vn(vL.xz * 0.5) * 0.8;
        float ripple = 1.0 - smoothstep(0.0, 0.1, abs(fract(f) - 0.5) * 2.0 - 0.8);
        c = mix(c, vec3(0.2, 0.5, 0.75), ripple * 0.5);
        // the drafting grid
        vec2 w = max(fwidth(vL.xz), vec2(1e-4));
        vec2 a = abs(fract(vL.xz / 2.0 - 0.5) - 0.5) / (w / 2.0);
        float l = 1.0 - min(min(a.x, a.y), 1.0);
        vec2 a5 = abs(fract(vL.xz / 10.0 - 0.5) - 0.5) / (w / 10.0);
        float l5 = 1.0 - min(min(a5.x, a5.y), 1.0);
        c = mix(c, uGridC, 0.14 * l + 0.28 * l5);
        // the twin wake of the shot: spray lines either side of the bridge, glowing, then fading; the char stays
        float age = uTime - uShot - (vL.x - 0.8) / BSPEED;
        if (age > 0.0 && uHead > -50.0 && vL.x > 0.8) {
          float dz = abs(abs(vL.z - BZ) - 6.0);
          float wake = exp(-age * 0.55) * (1.0 - smoothstep(0.25, 1.1, dz)) * (1.0 - smoothstep(0.0, 0.2, -age));
          c = mix(c, vec3(1.0, 0.72, 0.34), wake * 0.9);
          c = mix(c, uCream, (1.0 - smoothstep(0.0, 0.18, dz)) * exp(-age * 0.9) * 0.6);
        }
        c = scorch(c, 0.85);
        c = burnAway(c);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
export function riverGeometry() {
  return new PlaneGeometry(300, 150).rotateX(-Math.PI / 2).translate(30, WATER_Y, 5);
}
export { CircleGeometry as _c };
