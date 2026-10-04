// THE STORMY DUSK SKY and THE RESERVOIR. The sky is poster bands (a hard step per colour) under thick diagonal
// cloud streaks with black ink edges and a giant low sun ringed like a bullseye; the reservoir throws the same
// sky back in flat bands with cream ink wave strokes and rings where something drops in.

import { DoubleSide, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { COMMON } from "./ink";

export const SUN = new Vector3(0.3, 0.1, -0.95).normalize();

const SKYFN = /* glsl */ `
  uniform vec3 uSun;
  vec3 skyBands(vec3 v, float t) {
    float h = clamp(v.y, 0.0, 1.0);
    float k = floor(smoothstep(0.0, 0.6, h) * 7.0) / 7.0;
    vec3 c = k < 0.5 ? mix(uPal[11], uPal[10], k * 2.0) : mix(uPal[10], uPal[9], (k - 0.5) * 2.0);
    float az = atan(v.x, -v.z);
    // diagonal cloud streaks: coordinates sheared so every cloud leans the same way
    vec2 q = vec2(az * 2.4 + v.y * 3.2, v.y * 7.0 - az * 1.1 - t * 0.04);
    float n = fbm(q * 1.15);
    float m = smoothstep(0.0, 0.08, h);
    float low = step(0.5, n) * m;
    float hi = step(0.6, n) * m;
    c = mix(c, uPal[13], low * 0.78);
    c = mix(c, uPal[12], hi * 0.7 * step(0.0, dot(v, vec3(-0.5, 0.7, 0.5))));
    float edge = (1.0 - smoothstep(0.0, 0.012, abs(n - 0.5))) + (1.0 - smoothstep(0.0, 0.01, abs(n - 0.6))) * 0.8;
    c = mix(c, uPal[5], clamp(edge, 0.0, 1.0) * m * 0.9);
    // the sun: a bold disc with a cream core and bullseye rings
    float a = acos(clamp(dot(v, normalize(uSun)), -1.0, 1.0));
    float ring = step(0.5, fract(a * 9.0));
    c = mix(c, uPal[15], step(a, 0.26) * (0.55 + 0.35 * ring));
    c = mix(c, uPal[5], (1.0 - smoothstep(0.0, 0.006, abs(a - 0.26))) * 0.9);
    // a haze band at the horizon, flat
    c = mix(c, uPal[14], step(h, 0.035) * 0.65);
    return c;
  }`;

export function skyShell(U) {
  const g = new SphereGeometry(1, 40, 22);
  const m = new ShaderMaterial({
    uniforms: { ...U, uSun: { value: SUN.clone() }, uAlpha: { value: 1 } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      varying vec3 vW;
      ${COMMON}
      ${SKYFN}
      void main() {
        vec3 v = normalize(vW - cameraPosition);
        vec3 c = skyBands(v, uTime);
        if (v.y < 0.0) c = mix(uPal[14], uPal[8], 0.5);
        // the colour-inverted panel on the impacts
        float pn = panelOn();
        c = mix(c, vec3(1.0) - c, pn);
        // bold diagonal shadow cut across the sky too
        if (bandShade() > 0.5) c = mix(c, uPal[5], 0.5);
        gl_FragColor = vec4(outc(c), uAlpha);
      }`,
  });
  return { g, m };
}

export function reservoir(U) {
  const g = new PlaneGeometry(900, 520).rotateX(-Math.PI / 2).translate(0, 0, -250);
  const m = new ShaderMaterial({
    uniforms: { ...U, uSun: { value: SUN.clone() }, uRipple: { value: new Vector3(0, -8, 0) }, uRingR: { value: 0 }, uRingK: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRipple;
      uniform float uRingR, uRingK;
      varying vec3 vW;
      ${COMMON}
      ${SKYFN}
      void main() {
        vec3 v = normalize(vW - cameraPosition);
        vec3 r = vec3(v.x, -v.y, v.z);
        float dist = length(vW - cameraPosition);
        // the sky thrown back, bent by long slow swells
        vec3 rr = normalize(r + vec3(0.0, 0.0, 0.0) + 0.03 * vec3(0.0, vnoise(vW.xz * vec2(0.5, 0.9) + uTime * 0.2) - 0.5, 0.0));
        vec3 c = skyBands(rr, uTime * 0.6);
        c = mix(uPal[8], c, 0.62);
        // flat cream wave strokes, stretched across the lake, and dark troughs
        float w1 = vnoise(vec2(vW.x * 0.55 + uTime * 0.35, vW.z * 2.6 - uTime * 0.2));
        c = mix(c, uPal[15], step(0.74, w1) * step(w1, 0.78) * 0.8);
        c = mix(c, uPal[5], step(0.5, w1) * step(w1, 0.53) * 0.55);
        // the ring where the fourth edge drowned
        float rd = length(vW.xz - uRipple.xz);
        float ring = (1.0 - smoothstep(0.0, 0.16, abs(rd - uRingR))) * uRingK;
        c = mix(c, uPal[15], ring);
        c = mix(c, uPal[5], (1.0 - smoothstep(0.0, 0.12, abs(rd - uRingR * 0.82))) * uRingK * 0.8);
        float hz = floor(smoothstep(30.0, 220.0, dist) * 4.0) / 4.0;
        c = mix(c, uPal[14], hz * 0.8);
        if (bandShade() > 0.5) c = mix(c, uPal[5], 0.5);
        gl_FragColor = vec4(outc(c), 1.0);
      }`,
  });
  return { g, m };
}
