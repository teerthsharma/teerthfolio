// THE ENGINE: one WebGL2 renderer, the shared anime uniforms, the composite,
// the style, and the sakuga state. Framework-free; react-three-fiber scenes can
// adopt it by taking `animeMaterial(engine.shared)` for their meshes and calling
// `engine.frame(scene, camera)` from a useFrame at priority 1 (render takeover).
//
//   const engine = new AnimeEngine(canvas);
//   engine.setStyle("modern-anime");
//   const fig = engine.figure(geo, { head: {...} });   // surface + ink hull, shared uniforms
//   engine.frame(scene, camera, t, dt);
import { Group, Mesh, Vector2, Vector3, WebGLRenderer } from "three";
import { classify, dprFor, TIERS } from "../world/quality.js";
import { animeMaterial, hullMaterial, sharedUniforms } from "./material.js";
import { Composer } from "./post.js";
import { applyStyle, styleById } from "./styles.js";
import { Impact, Trauma } from "./sakuga.js";
import { Governor } from "./governor.js";

export class AnimeEngine {
  constructor(canvas, o = {}) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
    const gl = this.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    this.adapter = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    this.tier = o.tier ?? classify(this.adapter);
    this.shared = sharedUniforms();
    this.composer = new Composer(this.renderer, { tier: this.tier, samples: this.tier >= 3 ? 4 : 0 });
    this.impact = new Impact();
    this.trauma = new Trauma();
    this.governor = new Governor({ tier: this.tier, budgetMs: o.budgetMs ?? 1000 / 30, fixed: o.tier !== undefined });
    this.style = null;
    this.setStyle(o.style ?? "modern-anime");
    this.lightUV = new Vector2(0.5, 0.8);
    this.sun = null; // world position of the shaft source, if the scene has one
    this.squeeze = 1;
  }
  setStyle(id) {
    this.style = typeof id === "string" ? styleById(id) : id;
    applyStyle(this.style, this.shared, this.composer);
  }
  // css size + device dpr -> drawing buffer by the tier's pixel budget (lib/world/quality.js)
  resize(cssW, cssH, deviceDpr = 1) {
    this.css = [cssW, cssH, deviceDpr];
    const dpr = dprFor(this.tier, cssW, cssH, deviceDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(cssW, cssH, false);
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    this.composer.setSize(w, h);
    this.shared.uRes.value.set(w, h);
    this.dpr = dpr;
  }
  setTier(t) {
    if (t === this.tier) return;
    this.tier = t;
    this.composer.tier = t;
    if (this.css) this.resize(...this.css);
  }
  // a figure: the surface mesh and its ink hull sharing morph/smear uniforms
  figure(geo, o = {}) {
    const mat = animeMaterial(this.shared, { id: 1 });
    const hull = hullMaterial(this.shared, { ref: o.lineRef ?? 4, mul: o.lineMul ?? 1, ink: o.ink });
    for (const k of ["uMorph", "uStagger", "uSmear", "uSlime", "uSlimeAmt"]) hull.uniforms[k] = mat.uniforms[k];
    const g = new Group();
    const m = new Mesh(geo, mat);
    const h = new Mesh(geo, hull);
    h.renderOrder = -1;
    g.add(m, h);
    g.userData = { mat, hull, mesh: m, hullMesh: h };
    if (o.head) { mat.uniforms.uHeadR.value = o.head.r; g.userData.head = o.head; }
    return g;
  }
  // set props: lit by the same program, id in (0,1) so the set-line pass outlines them
  prop(geo, id = 0.5) {
    return new Mesh(geo, animeMaterial(this.shared, { id }));
  }
  // keep face frames in world space (call after moving figures)
  syncFaces(root) {
    root.updateMatrixWorld();
    root.traverse((o) => {
      const head = o.userData?.head;
      if (!head) return;
      const u = o.userData.mat.uniforms, M = o.matrixWorld;
      u.uHeadPos.value.fromArray(head.pos).applyMatrix4(M);
      u.uHeadFwd.value.fromArray(head.fwd ?? [0, 0, 1]).transformDirection(M);
      u.uHeadRight.value.fromArray(head.right ?? [1, 0, 0]).transformDirection(M);
    });
  }
  frame(scene, camera, t, dt, rect = null) {
    this.shared.uTime.value = t;
    const u = this.composer.u;
    u.uTime.value = t;
    u.uSeed.value = Math.floor(t * this.style.timing.fps) % 97;
    u.uImpact.value.x = this.impact.mode(t);
    u.uCA.value = u.uImpact.value.x > 0 ? 2.5 : 0;
    this.trauma.update(dt);
    let shafts = null;
    if (this.sun) {
      const p = new Vector3().copy(this.sun).project(camera);
      if (p.z < 1) shafts = this.lightUV.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    }
    this.composer.render(scene, camera, rect, shafts);
  }
  // T3: feed the measured frame time; the governor moves the tier on long bars only
  observe(ms, t) {
    const next = this.governor.observe(ms, t);
    if (next !== this.tier) this.setTier(next);
  }
}
export { TIERS };
