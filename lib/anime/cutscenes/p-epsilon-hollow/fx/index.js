// FX layer of p-epsilon-hollow (Tensura, Rimuru): the portal and pool rings, the PLOP slime, the Predator vortex, the fist, the maw with its teeth,
// the sparks, tinted veils, the dust that reforms the seal, Megiddo's motes, the cracked lens, the Great Sage panels, the comic balloons and the credit.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { loadPack } from "../../../tools/packs.js";
import { AT, HIT, LINE, T, bump, smooth } from "../clock.js";
import { toned } from "../tone.js";
import { hash, makeRim, maw, fistMesh, ripple, sagePanel } from "../live/slime.js";
import { dust, vortex } from "../live/figures.js";
import { particles } from "../live/fx.js";
import { Comic, TEXT } from "./page.js";
import { buildLens } from "./lens.js";
import { placeSage, sageK } from "./sage.js";
import buildHits from "./hits.js";

await loadPack("other");
await loadPack("cuts");
await loadPack("sakuga");

const SLIME_BODY = "vec4 paint(vec2 p){ vec3 c = tensuraSlimeLens(p, 0.0); float a = smoothstep(0.10, 0.22, max(c.r, max(c.g, c.b))); return vec4(c, a); }";
const TEETH_BODY = "vec4 paint(vec2 p){ vec3 c = predatorMaw(p, 0.0); float l = dot(c, vec3(0.299,0.587,0.114)); return vec4(c, smoothstep(0.55, 0.7, l)); }";
const MOTE_BODY = "vec4 paint(vec2 p){ vec3 c = ufotableMote(p, 0.0); float l = max(c.r, max(c.g, c.b)); return vec4(vec3(1.0, 0.83, 0.48) * l, smoothstep(0.3, 0.5, l)); }";
const VEIL_A = toned("#9fe6ff"), VEIL_B = toned("#e6b8ff");
const EMITTERS = [
  { n: 50, at: [0, 0.2, 0], r: 2, t0: 0.8, spread: 2.2, speed: 2.5, up: 1.6, vy: 1.4, life: 1.6, g: 3, size: 0.14, colors: ["#3fdcff", "#ffffff", "#9fe6ff", "#ff7ae0"], seed: 1 },
  { n: 60, at: AT.veldora, r: 1.4, t0: 4.0, spread: 3, speed: 3, up: 1.2, vy: 1.2, life: 1.4, g: 2, size: 0.16, colors: ["#ffd23a", "#3aa6ff", "#ffffff"], seed: 2 },
  { n: 70, at: [0, 0.3, 0], r: 2.5, t0: 8.9, spread: 1.6, speed: 4, up: 2.2, vy: 1.8, life: 1.4, g: 2, size: 0.18, colors: ["#8a5bff", "#ffffff", "#ffd23a", "#3fdcff"], seed: 3 },
  { n: 60, at: [0, 0.3, -2], r: 6, t0: 10.6, spread: 5.5, speed: 3, up: 1.4, vy: 1.2, life: 1.5, g: 8, size: 0.2, colors: ["#ffd37a", "#ffffff", "#ff9a3a"], seed: 4 },
  { n: 60, at: [0, 0.3, 0], r: 4, t0: 24.4, spread: 1, speed: 5, up: 2, vy: 1.6, life: 1.2, g: 3, size: 0.16, colors: ["#3fdcff", "#ffffff", "#ff5ad8"], seed: 5 },
  { n: 90, at: [0, 0.3, -6], r: 28, t0: 9.6, spread: 4.5, speed: 1.2, up: 1.6, vy: 1.6, life: 2.6, g: -0.8, size: 0.12, colors: ["#ff9a3a", "#ffd37a", "#ff5a1a"], seed: 6 },
];
const MOTE_BEAMS = [2, 5, 8].map((i) => ({ x: (hash(i, 121) - 0.5) * 34, z: -9 - 30 * hash(i, 122) }));
const VELDORA = new Vector3(...AT.veldora), VELDORA_TIP = new Vector3(0, 0.4, 0);

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), CH = new Vector3(), TIP = new Vector3(), OFF = new Vector3(), cam = () => ctx.player?.camera;
  const rim = makeRim();
  const pool = ripple("#1fb8ff", "#7ff8ff", false), portal = ripple("#8a3fff", "#ff5ad8", true);
  pool.mesh.position.set(0, 0.16, 0);
  portal.mesh.position.set(0, 0.16, 0);
  const sparks = particles(rim, EMITTERS);
  const vor = vortex(), mw = maw(), fist = fistMesh(rim), reform = dust(rim, 14.6);
  const slime = ctx.bake.card(SLIME_BODY, { tools: ["tensuraSlimeLens"], w: 512, h: 512, size: [1.4, 1.4], billboard: true, layer: 1 });
  const teeth = ctx.bake.card(TEETH_BODY, { tools: ["predatorMaw"], w: 1024, h: 512, size: [14, 8], billboard: true, layer: 1 });
  const motes = MOTE_BEAMS.map(() => ctx.bake.card(MOTE_BODY, { tools: ["ufotableMote"], w: 256, h: 512, size: [2.6, 9], billboard: true, layer: 1 }));
  const sage1 = sagePanel("《Notice》 Skill: Epsilon Hollow."), sage2 = sagePanel("《Notice》 Return to the island: route calculated.");
  const hits = buildHits(ctx);
  group.add(pool.mesh, portal.mesh, sparks.mesh, vor.mesh, mw.mesh, fist.mesh, reform.mesh, slime, teeth, sage1.mesh, sage2.mesh, hits.group);
  motes.forEach((m, i) => { m.position.set(MOTE_BEAMS[i].x, 4.5, MOTE_BEAMS[i].z); group.add(m); });
  slime.position.set(1.0, 0.1, 0);

  const veil = makeCel(ctx.engine, {
    max: 4, order: 1250,
    draw(B, ts, A) {
      const a = bump(ts, 1.6, 0.15) * 0.35 + bump(ts, 9.4, 0.2) * 0.4, b = bump(ts, 13.55, 0.12) * 0.9 + bump(ts, 14.5, 0.25) * 0.7;
      if (a > 0.003) B.rect(0, 0, A, 1, VEIL_A, Math.min(1, a));
      if (b > 0.003) B.rect(0, 0, A, 1, VEIL_B, Math.min(1, b));
    },
  });
  group.add(veil.group);

  let comic = null, lens = null;
  const px = (p, W, H) => { const c = cam(); if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };

  return {
    group,
    update(t, dt, cue) {
      rim.uniforms.uTime.value = t;
      const rr = smooth(1.0, 1.6, t) * (1 - smooth(3.0, 3.8, t));
      portal.mesh.visible = pool.mesh.visible = rr > 0.01;
      portal.mesh.scale.setScalar(Math.max(0.001, 3.4 * rr));
      portal.mat.uniforms.uT.value = t;
      pool.mesh.scale.setScalar(Math.max(0.001, 2.0 * rr));
      pool.mat.uniforms.uT.value = t;
      sparks.update(t);

      const pk = smooth(T.vortex[0], T.vortex[1], t) * (1 - smooth(T.vortex[2], T.vortex[3], t));
      vor.mesh.visible = pk > 0.01;
      vor.mat.uniforms.uT.value = t;
      vor.mat.uniforms.uK.value = pk;
      vor.mesh.scale.set(1 + 0.25 * (1 - pk), 1, 1 + 0.25 * (1 - pk));

      const cm = cam(), fk = smooth(T.fist[0], T.fist[1], t) * (1 - smooth(T.fist[2], T.fist[3], t));
      fist.mesh.visible = fk > 0.01;
      if (cm) {
        const hh = 5 * Math.tan((cm.fov * Math.PI) / 360);
        V.set(0, -hh * 0.1, -(9 - 6.8 * smooth(T.fist[0], T.fist[1], t))).applyMatrix4(cm.matrixWorld);
        fist.mesh.position.copy(V);
        fist.mesh.quaternion.copy(cm.quaternion);
      }
      fist.mesh.scale.setScalar(Math.max(0.001, 1.3 * fk));

      const wk = smooth(T.maw[0], T.maw[1], t) * (1 - smooth(T.maw[2], T.maw[3], t));
      mw.mesh.visible = wk > 0.01;
      mw.mesh.position.set(...AT.maw);
      if (cm) mw.mesh.quaternion.copy(cm.quaternion);
      mw.mesh.scale.setScalar(Math.max(0.001, 7.5 * wk));
      mw.mat.uniforms.uT.value = t;
      teeth.visible = wk > 0.01 && ctx.atTier(2);
      if (teeth.visible) {
        teeth.position.set(...AT.maw);
        if (cm) teeth.position.add(OFF.set(0, 0, 0.3).applyQuaternion(cm.quaternion));
        teeth.scale.setScalar(Math.max(0.001, wk));
      }

      if (cm) { const sk = sageK(t); placeSage(sage1, cm, sk[0], t); placeSage(sage2, cm, sk[1], t); }

      const u = (t - HIT.plop) / 0.6, slimeOn = ctx.atTier(2) && u >= 0 && u < 1;
      slime.visible = slimeOn;
      if (slimeOn) { slime.position.y = 0.1 + 0.9 * Math.sin(Math.PI * u); slime.scale.set(1 + 0.2 * (1 - u), 1 - 0.2 * (1 - u), 1); }

      const rain = smooth(T.rain[0], T.rain[1], t), gone = smooth(T.gone[0], T.gone[1], t);
      motes.forEach((m) => { m.visible = ctx.atTier(3) && rain > 0.3 && gone < 0.9; });

      const at = ctx.seal.at;
      reform.mesh.visible = t > 14.5;
      reform.mesh.position.set(at[0], at[1], at[2]);
      reform.update(t);
      veil.update(t, cue);
      hits.update(t, cue);

      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      lens ??= buildLens(host);
      lens.show(t);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, lines = [];
      const seal = ctx.seal.named?.(), say = seal ? px(seal.mouth, W, H) : null, chest = px(ctx.seal.chest(CH), W, H) ?? [W / 2, H / 2];
      const line = (slot, t0, at2, left) => lines.push({ slot, ...TEXT[slot], age: t - t0, at: at2 ?? [0.6 * W, 0.4 * H], left });
      if (cue?.on?.("panel")) lines.length = 0;
      else if (t >= LINE.A && t < LINE.AEnd) line("a", LINE.A, px(TIP.copy(VELDORA).add(VELDORA_TIP), W, H), 0.55);
      else if (t >= LINE.B && t < LINE.C) line("b", LINE.B, say, 0.55);
      else if (t >= LINE.C && t < LINE.CEnd) line("c", LINE.C, say);
      const box = ctx.player?.box, bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const ring = t >= LINE.impact && t < LINE.impact + 0.12 ? t - LINE.impact : t >= LINE.collapse[0] && t < LINE.collapse[0] + 2 / 12 ? t - LINE.collapse[0] : -1;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        card: TEXT.credit,
        lines,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        impact: ring >= 0 ? [chest[0] / W, chest[1] / H, ring < 1 / 12 ? 1 : 1.06] : null,
        sfx: t >= LINE.plop[0] && t < LINE.plop[1] ? { text: "PLOP", age: t - LINE.plop[0] } : null,
        credit: t >= LINE.credit && t < LINE.creditEnd ? { ...TEXT.credit, age: t - LINE.credit } : null,
      });
    },
    dispose() {
      pool.dispose(); portal.dispose(); sparks.dispose?.(); vor.dispose(); mw.dispose(); fist.dispose(); reform.dispose?.();
      rim.dispose(); veil.dispose(); sage1.dispose(); sage2.dispose(); hits.dispose();
      comic?.dispose(); lens?.dispose();
    },
  };
}
