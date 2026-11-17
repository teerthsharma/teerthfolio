// FX for p-nerve: the banner, the impact ring, the balloons A, B and C and the credit card (page.js, real clock), the DONG and CRUNCH lettering,
// the flashes and the return wipe, and the tolls, survivor and CRUNCH layers (hits.js, crunch.js). Lettering is sized at the live lens's depth.
import { CanvasTexture, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector3, Vector4 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { DOCK, LINE, RED_FLASH, T, unwarp } from "../clock.js";
import { TOWER } from "../live/tower.js";
import { ACCENT, FLASH, RETURN_FLASH, SFX, SFX_OFF, SFX_STROKE } from "../palette.js";
import { TONE, toned } from "../tone.js";
import { buildCrunch } from "./crunch.js";
import { bellScreen, buildHits } from "./hits.js";
import { Comic, comicFace } from "./page.js";

const TEXT = {
  a: { kind: "oval", text: "When it ends, I'm the one who writes yours.", bold: "yours", left: 0.5 },
  b: { kind: "oval", text: "The bells are loud today.", bold: "loud", left: 0.06 },
  c: { kind: "burst", text: "I built the control that could kill my own result, then published what it said. 3 of its own 4 hypotheses withdrawn. 224 tests passing.", bold: ["3 of its own 4 hypotheses withdrawn.", "224 tests passing."] },
};
const CREDIT = { title: "nerve", sub: "3 of its own 4 hypotheses withdrawn · 224 tests passing", ret: "The notebook closes; the seal walks back out of the tower." };
const RYUK_HEAD = [1.55, 2.4, -1.9], L_HEAD = [-3.55, 1.55, -1.9], CRUNCH_AT = [0.9, 2.3, 0.9], DONG_Y = TOWER.bell + TOWER.drop + 2.9;
const LETTER_ASPECT = 320 / 1024;
const world = (p) => new Vector3(p[0] + DOCK[0], p[1] + DOCK[1], p[2] + DOCK[2]);

// hand lettering, a canvas quad placed in frame space (the live lettering(): amber misregistration, cream stroke, the fill on top)
function letter(text, fill) {
  const c = document.createElement("canvas"), tex = new CanvasTexture(c);
  c.width = 1024; c.height = 320;
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d"), fam = comicFace();
    let px = 220;
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2); g.rotate(-0.08);
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText(text).width > c.width * 0.9 && px > 60) g.font = `800 ${(px -= 10)}px ${fam}`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.fillStyle = SFX_OFF; g.globalAlpha = 0.9; g.fillText(text, -px * 0.045, px * 0.03); g.globalAlpha = 1;
    g.lineWidth = px * 0.14; g.strokeStyle = SFX_STROKE; g.strokeText(text, 0, 0);
    g.fillStyle = fill; g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  comicFace(() => document.fonts?.load?.(`800 100px ${comicFace()}`).then(draw, () => {}));
  const uAt = { value: new Vector4(0, 0, 0.5, 0.2) };
  const mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    uniforms: { tMap: { value: tex }, uAt },
    vertexShader: "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }",
    fragmentShader: TONE + "uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(siteTone(c.rgb) * c.a, c.a); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, side: DoubleSide,
  }));
  mesh.frustumCulled = false; mesh.renderOrder = 1300; mesh.visible = false; mesh.userData.layer = 1;
  return { mesh, uAt, dispose() { tex.dispose(); mesh.material.dispose(); mesh.geometry.dispose(); } };
}

// a camera-facing plaque of world width w, sized as it is at the live lens (depth D0); edge keeps it inside the frame
function billboard(lt, p, w, cam, D0, edge = true) {
  const C = p.clone().project(cam);
  if (C.z > 1) { lt.mesh.visible = false; return null; }
  const P = cam.projectionMatrix.elements;
  const hw = (w / 2) * P[0] / D0, hh = ((w * LETTER_ASPECT) / 2) * P[5] / D0, v = lt.uAt.value;
  if (edge) v.set(Math.min(Math.max(C.x, hw - 1), 1 - hw), Math.min(Math.max(C.y, hh - 1), 1 - hh), hw, hh);
  else v.set(C.x, C.y, hw, hh);
  return v;
}
// a plaque that covers the seal's box moves up to sit above it
function lift(at, box) {
  if (!at || !box) return;
  const sx = box[0] + box[2] - 1, sy = 1 - box[1] - box[3], sw = (box[2] - box[0]) * 2, sh = (box[3] - box[1]) * 2;
  if (Math.abs(at.x - sx) < at.z + sw / 2 && Math.abs(at.y - sy) < at.w + sh / 2) at.y = Math.min(sy + sh / 2 + at.w + 0.02, 1 - at.w);
}
const fits = (a) => Math.abs(a.x) + a.z < 1 && a.y + a.w < 0.95 && a.y - a.w > -0.95;
const cl = (v, m) => Math.min(m, Math.max(-m, v));

const popDong = (d) => Math.min(1, d / 0.08) * (1 + 0.3 * Math.max(0, 1 - d / 0.2));
const popCrunch = (d) => Math.min(1, d / 0.07) * (1 + 0.3 * Math.max(0, 1 - d / 0.2));

// the live red flash, piecewise linear in real seconds (RED_FLASH)
const redAt = (s) => {
  if (s < RED_FLASH[0][0] || s > RED_FLASH.at(-1)[0]) return 0;
  let i = 1;
  while (RED_FLASH[i][0] < s) i++;
  const [t0, a0] = RED_FLASH[i - 1], [t1, a1] = RED_FLASH[i];
  return a0 + ((a1 - a0) * (s - t0)) / (t1 - t0);
};
// the flashes at real second ts: the cream on the screens cut and on CRUNCH (scene clock), the live red, the return wipe
export const veilAt = (ts) => {
  const tt = unwarp(ts);
  return {
    cream: 0.12 * Math.max(0, 1 - Math.abs(tt - T.screens - 0.05) / 0.1) + 0.4 * Math.max(0, 1 - Math.abs(tt - T.crunch - 0.05) / 0.12),
    red: redAt(ts),
    wipe: 0.7 * Math.max(0, 1 - Math.abs(ts - 30.3) / 0.15),
  };
};
// a balloon's tail aims at its speaker's head while the head is in the frame; otherwise at the edge on the speaker's side
export function tailAt(p, edgeX, W, H) {
  if (p && p[0] >= 0.04 * W && p[0] <= 0.96 * W && p[1] >= 0 && p[1] <= H) return p;
  return [Math.min(0.96 * W, Math.max(0.04 * W, p ? p[0] : edgeX)), 0.45 * H];
}

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  const hits = buildHits(ctx), crunch = buildCrunch(ctx);
  const dong = [0, 1, 2].map(() => letter("DONG", SFX)), crunchText = letter("CRUNCH", SFX);
  const cam = () => ctx.player?.camera;
  const px = (p, W, H) => { const c = cam(); if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };
  const veil = makeCel(ctx.engine, {
    max: 8, order: 1250,
    draw(B, ts, A) {
      const v = veilAt(ts); const HOOK = typeof location !== "undefined" ? new URLSearchParams(location.search).get("veil") : null; if (HOOK !== null) v.red = +HOOK; // TEMP-T6-HOOK
      if (v.cream > 0.003) B.rect(0, 0, A, 1, toned(FLASH), Math.min(1, v.cream));
      if (v.red > 0.003) B.rect(0, 0, A, 1, toned(ACCENT), Math.min(1, v.red));
      if (v.wipe > 0.003) B.rect(0, 0, A, 1, toned(RETURN_FLASH), v.wipe);
    },
  });
  group.add(hits.group, crunch.group, veil.group, crunchText.mesh, ...dong.map((d) => d.mesh));
  let comic = null;

  return {
    group,
    update(t, dt, cue) {
      const tt = unwarp(t), c = cam(), box = ctx.player?.box;
      hits.update(t, cue);
      crunch.update(t, cue);
      veil.update(t, cue);

      if (c) {
        const bellX = c.aspect < 1 ? -4.8 : TOWER.x, bs = bellScreen(c);
        dong.forEach((d, i) => {
          const age = tt - T.toll[i], on = age >= 0 && age < 0.7;
          d.mesh.visible = on;
          if (!on) return;
          const pop = popDong(age) * (1 + 0.3 * age), pw = world([bellX - 0.4, DONG_Y, TOWER.z]);
          let at = bs.live ? billboard(d, pw, 3.6 * pop, c, c.position.distanceTo(pw), false) : null;
          if (!at || !fits(at)) { d.mesh.visible = true; const hw = 0.16 * pop; at = d.uAt.value.set(cl(bs.x, 0.96 - hw), cl(bs.y, 0.9 - hw * LETTER_ASPECT * c.aspect), hw, hw * LETTER_ASPECT * c.aspect); }
          lift(at, box);
        });
        const dc = tt - T.crunch, on = dc >= 0 && dc < 0.8;
        crunchText.mesh.visible = on;
        const cw = world(CRUNCH_AT);
        if (on) lift(billboard(crunchText, cw, 3.0 * popCrunch(dc), c, c.position.distanceTo(cw)), box);
      } else {
        dong.forEach((d) => { d.mesh.visible = false; });
        crunchText.mesh.visible = false;
      }

      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720;
      const chest = ctx.seal.chest ? px(ctx.seal.chest(new Vector3()), W, H) : null, chestPx = chest ?? [W / 2, H / 2];
      const mouth = ctx.nerve?.mouth ? px(ctx.nerve.mouth, W, H) : null, say = mouth ?? chestPx;
      const lines = [];
      if (t >= LINE.A && t < LINE.B) lines.push({ slot: "a", ...TEXT.a, age: t - LINE.A, at: tailAt(px(world(RYUK_HEAD), W, H), 0.96 * W, W, H) });
      if (t >= LINE.B && t < LINE.C) lines.push({ slot: "b", ...TEXT.b, age: t - LINE.B, at: tailAt(px(world(L_HEAD), W, H), 0.04 * W, W, H) });
      if (t >= LINE.C && t < LINE.credit) lines.push({ slot: "c", ...TEXT.c, age: t - LINE.C, at: say });
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      comic.frame({
        banner: t >= 0 && t < 1.2 ? t : null,
        impact: t >= LINE.ring[0] && t < LINE.ring[1] ? [chestPx[0] / W, chestPx[1] / H, t - LINE.ring[0] < 1 / 24 ? 1 : 1.06] : null,
        lines,
        warm: Object.entries(TEXT).map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        card: CREDIT,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { ...CREDIT, age: t - LINE.credit } : null,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[1] * H + 0.72 * bh] : null,
      });
    },
    dispose() {
      hits.dispose(); crunch.dispose(); veil.dispose();
      crunchText.dispose(); dong.forEach((d) => d.dispose());
      comic?.dispose();
    },
  };
}
