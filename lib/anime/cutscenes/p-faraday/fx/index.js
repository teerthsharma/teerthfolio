// FX of Railgun: the comic layer (page.js), the hits, the turn and the break (cel), the hit flash and three J.C.Staff screen shaders recoloured to the inks.
// The shaders stay hidden until their window; the composer's warm-up links them before frame 0.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { BOLD, CREDIT, DOCK_AT, LINES, PILL, PILL_TEXT, R, smooth } from "../clock.js";
import { AMBER, CREAM, CYAN, FLASH } from "../palette.js";
import { Comic } from "./page.js";
import { hitCel } from "./hits.js";
import { swapCel } from "./swap.js";
import { breakCel } from "./break.js";

await loadPack("jcstaff");

const RECOLOUR = { INK: "#000000", DEEP: "#000000", GL_MID: "#000000", GL_SHADE: "#000000", ARC: CYAN, ARC_W: CREAM, GLOW_O: AMBER, CORE: CREAM };
const vec = (hex) => { const n = parseInt(hex.slice(1), 16); return `vec3(${[16, 8, 0].map((s) => (((n >> s) & 255) / 255).toFixed(3)).join(", ")})`; };
const inks = (name) => glslFor([name]).replace(/const vec3 JCS_(\w+) = vec3\([^)]*\);/g, (m, k) => (k in RECOLOUR ? `const vec3 JCS_${k} = ${vec(RECOLOUR[k])};` : m));
const boldOf = (text) => BOLD.filter((w) => text.includes(w));
const SEAL_LINE = { touma: { left: 0.55, at: [0.7, 0.36] }, kuroko: { left: 0.6, at: [0.84, 0.3] } };
const SUB = "The field coupling, found rather than assumed.";

function quad(name, uniforms, [t0, t1], feed) {
  const u = { ...uniformsFor([name]), uT: { value: 0 }, uAt: { value: new Vector2(0.89, 0.5) } };
  for (const [k, v] of Object.entries(uniforms)) u[k] = { value: v };
  const mat = new ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: true,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.9995, 1.0); }",
    fragmentShader: `${inks(name)}\nuniform float uT; uniform vec2 uAt; varying vec2 vP;\nvoid main() {\n  vec3 c = ${name}(vP - uAt + vec2(0.89, 0.5), uT);\n  if (max(c.r, max(c.g, c.b)) < 0.004) discard;\n  gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);\n}`,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.visible = false;
  return { mesh, mat, update(t, ctx) { const on = t >= t0 && t < t1; mesh.visible = on; if (on) { mat.uniforms.uT.value = t; feed?.(mat.uniforms, ctx); } } };
}

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), V2 = new Vector3();
  const hits = (ctx.scene.beats ?? []).filter((b) => b.name === "gather" || b.name === "panel");
  const cels = [hitCel(ctx, hits), swapCel(ctx), breakCel(ctx)];
  const flash = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) { const a = 0.22 * Math.max(0, 1 - Math.abs(ts - (R.shot + 0.1)) / 0.1); if (a > 0.003) B.rect(0, 0, A, 1, rgb(FLASH), a); } });
  const hand = (out) => { const w = ctx.seal.named?.()?.handR, c = ctx.player?.camera; if (!w || !c) return null; V.copy(w).project(c); return V.z > 1 ? null : out.set(V.x * 0.5 + 0.5, V.y * 0.5 + 0.5); };
  const glint = (u) => { const p = hand(new Vector2()); if (p) u.uAt.value.copy(p); };
  const spark = (u) => { const p = hand(new Vector2()); if (p) { u.uJcsSx.value = p.x; u.uJcsSy.value = p.y; } };
  const arc = (u) => { const b = ctx.player?.box; if (!b) return; u.uJcsAx.value = b[0] - 0.04; u.uJcsAy.value = 1 - b[1] + 0.02; u.uJcsBx.value = b[2] + 0.04; u.uJcsBy.value = 1 - b[3] - 0.02; };
  const quads = [
    quad("jcsGlowStep", { uJcsGlowR: 0.1 }, [R.flick, R.flick + 0.12], glint),
    quad("jcsGlowStep", { uJcsGlowR: 0.22 }, [R.shot, R.shot + 0.2], glint),
    quad("jcsArcBolt", { uJcsArcAmp: 0.06 }, [R.hold[0], R.hold[1]], arc),
    quad("jcsSparkTicks", { uJcsSparkRate: 3.0 }, [R.shot, 15.2], spark),
  ];
  for (const q of quads) group.add(q.mesh);
  group.add(...cels.map((c) => c.group), flash.group);

  let comic = null;
  const px = (w, W, H) => { const c = ctx.player?.camera; if (!c || !w) return null; V2.copy(w).project(c); return V2.z > 1 ? null : [(V2.x * 0.5 + 0.5) * W, (0.5 - V2.y * 0.5) * H]; };
  const line = (L, age, W, H, chest) => {
    const who = SEAL_LINE[L.who], at = who ? [who.at[0] * W, who.at[1] * H] : [chest[0], chest[1] - 0.22 * H];
    return { slot: L.id, kind: L.kind, text: L.text, bold: boldOf(L.text), age, at, left: who?.left };
  };

  function overlay(t, cue) {
    const host = ctx.engine.renderer.domElement.parentElement;
    if (!host) return;
    comic ??= new Comic(host);
    const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
    const chest = px(ctx.seal.chest(new Vector3()), W, H) ?? [W / 2, H / 2];
    const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
    const lines = LINES.filter((L) => t >= L.t[0] && t < L.t[1]).map((L) => line(L, t - L.t[0], W, H, chest));
    const hidden = cue?.on?.("panel");
    const warm = LINES.filter((L) => L.kind === "burst").map((L) => line(L, 1, W, H, chest));
    comic.frame({
      banner: { dock: smooth(DOCK_AT, DOCK_AT + 0.52, t), sub: SUB },
      lines: hidden ? [] : lines,
      warm,
      warmCredit: { title: CREDIT.title, sub: CREDIT.sub },
      pill: t >= PILL[0] && t < PILL[1] ? { text: PILL_TEXT, age: t - PILL[0] } : null,
      credit: t >= CREDIT.t[0] && t < CREDIT.t[1] ? { title: CREDIT.title, sub: CREDIT.sub, age: t - CREDIT.t[0] } : null,
      impact: t >= R.impact && t < R.impact + 2 / 12 && chest ? [chest[0] / W, chest[1] / H, 1] : null,
      avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
    });
  }

  return {
    group,
    update(t, dt, cue) {
      for (const c of cels) c.update(t, cue);
      flash.update(t, cue);
      for (const q of quads) q.update(t, ctx);
      overlay(t, cue);
    },
    dispose() {
      for (const c of cels) c.dispose();
      flash.dispose();
      for (const q of quads) { q.mesh.geometry.dispose(); q.mat.dispose(); }
      comic?.dispose();
    },
  };
}
