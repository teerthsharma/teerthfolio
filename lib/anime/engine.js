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
import { frameIndex, Impact, Trauma } from "./sakuga.js";
import { Governor } from "./governor.js";
import { ShadowPass } from "./render/shadow.js";
import { Photo } from "./render/photo.js";
import { withMenace } from "./render/photo-presets.js";
import cel from "./tools/cel.js";

// dock GLSL that WebGL2's front end rejects, mended at the one door every program passes: words GLSL ES 3.00
// reserves are renamed, and a fragment shader that calls the cel tool without including it gets it
const RESERVED = /\b(cast|patch|sample|filter|input|output|active|common|partition|half|fixed|superp|namespace|using|sizeof|union|enum|typedef|template|this|goto|inline|noinline|volatile|public|static|extern|external|interface|long|short|double|unsigned|class|asm|resource|subroutine|coherent|restrict|readonly|writeonly|noperspective)\b/g;
export function mendGlsl(src, frag) {
  if (!src.startsWith("#version 300 es")) return src;
  src = src.replace(RESERVED, "$1_");
  if (frag && /\b(cel3|celSteps?)\s*\(/.test(src) && !/\bfloat\s+celStep\s*\(/.test(src)) {
    const m = /(?:^[ \t]*precision\s+\w+\s+\w+\s*;[ \t]*\r?\n)+/m.exec(src);
    if (m) src = src.slice(0, m.index + m[0].length) + cel.glsl + "\n" + src.slice(m.index + m[0].length);
  }
  return src;
}
const SHARP = 0.04; // the largest circle of confusion the hero may take: inside the old blur mix's dead zone

export class AnimeEngine {
  constructor(canvas, o = {}) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
    const gl = this.renderer.getContext(), source = gl.shaderSource.bind(gl);
    gl.shaderSource = (s, code) => source(s, mendGlsl(code, gl.getShaderParameter(s, gl.SHADER_TYPE) === gl.FRAGMENT_SHADER));
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    this.adapter = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    this.tier = o.tier ?? classify(this.adapter);
    // ablation: names of passes to skip (lines, shadow, satsuei, lens, cel, overlay: overlays stay on the cel, ids: a layer-1 set id of 0.5 is not lifted); the frame renders as if they did not exist
    this.off = new Set(o.off ?? []);
    this.shared = sharedUniforms();
    this.composer = new Composer(this.renderer, { tier: this.tier, samples: this.tier >= 3 ? 4 : 0, shared: this.shared });
    // S0: the cast-shadow map, fitted round shadowFocus (the hero; set by the cutscene player) once per character step
    this.shadowPass = new ShadowPass(this.renderer, this.shared, { tier: this.tier });
    this.photo = new Photo(this.renderer, { type: this.composer.type, tier: this.tier });
    this.photoState = { P: null, hit: 0, beat: 0, beatCol: null };
    this.defaultLight = this.shared.uLightDir.value.clone(); this.lightOwned = false;
    const sat = this.composer.satsuei, satRender = sat.render.bind(sat);
    sat.render = (a) => { const out = satRender(a); const s = this.photoState; if (this.off.has("photo") || !s.P || !s.P.on) return out; this.composer.tick("photo"); return this.photo.render({ src: out, tPlateD: a.tPlateD, tCelD: a.tCelD, camera: a.camera, focus: a.focus, light: a.lightDir, fx: this.shared.uFxRim?.value ?? null, ...s, t: this.shared.uTime.value }); };
    this.shadowFocus = null; this.shadowRadius = 6; this.shadowKey = null; this._hv = new Vector3();
    this.impact = new Impact();
    this.trauma = new Trauma();
    this.governor = new Governor({ tier: this.tier, budgetMs: o.budgetMs ?? 1000 / 30, fixed: o.tier !== undefined });
    this.style = null;
    this.setStyle(o.style ?? "modern-anime");
    this.lightUV = new Vector2(0.5, 0.8);
    this.sun = null; // world position of the shaft source, if the scene has one
    this.squeeze = 1;
    // frame law (set per frame by the cutscene player): the cel's rate in a ones window, a 2D move's crop { s, win, key }, a held plate's line seed
    this.clockFps = null; this.over = null; this.plateSeed = null; this.menace = null;
  }
  // between cuts on a resident engine: what one cut left behind (the player's dispose clears the frame law)
  reset() {
    this.composer.reset();
    this.photoState = { P: null, hit: 0, beat: 0, beatCol: null };
    this.impact = new Impact(); this.trauma = new Trauma();
    this.sun = null; this.shadowFocus = null; this.shadowKey = null; this.composer.dof = null;
    if (this.lightOwned) { this.shared.uLightDir.value.copy(this.defaultLight); this.lightOwned = false; }
    this.squeeze = 1; this.clockFps = null; this.over = null; this.plateSeed = null; this.menace = null;
    this.governor.s = [];
  }
  setStyle(id) {
    this.style = typeof id === "string" ? styleById(id) : id;
    applyStyle(this.style, this.shared, this.composer);
    const lab = typeof location !== "undefined" ? new URLSearchParams(location.search).get("photo") : null;
    this.photo.configure(lab ?? this.style.photo, (this.style.fill?.flat ?? 0) >= 0.5);
    if (this.lightOwned) { this.shared.uLightDir.value.copy(this.defaultLight); this.lightOwned = false; }
    if (this.off.has("cel")) this.shared.uS3.value.set(0, 0, 0, 0);
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
    this.photo.tier = t;
    this.composer.tier = t;
    this.shadowPass.tier = t; this.shadowKey = null;
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
  // ink a prop: an inverted-hull outline at a constant pixel width (lines.px x mul) in black, sharing the geometry
  ink(mesh, mul = 1) {
    const h = new Mesh(mesh.geometry, hullMaterial(this.shared, { mul, ink: this.style.lines?.ink ?? "#000000", constant: true }));
    h.renderOrder = -1; mesh.add(h);
    return mesh;
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
    const fps = this.clockFps ?? this.style.timing.fps;
    u.uSeed.value = Math.floor(t * fps) % 97;
    u.uImpact.value.x = this.impact.mode(t);
    u.uCA.value = u.uImpact.value.x > 0 ? 2.5 : (this.style.post.ca ?? 0);
    // the shot's [focus m, strength, on]; the style scales the strength
    camera.updateMatrixWorld();
    let P = this.photo.at(t); if (this.menace && P.on) P = withMenace(P, this.menace);
    const ph = this.photoState, shk = u.uShake.value.z;
    ph.P = P; ph.hit = u.uImpact.value.x > 0 ? 1 : Math.min(1, shk * 12); ph.beat = this.photo.beat; ph.beatCol = this.photo.beatCol;
    if (P.on && P.key.sync && P.key.dir) {
      this.lightOwned = true;
      const d = this._hv.set(...P.key.dir); if (P.space !== "world") d.transformDirection(camera.matrixWorld); else d.normalize();
      this.shared.uLightDir.value.copy(d);
    }
    let dof = this.composer.dof;
    if (!dof && P.on && P.dof.amt > 0 && this.shadowFocus) dof = this.composer.dof = [Math.max(0.5, this._hv.copy(this.shadowFocus).applyMatrix4(camera.matrixWorldInverse).z * -1), P.dof.amt * 0.8, 1];
    if (dof) {
      const s = dof[1] * (this.style.post.dof ?? 1), v = this._hv;
      let f = dof[0];
      // the hero on screen is the subject: the focus moves toward it only as far as keeps it sharp
      if (this.shadowFocus && s > 0) {
        v.copy(this.shadowFocus).project(camera);
        if (Math.max(Math.abs(v.x), Math.abs(v.y)) <= 1 && Math.abs(v.z) < 1) {
          const iz = -1 / v.copy(this.shadowFocus).applyMatrix4(camera.matrixWorldInverse).z, e = SHARP / s;
          f = 1 / Math.min(iz + e, Math.max(iz - e, 1 / Math.max(f, 1e-3)));
        }
      }
      u.uDof.value.set(f, s, dof[2]);
    }
    this.trauma.update(dt);
    let shafts = null;
    if (this.sun) {
      const p = new Vector3().copy(this.sun).project(camera);
      if (p.z < 1) shafts = this.lightUV.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    }
    // plates: the world once per (shot, style, size), the characters, their lines and their shadow once per step
    const step = frameIndex(t, fps), char = `${this.style.id}:${fps}:${step}`;
    if (this.off.has("shadow")) { this.shadowPass.off(); this.shadowKey = null; }
    else if (char !== this.shadowKey) {
      this.composer.tick("shadow");
      this.shadowPass.render(scene, { focus: this.shadowFocus, radius: this.shadowRadius, lightDir: this.shared.uLightDir.value });
      this.composer.tick(null);
      this.shadowKey = char;
    }
    this.composer.off = this.off; this.composer.focus = this.shadowFocus;
    this.composer.render(scene, camera, rect, shafts, { plate: this.style.id + (this.plateTag ?? ""), char: this.over ? `${char}:${this.over.key}` : char, seed: step, over: this.over, plateSeed: this.plateSeed });
  }
  // T3: feed the measured frame time; the governor moves the tier on long bars only
  observe(ms, t) {
    const next = this.governor.observe(ms, t);
    if (next !== this.tier) this.setTier(next);
  }
}
export { TIERS };
