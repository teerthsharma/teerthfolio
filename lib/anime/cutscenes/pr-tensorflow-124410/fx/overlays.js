// FX OVERLAYS: the barrage's speed lines (jojo table, mudaSpeed) as a keyed full-frame panel, tinted to the palette's ink and cream. The pack loads async; the overlay appears when ready.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, WebGLRenderTarget } from "three";
import { fnClashes, loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { HIT } from "../clock.js";
import { araki } from "../live/shared.js";
import { TONE } from "../tone.js";

const NAMES = ["mudaSpeed"];
const EFFECTS = [{ entry: "mudaSpeed", win: HIT.barrage.map((t) => [t, 2 / 24]) }];
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const HEAD = /* glsl */ `
  ${TONE}
  uniform vec3 uOvPal[16]; uniform float uOvOn, uOvT;
  varying vec2 vUv;
`;
const body = (entry) => /* glsl */ `
  void main() {
    vec3 c = ${entry}(vUv, uOvT), g = ${entry}(vec2(0.0), 0.0);
    float a = step(0.04, distance(c, g)) * uOvOn, lum = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 col = mix(uOvPal[5], mix(uOvPal[3], uOvPal[15], smoothstep(0.35, 0.8, lum)), smoothstep(0.2, 0.3, lum));
    gl_FragColor = vec4(siteTone(pow(col, vec3(2.2))) * a, a);
  }`;

export function makeOverlays(ctx) {
  const group = new Group(), U = araki(ctx).U, meshes = [];
  const packs = Promise.resolve(loadPack("jojo")).then(() => {
    const clash = fnClashes(NAMES);
    if (clash.length) { console.error("[pr-tensorflow-124410] shader pull clash", clash); return; }
    const glsl = glslFor(NAMES), geo = new PlaneGeometry(2, 2);
    EFFECTS.forEach((e) => {
      const m = new ShaderMaterial({
        uniforms: { uOvPal: U.uPal, uOvOn: { value: 1 }, uOvT: { value: 0 } },
        vertexShader: VERT,
        fragmentShader: HEAD + glsl + body(e.entry),
        transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
      });
      const mesh = new Mesh(geo, m);
      mesh.frustumCulled = false; mesh.renderOrder = 1280 + meshes.length; mesh.visible = false;
      group.add(mesh); meshes.push({ mesh, win: e.win });
    });
    linkAll();
  });
  // the pack arrives after build's warm-up, so link the program here, hidden, the way build warms the rest
  const linkAll = () => {
    try {
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new WebGLRenderTarget(4, 4);
      meshes.forEach(({ mesh }) => { mesh.visible = true; }); cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(group, cam); R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      meshes.forEach(({ mesh }) => { mesh.visible = false; });
    } catch (err) { console.warn("[pr-tensorflow-124410] overlay warm-up skipped", err); }
  };
  packs.catch((err) => console.error("[pr-tensorflow-124410] overlays unavailable", err));
  return {
    group,
    update(t) {
      const on = ctx.atTier ? ctx.atTier(2) : true;
      for (const { mesh, win } of meshes) {
        mesh.visible = on && win.some(([t0, d]) => t >= t0 - 1e-6 && t < t0 + d - 1e-6);
        if (mesh.visible) mesh.material.uniforms.uOvT.value = t;
      }
    },
    dispose() { for (const { mesh } of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); } },
  };
}
