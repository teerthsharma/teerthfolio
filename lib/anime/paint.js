// THE PAINT KIT: anime backgrounds are 2D paintings under a fixed camera, so a background is
// painted procedurally, in screen space, once per shot (it becomes the plate and gets the plate
// filters). A painting is GLSL `vec3 paint(vec2 p)` built from this kit, where p is the frame in
// height units: x in [0, aspect], y in [0, 1], y up. Values above 1 are emissive (they bloom).
//
// The GLSL kit itself lives in tools/ (one detachable module per effect, see tools/index.js).
import { BackSide, Color, HalfFloatType, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector2, WebGLRenderTarget } from "three";
import noise from "./tools/noise.js";
import storm from "./tools/storm.js";
import lightning from "./tools/lightning.js";
import puffs from "./tools/puffs.js";
import { glslFor } from "./tools/index.js";

export const KIT = noise.glsl; // tools/noise.js

// hex (sRGB) -> GLSL vec3 in linear light
export const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// a painting as a fullscreen layer at the far plane; alpha carries the set id (0.5: no sky id,
// so the plate's set-only steps apply). body: GLSL defining `vec3 paint(vec2 p)`.
export function painting(shared, body, o = {}) {
  const m = new ShaderMaterial({
    depthWrite: false,
    uniforms: { uRes: shared.uRes, uTime: shared.uTime, ...(o.uniforms ?? {}) },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
    fragmentShader: `uniform vec2 uRes; uniform float uTime; varying vec2 vUv; ${o.tools ? glslFor(o.tools) : KIT} ${body}
      void main() { vec2 p = vec2(vUv.x * uRes.x / uRes.y, vUv.y); gl_FragColor = vec4(paint(p), ${(o.id ?? 0.5).toFixed(3)}); }`,
  });
  const q = new Mesh(new PlaneGeometry(2, 2), m);
  q.frustumCulled = false; q.renderOrder = -20;
  return q;
}

// storm, lightning and puffs live in tools/ (storm.js, lightning.js, puffs.js); these names keep old worlds working
export const KIT_STORM = storm.glsl + lightning.glsl;
export const KIT_PUFFS = puffs.glsl;
export { puffBanks, puffUniforms } from "./tools/puffs.js";
export { mistCard } from "./tools/mist.js";

// A painted dome baked once into a texture over the azimuth/elevation window the shot can see,
// then sampled by view direction: correct under any camera rotation or arc (it is at infinity).
// body: GLSL defining `vec3 sky(float az, float el)`; values > 1 stay emissive (half float).
// o.tools: the tool names the body uses (tools/index.js); o.kit (legacy): extra GLSL after the noise kit.
export function bakedDome(renderer, body, o = {}) {
  const az = o.az ?? [-1.5, 1.5], el = o.el ?? [-0.8, 1.0], ppr = o.pxPerRad ?? 1000;
  const W = Math.min(4096, Math.round((az[1] - az[0]) * ppr)), H = Math.min(4096, Math.round((el[1] - el[0]) * ppr));
  const rt = new WebGLRenderTarget(W, H, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  const bake = new ShaderMaterial({
    uniforms: { uAz: { value: new Vector2(...az) }, uEl: { value: new Vector2(...el) }, ...storm.uniforms({ scale: o.stormScale, aspect: o.stormAspect }), ...(o.uniforms ?? {}) },
    vertexShader: "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform vec2 uAz; uniform vec2 uEl; varying vec2 vUv; ${o.tools ? glslFor(o.tools) : KIT + (o.kit ?? "")} ${body}
      void main() { gl_FragColor = vec4(sky(mix(uAz.x, uAz.y, vUv.x), mix(uEl.x, uEl.y, vUv.y)), 1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), bake); quad.frustumCulled = false;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(new Scene().add(quad), new OrthographicCamera(-1, 1, 1, -1, 0, 1)); renderer.setRenderTarget(prev);
  bake.dispose();
  const m = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { tSky: { value: rt.texture }, uAz: { value: new Vector2(...az) }, uEl: { value: new Vector2(...el) } },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: `uniform sampler2D tSky; uniform vec2 uAz; uniform vec2 uEl; varying vec3 vD;
      void main() { vec3 d = normalize(vD); vec2 uv = vec2((atan(d.x, -d.z) - uAz.x) / (uAz.y - uAz.x), (asin(clamp(d.y, -1.0, 1.0)) - uEl.x) / (uEl.y - uEl.x));
        gl_FragColor = vec4(texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, 0.0); }`,
  });
  const s = new Mesh(new SphereGeometry(400, 64, 32), m);
  s.frustumCulled = false; s.renderOrder = -10;
  s.userData.target = rt;
  return s;
}
