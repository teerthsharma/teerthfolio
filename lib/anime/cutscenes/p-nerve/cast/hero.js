// HERO SEAL extras (the locked pup is never edited; everything rides ctx.seal.attach). Poses come from scene.seal.track / `pose` beats.
// Costume (the sole Light nod, covering nothing of the body): white collar #ecebe7 and a loosened tie #7a2a1c.
// Props, all pup-local, never between lens and the face (L2):
//   notebook  black cover #0f0f12 with white scratchy lettering (slant 8 deg), left flipper, up 3.4 to 5.5 s; a page card above its upper edge
//             with four ivory lines that take a coral #ff5a4d strike each stroke
//   pen       right flipper, four strokes at strokes + i * 0.39 s (3.7 to 5.25 s)
//   chip bag  pulled out 10.9 to 11.65 s (foil #c9cdd1, stripe #b3171f); RIPS at page (11.7 s) into a flat page held to the seal's right of the face,
//             slanted 0.21 rad (x 0.42 clears the head radius 0.27 + half page width 0.11) until pageEnd 12.3 s, then lowered;
//             one chip eaten at eat (13.6 s)
//   cuff      steel band on the left wrist where the chain ends (chain.js)
import { BoxGeometry, CanvasTexture, CylinderGeometry, Group, MeshBasicMaterial, PlaneGeometry, SphereGeometry, ConeGeometry, TorusGeometry, SRGBColorSpace, DoubleSide, Mesh } from "three";
import { T, sm, lerp, clamp01, figProp, mesh, L1 } from "./util.js";

export const HERO_CUFF = [-0.3, 0.2, 0.26];

function coverTexture() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 256; c.height = 340;
  const g = c.getContext("2d");
  g.fillStyle = "#0f0f12"; g.fillRect(0, 0, 256, 340);
  g.save(); g.translate(176, 270); g.rotate(-8 * Math.PI / 180); // lower right, slanted about 8 degrees
  g.strokeStyle = "#f2f2ee"; g.fillStyle = "#f2f2ee"; g.lineCap = "round";
  g.font = "italic 800 44px Impact, 'Arial Black', sans-serif"; g.textAlign = "center";
  // scratchy: each word drawn 3 times with a 1 px jitter
  for (const [w, y] of [["DEATH", -10], ["NOTE", 40]]) for (let i = 0; i < 3; i++) { g.globalAlpha = i ? 0.55 : 1; g.fillText(w, (i - 1) * 1.4, y + (i - 1) * 1.1); }
  g.globalAlpha = 1; g.lineWidth = 8; g.beginPath(); g.moveTo(-96, -20); g.lineTo(-92, 60); g.stroke(); // long D descender
  g.restore();
  const tx = new CanvasTexture(c); tx.colorSpace = SRGBColorSpace; return tx;
}

export function buildHero(ctx) {
  const seal = ctx.seal;
  const mk = (o) => { seal.attach(o, 1); L1(o); return o; };
  // ---- collar + loosened tie
  const uni = new Group();
  uni.add(figProp(ctx, new TorusGeometry(0.205, 0.028, 8, 28).rotateX(Math.PI / 2), "#ecebe7", "#b9b9b5", { pos: [0, 0.42, 0.04], scl: [1.05, 0.8, 1], lineMul: 0.7 }));
  for (const s of [1, -1]) uni.add(figProp(ctx, new ConeGeometry(0.045, 0.1, 3).rotateX(Math.PI), "#ecebe7", "#b9b9b5", { pos: [s * 0.07, 0.395, 0.27], rot: [0.3, 0, s * 0.35], scl: [1, 1, 0.3], lineMul: 0.5 }));
  uni.add(figProp(ctx, new SphereGeometry(0.03, 10, 8), "#7a2a1c", "#4a160d", { pos: [0.01, 0.375, 0.285], lineMul: 0.5 })); // knot
  uni.add(figProp(ctx, new ConeGeometry(0.04, 0.17, 4).rotateX(Math.PI), "#7a2a1c", "#4a160d", { pos: [0.02, 0.28, 0.29], rot: [-0.08, 0, 0.12], scl: [1, 1, 0.22], lineMul: 0.6 })); // loosened: off-axis
  mk(uni);
  // ---- cuff
  mk(figProp(ctx, new TorusGeometry(0.052, 0.015, 7, 16), "#c9cdd1", "#565c64", { pos: HERO_CUFF, rot: [0.2, 1.1, 0.3], lineMul: 0.6 }));
  // ---- notebook (cover forward) + page card + pen
  const nb = new Group();
  nb.add(figProp(ctx, new BoxGeometry(0.18, 0.24, 0.03), "#0f0f12", "#050507", { lineMul: 0.8 }));
  const tex = coverTexture();
  if (tex) { const l = new Mesh(new PlaneGeometry(0.17, 0.225), new MeshBasicMaterial({ map: tex, side: DoubleSide })); l.position.z = 0.0165; nb.add(l); }
  const card = new Group(); card.position.set(0.0, 0.17, 0.0); card.rotation.x = -0.5;
  card.add(mesh(new PlaneGeometry(0.16, 0.11), "#0f0f12", { side: DoubleSide }));
  const strikes = [];
  for (let i = 0; i < 4; i++) {
    const y = 0.036 - i * 0.024, ln = mesh(new PlaneGeometry(0.12 - i * 0.012, 0.006), "#f4efe3", { side: DoubleSide }); ln.position.set(-0.005, y, 0.002); card.add(ln);
    const sk = mesh(new PlaneGeometry(0.135 - i * 0.012, 0.008), "#ff5a4d", { side: DoubleSide }); sk.position.set(-0.005, y, 0.004); sk.visible = false; card.add(sk); strikes.push(sk);
  }
  nb.add(card);
  nb.position.set(-0.13, 0.22, 0.4); nb.rotation.set(-0.15, 0.25, 0.04); nb.scale.setScalar(0.001);
  mk(nb);
  const pen = new Group();
  pen.add(figProp(ctx, new CylinderGeometry(0.009, 0.009, 0.17, 8), "#1c1816", "#0b0a09", { lineMul: 0.5 }), figProp(ctx, new ConeGeometry(0.009, 0.03, 8).rotateX(Math.PI), "#c9cdd1", "#565c64", { pos: [0, -0.1, 0], lineMul: 0.3 }));
  pen.scale.setScalar(0.001); mk(pen);
  // ---- chip bag, flat page, chip
  const bag = new Group();
  bag.add(figProp(ctx, new BoxGeometry(0.2, 0.26, 0.07), "#c9cdd1", "#8a9096", { lineMul: 0.7 }), figProp(ctx, new BoxGeometry(0.205, 0.07, 0.072), "#b3171f", "#6e0d12", { pos: [0, -0.02, 0], lineMul: 0.5 }),
    figProp(ctx, new BoxGeometry(0.2, 0.025, 0.02), "#9aa0a6", "#565c64", { pos: [0, 0.125, 0], lineMul: 0.4 })); // crimped top
  bag.visible = false; mk(bag);
  const page = new Group();
  page.add(figProp(ctx, new BoxGeometry(0.2, 0.26, 0.008), "#c9cdd1", "#8a9096", { lineMul: 0.7 }), figProp(ctx, new BoxGeometry(0.205, 0.06, 0.01), "#b3171f", "#6e0d12", { pos: [0, -0.02, 0], lineMul: 0.4 }),
    figProp(ctx, new BoxGeometry(0.03, 0.2, 0.011), "#ffffff", "#ffffff", { pos: [-0.06, 0.02, 0], rot: [0, 0, 0.5], lineMul: 0.2 })); // the one hard foil highlight cut
  page.visible = false; mk(page);
  const chip = figProp(ctx, new ConeGeometry(0.03, 0.04, 3), "#e8b84a", "#a8741c", { lineMul: 0.5 }); chip.visible = false; mk(chip);

  return {
    update(t, cue) {
      const s0 = T(cue, "strokes"), sEnd = T(cue, "strokesEnd");
      // notebook pops 0.3 s before the first stroke and drops after the last
      const nbk = sm(s0 - 0.3, s0, t) * (1 - sm(sEnd + 0.1, sEnd + 0.4, t));
      nb.scale.setScalar(Math.max(0.001, nbk)); nb.visible = nbk > 0.002;
      // pen: four strokes, each 0.3 s, a coral strike lands when it ends
      let dx = 0, dy = 0;
      for (let i = 0; i < 4; i++) {
        const u = clamp01((t - (s0 + i * 0.39)) / 0.3);
        if (u > 0 && u < 1) { dx = lerp(-0.05, 0.05, u); dy = -0.03 * Math.sin(Math.PI * u); }
        strikes[i].visible = t >= s0 + i * 0.39 + 0.3;
      }
      pen.scale.setScalar(Math.max(0.001, nbk)); pen.visible = nbk > 0.002;
      pen.position.set(0.12 + dx, 0.3 + dy, 0.43); pen.rotation.set(0, 0, 0.9);
      // chip bag out at 10.9, torn at the page beat, page held right of the face, lowered after pageEnd
      const bagT = T(cue, "bag"), pgT = T(cue, "page"), pgEnd = T(cue, "pageEnd"), eat = T(cue, "eat");
      const out = sm(bagT, bagT + 0.35, t);
      bag.visible = t >= bagT && t < pgT; bag.position.set(lerp(0.2, 0.3, out), lerp(0.2, 0.3, out), lerp(0.3, 0.4, out)); bag.scale.setScalar(Math.max(0.001, out));
      const hold = sm(pgT, pgT + 0.15, t) * (1 - sm(pgEnd, pgEnd + 0.3, t));
      const lower = sm(pgEnd, pgEnd + 0.3, t) * (1 - sm(eat + 0.6, eat + 0.9, t));
      page.visible = t >= pgT && t < eat + 0.9;
      page.position.set(lerp(0.3, 0.42, hold), lerp(0.3, 0.52, hold) - 0.26 * lower, 0.38);
      page.rotation.set(0, -0.3 * hold, 0.21 * hold); // slanted 0.21 rad, turned to the lens
      page.scale.setScalar(Math.max(0.001, lerp(0.8, 1, hold)));
      // one chip eaten: leaves the page corner for the mouth in 0.3 s
      const ck = clamp01((t - eat) / 0.3);
      chip.visible = t >= eat - 0.2 && t < eat + 0.3;
      chip.position.set(lerp(0.34, 0.03, ck), lerp(0.42 - 0.26 * lower, 0.44, ck), lerp(0.38, 0.29, ck)); chip.rotation.z = ck * 6;
    },
    dispose() {},
  };
}
