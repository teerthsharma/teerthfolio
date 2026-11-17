// The cel look of the Tournament: flat colour, one hard shade step, an ink hull of constant width, each pass through the site's tone.
import { BackSide, Color, ShaderMaterial, Vector2, Vector3 } from "three";
import { srgb } from "../util.js";
import { tone } from "../tone.js";

export const INK = "#0a0a1e";
const LIGHT = new Vector3(-0.42, 0.74, 0.52).normalize();
const SHADE = new Vector3(0.58, 0.52, 0.8);

export const HULL_U = { uRes: { value: new Vector2(1280, 800) }, uWidth: { value: 3 }, uInk: { value: new Color(...srgb(INK)) } };
export const setHull = (w, h, dpr) => {
  HULL_U.uRes.value.set(w * dpr, h * dpr);
  HULL_U.uWidth.value = 1.7 * dpr;
};

export function celMaterial({ tint = [1, 1, 1] } = {}) {
  return tone(new ShaderMaterial({
    uniforms: { uTint: { value: new Vector3(...tint) }, uDrain: { value: 0 }, uLight: { value: LIGHT }, uShade: { value: SHADE } },
    vertexShader: /* glsl */ `
      varying vec3 vView;
      varying vec3 vCol;
      void main() {
        vec4 p = vec4(position, 1.0);
        vCol = vec3(1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #endif
        vec4 mv = modelViewMatrix * p;
        vView = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint, uLight, uShade;
      uniform float uDrain;
      varying vec3 vView;
      varying vec3 vCol;
      void main() {
        vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
        if (dot(n, vView) > 0.0) n = -n;
        float lit = step(0.2, dot(n, uLight));
        vec3 base = vCol * uTint;
        vec3 c = mix(base * uShade, base, lit);
        float l = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(c, vec3(l * 1.05, l * 1.02, l * 1.1), uDrain * 0.55);
        gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
      }`,
  }));
}

// a flat colour with no shade step: the ink cracks and the stage's dark marks
export function flatMaterial(hex = INK) {
  return tone(new ShaderMaterial({
    uniforms: { uC: { value: new Vector3(...srgb(hex)) } },
    vertexShader: /* glsl */ `
      void main() {
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC;
      void main() { gl_FragColor = vec4(pow(uC, vec3(2.2)), 0.99); }`,
  }));
}

// the ink outline: back faces pushed out in screen space; radial for instanced blocks.
export function hullMaterial({ radial = false, color } = {}) {
  const u = color ? { ...HULL_U, uInk: { value: new Color(...srgb(color)) } } : HULL_U;
  return tone(new ShaderMaterial({
    uniforms: u,
    side: BackSide,
    defines: radial ? { RADIAL: "" } : {},
    vertexShader: /* glsl */ `
      uniform vec2 uRes;
      uniform float uWidth;
      void main() {
        mat4 mm = modelViewMatrix;
        #ifdef USE_INSTANCING
          mm = modelViewMatrix * instanceMatrix;
        #endif
        #ifdef RADIAL
          vec3 dir = normalize(position + 1e-5);
        #else
          vec3 dir = normal;
        #endif
        vec3 vn = normalize(mat3(mm) * dir);
        vec4 clip = projectionMatrix * (mm * vec4(position, 1.0));
        vec2 s = (projectionMatrix * vec4(vn, 0.0)).xy;
        clip.xy += normalize(s + 1e-5) * uWidth * 2.0 / uRes * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      void main() { gl_FragColor = vec4(pow(uInk, vec3(2.2)), 0.99); }`,
  }));
}
