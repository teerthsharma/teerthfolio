// THE CUTSCENE FRAMEWORK. One player for every dock. A cutscene is DATA (scene.js, from the direction
// agent) plus three LAYERS (world, cast, fx, from their own agents) composed by the dock's build.js.
// Everything a layer needs is on `ctx` (documented field by field in CONTRACT.md).
//
//   const player = new CutscenePlayer(engine, sceneData, build, { host, seed, onEnd, onSkip });
//   player.init();            // builds the layers; a throwing layer is isolated, the rest still play
//   player.seek(t);           // draws the frame at clock t (lab: ?cut=<dock>&t=<s>)
//   player.update(dt);        // advance the clock and draw
//   player.resize(w, h);      // frame aspect
//   player.dispose();
//
// The frame pipeline, in order, each frame:
//   cue(t)            the beats active and fired this frame (cue.on / cue.k / cue.fired ...)
//   seal.update       poses from seal.track and `pose` beats; position from seal.moves
//   director.at(t)    the camera law (director.js) -> THREE camera, trauma shake added
//   sakuga.apply(t)   impact frames, speed lines, shock ring (sakuga-api.js)
//   applyFrame(t)     the frame law (framework/law.js): bars, iris, grade, grain, flat and invert frames, shake
//   layers.update     world / cast / fx, each on its OWN stepped time (twos or threes; ones or held inside a window)
//   engine.frame      plate (layer 0, baked per shot) + characters (layer 1, redrawn per step) + the composite
//   overlay.update    bubbles, lettering, credit (overlay.js)
//
// Timeline: t in seconds from the start of the pocket. scene.fps is the character timing (12 twos, 8 threes);
// the camera and the composite always run at the display rate (post-composite motion stays smooth).
import * as THREE from "three";
import { Group, PerspectiveCamera, Scene, Vector3 } from "three";
import { CameraDirector, MAX_SHOT } from "./framework/director.js";
import { placeSeal, setLayer, POSE_NAMES } from "./framework/seal.js";
import { Overlay } from "./framework/overlay.js";
import { SakugaApi } from "./framework/sakuga-api.js";
import { plateLayer, bakeSky, bakeCard, shotPlateKey } from "./framework/plates.js";
import { bgApply, bgQuery } from "../kit/bg/presets.js";
import { compileLaw, normBeat, frameIndex, rgb, FRAME_BEATS } from "./framework/law.js";
import { painting, bakedDome } from "../paint.js";
import { glslFor, tool, TOOLS, uniformsFor } from "../tools/index.js";
import { step as sakugaStep, ease3 } from "../sakuga.js";
import { styleById } from "../styles.js";
import { celLayer } from "../kit/fx/cel.js";
import { cone, ell, paint, painted, polygonize } from "../sdf.js";
import * as sealKit from "../kit/costumed-seal-kit.js";
import * as eyeKit from "../kit/anime-eye-decal.js";
import * as hairKit from "../kit/hair-clump-kit.js";

export { CameraDirector, MAX_SHOT, placeSeal, setLayer, POSE_NAMES, Overlay, SakugaApi, plateLayer, bakeSky, bakeCard };
export const RESERVED_BEATS = ["impact", "speedlines", "shock", "trauma", "pose", ...FRAME_BEATS]; // handled by the player itself

// a deterministic rng for layers (so a scrubbed frame equals a played one): mulberry32
export const rngOf = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// build.js helper: build the three layers, each isolated. A layer that throws at build leaves an empty group
// and an entry in .errors; one that throws in update is muted after the first error. `layers` maps a layer name
// to its `build(ctx)`: { world, cast, fx }. World is layer 0 (the plate); cast and fx are layer 1.
export function composeLayers(ctx, layers) {
  const group = new Group(), parts = [], errors = [];
  group.name = `cut:${ctx.scene.id}`;
  if (ctx.scene.cel?.length && layers.fx) { const own = layers.fx; layers = { ...layers, fx: (c) => { const l = own(c), g = celLayer(c), root = new Group(); root.add(l.group, g.group); return { group: root, update: (t, dt, cue) => { l.update?.(t, dt, cue); g.update(t, dt, cue); }, dispose: () => { l.dispose?.(); g.dispose(); } }; } }; } // scene.cel data (kit/fx/cel.js)
  for (const [name, fn] of Object.entries(layers)) {
    try {
      let l = fn(ctx);
      if (!l?.group) throw new Error(`${name}/index.js must return { group, update, dispose }`);
      l.group.name = name;
      if (name === "world" && (ctx.scene.bg !== false || bgQuery(false))) { try { const a = bgApply(ctx, l.group, ctx.scene.bg); if (a) { const u0 = l.update, d0 = l.dispose; l = { ...l, update: (t, dt, cue) => { u0?.(t, dt, cue); a.update(t, dt, cue); }, dispose: () => { d0?.(); a.dispose(); } }; } } catch (e) { console.warn(`[cut ${ctx.scene.id}] bg pass skipped:`, e); } } // scene.bg (kit/bg/presets.js): the painted-set pass every dock gets
      setLayer(l.group, name === "world" ? 0 : 1);
      group.add(l.group);
      parts.push({ name, l, dead: false });
    } catch (e) { console.error(`[cut ${ctx.scene.id}] layer ${name} failed to build:`, e); errors.push({ layer: name, message: String(e?.stack ?? e) }); }
  }
  return {
    group, errors,
    update(t, dt, cue) {
      for (const p of parts) {
        if (p.dead) continue;
        const lt = cue?.layerT ? cue.layerT(p.name) : t; // the layer's own clock (a ones or freeze window)
        if (cue) { cue.ts = lt; cue.layer = p.name; }
        try { p.l.update?.(lt, dt, cue); } catch (e) { p.dead = true; console.error(`[cut ${ctx.scene.id}] layer ${p.name} update failed:`, e); errors.push({ layer: p.name, message: String(e?.stack ?? e) }); }
      }
      if (cue) { cue.ts = t; cue.layer = null; }
    },
    dispose() { for (const p of parts) { try { p.l.dispose?.(); } catch (e) { console.error(e); } } },
  };
}

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export class CutscenePlayer {
  constructor(engine, data, build, o = {}) {
    this.engine = engine; this.data = data; this.buildFn = build; this.o = o;
    this.t = 0; this.prevT = -1; this.duration = data.duration ?? 20;
    this.fps = data.fps ?? styleById(data.style ?? "modern-anime").timing.fps;
    this.errors = []; this.built = null; this.ended = false;
    this.law = compileLaw(data, this.fps); this.bar = 0; this._over = { s: 1, win: null, key: "" }; this._sh = [0, 0, 0];
    this.aspect = 1180 / 820;
    this.root = new Scene();
    this.camera = new PerspectiveCamera(32, this.aspect, 0.1, data.far ?? 1500);
    this.shake = new Vector3();
    this.box = null; // the seal's screen box, frame fractions [x0, y0, x1, y1], y down
    this._v = new Vector3();
  }

  init() { for (const _ of this.initSteps()); return this; }

  // init as a generator: each yield ends one slice of work, so a caller can spread the build over frames (lib/anime/prep.js)
  *initSteps() {
    const { engine } = this;
    const data = this.lookData();
    this.styleEngine();
    yield;
    this.sakuga = new SakugaApi(engine);
    this.director = new CameraDirector(data, (m) => { this.errors.push({ layer: "camera", message: m }); console.warn(`[cut ${data.id}]`, m); });
    this.seal = placeSeal(engine, { ...(data.seal ?? {}), at: data.seal?.at ?? [0, 0, 0] });
    this.root.add(this.seal.group);
    this.director.sealState = () => this.seal; // the camera follows the LIVE seal handle (at, yaw, scale)
    this.director.sealAt = (t) => this.sealPlace(this.law.time("cast", t));
    this.frameStatics();
    yield;
    // beats: sorted; reserved ones are handled here (sakuga, pose), the rest are for the layers
    this.beats = [...(data.beats ?? [])].map(normBeat).sort((a, b) => a.t - b.t);
    this.track = [...(data.seal?.track ?? [])];
    for (const b of this.beats) {
      if (b.name === "pose") this.track.push({ t: b.t, pose: b.pose, dur: b.dur, hold: b.hold, out: b.out, k: b.k });
      this.sakuga.fromBeat(b);
    }
    this.seal.track = this.track;
    this.ctx = this.makeCtx();
    try { this.built = this.buildFn(this.ctx); } catch (e) { console.error(`[cut ${data.id}] build failed:`, e); this.errors.push({ layer: "build", message: String(e?.stack ?? e) }); this.built = null; }
    if (this.built?.group) this.root.add(this.built.group);
    if (this.built?.errors) this.errors.push(...this.built.errors);
    yield;
    this.cue = this.makeCue();
  }

  // the dock's data with the frame ink folded into its look (the object init() and restyle() read)
  lookData() {
    const F = this.data.frame ?? {};
    if (F.ink && !this.data.look?.lines?.ink) return { ...this.data, look: { ...this.data.look, lines: { ...this.data.look?.lines, ink: F.ink } } };
    return this.data;
  }

  // the engine state this dock owns: the style (`scene.style` merged with `scene.look`), the plates, the root background
  styleEngine() {
    const { engine } = this, data = this.lookData();
    const base = styleById(data.style ?? "modern-anime");
    engine.setStyle(data.look ? { ...base, ...data.look, post: { ...base.post, ...(data.look.post ?? {}) }, lines: { ...base.lines, ...(data.look.lines ?? {}) }, fill: { ...base.fill, ...(data.look.fill ?? {}) } } : base);
    engine.composer.plates = data.plates !== false;
    if (data.bg !== undefined) this.root.background = new THREE.Color(data.bg);
  }

  // frame law statics on the shared targets; the crop program links here, never on a cut. A resident engine first gets back its own defaults.
  frameStatics() {
    const { engine } = this, F = this.data.frame ?? {};
    const u = engine.composer.u, pu = engine.composer.pu;
    const d = (engine.frameDefaults ??= { ink: u.uFInk.value.clone(), floor: u.uInkFloor.value.clone(), lift: u.uLift.value.clone(), grain: u.uGrain.value, haze: pu.uHaze.value.clone(), hazeR: pu.uHazeR.value.clone() });
    u.uFInk.value.copy(d.ink); u.uInkFloor.value.copy(d.floor); u.uLift.value.copy(d.lift); u.uGrain.value = d.grain; pu.uHaze.value.copy(d.haze); pu.uHazeR.value.copy(d.hazeR);
    if (F.ink) { u.uFInk.value.setRGB(...rgb(F.ink)); u.uInkFloor.value.setRGB(...rgb(F.floor ?? F.ink)); }
    if (F.lift) u.uLift.value.set(F.lift[0], F.lift[1]);
    if (F.grain?.amt !== undefined) u.uGrain.value = F.grain.amt;
    if (F.haze) { pu.uHaze.value.set(F.haze.col ?? "#ffffff"); pu.uHazeR.value.set(F.haze.amt ?? 1, F.haze.start ?? 0, 0, F.haze.k ?? 0.002); }
    const os = Math.max(0, ...this.director.shots.map((s) => s.over?.scale ?? 0));
    if (os > 1) engine.composer.warmOverscan(os);
  }

  // a prepared player taken after another dock ran on the same engine: its style and statics again
  restyle() { this.styleEngine(); this.frameStatics(); return this; }

  makeCtx() {
    const { engine, data } = this;
    return {
      THREE, engine, scene: data, palette: data.palette ?? {}, seal: this.seal,
      camera: this.director, // the camera-law director: ctx.camera.at(t), .shots, .report()
      tools: { glslFor, tool, TOOLS, uniformsFor },
      sakuga: this.sakuga, // impact(t), speedLines({...}), shock({...}), trauma(a)
      bake: { plateLayer: (body, o) => plateLayer(engine, body, o), sky: (body, o) => bakeSky(engine, body, o), card: (body, o) => bakeCard(engine, body, o), painting: (body, o) => painting(engine.shared, body, o), dome: (body, o) => bakedDome(engine.renderer, body, o) },
      kit: { ...sealKit, ...eyeKit, ...hairKit },
      sdf: { cone, ell, paint, painted, polygonize }, // the SDF modeller and the paint() helper (sdf.js)
      rng: (salt = 0) => rngOf((data.seed ?? 1) * 7919 + salt),
      setLayer, step: (t) => sakugaStep(t, this.fps), ease: { smooth, ease3 }, fps: this.fps,
      root: this.root, aspect: () => this.aspect, player: this,
      get tier() { return engine.tier; }, atTier: (n) => engine.tier >= n, // the lowest tier an effect or surround shader runs at
    };
  }

  // the cue object layers read (one instance, mutated per frame)
  makeCue() {
    const P = this;
    return {
      t: 0, ts: 0, dt: 0, duration: P.duration, fps: P.fps, shot: null, shotN: 0, shotU: 0, law: "free", cut: false,
      fired: [], active: [], seal: P.seal, aspect: P.aspect, ones: false, layer: null, pan: null, tier: P.engine.tier,
      layerT(name) { return P.law.time(name, this.t); },
      frozen(name) { return P.law.frozen(name, this.t); },
      on(name) { return this.active.some((b) => b.name === name); },
      beat(name) { return this.active.find((b) => b.name === name) ?? null; },
      // progress 0..1 of the named beat across its dur (0 when it is not active)
      k(name) { const b = this.beat(name); return b ? Math.min(1, Math.max(0, (this.t - b.t) / Math.max(1e-6, b.dur))) : 0; },
      arg(name, key, def) { const b = this.beat(name); return b && b[key] !== undefined ? b[key] : def; },
      // seconds since the named beat last started (Infinity before it)
      since(name) { let s = Infinity; for (const b of P.beats) if (b.name === name && b.t <= this.t) s = Math.min(s, this.t - b.t); return s; },
      // 1 once the named beat has started (a latch), else 0
      done(name) { return P.beats.some((b) => b.name === name && b.t <= this.t) ? 1 : 0; },
    };
  }

  resize(w, h) { this.aspect = w / Math.max(1, h); this.camera.aspect = this.aspect; this.camera.updateProjectionMatrix(); }

  // seal position from scene.seal.moves: [{ t:[a,b], to:[x,y,z], yaw? , ease? }] applied in order
  sealPlace(t) {
    const S = this.data.seal ?? {};
    let at = [...(S.at ?? [0, 0, 0])], yaw = S.yaw ?? 0;
    for (const m of S.moves ?? []) {
      const k = smooth((t - m.t[0]) / Math.max(1e-6, m.t[1] - m.t[0]));
      if (k <= 0) break;
      const to = m.to ?? at;
      at = [lerp(at[0], to[0], k), lerp(at[1], to[1], k), lerp(at[2], to[2], k)];
      if (m.yaw !== undefined) yaw = lerp(yaw, m.yaw, k);
    }
    return { at, yaw, scale: S.scale ?? 1 };
  }
  placeSealAt(t) { Object.assign(this.seal, this.sealPlace(t)); }

  // the frame law for clock t, as uniform writes (framework/law.js holds the maths)
  applyFrame(t, sh) {
    const { law, engine, box } = this, u = engine.composer.u, F = law.frame, A = this.aspect;
    const bar = law.box(t, A);
    if (bar !== null) u.uBox.value = bar;
    this.bar = u.uBox.value;
    const G = law.grade(t, sh?.data.grade ?? null);
    u.uFSh.value.setRGB(...G.sh); u.uFHi.value.setRGB(...G.hi); u.uFGrade.value.set(G.amt, G.mono);
    if (F.grain) u.uFGrain.value.set(F.grain.luma ?? 1, frameIndex(t, law.grainFps(t)) % 97, 1);
    const fl = law.flat(t);
    u.uFlatK.value.set(fl ? (fl.bypass ? 2 : 1) : 0, fl?.paint ? 1 : 0);
    if (fl) u.uFlatCol.value.setRGB(...rgb(fl.col));
    u.uInv.value = law.invert(t);
    const ir = law.iris(t);
    if (!ir) u.uIris.value.z = -1;
    else {
      let c = ir.at;
      if (c === "chest") { this.seal.chest(this._v).project(this.camera); c = [this._v.x * 0.5 + 0.5, 0.5 - this._v.y * 0.5]; }
      else if (!Array.isArray(c)) c = box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : [0.5, 0.5];
      u.uIris.value.set(c[0], 1 - c[1], ir.unit === "seal" ? ir.r * (box ? box[3] - box[1] : 0.2) : ir.r, ir.ring);
      u.uIrisCol.value.setRGB(...rgb(ir.ringCol));
    }
    const s = law.shake(t, this._sh), calm = sh?.menace ? sh.menace.calm ?? 0.25 : 1;
    u.uShake.value.set((s[0] / A) * calm, s[1] * calm, 2 * s[2] * calm);
  }

  // a dock with no scene.cel still lights the seal with its power: each impact or shake beat sets the rim from the beat's light colour (or the palette's accent), decaying; a hold keeps a floor of it
  fxRim(t, sh) {
    if (this.data.cel?.length) return;
    const rim = (this.engine.shared.uFxRim ??= { value: new THREE.Vector4() }), H = (this._hits ??= this.beats.flatMap((b) => (b.name === "impact" || b.name === "shake" ? (b.schedule ? b.schedule.map((x) => [x.t, b]) : [[b.t, b]]) : [])).sort((a, b) => a[0] - b[0]));
    let hit = null;
    for (const h of H) { if (h[0] > t) break; hit = h; }
    const age = hit ? t - hit[0] : 9, pal = this.data.palette ?? {}, c = this._rc ??= new THREE.Color();
    const ok = (h) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h), tone = (h) => { c.set(h); const m = Math.max(c.r, c.g, c.b); return m > 0 ? (m - Math.min(c.r, c.g, c.b)) / m : 0; };
    const lit = hit?.[1].cols?.[0], col = ok(lit) && tone(lit) > 0.3 ? lit : [pal.glow, pal.accent, pal.key, pal.red].find(ok) ?? "#ff6a3a";
    const L = Math.max(0.9 * Math.exp(-age * 3.5), sh?.menace ? 0.4 : 0);
    c.set(col); rim.value.set(c.r, c.g, c.b, L);
  }

  boxOf() {
    // 8 corners of the seal's box (0.8 m tall, 0.78 m wide), projected; y flipped to screen space
    const h = this.seal, s = h.scale, c = this.camera;
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9, vis = false;
    const cy = Math.cos(h.yaw), sy = Math.sin(h.yaw);
    for (const dx of [-0.39, 0.39]) for (const dz of [-0.4, 0.4]) for (const dy of [0, 0.85]) {
      const lx = dx * s, lz = dz * s;
      this._v.set(h.at[0] + lx * cy + lz * sy, h.at[1] + dy * s, h.at[2] - lx * sy + lz * cy).project(c);
      if (this._v.z > 1) continue;
      vis = true;
      x0 = Math.min(x0, this._v.x); x1 = Math.max(x1, this._v.x); y0 = Math.min(y0, this._v.y); y1 = Math.max(y1, this._v.y);
    }
    this.box = vis ? [x0 * 0.5 + 0.5, 0.5 - y1 * 0.5, x1 * 0.5 + 0.5, 0.5 - y0 * 0.5] : null;
  }

  seek(t) { this.prevT = t - 1 / 120; this.t = t; this.draw(t, 0); }
  update(dt) {
    const prev = this.t;
    this.t = Math.min(this.duration, this.t + dt);
    this.draw(this.t, dt, prev);
    if (this.t >= this.duration && !this.ended) { this.ended = true; this.o.onEnd?.(); }
  }

  draw(t, dt, prev = this.prevT) {
    const { engine, cue, camera, law } = this, tc = law.time("cast", t); // the hero keeps the cast's clock
    // 1. cue
    cue.t = t; cue.dt = dt; cue.ts = tc; cue.aspect = this.aspect; cue.ones = law.onesAt(t); cue.tier = engine.tier;
    cue.fired = this.beats.filter((b) => b.t > prev && b.t <= t);
    cue.active = this.beats.filter((b) => b.t <= t && t < b.t + b.dur);
    for (const b of cue.fired) this.sakuga.onFired(b);
    // 2. the seal
    this.placeSealAt(tc); // the hero is drawn on twos/threes like every character
    this.seal.update(tc, dt, this.track);
    // 3. the camera law
    const out = this.director.at(t, this.aspect), sh = this.director.shot, C = engine.composer;
    if (out.win && C.w) for (const j of [0, 1]) { const n = (j ? C.h : C.w) * sh.over.scale; out.win[j] = Math.round(out.win[j] * n) / n; }
    engine.trauma.offset(t, this.shake);
    this.director.apply(camera, out, this.shake);
    cue.pan = out.pan;
    cue.shot = sh; cue.shotN = sh?.n ?? 0; cue.shotU = out.shotU ?? 0; cue.law = sh?.law ?? "free"; cue.cut = !!out.cut;
    engine.composer.dof = sh?.dof ?? this.data.dof ?? null;
    engine.menace = sh?.menace ?? null; if (sh?.menace) this.shake.multiplyScalar(sh.menace.calm ?? 0.25); // the seal holds: the world, not the seal, takes the hit
    camera.far = this.data.far ?? 1500; camera.updateProjectionMatrix();
    // 4. sakuga windows
    this.sakuga.apply(t);
    engine.clockFps = cue.ones ? 24 : null; // a ones window redraws the cel, its lines and the grain at 24
    engine.plateSeed = sh?.hold ? frameIndex(sh.t0, this.fps) : null; // a held plate's lines are drawn as on the cut, whenever it is baked
    const O = this._over;
    engine.over = out.win ? (O.s = sh.over.scale, O.win = out.win, O.key = out.win.join(), O) : null;
    camera.updateMatrixWorld(); this.boxOf();
    this.applyFrame(t, sh);
    this.fxRim(t, sh);
    // 5. layers, each on its own stepped time
    this.built?.update?.(tc, dt, cue);
    // 6. render
    engine.plateTag = ":" + shotPlateKey(sh, t, engine.clockFps ?? 12);
    this.seal.chest(engine.shadowFocus ??= new Vector3()); // the cast-shadow map is fitted round the hero
    engine.frame(this.root, camera, t, dt);
    // 7. overlay
    this.overlay?.update(t, this.box, this.bar);
    this.prevT = t;
  }

  attachOverlay(host) {
    this.overlay = new Overlay(host, this.data, { seed: this.o.seed, onSkip: this.o.onSkip });
    return this.overlay;
  }

  dispose() {
    try { this.built?.dispose?.(); } catch (e) { console.error(e); }
    this.overlay?.dispose();
    const e = this.engine, u = e.composer.u;
    e.clockFps = null; e.over = null; e.menace = null; e.plateSeed = null; e.shared.uFxRim?.value.set(0, 0, 0, 0);
    u.uIris.value.z = -1; u.uFlatK.value.set(0, 0); u.uInv.value = 0; u.uFGrade.value.set(0, 0); u.uFGrain.value.set(0, 0, 0); u.uShake.value.set(0, 0, 0);
  }
}
