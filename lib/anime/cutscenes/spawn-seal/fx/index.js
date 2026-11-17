// FX for spawn-seal: the comic layer (page.js: three balloons, credit card, PLOP and CRACK), the Great Sage panels, the glass and drawn hits,
// the flash veil and the island's snow. The balloon and card text is the card's, verbatim.
import { Group, Vector3 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { BACK, DOCK, IMPACT, LINE, SEAL_AT, bump, env } from "../clock.js";
import { toned } from "../tone.js";
import { Comic } from "./page.js";
import { makeSage } from "./sage.js";
import { makeGlass } from "./glass.js";
import { buildHits } from "./hits.js";

const FLASH = toned("#9fe6ff"), FLASH2 = toned("#e6b8ff"), SNOW = rgb("#ffffff");
const TEXT = {
  a: { kind: "oval", text: "Kwahaha! What does that one do?", bold: ["Kwahaha!"] },
  b: { kind: "whisper", text: "Oops. Wrong place.", bold: ["Oops."] },
  c: { kind: "burst", text: "Bare metal x86_64. No POSIX. No libc. I never ran on your stone. Memory, files and scheduler, on one sphere.", bold: ["Bare metal x86_64. No POSIX. No libc.", "your stone"] },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
};
const SAGE1 = "《Notice》 Skill: Epsilon Hollow.", SAGE2 = "《Notice》 Return to the island: route calculated.";
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), S3 = new Vector3(), AT = new Vector3(...DOCK), SP = new Vector3(...SEAL_AT).add(AT), HEAD = new Vector3(0, 0.42, 0.5).add(AT);
  const px = (p, W, H) => { const c = ctx.player?.camera; if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };
  const glass = makeGlass(ctx), hits = buildHits(ctx, glass);
  const sage1 = makeSage(SAGE1, ctx.engine.shared.uRes), sage2 = makeSage(SAGE2, ctx.engine.shared.uRes);
  const veil = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    const a = Math.min(1, bump(ts, 1.6, 0.15) * 0.35 + bump(ts, 13.55, 0.12) * 0.9 + bump(ts, 14.5, 0.25) * 0.7 + bump(ts, 9.4, 0.2) * 0.4);
    if (a > 0.003) B.rect(0, 0, A, 1, ts < 13 ? FLASH : FLASH2, a);
  } });
  const snow = makeCel(ctx.engine, { max: 260, order: 1190, draw(B, ts, A) {
    if (ts >= IMPACT && ts < BACK) return;
    for (let i = 0; i < 120; i++) {
      const z = 0.35 + 0.65 * hash(i, 21), x = ((((hash(i, 22) + ts * 0.011 * z + 0.012 * Math.sin(ts * 0.9 + i)) % 1) + 1) % 1) * A, y = (hash(i, 23) + ts * 0.034 * z) % 1, r = 0.0016 + 0.0026 * z * z;
      B.tri(x, y - r, x + r, y, x, y + r, SNOW); B.tri(x, y - r, x, y + r, x - r, y, SNOW);
    }
  } });
  group.add(snow.group, veil.group, hits.group, glass.mesh, sage1.mesh, sage2.mesh);
  let comic = null;

  return {
    group,
    update(t, dt, cue) {
      veil.update(t, cue); snow.update(t, cue); hits.update(t, dt, cue);
      const e = env(t);
      sage1.set(e.sage1, t); sage2.set(e.sage2, t);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box, bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const seal = ctx.seal.named?.(), quiet = !!(cue?.shot?.data?.quiet || cue?.on?.("panel"));
      const mouth = t >= BACK ? px(HEAD, W, H) : seal?.mouth ? px(seal.mouth, W, H) : null;
      const lines = [];
      const line = (slot, t0, at, left) => lines.push({ slot, ...TEXT[slot], age: t - t0, at: at ?? [0.6 * W, 0.4 * H], left });
      if (t >= LINE.A && t < LINE.B && !quiet) line("a", LINE.A, px(SP, W, H), 0.55);
      if (t >= LINE.B && t < LINE.C && !quiet) line("b", LINE.B, mouth, 0.55);
      if (t >= LINE.C && t < LINE.credit) line("c", LINE.C, mouth);
      const chest = px(ctx.seal.chest(S3), W, H) ?? [W / 2, H / 2];
      comic.frame({
        warm: [{ slot: "c", ...TEXT.c, age: 1, at: [0.6 * W, 0.4 * H] }], card: TEXT.credit,
        lines, avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        impact: t >= IMPACT && t < IMPACT + 0.12 ? [chest[0] / W, chest[1] / H, t - IMPACT < 1 / 12 ? 1 : 1.06] : null,
        sfx: t >= IMPACT + 0.12 && t < 1.95 ? { text: "PLOP", age: t - IMPACT - 0.12 } : null,
        crack: t >= 13.52 && t < 14.1 ? { text: "CRACK", age: t - 13.52 } : null,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { ...TEXT.credit, age: t - LINE.credit } : null,
      });
    },
    dispose() { snow.dispose(); veil.dispose(); hits.dispose(); glass.dispose(); sage1.dispose(); sage2.dispose(); comic?.dispose(); },
  };
}
