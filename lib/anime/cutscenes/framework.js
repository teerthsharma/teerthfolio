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
//   layers.update     world / cast / fx on STEPPED time ts = floor(t fps)/fps (twos or threes)
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
import { painting, bakedDome } from "../paint.js";
import { glslFor, tool, TOOLS, uniformsFor } from "../tools/index.js";
import { step as sakugaStep, ease3 } from "../sakuga.js";
import { styleById } from "../styles.js";
import { cone, ell, paint, painted, polygonize } from "../sdf.js";
import * as sealKit from "../kit/costumed-seal-kit.js";
import * as eyeKit from "../kit/anime-eye-decal.js";
import * as hairKit from "../kit/hair-clump-kit.js";

export { CameraDirector, MAX_SHOT, placeSeal, setLayer, POSE_NAMES, Overlay, SakugaApi, plateLayer, bakeSky, bakeCard };
export const RESERVED_BEATS = ["impact", "speedlines", "shock", "trauma", "pose"]; // handled by the player itself

// a deterministic rng for layers (so a scrubbed frame equals a played one): mulberry32
export const rngOf = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// build.js helper: build the three layers, each isolated. A layer that throws at build leaves an empty group
// and an entry in .errors; one that throws in update is muted after the first error. `layers` maps a layer name
// to its `build(ctx)`: { world, cast, fx }. World is layer 0 (the plate); cast and fx are layer 1.
export function composeLayers(ctx, layers) {
  const group = new Group(), parts = [], errors = [];
  group.name = `cut:${ctx.scene.id}`;
  for (const [name, fn] of Object.entries(layers)) {
    try {
      const l = fn(ctx);
      if (!l?.group) throw new Error(`${name}/index.js must return { group, update, dispose }`);
      l.group.name = name;
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
        try { p.l.update?.(t, dt, cue); } catch (e) { p.dead = true; console.error(`[cut ${ctx.scene.id}] layer ${p.name} update failed:`, e); errors.push({ layer: p.name, message: String(e?.stack ?? e) }); }
      }
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
    this.aspect = 1180 / 820;
    this.root = new Scene();
    this.camera = new PerspectiveCamera(32, this.aspect, 0.1, data.far ?? 1500);
    this.shake = new Vector3();
    this.box = null; // the seal's screen box, frame fractions [x0, y0, x1, y1], y down
    this._v = new Vector3();
  }

  init() {
    const { engine, data } = this;
    // the dock owns its look for the pocket: the style is `scene.style` (an id, or a style object) merged with scene.look
    const base = styleById(data.style ?? "modern-anime");
    engine.setStyle(data.look ? { ...base, ...data.look, post: { ...base.post, ...(data.look.post ?? {}) }, lines: { ...base.lines, ...(data.look.lines ?? {}) }, fill: { ...base.fill, ...(data.look.fill ?? {}) } } : base);
    engine.composer.plates = data.plates !== false;
    if (data.bg !== undefined) this.root.background = new THREE.Color(data.bg);
    this.sakuga = new SakugaApi(engine);
    this.director = new CameraDirector(data, (m) => { this.errors.push({ layer: "camera", message: m }); console.warn(`[cut ${data.id}]`, m); });
    this.seal = placeSeal(engine, { ...(data.seal ?? {}), at: data.seal?.at ?? [0, 0, 0] });
    this.root.add(this.seal.group);
    this.director.sealState = () => this.seal; // the camera follows the LIVE seal handle (at, yaw, scale)
    // beats: sorted; reserved ones are handled here (sakuga, pose), the rest are for the layers
    this.beats = [...(data.beats ?? [])].map((b) => ({ dur: 0.5, ...b })).sort((a, b) => a.t - b.t);
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
    this.cue = this.makeCue();
    return this;
  }

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
    };
  }

  // the cue object layers read (one instance, mutated per frame)
  makeCue() {
    const P = this;
    return {
      t: 0, ts: 0, dt: 0, duration: P.duration, fps: P.fps, shot: null, shotN: 0, shotU: 0, law: "free", cut: false,
      fired: [], active: [], seal: P.seal, aspect: P.aspect,
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
  placeSealAt(t) {
    const S = this.data.seal ?? {}, h = this.seal;
    let at = [...(S.at ?? [0, 0, 0])], yaw = S.yaw ?? 0;
    for (const m of S.moves ?? []) {
      const k = smooth((t - m.t[0]) / Math.max(1e-6, m.t[1] - m.t[0]));
      if (k <= 0) break;
      const to = m.to ?? at;
      at = [lerp(at[0], to[0], k), lerp(at[1], to[1], k), lerp(at[2], to[2], k)];
      if (m.yaw !== undefined) yaw = lerp(yaw, m.yaw, k);
    }
    h.at = at; h.yaw = yaw; h.scale = S.scale ?? 1;
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
    const { engine, cue, camera } = this;
    // 1. cue
    cue.t = t; cue.dt = dt; cue.ts = sakugaStep(t, this.fps); cue.aspect = this.aspect;
    cue.fired = this.beats.filter((b) => b.t > prev && b.t <= t);
    cue.active = this.beats.filter((b) => b.t <= t && t < b.t + b.dur);
    for (const b of cue.fired) this.sakuga.onFired(b);
    // 2. the seal
    this.placeSealAt(cue.ts); // the hero is drawn on twos/threes like every character
    this.seal.update(cue.ts, dt, this.track);
    // 3. the camera law
    const out = this.director.at(t, this.aspect);
    engine.trauma.offset(t, this.shake);
    this.director.apply(camera, out, this.shake);
    const sh = this.director.shot;
    cue.shot = sh; cue.shotN = sh?.n ?? 0; cue.shotU = out.shotU ?? 0; cue.law = sh?.law ?? "free"; cue.cut = !!out.cut;
    engine.composer.dof = sh?.dof ?? this.data.dof ?? null;
    camera.far = this.data.far ?? 1500; camera.updateProjectionMatrix();
    // 4. sakuga windows
    this.sakuga.apply(t);
    // 5. layers, on stepped time
    this.built?.update?.(cue.ts, dt, cue);
    // 6. render
    engine.plateTag = ":" + shotPlateKey(sh, t);
    engine.frame(this.root, camera, t, dt);
    // 7. overlay
    this.boxOf();
    this.overlay?.update(t, this.box);
    this.prevT = t;
  }

  attachOverlay(host) {
    this.overlay = new Overlay(host, this.data, { seed: this.o.seed, onSkip: this.o.onSkip });
    return this.overlay;
  }

  dispose() {
    try { this.built?.dispose?.(); } catch (e) { console.error(e); }
    this.overlay?.dispose();
  }
}
