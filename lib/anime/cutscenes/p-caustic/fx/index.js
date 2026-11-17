// FX for p-caustic: the comic-print layer (page.js) with the three bubbles, the credit card, the GOGOGO sound effect and the two impact frames.
// Everything here is flat to the lens; the lettering of the hits and the ink slashes follow in their own tickets.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3, Vector4 } from "three";
import { Comic } from "./page.js";
import { doomCanvas } from "./doom.js";
import { R, HIT, T, W, warp } from "../clock.js";
import { TONE, toned } from "../tone.js";
import { makeCel } from "../../../kit/fx/cel.js";
import { hash } from "../live/parts.js";

const TEXT = {
  a: { kind: "oval", text: "Is this… the power of a god?", bold: "power of a god" },
  b: { kind: "burst", text: "This is the power of a seal. 0.995 AUROC, with no ground truth.", bold: "power of a seal|no ground truth|0.995 AUROC" },
  credit: { title: "teerthsharma/caustic · 0.995 AUROC · five proved bounds", sub: "Hallucination, measurable with no ground truth.", ret: "Limbo closes. The seal walks out of Madara's moon." },
};
const WIN = { a: [R(3.0), R(6.25)], b: [R(6.6), R(9.6)], credit: [R(9.6), R(10.8)] }; // real seconds: 3.10-7.21, 8.90-15.80, 15.80-19.90
const GOGO = [R(1.15), R(1.6)], IMPACT = [R(1.15), R(10.8)], FRAME = 2 / 12; // the two impact frames, two drawings each
const RIDGE = new Vector3(...W([20, 1.6, -33])); // the alliance on the ridge speaks line A

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), AT = new Vector3();
  const cam = () => ctx.player?.camera;
  const px = (p, w, h) => { const c = cam(); if (!c || !p) return null; V.copy(p).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * w, (0.5 - V.y * 0.5) * h]; };
  let comic = null;
  // DOOOM: the site's jagged lettering as one screen-space quad, popping at the second hit and judder-ing on twos
  const uAt = { value: new Vector4(-0.4, 0.38, 0.46, 0.2) }, tex = doomCanvas();
  const doom = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    uniforms: { tMap: { value: tex }, uAt },
    vertexShader: "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }",
    fragmentShader: TONE + "uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(siteTone(c.rgb) * c.a, c.a); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
  }));
  doom.frustumCulled = false; doom.renderOrder = 1300; doom.visible = false;
  group.add(doom);
  const DOOM_END = R(T.hit2 + 0.75);
  const cream = toned("#fff4e4"), mane = toned("#1d1813"), armour = toned("#b3202e"), shard = toned("#d8ccb6");
  // the tinted flash at each hit (never a white-out) and the return: two frames of cream over the seal, then 36 shards thrown off it
  const veil = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    const tt = warp(ts), a = Math.max(0, 1 - Math.abs(tt - T.hit2 - 0.04) / 0.1) * 0.35 + Math.max(0, 1 - Math.abs(tt - T.m1[1]) / 0.09) * 0.15;
    if (a > 0.003) B.rect(0, 0, A, 1, cream, Math.min(1, a));
  } });
  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - HIT.back) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const x0 = box[0] * A, x1 = box[2] * A, y0 = box[1], y1 = box[3];
    if (f < 2) { B.rect(x0, y0, x1, y1, cream); return; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = 0.5 * (y1 - y0);
    for (let i = 0; i < 36; i++) {
      const a = hash(i, 5) * Math.PI * 2, q = r * (0.6 + 0.6 * hash(i, 6)) * (1 + 0.35 * (f - 2)), s = (0.035 * (6 - f)) / 4;
      const x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      B.tri(x - s, y, x + s, y - s * 0.4, x, y + s, [shard, mane, armour][i % 3]);
    }
  } });
  group.add(veil.group, poof.group);

  return {
    group,
    update(t, dt, cue) {
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      veil.update(t, cue); poof.update(t, cue);
      const res = ctx.engine.shared.uRes.value, aspect = res.x / res.y;
      doom.visible = t >= HIT.m2 && t < DOOM_END;
      if (doom.visible) {
        const lt = warp(t) - T.hit2, pop = Math.min(1, lt / 0.08) * (1 + 1.25 * Math.max(0, 1 - lt / 0.2)), odd = Math.floor(t * 12) % 2 ? 1 : -1;
        const hw = 0.46 * pop;
        uAt.value.set(-0.4 + 0.024 * odd, 0.38, hw, (hw * aspect) / 3.56);
      }
      const Wd = host.clientWidth || 1280, Hd = host.clientHeight || 720, box = ctx.player?.box;
      const seal = ctx.seal.named?.(), pale = t >= HIT.back;
      // the speaker's mouth: Madara until the break, then the pale pup's head (the top middle of its box)
      const say = !pale && seal ? px(seal.mouth, Wd, Hd) : box ? [((box[0] + box[2]) / 2) * Wd, box[1] * Hd + 0.3 * (box[3] - box[1]) * Hd] : [0.6 * Wd, 0.4 * Hd];
      const lines = [], line = (slot, at, left) => lines.push({ slot, ...TEXT[slot], age: t - (slot === "a" ? WIN.a[0] : WIN.b[0]), at: at ?? [0.6 * Wd, 0.4 * Hd], left });
      if (!cue?.shot?.data?.quiet) {
        if (t >= WIN.a[0] && t < WIN.a[1]) line("a", px(RIDGE, Wd, Hd), 0.55);
        else if (t >= WIN.b[0] && t < WIN.b[1]) line("b", say, 0.55);
      }
      const ring = [IMPACT[0], IMPACT[1]].some((t0) => t >= t0 && t < t0 + FRAME);
      const chest = ctx.seal.chest ? px(ctx.seal.chest(AT), Wd, Hd) : null;
      const bw = box ? (box[2] - box[0]) * Wd : 0, bh = box ? (box[3] - box[1]) * Hd : 0;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * Wd, 0.4 * Hd] })),
        card: TEXT.credit, lines,
        avoid: box ? [box[0] * Wd - 0.12 * bw - 6, box[1] * Hd - 0.12 * bh, box[2] * Wd + 0.12 * bw + 6, box[3] * Hd + 2] : null,
        impact: ring && chest ? [chest[0] / Wd, chest[1] / Hd, 1.06] : null,
        sfx: t >= GOGO[0] && t < GOGO[1] ? { text: "GOGOGO", age: t - GOGO[0] } : null,
        credit: t >= WIN.credit[0] && t < WIN.credit[1] ? { ...TEXT.credit, age: t - WIN.credit[0] } : null,
      });
    },
    dispose() { comic?.dispose(); },
  };
}
