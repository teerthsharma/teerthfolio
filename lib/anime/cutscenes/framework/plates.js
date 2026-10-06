// THE PLATE BAKER: painted far layers. Anime backgrounds are paintings, so a far layer is painted ONCE
// (procedurally, in GLSL, from the paint kit and the shader tools) and then reused as a plate.
//
//   plateLayer(engine, body, o)   a fullscreen painting at the far plane (paint.js painting()), layer 0.
//                                 body: GLSL defining `vec3 paint(vec2 p)`, p in height units: x in [0, aspect],
//                                 y in [0, 1] up. o: { tools, id, uniforms }. Values above 1 are emissive.
//   bakeSky(engine, body, o)      a painted dome baked to a texture over the azimuth/elevation window the shot can
//                                 see (paint.js bakedDome): correct under any camera rotation or arc.
//                                 body: GLSL `vec3 sky(float az, float el)`. o: { az, el, pxPerRad, tools, uniforms }.
//   bakeCard(engine, body, o)     a painted CARD in the world: body defines `vec4 paint(vec2 p)` (rgb + coverage);
//                                 baked once into a half-float texture, drawn as a cutout quad (coverage < 0.5 is
//                                 discarded, so no blending touches the id channel). Mountains, cloud banks, a
//                                 skyline, a face-on wall of painted brickwork. o: { w, h, size:[w m, h m], tools,
//                                 id, billboard, uniforms }. Returns the Mesh; mesh.userData.dispose() frees it.
//   shotPlateKey(player)          internal: the plate re-bakes when the shot changes, or, while the camera moves,
//                                 every 1/12 s (twos), never otherwise. Layer 0 is therefore STATIC ART; anything
//                                 that animates goes on layer 1 (userData.layer = 1), which redraws each step.
//
// The plate is composed under the characters by depth (post.js COMP), then painted: Kuwahara, haze, posterise.
import { Color, DoubleSide, HalfFloatType, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderTarget } from "three";
import { painting, bakedDome, KIT } from "../../paint.js";
import { glslFor } from "../../tools/index.js";

export function plateLayer(engine, body, o = {}) {
  const m = painting(engine.shared, body, o);
  m.userData.layer = 0;
  return m;
}

export function bakeSky(engine, body, o = {}) {
  const s = bakedDome(engine.renderer, body, o);
  s.userData.layer = 0;
  return s;
}

export function bakeCard(engine, body, o = {}) {
  const w = o.w ?? 1024, h = o.h ?? 512, asp = w / h;
  const rt = new WebGLRenderTarget(w, h, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  const bake = new ShaderMaterial({
    uniforms: { uAsp: { value: asp }, ...(o.uniforms ?? {}) },
    vertexShader: "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform float uAsp; varying vec2 vUv; ${o.tools ? glslFor(o.tools) : KIT} ${body}
      void main() { gl_FragColor = paint(vec2(vUv.x * uAsp, vUv.y)); }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), bake); quad.frustumCulled = false;
  const r = engine.renderer, prev = r.getRenderTarget();
  r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear();
  r.render(new Scene().add(quad), new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  r.setRenderTarget(prev);
  bake.dispose(); quad.geometry.dispose();
  const mat = new ShaderMaterial({
    side: DoubleSide, depthWrite: true,
    uniforms: { tCard: { value: rt.texture }, uId: { value: o.id ?? 0.5 }, uTint: { value: new Color(o.tint ?? "#ffffff") } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D tCard; uniform float uId; uniform vec3 uTint; varying vec2 vUv;
      void main() { vec4 c = texture2D(tCard, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb * uTint, uId); }`,
  });
  const size = o.size ?? [asp * 10, 10];
  const card = new Mesh(new PlaneGeometry(size[0], size[1]), mat);
  card.userData.layer = o.layer ?? 0;
  card.frustumCulled = false;
  if (o.billboard) card.onBeforeRender = (_r, _s, cam) => { card.quaternion.copy(cam.quaternion); };
  card.userData.dispose = () => { rt.dispose(); mat.dispose(); card.geometry.dispose(); };
  return card;
}

// the key the composer reads to decide whether the plate must be re-rendered (see player.js)
export function shotPlateKey(shot, t, plateFps = 12) {
  if (!shot) return "x";
  return shot.moving ? `${shot.i}:${Math.floor(t * plateFps)}` : `${shot.i}`;
}
