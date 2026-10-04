// THE CEL LOOK (90s Toei TV anime): flat colour, ONE hard shadow tone, a bold ink outline of constant
// pixel width. No gradients, no soft light. Three pieces:
//   celMaterial()   instanced or plain mesh, per-instance colour, facet-lit, 2 tones
//   hullMaterial()  the ink outline (back faces pushed out in screen space), shared width
//   pupCel(root)    the pup's own coat swapped for a cel twin (silver for Ultra Instinct) with hulls
// Colours are picked as sRGB and written raw, like the stage's shaders.

import { BackSide, Color, Mesh, ShaderMaterial, Vector2, Vector3 } from "three";
import { srgb } from "./util";

export const INK = "#0a0a1e";
const LIGHT = new Vector3(-0.42, 0.74, 0.52).normalize();
const SHADE = new Vector3(0.58, 0.52, 0.8); // the one shadow tone: cool, purple

// shared by every hull: the drawing-buffer size and the line width in its pixels
export const HULL_U = { uRes: { value: new Vector2(1280, 800) }, uWidth: { value: 3 }, uInk: { value: new Color(...srgb(INK)) } };
export const setHull = (w, h, dpr) => {
  HULL_U.uRes.value.set(w * dpr, h * dpr);
  HULL_U.uWidth.value = 1.7 * dpr;
};

// uTint scales the colour; uDrain pales the world at the return
export function celMaterial({ tint = [1, 1, 1] } = {}) {
  return new ShaderMaterial({
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
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
}

// the ink outline. radial: the push-out direction is the position from the mesh's own centre
// (instanced convex blocks); otherwise the vertex normal (smooth meshes). Draws back faces only.
export function hullMaterial({ radial = false, color } = {}) {
  const u = color ? { ...HULL_U, uInk: { value: new Color(...srgb(color)) } } : HULL_U;
  return new ShaderMaterial({
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
      void main() { gl_FragColor = vec4(pow(uInk, vec3(2.2)), 1.0); }`,
  });
}

// THE PUP, in cel. Its coat (the material the body, head, flippers and tail share) gets a twin:
// base colour from the coat's vertex colours, smooth-normal 2-tone, a pale rim for the aura, and
// uSilver blending the fur to silver. Each coat mesh gets an ink hull child. `set(on, silver, rim)`.
export function pupCel(root) {
  const uses = new Map();
  root.traverse((o) => {
    if (o.isMesh && !Array.isArray(o.material) && o.material.vertexColors && !o.material.isShaderMaterial) uses.set(o.material, (uses.get(o.material) ?? 0) + 1);
  });
  const twin = new ShaderMaterial({
    vertexColors: true,
    uniforms: { uBase: { value: new Vector3(1, 1, 1) }, uSilver: { value: 0 }, uRim: { value: 0 }, uLight: { value: LIGHT } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      void main() {
        vCol = pow(color.rgb, vec3(1.0 / 2.2));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uLight;
      uniform float uSilver, uRim;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float lit = step(0.18, dot(n, uLight));
        vec3 fur = uBase * vCol;
        vec3 furC = mix(fur * vec3(0.62, 0.58, 0.84), fur, lit);
        vec3 silC = mix(vec3(0.62, 0.69, 0.86), vec3(0.96, 0.975, 1.0), lit);
        vec3 c = mix(furC, silC, uSilver);
        float rim = step(0.7, 1.0 - max(dot(n, v), 0.0));
        c = mix(c, vec3(0.72, 0.9, 1.0), rim * uRim);
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
  const meshes = [];
  const hulls = [];
  const hullM = hullMaterial();
  let coat = null;
  for (const [m, n] of uses) if (n >= 3) coat = m;
  if (coat) {
    twin.uniforms.uBase.value.set(...srgb(`#${coat.color.getHexString()}`));
    root.traverse((o) => {
      if (o.isMesh && o.material === coat) {
        meshes.push(o);
        const h = new Mesh(o.geometry, hullM);
        h.visible = false;
        h.frustumCulled = false;
        o.add(h);
        hulls.push(h);
      }
    });
  }
  let on = false;
  return {
    twin,
    set(v, silver = 0, rim = 0) {
      twin.uniforms.uSilver.value = silver;
      twin.uniforms.uRim.value = rim;
      if (v === on) return;
      on = v;
      meshes.forEach((o, i) => {
        o.material = v ? twin : coat;
        hulls[i].visible = v;
      });
    },
    dispose() {
      this.set(false);
      hulls.forEach((h) => h.removeFromParent());
      twin.dispose();
      hullM.dispose();
    },
  };
}
