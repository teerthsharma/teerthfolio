// BUILD for _fx (lab only): world = a mid-grey ground under a plain baked sky (fx=sky: the kit's own ramps), fx = the
// kit demos, each isolated so one module that fails to load, build or update leaves the rest drawing.
import { CircleGeometry, Group } from "three";
import { composeLayers } from "../framework.js";
import { V } from "../../paint.js";

const NAMES = ["particles", "flame", "beam", "shatter", "tear", "echo", "sigil", "mirror", "sky", "fur", "cel"];
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const pick = q.get("fx"), want = pick ? NAMES.filter((n) => n === pick) : NAMES.filter((n) => n !== "cel"), hits = q.get("cel") === "sukuna";
const hitsMod = hits ? await import("./hits.js") : null;
const mods = await Promise.allSettled(want.map((n) => import(`../../kit/fx/${n}.js`)));
const slot = (i) => (want.length === 1 ? [0, 0, 0] : [((i % 5) - 2) * 2.5, i < 5 ? 2.35 : 0, 0]);
const SKY = {
  stops: [["#f6e7cf", 0], ["#bfe0f5", 0.05], ["#86bdee", 0.18], ["#4a8fdc", 0.45], ["#2559b4", 0.92]],
  to: [["#f0d1c5", 0.007], ["#cda8bd", 0.065], ["#9074b2", 0.162], ["#545fab", 0.256], ["#2e5890", 0.346], ["#264670", 0.43]],
  phase: 0.5, sun: { az: 0.35, el: 0.42, r: 0.03, emit: 1.6 }, clouds: [{ kind: "cumulus", at: 0.02, thick: 0.12, cover: 0.6, seed: 3 }],
};

function fail(ctx, name, e) {
  console.error(`[_fx] ${name}:`, e);
  ctx.player.errors.push({ layer: `fx:${name}`, message: String(e?.stack ?? e) });
}

function world(ctx) {
  const { engine, sdf, palette: P } = ctx, group = new Group(), light = engine.shared.uLightDir.value, was = light.clone();
  light.set(0.55, 0.72, 0.5).normalize();
  group.add(engine.prop(sdf.painted(new CircleGeometry(60, 64).rotateX(-Math.PI / 2), sdf.paint(P.ground, P.groundShade)), 0.5));
  const sky = pick === "sky" && mods[0].status === "fulfilled" ? mods[0].value : null, dome = { az: [-3.2, 3.2], el: [-0.25, 1.3], pxPerRad: 320 };
  if (sky && q.has("plate")) group.add(ctx.bake.plateLayer(sky.skyRamp({ ...SKY, plate: true }), { uniforms: sky.skyUniforms({ ...SKY, plate: { horizon: 0.58 } }), id: 0 }));
  else if (sky) group.add(ctx.bake.sky(sky.skyRamp(SKY), { ...dome, uniforms: sky.skyUniforms(SKY) }));
  else group.add(ctx.bake.sky(`vec3 sky(float az, float el) { return mix(${V(P.horizon)}, ${V(P.zenith)}, smoothstep(-0.05, 0.9, el)); }`, dome));
  return {
    group,
    update() {},
    dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); o.userData.target?.dispose(); }); light.copy(was); },
  };
}

function fx(ctx) {
  const { engine } = ctx, group = new Group(), live = [];
  mods.forEach((r, i) => {
    const name = want[i];
    if (r.status !== "fulfilled") return fail(ctx, name, r.reason);
    try {
      let d;
      if (name === "cel" && hits) { ctx.scene.seal.hero.extras?.(engine, ctx.seal.hero); const h = (hitsMod).buildHits(ctx); d = { group: h.group, update: (t, c) => h.update(t, c), dispose: h.dispose }; } else d = r.value.demo(engine);
      const extra = [];
      d.group.position.set(...slot(i));
      group.add(d.group);
      // the uses a scene makes of two modules beyond their demo: a floor mirror under the hero, fur on the hero's head
      if (name === "mirror" && want.length === 1) {
        const m = r.value.makeMirror(engine, { y: 0.006, at: [ctx.seal.at[0], ctx.seal.at[2] + 1.1], size: [1.1, 2.6], base: "#16202e", gain: 0.6, ripple: 0.8, fade: 0, exclude: [d.group] });
        group.add(m.group); extra.push(m);
      }
      if (name === "fur" && want.length === 1) {
        const f = r.value.makeFur(engine, { clumps: { perSide: 3 }, strokes: { perSide: 3 } });
        ctx.seal.attach(f.group); extra.push(f);
      }
      live.push({ name, d, extra, dead: false });
    } catch (e) { fail(ctx, name, e); }
  });
  return {
    group,
    update(t, dt, cue) {
      for (const L of live) {
        if (L.dead) continue;
        try { L.d.update(t, cue); for (const x of L.extra) x.update(t, cue); } catch (e) { L.dead = true; L.d.group.visible = false; fail(ctx, L.name, e); }
      }
    },
    dispose() { for (const L of live) { L.d.dispose?.(); for (const x of L.extra) x.dispose(); } },
  };
}

export default function build(ctx) {
  return composeLayers(ctx, { world, fx });
}
